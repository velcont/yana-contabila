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

// ============================================================
// CODE PATCH MODE (opt-in via yana_self_mod_settings.enable_code_patches)
// Generates a SMALL modification to an existing source file and stores it as a
// `code_patch` proposal awaiting human approval. The actual GitHub PR is opened
// later by yana-code-patch-promoter -> yana-self-modifier (both gated again).
// ============================================================

const PATCH_PICK_PROMPT = `Ești YANA Code-Patcher. Pe baza unui gap de capacitate, alegi UN SINGUR fișier existent de modificat printr-o schimbare MICĂ și sigură (ex: ajustare la un system prompt, o validare, un mesaj, un câmp).
Poți modifica DOAR fișiere care încep cu unul dintre aceste prefixe (scopuri permise): {SCOPES}
Reguli STRICTE:
- Alege un fișier EXISTENT și relevant pentru gap.
- Schimbare minimă — fără refactor mare, fără ștergeri masive.
- NU atinge logică de plată/securitate decât dacă e strict necesar.
Răspuns JSON valid: {"target_path":"...","change_summary":"ce și de ce, concret"} SAU {"skip":true,"reason":"..."}`;

const PATCH_WRITE_PROMPT = `Ești YANA Code-Patcher. Primești conținutul COMPLET al unui fișier și o instrucțiune de modificare mică.
Returnezi conținutul COMPLET al fișierului DUPĂ modificare — identic cu originalul peste tot în afară de schimbarea cerută.
Răspuns JSON valid: {"new_content":"<întreg fișierul modificat>","summary":"rezumat 1 frază"}. Fără text în afara JSON.`;

async function callPatchLLM(messages: Array<Record<string, string>>): Promise<any | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5-mini", messages, response_format: { type: "json_object" } }),
    });
    if (!r.ok) { console.warn("[self-coder] patch LLM failed", r.status); return null; }
    const data = await r.json();
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch (e) { console.warn("[self-coder] patch LLM error", e); return null; }
}

async function readViaModifier(path: string): Promise<{ content?: string; sha?: string; error?: string }> {
  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/yana-self-modifier?action=read`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// Mirror (conservatively) the modifier's path rules so we don't even propose a
// patch the modifier would reject. self-coder limits itself to allowed_scopes and
// never touches migrations/config — those require explicit modifier flags.
function patchPathAllowed(path: string, modSettings: any): boolean {
  for (const f of (modSettings.forbidden_paths || [])) {
    if (path.startsWith(f)) return false;
  }
  if (path.startsWith("supabase/migrations/")) return false;
  const configFiles = ["vite.config.ts", "tailwind.config.ts", "package.json", "tsconfig.json", "index.html"];
  if (configFiles.some((c) => path === c || path.endsWith("/" + c))) return false;
  return (modSettings.allowed_scopes || []).some((s: string) => path.startsWith(s));
}

async function tryGenerateCodePatch(supabase: any, gap: any, modSettings: any): Promise<Record<string, unknown>> {
  const scopes = (modSettings.allowed_scopes || []).join(", ");

  // Step 1: choose a target file + describe the change.
  const pick = await callPatchLLM([
    { role: "system", content: PATCH_PICK_PROMPT.replace("{SCOPES}", scopes) },
    { role: "user", content: `GAP:\nTip: ${gap.gap_type}\nTopic: ${gap.topic}\nDescriere: ${gap.description}` },
  ]);
  if (!pick || pick.skip || !pick.target_path) return { skipped: pick?.reason || "no target chosen" };

  const targetPath = String(pick.target_path).trim();
  if (!patchPathAllowed(targetPath, modSettings)) return { skipped: `path not allowed: ${targetPath}` };

  // Step 2: read the current file content.
  const current = await readViaModifier(targetPath);
  if (current.error || typeof current.content !== "string") {
    return { skipped: `cannot read ${targetPath}: ${current.error || "no content"}` };
  }
  if (current.content.length > 24000) return { skipped: `file too large for safe patch (${current.content.length} chars)` };

  // Step 3: produce the full modified file.
  const patched = await callPatchLLM([
    { role: "system", content: PATCH_WRITE_PROMPT },
    { role: "user", content: `FIȘIER: ${targetPath}\nINSTRUCȚIUNE: ${pick.change_summary}\n\nCONȚINUT ACTUAL:\n\`\`\`\n${current.content}\n\`\`\`` },
  ]);
  if (!patched || typeof patched.new_content !== "string") return { skipped: "no new_content produced" };
  if (patched.new_content.trim() === current.content.trim()) return { skipped: "patch produced no change" };

  // Store as a proposal awaiting human approval (status: proposed_patch).
  const { data: proposal, error } = await supabase
    .from("yana_self_proposals")
    .insert({
      proposal_type: "code_patch",
      title: `Patch: ${targetPath.split("/").pop()} — ${gap.topic}`.slice(0, 200),
      rationale: (pick.change_summary || `Patch pentru gap "${gap.topic}".`).slice(0, 1000),
      target_gap_ids: [gap.id],
      generated_code: patched.new_content,
      generated_config: {
        kind: "code_patch",
        target_path: targetPath,
        new_content: patched.new_content,
        summary: patched.summary || pick.change_summary,
        gap_id: gap.id,
      },
      estimated_impact: gap.impact_score ? Math.min(1, Number(gap.impact_score) / 5) : 0.4,
      status: "proposed_patch",
      created_by: "yana-self-coder",
    })
    .select("id")
    .single();
  if (error) return { skipped: "insert error: " + error.message };
  return { id: proposal.id, target_path: targetPath, summary: patched.summary || pick.change_summary };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: settings } = await supabase.from("yana_self_dev_settings").select("enabled, max_concurrent_proposals, ai_budget_cents_per_day").limit(1).maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "self-development disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CODE PATCH PASS (independent + opt-in) ===
    // Runs at most once per invocation and only when explicitly enabled. Decoupled
    // from the agent-spec flow so it isn't starved when agent slots are full.
    let patchResult: Record<string, unknown> | null = null;
    try {
      const { data: modSettings } = await supabase
        .from("yana_self_mod_settings")
        .select("enable_code_patches, allowed_scopes, forbidden_paths")
        .eq("id", 1)
        .maybeSingle();

      if (modSettings?.enable_code_patches) {
        // Never stack patches: only generate when none are pending/in-flight.
        const { count: openPatches } = await supabase
          .from("yana_self_proposals")
          .select("*", { count: "exact", head: true })
          .eq("proposal_type", "code_patch")
          .in("status", ["proposed_patch", "approved_patch", "promoting"]);

        if ((openPatches || 0) > 0) {
          patchResult = { skipped: "a code patch is already pending/in-flight" };
        } else {
          const { data: topGaps } = await supabase
            .from("yana_capability_gaps")
            .select("id, gap_type, topic, description, impact_score")
            .in("status", ["open", "in_progress"])
            .order("impact_score", { ascending: false })
            .limit(1);
          if (topGaps && topGaps[0]) {
            patchResult = await tryGenerateCodePatch(supabase, topGaps[0], modSettings);
          } else {
            patchResult = { skipped: "no open gaps for a code patch" };
          }
        }
      }
    } catch (e) {
      console.warn("[self-coder] code patch pass error", e);
      patchResult = { error: String(e) };
    }

    // Check concurrent proposals cap
    const { count: activeProposals } = await supabase
      .from("yana_self_proposals")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending_test", "shadow_testing"]);
    const maxConcurrent = settings?.max_concurrent_proposals || 3;
    if ((activeProposals || 0) >= maxConcurrent) {
      return new Response(JSON.stringify({ skipped: `Max concurrent proposals (${maxConcurrent}) reached`, code_patch: patchResult }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get top open gaps with relevant discoveries (process max 2 per run to stay under 150s timeout)
    const slotsAvailable = maxConcurrent - (activeProposals || 0);
    const batchSize = Math.min(slotsAvailable, 2);
    // Pick gaps that are not resolved AND don't have a healthy proposal (pending/shadow/deployed).
    // This lets us retry gaps where previous proposals were rejected or rolled_back.
    const { data: activeProps } = await supabase
      .from("yana_self_proposals")
      .select("id")
      .in("status", ["pending_test", "shadow_testing", "deployed"]);
    const blockedIds = (activeProps || []).map((p: any) => p.id);
    let gapsQuery = supabase
      .from("yana_capability_gaps")
      .select("id, gap_type, topic, description, evidence, impact_score, resolved_by_proposal_id")
      .in("status", ["open", "in_progress"])
      .order("impact_score", { ascending: false })
      .limit(batchSize * 4);
    const { data: candidates } = await gapsQuery;
    const gaps = (candidates || [])
      .filter((g: any) => !g.resolved_by_proposal_id || !blockedIds.includes(g.resolved_by_proposal_id))
      .slice(0, batchSize);

    if (!gaps || gaps.length === 0) {
      return new Response(JSON.stringify({ skipped: "Nicio lacună deschisă fără propunere. Rulează diagnoza pentru a detecta lacune noi, sau resetează lacunele blocate.", code_patch: patchResult }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
            model: "openai/gpt-5-mini",
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
      code_patch: patchResult,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-self-coder] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
