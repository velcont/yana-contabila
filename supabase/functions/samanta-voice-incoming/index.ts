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

    // Build TwiML with ConversationRelay → ElevenLabs
    // ConversationRelay uses ElevenLabs' WebSocket bridge for Twilio
    const elevenAgentId = settings.voice_agent_id;

    // ElevenLabs Twilio personalization webhook will pick these custom params via metadata
    // We pass dynamic context as URL query so ElevenLabs personalization endpoint can read them
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(elevenAgentId)}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      welcomeGreeting="${escapeXml(greeting)}"
      language="ro-RO"
      ttsLanguage="ro-RO"
      transcriptionLanguage="ro-RO">
      <Parameter name="user_id" value="${escapeXml(settings.user_id)}"/>
      <Parameter name="call_id" value="${escapeXml(callId)}"/>
      <Parameter name="caller_name" value="${escapeXml(contactName || 'Necunoscut')}"/>
      <Parameter name="caller_phone" value="${escapeXml(from)}"/>
      <Parameter name="system_prompt" value="${escapeXml(systemPrompt)}"/>
    </ConversationRelay>
  </Connect>
</Response>`;

    return new Response(xml, { headers: xmlHeaders });
  } catch (e) {
    console.error("[samanta-voice-incoming] error", e);
    return rejectTwiml("error");
  }
});