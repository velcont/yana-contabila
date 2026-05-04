// ElevenLabs post-call webhook — saves transcript, generates summary, escalates if needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, elevenlabs-signature, x-samanta-secret",
};

async function summarizeWithAI(transcript: any[], escalationKeywords: string[]): Promise<{ summary: string; escalation_needed: boolean; callback?: { name?: string; phone?: string; reason?: string; when?: string } }> {
  if (!LOVABLE_API_KEY) {
    return { summary: "Apel primit. Transcript salvat.", escalation_needed: false };
  }

  const text = transcript
    .map((m: any) => `${m.role === "user" ? "Apelant" : "Samanta"}: ${m.message || m.text || ""}`)
    .join("\n");

  const escalationCheck = escalationKeywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const prompt = `Ești asistentul lui YANA. Analizează transcriptul unui apel telefonic preluat de Samanta (recepționera AI).

TRANSCRIPT:
${text}

CUVINTE-TRIGGER URGENT: ${escalationKeywords.join(", ")}

Răspunde STRICT cu JSON valid (fără markdown):
{
  "summary": "rezumat 2-3 propoziții în română despre cine a sunat, ce a vrut, ce a transmis Samanta",
  "escalation_needed": true/false (true dacă apelul e urgent — ANAF, control, amenință juridic, client furios mare, situație critică),
  "callback": null SAU { "name": "...", "phone": "...", "reason": "motiv revenire", "when": "ISO timestamp dacă a precizat un timp" }
}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content || "";
    content = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || "Apel preluat de Samanta.",
      escalation_needed: !!parsed.escalation_needed || escalationCheck,
      callback: parsed.callback || undefined,
    };
  } catch (e) {
    console.error("[samanta-call-completed] AI summary failed", e);
    return {
      summary: "Apel preluat de Samanta. Vezi transcriptul complet.",
      escalation_needed: escalationCheck,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("[samanta-call-completed] payload keys:", Object.keys(body));

    // ElevenLabs post-call webhook payload structure
    // body.data.conversation_id, body.data.transcript, body.data.metadata.dynamic_variables (with our call_id)
    const data = body.data || body;
    const conversationId = data.conversation_id || data.conversationId;
    const transcript = data.transcript || [];
    const metadata = data.metadata || {};
    const dynVars = metadata.conversation_initiation_client_data?.dynamic_variables ||
                    metadata.dynamic_variables ||
                    data.conversation_initiation_client_data?.dynamic_variables ||
                    {};
    const callId = dynVars.call_id || data.call_id;
    const userId = dynVars.user_id || data.user_id;

    if (!callId) {
      console.warn("[samanta-call-completed] no call_id in payload");
      return new Response(JSON.stringify({ ok: false, reason: "no call_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get settings for escalation keywords
    const { data: call } = await supabase
      .from("samanta_calls")
      .select("user_id, from_number, contact_name")
      .eq("id", callId)
      .maybeSingle();

    const finalUserId = userId || call?.user_id;
    if (!finalUserId) {
      console.warn("[samanta-call-completed] no user resolved");
      return new Response("ok", { headers: corsHeaders });
    }

    const { data: settings } = await supabase
      .from("samanta_settings")
      .select("escalation_keywords")
      .eq("user_id", finalUserId)
      .maybeSingle();

    const escalationKeywords = settings?.escalation_keywords || ["urgent", "anaf", "amenda", "control"];

    const result = await summarizeWithAI(transcript, escalationKeywords);

    await supabase
      .from("samanta_calls")
      .update({
        transcript,
        summary: result.summary,
        escalation_needed: result.escalation_needed,
        elevenlabs_conversation_id: conversationId,
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);

    if (result.callback?.phone) {
      await supabase.from("samanta_callbacks").insert({
        user_id: finalUserId,
        call_id: callId,
        contact_name: result.callback.name || call?.contact_name || null,
        contact_phone: result.callback.phone || call?.from_number || "",
        scheduled_for: result.callback.when || null,
        reason: result.callback.reason || null,
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[samanta-call-completed] error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});