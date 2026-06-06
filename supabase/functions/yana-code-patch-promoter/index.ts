/**
 * YANA CODE-PATCH PROMOTER
 * Cron (every 30 min). Pushes APPROVED code-patch proposals to yana-self-modifier,
 * which opens a real GitHub PR (and merges per the modifier's own settings).
 *
 * This function is intentionally a NO-OP unless every safety gate is satisfied:
 *   1. yana_self_mod_settings.enable_code_patches = true   (master gate)
 *   2. yana_self_mod_settings.kill_switch          = false (modifier also re-enforces this)
 *   3. proposal.status = 'approved_patch'                  (human-approved in Admin),
 *        OR code_patch_require_approval = false (full-auto) -> 'proposed_patch' also eligible
 *
 * One patch is processed per run (yana-self-modifier only allows one in-flight
 * modification at a time). Transient modifier errors leave the patch eligible to retry.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: s } = await supabase
      .from("yana_self_mod_settings")
      .select("kill_switch, enable_code_patches, code_patch_require_approval, code_patch_max_per_run")
      .eq("id", 1)
      .single();

    if (!s?.enable_code_patches) return json({ skipped: "enable_code_patches=false" });
    if (s.kill_switch) return json({ skipped: "kill switch ON — modifier blocked" });

    // Which statuses are eligible to promote.
    const eligible = s.code_patch_require_approval
      ? ["approved_patch"]
      : ["approved_patch", "proposed_patch"];

    const { data: patches } = await supabase
      .from("yana_self_proposals")
      .select("id, title, rationale, generated_config, target_gap_ids")
      .eq("proposal_type", "code_patch")
      .in("status", eligible)
      .order("created_at", { ascending: true })
      .limit(Math.max(1, s.code_patch_max_per_run || 1));

    if (!patches || patches.length === 0) return json({ promoted: 0, note: "no eligible patches" });

    const results: Array<Record<string, unknown>> = [];

    for (const p of patches) {
      const cfg: any = p.generated_config || {};
      const targetPath = cfg.target_path;
      const newContent = cfg.new_content;

      if (!targetPath || typeof newContent !== "string") {
        await supabase.from("yana_self_proposals")
          .update({ status: "patch_failed", rejection_reason: "Missing target_path/new_content in config" })
          .eq("id", p.id);
        results.push({ id: p.id, error: "invalid config" });
        continue;
      }

      // Claim it so an overlapping cron run doesn't double-process.
      await supabase.from("yana_self_proposals").update({ status: "promoting" }).eq("id", p.id);

      const r = await fetch(`${SUPABASE_URL}/functions/v1/yana-self-modifier?action=propose`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          rationale: p.rationale || p.title,
          trigger_source: "yana-code-patch-promoter",
          trigger_ref: p.id,
          files: [{ path: targetPath, content: newContent }],
          auto_merge: true,
        }),
      });
      const out = await r.json().catch(() => ({} as any));

      if (out?.ok) {
        await supabase.from("yana_self_proposals").update({
          status: "deployed",
          deployed_at: new Date().toISOString(),
          generated_config: { ...cfg, pr_url: out.pr_url, pr_number: out.pr_number, modification_id: out.modification_id },
        }).eq("id", p.id);
        if (p.target_gap_ids?.length) {
          await supabase.from("yana_capability_gaps").update({ status: "resolved" }).in("id", p.target_gap_ids);
        }
        results.push({ id: p.id, pr_url: out.pr_url, pr_number: out.pr_number });
      } else {
        const err = String(out?.error || "modifier returned no ok");
        // Transient = retry next run; keep it eligible rather than burning the patch.
        const transient = /in flight|daily limit|kill switch|another modification/i.test(err);
        const revertTo = s.code_patch_require_approval ? "approved_patch" : "proposed_patch";
        await supabase.from("yana_self_proposals").update({
          status: transient ? revertTo : "patch_failed",
          rejection_reason: err,
        }).eq("id", p.id);
        results.push({ id: p.id, error: err, retry: transient });
      }

      // yana-self-modifier only allows one in-flight modification — stop after one.
      break;
    }

    return json({ promoted: results.length, results });
  } catch (e: any) {
    console.error("[yana-code-patch-promoter]", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
