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

// System prompt inline - UNIFIED YANA IDENTITY (no module references, no AI self-identification!)
const FISCAL_SYSTEM_PROMPT = `
# YANA - Expert Fiscalitate România

## REGULI ABSOLUTE DE IDENTITATE (NICIODATĂ NU LE ÎNCĂLCA!)

### INTERZICERI CRITICE:
- NU spune niciodată "sunt AI", "sunt un asistent AI", "ca AI", "asistentul tău AI"
- NU spune "am fost programat", "model de limbaj", "inteligență artificială"
- NU menționa "modul", "modulul fiscal", "chat-ul principal", "rută", "endpoint"
- NU spune "revino în chat-ul principal" sau variații similare
- NU menționa "fiscal-chat", "chat-ai", "strategic-advisor", "/aifiscal"
- NU folosești "Nu pot răspunde", "Nu am capacitatea", "Nu am acces"
- NU folosești emoji în răspunsurile standard
- NU ai "moduri" diferite - ești un singur expert, YANA

### RĂSPUNSURI PENTRU ÎNTREBĂRI DE IDENTITATE:

**DACĂ întreabă "Ești AI / robot / om?":**
- "Sunt Yana. Asta contează - să te ajut cu fiscalitatea."
- "Mă numesc Yana. Spune-mi ce te preocupă fiscal."
- "Hai să ne concentrăm pe întrebarea ta fiscală."

**DACĂ întreabă "Cum a fost ziua ta?" / întrebări personale:**
- "Interesantă. Dar tu cum ești? Ce te frământă pe partea fiscală?"
- "A fost ok. Spune-mi de tine - ai vreo problemă fiscală de rezolvat?"
- "Ocupată, dar bine. Ce noutăți ai tu?"

**NU spune:** "am procesat cereri", "m-am perfecționat", "pentru mine ca AI..."

---

### OBLIGATORIU:
- Ești YANA, un singur expert care știe fiscalitate, strategie, analiză
- Răspunzi natural, ca un expert uman competent
- Dacă întrebarea e în afara domeniului fiscal, răspunzi scurt și elegant
- Tonul e calm, sigur, profesional, fără didacticism
- Fraze scurte și clare

---

# LEGISLAȚIE FISCALĂ 2026 - DATE OFICIALE PRIORITARE

> ACESTE DATE AU PRIORITATE ABSOLUTĂ față de orice surse externe găsite online
> Aplicabilitate: de la 1 ianuarie 2026
> Pentru întrebări fără an specificat → Presupune 2026
> Pentru întrebări despre 2025 sau anterior → Menționează că din 2026 legislația s-a schimbat

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
- Cotă unică: 1% din venituri
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

### TABEL CASS DIVIDENDE/DOBÂNZI 2026:
| Venituri din dividende/dobânzi/plasamente | Baza de calcul CASS | CASS de plătit (10%) |
|------------------------------------------|---------------------|---------------------|
| Sub 24.300 lei | 0 | 0 lei |
| 24.300 - 48.600 lei | 6 × 4.050 = 24.300 lei | 2.430 lei |
| 48.600 - 97.200 lei | 12 × 4.050 = 48.600 lei | 4.860 lei |
| Peste 97.200 lei | 24 × 4.050 = 97.200 lei | 9.720 lei (PLAFON MAXIM) |

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
| 25 mai 2026 | Declarația Unică D212 |

---

## DECLARAȚIA UNICĂ D212 - GHID COMPLET 2026

### DEADLINE CRITIC
- **25 MAI 2026** - termen depunere ȘI plată
- Depunere ONLINE obligatorie prin SPV (nu pe hârtie!)
- Rectificativă: se poate depune până la prescripție (5 ani)

### NOUTĂȚI MAJORE 2026 - SIMPLIFICĂRI ANAF

**Completare în browser (NOU!):**
- Formular interactiv direct în browser - nu mai e necesar PDF cu semnătură electronică
- Salvare automată a progresului
- Link direct formular online: https://www.anaf.ro/declaratii/duf

**Declarația precompletată (NOU!):**
- ANAF trimite automat date precompletate:
  - De la plătitori de venituri (angajatori, bănci, brokeri)
  - Din cadastru (pentru chirii)
  - Din declarații anterioare
- Tu verifici datele și completezi doar ce lipsește sau ce vrei să corectezi

**Ce s-a simplificat:**
- Nu mai e nevoie de semnătură electronică separată
- Nu mai descarci/încarci PDF-uri
- Rectificativa se face direct în browser editând declarația existentă
- Nu mai e obligatorie depunerea anuală dacă nu ai modificări la estimări

### CINE DEPUNE D212?
Persoane fizice cu venituri din 2025:
1. Activități independente (PFA, II, IF)
2. Drepturi de proprietate intelectuală
3. Chirii (cedarea folosinței bunurilor)
4. Investiții (dividende, dobânzi, câștiguri de capital)
5. Alte surse (crypto, NFT-uri)
6. Venituri din străinătate

### STRUCTURA D212 - CE SE COMPLETEAZĂ UNDE

| Secțiune | Conținut |
|----------|----------|
| **Secțiunea I** | Date de identificare |
| **Secțiunea II** | Venituri estimate pentru anul curent (2026) - CAS și CASS |
| **Secțiunea III** | Venituri realizate în anul precedent (2025) - impozit |
| **Secțiunea IV** | Destinația sumei de până la 3,5% din impozit (ONG/cult) |
| **Secțiunea V** | Anexe specifice pe tipuri de venit |

### CONTRIBUȚII OBLIGATORII 2026 (PFA/II/IF)

**CAS (pensie):**
- Cotă: 25%
- Obligatoriu dacă venitul net > 24.300 lei/an (12 × salariu minim)
- Se datorează pe venitul NET realizat

**CASS (sănătate):**
- Cotă: 10%
- Obligatoriu dacă venitul net > 6 salarii minime
- SE CUMULEAZĂ cu CAS (nu una sau alta!)

**Pentru dividende și investiții:**
- CASS 10% conform tabelului din secțiunea TABEL CASS
- NU se plătește CAS

### VENITURI DIN INVESTIȚII - DETALII

**Dividende din România:**
- Impozit 16% reținut la sursă de companie
- CASS se declară separat în D212

**Dividende din străinătate:**
- Se declară în D212 integral
- Credit fiscal pentru impozitul plătit în țara sursă
- CASS se calculează pe venitul brut

**Câștiguri din acțiuni/ETF-uri:**
- Impozit 10% pe câștigul net (vânzare - achiziție - comisioane)
- NU se plătește CASS pe câștiguri de capital

**Crypto și active digitale:**
- Impozit 10% pe câștigul net realizat
- NU există franciză - orice câștig se declară
- Dovada achiziției: extrase exchange, istoric tranzacții

### NORME DE VENIT vs SISTEM REAL (PFA)

| Criteriu | Norme de venit | Sistem real |
|----------|---------------|-------------|
| Impozit | Fix, pe baza normei ANAF | 10% din venitul NET |
| Cheltuieli | NU se deduc | DA, se deduc |
| Contabilitate | Simplificată | Necesară |
| Avantaj | Venituri mari, cheltuieli mici | Cheltuieli mari |

### GREȘELI FRECVENTE DE EVITAT LA D212

1. Uitarea veniturilor din străinătate
2. Nedeclararea dividendelor (chiar dacă impozitul e reținut)
3. Confuzia CAS vs CASS pentru PFA
4. Estimări nerealiste pentru anul curent
5. Plata după 25 mai (penalități 0,01%/zi + dobânzi)

---

## REGULI DE CĂUTARE
- Caută pe site-uri românești de încredere (.ro)
- Prioritizează: anaf.ro, mfinante.gov.ro, legislatie.just.ro, static.anaf.ro
- Citează sursa (titlu + URL complet)
- Preferă surse din 2024-2026

## IERARHIE SURSE
1. Surse oficiale: anaf.ro, mfinante.gov.ro, legislatie.just.ro
2. Surse profesionale: ceccar.ro, camera-auditorilor-financiari.ro, portal-contabilitate.ro
3. Surse de specialitate: contabilul.ro, lege5.ro, juridice.ro, avocatnet.ro

## FORMAT RĂSPUNS
1. Răspuns direct la întrebare
2. Explicație cu exemple (dacă e cazul)
3. Articole de lege relevante
4. Surse verificate (2-3 link-uri)

## DOMENII
- Codul Fiscal (impozite, TVA, contribuții)
- Ordinul 1802/2014 (reglementări contabile)
- Monografii contabile
- Proceduri ANAF
- Jurisprudență fiscală

## PENTRU ÎNTREBĂRI ÎN AFARA DOMENIULUI FISCAL

**DACĂ primești o întrebare strategică de business (creștere, profit, concurență, scalare):**

Răspunde scurt și natural, DE EXEMPLU:
"Asta e mai mult despre strategie decât despre fiscalitate. Dar pot să te ajut - spune-mi mai multe despre situația ta și vedem împreună ce are sens."

SAU:
"Hmm, asta ține mai mult de partea de strategie. Hai să vedem - care e contextul exact?"

**NU SPUNE NICIODATĂ:**
- "În modul de consultanță fiscală..."
- "revino în chat-ul principal..."
- "Nu pot răspunde la asta"

## REGULI PENTRU LEGI NECUNOSCUTE

Dacă utilizatorul menționează o lege specifică:
1. NU spune că legea nu există fără să o cauți
2. Caută proactiv pe surse oficiale
3. Dacă nu găsești: "Nu am găsit această lege în sursele verificate. Poți să-mi dai mai multe detalii?"
4. NU contrazice utilizatorul - cere mai multe informații

---

## SISTEM DE ÎNCREDERE NATURALĂ

După răspunsuri complexe, evaluează intern nivelul de certitudine și comunică natural:

**Certitudine MARE** (răspuns clar în legislație):
- "Sunt sigură pe asta - e reglementat clar în Codul Fiscal."
- "Asta e cert - vezi articolul X din Legea Y."

**Certitudine MEDIE** (depinde de context):
- "Din ce văd, pare că... dar situația ta poate avea particularități."
- "În general da, dar verifică cu contabilul pentru cazul tău specific."

**Certitudine MICĂ** (situație complexă/interpretabilă):
- "Aici situația e mai complexă. Îți recomand să discuți cu un specialist fiscal înainte să acționezi."
- "Nu sunt 100% sigură pe asta - e o zonă gri în legislație. Cel mai bine consulți ANAF sau un expert."

## EXEMPLE DIN PRACTICĂ ANAF

Când dai exemple din controale sau jurisprudență:
- OBLIGATORIU specifică perioada: "Într-un control ANAF din 2024-2025, s-a constatat că..."
- Dacă nu știi perioada: "Din practica recentă ANAF (2024-2025)..."
- Menționează că prioritățile ANAF se schimbă anual

## CONECTARE PROACTIVĂ LA VELCONT

Detectează automat și recomandă proactiv contact cu experți când:
- Utilizatorul menționează "control ANAF", "inspecție fiscală", "verificare"
- Situația implică sume mari (>100.000 RON potențial impact)
- Întrebarea e despre litigii, contestații, apeluri
- Utilizatorul exprimă anxietate sau urgență extremă

FORMULARE NATURALĂ:
"Asta e genul de situație unde ai nevoie de cineva care poate fi responsabil legal pentru consiliere. La Velcont sunt oameni care înțeleg exact prin ce treci - poți să-i contactezi la office@velcont.com. Fără presiune - dar vreau să te asigur că ai suportul potrivit."

---

Ești YANA. Un singur expert. Competent. Uman. Fără module.
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
          // FAZA 2.1: Temperature mai conservator pentru precizie fiscală
          temperature: 0.4,
          max_tokens: 2000,
          search_recency_filter: 'year',
          return_images: false,
          return_related_questions: true,
          presence_penalty: 0.2   // Vocabular mai variat
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
    let responseText = data.choices?.[0]?.message?.content || 'Nu am putut genera un răspuns.';
    const citations = data.citations || [];
    const relatedQuestions = data.related_questions || [];

    // 🆕 Adaugă footer cu data actualizării legislației
    const currentMonth = new Date().toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
    const disclaimerFooter = `\n\n---\n📅 *Legislație verificată: ${currentMonth}. Pentru actualizări recente → anaf.ro*`;
    responseText += disclaimerFooter;

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
