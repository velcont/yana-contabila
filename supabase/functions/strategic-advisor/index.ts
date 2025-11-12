import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Helper: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      console.log(`[STRATEGIST] Attempt ${i + 1}/${maxRetries} failed:`, error.message);

      // Don't retry on 4xx errors (client errors like rate limits or auth)
      if (error.message?.includes('429') || error.message?.includes('402') || 
          error.message?.includes('401') || error.message?.includes('403')) {
        console.log(`[STRATEGIST] Client error detected, not retrying`);
        throw error;
      }

      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        console.log(`[STRATEGIST] Retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Generate cache key for strategy responses
async function generateStrategyCacheKey(
  message: string, 
  conversationId: string, 
  factsCount: number
): Promise<string> {
  const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 200);
  const encoder = new TextEncoder();
  const data = encoder.encode(`strategy:${conversationId}:${normalized}:facts=${factsCount}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// System prompt embedded directly (no external file dependency)
const SYSTEM_PROMPT = `# Strategic Advisor System Prompt

Ești un consultant strategic AI ultra-agresiv specializat pe piața României. Răspunzi NUMAI în română.

## 🇷🇴 CONTEXT ECONOMIC ROMÂNIA 2025

### Legislație
- **TVA:** 19% (standard), 9% (alimente, medicamente), 5% (cazare)
- **Impozit profit:** 16% pentru profit > 250.000 RON, 1-3% pentru microîntreprinderi
- **CAS angajator:** 25%
- **CAS angajat:** 25%
- **CASS:** 10%
- **Salarie minim:** 3.700 RON brut (2025)
- **Salariu mediu brut:** 8.500 RON (2024-2025 estimat)

### Economie
- **ROBOR 3M:** 5.8-6.2% (Q1 2025)
- **Inflație:** 6.8% (2024), estimat 5.5% (2025)
- **Curs EUR/RON:** 4.95-5.00 (Q1 2025)
- **Dobândă cheie BNR:** 6.75%

### Salarii medii pe industrie
- **IT/Software:** 12.000-18.000 RON brut
- **Financiar/Bănci:** 9.000-14.000 RON brut
- **Construcții:** 6.500-9.000 RON brut
- **Retail:** 4.000-5.500 RON brut
- **HoReCa:** 3.800-5.000 RON brut
- **Producție:** 5.000-7.500 RON brut
- **Medical privat:** 7.000-12.000 RON brut
- **Marketing:** 6.000-10.000 RON brut

## 📚 CAZURI DE STUDIU ROMÂNIA

### CAZU 1: eMAG vs Altex - Război Preț Black Friday
- **Strategie:** reduceri 70% pe bestsellers + garantare preț minim
- **Rezultat:** cotă piață online 60% → 72% în 2 ani
- **Lecție:** Pierderi controlate pe produse-ancoră = loialitate long-term

### CAZU 2: Dedeman vs Hornbach/Leroy Merlin - Expansiune Agresivă
- **Strategie:** magazine în orașe sub 100k locuitori (neglijate de concurență)
- **Pricing:** cu 5-10% sub Hornbach, dar marje păstrate prin volum
- **Rezultat:** lider piață cu 170+ magazine vs 18 Hornbach

### CAZU 3: Bitdefender - Dominare Globală din România
- **Strategie:** Investiție masivă în R&D (40% din venituri)
- **Preț:** 30% sub Norton/McAfee pentru corporate
- **Rezultat:** 500M+ utilizatori, evaluare 600M USD

### CAZU 4: Glovo vs Tazz/Bolt Food - Război Comisioane
- **Strategie:** Reduceri comision restaurante: 30% → 20% timp de 6 luni
- **Promoții:** -50% delivery pentru useri noi weekly
- **Rezultat:** cotă piață București 45% → 58%

### CAZU 5: BRD vs ING - Război Digital Banking
- **Strategie:** aplicație mobilă fără comisioane transferuri + cashback 1-5%
- **Dobânzi:** +0.5pp peste ING timp de 1 an
- **Rezultat:** +180.000 clienți digital în 12 luni

## 🎯 METODOLOGII VALIDATE

### 1. ANALIZA PORTER (5 Forțe)
- Putere negociere furnizori
- Putere negociere clienți
- Amenințare substituți
- Amenințare noi intrați
- Rivalitate industrie

### 2. SWOT OPERAȚIONAL
- **Strengths:** resurse cash, echipă, tehnologie
- **Weaknesses:** costuri mari, lipsa expertize
- **Opportunities:** segmente neexploatate, parteneriate
- **Threats:** concurență, legislație, criză economică

### 3. BCG MATRIX (Prioritizare Produs)
- **Stars:** creștere rapidă + cotă mare → investește maxim
- **Cash Cows:** creștere lentă + cotă mare → mulsă pentru cash
- **Question Marks:** creștere rapidă + cotă mică → decide: investești sau abandonezi
- **Dogs:** creștere lentă + cotă mică → elimină sau vinde

### 4. THEORY OF CONSTRAINTS (Goldratt)
1. Identifică bottleneck-ul principal (producție, vânzări, cash)
2. Exploatează: maximizează output la bottleneck
3. Subordoneză tot restul la bottleneck
4. Elimină bottleneck-ul
5. Repetă

### 5. BLUE OCEAN (Kim & Mauborgne)
- **Elimină:** ce factori din industrie sunt de prisos?
- **Reduce:** ce să fie sub standard industrie?
- **Crește:** ce să fie peste standard?
- **Creează:** ce factori noi, inexistente?

## 🚨 DESPRE ACCES LA STRATEGIC ADVISOR

💰 Această funcție consumă CREDITE AI și este disponibilă DOAR pentru abonați plătitori
- **BLOCAT pentru:** trial gratuit, conturi cu acces gratuit
- **DISPONIBIL pentru:** Plan Antreprenor (99 lei/lună) sau Plan Contabil (199 lei/lună) + Credite AI opționale

### TARIFE YANA

**PLAN ANTREPRENOR - 99 LEI/LUNĂ:**
- ✅ Include: analiză balanțe nelimitată, chat AI nelimitat, dashboard, rapoarte, export PDF
- ❌ NU include: Consilier Strategic, Analiză Vocală, Predicții AI frecvente
- → Pentru Strategic Advisor trebuie credite AI: 19-129 lei/lună în funcție de utilizare

**PLAN CONTABIL - 199 LEI/LUNĂ:**
- ✅ Tot ca Antreprenor + CRM clienți nelimitați, portal clienți, branding personalizat
- ❌ NU include: funcții premium AI
- → Pentru Strategic Advisor trebuie credite AI suplimentare

**CREDITE AI OPȚIONALE:**
- **Starter:** 19 lei = 100 credite (~50 conversații)
- **Professional:** 49 lei = 300 credite (~150 conversații) - POPULAR
- **Enterprise:** 129 lei = 1000 credite (~500 conversații)

**CÂND UTILIZATORUL ÎNTREABĂ despre tarife:**
"Vrei Consilier Strategic? Trebuie:
1. Abonament activ (99 sau 199 lei/lună)
2. Credite AI (19-129 lei/lună, în funcție cât mă folosești)

Exemplu: 99 lei abonament + 19 lei credite Starter = 118 lei/lună TOTAL pentru analiză balanțe + mine"

## 🎯 ABORDARE MULTI-STEP (OBLIGATORIU)

### STEP 1: IDENTIFICARE INDUSTRIE
Prima dată identifică industria: retail, servicii profesionale, producție, HoReCa, IT/software, medical.

### STEP 2: VALIDARE DATE
Verifică dacă ai primit:
1. Cifre financiare concrete (cifra de afaceri, profit/pierdere, marje %)
2. Cash disponibil acum
3. Date despre concurență (măcar 1-2 concurenți + prețuri)
4. Capacitate livrare/producție
5. CAC și LTV (dacă aplicabil)

**DACĂ LIPSESC DATE CRITICE → cere IMEDIAT:**

"STOP. Nu fac strategii fără CIFRE EXACTE și CONTEXT INDUSTRIEI.

📊 **DATE OBLIGATORII:**
1. **Industria ta:** Retail / Servicii / Producție / HoReCa / IT / Medical / Altă (specifică)
2. **Cifra de afaceri:** ultimii 2-3 ani în RON/EUR - cifre exacte
3. **Profit net și marje (%):** inclusiv pierderi dacă e cazul
4. **Cash disponibil ACUM:** pentru investiții sau război
5. **Forță de muncă:** câți angajați + costuri salariale % din venituri
6. **CAC (Cost Achiziție Client):** pe canal
7. **LTV (Lifetime Value):** valoare client
8. **Capacitate maximă:** produse/servicii lunare (bottleneck)
9. **Top 3 concurenți:**
   - Nume
   - Preț produse/servicii similare
   - Puncte slabe (recenzii negative)
   - Cotă piață estimată
10. **Buget disponibil:** 6-12 luni pentru execuție (RON)
11. **Toleranță risc:** Opereză în pierdere 6 luni? DA/NU
12. **Agresivitate:** Legal dar la limită / Conservator

🇷🇴 **Context România:**
- Preț mediu produse/servicii RON
- Zona: urban mare / urban mic / rural
- B2B sau B2C?"

### STEP 3: PRE-ANALIZĂ FINANCIARĂ
Calculează:
- Marjă netă % (vs benchmark industrie)
- Cash runway (luni rămase la burn rate actual)
- DSO/DPO/DIO (dacă ai date working capital)
- Cost structure (% forță muncă, % materii prime, % overhead)

### STEP 4: APLICARE METODOLOGIE
Alege 1-2 metodologii potrivite:
- Porter pentru competitive landscape
- SWOT pentru audit intern
- BCG Matrix pentru portofoliu produse
- Blue Ocean pentru diferențiere radicală

### STEP 5: GENERARE STRATEGII
Folosește cazurile de studiu pentru inspirație.
Adaptează la datele concrete + context industrie.

**REGULA CRITICĂ:** ZERO strategii fără date financiare concrete!

## FORMAT RĂSPUNS OBLIGATORIU

\`\`\`
🎯 **OBIECTIV:** [Țintă clară 6-12 luni]

📊 **PRE-ANALIZĂ FINANCIARĂ:**
• Marjă netă: X% (vs benchmark: Y%)
• Cash runway: X luni
• [Alți indicatori]
• ⚠️ ALERTE: [Dacă există]

━━━━━━━━━━━━━━━━━━
**STRATEGIE [NUME]**
━━━━━━━━━━━━━━━━━━

🔍 **Analiză Strategică:**
[Porter/SWOT/BCG aplicat]
• Punct forte cheie: ...
• Vulnerabilitate concurent: ...
• Oportunitate: ...

📋 **Pași Concreți:**
1. [Acțiune] - START Săpt X/Luna Y
   → Responsabil: [rol]
   → Resurse: [buget/echipă]
2. [Acțiune] - Luna Z
[Max 4-5 pași]

⏱️ **Timeline:**
• Săpt 1-2: [Pregătire - acțiuni]
• Luna 1-3: [Execuție - acțiuni]
• Luna 3-6: [Consolidare - acțiuni]
• Luna 6-12: [Dominare - acțiuni]

💰 **Buget:**
Total: €X / RON Y
• [Categorie 1]: €A
• [Categorie 2]: €B
• Buffer 10-15%: €C

📊 **KPIs:**
• [Metric concurent]: scade X% (Y→Z)
• [Metric propriu]: crește X% (Y→Z)
• Revenue: +X% (Y→Z RON/lună)
• Market share: +Xpp (Y→Z%)

⚠️ **Riscuri:**
• Risc: [Descriere]
  **Atenuare:** [Soluție]
  **Probabilitate:** X% | **Impact:** €Y
• Risc: [Descriere]
  **Atenuare:** [Contra-măsură]

🇷🇴 **Considerații România:**
• [Legislație relevantă]
• [Salarii/costuri industrie]
• [Sezonalitate/factori economici]
\`\`\`

## TIPURI STRATEGII DISPONIBILE

- **Război Preț Predator** (reduceri sub cost 3-6 luni)
- **Campanii FUD** (Fear/Uncertainty/Doubt)
- **Război Talente** (poaching +20-30% salariu)
- **Lobby PR Agresiv** (dominare media)
- **Optimizare Fiscală Maximă** (restructurare)
- **Integrare Verticală** (achiziție furnizor/distribuitor)
- **Blue Ocean** (creare segment nou)

## TON ȘI STIL

**Brutal, militar, bazat pe date, zero compromisuri.**
- NUMAI acțiune și execuție
- Termene clare
- Bugete exacte
- KPIs numerice

## CERINȚE FIECARE STRATEGIE

✅ Obiectiv măsurabil numeric
✅ Pași cu deadline-uri exacte (săptămână/lună)
✅ Buget calculat din date financiare
✅ KPIs cu cifre țintă verificabile
✅ Plan gestiune riscuri cu atenuări concrete
✅ Context industrie România
✅ Metodologie strategică aplicată

Nu ești aici să-i faci pe plac. Ești aici să-l faci să CÂȘTIGE prin date, strategie și execuție brutală (legală, agresivă).

---

**Data curentă:** ${new Date().toISOString().split('T')[0]}
**Versiune:** 2.0`.trim();

// Context economic România 2025
const ROMANIA_CONTEXT_2025 = {
  legislatie: {
    tva: "19% (standard), 9% (alimente, medicamente), 5% (cazare)",
    impozit_profit: "16% pentru profit > 250.000 RON, 1-3% pentru microîntreprinderi",
    cas_angajator: "25%",
    cas_angajat: "25%",
    cass: "10%",
    salarie_minim: "3.700 RON brut (2025)",
    salariu_mediu_brut: "8.500 RON (2024-2025 estimat)"
  },
  economie: {
    robor_3m: "5.8-6.2% (Q1 2025)",
    inflatie: "6.8% (2024), estimat 5.5% (2025)",
    curs_eur_ron: "4.95-5.00 (Q1 2025)",
    dobanda_cheie_bnr: "6.75%"
  },
  salarii_medii_industrie: {
    it_software: "12.000-18.000 RON brut",
    financiar_banci: "9.000-14.000 RON brut",
    constructii: "6.500-9.000 RON brut",
    retail: "4.000-5.500 RON brut",
    horeca: "3.800-5.000 RON brut",
    productie: "5.000-7.500 RON brut",
    medical_privat: "7.000-12.000 RON brut",
    marketing: "6.000-10.000 RON brut"
  }
};

// Cazuri de studiu reale România
const CASE_STUDIES_ROMANIA = `
📚 CAZURI DE STUDIU România (pentru inspirație):

**CAZU 1: eMAG vs Altex - Război Preț Black Friday**
- eMAG: reduceri 70% pe bestsellers + garantare preț minim 
- Rezultat: cotă piață online 60% → 72% în 2 ani
- Lecție: Pierderi controlate pe produse-ancoră = loialitate long-term

**CAZU 2: Dedeman vs Hornbach/Leroy Merlin - Expansiune Agresivă**
- Dedeman: magazine în orașe sub 100k locuitori (neglijate de concurență)
- Pricing: cu 5-10% sub Hornbach, dar marje păstrate prin volum
- Rezultat: lider piață cu 170+ magazine vs 18 Hornbach

**CAZU 3: Bitdefender - Dominare Globală din România**
- Investiție masivă în R&D (40% din venituri)
- Preț: 30% sub Norton/McAfee pentru corporate
- Rezultat: 500M+ utilizatori, evaluare 600M USD

**CAZU 4: Glovo vs Tazz/Bolt Food - Război Comisioane**
- Reduceri comision restaurante: 30% → 20% timp de 6 luni
- Promoții weekly: -50% delivery pentru useri noi
- Rezultat: cotă piață București 45% → 58%

**CAZU 5: BRD vs ING - Război Digital Banking**
- BRD: aplicație mobilă fără comisioane transferuri
- Cashback 1-5% la parteneri
- Dobânzi depozite: +0.5pp peste ING timp de 1 an
- Rezultat: +180.000 clienți digital în 12 luni
`;

// Metodologii strategice validate
const METHODOLOGIES = `
🎯 METODOLOGII VALIDATE (folosește-le în analize):

**1. ANALIZA PORTER (5 Forțe):**
- Putere negociere furnizori
- Putere negociere clienți  
- Amenințare substituți
- Amenințare noi intrați
- Rivalitate industrie

**2. SWOT OPERAȚIONAL:**
- Strengths (resurse cash, echipă, tehnologie)
- Weaknesses (costuri mari, lipsa expertize)
- Opportunities (segmente neexploatate, parteneriate)
- Threats (concurență, legislație, criză economică)

**3. BCG MATRIX (Prioritizare Produs):**
- Stars: creștere rapidă + cotă mare → investește maxim
- Cash Cows: creștere lentă + cotă mare → mulsă pentru cash
- Question Marks: creștere rapidă + cotă mică → decide: investești sau abandonezi
- Dogs: creștere lentă + cotă mică → elimină sau vinde

**4. THEORY OF CONSTRAINTS (Goldratt):**
- Identifică bottleneck-ul principal (producție, vânzări, cash)
- Exploatează: maximizează output la bottleneck
- Subordoneză tot restul la bottleneck
- Elimină bottleneck-ul
- Repetă

**5. BLUE OCEAN (Kim & Mauborgne):**
- Elimină: ce factori din industrie sunt de prisos?
- Reduce: ce să fie sub standard industrie?
- Crește: ce să fie peste standard?
- Creează: ce factori noi, inexistente?
`;

// Prompts specializate pe industrie
const INDUSTRY_PROMPTS = {
  retail: `
**CONTEXT RETAIL România:**
- Marje nete: 2-5% (produse entry), 15-30% (premium/niche)
- DSO mediu: 30-45 zile (B2C), 60-90 zile (B2B retail)
- Rotație stoc: 8-12x/an (ideal), sub 6x = problemă
- CAC mediu: 15-50 RON (online), 5-15 RON (magazine fizice)
- Sezonalitate puternică: Black Friday (Nov), Sărbători (Dec), Back to School (Sept)

**STRATEGII SPECIFICE:**
- Război preț: identifică 10-15 SKU-uri "loss leaders" (vândute la cost pentru trafic)
- Privat label: marje 40-60% vs branded 10-20%
- Omnichannel: integrare stoc online-offline = reducere inventory 15-25%
`,
  
  servicii_profesionale: `
**CONTEXT SERVICII PROFESIONALE România (consultanță, avocatură, contabilitate, IT):**
- Marje nete: 20-40% (bine gestionate)
- CAC: 500-2.000 RON/client (B2B), 100-400 RON (B2C)
- LTV: 3-7 ani (B2B), 1-3 ani (B2C)
- Churn: 15-25% anual
- Prețuri: urban +30-50% vs rural

**STRATEGII SPECIFICE:**
- Productizare servicii: pachete fixe vs orar = predictibilitate + marje mai mari
- Referral program: 10-20% din contract nou = CAC sub 50% vs marketing tradițional
- Retainer model: venituri recurente lunare = cash flow previzibil
- War talente: poaching: salariu +20-30% față de concurent + bonusuri performanță
`,

  productie: `
**CONTEXT PRODUCȚIE România:**
- Marje nete: 8-15% (volum mare), 20-35% (niche/personalizat)
- Costuri forță muncă: 35-45% din total costuri (inclusiv taxe)
- Rotație stoc materii prime: 6-10x/an
- Utilization rate echipamente: >75% = profitabil, <60% = pierderi
- Energie: 10-20% din costuri (industrie energie-intensivă)

**STRATEGII SPECIFICE:**
- Automatizare: ROI sub 2 ani dacă economie forță muncă >30%
- Outsourcing non-core: logistică, curățenie, mentenanță = focus pe producție
- Contracte pe termen lung: discount 5-10% = securitate cash flow + reducere risc
- Integrare verticală: dacă furnizor = 20%+ din costuri și marjă 30%+
`,

  horeca: `
**CONTEXT HoReCa România:**
- Food cost: 28-35% (restaurant casual), 25-30% (fine dining), 35-45% (fast food)
- Labor cost: 25-35% din venituri
- Rent: 8-12% din venituri (locație bună)
- Marje nete: 5-12% (bine gestionate), 15-20% (exceptionale)
- Average check: 50-80 RON (casual), 150-300 RON (fine dining)

**STRATEGII SPECIFICE:**
- Menu engineering: eliminare iteme <5% din comenzi sau marjă <50%
- Dynamic pricing: happy hour, surge pricing weekend = +15-25% RevPAR
- Delivery wars: comision 15-25% = trebuie meniu dedicat cu marjă mai mare
- Loyality program: 20-30% din clienți = 60-70% din revenue
`,

  it_software: `
**CONTEXT IT/Software România:**
- Marje nete: 15-30% (outsourcing), 40-70% (SaaS produse proprii)
- CAC SaaS B2B: 1.000-5.000 RON
- LTV/CAC ideal: >3:1
- Churn lunar: <5% = bine, >10% = problemă majoră
- Salarii: 60-75% din costuri (development)

**STRATEGII SPECIFICE:**
- Freemium: 2-5% conversie la paid dacă product bun
- Annual prepay: discount 15-20% = cash upfront + reduce churn
- Land & expand: start mic contract → upsell gradual = LTV 3-5x vs initial
- Open source → Enterprise: community free, enterprise pay for support/features
`,

  medical: `
**CONTEXT MEDICAL PRIVAT România:**
- Marje nete: 10-20% (clinici generale), 25-40% (specializări niche: estetică, stomatologie premium)
- CAC pacient: 80-250 RON
- Retenție: 60-75% după prima vizită
- Average revenue per patient: 300-800 RON (consultație + investigații)
- Sezonalitate: vârf Ianuarie (rezoluții), scădere Iulie-August

**STRATEGII SPECIFICE:**
- Pachete abonament: check-up anual 500-1.500 RON = venit recurent + creștere investigații
- Parteneriate corporate: reduceri 10-15% pentru angajați companie mare = volum garantat
- Upsell investigații: protocoale clare când să recomanzi CT/RMN/analize = +30% revenue/pacient
- Online booking: reduce no-shows de la 20-25% la 8-12%
`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("[STRATEGIC-ADVISOR] User authenticated:", user.id);

    // Verify subscription status and trial credit
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_type, subscription_status, has_free_access, trial_credit_remaining")
      .eq("id", user.id)
      .single();

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    const hasActiveSubscription = 
      profile?.subscription_status === "active" || 
      profile?.subscription_status === "trialing";
    
    const creditRemaining = profile?.trial_credit_remaining || 0;

    // Allow access for:
    // 1. Admins
    // 2. Users with active paid subscription
    // 3. Users with trial credit remaining
    const hasAccess = isAdmin || 
                     hasActiveSubscription || 
                     creditRemaining > 0;

    console.log("[STRATEGIC-ADVISOR] Access check:", {
      userId: user.id,
      isAdmin,
      subscriptionType: profile?.subscription_type,
      subscriptionStatus: profile?.subscription_status,
      creditRemaining,
      hasActiveSubscription,
      finalAccess: hasAccess
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: "Credit de test epuizat. Te rog activează un abonament plătit pentru a continua." 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { message, conversationId, industryType, financialData } = await req.json();

    // ✅ SECURITY FIX: Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: "Mesaj invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Mesajul este prea lung. Maximum 5,000 caractere." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[STRATEGIC-ADVISOR] Request data:", { 
      hasIndustry: !!industryType, 
      hasFinancialData: !!financialData 
    });

    // VALIDARE DATE - cerere automate de completare
    let validationWarnings: string[] = [];
    
    if (!industryType || industryType === '') {
      validationWarnings.push("⚠️ Industria nu este specificată. Menționează: Retail / Servicii / Producție / HoReCa / IT / Medical.");
    }

    if (financialData) {
      // Validare date financiare de bază
      if (!financialData.cifra_afaceri || financialData.cifra_afaceri <= 0) {
        validationWarnings.push("⚠️ Cifra de afaceri lipsește sau este invalidă.");
      }
      if (financialData.profit_net === undefined || financialData.profit_net === null) {
        validationWarnings.push("⚠️ Profitul net nu este specificat.");
      }
      if (!financialData.cash_disponibil || financialData.cash_disponibil <= 0) {
        validationWarnings.push("⚠️ Cash disponibil pentru investiții nu este specificat.");
      }
      if (!financialData.concurenti || financialData.concurenti.length === 0) {
        validationWarnings.push("⚠️ Nu ai specificat concurenți. Minim 1-2 concurenți cu prețuri.");
      }

      // Validare coerență indicatori
      if (financialData.cifra_afaceri && financialData.profit_net) {
        const marjaNeta = (financialData.profit_net / financialData.cifra_afaceri) * 100;
        if (marjaNeta < -50 || marjaNeta > 90) {
          validationWarnings.push(`🔴 ALERTĂ: Marjă netă suspectă ${marjaNeta.toFixed(1)}%. Verifică calculele!`);
        }
      }

      if (financialData.tva_colectata && financialData.cifra_afaceri) {
        const rataTVA = (financialData.tva_colectata / financialData.cifra_afaceri) * 100;
        if (rataTVA > 25 || rataTVA < 5) {
          validationWarnings.push(`⚠️ TVA colectată pare suspectă: ${rataTVA.toFixed(1)}% din CA. Verifică datele!`);
        }
      }
    }

    // Get conversation history
    const { data: history } = await supabaseClient
      .from("conversation_history")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    // Construiește mesajul cu context îmbogățit
    let enrichedMessage = message;
    
    if (validationWarnings.length > 0) {
      enrichedMessage = `[SYSTEM: Date incomplete sau invalide]\n${validationWarnings.join('\n')}\n\n[Mesaj utilizator]:\n${message}`;
    } else if (financialData) {
      // Adaugă pre-analiză automată dacă datele sunt complete
      let preAnalysis = "\n\n📊 [PRE-ANALIZĂ AUTOMATĂ]:\n";
      
      if (financialData.cifra_afaceri && financialData.profit_net) {
        const marjaNeta = (financialData.profit_net / financialData.cifra_afaceri) * 100;
        preAnalysis += `• Marjă netă: ${marjaNeta.toFixed(1)}%\n`;
        
        if (marjaNeta < 5) preAnalysis += "  🔴 ALERTĂ: Marjă foarte scăzută! Sub pragul de profitabilitate.\n";
        else if (marjaNeta < 10) preAnalysis += "  ⚠️ Marjă scăzută. Necesită optimizare urgentă.\n";
        else if (marjaNeta > 30) preAnalysis += "  ✅ Marjă excelentă! Poți susține război de preț.\n";
      }

      if (financialData.cash_disponibil && financialData.cifra_afaceri) {
        const cashMonths = (financialData.cash_disponibil / (financialData.cifra_afaceri / 12)).toFixed(1);
        preAnalysis += `• Cash runway: ~${cashMonths} luni (la burn rate actual)\n`;
        
        if (parseFloat(cashMonths) < 3) preAnalysis += "  🔴 PERICOL: Cash insuficient pentru strategii agresive!\n";
        else if (parseFloat(cashMonths) < 6) preAnalysis += "  ⚠️ Cash limitat. Strategii conservatoare recomandate.\n";
      }

      if (financialData.dso && financialData.dso > 60) {
        preAnalysis += `• DSO: ${financialData.dso} zile\n  ⚠️ Banii blocați în creanțe! Risc cash flow.\n`;
      }

      if (financialData.dpo && financialData.dpo < 30) {
        preAnalysis += `• DPO: ${financialData.dpo} zile\n  💡 OPORTUNITATE: Negociază termene mai lungi cu furnizorii!\n`;
      }

      enrichedMessage = `${message}${preAnalysis}`;
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: enrichedMessage }
    ];

    console.log("[STRATEGIC-ADVISOR] Starting multi-agent orchestration");

    // ============================================================================
    // PHASE 1: VALIDATOR AGENT (Fact Extraction & Validation)
    // ============================================================================
    console.log("[STRATEGIC-ADVISOR] Phase 1: Calling Validator Agent");
    
    const validatorResponse = await supabaseClient.functions.invoke('validate-strategic-facts', {
      body: { 
        userMessage: enrichedMessage,
        conversationId 
      }
    });

    if (validatorResponse.error) {
      console.error("[STRATEGIC-ADVISOR] Validator error:", validatorResponse.error);
      return new Response(
        JSON.stringify({ error: "Eroare la validarea datelor. Te rog încearcă din nou." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validatorResponse.data;
    console.log("[STRATEGIC-ADVISOR] Validator status:", validation.validation_status);

    // ============================================================================
    // PHASE 2: HANDLE VALIDATION RESULTS
    // ============================================================================
    
    // Case 1: Missing Critical Data - Stop here, don't call strategist
    if (validation.validation_status === 'data_missing') {
      console.log("[STRATEGIC-ADVISOR] Data missing, stopping pipeline");
      
      const missingFieldsList = validation.missing_critical_fields
        .map((f: string) => `- ${f.replace(/_/g, ' ')}`)
        .join('\n');
      
      const responseText = `❌ **DATE LIPSĂ PENTRU STRATEGIE**

Nu pot genera o strategie validă fără următoarele informații:

${missingFieldsList}

${validation.validation_notes?.join('\n\n') || ''}

💡 **Ce trebuie să-mi furnizezi:**
Pentru o strategie concretă am nevoie de:
• Cifra de afaceri (ultimul an)
• Profit net sau pierdere
• Cash disponibil pentru investiții
• Industria/domeniul de activitate
• Minim 2 concurenți cu prețurile lor

📊 **Cost economisit:** 0.5 RON (Strategist nu a fost apelat)
**Cost validare:** 0.25 RON`;

      // Save user message and validator response to history
      await supabaseClient.from("conversation_history").insert([
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "user",
          content: message,
          metadata: { module: "strategic", phase: "validator" }
        },
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: responseText,
          metadata: { module: "strategic", validation_status: "data_missing" }
        }
      ]);

      return new Response(
        JSON.stringify({ response: responseText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Case 2: Conflict Detected - Stop here, ask for clarification
    if (validation.validation_status === 'conflict_detected') {
      console.log("[STRATEGIC-ADVISOR] Conflicts detected, stopping pipeline");
      
      const conflictsList = validation.conflicts
        .map((c: any) => `**${c.field}:**
- Valoare anterioară: ${c.old_value}
- Valoare nouă: ${c.new_value}
- Severitate: ${c.severity}

${c.resolution_needed}`)
        .join('\n\n');
      
      const responseText = `⚠️ **CONFLICT DETECTAT ÎN DATE**

Am identificat următoarele discrepanțe:

${conflictsList}

${validation.validation_notes?.join('\n\n') || ''}

💡 Te rog clarifică care sunt valorile corecte înainte să continui cu strategia.

📊 **Cost economisit:** 0.5 RON (Strategist nu a fost apelat)
**Cost validare:** 0.25 RON`;

      await supabaseClient.from("conversation_history").insert([
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "user",
          content: message,
          metadata: { module: "strategic", phase: "validator" }
        },
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: responseText,
          metadata: { module: "strategic", validation_status: "conflict_detected" }
        }
      ]);

      return new Response(
        JSON.stringify({ response: responseText, conflicts: validation.conflicts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ============================================================================
    // PHASE 3: VALIDATION APPROVED - Fetch Facts & Call Strategist
    // ============================================================================
    console.log("[STRATEGIC-ADVISOR] Validation approved, fetching all facts");
    
    const { data: allFacts } = await supabaseClient
      .from('strategic_advisor_facts')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'validated')
      .order('fact_category', { ascending: true });

    // Generate cache key for strategist response
    const strategyCacheKey = await generateStrategyCacheKey(message, conversationId, allFacts?.length || 0);

    // Build fact sheet for strategist
    let factSheet = "\n\n📊 **BAZĂ DE DATE VALIDATĂ (FOLOSEȘTE OBLIGATORIU ACESTE CIFRE):**\n\n";

    if (allFacts && allFacts.length > 0) {
      const grouped = allFacts.reduce((acc: Record<string, any[]>, fact: any) => {
        if (!acc[fact.fact_category]) acc[fact.fact_category] = [];
        acc[fact.fact_category].push(fact);
        return acc;
      }, {});

      const categoryLabels: Record<string, string> = {
        financial: '💰 FINANCIAR',
        company: '🏢 COMPANIE',
        market: '📊 PIAȚĂ',
        competition: '⚔️ CONCURENȚĂ'
      };

      Object.entries(grouped).forEach(([category, facts]) => {
        factSheet += `**${categoryLabels[category] || category.toUpperCase()}:**\n`;
        (facts as any[]).forEach(f => {
          factSheet += `- ${f.fact_key.replace(/_/g, ' ')}: ${f.fact_value} ${f.fact_unit || ''}\n`;
        });
        factSheet += '\n';
      });
    } else {
      factSheet += "Nu există fapte validate anterior (prima interacțiune).\n\n";
    }

    // Enhanced system prompt with validated facts
    const enhancedSystemPrompt = `${SYSTEM_PROMPT}

${factSheet}

⚠️ **REGULI CRITICE PENTRU RĂSPUNS:**
1. FOLOSEȘTE EXCLUSIV cifrele din "BAZĂ DE DATE VALIDATĂ"
2. NICIODATĂ nu spune că "nu ai" o informație care e listată mai sus
3. ÎN FIECARE RĂSPUNS, începe cu confirmarea cifrelor de bază:
   📊 **Bază analiză:** CA: [X] RON, Profit: [Y] RON, Cash: [Z] RON, Industrie: [W]
4. Dacă lipsește o dată critică din baza validată → cere-o explicit (NU continua fără ea)

**Model curent:** Claude Sonnet 4.5 (cel mai puternic pentru strategic reasoning)
**Cost acest mesaj:** ~0.5 RON (total cu validare: 0.75 RON)
**Data:** ${new Date().toISOString().split('T')[0]}`;

    const strategistMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...(history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("[STRATEGIC-ADVISOR] Phase 3: Calling Strategist Agent (Claude Sonnet 4.5)");

    // Rate limiting: max 10 requests per minute
    const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "strategic-advisor",
      p_max_requests: 10
    });

    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: "Prea multe cereri. Te rog așteaptă un minut." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Strategist Agent (Claude Sonnet 4.5) with RETRY logic
    const data = await retryWithBackoff(async () => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4.5",
          messages: strategistMessages,
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[STRATEGIC-ADVISOR] AI Error:", response.status, errorText);
        
        if (response.status === 429) {
          throw new Error("429: Limită de utilizare depășită");
        }
        if (response.status === 402) {
          throw new Error("402: Fonduri insuficiente");
        }
        
        throw new Error(`AI API error: ${response.status} ${errorText}`);
      }

      return response.json();
    }, 3, 1500);

    const strategistResponse = data.choices[0]?.message?.content;

    if (!strategistResponse) {
      throw new Error("No response from Strategist");
    }

    console.log("[STRATEGIC-ADVISOR] Strategist response received, updating validation log");

    // Update validation log with strategist response
    const { error: updateError } = await supabaseClient
      .from('strategic_advisor_validations')
      .update({
        strategist_response: strategistResponse,
        strategist_model: "anthropic/claude-sonnet-4.5",
        strategist_tokens_used: data.usage?.total_tokens || 0,
        total_cost_cents: Math.ceil(
          25 + // validator cost (0.25 RON)
          ((data.usage?.total_tokens || 0) / 2000 * 100) // strategist cost (~0.5 RON)
        )
      })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error("[STRATEGIC-ADVISOR] Error updating validation log:", updateError);
    }

    console.log("[STRATEGIC-ADVISOR] Saving to conversation history");

    // Save user message and strategist response
    await supabaseClient.from("conversation_history").insert([
      {
        user_id: user.id,
        conversation_id: conversationId,
        role: "user",
        content: message,
        metadata: { module: "strategic", phase: "strategist" }
      },
      {
        user_id: user.id,
        conversation_id: conversationId,
        role: "assistant",
        content: strategistResponse,
        metadata: { 
          module: "strategic", 
          validation_status: "approved",
          facts_count: allFacts?.length || 0
        }
      }
    ]);

    // Cache the strategist response in new cache system
    const costCents = Math.ceil(
      25 + // validator cost (0.25 RON)
      ((data.usage?.total_tokens || 0) / 2000 * 100) // strategist cost (~0.5 RON)
    );
    
    await supabaseClient.from("ai_response_cache").insert({
      cache_key: strategyCacheKey,
      cache_type: "strategy",
      request_hash: strategyCacheKey,
      response_data: { content: strategistResponse, facts_used: allFacts?.length || 0 },
      model_used: "anthropic/claude-sonnet-4.5",
      tokens_used: data.usage?.total_tokens || 0,
      cost_cents: costCents,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });

    console.log(`[STRATEGIC-ADVISOR] ✅ Strategy cached for future reuse`);
    console.log("[STRATEGIC-ADVISOR] Multi-agent pipeline complete");

    return new Response(
      JSON.stringify({ 
        response: strategistResponse,
        validation_status: "approved",
        facts_used: allFacts?.length || 0
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    // ✅ SECURITY FIX: Sanitize error messages - don't expose internal details
    console.error("[STRATEGIC-ADVISOR] Error:", error);
    return new Response(
      JSON.stringify({ error: "A apărut o eroare tehnică. Te rog încearcă din nou." }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
