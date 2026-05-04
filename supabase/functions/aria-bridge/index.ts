/**
 * aria-bridge — Bridge Aria (whatsapp-web.js) <-> Yana
 *
 * Răspunde mesaje WhatsApp folosind același context bogat ca în aplicație
 * pentru user-ul WHATSAPP_OWNER (office@velcont.com).
 *
 * POST /functions/v1/aria-bridge
 * Headers: x-aria-secret: <ARIA_BRIDGE_SECRET>
 * Body: { phone, message, contact_name?, chat_id? }
 * Response: { reply: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-aria-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// User-ul real al cărui context îl folosește Yana pe WhatsApp.
// (office@velcont.com — Miki, owner Velcont)
const WHATSAPP_OWNER_USER_ID = "01632447-e347-4485-94f1-dc9792599d8e";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const ARIA_BRIDGE_SECRET = Deno.env.get("ARIA_BRIDGE_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- Conversation log (pentru istoric pe nr. WhatsApp) ----------
async function ensureLogTable() {
  // tabela e creată via migrație; aici doar safe no-op
}

async function getRecentMessages(phone: string, limit = 8) {
  const { data, error } = await supabase
    .from("wa_messages_log")
    .select("direction, body, created_at")
    .eq("phone_e164", phone)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[aria-bridge] getRecentMessages err", error.message);
    return [];
  }
  return (data || []).reverse().map((m: any) => ({
    direction: m.direction as "in" | "out",
    content: m.body as string,
  }));
}

async function logMessage(phone: string, direction: "in" | "out", content: string, _contactName?: string) {
  const { error } = await supabase.from("wa_messages_log").insert({
    phone_e164: phone,
    direction,
    body: content,
    status: "ok",
    user_id: WHATSAPP_OWNER_USER_ID,
  });
  if (error) console.warn("[aria-bridge] logMessage err", error.message);
}

// ---------- Context bogat (profil + clienți + facts) ----------
async function buildOwnerContext(): Promise<string> {
  const parts: string[] = [];
  const uid = WHATSAPP_OWNER_USER_ID;

  // Profil personal
  try {
    const { data: personal } = await supabase
      .from("user_personal_profile")
      .select("preferred_name, detected_gender, relationship_level, total_conversations, personal_notes")
      .eq("user_id", uid)
      .maybeSingle();
    if (personal) {
      parts.push(
        `## Persoana cu care vorbești\n` +
          `- Nume preferat: ${personal.preferred_name ?? "Miki"}\n` +
          `- Nivel relație: ${personal.relationship_level ?? 1}/5\n` +
          `- Conversații totale: ${personal.total_conversations ?? 0}`,
      );
    } else {
      parts.push(`## Persoana cu care vorbești\n- Miki (office@velcont.com)`);
    }
  } catch (e) {
    console.warn("[aria-bridge] personal err", e);
  }

  // Profil client (business)
  try {
    const { data: client } = await supabase
      .from("yana_client_profiles")
      .select("business_domain, company_size, communication_style, personality_notes, city, preferred_topics")
      .eq("user_id", uid)
      .maybeSingle();
    if (client) {
      parts.push(
        `## Profil business\n` +
          `- Domeniu: ${client.business_domain ?? "contabilitate (Velcont)"}\n` +
          `- Mărime: ${client.company_size ?? "—"}\n` +
          `- Stil: ${client.communication_style ?? "—"}\n` +
          `- Oraș: ${client.city ?? "Cluj-Napoca"}` +
          (client.personality_notes ? `\n- Note: ${client.personality_notes}` : ""),
      );
    }
  } catch (e) {
    console.warn("[aria-bridge] client err", e);
  }

  // Strategic facts (ultimele aprobate)
  try {
    const { data: facts } = await supabase
      .from("strategic_facts")
      .select("extracted_facts, validation_status, created_at")
      .eq("user_id", uid)
      .eq("validation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(3);
    if (facts && facts.length) {
      const summarized = facts
        .map((f, i) => `- Fact ${i + 1}: ${JSON.stringify(f.extracted_facts).slice(0, 400)}`)
        .join("\n");
      parts.push(`## Fapte strategice validate\n${summarized}`);
    }
  } catch (e) {
    console.warn("[aria-bridge] facts err", e);
  }

  // Memorie semantică top
  try {
    const { data: mem } = await supabase
      .from("yana_semantic_memory")
      .select("content, memory_type, relevance_score")
      .eq("user_id", uid)
      .order("relevance_score", { ascending: false })
      .limit(8);
    if (mem && mem.length) {
      const lines = mem.map((m) => `- (${m.memory_type}) ${m.content.slice(0, 220)}`).join("\n");
      parts.push(`## Memorie relevantă\n${lines}`);
    }
  } catch (e) {
    console.warn("[aria-bridge] memory err", e);
  }

  // CRM companies (top 10)
  try {
    const { data: companies } = await supabase
      .from("crm_companies")
      .select("name, industry, city, annual_revenue, lead_score, notes")
      .eq("user_id", uid)
      .order("lead_score", { ascending: false })
      .limit(10);
    if (companies && companies.length) {
      const lines = companies
        .map(
          (c) =>
            `- ${c.name}${c.industry ? ` (${c.industry})` : ""}${c.city ? ` — ${c.city}` : ""}${
              c.lead_score ? ` · score ${c.lead_score}` : ""
            }`,
        )
        .join("\n");
      parts.push(`## Clienți / companii din CRM (top ${companies.length})\n${lines}`);
    }
  } catch (e) {
    console.warn("[aria-bridge] crm err", e);
  }

  return parts.join("\n\n");
}

// ---------- Apel Lovable AI ----------
async function callYana(opts: {
  phone: string;
  contactName: string;
  message: string;
}): Promise<string> {
  const ownerContext = await buildOwnerContext();
  const history = await getRecentMessages(opts.phone, 8);

  const systemPrompt = `Ești YANA — partener strategic de business pentru Miki (Velcont, contabilitate, Cluj-Napoca).
Răspunzi pe WhatsApp prin Aria. Mesajele vin de la contacte externe ("${opts.contactName}", ${opts.phone}).
Vorbești cu acel contact, dar ai în spate contextul complet al lui Miki și al firmei Velcont.

REGULI WhatsApp:
- Răspunsuri scurte (max 4-6 propoziții, sub ~500 caractere).
- Ton cald, profesional, direct. Fără emoji excesivi (1 max, opțional).
- Fără markdown (** sau #). Plain text natural pentru WhatsApp.
- Dacă întrebarea depășește competența ta sau e urgentă (ANAF, control, litigiu) → spune că o transmiți lui Miki și vei reveni.
- Folosește datele de contact reale: Velcont, Cluj-Napoca, 0731 377 793, office@velcont.com, L-V 9-17.

CONTEXT MIKI / VELCONT:
${ownerContext || "(profil în construcție)"}`;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.message },
  ];

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("[aria-bridge] AI gateway", resp.status, t);
    if (resp.status === 429) return "Sunt momentan supraîncărcată, revin în câteva minute.";
    if (resp.status === 402) return "Nu mai am credite AI disponibile. Te sun Miki imediat ce poate.";
    return "Am o problemă tehnică momentan. Te rog revino în câteva minute sau sună la 0731 377 793.";
  }

  const data = await resp.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  return reply || "Te rog reformulează — nu am înțeles complet.";
}

// ---------- HTTP handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: shared secret cu Aria
  const secret = req.headers.get("x-aria-secret");
  if (!secret || secret !== ARIA_BRIDGE_SECRET) {
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

  const phone: string | undefined = body?.phone;
  const message: string | undefined = body?.message;
  const contactName: string = body?.contact_name || phone || "Necunoscut";

  if (!phone || !message) {
    return new Response(JSON.stringify({ error: "Missing phone or message" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phoneE164 = phone.startsWith("+") ? phone : `+${phone}`;

  try {
    await ensureLogTable();
    await logMessage(phoneE164, "in", message, contactName);

    const reply = await callYana({ phone: phoneE164, contactName, message });

    await logMessage(phoneE164, "out", reply, contactName);

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[aria-bridge] fatal", e);
    return new Response(
      JSON.stringify({ reply: "Am o eroare tehnică. Sună te rog la 0731 377 793." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
