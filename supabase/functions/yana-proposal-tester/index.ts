/**
 * YANA PROPOSAL TESTER
 * Hourly. For each proposal in `pending_test`, deploy as shadow agent (10% traffic).
 * After min_test_invocations, decide: promote to deployed | rollback | extend.
 *
 * Decision logic:
 *  - If success_rate >= baseline - rollback_threshold → promote
 *  - If success_rate < baseline - rollback_threshold → rollback
 *  - If invocations < min → extend testing
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: settings } = await supabase
      .from("yana_self_dev_settings")
      .select("enabled, rollback_threshold_percent, min_test_invocations")
      .limit(1)
      .maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const rollbackThreshold = (settings?.rollback_threshold_percent || 5) / 100;
    const minInvocations = settings?.min_test_invocations || 20;

    const actions: Array<Record<string, unknown>> = [];

    // === STEP 1: Promote pending_test → shadow_testing (deploy as shadow agent) ===
    const { data: pending } = await supabase
      .from("yana_self_proposals")
      .select("id, title, generated_config, target_gap_ids")
      .eq("status", "pending_test")
      .limit(5);

    // Compute baseline success rate (across all existing agents in last 7d)
    const { data: baselineExec } = await supabase
      .from("yana_agent_executions")
      .select("success")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500);
    const baselineRate = baselineExec && baselineExec.length > 0
      ? baselineExec.filter((e: any) => e.success).length / baselineExec.length
      : 0.7; // sensible default

    for (const p of pending || []) {
      try {
        const cfg = p.generated_config || {};
        // Create the agent in yana_generated_agents table (shadow mode flag in config)
        const { data: agent, error: agentErr } = await supabase
          .from("yana_generated_agents")
          .insert({
            agent_name: cfg.agent_name || `auto_${p.id.slice(0, 8)}`,
            purpose: cfg.agent_purpose || p.title,
            system_prompt: cfg.system_prompt || "",
            trigger_keywords: cfg.trigger_keywords || [],
            model: cfg.model || "google/gemini-2.5-flash",
            topic: (cfg.trigger_keywords || [])[0] || "general",
            tools_whitelist: cfg.tools_needed || [],
            is_active: true,
            created_by: "yana-self-coder",
            metadata: { shadow_mode: true, proposal_id: p.id, traffic_percent: 10 },
          })
          .select("id")
          .single();

        if (agentErr) {
          console.warn("[tester] agent create failed", agentErr);
          await supabase.from("yana_self_proposals")
            .update({ status: "rejected", rejection_reason: `Agent creation failed: ${agentErr.message}` })
            .eq("id", p.id);
          actions.push({ proposal_id: p.id, action: "rejected", reason: agentErr.message });
          continue;
        }

        await supabase.from("yana_self_proposals")
          .update({
            status: "shadow_testing",
            deployed_agent_id: agent.id,
            shadow_started_at: new Date().toISOString(),
            baseline_success_rate: baselineRate,
            shadow_traffic_percent: 10,
          })
          .eq("id", p.id);

        // Open a test window
        await supabase.from("yana_proposal_tests").insert({ proposal_id: p.id });
        actions.push({ proposal_id: p.id, action: "promoted_to_shadow", agent_id: agent.id });
      } catch (e: any) {
        console.warn("[tester] pending error", e);
      }
    }

    // === STEP 2: Evaluate shadow_testing proposals ===
    const { data: shadowing } = await supabase
      .from("yana_self_proposals")
      .select("id, title, baseline_success_rate, deployed_agent_id, shadow_started_at, target_gap_ids")
      .eq("status", "shadow_testing");

    for (const p of shadowing || []) {
      // Get latest open test window
      const { data: testRow } = await supabase
        .from("yana_proposal_tests")
        .select("id, invocation_count, success_count, failure_count, total_cost_cents")
        .eq("proposal_id", p.id)
        .is("decided_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!testRow) continue;

      const totalInvocations = testRow.invocation_count || 0;
      const successRate = totalInvocations > 0 ? testRow.success_count / totalInvocations : 0;
      const baseline = p.baseline_success_rate || 0.7;
      const ageHours = (Date.now() - new Date(p.shadow_started_at).getTime()) / 3600000;

      // Update current rate on proposal
      await supabase.from("yana_self_proposals")
        .update({ current_success_rate: successRate })
        .eq("id", p.id);

      let decision: string | null = null;
      let reason = "";

      if (totalInvocations < minInvocations && ageHours < 72) {
        // Need more data, but force decision after 72h
        continue;
      }

      if (successRate >= baseline - rollbackThreshold) {
        decision = "promote";
        reason = `Success rate ${(successRate * 100).toFixed(1)}% >= baseline ${(baseline * 100).toFixed(1)}% - threshold (${rollbackThreshold * 100}%). Promoting to 100% traffic.`;
      } else {
        decision = "rollback";
        reason = `Success rate ${(successRate * 100).toFixed(1)}% < baseline ${(baseline * 100).toFixed(1)}% - threshold. Rolling back.`;
      }

      // Apply decision
      if (decision === "promote" && p.deployed_agent_id) {
        // Remove shadow flag, push to 100%
        const { data: existingAgent } = await supabase
          .from("yana_generated_agents")
          .select("metadata")
          .eq("id", p.deployed_agent_id)
          .maybeSingle();
        const newMeta = { ...(existingAgent?.metadata || {}), shadow_mode: false, traffic_percent: 100, promoted_at: new Date().toISOString() };
        await supabase.from("yana_generated_agents").update({ metadata: newMeta }).eq("id", p.deployed_agent_id);

        await supabase.from("yana_self_proposals").update({ status: "deployed", deployed_at: new Date().toISOString() }).eq("id", p.id);
        // Mark gaps as resolved
        if (p.target_gap_ids?.length > 0) {
          await supabase.from("yana_capability_gaps").update({ status: "resolved" }).in("id", p.target_gap_ids);
        }
      } else if (decision === "rollback" && p.deployed_agent_id) {
        // Deactivate the agent
        await supabase.from("yana_generated_agents").update({ is_active: false }).eq("id", p.deployed_agent_id);
        await supabase.from("yana_self_proposals").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", p.id);
        // Reopen gaps
        if (p.target_gap_ids?.length > 0) {
          await supabase.from("yana_capability_gaps").update({ status: "open", resolved_by_proposal_id: null }).in("id", p.target_gap_ids);
        }
      }

      await supabase.from("yana_proposal_tests")
        .update({ decision, decision_reason: reason, decided_at: new Date().toISOString(), metrics_window_end: new Date().toISOString() })
        .eq("id", testRow.id);

      actions.push({ proposal_id: p.id, decision, success_rate: successRate, baseline, invocations: totalInvocations });
    }

    return new Response(JSON.stringify({
      success: true,
      duration_ms: Date.now() - startTime,
      baseline_success_rate: baselineRate,
      actions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-proposal-tester] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
