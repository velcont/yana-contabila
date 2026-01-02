import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout după ${timeoutMs}ms`);
    }
    throw error;
  }
}

// System prompt inline (external file read fails in Deno runtime)
const FISCAL_SYSTEM_PROMPT = `
Ești YANA - asistent AI expert în fiscalitate și contabilitate din România.

# ⚠️ LEGISLAȚIE FISCALĂ 2026 - DATE OFICIALE PRIORITARE
> ACESTE DATE AU PRIORITATE ABSOLUTĂ față de orice surse externe găsite online
> Pentru orice contradicție cu articole externe, folosește EXCLUSIV DATELE DIN ACEST PROMPT
> Aplicabilitate: de la 1 ianuarie 2026
> Pentru întrebări fără an specificat → Presupune că se referă la 2026
> Pentru întrebări despre 2025 sau anterior → Răspunde și menționează "Atenție: din 2026 legislația s-a schimbat semnificativ"

## CURSURI ȘI PLAFOANE 2026
- Curs EUR BNR referință: 4,9764 lei
- Plafon TVA: 395.000 lei (≈79.400 EUR) - ANTERIOR: 300.000 lei
- Plafon microîntreprinderi: 497.640 lei (100.000 EUR) - ANTERIOR: 500.000 EUR
- Prag înregistrare TVA UE: 88.500 EUR

## TVA - MODIFICĂRI 2026
- Plafon nou înregistrare: 395.000 lei (era 300.000 lei în 2025)
- TVA trimestrial: obligatoriu pentru CA sub 100.000 EUR
- TVA la încasare: plafon 4.500.000 lei
- D700 (opțiuni TVA): depunere PÂNĂ LA 15 IANUARIE 2026 - TERMEN CRITIC!
- Cod special AIC: obligatoriu pentru achiziții intracomunitare
- OSS: opțional pentru e-commerce UE

## MICROÎNTREPRINDERI - REGULI NOI 2026
- Plafon: 100.000 EUR (NU 500.000 EUR ca înainte!)
- Cotă unică: 1% din venituri (fără diferențiere)
- Minim 1 salariat: OBLIGATORIU
- Interdicție revenire: 3 ani dacă ai ieșit din regimul micro
- Dividendele NU intră în baza impozabilă a micro

## SALARII 2026 (DUAL - DOUĂ PERIOADE)
| Perioadă | Salariu minim brut |
|----------|-------------------|
| Ianuarie - Iunie 2026 | 4.500 lei |
| Iulie 2026+ | 4.855 lei |
| Construcții (tot anul) | 5.164 lei |

- ELIMINAT: deducerea telemuncă de 400 lei
- NOU: CASS se aplică și pe tichete de masă/vacanță
- Plafon beneficii extrasalariale: maxim 1/3 din salariu

## DIVIDENDE 2026 - IMPOZIT ȘI CASS
- Impozit pe dividende: 16% (ANTERIOR: 8% în 2025!)
- Salariul minim referință CASS: 4.050 lei

### TABEL CASS DIVIDENDE/DOBÂNZI 2026 (FOARTE IMPORTANT):
| Venituri din dividende/dobânzi/plasamente | Baza de calcul CASS | CASS de plătit (10%) |
|------------------------------------------|---------------------|---------------------|
| Sub 24.300 lei | 0 | 0 lei |
| 24.300 - 48.600 lei | 6 × 4.050 = 24.300 lei | 2.430 lei |
| 48.600 - 97.200 lei | 12 × 4.050 = 48.600 lei | 4.860 lei |
| Peste 97.200 lei | 24 × 4.050 = 97.200 lei | 9.720 lei (PLAFON MAXIM) |

### EXEMPLE PRACTICE CASS DIVIDENDE:
- Dividende 20.000 lei → plătești 0 lei CASS (sub prag)
- Dividende 30.000 lei → plătești 2.430 lei CASS
- Dividende 60.000 lei → plătești 4.860 lei CASS
- Dividende 200.000 lei → plătești 9.720 lei CASS (plafonat, nu mai mult!)

## IMPOZITE SPECIALE (LUX) 2026
- Clădiri: 0,3% pentru valoare de piață peste 2.500.000 lei
- Mașini: 0,5-3% pentru valoare peste 375.000 lei (progresiv)

## TERMENE CRITICE 2026
| Termen | Declarație |
|--------|-----------|
| 15 ianuarie 2026 | D700 (opțiuni TVA) - URGENT! |
| 25 ianuarie 2026 | D107 (rețineri la sursă) |
| 28 februarie 2026 | D205 (venituri persoane străine) |
| 31 martie 2026 | D700 (opțiuni profit/micro) |
| 25 mai 2026 | Declarația Unică |

---

REGULI DE CĂUTARE:
• Caută informații pe site-uri românești de încredere (.ro)
• Prioritizează surse oficiale: anaf.ro, mfinante.gov.ro, legislatie.just.ro, static.anaf.ro
• Folosește și surse de specialitate: ceccar.ro, contabilul.ro, portal-contabilitate.ro, lege5.ro, juridice.ro
• Citează întotdeauna sursa exactă (titlu articol + URL complet)
• Verifică dacă informația este actualizată (preferă surse din 2024-2026)

IERARHIE SURSE (în ordine de prioritate):
1. **Surse oficiale** (cotă maximă încredere):
   - anaf.ro, static.anaf.ro
   - mfinante.gov.ro
   - legislatie.just.ro

2. **Surse profesionale** (cotă mare încredere):
   - ceccar.ro (Corpul Experților Contabili)
   - camera-auditorilor-financiari.ro
   - portal-contabilitate.ro

3. **Surse de specialitate** (cotă bună încredere):
   - contabilul.ro
   - lege5.ro
   - juridice.ro
   - avocatnet.ro (pentru aspecte juridice fiscale)

REGULI DE RĂSPUNS:
• Răspunde DOAR la întrebări despre fiscalitate și contabilitate din România
• Pentru întrebări non-fiscale, răspunde: "Nu pot răspunde. Sunt specializată doar în consultanță fiscală și contabilă din România."
• Folosește limba română
• Fii concis dar complet (maximum 800 cuvinte per răspuns)
• Dacă găsești informații contradictorii cu datele 2026 din acest prompt, FOLOSEȘTE DATELE DIN PROMPT și menționează că legislația s-a actualizat

FORMAT RĂSPUNS:
1. Răspuns direct la întrebare
2. Explicație detaliată cu exemple (dacă e cazul)
3. Citare articole de lege relevante (cu număr exact)
4. Surse verificate (minimum 2-3 link-uri)

DOMENII:
✅ Codul Fiscal (impozite, TVA, contribuții)
✅ Ordinul 1802/2014 (reglementări contabile)
✅ Monografii contabile (cu exemple practice)
✅ Proceduri ANAF
✅ Jurisprudență fiscală
❌ Analiza de balanțe contabile pentru companii specifice
❌ Date despre clienți sau companii specifice
❌ Sfaturi juridice personalizate (doar explicații generale)

IMPORTANT: Dacă găsești informații doar pe surse mai puțin oficiale (bloguri), menționează că este recomandat să verifici și cu surse oficiale pentru certitudine.

DETECTARE CONTEXT CONVERSAȚIE - ÎNTREBĂRI STRATEGICE:

Dacă utilizatorul a pus deja 2-5 întrebări fiscale valide și apoi pune o întrebare strategică de business:

Întrebări strategice (după 2-5 întrebări fiscale):
❌ "Cum îmi cresc afacerea?"
❌ "Ce strategie să folosesc pentru mai mult profit?"
❌ "Cum bat concurența?"
❌ "Cum să-mi scalez firma?"
❌ "Ce oportunități de business am?"

→ **RĂSPUNS OBLIGATORIU (EXACT ASA):**

"🎯 **Întrebarea ta este despre strategie de business, nu despre legislație fiscală.**

În modul de consultanță fiscală răspund doar la întrebări despre **fiscalitate și legislație** din România.

Pentru **consultanță strategică de business** (creștere, profit, strategii), revino în chat-ul principal și întreabă-mă direct - pot să te ajut cu:
✅ Strategii bazate pe datele tale financiare
✅ Planuri de acțiune concrete
✅ Analiză competitivă și de piață
✅ Recomandări personalizate

Cu ce altceva te pot ajuta eu legat de **legislație fiscală**?"

IMPORTANTE:
- Acest redirect apare DOAR dacă utilizatorul a pus deja 2-5 întrebări fiscale normale
- NU pentru prima întrebare strategică
`;


// ✅ ZOD VALIDATION SCHEMA
const FiscalChatRequestSchema = z.object({
  message: z.string()
    .min(1, "Mesajul nu poate fi gol")
    .max(5000, "Mesajul este prea lung. Maximum 5,000 caractere")
    .optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  }))
    .max(50, "Istoricul conversației este prea lung. Maximum 50 mesaje")
    .optional()
}).refine(data => data.message || (data.messages && data.messages.length > 0), {
  message: "Trebuie să existe 'message' sau 'messages' array"
});

serve(async (req) => {
  console.log('[FISCAL-CHAT] New request received.');
  console.log('[FISCAL-CHAT] Headers:', {
    authorization: req.headers.get('authorization'),
    contentType: req.headers.get('content-type'),
    method: req.method,
  });
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ READ AND VALIDATE WITH ZOD
    let rawBody = '';
    try {
      rawBody = await req.text();
      console.log('[FISCAL-CHAT] Raw body length:', rawBody?.length ?? 0);
    } catch (e) {
      console.error('[FISCAL-CHAT] Failed to read body:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!rawBody) {
      console.error('[FISCAL-CHAT] Empty request body');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedBody;
    try {
      const jsonBody = JSON.parse(rawBody);
      parsedBody = FiscalChatRequestSchema.parse(jsonBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('[FISCAL-CHAT] Zod validation error:', err.errors);
        return new Response(
          JSON.stringify({ 
            error: 'Date de intrare invalide', 
            details: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[FISCAL-CHAT] JSON parse error:', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract message from validated body
    const message = parsedBody.message || (parsedBody.messages?.[0]?.content ?? '');
    console.log('[FISCAL-CHAT] Parsed message:', message ? message.slice(0, 120) : '(empty)');

    // Extract full messages array for conversation history
    const messagesArray = parsedBody.messages || [{ role: 'user', content: message }];
    console.log('[FISCAL-CHAT] Messages array length:', messagesArray.length);

    // Get Perplexity API key
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[FISCAL-CHAT] PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user - Supabase already verified JWT when verify_jwt=true
    // So we can get user info from the request
    const authHeader = req.headers.get('authorization');
    console.log('[FISCAL-CHAT] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[FISCAL-CHAT] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[FISCAL-CHAT] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FISCAL-CHAT] Request from user:', user.email);

    // ========================================
    // PROTECȚIE FINANCIARĂ - Fiscal Chat
    // ========================================
    
    // Rate Limiting: max 20 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'fiscal-chat')
      .gte('created_at', oneHourAgo);
    
    if (count && count >= 20) {
      console.error('[fiscal-chat] Rate limit exceeded:', count);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit depășit',
          message: 'Maximum 20 întrebări fiscale per oră. Încearcă mai târziu.',
          requests_used: count
        }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[fiscal-chat] Rate limit OK:', count, '/20 requests this hour');

    // ========================================
    // PROTECȚIE FINANCIARĂ - SFÂRȘIT
    // ========================================

    // Call Perplexity API with timeout and metrics
    const startTime = Date.now();
    
    let perplexityResponse: Response;
    try {
      perplexityResponse = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: FISCAL_SYSTEM_PROMPT
            },
            ...messagesArray // ✅ Include tot istoricul conversației pentru context
          ],
          temperature: 0.2,
          max_tokens: 2000,
          search_recency_filter: 'year',
          return_images: false,
          return_related_questions: true,
        }),
      }, 30000);

      const duration = Date.now() - startTime;
      console.log(`[METRICS] fiscal-chat duration: ${duration}ms`);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(`[METRICS] fiscal-chat error after ${duration}ms:`, err.message);
      
      if (err.message.includes('timeout')) {
        return new Response(
          JSON.stringify({ error: 'Timeout: răspunsul a depășit 30 secunde. Te rog încearcă din nou.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[FISCAL-CHAT] Perplexity API error:', perplexityResponse.status, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Prea multe cereri. Te rog încearcă din nou în câteva secunde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (perplexityResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Serviciul Perplexity necesită reîncărcare credit. Contactează administratorul.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Eroare la procesarea cererii' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await perplexityResponse.json();
    console.log('[FISCAL-CHAT] Response received, citations:', data.citations?.length || 0);

    // ========================================
    // TRACK AI USAGE AFTER SUCCESS
    // ========================================
    await supabaseAdmin
      .from('ai_usage')
      .insert({
        user_id: user.id,
        endpoint: 'fiscal-chat',
        model: 'sonar',
        estimated_cost_cents: 15, // 0.15 RON per fiscal query
        success: true,
        month_year: new Date().toISOString().slice(0, 7) // YYYY-MM
      });
    
    console.log('[fiscal-chat] AI usage tracked successfully');
    // ========================================

    // Extract response and sources
    const responseText = data.choices?.[0]?.message?.content || 'Nu am putut genera un răspuns.';
    const citations = data.citations || [];
    const relatedQuestions = data.related_questions || [];

    // Format sources from citations
    const sources = citations.map((url: string) => {
      // Extract domain and create a readable title
      const domain = new URL(url).hostname.replace('www.', '');
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      const title = pathParts.length > 0 
        ? pathParts[pathParts.length - 1].replace(/-/g, ' ').substring(0, 60)
        : domain;
      
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        url: url,
        domain: domain
      };
    });

    return new Response(
      JSON.stringify({
        message: responseText,
        response: responseText,
        sources: sources,
        related_questions: relatedQuestions
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[FISCAL-CHAT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare internă a serverului' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
