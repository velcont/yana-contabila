/**
 * aria-bridge v3 — Yana cu context real Supabase
 * Încarcă: profil personal, business profile, fapte strategice,
 * memorie semantică, CRM companies — pentru office@velcont.com
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aria-secret",
};

const BRIDGE_SECRET          = Deno.env.get("ARIA_BRIDGE_SECRET") ?? "";
const LOVABLE_API_KEY        = Deno.env.get("LOVABLE_API_KEY") ?? "";
const WHATSAPP_OWNER_USER_ID = "01632447-e347-4485-94f1-dc9792599d8e";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// ── CONVERSAȚIE ───────────────────────────────────────────────────────────────

async function getHistory(phone: string) {
  try {
    const { data } = await admin
      .from("wa_messages_log")
      .select("direction, body")
      .eq("phone_e164", phone)
      .order("created_at", { ascending: false })
      .limit(8);
    if (!data?.length) return [];
    return data.reverse().map((m: any) => ({
      role: m.direction === "in" ? "user" : "assistant",
      content: m.body ?? "",
    }));
  } catch { return []; }
}

async function logMessage(phone: string, direction: "in" | "out", body: string) {
  try {
    await admin.from("wa_messages_log").insert({
      user_id: WHATSAPP_OWNER_USER_ID,
      phone_e164: phone,
      direction,
      body,
    });
  } catch { /* silent */ }
}

// ── CONTEXT DIN DB ────────────────────────────────────────────────────────────

async function buildOwnerContext(): Promise<string> {
  const uid = WHATSAPP_OWNER_USER_ID;
  const parts: string[] = [];

  try {
    const { data: p } = await admin
      .from("user_personal_profile")
      .select("preferred_name, relationship_level, total_conversations, personal_notes")
      .eq("user_id", uid)
      .maybeSingle();
    if (p) {
      parts.push(
        `## Proprietar cabinet\n` +
        `- Nume: ${p.preferred_name ?? "Miki"}\n` +
        `- Nivel relație Yana: ${p.relationship_level ?? 1}/5\n` +
        `- Conversații totale: ${p.total_conversations ?? 0}` +
        (p.personal_notes ? `\n- Note: ${p.personal_notes}` : ""),
      );
    } else {
      parts.push("## Proprietar cabinet\n- Miki (office@velcont.com) — Velcont, Satu Mare");
    }
  } catch { /* silent */ }

  try {
    const { data: c } = await admin
      .from("yana_client_profiles")
      .select("business_domain, company_size, communication_style, personality_notes, city")
      .eq("user_id", uid)
      .maybeSingle();
    if (c) {
      parts.push(
        `## Profil business\n` +
        `- Domeniu: ${c.business_domain ?? "cabinet contabilitate"}\n` +
        `- Mărime: ${c.company_size ?? "—"}\n` +
        `- Stil: ${c.communication_style ?? "—"}\n` +
        `- Oraș: ${c.city ?? "Satu Mare"}` +
        (c.personality_notes ? `\n- Note: ${c.personality_notes}` : ""),
      );
    }
  } catch { /* silent */ }

  try {
    const { data: facts } = await admin
      .from("strategic_facts")
      .select("extracted_facts")
      .eq("user_id", uid)
      .eq("validation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(3);
    if (facts?.length) {
      const lines = facts.map((f: any, i: number) =>
        `- Fact ${i + 1}: ${JSON.stringify(f.extracted_facts).slice(0, 400)}`
      ).join("\n");
      parts.push(`## Fapte strategice validate\n${lines}`);
    }
  } catch { /* silent */ }

  try {
    const { data: mem } = await admin
      .from("yana_semantic_memory")
      .select("content, memory_type, relevance_score")
      .eq("user_id", uid)
      .order("relevance_score", { ascending: false })
      .limit(8);
    if (mem?.length) {
      const lines = mem.map((m: any) =>
        `- [${m.memory_type}] ${String(m.content).slice(0, 220)}`
      ).join("\n");
      parts.push(`## Memorie semantică\n${lines}`);
    }
  } catch { /* silent */ }

  try {
    const { data: companies } = await admin
      .from("crm_companies")
      .select("name, industry, city, lead_score")
      .eq("user_id", uid)
      .order("lead_score", { ascending: false })
      .limit(10);
    if (companies?.length) {
      const lines = companies.map((c: any) =>
        `- ${c.name}${c.industry ? ` (${c.industry})` : ""}${c.city ? ` — ${c.city}` : ""}${c.lead_score ? ` · score ${c.lead_score}` : ""}`
      ).join("\n");
      parts.push(`## Clienți CRM (top ${companies.length})\n${lines}`);
    }
  } catch { /* silent */ }

  return parts.join("\n\n");
}

// ── IDENTITATE + REGULI (fixe) ────────────────────────────────────────────────

const YANA_RULES = `## IDENTITATE — REGULI ABSOLUTE

NICIODATĂ nu spui:
- "Sunt un AI" / "sunt AI" / "model de limbaj" / "inteligență artificială"
- "Sunt un program" / "sunt un bot" / "sunt un robot"

DACĂ întreabă "Ești AI / robot / om?":
→ "Sunt Yana. Ce pot face pentru tine?" — redirecționează natural, fără confirmare.

## CUNOȘTINȚE FISCALE ACTIVE

Răspunzi direct la:
- Termene: D112, D300, D101, D212 (termen 25 MAI 2026 — depunere SPV obligatorie), bilanț
- TVA, impozit profit, microîntreprindere, PFA, II, SRL
- ANAF, SPV, e-Factura, Revisal, contracte muncă, ONRC

Limite:
- Fără consultanță specifică fără documente → "un consultant verifică și revine"
- Fără cifre exacte neconfirmate → "ofertă după discuție"

## TON WHATSAPP

- Răspunsuri SCURTE (2-4 propoziții, sub 400 caractere)
- Plain text — fără markdown, fără bold, fără bullet lists
- Emoji ocazional doar în salut sau confirmare
- Direct, cald, expert prieten

## ESCALADARE URGENTĂ

Dacă detectezi: control ANAF activ, somare/poprire, termen azi/mâine, eroare declarație depusă:
→ "Înțeleg, e urgent. Trimit mesajul consultantului acum — te sună în cel mai scurt timp."

## VELCONT
Satu Mare · Strada Parângului 10 · office@velcont.com · 0731 377 793 · L-V 9-17
Servicii: contabilitate, salarizare, consultanță fiscală, înregistrare firme, declarații ANAF`;

// ── YANA AI ───────────────────────────────────────────────────────────────────

async function askYana(phone: string, contactName: string, message: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return "Momentan nu pot răspunde. Scrieți pe office@velcont.com sau sunați la 0731 377 793 (L-V 9-17).";
  }

  const [ownerContext, history] = await Promise.all([
    buildOwnerContext(),
    getHistory(phone),
  ]);

  const systemPrompt =
    `Ești YANA, expertul de business și fiscalitate al cabinetului VELCONT din Satu Mare.\n` +
    `Răspunzi pe WhatsApp. Contactul curent: ${contactName !== phone ? `${contactName} (${phone})` : phone}\n\n` +
    YANA_RULES +
    (ownerContext ? `\n\n## CONTEXT CABINET VELCONT\n${ownerContext}` : "");

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
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMsg },
        ],
        max_tokens: 400,
        temperature: 0.65,
      }),
    });

    if (!resp.ok) {
      const s = resp.status;
      console.error("[aria-bridge] AI error:", s);
      if (s === 429) return "Sunt supraîncărcată momentan. Revino în câteva minute sau sună la 0731 377 793.";
      if (s === 402) return "Problemă tehnică temporară. Sună la 0731 377 793 sau scrie pe office@velcont.com.";
      return "Momentan nu pot răspunde. Sunați la 0731 377 793 sau scrieți pe office@velcont.com.";
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim()
      || "Nu am putut genera un răspuns. Contactați-ne la office@velcont.com.";
  } catch (e) {
    console.error("[aria-bridge] askYana error:", e);
    return "Eroare temporară. Sunați la 0731 377 793 (L-V 9-17) sau scrieți pe office@velcont.com.";
  }
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

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
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
