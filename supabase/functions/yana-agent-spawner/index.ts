/**
 * YANA AGENT SPAWNER — Meta-process that detects gaps and auto-creates agents.
 *
 * Runs periodically (cron). Examines:
 *  1. Recent ai_reflection_logs with low self_score → spawn meta_improvement agent
 *  2. Recurring topics across yana_learning_log not covered by existing agents → spawn sub_agent
 *
 * Total autonomous: created agents become active immediately.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) + "-" + Date.now().toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const spawned: Array<Record<string, unknown>> = [];

  try {
    // Cap total active agents to prevent runaway spawning
    const { count: activeCount } = await supabase
      .from("yana_generated_agents")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    if ((activeCount || 0) >= 50) {
      return new Response(JSON.stringify({ skipped: "Cap of 50 active agents reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Signal 1: Low-confidence reflections (last 7 days) ===
    const { data: weakReflections } = await supabase
      .from("ai_reflection_logs")
      .select("question, self_score, what_could_improve, missing_context")
      .lt("self_score", 0.5)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(20);

    // === Signal 2: Recurring learning topics ===
    const { data: topicCounts } = await supabase
      .from("yana_learning_log")
      .select("topic")
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .limit(500);
    const topicFreq: Record<string, number> = {};
    (topicCounts || []).forEach((r: { topic: string | null }) => {
      const t = (r.topic || "general").toLowerCase();
      topicFreq[t] = (topicFreq[t] || 0) + 1;
    });
    const hotTopics = Object.entries(topicFreq).filter(([, c]) => c >= 5).map(([t]) => t);

    // Existing agents to avoid dupes
    const { data: existing } = await supabase
      .from("yana_generated_agents")
      .select("display_name, agent_type, metadata");
    const existingTopics = new Set(
      (existing || []).map((a) => String((a.metadata as { topic?: string })?.topic || "").toLowerCase()).filter(Boolean),
    );

    // Build LLM brief
    const brief = {
      weak_reflections: (weakReflections || []).slice(0, 5).map((r) => ({
        q: String(r.question || "").slice(0, 200),
        score: r.self_score,
        gaps: r.what_could_improve,
      })),
      hot_topics: hotTopics.filter((t) => !existingTopics.has(t)).slice(0, 5),
    };

    if (brief.weak_reflections.length === 0 && brief.hot_topics.length === 0) {
      return new Response(JSON.stringify({ spawned: [], reason: "No spawn signals" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask LLM to propose 1-3 new agents
    const prompt = `Ești un meta-orchestrator pentru YANA (AI pentru business RO).
Analizează semnalele de mai jos și propune între 0 și 3 agenți noi specializați.

SEMNALE:
${JSON.stringify(brief, null, 2)}

Pentru fiecare agent propus returnează JSON cu: display_name, description (1 frază), agent_type ('sub_agent' sau 'meta_improvement'), system_prompt (2 paragrafe RO), allowed_tools (subset din: search_companies, get_latest_balance, create_task, create_calendar_event, save_note, web_research, get_user_context), schedule ('on_demand' | 'daily' | 'weekly'), creation_reason, topic.

Returnează DOAR un obiect: { "agents": [...] }. Dacă nu e nevoie de nimeni, { "agents": [] }.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiResp.ok) {
      return new Response(JSON.stringify({ error: `AI ${aiResp.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiData = await aiResp.json();
    let parsed: { agents?: Array<Record<string, unknown>> } = {};
    try { parsed = JSON.parse(aiData.choices?.[0]?.message?.content || "{}"); } catch { /* ignore */ }

    for (const a of (parsed.agents || []).slice(0, 3)) {
      if (!a.display_name || !a.system_prompt) continue;
      const slug = slugify(String(a.display_name));
      const { data, error } = await supabase.from("yana_generated_agents").insert({
        agent_slug: slug,
        display_name: a.display_name,
        description: a.description || "",
        agent_type: a.agent_type === "meta_improvement" ? "meta_improvement" : "sub_agent",
        system_prompt: a.system_prompt,
        allowed_tools: Array.isArray(a.allowed_tools) ? a.allowed_tools : [],
        schedule: ["on_demand", "hourly", "daily", "weekly"].includes(a.schedule as string) ? a.schedule : "on_demand",
        created_by: "spawner",
        creation_reason: a.creation_reason || "Auto-spawn signal",
        is_active: true,
        metadata: { topic: a.topic || null, source_brief: brief },
      }).select("id, agent_slug, display_name").single();
      if (!error && data) spawned.push(data);
    }

    return new Response(JSON.stringify({ spawned, signals: brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[spawner] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});