/**
 * YANA SELF-EVALUATOR
 * Cron daily 04:00 UTC. Reads recent assistant messages, scores quality
 * (1-10) on accuracy/empathy/completeness/action, persists to
 * yana_conversation_evaluations and creates capability_gaps for low scores.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM = `Ești un evaluator critic al asistentului YANA (AI contabil/business RO).
Primești o pereche user→assistant. Notezi răspunsul asistentului 1-10 pe 4 dimensiuni:
- accuracy (corectitudine fiscală/factuală)
- empathy (validare emoțională înainte de soluție)
- completeness (acoperă întrebarea complet)
- action_oriented (oferă pași concreți)

Returnezi JSON strict:
{"score": 1-10, "dimensions": {"accuracy":n,"empathy":n,"completeness":n,"action_oriented":n}, "weakness_summary": "scurt", "improvement_suggestion": "concret", "gap_topic": "topic_snake_case_sau_null"}

Score < 6 = problemă reală. Notează doar gap_topic dacă există un pattern recurent de îmbunătățit.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Get last 50 assistant messages from past 24h that haven't been evaluated
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, content, created_at")
      .eq("role", "assistant")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!msgs || msgs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no recent messages" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter already evaluated
    const ids = msgs.map((m: any) => m.id);
    const { data: existing } = await supabase
      .from("yana_conversation_evaluations")
      .select("message_id")
      .in("message_id", ids);
    const done = new Set((existing || []).map((e: any) => e.message_id));
    const todo = msgs.filter((m: any) => !done.has(m.id)).slice(0, 20); // cap 20/run

    let evaluated = 0;
    let gapsCreated = 0;

    for (const msg of todo) {
      // Fetch the user message right before
      const { data: prevUser } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", msg.conversation_id)
        .eq("role", "user")
        .lt("created_at", msg.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const userText = (prevUser?.content || "").slice(0, 2000);
      const asstText = (msg.content || "").slice(0, 3000);
      if (!userText || !asstText) continue;

      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `USER: ${userText}\n\nASSISTANT: ${asstText}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!r.ok) continue;
        const j = await r.json();
        const evalObj = JSON.parse(j.choices?.[0]?.message?.content || "{}");
        if (typeof evalObj.score !== "number") continue;

        await supabase.from("yana_conversation_evaluations").insert({
          conversation_id: msg.conversation_id,
          message_id: msg.id,
          score: Math.max(1, Math.min(10, Math.round(evalObj.score))),
          dimensions: evalObj.dimensions || {},
          weakness_summary: evalObj.weakness_summary || null,
          improvement_suggestion: evalObj.improvement_suggestion || null,
          gap_topic: evalObj.gap_topic || null,
        });
        evaluated++;

        // Auto-create capability_gap if low score + concrete topic
        if (evalObj.score <= 5 && evalObj.gap_topic) {
          const { data: existingGap } = await supabase
            .from("yana_capability_gaps")
            .select("id, evidence")
            .eq("topic", evalObj.gap_topic)
            .eq("status", "open")
            .maybeSingle();
          if (existingGap) {
            const ev = (existingGap.evidence as any) || {};
            await supabase.from("yana_capability_gaps").update({
              evidence: { ...ev, hits: (ev.hits || 1) + 1, last_message_id: msg.id },
            }).eq("id", existingGap.id);
          } else {
            await supabase.from("yana_capability_gaps").insert({
              gap_type: "self_evaluated_weakness",
              topic: evalObj.gap_topic,
              description: evalObj.weakness_summary || "Self-evaluated low score",
              evidence: { source: "self-evaluator", message_id: msg.id, suggestion: evalObj.improvement_suggestion, hits: 1 },
              impact_score: (10 - evalObj.score) / 10,
              status: "open",
            });
            gapsCreated++;
          }
        }
      } catch (e) { console.warn("[self-evaluator] eval error", e); }
    }

    return new Response(JSON.stringify({ success: true, evaluated, gaps_created: gapsCreated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[self-evaluator]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});