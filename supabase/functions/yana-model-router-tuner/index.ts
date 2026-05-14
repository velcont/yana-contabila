/**
 * YANA MODEL ROUTER TUNER
 * Two endpoints:
 *  - POST {action: "record", category, model, cost_cents, latency_ms, score?}
 *  - POST {action: "tune"} (cron daily) → recompute is_recommended per category
 *  - POST {action: "recommend", category} → returns best model for that category
 *
 * Score formula (when tuning): quality_weight * avg_score - cost_penalty * avg_cost - latency_penalty * (avg_latency/1000)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const Q_WEIGHT = 1.0;
const COST_PENALTY = 0.05; // per cent
const LATENCY_PENALTY = 0.02; // per second

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "tune";

    if (action === "record") {
      const { category, model, cost_cents = 0, latency_ms = 0, score } = body;
      if (!category || !model) return new Response(JSON.stringify({ error: "category+model required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Upsert via select+update/insert
      const { data: existing } = await supabase
        .from("yana_model_routing_stats")
        .select("id, total_calls, total_cost_cents, total_latency_ms, total_score, scored_calls")
        .eq("query_category", category).eq("model", model).maybeSingle();
      if (existing) {
        await supabase.from("yana_model_routing_stats").update({
          total_calls: (existing.total_calls || 0) + 1,
          total_cost_cents: Number(existing.total_cost_cents || 0) + Number(cost_cents),
          total_latency_ms: Number(existing.total_latency_ms || 0) + Number(latency_ms),
          total_score: typeof score === "number" ? Number(existing.total_score || 0) + Number(score) : existing.total_score,
          scored_calls: typeof score === "number" ? (existing.scored_calls || 0) + 1 : existing.scored_calls,
          last_updated: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("yana_model_routing_stats").insert({
          query_category: category, model,
          total_calls: 1,
          total_cost_cents: cost_cents,
          total_latency_ms: latency_ms,
          total_score: typeof score === "number" ? score : 0,
          scored_calls: typeof score === "number" ? 1 : 0,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "recommend") {
      const { category } = body;
      const { data: rec } = await supabase
        .from("yana_model_routing_stats")
        .select("model, avg_score, avg_cost_cents, avg_latency_ms")
        .eq("query_category", category)
        .eq("is_recommended", true)
        .maybeSingle();
      return new Response(JSON.stringify({ recommended: rec?.model || null, stats: rec }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // tune: recompute is_recommended per category
    const { data: cats } = await supabase
      .from("yana_model_routing_stats")
      .select("query_category")
      .gte("total_calls", 10);
    const unique = [...new Set((cats || []).map((c: any) => c.query_category))];
    let updated = 0;
    for (const cat of unique) {
      const { data: rows } = await supabase
        .from("yana_model_routing_stats")
        .select("id, model, avg_score, avg_cost_cents, avg_latency_ms, total_calls, scored_calls")
        .eq("query_category", cat)
        .gte("total_calls", 10);
      if (!rows || rows.length === 0) continue;
      // Score each: quality - cost_penalty * cost - latency_penalty * latency_s
      const scored = rows.map((r: any) => ({
        ...r,
        composite: (Q_WEIGHT * Number(r.avg_score || 0))
          - (COST_PENALTY * Number(r.avg_cost_cents || 0))
          - (LATENCY_PENALTY * (Number(r.avg_latency_ms || 0) / 1000)),
      }));
      // Need at least one with scored_calls > 0
      const hasScore = scored.some((s: any) => (s.scored_calls || 0) > 0);
      if (!hasScore) continue;
      scored.sort((a: any, b: any) => b.composite - a.composite);
      const winner = scored[0];
      // Reset all in category, set winner
      await supabase.from("yana_model_routing_stats").update({ is_recommended: false }).eq("query_category", cat);
      await supabase.from("yana_model_routing_stats").update({ is_recommended: true }).eq("id", winner.id);
      updated++;
    }
    return new Response(JSON.stringify({ success: true, categories_tuned: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[model-router-tuner]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});