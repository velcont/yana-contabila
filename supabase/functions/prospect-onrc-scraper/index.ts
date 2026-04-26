/**
 * PROSPECT ONRC SCRAPER
 *
 * Caută zilnic firme noi înființate (SRL) în România folosind Perplexity
 * (sursa: ONRC Buletin Electronic + agregatori publici).
 * Pentru fiecare firmă găsită, încearcă să identifice emailul oficial.
 * Salvează lead-urile în prospect_leads cu status 'pending_review'.
 *
 * Trigger: cron zilnic 06:00 UTC (08:00 RO) SAU manual din /prospect.
 * Body: { user_id: string, target_count?: number (default 15), county?: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY")!;

interface OnrcCompany {
  company_name: string;
  cui?: string;
  registration_number?: string;
  county?: string;
  city?: string;
  registration_date?: string;
  caen_code?: string;
  caen_description?: string;
}

interface EmailResult {
  email: string | null;
  source: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  website: string | null;
}

const ONRC_SEARCH_PROMPT = (targetCount: number, county?: string) => `
Caută în buletinul ONRC (Oficiul Național Registrul Comerțului România) și pe surse publice (termene.ro, listafirme.ro) firme SRL înființate în ULTIMELE 7 ZILE în România${county ? ` din județul ${county}` : ""}.

Returnează STRICT un JSON valid cu această structură (fără markdown, fără explicații):
{
  "companies": [
    {
      "company_name": "denumire SRL exactă",
      "cui": "CUI 8 cifre (fără RO)",
      "registration_number": "J40/1234/2025",
      "county": "județ",
      "city": "oraș",
      "registration_date": "YYYY-MM-DD",
      "caen_code": "1234",
      "caen_description": "descriere activitate principală"
    }
  ]
}

Caută MINIM ${targetCount} firme noi. Doar SRL-uri (nu PFA, nu II, nu SA). Doar firme reale, verificabile. Exclude firmele dizolvate sau radiate.
Prioritizează SRL-uri din comerț, IT, servicii, consultanță, e-commerce — sunt cei mai probabili clienți pentru contabilitate online.
`.trim();

const EMAIL_SEARCH_PROMPT = (companyName: string, cui: string | undefined, city: string | undefined) => `
Găsește emailul oficial de contact al firmei "${companyName}"${cui ? ` (CUI ${cui})` : ""}${city ? ` din ${city}` : ""}, România.

Caută pe site-ul oficial al firmei, listafirme.ro, termene.ro, pagini de contact, LinkedIn business page.

Returnează STRICT un JSON valid (fără markdown):
{
  "email": "office@example.ro sau null",
  "website": "https://example.ro sau null",
  "source": "URL-ul exact de unde ai găsit emailul",
  "confidence": "high | medium | low"
}

Reguli:
- Acceptă DOAR emailuri generice de firmă (office@, contact@, info@, secretariat@, hello@).
- NU accepta emailuri personale (nume.prenume@).
- confidence "high" = email găsit pe site-ul oficial al firmei sau pe pagina ANAF/ONRC.
- confidence "medium" = email găsit pe agregator (listafirme.ro, termene.ro).
- confidence "low" = email derivat (ex: office@domeniu-ghicit.ro).
- Dacă nu găsești email real, returnează email: null.
`.trim();

async function callPerplexity(prompt: string, model = "sonar-pro"): Promise<string> {
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Ești un asistent care caută date publice despre firme românești. Răspunzi STRICT cu JSON valid, fără markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Perplexity ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJson<T>(text: string): T | null {
  // Strip markdown code fences
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  // Find first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function buildInitialEmail(companyName: string): { subject: string; body: string } {
  const subject = `Contabilitate online pentru ${companyName} – ofertă specială`;
  const body = `Bună ziua,

Felicitări pentru înființarea firmei ${companyName}!

Mă numesc Suciu Gyorfi Nicolae și mă ocup de contabilitate digitalizată pentru SRL-uri din România. Sistemul meu este complet automatizat: SmartBill + AI + CRM personalizat. Fără hârtii, fără dosare, fără stres.

Vă propun o colaborare gratuită timp de 3 luni, în care:
• Ne întâlnim lunar pe Zoom
• Închidem balanțele și depunem declarațiile
• Vă învăț să folosiți SmartBill (foarte simplu)

După perioada de test, tarifele sunt printre cele mai mici din piață:
• Firmă fără TVA: 250 RON/lună
• TVA trimestrial: 330 RON/lună
• TVA lunar: 350 RON/lună

Vedeți cum lucrez în acest video scurt: https://youtu.be/ZtkqiPIIhAw

Dacă vă interesează, programați o evaluare inițială aici (1 EUR garanție):
https://api.leadconnectorhq.com/widget/booking/7355vpWtqN56kZEbOU4N

Sau scrieți-mi direct la office@velcont.com.

Numai bine,
Suciu Gyorfi Nicolae
https://velcont.com

---
Dacă nu doriți să mai primiți astfel de mesaje, răspundeți cu "STOP" și vă elimin imediat din listă.`;
  return { subject, body };
}

function buildFollowUp(companyName: string): { subject: string; body: string } {
  const subject = `Re: Contabilitate online pentru ${companyName}`;
  const body = `Bună ziua,

Revin la mesajul anterior referitor la oferta de contabilitate online pentru ${companyName}.

Înțeleg că primele săptămâni după înființare sunt aglomerate. Vă reamintesc că oferta de 3 luni gratuit rămâne valabilă.

Dacă aveți întrebări sau preferați să vorbim direct, sunt disponibil pe WhatsApp prin velcont.com sau la office@velcont.com.

Dacă nu sunteți interesați, vă rog ignorați acest mesaj — nu voi mai reveni.

Numai bine,
Suciu Gyorfi Nicolae
https://velcont.com

---
Dacă nu doriți să mai primiți mesaje, răspundeți cu "STOP".`;
  return { subject, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, target_count = 15, county } = body as {
      user_id?: string;
      target_count?: number;
      county?: string;
    };

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[prospect-scraper] Start: user=${user_id} target=${target_count} county=${county || "all"}`);

    // 1) Caută firme noi pe ONRC
    const onrcText = await callPerplexity(ONRC_SEARCH_PROMPT(target_count, county));
    const onrcData = extractJson<{ companies: OnrcCompany[] }>(onrcText);
    if (!onrcData || !Array.isArray(onrcData.companies)) {
      console.error("[prospect-scraper] Failed to parse ONRC response:", onrcText.slice(0, 300));
      return new Response(JSON.stringify({ error: "Failed to parse ONRC data", raw: onrcText.slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[prospect-scraper] Found ${onrcData.companies.length} companies from ONRC`);

    // 2) Filtrează duplicate (după CUI deja existent)
    const cuis = onrcData.companies.map((c) => c.cui).filter(Boolean) as string[];
    const { data: existing } = await supabase
      .from("prospect_leads")
      .select("cui")
      .eq("user_id", user_id)
      .in("cui", cuis);
    const existingCuis = new Set((existing || []).map((e: { cui: string }) => e.cui));

    const newCompanies = onrcData.companies.filter((c) => c.cui && !existingCuis.has(c.cui));
    console.log(`[prospect-scraper] ${newCompanies.length} new (after dedup)`);

    // Limit to target_count
    const toProcess = newCompanies.slice(0, target_count);

    // 3) Pentru fiecare, caută email + creează lead
    const results = { inserted: 0, no_email: 0, errors: 0 };

    for (const company of toProcess) {
      try {
        // Caută email
        let emailResult: EmailResult = { email: null, source: null, confidence: "unknown", website: null };
        try {
          const emailText = await callPerplexity(EMAIL_SEARCH_PROMPT(company.company_name, company.cui, company.city), "sonar");
          const parsed = extractJson<{ email: string | null; website: string | null; source: string | null; confidence: string }>(emailText);
          if (parsed && parsed.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
            emailResult = {
              email: parsed.email.toLowerCase(),
              website: parsed.website,
              source: parsed.source,
              confidence: (["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low") as EmailResult["confidence"],
            };
          }
        } catch (e) {
          console.warn(`[prospect-scraper] Email search failed for ${company.company_name}:`, (e as Error).message);
        }

        const { subject: initSubj, body: initBody } = buildInitialEmail(company.company_name);
        const { subject: fuSubj, body: fuBody } = buildFollowUp(company.company_name);

        const status = emailResult.email ? "pending_review" : "no_email_found";

        const { error: insertErr } = await supabase.from("prospect_leads").insert({
          user_id,
          company_name: company.company_name,
          cui: company.cui || null,
          registration_number: company.registration_number || null,
          county: company.county || null,
          city: company.city || null,
          registration_date: company.registration_date || null,
          caen_code: company.caen_code || null,
          caen_description: company.caen_description || null,
          email: emailResult.email,
          email_source: emailResult.source,
          email_confidence: emailResult.confidence,
          website: emailResult.website,
          status,
          initial_email_subject: initSubj,
          initial_email_body: initBody,
          follow_up_subject: fuSubj,
          follow_up_body: fuBody,
          raw_onrc_data: company as unknown as Record<string, unknown>,
          raw_email_search_data: emailResult as unknown as Record<string, unknown>,
        });

        if (insertErr) {
          console.error(`[prospect-scraper] Insert error for ${company.company_name}:`, insertErr.message);
          results.errors++;
        } else {
          if (emailResult.email) results.inserted++;
          else results.no_email++;
        }
      } catch (e) {
        console.error(`[prospect-scraper] Error processing ${company.company_name}:`, (e as Error).message);
        results.errors++;
      }
    }

    console.log(`[prospect-scraper] Done:`, results);

    return new Response(JSON.stringify({
      success: true,
      total_found: onrcData.companies.length,
      new_after_dedup: newCompanies.length,
      processed: toProcess.length,
      ...results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[prospect-scraper] Fatal:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});