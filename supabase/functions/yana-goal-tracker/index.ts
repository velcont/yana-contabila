/**
 * YANA GOAL TRACKER (cron daily)
 * Iterates active long-term intentions, recalculates progress, and triggers next action.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const processed: Array<Record<string, unknown>> = [];

  try {
    const { data: goals } = await supabase
      .from("yana_intentions")
      .select("id, user_id, intention, sub_tasks, progress_pct, next_action_at, auto_execute, parent_goal_id")
      .eq("status", "active")
      .is("parent_goal_id", null)
      .limit(50);

    for (const g of goals || []) {
      const subs = Array.isArray(g.sub_tasks) ? g.sub_tasks as Array<{ done?: boolean }> : [];
      const total = subs.length;
      const done = subs.filter(s => s.done).length;
      const newProgress = total > 0 ? Math.round((done / total) * 100) : g.progress_pct ?? 0;

      await supabase.from("yana_intentions").update({
        progress_pct: newProgress,
        next_action_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }).eq("id", g.id);

      processed.push({ id: g.id, user_id: g.user_id, progress: newProgress });
    }

    return new Response(JSON.stringify({ processed: processed.length, goals: processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[goal-tracker]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});