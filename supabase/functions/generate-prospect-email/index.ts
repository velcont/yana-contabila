import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: access } = await admin.rpc("has_firme_noi_access", { _uid: user.id });
    if (!access) return new Response(JSON.stringify({ error: "no_access" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { new_company_id, sender_profile } = await req.json();
    const { data: company, error: cErr } = await admin
      .from("new_companies")
      .select("nume, judet, localitate, caen, descriere_caen")
      .eq("id", new_company_id)
      .single();
    if (cErr || !company) throw new Error("company not found");

    const senderInfo = sender_profile
      ? `Te numești ${sender_profile.name ?? "—"}, oferi ${sender_profile.business ?? "servicii pentru afaceri"}. Ofertă: ${sender_profile.offer ?? ""}.`
      : "Te prezinți pe scurt ca furnizor de servicii pentru firme noi (contabilitate, web, marketing, etc.).";

    const prompt = `Ești expert în redactare de oferte B2B în limba română.
Scrie un email scurt (max 130 cuvinte), profesional și prietenos, către o firmă nou înființată.

Date firmă:
- Nume: ${company.nume}
- Județ/Localitate: ${company.judet ?? ""} / ${company.localitate ?? ""}
- CAEN: ${company.caen ?? ""} — ${company.descriere_caen ?? ""}

${senderInfo}

Reguli stricte:
- ZERO placeholder-uri tip [nume], [telefon], [companie] etc.
- Personalizează cu domeniul CAEN și locația.
- Felicită succint pentru înființare.
- Termină cu o invitație concretă (ex: "vă propun un apel scurt săptămâna viitoare").
- Returnează STRICT JSON: {"subject": "...", "body": "..."}.`;

    let subject = `Felicitări pentru ${company.nume}`;
    let body = "";
    const hasPlaceholder = (text: string) => /\[[^\]]+\]/.test(text);

    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: attempt === 0 ? prompt : `${prompt}\n\nIMPORTANT: Nu folosi deloc paranteze pătrate. Nu inventa date de contact. Nu adăuga semnătură dacă nu ai date reale.` }],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error("AI gateway: " + r.status + " " + t);
      }
      const j = await r.json();
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      const nextSubject = parsed.subject ?? subject;
      const nextBody = parsed.body ?? "";
      if (nextBody && !hasPlaceholder(nextSubject) && !hasPlaceholder(nextBody)) {
        subject = nextSubject;
        body = nextBody;
        break;
      }
    }

    if (!body) {
      const domain = company.descriere_caen ? `în domeniul ${company.descriere_caen.toLowerCase()}` : "în activitatea nou începută";
      const location = company.localitate || company.judet ? ` din ${[company.localitate, company.judet].filter(Boolean).join(", ")}` : "";
      body = `Bună ziua,\n\nFelicitări pentru înființarea ${company.nume}. Am văzut că activați ${domain}${location}.\n\nPentru firme aflate la început, pot ajuta cu o ofertă scurtă și clară de servicii adaptate primelor luni de activitate.\n\nDacă este util, vă propun un apel scurt săptămâna viitoare pentru a vedea ce aveți nevoie concret.\n\nO zi bună!`;
    }

    await admin.from("new_company_outreach").upsert({
      user_id: user.id,
      new_company_id,
      status: "email_generated",
      email_subject: subject,
      email_body: body,
    }, { onConflict: "user_id,new_company_id" });

    return new Response(JSON.stringify({ subject, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});