import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Async fire-and-forget tagger: analyzes a recent user message and stores
 * mood + main topic in user_emotional_context (one row per user per day).
 * Uses Lovable AI Gateway with a fast, cheap model.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { userMessage, assistantMessage } = await req.json();
    if (!userMessage || typeof userMessage !== "string") {
      return new Response(JSON.stringify({ error: "missing userMessage" }), { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "no gateway key" }), { status: 500, headers: corsHeaders });
    }

    const prompt = `Analizează starea emoțională a utilizatorului din mesajul de mai jos (limba română).
Returnează STRICT JSON valid, fără text în plus:
{
  "mood": "neutral|happy|stressed|worried|frustrated|anxious|sad|excited|curious|tired",
  "mood_score": 1-10 (1=foarte negativ, 5=neutru, 10=foarte pozitiv),
  "main_topic": "subiect scurt, max 60 caractere",
  "unresolved": true|false
}

Mesaj utilizator: "${userMessage.slice(0, 800)}"
${assistantMessage ? `Răspuns YANA: "${String(assistantMessage).slice(0, 400)}"` : ""}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Ești un analizator de sentiment în română. Returnezi STRICT JSON valid." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[emotional-tagger] AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "ai failed" }), { status: 502, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    let raw = String(aiData?.choices?.[0]?.message?.content || "").trim();
    // Strip markdown fences
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("[emotional-tagger] Non-JSON:", raw.slice(0, 200));
      return new Response(JSON.stringify({ error: "parse failed" }), { status: 200, headers: corsHeaders });
    }

    const mood = String(parsed.mood || "neutral").toLowerCase().slice(0, 30);
    const moodScore = Math.max(1, Math.min(10, Number(parsed.mood_score) || 5));
    const mainTopic = String(parsed.main_topic || "").slice(0, 100);
    const unresolved = Boolean(parsed.unresolved);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().slice(0, 10);

    // Upsert one row per user per day (keep the most recent/heaviest mood)
    const { data: existing } = await admin
      .from("user_emotional_context")
      .select("id, mood_score")
      .eq("user_id", userId)
      .eq("session_date", today)
      .maybeSingle();

    if (existing) {
      await admin
        .from("user_emotional_context")
        .update({
          detected_mood: mood,
          mood_score: moodScore,
          main_topic: mainTopic,
          unresolved_issue: unresolved,
          topic_summary: userMessage.slice(0, 300),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("user_emotional_context").insert({
        user_id: userId,
        session_date: today,
        detected_mood: mood,
        mood_score: moodScore,
        main_topic: mainTopic,
        unresolved_issue: unresolved,
        topic_summary: userMessage.slice(0, 300),
      });
    }

    return new Response(JSON.stringify({ success: true, mood, moodScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[emotional-tagger] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});