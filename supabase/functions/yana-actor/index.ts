import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * SISTEM 2: ACTORUL (Învățare Activă)
 * Procesează observațiile neprocesate și aplică lecții.
 * Creează experimente, aplică corecții automate, actualizează pattern-uri.
 * Cost AI: ZERO — folosește agregări și heuristici locale.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // ===== STEP 1: Fetch unprocessed observations =====
    const { data: observations, error: fetchErr } = await supabase
      .from("yana_observations")
      .select("*")
      .eq("processed", false)
      .order("learning_potential", { ascending: false })
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!observations || observations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No unprocessed observations", actions: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let actionsApplied = 0;
    const processedIds: string[] = [];

    // ===== STEP 2: Aggregate error patterns =====
    const errorObs = observations.filter(o => o.observation_type === "error_detected");
    const errorsByType: Record<string, number> = {};
    for (const obs of errorObs) {
      const errors = (obs.raw_data as Record<string, unknown>)?.errors as string[] || [];
      for (const err of errors) {
        errorsByType[err] = (errorsByType[err] || 0) + 1;
      }
      processedIds.push(obs.id);
    }

    // If an error pattern repeats 3+ times, create an improvement decision
    for (const [errorType, count] of Object.entries(errorsByType)) {
      if (count >= 3) {
        const descriptions: Record<string, string> = {
          uncertainty_detected: "Yana exprimă incertitudine prea des. Trebuie răspunsuri mai decisive sau recunoașterea explicită a limitelor.",
          insufficient_response: "Răspunsuri prea scurte la întrebări complexe. Trebuie dezvoltate pattern-uri de răspuns mai elaborate.",
          echo_response: "Yana repetă întrebarea utilizatorului fără a adăuga valoare. Trebuie îmbunătățit conținutul răspunsurilor.",
          generic_filler: "Prea multe fraze generice ('este important să...'). Trebuie răspunsuri mai specifice și acționabile.",
        };

        await supabase.from("yana_improvement_decisions").insert({
          decision_type: "auto_correction",
          trigger_reason: `Error pattern "${errorType}" detected ${count} times`,
          description: descriptions[errorType] || `Pattern de eroare repetat: ${errorType}`,
          proposed_change: { error_type: errorType, frequency: count, action: "improve_response_quality" },
          confidence_score: Math.min(0.5 + count * 0.1, 0.95),
          status: count >= 5 ? "auto_approved" : "pending",
          source: "yana-actor",
          auto_approved: count >= 5,
        });
        actionsApplied++;
      }
    }

    // ===== STEP 3: Process knowledge gaps =====
    const gapObs = observations.filter(o => o.observation_type === "knowledge_gap");
    const gapsByTopic: Record<string, { count: number; gaps: string[] }> = {};
    
    for (const obs of gapObs) {
      const data = obs.raw_data as Record<string, unknown>;
      const topic = (data?.topic as string) || "general";
      const gaps = (data?.gaps as string[]) || [];
      
      if (!gapsByTopic[topic]) gapsByTopic[topic] = { count: 0, gaps: [] };
      gapsByTopic[topic].count++;
      gapsByTopic[topic].gaps.push(...gaps);
      processedIds.push(obs.id);
    }

    // Log aggregated knowledge gaps
    for (const [topic, info] of Object.entries(gapsByTopic)) {
      if (info.count >= 2) {
        const uniqueGaps = [...new Set(info.gaps)];
        await supabase.from("yana_knowledge_gaps").insert({
          topic,
          gap_description: `${uniqueGaps.join(", ")} (detectat de ${info.count} ori)`,
          source: "yana-actor",
          priority: info.count >= 5 ? "high" : "medium",
          status: "open",
        }).select();
        actionsApplied++;
      }
    }

    // ===== STEP 4: Process corrections → create effective responses =====
    const correctionObs = observations.filter(o => o.observation_type === "correction_received");
    for (const obs of correctionObs) {
      const data = obs.raw_data as Record<string, unknown>;
      const topic = (data?.topic as string) || "general";
      
      // Log as high-priority learning
      await supabase.from("yana_learning_log").insert({
        user_id: obs.source_user_id,
        learning_type: "correction_applied",
        topic,
        content: `Corecție primită: ${(data?.feedback as string) || "fără detalii"}`,
        satisfaction_score: 0.3, // low because user had to correct
        source: "yana-actor",
      }).select();
      
      processedIds.push(obs.id);
      actionsApplied++;
    }

    // ===== STEP 5: Track positive patterns =====
    const positiveObs = observations.filter(o => o.observation_type === "positive_feedback");
    const positiveTopics: Record<string, { count: number; models: string[] }> = {};
    
    for (const obs of positiveObs) {
      const data = obs.raw_data as Record<string, unknown>;
      const topic = (data?.topic as string) || "general";
      const model = (data?.model as string) || "unknown";
      
      if (!positiveTopics[topic]) positiveTopics[topic] = { count: 0, models: [] };
      positiveTopics[topic].count++;
      positiveTopics[topic].models.push(model);
      processedIds.push(obs.id);
    }

    // Reinforce successful patterns
    for (const [topic, info] of Object.entries(positiveTopics)) {
      if (info.count >= 3) {
        // Find most used model for this topic
        const modelCounts: Record<string, number> = {};
        for (const m of info.models) modelCounts[m] = (modelCounts[m] || 0) + 1;
        const bestModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        
        await supabase.from("yana_improvement_decisions").insert({
          decision_type: "reinforce_pattern",
          trigger_reason: `Positive feedback for "${topic}" (${info.count} times)`,
          description: `Pattern de succes: topic "${topic}" cu modelul ${bestModel}. De menținut.`,
          proposed_change: { topic, best_model: bestModel, positive_count: info.count },
          confidence_score: 0.8,
          status: "applied",
          source: "yana-actor",
          auto_approved: true,
        });
        actionsApplied++;
      }
    }

    // ===== STEP 6: Process user struggles =====
    const struggleObs = observations.filter(o => o.observation_type === "user_struggle");
    for (const obs of struggleObs) {
      processedIds.push(obs.id);
    }
    
    if (struggleObs.length >= 3) {
      const topics = struggleObs.map(o => (o.raw_data as Record<string, unknown>)?.topic).filter(Boolean);
      await supabase.from("yana_improvement_decisions").insert({
        decision_type: "usability_issue",
        trigger_reason: `${struggleObs.length} user struggles detected`,
        description: `Utilizatorii au dificultăți (reformulează, corectează). Topics: ${[...new Set(topics)].join(", ")}`,
        proposed_change: { struggle_count: struggleObs.length, topics: [...new Set(topics)] },
        confidence_score: 0.7,
        status: "pending",
        source: "yana-actor",
        auto_approved: false,
      });
      actionsApplied++;
    }

    // ===== STEP 7: Process generic pattern observations =====
    const patternObs = observations.filter(o => o.observation_type === "pattern_found");
    for (const obs of patternObs) {
      processedIds.push(obs.id);
    }

    // ===== STEP 8: Mark all as processed =====
    if (processedIds.length > 0) {
      const uniqueIds = [...new Set(processedIds)];
      // Process in batches of 50
      for (let i = 0; i < uniqueIds.length; i += 50) {
        const batch = uniqueIds.slice(i, i + 50);
        await supabase
          .from("yana_observations")
          .update({
            processed: true,
            processed_by: "actor",
            processed_at: new Date().toISOString(),
            action_taken: "aggregated_and_processed",
          })
          .in("id", batch);
      }
    }

    // ===== AGENT TRACE =====
    try {
      const traceId = crypto.randomUUID();
      await supabase.from("yana_agent_traces").insert({
        trace_id: traceId,
        agent_name: "yana-actor",
        input_summary: `Observations to process: ${observations?.length || 0}`,
        output_summary: `Processed: ${processedIds.length}, Actions: ${actionsApplied}, Errors: ${Object.keys(errorsByType).length}, Gaps: ${Object.keys(gapsByTopic).length}`,
        duration_ms: 0,
        tokens_used: 0,
        cost_cents: 0,
      });
    } catch (traceErr) {
      console.warn("[Actor] Trace logging failed:", traceErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        observations_processed: processedIds.length,
        actions_applied: actionsApplied,
        error_patterns: errorsByType,
        knowledge_gaps_found: Object.keys(gapsByTopic).length,
        positive_reinforcements: Object.keys(positiveTopics).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Actor] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
