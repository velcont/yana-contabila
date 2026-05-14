/**
 * YANA PROMPT A/B TESTER
 * Two endpoints:
 *  - POST {action: "pick", variant_key} → returns winning/sampled variant for runtime use
 *  - POST {action: "record", variant_id, score} → updates stats
 *  - POST {action: "tune"} (cron-friendly) → re-weights traffic toward best variant per key
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "tune";

    if (action === "pick") {
      const { variant_key } = body;
      if (!variant_key) return new Response(JSON.stringify({ error: "variant_key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: variants } = await supabase
        .from("yana_prompt_variants")
        .select("id, variant_name, prompt_text, traffic_weight")
        .eq("variant_key", variant_key)
        .eq("is_active", true);
      if (!variants || variants.length === 0) return new Response(JSON.stringify({ variant: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Weighted random pick
      const total = variants.reduce((s: number, v: any) => s + Number(v.traffic_weight || 0), 0) || 1;
      let r = Math.random() * total;
      let chosen = variants[0];
      for (const v of variants) { r -= Number(v.traffic_weight || 0); if (r <= 0) { chosen = v; break; } }
      return new Response(JSON.stringify({ variant: chosen }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "record") {
      const { variant_id, score } = body;
      if (!variant_id || typeof score !== "number") return new Response(JSON.stringify({ error: "variant_id+score required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: cur } = await supabase.from("yana_prompt_variants").select("total_uses, total_score").eq("id", variant_id).maybeSingle();
      if (!cur) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabase.from("yana_prompt_variants").update({
        total_uses: (cur.total_uses || 0) + 1,
        total_score: Number(cur.total_score || 0) + Number(score),
      }).eq("id", variant_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // tune: re-weight traffic per variant_key based on avg_score (epsilon-greedy 80/20)
    const { data: keys } = await supabase
      .from("yana_prompt_variants")
      .select("variant_key")
      .eq("is_active", true);
    const uniqueKeys = [...new Set((keys || []).map((k: any) => k.variant_key))];
    let tuned = 0;
    for (const key of uniqueKeys) {
      const { data: variants } = await supabase
        .from("yana_prompt_variants")
        .select("id, avg_score, total_uses")
        .eq("variant_key", key)
        .eq("is_active", true);
      if (!variants || variants.length < 2) continue;
      // Need min samples
      const ready = variants.every((v: any) => (v.total_uses || 0) >= 20);
      if (!ready) continue;
      const best = variants.reduce((b: any, v: any) => (Number(v.avg_score) > Number(b.avg_score) ? v : b));
      const exploreShare = 0.2 / Math.max(1, variants.length - 1);
      for (const v of variants) {
        const w = v.id === best.id ? 0.8 : exploreShare;
        await supabase.from("yana_prompt_variants").update({ traffic_weight: w }).eq("id", v.id);
      }
      tuned++;
    }
    return new Response(JSON.stringify({ success: true, tuned_keys: tuned }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});