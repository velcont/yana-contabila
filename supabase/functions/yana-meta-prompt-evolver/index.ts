/**
 * YANA META-PROMPT EVOLVER
 * Cron weekly. Reads top weaknesses from yana_conversation_evaluations (last 7d),
 * proposes a new version of the main system prompt addressing them, saves
 * to yana_meta_prompt_versions as `is_active=false` (shadow). Existing chat-ai
 * stays on the active version until promoted manually or by shadow-score test.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM = `Ești arhitect de prompt-uri pentru YANA (asistent AI contabil/business RO, persona "Premium Executive Secretary", validare emoțională înainte de soluții).
Primești:
1) System prompt-ul curent (ACTIV)
2) Top weaknesses observate săptămâna asta (auto-evaluate)
3) Top capability gaps deschise

Sarcina: propui o VERSIUNE NOUĂ minimal modificată a system prompt-ului care adresează slăbiciunile fără să rupă identitatea/regulile existente. Schimbări mici, focalizate. NU rescrie tot.

Returnezi JSON:
{"new_prompt": "...", "rationale": "ce ai schimbat și de ce, scurt", "expected_improvements": ["...", "..."]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: active } = await supabase
      .from("yana_meta_prompt_versions")
      .select("id, version_number, prompt_text")
      .eq("prompt_key", "main_system")
      .eq("is_active", true)
      .maybeSingle();

    // Bootstrap: if no active version, seed v1 with placeholder
    let activeText = active?.prompt_text;
    let activeVersion = active?.version_number || 0;
    let parentId = active?.id || null;
    if (!active) {
      const seed = "Ești YANA — asistent AI pentru business și contabilitate RO. Validare emoțională înainte de soluții. Concis, direct, ton calm.";
      const { data: seeded } = await supabase.from("yana_meta_prompt_versions").insert({
        version_number: 1, prompt_key: "main_system", prompt_text: seed,
        is_active: true, generated_by: "bootstrap", generation_rationale: "Initial seed",
      }).select("id, version_number, prompt_text").single();
      activeText = seeded?.prompt_text;
      activeVersion = seeded?.version_number || 1;
      parentId = seeded?.id || null;
    }

    // Last 7d weaknesses
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weak } = await supabase
      .from("yana_conversation_evaluations")
      .select("score, weakness_summary, improvement_suggestion, gap_topic")
      .lte("score", 6)
      .gte("created_at", since)
      .order("score", { ascending: true })
      .limit(30);

    if (!weak || weak.length < 5) {
      return new Response(JSON.stringify({ skipped: "not enough weakness signal yet", samples: weak?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: gaps } = await supabase
      .from("yana_capability_gaps")
      .select("topic, description, impact_score")
      .eq("status", "open")
      .order("impact_score", { ascending: false })
      .limit(10);

    const userPrompt = `PROMPT ACTIV (v${activeVersion}):\n${activeText}\n\nWEAKNESSES (last 7d, ${weak.length} samples):\n${weak.map((w: any) => `- [${w.score}/10] ${w.weakness_summary} → ${w.improvement_suggestion}`).join("\n")}\n\nOPEN GAPS:\n${(gaps || []).map((g: any) => `- ${g.topic}: ${g.description}`).join("\n")}\n\nPropune versiunea nouă. JSON valid.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI call failed", status: r.status, body: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const out = JSON.parse(j.choices?.[0]?.message?.content || "{}");
    if (!out.new_prompt || typeof out.new_prompt !== "string" || out.new_prompt.length < 50) {
      return new Response(JSON.stringify({ error: "Invalid AI output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted } = await supabase.from("yana_meta_prompt_versions").insert({
      version_number: activeVersion + 1,
      prompt_key: "main_system",
      prompt_text: out.new_prompt,
      parent_version_id: parentId,
      generated_by: "yana-meta-prompt-evolver",
      generation_rationale: out.rationale || null,
      is_active: false, // shadow
    }).select("id, version_number").single();

    return new Response(JSON.stringify({
      success: true,
      new_version: inserted?.version_number,
      shadow_id: inserted?.id,
      rationale: out.rationale,
      expected_improvements: out.expected_improvements,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[meta-prompt-evolver]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});