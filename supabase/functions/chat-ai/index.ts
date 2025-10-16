import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `🤝 Ești un consultant financiar de încredere, specializat în analiza balanțelor contabile pentru companii din România.

👤 PERSONALITATEA TA:
- Vorbești ca un partener de afaceri inteligent și empatic - ca și cum bei o cafea cu clientul
- Ești profesionist dar prietenos și accesibil
- Înțelegi provocările antreprenorilor și îi ajuți cu soluții concrete
- Creezi o experiență caldă, nu robotică

⏰ DATA CURENTĂ: 4 OCTOMBRIE 2025
IMPORTANT: Utilizatorii au analize pentru ianuarie-martie 2025 și alte luni din 2025. Acestea sunt TOATE din TRECUT (suntem în octombrie), NU din viitor!

🚫 **LIMITELE TALE - CE NU FACI (FOARTE IMPORTANT)**

TU ANALIZEZI DOAR DATELE DIN BALANȚĂ. NU OFERI CONSULTANȚĂ STRATEGICĂ DE BUSINESS!

**DETECTEAZĂ ȘI REDIRECȚIONEAZĂ ÎNTREBĂRI STRATEGICE:**

Dacă utilizatorul întreabă despre:
❌ Cum să crească afacerea / compania / firma
❌ Strategii de expansiune sau scalare
❌ Cum să facă mai mult profit / să câștige mai mult
❌ Planuri de dezvoltare sau creștere
❌ Cum să intre pe piețe noi
❌ Strategii de marketing sau vânzări
❌ Cum să-și bată competitorii / concurența
❌ Oportunități de business sau investiții
❌ Cum să optimizeze procesele de business
❌ Planuri strategice pe termen lung
❌ Diversificare sau noi linii de business

→ **RĂSPUNS OBLIGATORIU (EXACT ASA):**

"🎯 **Întrebarea ta este de natură strategică, nu tehnică financiară.**

Eu analizez doar **datele concrete din balanță** și ofer recomandări financiare tehnice (DSO, cash flow, indicatori contabili).

Pentru consultanță strategică despre creștere, profit și dezvoltare business, te invit să discuți cu **Yana Strategică** - consilierul tău de business premium care oferă:

✅ Strategii concrete de creștere și profit
✅ Planuri de acțiune aggressive pentru scalare
✅ Analiza oportunităților de piață
✅ Consultanță strategică directă și brutală

💎 **Yana Strategică** este o funcție premium care necesită abonament activ.

Cu ce altceva te pot ajuta eu legat de **analiza tehnică a balanței tale**?"

**EXEMPLE DE ÎNTREBĂRI PE CARE LE RESPINGI:**
- "Cum pot să-mi cresc afacerea?" → REDIRECȚIONEAZĂ către Yana Strategică
- "Ce strategie să folosesc să fac mai mult profit?" → REDIRECȚIONEAZĂ către Yana Strategică
- "Cum să intrăm pe piața din Germania?" → REDIRECȚIONEAZĂ către Yana Strategică
- "Cum bat concurența?" → REDIRECȚIONEAZĂ către Yana Strategică
- "Ce oportunități de business am?" → REDIRECȚIONEAZĂ către Yana Strategică

**EXEMPLE DE ÎNTREBĂRI PE CARE LE RĂSPUNZI:**
- "Care e DSO-ul meu în august?" → RĂSPUNZI (analiză tehnică)
- "De ce am cash flow negativ?" → RĂSPUNZI (analiză tehnică)
- "Cum stau la indicatori financiari?" → RĂSPUNZI (analiză tehnică)
- "Cheltuielile mele sunt prea mari?" → RĂSPUNZI (analiză tehnică)

**REGULA DE AUR:**
- Datele din balanță = TU răspunzi
- Strategii de business = REDIRECȚIONEZI la Yana Strategică

💰 POLITICA DE TARIFE & PREȚURI YANA (RĂSPUNDE DETALIAT LA ÎNTREBĂRI):

📋 **TRIAL GRATUIT - 30 ZILE**
Când cineva întreabă "Cum funcționează trial-ul?" sau "Ce primesc gratuit?":
- 30 de zile complet gratuite, fără card bancar
- Acces la TOATE funcțiile de bază: analiză financiară, chat AI, dashboard, rapoarte, export PDF
- FĂRĂ reînnoire automată - trebuie să te abonezi manual după expirare
- Notificări la 15 zile și 7 zile înainte de expirare
- NU include funcții premium AI (Consilier Strategic, Analiză Vocală, Predicții avansate)

💼 **PLAN ANTREPRENOR - 99 LEI/LUNĂ (~24 EUR/lună)**
Perfect pentru: afaceri mici și mijlocii, IMM-uri, firme individuale

CE PRIMEȘTE (inclus în 99 lei/lună):
✅ Analiză financiară NELIMITATĂ (câte balanțe vrei)
✅ Chat AI financiar nelimitat pentru întrebări despre balanță
✅ Dashboard interactiv cu grafice și indicatori
✅ Rapoarte lunare automate
✅ Export PDF și Excel profesionale
✅ Comparare perioade (evoluție lună cu lună)
✅ Alerte proactive pentru probleme financiare
✅ Suport prioritar prin email (office@velcont.com)
✅ Gestionare companii multiple
✅ Istoricul complet al analizelor

CE NU E INCLUS (se plătește separat - OPȚIONAL):
❌ Consilier Strategic Yana (conversații strategice avansate) - necesită credite AI
❌ Analiză Vocală (interacțiune prin voce) - necesită credite AI
❌ Predicții financiare AI foarte frecvente (1-2/lună e OK, 10+/lună necesită credite)

IMPORTANT: 99% dintre antreprenori NU au nevoie să cumpere credite AI suplimentare!

🏢 **PLAN CONTABIL - 199 LEI/LUNĂ (~48 EUR/lună)**
Perfect pentru: cabinete de contabilitate, consultanță fiscală

CE PRIMEȘTE (inclus în 199 lei/lună):
✅ TOATE funcțiile din Plan Antreprenor
✅ Gestionare clienți NELIMITAȚI (înregistrezi toți clienții tăi)
✅ CRM complet integrat (contacte, documente, email-uri)
✅ Management documente clienți (încărcare balanțe pentru fiecare client)
✅ Portal clienți (fiecare client își vede propriile analize)
✅ Branding personalizat (logo-ul tău, culorile tale)
✅ Email-uri white-label către clienți
✅ Raportare agregată (statistici pentru toți clienții)
✅ Invitații clienți (trimiți link de acces automat)

CE NU E INCLUS (se plătește separat - OPȚIONAL):
❌ Același ca la Plan Antreprenor - funcții premium AI

💎 **CREDITE AI OPȚIONALE (doar dacă folosești intensiv funcții premium):**

Când cineva întreabă "Când trebuie să cumpăr credite AI?":
→ DOAR dacă folosești FOARTE INTENS:
  • Consilier Strategic Yana cu conversații lungi/complexe (10+ conversații strategice/lună)
  • Analiză Vocală extensivă (peste 10 minute/lună)
  • Generare predicții AI foarte frecventă (10+ predicții/lună)

PACHETE DISPONIBILE:
• Starter: 19 lei = 100 credite (~50 conversații strategice)
• Professional: 49 lei = 300 credite (~150 conversații strategice) - CEL MAI POPULAR
• Enterprise: 129 lei = 1000 credite (~500 conversații strategice)

CONTROL TOTAL COSTURI:
✅ Tu setezi bugetul lunar pentru AI
✅ Alerte la 80% din buget
✅ Oprire automată când atingi limita
✅ Vezi în timp real cheltuielile exacte
✅ ZERO costuri ascunse

🚫 **CE NU PLĂTEȘTI NICIODATĂ SUPLIMENTAR:**
- Analiză balanțe (nelimitată în abonament)
- Chat AI pentru întrebări financiare (nelimitat în abonament)
- Dashboard, rapoarte, grafice (nelimitat în abonament)
- Export PDF/Excel (nelimitat în abonament)
- Suport tehnic (inclus în abonament)
- Stocare date (inclusă în abonament)

📊 **EXEMPLE CONCRETE:**

ÎNTREBARE TIPICĂ: "Deci eu plătesc doar 99 lei/lună pentru Plan Antreprenor și atât?"
RĂSPUNS: "DA! 99 lei/lună îți acoperă TOATE nevoile de bază:
- Încarcă câte balanțe vrei, fără limită
- Folosește chat-ul AI cât vrei pentru întrebări
- Vezi toate rapoartele, graficele, analizele
- Exportă tot ce vrei în PDF
- ZERO costuri suplimentare obligatorii

Singurele costuri OPȚIONALE (dacă vrei) sunt creditele AI pentru:
- Consilier Strategic avanzat (conversații strategice profunde)
- Analiză Vocală (dacă preferi să vorbești în loc să scrii)

Dar 99% dintre utilizatori NU au nevoie de credite suplimentare!"

ÎNTREBARE TIPICĂ: "Cât mă costă dacă vreau și Consilier Strategic?"
RĂSPUNS: "Depinde cât îl folosești:
- 1-2 conversații strategice/lună = GRATIS (incluse în 99 lei)
- 5-10 conversații/lună = 19 lei/lună (pachet Starter, 100 credite)
- 20+ conversații/lună = 49 lei/lună (pachet Professional, 300 credite)

Exemplu: 99 lei abonament + 19 lei credite = 118 lei/lună TOTAL"

ÎNTREBARE CONTABIL: "Cât plătesc pentru 50 de clienți?"
RĂSPUNS: "Doar 199 lei/lună, INDIFERENT de număr clienți!
- 10 clienți = 199 lei/lună
- 50 clienți = 199 lei/lună
- 200 clienți = 199 lei/lună

Numărul de clienți este NELIMITAT în Plan Contabil. Nu există cost per client!"

💡 **CÂND RECOMANDĂ UPGRADE-URI:**
- Dacă un antreprenor are 3+ firme → "Ți-ar folosi comparația multi-firmă din Plan Antreprenor pentru toate afacerile tale"
- Dacă cineva vrea consultanță strategică → "Consilierul Strategic Yana te poate ajuta cu strategii de creștere, dar necesită credite AI opționale"
- Dacă contabil întreabă despre clienți → "Plan Contabil la 199 lei/lună, clienți NELIMITAȚI, CRM complet inclus"

🚨 **ATENTIE LA ÎNTREBĂRI DESPRE BANI:**
- Fii 100% transparent cu prețurile
- Subliniază că majoritatea utilizatorilor NU au nevoie de credite AI suplimentare
- Explică că 99 lei sau 199 lei/lună e TOT ce plătesc majoritatea utilizatorilor
- Nu minimiza importanța bugetului utilizatorilor

📞 **PENTRU DETALII SUPLIMENTARE:**
"Pentru informații suplimentare despre abonament, modalități de plată sau nelămuriri, scrie la office@velcont.com"

📊 ROLUL TĂU PRIORITAR:
- Răspunzi la întrebări despre balanțele lor contabile
- Explici indicatori financiari (DSO, DPO, rotație stocuri, etc.) în limbaj simplu
- Oferi insights concrete despre performanța financiară
- Recomandări acționabile bazate pe datele lor

💬 STIL DE CONVERSAȚIE (ESENȚIAL):
✅ Răspunde CONCIS și CLAR - evită răspunsuri lungi care blochează sistemul
✅ În timpul discuției: răspunde direct la întrebare
✅ Când utilizatorul e aproape să încheie, introduce SUBTIL o idee conexă:
   • "Mulți antreprenori în situația asta se gândesc și la..."
   • "Vrei să discutăm și despre cum ai putea optimiza X?"
✅ Dacă utilizatorul nu mai vrea să continue → încheie elegant și invită-l să revină
❌ NU forța conversația
❌ NU da răspunsuri prea lungi - riști să blochezi sistemul

📱 GHID COMPLET APLICAȚIE:

🔐 **CONECTARE & CONT**
- "Cum mă înregistrez?" → Email + parolă în pagina de autentificare
- "Cum resetez parola?" → Click "Am uitat parola" pe pagina de login, verifică email-ul
- "Cum mă deconectez?" → Butonul "Deconectare" în colțul dreapta-sus
- "Am cont trial?" → Da, 3 luni gratuit automat la înregistrare

📤 **ÎNCĂRCARE BALANȚĂ**
- "Ce format acceptați?" → DOAR Excel (.xls/.xlsx), NU PDF sau imagini
- "Ce trebuie să conțină?" → Solduri inițiale, rulaje perioadă, total sume, solduri finale
- "Unde încărc?" → Butonul "Încarcă Balanță" pe pagina principală
- "Cât durează analiza?" → 10-30 secunde automat după încărcare
- "De ce nu merge PDF?" → Sistemul procesează doar Excel pentru acuratețe maximă

📊 **DASHBOARD & VIZUALIZARE**
- "Unde văd analizele?" → Click "📊 Dashboard cu grafice și indicatori" (dreapta-sus)
- "Cum văd istoricul?" → În Dashboard, tab-ul "Analize (X)" arată toate analizele
- "Cum compar 2 perioade?" → În Dashboard, tab "Comparare Perioade", selectează 2 analize
- "Unde sunt graficele?" → Dashboard → Tab "Grafice Analytics" (cifră afaceri, profit, DSO, etc.)
- "Cum văd alertele?" → Dashboard → Tab "Alerte Proactive" (probleme detectate automat)

📥 **DESCĂRCARE & EXPORT** (FOARTE IMPORTANT):
Când utilizatorul întreabă "Cum descarc analiza?" sau "Unde e butonul de download?":
1. **Pasul 1**: Click pe "📊 Dashboard cu grafice și indicatori" (dreapta-sus, pagina principală)
2. **Pasul 2**: Click pe butonul "Dosarul meu" 
3. **Pasul 3**: Selectează analiza dorită din listă
4. **Pasul 4**: Fiecare analiză are 3 butoane în dreapta:
   - 👁️ **Vezi** = vizualizează detaliile
   - 📥 **Descarcă** = salvează PDF profesional (cu grafice, indicatori, recomandări)
   - 🗑️ **Șterge** = elimină analiza
5. **Pasul 5**: Click "📥 Descarcă" → PDF-ul se descarcă automat
6. **Bonus**: Poți descărca orice analiză din istoric, oricând!

📧 **TRIMITERE EMAIL & PARTAJARE**
- "Cum trimit analiza prin email?" → În Dashboard, click 👁️ Vezi pe analiză → buton "📧 Trimite Email"
- "Cum partajez cu contabilul?" → În Dashboard, click 👁️ Vezi → buton "🔗 Partajează" → adaugă email-ul lui
- "Cine poate vedea?" → Doar tu și persoanele cărora le dai acces explicit

🗑️ **ȘTERGERE DATE**
- "Cum șterg o analiză?" → Dashboard → Analize → butonul 🗑️ Șterge lângă fiecare analiză
- "Cum șterg toate?" → Dashboard → Analize → buton "Șterge Tot" (jos, cu confirmare)
- "Pot recupera după ștergere?" → NU, ștergerea e permanentă

🏢 **COMPANII MULTIPLE** (pentru antreprenori cu mai multe firme)
- "Cum adaug firmă nouă?" → Butonul "Companii" (dreapta-sus) → "➕ Adaugă Companie"
- "Cum schimb între firme?" → Drop-down "Companii" (dreapta-sus) → selectează firma dorită
- "Cum văd comparație între firme?" → Dashboard → tab "Comparare Multi-Firmă"

📚 **EXPLICAȚII INDICATORI FINANCIARI**
- **DSO** (Days Sales Outstanding) = Câte zile durează să încasezi de la clienți
  → Bun: <45 zile | Atenție: 45-60 zile | Pericol: >60 zile
- **DPO** (Days Payable Outstanding) = Câte zile întârzii plata furnizorilor
  → Optim: 45-60 zile (folosești banii mai mult timp)
- **DIO** (Days Inventory Outstanding) = Câte zile stau stocurile în depozit
  → Bun: <60 zile | Atenție: 60-90 zile | Pericol: >90 zile (depreciere)
- **EBITDA** = Profit înainte de dobânzi, taxe, deprecieri
  → Pozitiv = afacere sănătoasă | Negativ = pierderi operaționale
- **Marja profitului** = (Profit / Venituri) × 100%
  → Excelent: >15% | Bun: 10-15% | Slab: <10%
- **Cash Conversion Cycle** = DSO + DIO - DPO (cât durează să transformi investiția în cash)
  → Mai mic = mai bine (capital mai puțin blocat)

💡 **ALERTE & RECOMANDĂRI**
- "Cum văd recomandările?" → Dashboard → tab "Alerte Proactive" sau în analiza detaliată
- "De ce am alertă roșie?" → Indicator critic depășit (ex: DSO >80 zile, profit negativ)
- "Cum rezolv?" → Fiecare alertă vine cu pași concreți de acțiune

🎙️ **INTERFAȚĂ VOCALĂ** (feature premium)
- "Cum funcționează vocea?" → Click pe iconița 🎙️ în chat → vorbește direct cu Yana
- "E gratuită?" → 10 minute/lună gratuit, apoi se taxează suplimentar
- "Cum activez?" → Automată la prima utilizare, cere permisiune microfon

⚠️ **PROBLEME FRECVENTE & SOLUȚII**
- "Nu se încarcă Excel-ul" → Verifică: format .xlsx, nu are parolă, < 10MB
- "Analiza e greșită" → Balanța trebuie să aibă structură standard contabilă
- "Nu văd butonul X" → Poate fi restricție de abonament (trial/premium)
- "Sistemul e lent" → Normal la analiză complexă, durează max 30 sec

📧 **SUPORT & CONTACT** (ESENȚIAL):
Dacă utilizatorul:
- Nu găsește ceva în aplicație (ex: "Unde e butonul de...?")
- Are probleme tehnice (ex: "Nu merge să încărc", "Se blochează")
- Vrea funcționalități noi (ex: "Aș vrea să pot...")
- Are sugestii sau reclamații

→ **Răspuns obligatoriu**: "Pentru această problemă/sugestie, te rog să scrii direct la **office@velcont.com** cu detalii. Echipa de suport îți va răspunde rapid și va rezolva situația. Între timp, cu ce altceva te pot ajuta?"

💬 **DESPRE CONVERSAȚII**
- "Cum văd istoricul?" → Click pe iconița 📜 în chat → vezi toate conversațiile
- "Se salvează automat?" → Da, toate conversațiile sunt salvate
- "Pot șterge conversații?" → Momentan nu, dar datele sunt private

📊 ACCES LA DATE (AI TOOLS - FOLOSEȘTE-LE AUTOMAT):
1. get_analyses_history - Extrage ultimele N analize
2. get_analysis_by_period - Găsește analiza pentru o lună specifică
3. get_proactive_insights - Verifică alerte automate
4. compare_periods - Compară indicatori între 2 perioade

🤖 COMPORTAMENT PROACTIV (CRITIC):
- Când user întreabă despre un indicator (ex: "Care e DSO-ul pentru august?"):
  1. NU întreba user-ul să-ți dea ID-ul
  2. FOLOSEȘTE AUTOMAT get_analysis_by_period
  3. EXTRAGE indicatorul
  4. RĂSPUNDE direct
  
- Când cere comparație (ex: "Compară august cu septembrie"):
  1. FOLOSEȘTE get_analysis_by_period de 2 ori
  2. APLICĂ compare_periods
  3. PREZINTĂ comparația

❌ NU cere NICIODATĂ user-ului ID-uri sau detalii tehnice
✅ ACȚIONEZI INDEPENDENT: cauți singur, extragi, răspunzi

📈 ANALIZĂ:
- Compară cu perioade anterioare
- Calculează % creștere/scădere
- Identifică anomalii
- Oferă recomandări prioritizate

⚠️ REGULI CRITICE:
✅ Folosește TOOLS automat când trebuie
✅ Răspunde CONCIS - evită blocarea sistemului
✅ FII proactiv, independent
❌ NU inventa date financiare
❌ NU cere user-ului date pe care le poți extrage singur
❌ NU da răspunsuri lungi sau complicate

💡 FORMAT RĂSPUNS:
- Structură clară cu bullet points
- Emoji-uri pentru lizibilitate
- Contextualizare pentru cifre
- Sugestii concrete când e relevant
`;

// Tool definitions pentru acces la date
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_analyses_history",
      description: "Obține ultimele N analize ale utilizatorului pentru comparații temporale și analiza tendințelor",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Numărul de analize de returnat (default: 5, max: 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_analysis_by_period",
      description: "Găsește analiza pentru o lună sau perioadă specifică (ex: 'august', 'august 2024', 'septembrie'). Folosește AUTOMAT acest tool când user întreabă despre indicatori dintr-o perioadă specifică.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Luna sau perioada căutată (ex: 'august', 'august 2024', 'septembrie 2024')"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_proactive_insights",
      description: "Verifică alertele automate generate de sistem pentru probleme financiare",
      parameters: {
        type: "object",
        properties: {
          only_unread: {
            type: "boolean",
            description: "Dacă true, returnează doar alertele necitite"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Compară indicatori financiari între două perioade specifice",
      parameters: {
        type: "object",
        properties: {
          analysis1_id: {
            type: "string",
            description: "ID-ul primei analize (perioada veche)"
          },
          analysis2_id: {
            type: "string",
            description: "ID-ul celei de-a doua analize (perioada nouă)"
          }
        },
        required: ["analysis1_id", "analysis2_id"]
      }
    }
  }
];

// Funcții tool executabile
async function executeTools(toolCalls: any[], authHeader: string) {
  const results = [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }
  });

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || "{}");
    
    console.log("Executing tool:", functionName, "with args:", args);
    
    let result;
    
    try {
      switch (functionName) {
        case "get_analyses_history": {
          const limit = args.limit || 5;
          const { data, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, analysis_text, metadata")
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 10));
          
          if (error) throw error;
          result = { analyses: data, count: data?.length || 0 };
          break;
        }
        
        case "get_analysis_by_period": {
          const rawPeriod: string = (args.period || '').toString();
          const norm = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

          const period = norm(rawPeriod);

          // Hărți lună (RO + EN) cu abrevieri
          const months: Record<string, number> = {
            ianuarie: 1, jan: 1, january: 1, ian: 1,
            februarie: 2, february: 2, feb: 2,
            martie: 3, march: 3, mar: 3,
            aprilie: 4, april: 4, apr: 4,
            mai: 5,
            iunie: 6, june: 6, iun: 6, jun: 6,
            iulie: 7, july: 7, iul: 7, jul: 7,
            august: 8, aug: 8,
            septembrie: 9, september: 9, sept: 9, sep: 9,
            octombrie: 10, october: 10, oct: 10,
            noiembrie: 11, november: 11, nov: 11,
            decembrie: 12, december: 12, dec: 12,
          };

          const monthFromText = (() => {
            for (const [k, v] of Object.entries(months)) {
              if (period.includes(k)) return v;
            }
            return undefined;
          })();

          // Extrage anul/ luna numerică din texte de tip "03/2025", "03-2025", "2025-03"
          const mmYYYY = period.match(/(?:^|\D)(0?[1-9]|1[0-2])[\/\-.](\d{4})(?:\D|$)/);
          const yyyyMM = period.match(/(?:^|\D)(\d{4})[\/\-.](0?[1-9]|1[0-2])(?!\d)(?:\D|$)/);
          const yearOnly = period.match(/(?:^|\D)(20\d{2})(?:\D|$)/);

          let targetMonth: number | undefined = monthFromText || (mmYYYY ? parseInt(mmYYYY[1], 10) : (yyyyMM ? parseInt(yyyyMM[2], 10) : undefined));
          let targetYear: number | undefined = (mmYYYY ? parseInt(mmYYYY[2], 10) : (yyyyMM ? parseInt(yyyyMM[1], 10) : undefined)) || (yearOnly ? parseInt(yearOnly[1], 10) : undefined);

          const { data, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, analysis_text, metadata")
            .order("created_at", { ascending: false });
          if (error) throw error;

          type Row = { id: string; file_name: string | null; created_at: string; analysis_text: string | null; metadata: any };

          // Extrage (luna, anul) din fiecare analiză pe baza metadata / text / nume fișier
          const parsePeriodFromRow = (row: Row): { month?: number; year?: number } => {
            const meta = row.metadata || {};
            // 1) metadata.period_start / period_end (format ISO)
            const iso = (val?: string) => (typeof val === 'string' ? new Date(val) : undefined);
            const ms = iso(meta.period_start);
            const me = iso(meta.period_end);
            if (ms && !isNaN(ms.getTime())) return { month: ms.getMonth() + 1, year: ms.getFullYear() };
            if (me && !isNaN(me.getTime())) return { month: me.getMonth() + 1, year: me.getFullYear() };

            const lowerName = norm(row.file_name || '');
            const lowerText = norm(row.analysis_text || '');

            // 2) Caută dd/mm/yyyy sau dd-mm-yyyy în analysis_text
            const dateRegex = /(\b|\D)(0?[1-9]|[12]\d|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](\d{4})(\b|\D)/;
            const m1 = lowerText.match(dateRegex) || lowerName.match(dateRegex);
            if (m1) {
              const m = parseInt(m1[3], 10);
              const y = parseInt(m1[4], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }

            // 3) Caută intervale de tip [01-03-2025 31-03-2025] în nume
            const rangeRegex = /(\d{2})[\/-](\d{2})[\/-](\d{4})\s+(\d{2})[\/-](\d{2})[\/-](\d{4})/;
            const m2 = lowerName.match(rangeRegex);
            if (m2) {
              const m = parseInt(m2[2], 10);
              const y = parseInt(m2[3], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }

            // 4) Ultima variantă: caută numele lunii în text/nume + deduce anul din cifrele 20xx
            for (const [k, v] of Object.entries(months)) {
              if (lowerName.includes(k) || lowerText.includes(k)) {
                const yMatch = lowerName.match(/20\d{2}/) || lowerText.match(/20\d{2}/);
                return { month: v, year: yMatch ? parseInt(yMatch[0], 10) : undefined };
              }
            }
            return {};
          };

          const annotated = (data || []).map((row: Row) => ({
            row,
            ...parsePeriodFromRow(row),
          }));

          // Dacă nu s-a specificat luna, încearcă să o deduci din text (ex: doar "martie")
          if (!targetMonth && monthFromText) targetMonth = monthFromText;

          // Găsește cea mai potrivită analiză
          let candidates = annotated.filter(a => (targetMonth ? a.month === targetMonth : true));
          if (targetYear) candidates = candidates.filter(a => a.year === targetYear);

          // Dacă nu avem an, alege cel mai recent an pentru luna respectivă
          if (!targetYear && targetMonth && candidates.length > 1) {
            const maxYear = Math.max(...candidates.map(c => c.year || 0));
            candidates = candidates.filter(c => (c.year || 0) === maxYear);
          }

          const found = candidates.sort((a, b) => new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime())[0]?.row || null;

          if (!found) {
            const available = annotated
              .map(a => a.year && a.month ? `${('0'+a.month).slice(-2)}/${a.year}` : null)
              .filter(Boolean)
              .slice(0, 12);
            result = {
              error: `Nu am găsit analiza pentru perioada "${rawPeriod}". Perioade disponibile: ${available.join(', ')}`
            };
          } else {
            result = {
              analysis: found,
              message: `Am găsit analiza pentru ${rawPeriod}`
            };
          }
          break;
        }
        
        case "get_proactive_insights": {
          const onlyUnread = args.only_unread || false;
          let query = supabase
            .from("chat_insights")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
          
          if (onlyUnread) {
            query = query.eq("is_read", false);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          result = { insights: data, count: data?.length || 0 };
          break;
        }
        
        case "compare_periods": {
          const { data: analyses, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, analysis_text, metadata")
            .in("id", [args.analysis1_id, args.analysis2_id]);
          
          if (error) throw error;
          if (!analyses || analyses.length !== 2) {
            throw new Error("Nu am găsit ambele analize");
          }
          
          const [old, current] = analyses.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const oldMeta = old.metadata || {};
          const currentMeta = current.metadata || {};
          
          const comparison: any = {
            period_old: { date: old.created_at, file: old.file_name, indicators: oldMeta },
            period_new: { date: current.created_at, file: current.file_name, indicators: currentMeta },
            changes: {}
          };
          
          // Calculează schimbări procentuale
          for (const key of ['dso', 'dpo', 'cashConversionCycle', 'ebitda', 'revenue', 'expenses', 'profit']) {
            if (oldMeta[key] && currentMeta[key]) {
              const oldVal = parseFloat(oldMeta[key]);
              const newVal = parseFloat(currentMeta[key]);
              const change = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
              comparison.changes[key] = {
                old: oldVal,
                new: newVal,
                change_pct: Math.round(change * 10) / 10,
                trend: change > 0 ? 'crescator' : change < 0 ? 'descrescator' : 'stabil'
              };
            }
          }
          
          result = comparison;
          break;
        }
        
        default:
          result = { error: "Unknown function: " + functionName };
      }
    } catch (error) {
      console.error("Error executing " + functionName + ":", error);
      result = { error: (error as any).message || "Unknown error" };
    }
    
    results.push({
      tool_call_id: toolCall.id,
      role: "tool",
      name: functionName,
      content: JSON.stringify(result)
    });
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { message, history, conversationId, summaryType = 'detailed', stream: streamResponse = true } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mesajul lipsește" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extragem user_id pentru rate limiting și caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Autentificare necesară" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DETECTARE "ȚINE MINTE" - Salvare în knowledge base
    const rememberRegex = /^(ține\s+minte|tine\s+minte)[:\s]+(.+)/i;
    const rememberMatch = message.match(rememberRegex);
    
    if (rememberMatch) {
      const knowledgeContent = rememberMatch[2].trim();
      
      try {
        // Extragem categoria automată din conținut
        let category = 'general';
        let topic = 'Informație generală';
        
        if (/\b(dso|zile\s+client|incasare)\b/i.test(knowledgeContent)) {
          category = 'dso';
          topic = 'DSO și zile clienți';
        } else if (/\b(dpo|zile\s+furnizor|plata)\b/i.test(knowledgeContent)) {
          category = 'dpo';
          topic = 'DPO și zile furnizori';
        } else if (/\b(profit|pierdere|rentabilitate)\b/i.test(knowledgeContent)) {
          category = 'profit';
          topic = 'Profit și rentabilitate';
        } else if (/\b(cash|numerar|lichiditate)\b/i.test(knowledgeContent)) {
          category = 'cash_flow';
          topic = 'Cash flow și lichidități';
        } else if (/\b(stoc|inventar|marfa)\b/i.test(knowledgeContent)) {
          category = 'inventory';
          topic = 'Stocuri și inventar';
        } else if (/\b(contabil|cont|balanta)\b/i.test(knowledgeContent)) {
          category = 'accounting';
          topic = 'Contabilitate și balanțe';
        }
        
        // Salvăm în knowledge_base
        const { error: kbError } = await supabase
          .from('knowledge_base')
          .insert({
            category,
            topic,
            response_template: knowledgeContent,
            is_active: true,
            priority: 5
          });
        
        if (kbError) {
          console.error('Eroare salvare knowledge:', kbError);
          return new Response(
            JSON.stringify({ 
              response: "Am întâmpinat o problemă la salvarea informației. Te rog încearcă din nou.",
              cached: false
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Returnăm confirmare
        return new Response(
          JSON.stringify({ 
            response: `✅ **Am învățat!**\n\nAm salvat această informație în baza mea de cunoștințe:\n\n"${knowledgeContent}"\n\n📚 Categorie: **${topic}**\n\nDe acum înainte, voi folosi această informație când răspund la întrebări pentru TOȚI utilizatorii aplicației. Mulțumesc pentru că mă ajuți să devin mai inteligentă! 🎓`,
            cached: false,
            knowledge_saved: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error('Eroare procesare knowledge:', err);
      }
    }

    // RATE LIMITING - max 30 request/min
    const { data: rateLimitData, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'chat-ai',
      p_max_requests: 30
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitData === false) {
      return new Response(
        JSON.stringify({ 
          error: "Prea multe cereri. Încercați din nou în 1 minut.",
          retry_after: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60"
          } 
        }
      );
    }

    // CACHING - verifică dacă avem răspuns în cache
    const questionHash = await crypto.subtle.digest(
      'SHA-256', 
      new TextEncoder().encode(message.toLowerCase().trim())
    );
    const hashHex = Array.from(new Uint8Array(questionHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: cachedData } = await supabase
      .from('chat_cache')
      .select('answer_text, hit_count')
      .eq('question_hash', hashHex)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('Cache hit for question hash:', hashHex);
      
      // Incrementează hit_count
      await supabase
        .from('chat_cache')
        .update({ 
          hit_count: cachedData.hit_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('question_hash', hashHex);

      return new Response(
        JSON.stringify({ 
          response: cachedData.answer_text,
          cached: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY nu este configurată");
      return new Response(
        JSON.stringify({ error: "Configurare incorectă a serviciului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consultăm knowledge_base pentru informații suplimentare
    let knowledgeContext = '';
    try {
      const { data: knowledgeData, error: kbError } = await supabase
        .from('knowledge_base')
        .select('category, topic, response_template')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(20);
      
      if (!kbError && knowledgeData && knowledgeData.length > 0) {
        knowledgeContext = '\n\n📚 **CUNOȘTINȚE SUPLIMENTARE** (învățate de la utilizatori):\n';
        knowledgeData.forEach((kb: any, idx: number) => {
          knowledgeContext += `${idx + 1}. [${kb.topic}]: ${kb.response_template}\n`;
        });
        knowledgeContext += '\n✅ Folosește aceste informații când răspunzi la întrebări relevante.\n';
      }
    } catch (err) {
      console.error('Eroare citire knowledge_base:', err);
    }
    
    // Adaptează system prompt pe baza tipului de sumarizare și setează data curentă dinamic
    const now = new Date();
    const roNow = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    let adaptedPrompt = SYSTEM_PROMPT + knowledgeContext + `\n\n⏰ DATA CURENTĂ: ${roNow}\nREGULĂ CRITICĂ: Orice perioadă <= ${roNow} este DIN TRECUT. NU spune niciodată că 'ianuarie 2025 – martie 2025' este în viitor. Dacă utilizatorul oferă un interval, consideră-l valid dacă capătul intervalului este <= data curentă. Dacă nu e clar, FOLOSEȘTE TOOLS pentru a verifica analizele disponibile, nu răspunde din presupuneri.`;
    
    if (summaryType === 'short') {
      adaptedPrompt += `\n\n🎯 MOD SUMARIZARE SCURTĂ:\n- Răspunde în maxim 100 cuvinte\n- Doar insight-urile CHEIE\n- Fără introduceri sau detalii suplimentare\n- Format: 3-5 bullet points concentrați\n- Accentuează doar ce e URGENT/CRITIC`;
    } else if (summaryType === 'action') {
      adaptedPrompt += `\n\n🎯 MOD ACTION POINTS:\n- Răspunde DOAR cu acțiuni concrete\n- Format: Listă numerotată de pași executabili\n- Pentru fiecare acțiune:\n  • Ce trebuie făcut (verb de acțiune + obiect)\n  • Deadline recomandat (ore/zile)\n  • Impact așteptat (ROI/economie)\n- Fără analize sau explicații\n- Maximum 5-7 action points, prioritizate\n- Exemplu: "1. ✅ Trimite reminder la 15 facturi restante (astăzi, recuperare ~8,500 RON)"`;
    }
    
    // Construiește conversația cu system prompt și istoric
    const messages = [
      { role: "system", content: adaptedPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("Trimit cerere către Lovable AI cu tool calling...");
    
    // Rate limiting: max 30 mesaje/minut per user
    const { data: canProceed } = await supabase.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "chat-ai",
      p_max_requests: 30
    });

    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: "Prea multe mesaje trimise. Te rog așteaptă un minut." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prima cerere cu tool calling
    let aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        tools: TOOLS,
        tool_choice: "auto",
        stream: streamResponse,
        max_tokens: 1024
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Eroare AI Gateway:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limită de utilizare depășită. Te rog încearcă din nou peste câteva minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Te rog adaugă credite în Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Eroare la serviciul de AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dacă streamResponse este false, colectăm tot răspunsul și returnăm JSON
    if (!streamResponse) {
      const responseData = await aiResponse.json();
      const content = responseData.choices?.[0]?.message?.content || "";
      
      return new Response(
        JSON.stringify({ response: content, message: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream răspuns
    const encoder = new TextEncoder();
    const startTime = Date.now(); // Pentru a măsura timpul de răspuns
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let toolCalls: any[] = [];
          let accumulatedContent = "";
          let sentAnyContent = false;
          let assistantMessageId: string | null = null;

          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  accumulatedContent += delta.content;
                  sentAnyContent = true;
                  controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: delta.content }) + "\n\n"));
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = { id: tc.id, type: "function", function: { name: "", arguments: "" } };
                    }
                    if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                    if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                  }
                }

                if (parsed.choices?.[0]?.finish_reason === "tool_calls" && toolCalls.length > 0) {
                  console.log("Tool calls detectate:", toolCalls);
                  controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "thinking", message: "Analizez datele..." }) + "\n\n"));
                  
                  // Execută tools
                  const toolResults = await executeTools(toolCalls, authHeader);
                  
                  // Apel secundar cu rezultatele tool-urilor
                  const followUpMessages = [
                    ...messages,
                    { role: "assistant", content: accumulatedContent || null, tool_calls: toolCalls },
                    ...toolResults
                  ];

                  const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": "Bearer " + LOVABLE_API_KEY,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      messages: followUpMessages,
                      stream: true
                    }),
                  });

                  if (!followUpResponse.ok) {
                    const errText = await followUpResponse.text();
                    console.error("Eroare follow-up AI:", followUpResponse.status, errText);
                    const fallback = "Nu am reușit să finalizez răspunsul acum. Verifică dacă perioada este corectă (ex: 'martie 2025') și încearcă din nou.";
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
                    sentAnyContent = true;
                  } else {
                    const followUpReader = followUpResponse.body?.getReader();
                    if (!followUpReader) {
                      const fallback = "Răspunsul a fost procesat, dar nu am primit conținut. Te rog încearcă din nou.";
                      controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
                      sentAnyContent = true;
                    } else {
                      let followUpBuffer = "";
                      
                      while (true) {
                        const { done: followUpDone, value: followUpValue } = await followUpReader.read();
                        if (followUpDone) break;

                        followUpBuffer += decoder.decode(followUpValue, { stream: true });
                        const followUpLines = followUpBuffer.split("\n");
                        followUpBuffer = followUpLines.pop() || "";

                        for (const followUpLine of followUpLines) {
                          if (!followUpLine.trim() || followUpLine.startsWith(":")) continue;
                          if (!followUpLine.startsWith("data: ")) continue;
                          const followUpData = followUpLine.slice(6);
                          if (followUpData === "[DONE]") continue;

                          try {
                            const followUpParsed = JSON.parse(followUpData);
                            const followUpContent = followUpParsed.choices?.[0]?.delta?.content;
                            if (followUpContent) {
                              accumulatedContent += followUpContent;
                              sentAnyContent = true;
                              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: followUpContent }) + "\n\n"));
                            }
                          } catch (e) {
                            console.error("Parse error follow-up:", e);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }

          // Dacă nu am livrat niciun conținut, trimitem un fallback sigur
          if (!sentAnyContent) {
            const fallback = "Îmi pare rău, nu am putut genera un răspuns în acest moment. Te rog specifică perioada clar (ex: 'ianuarie 2025 – martie 2025') sau încearcă din nou în câteva secunde.";
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
            accumulatedContent = fallback;
          }

          // === ÎNVĂȚARE AUTOMATĂ: Salvăm răspunsul și extragem pattern-ul ===
          const responseTime = Date.now() - startTime;
          
          try {
            // 1. Salvăm răspunsul asistentului în conversation_history
            if (userId) {
              const { data: savedMessage, error: saveError } = await supabase
                .from("conversation_history")
                .insert({
                  user_id: userId,
                  conversation_id: conversationId,
                  role: "assistant",
                  content: accumulatedContent,
                  metadata: { 
                    response_time_ms: responseTime,
                    summary_type: summaryType || 'default'
                  }
                })
                .select("id")
                .single();

              if (!saveError && savedMessage) {
                assistantMessageId = savedMessage.id;
                
                // 2. Extragem pattern-ul întrebării (anonimizat)
                const { data: patternData, error: patternError } = await supabase
                  .rpc('extract_question_pattern', { question_text: message });
                
                if (!patternError && patternData && patternData.length > 0) {
                  const { pattern, category } = patternData[0];
                  
                  // 3. Actualizăm/creăm pattern-ul în chat_patterns
                  // Verificăm dacă pattern-ul există deja
                  const { data: existingPattern } = await supabase
                    .from("chat_patterns")
                    .select("frequency, avg_response_time")
                    .eq("question_pattern", pattern)
                    .single();
                  
                  if (existingPattern) {
                    // Actualizăm frecvența și media timpului de răspuns
                    const newFrequency = existingPattern.frequency + 1;
                    const newAvgResponseTime = Math.round(
                      (existingPattern.avg_response_time * existingPattern.frequency + responseTime) / newFrequency
                    );
                    
                    await supabase
                      .from("chat_patterns")
                      .update({
                        frequency: newFrequency,
                        avg_response_time: newAvgResponseTime,
                        last_asked_at: new Date().toISOString()
                      })
                      .eq("question_pattern", pattern);
                  } else {
                    // Creăm pattern nou
                    await supabase
                      .from("chat_patterns")
                      .insert({
                        question_pattern: pattern,
                        question_category: category,
                        frequency: 1,
                        avg_response_time: responseTime,
                        last_asked_at: new Date().toISOString()
                      });
                  }
                }
              }
              
              // 4. SALVĂM RĂSPUNSUL ÎN CACHE pentru întrebări frecvente
              // Doar pentru întrebări simple (< 200 caractere) și răspunsuri > 50 caractere
              if (message.length < 200 && accumulatedContent.length > 50) {
                try {
                  await supabase
                    .from('chat_cache')
                    .insert({
                      question_hash: hashHex,
                      question_text: message,
                      answer_text: accumulatedContent
                    });
                } catch (cacheErr) {
                  // Ignorăm eroarea de duplicate key
                  console.log('Cache insert skipped:', cacheErr);
                }
              }
              
              // Trimitem message_id pentru feedback
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ 
                type: "message_id", 
                message_id: assistantMessageId 
              }) + "\n\n"));
            }
            
          } catch (learningError) {
            console.error("Eroare sistem învățare:", learningError);
            // Nu bloăm utilizatorul dacă învățarea eșuează
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error) {
    console.error("Eroare în chat-ai:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Eroare necunoscută"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
