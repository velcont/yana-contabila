import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * CONTROLER METACOGNITIV: YANA-BRAIN
 * Decide automat când să observe, când să acționeze, când să reflecteze.
 * Evaluează performanța celor 3 sisteme și comută între moduri.
 * Rulează la fiecare 6 ore (cron).
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const hour = now.getUTCHours();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // ===== COLLECT SYSTEM STATE =====

    // 1. Unprocessed observations count
    const { count: unprocessedCount } = await supabase
      .from("yana_observations")
      .select("*", { count: "exact", head: true })
      .eq("processed", false);

    // 2. Recent error observations (last 6h)
    const { count: recentErrors } = await supabase
      .from("yana_observations")
      .select("*", { count: "exact", head: true })
      .eq("observation_type", "error_detected")
      .gte("created_at", sixHoursAgo);

    // 3. Recent positive feedback
    const { count: recentPositive } = await supabase
      .from("yana_observations")
      .select("*", { count: "exact", head: true })
      .eq("observation_type", "positive_feedback")
      .gte("created_at", sixHoursAgo);

    // 4. Average self_score from recent reflections
    const { data: recentReflections } = await supabase
      .from("ai_reflection_logs")
      .select("self_score")
      .gte("created_at", oneDayAgo);

    const avgSelfScore = recentReflections?.length
      ? recentReflections.reduce((s, r) => s + (r.self_score || 0), 0) / recentReflections.length
      : 7;

    // 5. Pending decisions count
    const { count: pendingDecisions } = await supabase
      .from("yana_improvement_decisions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // 6. Last brain decision
    const { data: lastDecision } = await supabase
      .from("yana_brain_decisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentMode = lastDecision?.to_mode || "observe";

    // ===== DECIDE MODE =====
    const metrics = {
      unprocessed_observations: unprocessedCount || 0,
      recent_errors_6h: recentErrors || 0,
      recent_positive_6h: recentPositive || 0,
      avg_self_score: Math.round((avgSelfScore || 7) * 100) / 100,
      pending_decisions: pendingDecisions || 0,
      current_hour_utc: hour,
      current_mode: currentMode,
    };

    let newMode = currentMode;
    const reasoning: Record<string, unknown> = { metrics };
    const actionsTriggered: string[] = [];

    // Night time (00:00 - 05:00 UTC) → REFLECT
    if (hour >= 0 && hour < 5) {
      newMode = "reflect";
      reasoning.trigger = "night_time_reflection";
      reasoning.description = "Noaptea: consolidare memorie, procesare zi, generare vise";
      
      // Trigger recursive-optimizer
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/recursive-optimizer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ triggered_by: "yana-brain", mode: "night_reflection" }),
        });
        if (resp.ok) actionsTriggered.push("recursive-optimizer");
      } catch (e) {
        console.error("[Brain] Failed to trigger recursive-optimizer:", e);
      }
    }
    // Many errors → intensive OBSERVE mode
    else if ((recentErrors || 0) > 10) {
      newMode = "observe";
      reasoning.trigger = "high_error_rate";
      reasoning.description = `${recentErrors} erori în 6h — observare intensivă activată`;
    }
    // Many unprocessed observations → ACT
    else if ((unprocessedCount || 0) > 50) {
      newMode = "act";
      reasoning.trigger = "observation_backlog";
      reasoning.description = `${unprocessedCount} observații neprocesate — actorul trebuie să proceseze`;
      
      // Trigger actor
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/yana-actor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ triggered_by: "yana-brain" }),
        });
        if (resp.ok) actionsTriggered.push("yana-actor");
      } catch (e) {
        console.error("[Brain] Failed to trigger yana-actor:", e);
      }
    }
    // Low self-score → observe more carefully
    else if (avgSelfScore < 5) {
      newMode = "observe";
      reasoning.trigger = "low_quality_score";
      reasoning.description = `Scor mediu calitate ${avgSelfScore.toFixed(1)}/10 — observare mai atentă`;
    }
    // Many pending decisions → ACT to resolve
    else if ((pendingDecisions || 0) > 10) {
      newMode = "act";
      reasoning.trigger = "pending_decisions_backlog";
      reasoning.description = `${pendingDecisions} decizii în așteptare`;
    }
    // Daytime + stable → EXPLORE (10:00-18:00 UTC, max 2/day)
    else if (hour >= 10 && hour < 18) {
      // Check how many explorations today
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count: todayExplorations } = await supabase
        .from("yana_explorations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString());

      if ((todayExplorations || 0) < 2) {
        newMode = "explore";
        reasoning.trigger = "stable_daytime_exploration";
        reasoning.description = `Sistem stabil, ziua (${hour}:00 UTC) — explorare autonomă pe internet`;

        // Trigger explorer
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/yana-explorer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ triggered_by: "yana-brain", mode: "autonomous_exploration" }),
          });
          if (resp.ok) actionsTriggered.push("yana-explorer");
        } catch (e) {
          console.error("[Brain] Failed to trigger yana-explorer:", e);
        }
      } else {
        newMode = "observe";
        reasoning.trigger = "exploration_limit_reached";
        reasoning.description = `Deja ${todayExplorations} explorări azi — observare pasivă`;
      }
    }
    // Everything looks good → balanced observe
    else {
      newMode = "observe";
      reasoning.trigger = "balanced_state";
      reasoning.description = "Sistem stabil — observare pasivă normală";
    }

    // ===== PERIODIC: Trigger actor if observations pile up (regardless of mode) =====
    if ((unprocessedCount || 0) > 30 && !actionsTriggered.includes("yana-actor")) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/yana-actor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ triggered_by: "yana-brain", reason: "periodic_cleanup" }),
        });
        if (resp.ok) actionsTriggered.push("yana-actor-periodic");
      } catch (e) {
        console.error("[Brain] Periodic actor trigger failed:", e);
      }
    }

    // ===== SAVE DECISION =====
    const { error: insertErr } = await supabase
      .from("yana_brain_decisions")
      .insert({
        decision_type: newMode !== currentMode ? "mode_switch" : "mode_maintain",
        from_mode: currentMode,
        to_mode: newMode,
        reasoning,
        metrics_snapshot: metrics,
        actions_triggered: actionsTriggered,
      });

    if (insertErr) console.error("[Brain] Decision insert error:", insertErr);

    return new Response(
      JSON.stringify({
        success: true,
        previous_mode: currentMode,
        new_mode: newMode,
        trigger: reasoning.trigger,
        actions_triggered: actionsTriggered,
        metrics,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Brain] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
