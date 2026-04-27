import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FirmaInput {
  cui: string;
  nume: string;
  localitate?: string;
  judet?: string;
  caen_descriere?: string;
}

interface FoundEmail {
  cui: string;
  nume: string;
  email: string | null;
  website: string | null;
  source: string;
  reason?: string;
}

async function findEmailWithPerplexity(firma: FirmaInput, apiKey: string): Promise<FoundEmail> {
  const query = `Care este adresa de email oficială de contact pentru firma românească "${firma.nume}" (CUI ${firma.cui}) din ${firma.localitate || ''} ${firma.judet || ''}? Caută pe site-ul oficial al firmei, pe pagini de contact, sau în surse publice (listafirme.ro, termene.ro, mfinante.ro, paginiaurii.ro). Returnează DOAR un JSON cu format: {"email": "adresa@domeniu.ro" sau null, "website": "https://..." sau null, "source": "domeniu sau site de unde ai luat informația"}. Dacă nu găsești email valid, returnează email: null.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Ești un asistent care caută informații publice de contact pentru firme românești. Răspunzi DOAR cu JSON valid, fără explicații.' },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error(`Perplexity error for ${firma.nume}:`, response.status, txt);
      return { cui: firma.cui, nume: firma.nume, email: null, website: null, source: 'perplexity_error', reason: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    
    // Extrage JSON din răspuns
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return { cui: firma.cui, nume: firma.nume, email: null, website: null, source: 'no_json', reason: content.slice(0, 100) };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : null;
    
    // Validare email simplă
    const emailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('example') && !email.includes('domeniu');
    
    return {
      cui: firma.cui,
      nume: firma.nume,
      email: emailValid ? email : null,
      website: typeof parsed.website === 'string' ? parsed.website : null,
      source: parsed.source || 'perplexity',
    };
  } catch (e: any) {
    console.error(`Error finding email for ${firma.nume}:`, e.message);
    return { cui: firma.cui, nume: firma.nume, email: null, website: null, source: 'exception', reason: e.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const firme: FirmaInput[] = body.firme || [];
    
    if (!Array.isArray(firme) || firme.length === 0) {
      return new Response(JSON.stringify({ error: 'Trimite array "firme" cu cel puțin 1 element' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (firme.length > 100) {
      return new Response(JSON.stringify({ error: 'Maxim 100 firme per request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[email-finder] Procesez ${firme.length} firme...`);

    const results: FoundEmail[] = [];
    let foundCount = 0;
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const firma of firme) {
      const result = await findEmailWithPerplexity(firma, PERPLEXITY_API_KEY);
      results.push(result);

      if (result.email) {
        foundCount++;
        // Inserează în outreach_leads
        const { error } = await supabase.from('outreach_leads').insert({
          company_name: firma.nume,
          email: result.email,
          website: result.website,
          city: firma.localitate || null,
          industry: firma.caen_descriere || null,
          cui: firma.cui,
          source: 'mf_firme_noi',
          status: 'new',
          notes: `Email găsit prin: ${result.source}`,
        });

        if (error) {
          if (error.code === '23505') {
            duplicateCount++;
            console.log(`[email-finder] Duplicate: ${result.email}`);
          } else {
            console.error(`[email-finder] Insert error for ${result.email}:`, error.message);
          }
        } else {
          insertedCount++;
        }
      }

      // Rate limit Perplexity (~0.5s între request-uri)
      await new Promise(r => setTimeout(r, 600));
    }

    const summary = {
      total_processed: firme.length,
      emails_found: foundCount,
      inserted: insertedCount,
      duplicates: duplicateCount,
      not_found: firme.length - foundCount,
      results,
    };

    console.log(`[email-finder] Done:`, JSON.stringify({ ...summary, results: undefined }));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[email-finder] Fatal:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});