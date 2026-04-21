/**
 * YANA SELF-CODER
 * Daily 05:00 UTC. Takes top capability gaps + relevant discoveries → generates
 * code proposals using GPT-5. Proposals start as `pending_test` (shadow mode).
 *
 * Generates structured agent specs (compatible with yana-agent-spawner format)
 * to be tested before deploy.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Ești YANA Self-Coder — partea care scrie cod nou pentru YANA (asistent AI contabilitate România).
Sarcina ta: pe baza unui gap de capacitate + descoperiri externe relevante, propui UN SINGUR agent nou specializat.

Format obligatoriu (JSON):
{
  "agent_name": "snake_case_short",
  "agent_purpose": "scurt, 1 propoziție",
  "system_prompt": "prompt detaliat în română pentru acest agent",
  "trigger_keywords": ["cuvânt1", "cuvânt2"],
  "model": "google/gemini-2.5-flash" | "openai/gpt-5-mini",
  "tools_needed": ["search_db", "web_search"],
  "rationale": "de ce acest agent rezolvă gap-ul",
  "estimated_impact": 0.0-1.0
}

Reguli:
- NU duplica funcționalitate existentă
- Folosește gemini-2.5-flash pentru topice simple, gpt-5-mini pentru raționament complex
- Trigger keywords trebuie să fie specifice (nu "tva" generic, ci "tva servicii ue")
- System prompt în limba română`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: settings } = await supabase.from("yana_self_dev_settings").select("enabled, max_concurrent_proposals, ai_budget_cents_per_day").limit(1).maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "self-development disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check concurrent proposals cap
    const { count: activeProposals } = await supabase
      .from("yana_self_proposals")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending_test", "shadow_testing"]);
    const maxConcurrent = settings?.max_concurrent_proposals || 3;
    if ((activeProposals || 0) >= maxConcurrent) {
      return new Response(JSON.stringify({ skipped: `Max concurrent proposals (${maxConcurrent}) reached` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get top open gaps with relevant discoveries
    const { data: gaps } = await supabase
      .from("yana_capability_gaps")
      .select("id, gap_type, topic, description, evidence, impact_score")
      .eq("status", "open")
      .order("impact_score", { ascending: false })
      .limit(maxConcurrent - (activeProposals || 0));

    if (!gaps || gaps.length === 0) {
      return new Response(JSON.stringify({ skipped: "No open gaps to address" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const proposalsCreated = [];
    let totalCostCents = 0;

    for (const gap of gaps) {
      // Find related discoveries
      const { data: relatedDisc } = await supabase
        .from("yana_discovery_feed")
        .select("id, source, title, url, description, ai_evaluation")
        .contains("matched_gap_ids", [gap.id])
        .gte("relevance_score", 0.4)
        .eq("status", "evaluated")
        .order("relevance_score", { ascending: false })
        .limit(5);

      const discoveriesText = (relatedDisc || []).length > 0
        ? (relatedDisc || []).map((d: any) => `- [${d.source}] ${d.title}: ${d.description?.slice(0, 200)} (${d.url})`).join("\n")
        : "Nu există descoperiri externe relevante — propune agent bazat pe cunoștințe interne.";

      const userPrompt = `GAP DE CAPACITATE:
Tip: ${gap.gap_type}
Topic: ${gap.topic}
Descriere: ${gap.description}
Impact score: ${gap.impact_score}

DESCOPERIRI EXTERNE RELEVANTE:
${discoveriesText}

Propune UN agent specializat care rezolvă acest gap. JSON valid.`;

      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!r.ok) { console.warn("[self-coder] AI call failed", r.status); continue; }
        const data = await r.json();
        const usage = data.usage || {};
        totalCostCents += Math.ceil((usage.total_tokens || 0) * 0.0015); // rough GPT-5 estimate

        const content = data.choices?.[0]?.message?.content || "{}";
        const spec = JSON.parse(content);

        // Insert proposal
        const { data: proposal, error: insErr } = await supabase
          .from("yana_self_proposals")
          .insert({
            proposal_type: "new_agent",
            title: `Agent: ${spec.agent_name} — ${gap.topic}`.slice(0, 200),
            rationale: spec.rationale || `Răspunde la gap "${gap.topic}".`,
            target_gap_ids: [gap.id],
            source_discovery_ids: (relatedDisc || []).map((d: any) => d.id),
            generated_code: JSON.stringify(spec, null, 2),
            generated_config: spec,
            estimated_impact: spec.estimated_impact || 0.5,
            status: "pending_test",
            created_by: "yana-self-coder",
          })
          .select("id")
          .single();

        if (insErr) { console.warn("[self-coder] insert error", insErr); continue; }

        // Mark gap as in_progress
        await supabase.from("yana_capability_gaps")
          .update({ status: "in_progress", resolved_by_proposal_id: proposal.id })
          .eq("id", gap.id);

        // Mark used discoveries
        if (relatedDisc && relatedDisc.length > 0) {
          await supabase.from("yana_discovery_feed")
            .update({ status: "used" })
            .in("id", relatedDisc.map((d: any) => d.id));
        }

        proposalsCreated.push({ id: proposal.id, agent_name: spec.agent_name, gap_topic: gap.topic });
      } catch (e) { console.warn("[self-coder] gap processing error", e); }
    }

    // Log cost
    if (totalCostCents > 0) {
      await supabase.from("ai_usage").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        endpoint: "yana-self-coder",
        model: "openai/gpt-5",
        month_year: new Date().toISOString().slice(0, 7),
        estimated_cost_cents: totalCostCents,
        success: true,
      }).select();
    }

    return new Response(JSON.stringify({
      success: true,
      duration_ms: Date.now() - startTime,
      proposals_created: proposalsCreated.length,
      proposals: proposalsCreated,
      cost_cents: totalCostCents,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-self-coder] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
