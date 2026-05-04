// ElevenLabs post-call webhook — saves transcript, generates summary, escalates if needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Samanta (YANA) <onboarding@resend.dev>";

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

    // === Notificare push (in-app) ===
    try {
      const fromNumber = call?.from_number || "necunoscut";
      const callerName = call?.contact_name || fromNumber;
      const isUrgent = !!result.escalation_needed;
      const title = isUrgent
        ? `🚨 Apel URGENT de la ${callerName}`
        : `📞 Apel nou de la ${callerName}`;
      await supabase.from("user_notifications").insert({
        user_id: finalUserId,
        type: "samanta_call",
        title,
        message: result.summary || "Samanta a preluat un apel. Vezi transcriptul în Inbox.",
        priority: isUrgent ? "critical" : "medium",
        metadata: {
          call_id: callId,
          from_number: fromNumber,
          escalation_needed: isUrgent,
          action_url: "/inbox",
        },
      });
    } catch (e) {
      console.error("[samanta-call-completed] notification insert failed", e);
    }

    // === Email automat ===
    try {
      if (RESEND_API_KEY) {
        const { data: userRes } = await supabase.auth.admin.getUserById(finalUserId);
        const userEmail = userRes?.user?.email;
        if (userEmail) {
          const fromNumber = call?.from_number || "necunoscut";
          const callerName = call?.contact_name || fromNumber;
          const isUrgent = !!result.escalation_needed;
          const transcriptHtml = (transcript || [])
            .map((m: any) => {
              const who = m.role === "user" ? "Apelant" : "Samanta";
              const text = (m.message || m.text || "").replace(/</g, "&lt;");
              return `<p style="margin:4px 0"><strong>${who}:</strong> ${text}</p>`;
            })
            .join("");
          const subject = isUrgent
            ? `🚨 URGENT — Apel Samanta de la ${callerName}`
            : `📞 Apel nou Samanta — ${callerName}`;
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fff">
              <h2 style="color:${isUrgent ? "#dc2626" : "#0f172a"};margin:0 0 12px">${subject}</h2>
              <p style="color:#475569"><strong>De la:</strong> ${callerName} (${fromNumber})</p>
              <p style="color:#475569"><strong>Când:</strong> ${new Date().toLocaleString("ro-RO")}</p>
              <h3 style="margin:20px 0 8px">Rezumat</h3>
              <p style="color:#0f172a;background:#f1f5f9;padding:12px;border-radius:8px">${result.summary || "—"}</p>
              <h3 style="margin:20px 0 8px">Transcript</h3>
              <div style="background:#f8fafc;padding:12px;border-radius:8px;color:#0f172a;font-size:14px">${transcriptHtml || "<em>Fără transcript</em>"}</div>
              <p style="margin-top:24px">
                <a href="https://yana-contabila.velcont.com/inbox"
                   style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
                  Deschide Inbox
                </a>
              </p>
            </div>`;
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ from: FROM_EMAIL, to: [userEmail], subject, html }),
          });
          if (!r.ok) {
            console.error("[samanta-call-completed] resend failed", r.status, await r.text());
          }
        }
      } else {
        console.warn("[samanta-call-completed] RESEND_API_KEY missing, skipping email");
      }
    } catch (e) {
      console.error("[samanta-call-completed] email send failed", e);
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