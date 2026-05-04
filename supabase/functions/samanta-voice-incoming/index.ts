// Twilio Voice webhook — answers incoming calls and bridges to ElevenLabs ConversationRelay
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const xmlHeaders = {
  "Content-Type": "text/xml; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
};

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rejectTwiml(reason: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/><!-- ${escapeXml(reason)} --></Response>`;
  return new Response(xml, { headers: xmlHeaders });
}

function gatherTwiml(message: string, callId: string): Response {
  const actionUrl = `${SUPABASE_URL}/functions/v1/samanta-voice-incoming?mode=gather&call_id=${encodeURIComponent(callId)}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="ro-RO" speechTimeout="auto" timeout="6" action="${escapeXml(actionUrl)}" method="POST">
    <Say language="ro-RO">${escapeXml(message)}</Say>
  </Gather>
  <Say language="ro-RO">Nu v-am auzit. Vă rog să reveniți cu un apel. O zi bună.</Say>
</Response>`;
  return new Response(xml, { headers: xmlHeaders });
}

async function generateSamantaReply(systemPrompt: string, callerText: string): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) return "Am notat mesajul dumneavoastră. Îl transmit mai departe și veți fi contactat înapoi.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: `${systemPrompt}\nRăspunde pentru telefon: maxim 2 propoziții scurte. Dacă mesajul este încheiat, spune că ai notat și încheie politicos.` },
        { role: "user", content: callerText },
      ],
      temperature: 0.25,
      max_tokens: 120,
    }),
  });

  if (!response.ok) throw new Error(`AI gateway failed ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || "Am notat. Vă mulțumesc pentru apel.").replace(/[<>]/g, "").slice(0, 600);
}

function isWithinSchedule(schedule: any): boolean {
  try {
    if (!schedule || schedule.mode === "24_7") return true;
    if (schedule.mode === "window" && Array.isArray(schedule.windows)) {
      const now = new Date();
      const day = now.getUTCDay(); // 0..6
      // Romania timezone approximation: UTC+2/+3. Use Europe/Bucharest via Intl.
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Bucharest",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "short",
      });
      const parts = fmt.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const minutes = hour * 60 + minute;
      const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const weekday = weekdayMap[parts.find((p) => p.type === "weekday")?.value || "Mon"] ?? day;
      return schedule.windows.some((w: any) => {
        const days: number[] = w.days || [1, 2, 3, 4, 5];
        if (!days.includes(weekday)) return false;
        const [sh, sm] = (w.start || "00:00").split(":").map(Number);
        const [eh, em] = (w.end || "23:59").split(":").map(Number);
        return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
      });
    }
    return true;
  } catch {
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: xmlHeaders });

  try {
    const formData = await req.formData();
    const callSid = String(formData.get("CallSid") || "");
    const from = String(formData.get("From") || "");
    const to = String(formData.get("To") || "");

    console.log("[samanta-voice-incoming]", { callSid, from, to });

    if (!callSid || !to) return rejectTwiml("missing params");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    if (url.searchParams.get("mode") === "gather") {
      const callId = url.searchParams.get("call_id") || "";
      const speech = String(formData.get("SpeechResult") || "").trim();
      if (!callId) return rejectTwiml("missing call id");

      const { data: call } = await supabase
        .from("samanta_calls")
        .select("id, user_id, transcript, from_number, to_number")
        .eq("id", callId)
        .maybeSingle();
      if (!call) return rejectTwiml("call not found");

      const { data: settings } = await supabase
        .from("samanta_settings")
        .select("*")
        .eq("user_id", call.user_id)
        .maybeSingle();
      if (!settings) return rejectTwiml("settings not found");

      const currentTranscript = Array.isArray(call.transcript) ? call.transcript : [];
      const userEntry = { role: "caller", text: speech || "[tăcere]", at: new Date().toISOString() };
      if (!speech) {
        await supabase.from("samanta_calls").update({ transcript: [...currentTranscript, userEntry] }).eq("id", callId);
        return gatherTwiml("Nu v-am auzit clar. Îmi puteți spune, vă rog, cu ce vă ajut?", callId);
      }

      const userName = settings.user_full_name || "Nicolae";
      const company = settings.company_name || "Velcont";
      const systemPrompt = `Ești Samanta, recepționera și asistenta executivă a lui ${userName} de la ${company}. Vorbești exclusiv în română, calm și profesionist. Preiei mesajul, identifici cine sună și ce dorește. Nu dai sfaturi fiscale concrete; promiți doar că transmiți mesajul și va reveni cineva.`;
      const reply = await generateSamantaReply(systemPrompt, speech);
      const assistantEntry = { role: "samanta", text: reply, at: new Date().toISOString() };
      await supabase
        .from("samanta_calls")
        .update({ transcript: [...currentTranscript, userEntry, assistantEntry] })
        .eq("id", callId);

      return gatherTwiml(reply, callId);
    }

    // Find user by Twilio number
    const { data: settings } = await supabase
      .from("samanta_settings")
      .select("*")
      .eq("twilio_phone_number", to)
      .maybeSingle();

    if (!settings) {
      console.warn("[samanta-voice-incoming] no settings for", to);
      return rejectTwiml("no settings");
    }

    if (!settings.active) {
      // Forward to user GSM if configured, otherwise reject
      if (settings.forward_to_user_phone) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${escapeXml(settings.forward_to_user_phone)}</Dial></Response>`;
        return new Response(xml, { headers: xmlHeaders });
      }
      return rejectTwiml("samanta inactive");
    }

    if (!isWithinSchedule(settings.schedule)) {
      if (settings.forward_to_user_phone) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${escapeXml(settings.forward_to_user_phone)}</Dial></Response>`;
        return new Response(xml, { headers: xmlHeaders });
      }
      return rejectTwiml("outside schedule");
    }

    // Check blocked
    const { data: blocked } = await supabase
      .from("samanta_blocked_numbers")
      .select("phone_number")
      .eq("user_id", settings.user_id)
      .eq("phone_number", from)
      .maybeSingle();

    if (blocked) return rejectTwiml("blocked");

    // Lookup contact in CRM
    let contactName: string | null = null;
    let contactId: string | null = null;
    let contactContext = "";
    try {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, full_name, company_id")
        .eq("phone", from)
        .eq("user_id", settings.user_id)
        .maybeSingle();
      if (contact) {
        contactName = contact.full_name;
        contactId = contact.id;
        if (contact.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name, notes")
            .eq("id", contact.company_id)
            .maybeSingle();
          if (company) {
            contactContext = `Apelantul este ${contact.full_name} de la ${company.name}.${company.notes ? " Note: " + company.notes : ""}`;
          }
        } else {
          contactContext = `Apelantul este ${contact.full_name}.`;
        }
      }
    } catch (e) {
      console.warn("[samanta-voice-incoming] contact lookup failed", e);
    }

    // Insert call record
    const { data: call, error: callErr } = await supabase
      .from("samanta_calls")
      .insert({
        user_id: settings.user_id,
        twilio_call_sid: callSid,
        from_number: from,
        to_number: to,
        direction: "inbound",
        contact_id: contactId,
        contact_name: contactName,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (callErr) console.error("[samanta-voice-incoming] insert call err", callErr);

    const callId = call?.id || "";
    const greeting = settings.greeting || "Bună ziua, sunt Samanta, asistenta personală. Cu ce vă pot ajuta?";
    const userName = settings.user_full_name || "";
    const company = settings.company_name || "";

    // Compose dynamic system prompt for ElevenLabs ConversationRelay
    const systemPrompt = [
      `Ești Samanta, recepționera și asistenta executivă a lui ${userName || "utilizatorului"}${company ? ` de la ${company}` : ""}.`,
      `Vorbești EXCLUSIV în limba română, calm, profesionist și empatic.`,
      `Rolul tău: preiei apelul, identifici cine sună și ce vrea, notezi mesajul, oferi informații generale, programezi callback dacă e nevoie.`,
      `NU faci niciodată promisiuni concrete în numele lui ${userName || "patron"}. Spui mereu „transmit mesajul și veți fi sunat înapoi".`,
      `Dacă apelantul e furios, spune amenintări juridice (ANAF, executor, control, amendă, procuror), e URGENT — confirmă că escaladezi imediat.`,
      `La final, fă un mic rezumat verbal: „Am notat: [...]. ${userName || "Patronul"} va fi informat imediat. O zi bună!"`,
      contactContext ? `\nCONTEXT APELANT: ${contactContext}` : "",
      `\nINFO: Acest apel vine de la ${from} către ${to}.`,
    ].filter(Boolean).join("\n");

    // Register the Twilio call with ElevenLabs and return their TwiML directly.
    // This is the supported bridge for Twilio-owned numbers; Twilio ConversationRelay
    // expects our own websocket protocol server and closes immediately otherwise.
    const elevenAgentId = settings.voice_agent_id;
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) {
      console.error("[samanta-voice-incoming] ELEVENLABS_API_KEY missing");
      return rejectTwiml("elevenlabs missing");
    }

    const elevenResponse = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: elevenAgentId,
        from_number: from,
        to_number: to,
        direction: "inbound",
        conversation_initiation_client_data: {
          conversation_config_override: {
            agent: {
              prompt: { prompt: systemPrompt },
              first_message: greeting,
              language: "ro",
            },
          },
          dynamic_variables: {
            user_id: settings.user_id,
            call_id: callId,
            caller_name: contactName || "Necunoscut",
            caller_phone: from,
            company_name: company,
          },
          user_id: settings.user_id,
        },
      }),
    });

    const twiml = await elevenResponse.text();
    if (!elevenResponse.ok || !twiml.trim().startsWith("<")) {
      console.error("[samanta-voice-incoming] ElevenLabs register-call failed", {
        status: elevenResponse.status,
        body: twiml.slice(0, 800),
      });
      return rejectTwiml("elevenlabs register failed");
    }

    console.log("[samanta-voice-incoming] ElevenLabs TwiML registered", { callSid, callId });
    return new Response(twiml, { headers: xmlHeaders });
  } catch (e) {
    console.error("[samanta-voice-incoming] error", e);
    return rejectTwiml("error");
  }
});