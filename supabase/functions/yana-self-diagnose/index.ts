/**
 * YANA SELF-DIAGNOSE
 * Daily 03:00 UTC. Scans last 7 days for weakness signals → creates capability gaps.
 *
 * Signals:
 *  1. ai_reflection_logs with self_score < 0.7
 *  2. ai_corrections (user-submitted corrections, pending)
 *  3. yana_learning_log topics repeated >=3 times without dedicated agent
 *  4. ai_conversations with was_helpful=false or low ratings
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Gap {
  gap_type: string;
  topic: string;
  description: string;
  evidence: Record<string, unknown>;
  frequency: number;
  severity: number;
}

function normalizeTopic(s: string): string {
  return (s || "general").toLowerCase().trim().slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const newGaps: Gap[] = [];

  try {
    // Kill switch
    const { data: settings } = await supabase
      .from("yana_self_dev_settings")
      .select("enabled")
      .limit(1)
      .maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "self-development disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // === SIGNAL 1: Weak reflections (relaxed threshold: <0.85) ===
    const { data: weakRefl } = await supabase
      .from("ai_reflection_logs")
      .select("id, question, self_score, what_could_improve, missing_context")
      .lt("self_score", 0.85)
      .gte("created_at", sevenDaysAgo)
      .limit(100);

    const reflByTopic: Record<string, { ids: string[]; samples: string[]; avg_score: number }> = {};
    (weakRefl || []).forEach((r: any) => {
      const t = normalizeTopic((r.question || "").split(/[?.!]/)[0].slice(0, 60));
      if (!reflByTopic[t]) reflByTopic[t] = { ids: [], samples: [], avg_score: 0 };
      reflByTopic[t].ids.push(r.id);
      if (reflByTopic[t].samples.length < 3) reflByTopic[t].samples.push(r.question);
      reflByTopic[t].avg_score = (reflByTopic[t].avg_score + r.self_score) / 2;
    });
    Object.entries(reflByTopic).forEach(([topic, info]) => {
      if (info.ids.length >= 2) {
        newGaps.push({
          gap_type: "weak_reflection",
          topic,
          description: `YANA s-a auto-evaluat slab (${info.avg_score.toFixed(2)}) la ${info.ids.length} întrebări despre "${topic}".`,
          evidence: { reflection_ids: info.ids, sample_questions: info.samples },
          frequency: info.ids.length,
          severity: 1 - info.avg_score, // lower score → higher severity
        });
      }
    });

    // === SIGNAL 2: User corrections (pending) ===
    const { data: corrections } = await supabase
      .from("ai_corrections")
      .select("id, original_question, correct_answer, correction_type")
      .or("applied_to_knowledge.is.null,applied_to_knowledge.eq.false")
      .gte("created_at", sevenDaysAgo)
      .limit(30);

    const corrByType: Record<string, { ids: string[]; samples: string[] }> = {};
    (corrections || []).forEach((c: any) => {
      const t = normalizeTopic(c.correction_type || (c.original_question || "").slice(0, 60));
      if (!corrByType[t]) corrByType[t] = { ids: [], samples: [] };
      corrByType[t].ids.push(c.id);
      if (corrByType[t].samples.length < 3) corrByType[t].samples.push(c.original_question);
    });
    Object.entries(corrByType).forEach(([topic, info]) => {
      newGaps.push({
        gap_type: "user_correction",
        topic,
        description: `Utilizatorii au corectat YANA de ${info.ids.length} ori pe "${topic}".`,
        evidence: { correction_ids: info.ids, samples: info.samples },
        frequency: info.ids.length,
        severity: 0.8, // user corrections are high signal
      });
    });

    // === SIGNAL 3: Repeated topics without dedicated agent ===
    const { data: topicCounts } = await supabase
      .from("yana_learning_log")
      .select("topic")
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .limit(1000);
    const topicFreq: Record<string, number> = {};
    (topicCounts || []).forEach((r: any) => {
      const t = normalizeTopic(r.topic);
      topicFreq[t] = (topicFreq[t] || 0) + 1;
    });

    const { data: existingAgents } = await supabase
      .from("yana_generated_agents")
      .select("topic, agent_name")
      .eq("is_active", true);
    const coveredTopics = new Set((existingAgents || []).map((a: any) => normalizeTopic(a.topic || a.agent_name || "")));

    Object.entries(topicFreq).forEach(([topic, count]) => {
      if (count >= 3 && !coveredTopics.has(topic) && topic !== "general") {
        newGaps.push({
          gap_type: "no_agent_for_topic",
          topic,
          description: `Topic "${topic}" apare de ${count} ori în 14 zile dar nu are agent dedicat.`,
          evidence: { occurrence_count: count, window_days: 14 },
          frequency: count,
          severity: 0.6,
        });
      }
    });

    // === SIGNAL 4: Negative feedback conversations ===
    const { data: negConv } = await supabase
      .from("ai_conversations")
      .select("id, question")
      .eq("was_helpful", false)
      .gte("created_at", sevenDaysAgo)
      .limit(20);

    const negByTopic: Record<string, string[]> = {};
    (negConv || []).forEach((c: any) => {
      const t = normalizeTopic((c.question || "").slice(0, 60));
      if (!negByTopic[t]) negByTopic[t] = [];
      negByTopic[t].push(c.id);
    });
    Object.entries(negByTopic).forEach(([topic, ids]) => {
      if (ids.length >= 2) {
        newGaps.push({
          gap_type: "negative_feedback",
          topic,
          description: `${ids.length} răspunsuri marcate ca neutile pe "${topic}".`,
          evidence: { conversation_ids: ids },
          frequency: ids.length,
          severity: 0.75,
        });
      }
    });

    // === Deduplicate against existing OPEN gaps (don't re-create) ===
    const { data: existingOpen } = await supabase
      .from("yana_capability_gaps")
      .select("topic, gap_type, id, frequency, evidence")
      .eq("status", "open");
    const existingMap = new Map<string, any>();
    (existingOpen || []).forEach((g: any) => existingMap.set(`${g.gap_type}::${g.topic}`, g));

    const toInsert: Gap[] = [];
    const toUpdate: Array<{ id: string; frequency: number; evidence: any }> = [];

    for (const gap of newGaps) {
      const key = `${gap.gap_type}::${gap.topic}`;
      const existing = existingMap.get(key);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          frequency: Math.max(existing.frequency || 0, gap.frequency),
          evidence: { ...(existing.evidence || {}), ...gap.evidence },
        });
      } else {
        toInsert.push(gap);
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("yana_capability_gaps").insert(toInsert);
    }
    for (const u of toUpdate) {
      await supabase
        .from("yana_capability_gaps")
        .update({ frequency: u.frequency, evidence: u.evidence, updated_at: new Date().toISOString() })
        .eq("id", u.id);
    }

    return new Response(JSON.stringify({
      success: true,
      duration_ms: Date.now() - startTime,
      gaps_created: toInsert.length,
      gaps_updated: toUpdate.length,
      signals_processed: {
        weak_reflections: weakRefl?.length || 0,
        corrections: corrections?.length || 0,
        repeated_topics: Object.keys(topicFreq).length,
        negative_feedback: negConv?.length || 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-self-diagnose] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
