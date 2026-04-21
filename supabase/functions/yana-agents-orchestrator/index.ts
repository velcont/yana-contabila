/**
 * YANA AGENTS ORCHESTRATOR — Cron runner for scheduled dynamic agents.
 *
 * Picks up active agents whose schedule is due (hourly/daily/weekly) and
 * triggers them via yana-dynamic-agent. Runs as a cron, no per-user auth
 * (executes as system; agents that need user_id pick the agent's creator
 * fallback or a default admin). Today we run only schedules that have
 * `metadata.run_as_user_id` defined to keep things safe.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function isDue(schedule: string, lastExecutedAt: string | null): boolean {
  if (schedule === "on_demand") return false;
  if (!lastExecutedAt) return true;
  const last = new Date(lastExecutedAt).getTime();
  const now = Date.now();
  const diffH = (now - last) / 3600000;
  if (schedule === "hourly") return diffH >= 1;
  if (schedule === "daily") return diffH >= 24;
  if (schedule === "weekly") return diffH >= 24 * 7;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const triggered: Array<Record<string, unknown>> = [];

  try {
    const { data: agents } = await supabase
      .from("yana_generated_agents")
      .select("agent_slug, schedule, last_executed_at, metadata")
      .eq("is_active", true)
      .neq("schedule", "on_demand")
      .limit(20);

    for (const a of agents || []) {
      if (!isDue(a.schedule as string, a.last_executed_at as string | null)) continue;
      const runAsUserId = (a.metadata as { run_as_user_id?: string })?.run_as_user_id;
      if (!runAsUserId) continue; // skip if no user context configured

      const resp = await fetch(`${supabaseUrl}/functions/v1/yana-dynamic-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "x-yana-user-id": runAsUserId,
        },
        body: JSON.stringify({
          agent_slug: a.agent_slug,
          input: (a.metadata as { default_input?: string })?.default_input || "Execută rutina ta programată.",
          trigger_source: "cron",
        }),
      });
      triggered.push({ slug: a.agent_slug, status: resp.status });
    }

    return new Response(JSON.stringify({ triggered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[orchestrator] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});