import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Create cycle record
    const { data: cycle, error: cycleErr } = await supabase
      .from("yana_optimization_cycles")
      .insert({ status: "running", phase: "collect_metrics" })
      .select()
      .single();

    if (cycleErr) throw cycleErr;
    const cycleId = cycle.id;
    const cycleNumber = cycle.cycle_number;

    // Load dynamic config
    const { data: configRows } = await supabase
      .from("yana_optimizer_config")
      .select("*");

    const config: Record<string, number> = {};
    for (const row of configRows || []) {
      config[row.config_key] = row.config_value;
    }

    const qualityThreshold = config["quality_threshold"] ?? 6.0;
    const costThreshold = config["cost_threshold_cents"] ?? 50;
    const cacheMinHitRate = config["cache_min_hit_rate"] ?? 0.2;
    const latencyThreshold = config["latency_threshold_ms"] ?? 5000;
    const satisfactionThreshold = config["satisfaction_threshold"] ?? 0.5;
    const autoApplyConfidence = config["auto_apply_confidence"] ?? 0.9;

    // ===== PHASE 1: Collect Metrics =====
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Average self_score from ai_reflection_logs
    const { data: reflections } = await supabase
      .from("ai_reflection_logs")
      .select("self_score, processing_time_ms")
      .gte("created_at", sevenDaysAgo);

    const avgScore = reflections?.length
      ? reflections.reduce((s, r) => s + (r.self_score || 0), 0) / reflections.length
      : 7;

    const avgLatency = reflections?.length
      ? reflections.reduce((s, r) => s + (r.processing_time_ms || 0), 0) / reflections.length
      : 3000;

    // Average cost from ai_usage
    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("estimated_cost_cents")
      .gte("created_at", sevenDaysAgo);

    const avgCost = usageData?.length
      ? usageData.reduce((s, u) => s + (u.estimated_cost_cents || 0), 0) / usageData.length
      : 20;

    // Cache hit rate
    const { data: cacheData } = await supabase
      .from("ai_response_cache")
      .select("hit_count")
      .gte("created_at", sevenDaysAgo);

    const totalHits = cacheData?.reduce((s, c) => s + (c.hit_count || 0), 0) || 0;
    const totalCacheEntries = cacheData?.length || 1;
    const cacheHitRate = totalHits / Math.max(totalCacheEntries, 1);
    const normalizedCacheRate = Math.min(cacheHitRate / 10, 1); // normalize

    // Knowledge gaps
    const { count: gapsCount } = await supabase
      .from("yana_knowledge_gaps")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    // Satisfaction from learning log
    const { data: learningData } = await supabase
      .from("yana_learning_log")
      .select("satisfaction_score")
      .gte("created_at", sevenDaysAgo)
      .not("satisfaction_score", "is", null);

    const avgSatisfaction = learningData?.length
      ? learningData.reduce((s, l) => s + (l.satisfaction_score || 0), 0) / learningData.length
      : 0.6;

    const metricsSnapshot = {
      avg_quality_score: Math.round(avgScore * 100) / 100,
      avg_cost_cents: Math.round(avgCost * 100) / 100,
      cache_hit_rate: Math.round(normalizedCacheRate * 100) / 100,
      knowledge_gaps_open: gapsCount || 0,
      avg_latency_ms: Math.round(avgLatency),
      avg_satisfaction: Math.round(avgSatisfaction * 100) / 100,
      reflections_count: reflections?.length || 0,
      usage_count: usageData?.length || 0,
    };

    // Update phase
    await supabase
      .from("yana_optimization_cycles")
      .update({ phase: "identify_bottlenecks", metrics_snapshot: metricsSnapshot })
      .eq("id", cycleId);

    // ===== PHASE 2: Identify Bottlenecks =====
    const bottlenecks: Array<{ type: string; severity: string; value: number; threshold: number; description: string }> = [];

    if (avgScore < qualityThreshold) {
      bottlenecks.push({
        type: "quality",
        severity: avgScore < 4 ? "critical" : "warning",
        value: avgScore,
        threshold: qualityThreshold,
        description: `Scor mediu calitate ${avgScore.toFixed(1)} sub pragul ${qualityThreshold}`,
      });
    }

    if (avgCost > costThreshold) {
      bottlenecks.push({
        type: "cost",
        severity: avgCost > costThreshold * 2 ? "critical" : "warning",
        value: avgCost,
        threshold: costThreshold,
        description: `Cost mediu ${avgCost.toFixed(0)} bani depășește pragul ${costThreshold}`,
      });
    }

    if (normalizedCacheRate < cacheMinHitRate) {
      bottlenecks.push({
        type: "cache",
        severity: "warning",
        value: normalizedCacheRate,
        threshold: cacheMinHitRate,
        description: `Cache hit rate ${(normalizedCacheRate * 100).toFixed(1)}% sub minimul ${(cacheMinHitRate * 100).toFixed(1)}%`,
      });
    }

    if ((gapsCount || 0) > 5) {
      bottlenecks.push({
        type: "knowledge",
        severity: (gapsCount || 0) > 15 ? "critical" : "warning",
        value: gapsCount || 0,
        threshold: 5,
        description: `${gapsCount} knowledge gaps deschise`,
      });
    }

    if (avgLatency > latencyThreshold) {
      bottlenecks.push({
        type: "latency",
        severity: avgLatency > latencyThreshold * 2 ? "critical" : "warning",
        value: avgLatency,
        threshold: latencyThreshold,
        description: `Latență medie ${avgLatency.toFixed(0)}ms depășește ${latencyThreshold}ms`,
      });
    }

    if (avgSatisfaction < satisfactionThreshold) {
      bottlenecks.push({
        type: "satisfaction",
        severity: avgSatisfaction < 0.3 ? "critical" : "warning",
        value: avgSatisfaction,
        threshold: satisfactionThreshold,
        description: `Satisfacție ${(avgSatisfaction * 100).toFixed(1)}% sub pragul ${(satisfactionThreshold * 100).toFixed(1)}%`,
      });
    }

    await supabase
      .from("yana_optimization_cycles")
      .update({ phase: "generate_actions", bottlenecks_detected: bottlenecks })
      .eq("id", cycleId);

    // ===== PHASE 3: Generate Actions =====
    const actions: Array<{ action: string; target: string; confidence: number; auto_applied: boolean; details: string }> = [];

    for (const bn of bottlenecks) {
      switch (bn.type) {
        case "quality":
          actions.push({
            action: "trigger_cross_learner",
            target: "cross-learner",
            confidence: 0.85,
            auto_applied: false,
            details: "Triggerează cross-learner pentru agregare pattern-uri de calitate",
          });
          actions.push({
            action: "mark_low_quality_patterns",
            target: "yana_improvement_decisions",
            confidence: 0.7,
            auto_applied: false,
            details: "Marchează pattern-uri cu scor scăzut pentru revizuire",
          });
          break;

        case "cost":
          actions.push({
            action: "extend_cache_expiry",
            target: "ai_response_cache",
            confidence: 0.95,
            auto_applied: true,
            details: "Extinde cache expiry cu 50% pentru reducerea costurilor",
          });
          actions.push({
            action: "suggest_model_downgrade",
            target: "ai_router",
            confidence: 0.6,
            auto_applied: false,
            details: "Sugerează model mai ieftin pentru întrebări simple",
          });
          break;

        case "cache":
          actions.push({
            action: "normalize_cache_keys",
            target: "ai_response_cache",
            confidence: 0.92,
            auto_applied: true,
            details: "Extinde normalizarea cache keys pentru mai multe hit-uri",
          });
          break;

        case "knowledge":
          actions.push({
            action: "create_knowledge_decisions",
            target: "yana_improvement_decisions",
            confidence: 0.75,
            auto_applied: false,
            details: `Creează decizii de îmbunătățire pentru ${bn.value} gaps deschise`,
          });
          break;

        case "latency":
          actions.push({
            action: "identify_slow_endpoints",
            target: "ai_usage",
            confidence: 0.8,
            auto_applied: false,
            details: `Identifică endpoint-uri cu latență > ${bn.threshold}ms`,
          });
          break;

        case "satisfaction":
          actions.push({
            action: "analyze_negative_feedback",
            target: "yana_learning_log",
            confidence: 0.7,
            auto_applied: false,
            details: "Analizează feedback-ul negativ pentru îmbunătățiri",
          });
          break;
      }
    }

    await supabase
      .from("yana_optimization_cycles")
      .update({ phase: "apply_actions", actions_taken: actions })
      .eq("id", cycleId);

    // ===== PHASE 4: Apply Actions (controlled) =====
    for (const action of actions) {
      if (action.confidence >= autoApplyConfidence && action.auto_applied) {
        // Auto-apply high-confidence actions
        if (action.action === "extend_cache_expiry") {
          // Update cache entries to extend expiry
          const { error } = await supabase.rpc("cleanup_old_data");
          // Just trigger cleanup, actual cache tuning would be in cache logic
          if (error) console.error("Cache cleanup error:", error);
        }
        // Other auto-applied actions can be added here
      } else {
        // Save as pending decision for admin review
        await supabase.from("yana_improvement_decisions").insert({
          decision_type: "optimizer_suggestion",
          description: action.details,
          proposed_change: { action: action.action, target: action.target },
          confidence: action.confidence,
          status: "pending",
          source: "recursive-optimizer",
          cycle_number: cycleNumber,
        }).select();
      }
    }

    // ===== PHASE 5: Meta-evaluation =====
    await supabase
      .from("yana_optimization_cycles")
      .update({ phase: "meta_evaluate" })
      .eq("id", cycleId);

    // Get previous cycle metrics
    const { data: prevCycle } = await supabase
      .from("yana_optimization_cycles")
      .select("metrics_snapshot, meta_score")
      .eq("status", "completed")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .single();

    let metaScore = 0.5; // Default neutral score
    const metaAdjustments: Record<string, unknown> = {};

    if (prevCycle?.metrics_snapshot) {
      const prev = prevCycle.metrics_snapshot as Record<string, number>;
      
      // Compare key metrics
      let improvements = 0;
      let total = 0;

      if (prev.avg_quality_score) {
        total++;
        if (metricsSnapshot.avg_quality_score > prev.avg_quality_score) improvements++;
      }
      if (prev.avg_cost_cents) {
        total++;
        if (metricsSnapshot.avg_cost_cents < prev.avg_cost_cents) improvements++;
      }
      if (prev.cache_hit_rate) {
        total++;
        if (metricsSnapshot.cache_hit_rate > prev.cache_hit_rate) improvements++;
      }
      if (prev.avg_latency_ms) {
        total++;
        if (metricsSnapshot.avg_latency_ms < prev.avg_latency_ms) improvements++;
      }
      if (prev.avg_satisfaction) {
        total++;
        if (metricsSnapshot.avg_satisfaction > prev.avg_satisfaction) improvements++;
      }

      metaScore = total > 0 ? improvements / total : 0.5;

      // Adjust thresholds if meta_score is low
      if (metaScore < 0.3) {
        // Actions didn't help - relax thresholds slightly
        for (const row of configRows || []) {
          const key = row.config_key;
          const currentVal = row.config_value;
          let newVal = currentVal;

          // Relax thresholds by 10%
          if (key === "quality_threshold") newVal = Math.max(row.min_value, currentVal * 0.9);
          if (key === "cost_threshold_cents") newVal = Math.min(row.max_value, currentVal * 1.1);
          if (key === "cache_min_hit_rate") newVal = Math.max(row.min_value, currentVal * 0.9);
          if (key === "latency_threshold_ms") newVal = Math.min(row.max_value, currentVal * 1.1);
          if (key === "satisfaction_threshold") newVal = Math.max(row.min_value, currentVal * 0.9);

          if (newVal !== currentVal) {
            const historyEntry = {
              from: currentVal,
              to: Math.round(newVal * 100) / 100,
              cycle: cycleNumber,
              reason: "meta_score_low",
              timestamp: new Date().toISOString(),
            };

            await supabase
              .from("yana_optimizer_config")
              .update({
                config_value: Math.round(newVal * 100) / 100,
                last_adjusted_by_cycle: cycleNumber,
                adjustment_history: [...(row.adjustment_history || []), historyEntry],
              })
              .eq("config_key", key);

            metaAdjustments[key] = { from: currentVal, to: Math.round(newVal * 100) / 100 };
          }
        }
      }
      // If meta_score > 0.7 — keep current strategy (no changes needed)
    }

    // Complete the cycle
    await supabase
      .from("yana_optimization_cycles")
      .update({
        phase: "completed",
        status: "completed",
        completed_at: new Date().toISOString(),
        meta_score: Math.round(metaScore * 100) / 100,
        meta_adjustments: metaAdjustments,
      })
      .eq("id", cycleId);

    return new Response(
      JSON.stringify({
        success: true,
        cycle_number: cycleNumber,
        bottlenecks_found: bottlenecks.length,
        actions_generated: actions.length,
        meta_score: metaScore,
        adjustments: Object.keys(metaAdjustments).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recursive optimizer error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
