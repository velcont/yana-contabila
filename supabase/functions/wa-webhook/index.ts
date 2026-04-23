// wa-webhook — Primește mesaje de la Meta WhatsApp Cloud API
//   GET  -> verificare webhook (hub.challenge)
//   POST -> primire mesaje, route către yana-agent, trimite răspuns
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim() ?? "";
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";
const TOKEN = (Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "")
  .trim()
  .replace(/[;\s]+$/g, "");

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendWhatsAppText(to: string, body: string) {
  const phone = to.replace(/^\+/, "");
  // WA limit ~4096; truncăm la 3500 pt siguranță
  const safe = body.length > 3500 ? body.slice(0, 3500) + "…" : body;
  const resp = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: safe },
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

async function callYanaAgent(userId: string, message: string): Promise<string> {
  // Apelăm yana-agent cu service role key + impersonare prin payload
  // Dar yana-agent verifică JWT-ul... așa că folosim un agent simplu via Lovable AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "Yana este temporar indisponibilă (config lipsă).";

  // Citim ultimele 6 mesaje pentru context
  const { data: history } = await admin
    .from("wa_messages_log")
    .select("direction, body")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  const messages = [
    {
      role: "system",
      content:
        "Ești Yana, asistentul de business al utilizatorului, contactată prin WhatsApp. " +
        "Răspunzi scurt (sub 1500 caractere), prietenos, în română. " +
        "Nu folosești markdown complex — doar text simplu și emoji ocazional. " +
        "Dacă întrebarea necesită analize complexe (balanțe, rapoarte), spune utilizatorului să intre în aplicație la yana-contabila.lovable.app.",
    },
    ...((history ?? []).reverse().map((m: any) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.body ?? "",
    }))),
    { role: "user", content: message },
  ];

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    return "Am întâmpinat o problemă acum. Încearcă din nou în câteva secunde.";
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "(răspuns gol)";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ===== GET: webhook verification =====
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ===== POST: incoming message =====
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const payload = await req.json();
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Răspundem 200 imediat ca Meta să nu retrimită; procesarea continuă async
    if (!message) {
      return new Response("ok", { status: 200 });
    }

    // Răspundem 200 și procesăm în background
    const processing = (async () => {
      try {
        const fromRaw = String(message.from || "");
        const fromE164 = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;
        const text = message.text?.body || message.button?.text || "";
        const waMsgId = message.id || null;

        if (!text) return;

        // Găsim user-ul prin numărul verificat
        const { data: link } = await admin
          .from("wa_user_links")
          .select("user_id, phone_e164")
          .eq("phone_e164", fromE164)
          .eq("verified", true)
          .maybeSingle();

        if (!link) {
          // Număr necunoscut → ghidăm către aplicație
          await admin.from("wa_messages_log").insert({
            user_id: null,
            phone_e164: fromE164,
            direction: "in",
            body: text,
            wa_message_id: waMsgId,
          });
          await sendWhatsAppText(
            fromE164,
            "Salut! Sunt Yana 👋\nNu recunosc acest număr.\n\n" +
            "Conectează-te aici: https://yana-contabila.lovable.app/whatsapp",
          );
          return;
        }

        // Log mesajul de intrare
        await admin.from("wa_messages_log").insert({
          user_id: link.user_id,
          phone_e164: fromE164,
          direction: "in",
          body: text,
          wa_message_id: waMsgId,
        });

        // Generăm răspuns
        const reply = await callYanaAgent(link.user_id, text);

        // Trimitem
        const sent = await sendWhatsAppText(fromE164, reply);

        await admin.from("wa_messages_log").insert({
          user_id: link.user_id,
          phone_e164: fromE164,
          direction: "out",
          body: reply,
          wa_message_id: sent.data?.messages?.[0]?.id ?? null,
          status: sent.ok ? "sent" : "error",
          error: sent.ok ? null : JSON.stringify(sent.data),
        });

        await admin
          .from("wa_user_links")
          .update({ last_message_at: new Date().toISOString() })
          .eq("user_id", link.user_id);
      } catch (e) {
        console.error("wa-webhook processing error:", e);
      }
    })();

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processing);
    } else {
      await processing;
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("wa-webhook error:", err);
    // 200 ca să nu retrimită
    return new Response("ok", { status: 200 });
  }
});
