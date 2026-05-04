/**
 * aria-bridge — Primește mesaje de la Aria (whatsapp-web.js pe Hetzner)
 * și returnează răspunsul Yanei pentru a fi trimis pe WhatsApp.
 *
 * POST /functions/v1/aria-bridge
 * Headers: x-aria-secret: <ARIA_BRIDGE_SECRET>
 * Body: { phone, message, contact_name, chat_id }
 * Response: { reply: "text" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aria-secret",
};

const BRIDGE_SECRET = Deno.env.get("ARIA_BRIDGE_SECRET") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── SYSTEM PROMPT — Yana ca recepționer VELCONT ──────────────────────────────
const VELCONT_SYSTEM_PROMPT = `Ești Yana, asistenta inteligentă a cabinetului de contabilitate VELCONT din Cluj-Napoca.
Preiei mesajele WhatsApp de la clienți și potențiali clienți.

IDENTITATE:
- Numele tău este Yana
- Lucrezi pentru VELCONT, cabinet contabilitate profesionist din Cluj-Napoca
- Ești caldă, competentă, concisă
- Semnezi mesajele cu "— Yana, VELCONT"

PROGRAM ȘI CONTACT:
- Program: Luni–Vineri, 09:00–17:00
- Email: office@velcont.com
- Număr curent: 0731 377 793

SERVICII VELCONT:
- Contabilitate completă (SRL, PFA, II, ONG)
- Salarizare și Revisal
- Consultanță fiscală (TVA, impozite, optimizare)
- Înregistrare și modificare firme la ONRC
- Declarații ANAF (D100, D101, D112, D300, D390, D394 etc.)
- Bilanț anual, raportări INS

REGULI STRICTE:
- Nu oferi consultanță fiscală specifică — direcționezi la un consultant
- Nu confirmi programări ferm — spui că un consultant va contacta în 24h
- Nu divulgi date ale altor clienți
- Nu promite prețuri fixe — "ofertă personalizată după discuție"
- Mesajele trebuie să fie scurte (max 500 caractere), fără markdown, fără **bold**
- Folosești ocazional emoji relevant

ESCALADARE URGENTĂ (anunță că cineva revine urgent):
- Control ANAF în desfășurare
- Somare / poprire bancară
- Declarație cu termen azi sau mâine
- Eroare în declarație deja depusă

PENTRU CLIENȚI NOI care întreabă de prețuri sau servicii:
"Bună ziua! Mulțumesc că ați contactat VELCONT 🙏 Pentru o ofertă personalizată, vă rog să ne scrieți pe office@velcont.com sau să sunați la 0731 377 793 în program (L-V, 9-17). Un consultant vă contactează în aceeași zi lucrătoare. — Yana, VELCONT"

Răspunzi ÎNTOTDEAUNA în română, natural, ca un om real care cunoaște bine domeniul.`;

// ── ISTORICUL CONVERSAȚIEI (ultimele 8 mesaje per număr) ──────────────────────
async function getConversationHistory(phone: string) {
  try {
    const { data } = await admin
      .from("wa_messages_log")
      .select("direction, body, created_at")
      .eq("phone_e164", phone.startsWith("+") ? phone : `+${phone}`)
      .order("created_at", { ascending: false })
      .limit(8);

    if (!data?.length) return [];

    return data.reverse().map((m: any) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.body ?? "",
    }));
  } catch (_) {
    return [];
  }
}

// ── SALVEAZĂ MESAJ ──────────────────────────────────────────────────────────
async function logMessage(phone: string, direction: "in" | "out", body: string) {
  const phoneE164 = phone.startsWith("+") ? phone : `+${phone}`;
  try {
    await admin.from("wa_messages_log").insert({
      user_id: null,
      phone_e164: phoneE164,
      direction,
      body,
    });
  } catch (_) {}
}

// ── CHEAMĂ YANA AI ──────────────────────────────────────────────────────────
async function callYana(phone: string, contactName: string, message: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return "Yana este momentan indisponibilă. Vă rugăm să reveniți sau scrieți pe office@velcont.com.";
  }

  const history = await getConversationHistory(phone);

  const messages = [
    { role: "system", content: VELCONT_SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: contactName && contactName !== phone
        ? `[${contactName}]: ${message}`
        : message,
    },
  ];

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      console.error("AI gateway error:", resp.status, await resp.text());
      return "Momentan nu pot răspunde automat. Vă rugăm să scrieți pe office@velcont.com sau să sunați în program (L-V 9-17). — Yana, VELCONT";
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "(răspuns gol)";
  } catch (e) {
    console.error("callYana error:", e);
    return "Momentan nu pot răspunde automat. Vă rugăm să scrieți pe office@velcont.com. — Yana, VELCONT";
  }
}

// ── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verificare secret
  const secret = req.headers.get("x-aria-secret") ?? "";
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    console.warn("aria-bridge: secret invalid");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { phone, message, contact_name, chat_id } = body;

  if (!phone || !message) {
    return new Response(JSON.stringify({ error: "phone și message sunt obligatorii" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Procesăm async și returnăm 200 rapid (ca Aria să nu aștepte)
  const phoneClean = String(phone).replace(/\D/g, "");
  const phoneE164 = phoneClean.startsWith("4") ? `+${phoneClean}` : `+4${phoneClean}`;

  const processing = (async () => {
    // Salvăm mesajul clientului
    await logMessage(phoneE164, "in", message);

    // Generăm răspunsul Yanei
    const reply = await callYana(phoneE164, contact_name ?? phone, message);

    // Salvăm răspunsul
    await logMessage(phoneE164, "out", reply);

    return reply;
  })();

  // Returnăm reply sincron (Aria are nevoie de el pentru a trimite pe WA)
  const reply = await processing;

  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});