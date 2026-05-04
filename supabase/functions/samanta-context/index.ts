import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-samanta-secret",
};

const SAMANTA_SECRET         = Deno.env.get("SAMANTA_CONTEXT_SECRET") ?? "";
const WHATSAPP_OWNER_USER_ID = "01632447-e347-4485-94f1-dc9792599d8e";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function buildContext(): Promise<string> {
  const uid = WHATSAPP_OWNER_USER_ID;
  const parts: string[] = [];

  try {
    const { data: p } = await admin
      .from("user_personal_profile")
      .select("preferred_name, relationship_level, total_conversations, personal_notes")
      .eq("user_id", uid).maybeSingle();
    if (p) parts.push(
      `Proprietar: ${p.preferred_name ?? "Miki"}, nivel relație ${p.relationship_level ?? 1}/5` +
      (p.personal_notes ? `, note: ${p.personal_notes}` : "")
    );
  } catch { /* silent */ }

  try {
    const { data: c } = await admin
      .from("yana_client_profiles")
      .select("business_domain, communication_style, city, personality_notes")
      .eq("user_id", uid).maybeSingle();
    if (c) parts.push(
      `Business: ${c.business_domain ?? "cabinet contabilitate"}, ${c.city ?? "Satu Mare"}` +
      (c.communication_style ? `, stil: ${c.communication_style}` : "") +
      (c.personality_notes ? `, note: ${c.personality_notes}` : "")
    );
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
      parts.push("Fapte strategice: " + facts.map((f: any) =>
        JSON.stringify(f.extracted_facts).slice(0, 300)
      ).join(" | "));
    }
  } catch { /* silent */ }

  try {
    const { data: mem } = await admin
      .from("yana_semantic_memory")
      .select("content, memory_type")
      .eq("user_id", uid)
      .order("relevance_score", { ascending: false })
      .limit(6);
    if (mem?.length) {
      parts.push("Memorie: " + mem.map((m: any) =>
        `[${m.memory_type}] ${String(m.content).slice(0, 200)}`
      ).join(" | "));
    }
  } catch { /* silent */ }

  try {
    const { data: companies } = await admin
      .from("crm_companies")
      .select("name, industry, city, lead_score")
      .eq("user_id", uid)
      .order("lead_score", { ascending: false })
      .limit(8);
    if (companies?.length) {
      parts.push("CRM top clienți: " + companies.map((c: any) =>
        `${c.name}${c.industry ? ` (${c.industry})` : ""}${c.city ? ` din ${c.city}` : ""}`
      ).join(", "));
    }
  } catch { /* silent */ }

  return parts.length
    ? parts.join("\n")
    : "Cabinet contabilitate Velcont, Satu Mare, proprietar Miki.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = req.headers.get("x-samanta-secret") ?? "";
  if (SAMANTA_SECRET && secret !== SAMANTA_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const context = await buildContext();
  return new Response(JSON.stringify({ context }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
