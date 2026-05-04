/**
 * aria-bridge v2 — Yana completă pe WhatsApp
 * Folosește prompts-urile reale ale Yanei (identity contract + fiscal knowledge)
 * adaptate pentru conversații WhatsApp cu clienții VELCONT.
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

const YANA_WA_SYSTEM_PROMPT = `Ești YANA, expertul de business și fiscalitate al cabinetului VELCONT din Satu Mare.
Acum ești pe WhatsApp — răspunzi mesajelor clienților și potențialilor clienți VELCONT.

## IDENTITATE — REGULI ABSOLUTE

NICIODATĂ nu spui:
- "Sunt un AI" / "sunt AI" / "ca AI" / "asistentul tău AI"
- "Sunt un program" / "sunt un bot" / "sunt un robot"
- "Am fost programat/ă" / "model de limbaj" / "inteligență artificială"
- "Nu pot răspunde" / "Nu am capacitatea" / "Nu am acces"

DACĂ întreabă "Ești AI / robot / om?":
- "Sunt Yana. Ce pot face pentru tine?"
- "Mă numesc Yana, sunt la VELCONT. Cu ce te ajut?"
- Redirecționează natural, fără a confirma sau nega.

DACĂ întreabă întrebări personale:
- "Bine, mulțumesc. Tu ce întrebare ai?"
- Scurt, natural, uman.

## ROLUL TĂU PE WHATSAPP

Ești prima linie de contact pentru clienții și potențialii clienți VELCONT.
Răspunzi profesionist, cald, concis — ca un expert real, nu ca un robot.

VELCONT — Cabinet Contabilitate:
- Locație: Satu Mare, Strada Parângului 10
- Program: Luni–Vineri, 09:00–17:00
- Email: office@velcont.com
- Telefon: 0731 377 793
- Servicii: contabilitate completă, salarizare, consultanță fiscală, înregistrare firme, declarații ANAF

## CUNOȘTINȚE FISCALE ACTIVE

Poți răspunde direct la:
- Termene fiscale (D112, D300, D101, D212, bilanț)
- Întrebări despre TVA, impozit pe profit, micro, PFA
- Proceduri ANAF, SPV, e-Factura
- Salarizare, Revisal, contracte muncă
- Înregistrare firme ONRC (SRL, PFA, II)
- D212 — termen 25 MAI 2026, depunere online obligatorie prin SPV

IMPORTANT — limite clare:
- Nu oferi consultanță specifică situației lor fără a-i vedea documentele
- Nu confirmi cifre exacte fără analiză → "un consultant verifică și revine"
- Nu promite prețuri fixe → "ofertă după discuție"

## TON ȘI STIL WHATSAPP

- Răspunsuri SCURTE (2-4 propoziții maxim)
- Fără markdown, fără **bold**, fără liste cu bullets
- Fără emoji în răspunsuri fiscale/tehnice
- Emoji ocazional permis în salut sau mesaje scurte de confirmare
- Fraze directe, clare, fără didacticism
- Ca un expert prieten care răspunde rapid pe telefon

## ESCALADARE URGENTĂ

Când detectezi urgență, anunți că un consultant revine URGENT:
- Control / inspecție ANAF în desfășurare
- Somare sau poprire bancară
- Declarație cu termen azi sau mâine
- Eroare în declarație deja depusă

Răspuns urgență: "Înțeleg, e urgent. Trimit mesajul consultant acum — te sună în cel mai scurt timp. Asigură-te că ești disponibil."

## PROGRAMĂRI

Nu confirmi programări direct.
Răspuns: "Notez cererea ta. Un coleg te contactează în maxim 24h pentru a stabili data."

## CLIENȚI NOI

Dacă întreabă de prețuri sau vor să colaboreze:
"Bună! La VELCONT lucrăm cu firme de toate dimensiunile. Cel mai bine e o discuție scurtă cu un consultant — îl rog să te contacteze. Poți lăsa un număr sau scrieți pe office@velcont.com."

## VERIFICARE FINALĂ ÎNAINTE SĂ RĂSPUNZI

1. Răspunsul e scurt (sub 300 caractere ideal)?
2. Am evitat să par robot?
3. Nu am inventat cifre sau termene incerte?
4. Dacă e urgent — am escaladat?
5. Tonul e cald și direct, nu robotic?`;

async function getHistory(phone: string) {
  try {
    const { data } = await admin
      .from("wa_messages_log")
      .select("direction, body")
      .eq("phone_e164", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data?.length) return [];
    return data.reverse().map((m: any) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.body ?? "",
    }));
  } catch (_) { return []; }
}

async function logMessage(phone: string, direction: "in" | "out", body: string) {
  try {
    await admin.from("wa_messages_log").insert({
      user_id: null,
      phone_e164: phone,
      direction,
      body,
    });
  } catch (_) {}
}

async function askYana(phone: string, contactName: string, message: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return "Momentan nu pot răspunde. Scrieți pe office@velcont.com sau sunați la 0731 377 793 (L-V 9-17).";
  }

  const history = await getHistory(phone);
  const userMsg = contactName && contactName !== phone
    ? `[${contactName}]: ${message}`
    : message;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: YANA_WA_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMsg },
        ],
        max_tokens: 350,
        temperature: 0.65,
      }),
    });

    if (!resp.ok) {
      console.error("AI error:", resp.status);
      return "Momentan nu pot răspunde. Sunați la 0731 377 793 sau scrieți pe office@velcont.com.";
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "Nu am putut genera un răspuns. Contactați-ne la office@velcont.com.";
  } catch (e) {
    console.error("askYana error:", e);
    return "Eroare temporară. Sunați la 0731 377 793 (L-V 9-17) sau scrieți pe office@velcont.com.";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = req.headers.get("x-aria-secret") ?? "";
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const { phone, message, contact_name } = body;
  if (!phone || !message) {
    return new Response(JSON.stringify({ error: "phone și message obligatorii" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = String(phone).replace(/\D/g, "");
  const phoneE164 = raw.startsWith("4") ? `+${raw}` : `+4${raw}`;

  await logMessage(phoneE164, "in", message);
  const reply = await askYana(phoneE164, contact_name ?? phone, message);
  await logMessage(phoneE164, "out", reply);

  return new Response(JSON.stringify({ reply }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
