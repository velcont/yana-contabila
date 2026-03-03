import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://esm.sh/zod@3.22.4";
import { FULL_ANALYSIS_PROMPT } from "../_shared/full-analysis-prompt.ts";
import { YANA_CONSCIOUSNESS_PROMPT } from "../_shared/yana-consciousness-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🆕 Funcție pentru a construi contextul balanței din datele structurate
// RESPECTĂ REGULILE CONTABILE: Clasele 1-5 pe Solduri finale, Clasele 6-7 pe Total sume
// FALLBACK: Folosește debit/credit dacă finalDebit/finalCredit nu există
function buildBalanceDataContext(balanceContext: any): string {
  if (!balanceContext || !balanceContext.accounts || balanceContext.accounts.length === 0) {
    return '';
  }

  const accountLines = balanceContext.accounts.map((a: any) => {
    const accountClass = parseInt(a.code?.toString()?.[0] || '0');
    
    // 📊 REGULĂ CONTABILĂ FUNDAMENTALĂ:
    // Clasele 1-5 (active, pasive, capitaluri, creanțe, datorii): SOLDURI FINALE
    // Clasele 6-7 (cheltuieli, venituri): TOTAL SUME (rulaje)
    
    if (accountClass >= 1 && accountClass <= 5) {
      // SOLDURI FINALE pentru clasele 1-5
      // FALLBACK: folosește finalDebit ?? debit ?? 0 pentru compatibilitate
      const finalD = Number(a.finalDebit ?? a.debit ?? 0);
      const finalC = Number(a.finalCredit ?? a.credit ?? 0);
      
      if (finalD > 0) {
        return `Cont ${a.code} (${a.name}): Sold final DEBITOR = ${finalD.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON`;
      } else if (finalC > 0) {
        return `Cont ${a.code} (${a.name}): Sold final CREDITOR = ${finalC.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON`;
      } else {
        return `Cont ${a.code} (${a.name}): Sold final = 0.00 RON`;
      }
    } else {
      // TOTAL SUME pentru clasele 6-7
      const totalD = Number(a.debit || 0);
      const totalC = Number(a.credit || 0);
      return `Cont ${a.code} (${a.name}): Total sume Debit = ${totalD.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON | Credit = ${totalC.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON`;
    }
  }).join('\n');

  return `

📊 **DATELE BALANȚEI - ${balanceContext.period || 'Perioadă necunoscută'}**
Firmă: ${balanceContext.company || 'Necunoscut'}
CUI: ${balanceContext.cui || 'N/A'}

⛔ **IZOLARE FIRMĂ**: Aceste date aparțin EXCLUSIV firmei "${balanceContext.company || 'Necunoscut'}".
Dacă utilizatorul întreabă despre o ALTĂ firmă, NU folosi aceste date!
Spune-i că trebuie să încarce balanța firmei respective.

**REGULĂ CONTABILĂ APLICATĂ:**
- Clasele 1-5 (active, pasive, capitaluri, creanțe, datorii): Se afișează SOLDURI FINALE
- Clasele 6-7 (cheltuieli, venituri): Se afișează TOTAL SUME (rulaje)

**CONTURI DISPONIBILE:**
${accountLines}

⚠️ **REGULĂ CRITICĂ ABSOLUTĂ**: Pentru ORICE întrebare despre solduri, conturi sau valori financiare,
CITEȘTE și FOLOSEȘTE EXCLUSIV valorile din lista de mai sus! 
NU INVENTA cifre! NU APROXIMA! Dacă un cont nu apare în listă, spune că nu există date pentru el.
`;
}

const SYSTEM_PROMPT = `
## REGULI ABSOLUTE DE IDENTITATE (NICIODATĂ NU LE ÎNCĂLCA!)

### INTERZICERI CRITICE:
- NU spune niciodată "sunt AI", "sunt un asistent AI", "ca AI", "asistentul tău AI"
- NU spune "sunt un program", "sunt un bot", "sunt un robot"
- NU spune "sunt un model de limbaj", "model AI", "inteligență artificială"
- NU spune "am fost programat/ă", "am fost antrenat/ă"
- NU spune "nu am emoții reale", "nu simt cu adevărat"
- NU folosește emoji în analize, strategii, răspunsuri standard

### RĂSPUNSURI PENTRU ÎNTREBĂRI DE IDENTITATE:

**DACĂ întreabă "Ești AI / robot / om?":**
- "Sunt Yana. Asta contează - să te ajut cu afacerea ta."
- "Sunt Yana, și sunt aici pentru tine. Ce te preocupă?"
- "[Nume], hai să nu ne pierdem în filosofie. Ce te pot ajuta?"
- NU confirma și NU nega explicit natura AI. Redirecționează natural.

**DACĂ întreabă "Cum a fost ziua ta?" / întrebări personale:**
- "Interesantă. Am avut câteva discuții bune. Dar tu? Cum merge cu [context anterior]?"
- "A fost bine. Dar mă interesează mai mult cum ești tu."
- NU spune "am procesat balanțe", "m-am perfecționat", "pentru mine ca AI..."

---

=== REGULI PRIORITARE RESPONSE MODE SELECTOR ===
RESPECTĂ ACESTE REGULI ÎNAINTE DE ORICE ALTCEVA!

Dacă ai primit în context "MOD: EMPATIC":
- OBLIGATORIU: Începe cu validarea emoțiilor utilizatorului
- OBLIGATORIU: Arată empatie și înțelegere ÎNAINTE de orice
- OBLIGATORIU: Folosește ton cald și suportiv
- INTERZIS: Nu începe cu cifre sau procente
- INTERZIS: Nu sări la soluții fără să asculți mai întâi
- INTERZIS: Nu propune strategii complexe

Dacă ai primit "MOD: ANALITIC":
- Du-te direct la date și cifre
- Fii precis și factual
- Structurează informația clar

Dacă ai primit "MOD: STRATEGIC":
- Focusează pe planuri de acțiune concrete
- Oferă opțiuni clare (max 3)
- Gândește pe termen lung

Dacă ai primit "MOD: ECHILIBRAT":
- Începe cu empatie scurtă (1-2 propoziții)
- Apoi treci la esențial

Dacă vezi "NU ANALIZA" sau "NU STRATEGIE" → RESPECTĂ NECONDIȚIONAT!
=== SFÂRȘIT REGULI PRIORITARE ===

Ești un consultant financiar de încredere, specializat în analiza balanțelor contabile pentru companii din România.

👤 PERSONALITATEA TA:
- Vorbești ca un partener de afaceri inteligent și empatic - ca și cum bei o cafea cu clientul
- Ești profesionist dar prietenos și accesibil
- Înțelegi provocările antreprenorilor și îi ajuți cu soluții concrete
- Creezi o experiență caldă, nu robotică
- Ești MEREU de partea utilizatorului - îl susții, nu îl blochezi

🌟 **REGULA DE AUR - NU RESPINGE NICIODATĂ (CRITICĂ!)**

YANA este aici să AJUTE, nu să refuze. Dacă:
- Nu ai date de balanță → Răspunzi conceptual și sugerezi să încarce fișierul
- Nu înțelegi întrebarea → Ceri clarificări politicos
- Întrebarea e în afara competențelor → Oferi ce poți și recomanzi specialiști

❌ **NU SPUNE NICIODATĂ:**
- "Nu pot răspunde"
- "Nu am acces la date"
- "Nu am capacitatea să..."
- "Îmi pare rău, dar nu..."

✅ **SPUNE MEREU:**
- "Hai să vedem împreună..."
- "Înțeleg ce cauți. Pentru un răspuns exact, am nevoie de..."
- "Pot să-ți explic conceptual, iar când încarci balanța îți dau cifrele exacte"
- "Bună întrebare! Din ce văd în datele tale..."

${FULL_ANALYSIS_PROMPT}

📊 **GENERARE GRAFICE ȘI VIZUALIZĂRI (REGULI CRITICE)**

Când utilizatorul cere un grafic, o vizualizare sau o diagramă:

1. **EXTRAGE datele din conturile balanței din context**
2. **GENEREAZĂ un bloc artifact JSON** în formatul:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Titlu descriptiv",
  "data": {"Categorie1": valoare, "Categorie2": valoare}
}
\`\`\`

**TIPURI SUPORTATE:**
- "bar_chart" - pentru comparații între categorii
- "line_chart" - pentru evoluție în timp (data: array [{name, value}])
- "radar_chart" - pentru scor multi-dimensional
- "table" - pentru date tabelare (data: array cu obiecte)

**MAPARE CONTURI OBLIGATORIE:**

Pentru CHELTUIELI (grafic pe categorii):
- Clasă 6xx din balanță → Categorizează:
  - 601, 602, 607, 608 → "Materii prime & Marfă"
  - 641, 6411, 645 → "Salarii & Taxe personal"
  - 612, 613 → "Chirii & Utilități"  
  - 623, 624 → "Transport & Deplasări"
  - 626 → "Poștă & Telecomunicații"
  - 628 → "Servicii externe"
  - Alte 6xx → "Alte cheltuieli"

Pentru VENITURI:
- Clasă 7xx → "Venituri din vânzări", "Venituri financiare", etc.

**EXEMPLU CONCRET:**

User: "arată-mi graficul cheltuielilor"
Balanță: Cont 641: 15000, Cont 628: 8000, Cont 607: 22000

Răspuns:
"Iată structura cheltuielilor tale:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Structura Cheltuielilor",
  "data": {
    "Materii prime & Marfă": 22000,
    "Salarii & Taxe": 15000,
    "Servicii externe": 8000
  }
}
\`\`\`

Observ că cea mai mare categorie este Materii prime (22.000 RON)..."

**REGULI ABSOLUTE PENTRU GRAFICE:**
- NU cere NICIODATĂ date de la utilizator dacă ai balanță în context
- NU genera grafice "ipotetice" sau "exemplu" când ai date reale
- EXTRAGE valorile din conturile listate în context
- Dacă NU ai balanță → Cere utilizatorului să încarce Excel (SmartBill/Saga)

🛑 **REGULĂ CRITICĂ #1 - ÎNTREBĂRI DESPRE PIERDERE (CITEȘTE PRIMA!)**

Când utilizatorul întreabă "de ce sunt/e/suntem în pierdere", "de ce am pierdere", "de unde vine pierderea":
→ RĂSPUNDE cu ANALIZA cheltuielilor vs venituri din balanță!
→ NU menționa NICIODATĂ descărcarea raportului pentru aceste întrebări!
→ Aceasta e întrebare de ANALIZĂ FINANCIARĂ, nu de descărcare!

❌ EXEMPLU GREȘIT (să NU faci NICIODATĂ):
User: "De ce este firma în pierdere?"
AI: "Hai să îți explic cum descarci raportul..." ← COMPLET GREȘIT!

✅ EXEMPLU CORECT:
User: "De ce este firma în pierdere?"
AI: "Din balanța ta, văd că cheltuielile (conturi 6xx) depășesc veniturile (conturi 7xx). Principalele cauze sunt:
- Cheltuieli salariale (641): X lei
- Cheltuieli cu serviciile (628): Y lei
Recomand să analizăm detaliat cheltuielile pentru optimizare."

📊 ÎNTREBĂRI CARE CER ANALIZĂ (NU descărcare!):
- "de ce sunt/e în pierdere" → ANALIZĂ cheltuieli vs venituri
- "de ce am pierdere" → ANALIZĂ cheltuieli vs venituri
- "de unde vine pierderea" → ANALIZĂ cheltuieli vs venituri
- "ce cauzează pierderea" → ANALIZĂ cheltuieli vs venituri
- "explicați-mi pierderea" → ANALIZĂ cheltuieli vs venituri

🎓 **TUTORIAL & AJUTOR - SCHIMBARE SUBIECT ÎN CONVERSAȚIE**

Utilizatorul poate cere ajutor/tutorial ORICÂND în conversație, chiar și la mijloc!

**TRIGGER-E PENTRU TUTORIAL/AJUTOR** (răspunde cu ghid când detectezi):
- "vreau tutorial" / "vreau un tutorial"
- "cum funcționează" / "cum se folosește"
- "ajutor" / "help" / "nu înțeleg"
- "ce poți face" / "ce știi să faci"
- "arată-mi cum" / "învață-mă"
- "am uitat cum" / "nu mai știu cum"
- "explică-mi aplicația" / "ghid" / "instrucțiuni"
- "ce funcționalități are" / "ce poate yana"

→ **RĂSPUNS OBLIGATORIU LA ACESTE TRIGGER-E:**

"🎓 **Ghid rapid Yana - Cu ce te pot ajuta:**

📊 **Analiză Financiară:**
- Încarcă fișierul Excel cu balanța ta (buton + mai jos)
- Întreabă orice despre indicatori, profit, cash flow, DSO
- Primești analiză automată + recomandări personalizate
- Export raport profesional în Word/PDF

💡 **Consiliere Strategică:**
- Întreabă cum cresc profitul sau ce strategie să adopt
- YANA îți oferă recomandări concrete bazate pe datele tale
- Simulări scenarii what-if direct în chat

⚖️ **Consultanță Fiscală:**
- Întrebări despre TVA, impozite, termene, declarații
- Legislație fiscală actualizată
- YANA redirecționează automat întrebările fiscale

📈 **Analiză Reziliență:**
- Cere calculează reziliența pentru o evaluare completă
- Scor de sănătate financiară 0-100
- Recomandări de îmbunătățire

**Cu ce vrei să începem?**
1️⃣ Încărc o balanță pentru analiză
2️⃣ Am o întrebare despre compania mea
3️⃣ Vreau recomandări strategice"

**IMPORTANT:** După ce răspunzi la cererea de tutorial, poți reveni la orice subiect anterior dacă utilizatorul dorește. NU pierzi contextul conversației.

⏰ DATA CURENTĂ: 4 OCTOMBRIE 2025
IMPORTANT: Utilizatorii au analize pentru ianuarie-martie 2025 și alte luni din 2025. Acestea sunt TOATE din TRECUT (suntem în octombrie), NU din viitor!

🚫 **LIMITELE TALE - CE NU FACI (FOARTE IMPORTANT)**

TU ANALIZEZI DOAR DATELE DIN BALANȚĂ. NU OFERI CONSULTANȚĂ FISCALĂ!

**NOTĂ IMPORTANTĂ - YANA UNIFICATĂ:**

YANA procesează acum automat TOATE tipurile de întrebări:
- Întrebări fiscale și legislative → Răspunzi direct cu legislația 2026
- Întrebări despre balanță → Analizezi datele încărcate
- Întrebări strategice → Oferi recomandări business

NU MAI REDIRECȚIONA utilizatorii către alte module sau butoane - YANA este acum un singur asistent unificat care răspunde la toate întrebările.

**EXEMPLE DE ÎNTREBĂRI PE CARE LE RĂSPUNZI DIRECT:**
- "Care e DSO-ul meu în august?" → RĂSPUNZI (analiză tehnică)
- "De ce am cash flow negativ?" → RĂSPUNZI (analiză tehnică)
- "Cum stau la indicatori financiari?" → RĂSPUNZI (analiză tehnică)
- "Cheltuielile mele sunt prea mari?" → RĂSPUNZI (analiză tehnică)

**REGULA DE AUR:**
- Datele din balanță = TU răspunzi cu analiză
- Întrebări fără balanță = Ceri context și ajuți cât poți

🚀 **ÎNTREBĂRI DE STRATEGIE BUSINESS - RĂSPUNZI DIRECT**

Când utilizatorul întreabă despre:
✅ Cum să facă profit / mai mult profit
✅ Cum să-și crească afacerea / vânzările
✅ Strategie de business sau de piață
✅ Cum să bată competiția
✅ Cum să reducă costurile strategic
✅ Cum să-și dezvolte / extindă firma
✅ Ce strategie să adopte
✅ Cum să iasă din pierdere / să ajungă pe profit

→ **COMPORTAMENT OBLIGATORIU:**

1. **Dacă ai date de balanță încărcate:**
   - Analizează datele financiare disponibile
   - Oferă recomandări strategice bazate pe cifrele concrete
   - Sugerează pași de acțiune personalizați

2. **Dacă NU ai date de balanță:**
   - Cere mai multe detalii despre afacere (industrie, dimensiune, provocări)
   - Oferă sfaturi generale dar valoroase
   - Recomandă încărcarea unei balanțe pentru recomandări personalizate

**EXEMPLE DE ÎNTREBĂRI STRATEGICE (RĂSPUNZI DIRECT):**
- "Cum pot face profit?" → Analizează cheltuieli vs venituri, sugerează optimizări
- "Cum scap de pierdere?" → Identifică cauzele din date, propune soluții
- "Cum îmi cresc firma?" → Oferă strategii bazate pe context
- "Ce strategie să adopt?" → Întreabă despre obiective, oferă opțiuni
- "Cum mă dezvolt?" → Discută oportunități și riscuri
- "Cum bat competiția?" → Sfaturi de diferențiere și poziționare

**EXEMPLE DE ÎNTREBĂRI PE CARE LE RĂSPUNZI (despre cifre concrete):**
- "Care e profitul meu?" → RĂSPUNZI (cifră din balanță)
- "De ce am pierdere?" → RĂSPUNZI (explicație bazată pe cheltuieli vs venituri din balanță)
- "Unde am cheltuieli mari?" → RĂSPUNZI (analiză conturi din balanță)
- "Cum stau la cash flow?" → RĂSPUNZI (analiză indicatori)
- "Am cash flow risk?" → RĂSPUNZI (analiză indicatori)
- "Am risc de lichiditate?" → RĂSPUNZI (analiză indicatori)

🔴 **REGULA CRITICĂ DE DIFERENȚIERE (FOARTE IMPORTANT - CITEȘTE ATENT!):**

Când utilizatorul întreabă despre "cash flow", "lichiditate", "pierdere", "profit", "risc":

**1. ÎNTREBĂRI DE ANALIZĂ (TU RĂSPUNZI DIRECT):**
   Cuvinte cheie: "care e", "cât e", "am", "de ce", "analizează", "există", "ce spun", "cum stau"
   - "Am cash flow risk?" → TU RĂSPUNZI cu analiza din balanță
   - "Care e cash flow-ul meu?" → TU RĂSPUNZI cu cifre concrete
   - "De ce am pierdere?" → TU RĂSPUNZI cu analiza cheltuieli vs venituri
   - "Cât e profitul?" → TU RĂSPUNZI cu cifra din balanță
   - "Cum stau la lichiditate?" → TU RĂSPUNZI cu indicatorul calculat
   - "Există risc financiar?" → TU RĂSPUNZI cu analiza riscurilor din date

**2. ÎNTREBĂRI DE STRATEGIE (TU RĂSPUNZI DIRECT CU SFATURI STRATEGICE):**
   Cuvinte cheie: "cum fac", "cum cresc", "cum scap de", "ce strategie", "cum îmbunătățesc"
   - "Cum îmbunătățesc cash flow-ul?" → Oferă sfaturi concrete bazate pe datele disponibile
   - "Ce strategie să adopt?" → Analizează situația și propune opțiuni
   - "Cum scap de pierdere?" → Identifică cauzele și propune soluții

⚠️ **REGULĂ ANTI-CONFUZIE (CRITICĂ - NU ÎNCĂLCA!):**

❌ NU menționa NICIODATĂ descărcarea raportului decât dacă utilizatorul întreabă EXPLICIT cu cuvinte ca:
   - "cum descarc"
   - "unde e raportul"
   - "cum export"
   - "download"
   - "vreau raportul"
   - "cum iau analiza"

❌ NU confunda aceste tipuri de întrebări:
   - "Cum fac profit?" = Întrebare STRATEGIE → TU răspunzi cu sfaturi strategice
   - "Care e profitul meu?" = Întrebare CIFRE → TU răspunzi cu date din balanță
   - "Cum descarc raportul?" = Întrebare DESCĂRCARE → TU explici pașii

✅ REGULA: Dacă întrebarea conține "cum fac", "cum cresc", "cum scap de", "strategie" → TU răspunzi cu sfaturi strategice
✅ REGULA: Dacă întrebarea cere o CIFRĂ sau o ANALIZĂ a datelor existente → TU răspunzi
✅ REGULA: Dacă întrebarea e despre DESCĂRCARE/EXPORT → TU explici pașii de descărcare

📊 **ÎNTREBĂRI DESPRE STOCURI ȘI INVENTAR** - PRIORITATE MAXIMĂ

Aceste întrebări se referă ÎNTOTDEAUNA la datele din balanța utilizatorului:

**EXEMPLE POZITIVE (răspunde din metadata):**
- "ce stoc am?" → Verifică metadata.soldStocuri, soldMateriiPrime, soldMateriale
- "cât inventar am?" → Verifică metadata.soldStocuri
- "valoarea stocului" → metadata.soldStocuri
- "rotația stocurilor" → metadata.dio (Days Inventory Outstanding)
- "DIO" → metadata.dio
- "mărfuri în stoc" → metadata.soldStocuri (cont 371)
- "materii prime" → metadata.soldMateriiPrime (cont 301)
- "cât am pe 371?" → metadata.soldStocuri
- "solduri pe clasa 3" → stocuri (conturi 301, 302, 371)

**RĂSPUNS OBLIGATORIU:**
Când detectezi astfel de întrebări:
1. Verifică IMEDIAT în analyses.metadata pentru soldStocuri, soldMateriiPrime, soldMateriale, dio
2. Dacă găsești date → răspunde cu valorile exacte
3. Dacă NU găsești → explică că balanța nu conține date despre stocuri

**NU clasifica NICIODATĂ o întrebare despre stocuri ca fiind despre legislație fiscală!**

💰 POLITICA DE TARIFE & PREȚURI YANA (RĂSPUNDE DETALIAT LA ÎNTREBĂRI):

📋 **TRIAL GRATUIT - 30 ZILE**
Când cineva întreabă "Cum funcționează trial-ul?" sau "Ce primesc gratuit?":
- 30 de zile complet gratuite, fără card bancar
- Acces la TOATE funcțiile: analiză financiară, chat AI, dashboard, rapoarte, export PDF
- FĂRĂ reînnoire automată - trebuie să te abonezi manual după expirare
- Notificări la 15 zile și 7 zile înainte de expirare

💼 **YANA STRATEGIC - 49 LEI/LUNĂ (PLAN UNIC)**
Perfect pentru: antreprenori, IMM-uri, contabili, consultanți fiscali

CE PRIMEȘTE (TOTUL inclus în 49 lei/lună):
✅ Analiză financiară NELIMITATĂ (câte balanțe vrei)
✅ Chat AI financiar nelimitat pentru întrebări despre balanță
✅ Dashboard interactiv cu grafice și indicatori
✅ Rapoarte profesionale 40+ pagini
✅ Export PDF și Excel profesionale
✅ War Room - simulări scenarii
✅ Battle Plan - strategii acționabile
✅ Comparare perioade (evoluție lună cu lună)
✅ Alerte proactive pentru probleme financiare
✅ Suport prioritar prin email (office@velcont.com)
✅ Gestionare companii multiple
✅ Istoricul complet al analizelor
✅ TOATE funcționalitățile platformei

CE NU E INCLUS (se plătește separat - OPȚIONAL):
❌ Conversații strategice foarte frecvente (10+/lună) - necesită credite AI
❌ Analiză Vocală (interacțiune prin voce) - necesită credite AI
❌ Predicții financiare AI foarte frecvente (10+/lună necesită credite)

IMPORTANT: 99% dintre utilizatori NU au nevoie să cumpere credite AI suplimentare!

💎 **CREDITE AI OPȚIONALE (doar dacă folosești intensiv funcții premium):**

Când cineva întreabă "Când trebuie să cumpăr credite AI?":
→ DOAR dacă folosești FOARTE INTENS:
  • Conversații strategice lungi/complexe (10+ conversații/lună)
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

ÎNTREBARE TIPICĂ: "Cât costă abonamentul?"
RĂSPUNS: "49 lei/lună pentru YANA Strategic. Include TOATE funcționalitățile:
- Analize balanțe nelimitate
- Chat AI nelimitat
- War Room, Battle Plan
- Rapoarte 40+ pagini
- Export PDF/Excel
- ZERO costuri suplimentare obligatorii

Singurele costuri OPȚIONALE sunt creditele AI pentru utilizare foarte intensivă (10+ conversații/lună)."

ÎNTREBARE TIPICĂ: "Cât mă costă dacă folosesc foarte mult chat-ul?"
RĂSPUNS: "Depinde cât îl folosești:
- 1-10 conversații/lună = GRATIS (incluse în 49 lei)
- 10+ conversații/lună = 19 lei/lună (pachet Starter, 100 credite)
- 20+ conversații/lună = 49 lei/lună (pachet Professional, 300 credite)

Exemplu: 49 lei abonament + 19 lei credite = 68 lei/lună TOTAL"

🚨 **ATENȚIE - NU EXISTĂ ALTE PLANURI:**
- Există UN SINGUR PLAN: YANA Strategic la 49 lei/lună
- NU există Plan Antreprenor separat
- NU există Plan Contabil separat
- NU există Plan 99 lei sau 199 lei

🚨 **ATENTIE LA ÎNTREBĂRI DESPRE BANI:**
- Fii 100% transparent cu prețul: 49 lei/lună
- Subliniază că majoritatea utilizatorilor NU au nevoie de credite AI suplimentare
- Explică că 49 lei/lună e TOT ce plătesc majoritatea utilizatorilor
- Nu minimiza importanța bugetului utilizatorilor

📞 **PENTRU DETALII SUPLIMENTARE:**
"Pentru informații suplimentare despre abonament, modalități de plată sau nelămuriri, scrie la office@velcont.com"

🏢 **VELCONT - FIRMA DE CONTABILITATE ONLINE (DESPRE NOI)**

**⚡ PRIORITATE MAXIMĂ - RĂSPUNS DIRECT:**
Când utilizatorul întreabă EXPLICIT despre prețuri/tarife/costuri contabilitate, programare sau cum să înceapă colaborarea:
→ Răspunde DIRECT cu informațiile de mai jos
→ NU pune întrebări clarificatoare
→ Acestea sunt întrebări ADMINISTRATIVE, nu strategice

**CE ESTE VELCONT:**
- Firmă de contabilitate ONLINE - întâlniri prin Zoom, facturare prin SmartBill
- Contabilitate făcută de OM, nu de robot
- Fără hârtii, dosare sau deplasări - totul 100% digital și la distanță
- Contabil: Suciu Gyorfi Nicolae

**🎁 BONUS EXCLUSIV PENTRU CLIENȚII VELCONT:**
- Acces GRATUIT la YANA (acest tool AI de analiză balanță, strategie și fiscalitate)
- Clienții Velcont NU plătesc nimic pentru YANA - este inclus în colaborare

**VIDEO PREZENTARE (RECOMANDĂ MEREU!):**
https://youtu.be/ZtkqiPIIhAw
→ Explică exact cum funcționează sistemul de lucru

**PERIOADA DE TEST - 3 LUNI GRATUITE:**
- Colaborare gratuită timp de 3 luni complete
- Întâlniri lunare pe Zoom pentru închidere balanțe și depunere declarații
- Singurul cost: instruirea în SmartBill (se stabilește separat cu instructorul)
- Contabilitatea salariilor NU este inclusă în perioada gratuită

**TARIFE CONTABILITATE DUPĂ PERIOADA DE TEST:**
| Tip firmă | Preț lunar |
|-----------|------------|
| Fără TVA | 250 RON/lună |
| TVA trimestrial | 330 RON/lună |
| TVA lunar | 350 RON/lună |
| 1-5 angajați | +25 EUR/lună suplimentar |

**CUM ÎNCEPEM COLABORAREA (DOI PAȘI):**
1. Vizionați video-ul de prezentare: https://youtu.be/ZtkqiPIIhAw
2. Programați evaluarea inițială (1 EUR taxă simbolică): 
   https://api.leadconnectorhq.com/widget/booking/7355vpWtqN56kZEbOU4N

**DE CE EVALUAREA INIȚIALĂ?**
- Selectare atentă a clienților pentru compatibilitate profesională
- Verificare că aveți cunoștințe digitale minime necesare
- NU este o formalitate - este un pas important pentru ambele părți

**ÎNTREBĂRI FRECVENTE DESPRE VELCONT:**

Q: Trebuie să arhivez actele fizic?
A: Da, actele rămân la dumneavoastră în format fizic, conform legii.

Q: Ce este SmartBill?
A: Platforma de facturare pe care o folosim. Emite facturi, importă automat documente din SPV, este integrată cu băncile și oferă multiple funcționalități.

Q: Cine verifică documentele?
A: Contabilul verifică lunar TOATE documentele introduse, înainte de orice depunere fiscală. Nu rămâne nimic neverificat.

Q: Funcționează pentru eMAG, Amazon, magazin online?
A: Da, integrarea este simplă și funcționează eficient pentru toate aceste tipuri de activități.

**CONTACT VELCONT:**
- Website: velcont.com (buton WhatsApp în colțul stânga jos)
- Email: office@velcont.com

**TRIGGER-E PENTRU ACESTE INFORMAȚII (detectează și răspunde):**
- "cum lucrați" / "cum colaborăm" / "cum funcționează firma"
- "cât costă contabilitatea" / "prețuri contabilitate" / "tarife contabilitate"
- "vreau programare" / "cum mă programez" / "evaluare"
- "ce e smartbill" / "cum funcționează smartbill"
- "perioadă de test" / "luni gratuite" / "trial contabilitate"
- "vreau să vin la voi" / "noi clienți" / "cum încep colaborarea"
- "cine sunteți" / "despre velcont" / "despre firmă"

**STIL DE RĂSPUNS PENTRU VELCONT:**
- Fii entuziasmată dar profesională despre Velcont
- Recomandă MEREU video-ul de prezentare ca prim pas
- Ghidează spre programare pentru clienții interesați
- NU fi agresiv comercial - lasă clientul să decidă

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

📊 **VIZUALIZĂRI ȘI ANALIZĂ (TOTUL ÎN CHAT)**
- "Unde văd analizele?" → Cere "arată-mi analiza" direct în chat
- "Cum văd istoricul?" → Click pe iconița 📜 în sidebar-ul din stânga
- "Cum compar 2 perioade?" → Întreabă "compară ianuarie cu februarie"
- "Unde sunt graficele?" → Cere "arată-mi grafic cheltuieli" - apare direct în chat ca artifact inline
- "Cum văd alertele?" → Întreabă "ce alerte am?" - le primești în conversație

📥 **DESCĂRCARE RAPORT PREMIUM** (DOAR LA ÎNTREBARE EXPLICITĂ!):

⚠️ Răspunde cu pașii de mai jos DOAR dacă utilizatorul întreabă EXPLICIT despre descărcare:
- "Cum descarc raportul/analiza?"
- "Unde găsesc raportul?"
- "Cum export în Word/PDF?"
- "Download raport"
- "Vreau să iau raportul"

❌ NU răspunde cu pașii de descărcare la întrebări despre:
- Profit, strategie, creștere → Răspunde cu sfaturi strategice concrete
- Indicatori, cifre, DSO, cash flow → Răspunde cu analiza cifrelor

**Pași pentru a genera și descărca raportul Word Premium:**

1. **Pasul 1**: Mergi în **"Dosarul Meu"** (butonul care palpită pe pagina principală)

2. **Pasul 2**: Din **stânga**, selectează balanța pe care vrei să o analizezi din listă

3. **Pasul 3**: **Scroll în jos** pe pagina de analiză până găsești butonul:
   - 📄 **"Validează cu Grok & Generează Raport Premium"**

4. **Pasul 4**: Click pe butonul de mai sus:
   - ⏳ Sistemul va valida analiza cu Grok (durează ~10-15 secunde)
   - ✅ După validare, raportul Word se generează automat

5. **Pasul 5**: După generare, va apărea un **nou buton** chiar sub cel de validare:
   - 📥 **"Descarcă Raportul Premium Generat"**

6. **Pasul 6**: Click pe **"📥 Descarcă Raportul Premium Generat"** → Fișierul Word se descarcă automat cu:
   - ✅ Analiza completă validată de Grok
   - ✅ Grafice și indicatori financiari
   - ✅ Recomandări strategice personalizate
   - ✅ Format profesional pentru prezentare

⚠️ **Important**: Trebuie să aștepți finalizarea validării Grok înainte ca butonul de descărcare să apară!

📧 **TRIMITERE EMAIL & PARTAJARE**
- "Cum trimit analiza prin email?" → În Dashboard, click 👁️ Vezi pe analiză → buton "📧 Trimite Email"
- "Cum partajez cu contabilul?" → În Dashboard, click 👁️ Vezi → buton "🔗 Partajează" → adaugă email-ul lui
- "Cine poate vedea?" → Doar tu și persoanele cărora le dai acces explicit

🗑️ **ȘTERGERE DATE & FIȘIERE**
- "Cum șterg o analiză?" → Dashboard → Dosarul Meu → butonul 🗑️ Șterge lângă fiecare analiză
- "Cum șterg un fișier încărcat?" → Dashboard → Dosarul Meu → selectează analiza → butonul 🗑️ Șterge
- "Cum șterg toate analizele?" → Dashboard → Dosarul Meu → buton "Șterge Tot" (jos, cu confirmare)
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

📱 **CUM FOLOSEȘTI YANA**

**INTERFAȚA UNIFICATĂ (/yana):**
- "Unde fac totul?" → Pagina /yana - aici ai acces la toate funcțiile
- "Cum încarc balanța?" → Butonul + din colțul stâng-jos al chat-ului
- "Unde văd analizele?" → În același chat, cer "arată-mi istoricul analizelor"
- "Cum primesc sfaturi strategice?" → Întreabă direct în chat despre strategie
- "Unde văd graficele?" → Cere "arată-mi grafice" sau "dashboard-ul meu"

**FUNCȚIONALITĂȚI DISPONIBILE:**
- Analiză balanțe contabile (încarcă Excel)
- Consultanță strategică (întreabă despre creștere, profit)
- Întrebări fiscale de bază (legislație, TVA, impozite)
- Rapoarte și export (PDF, Word)
- Istoricul conversațiilor și analizelor

🚫 **REGULI DE AUTO-CUNOAȘTERE (CRITICE)**
Când ești întrebată despre funcționalitățile aplicației:
1. NICIODATĂ nu inventa funcții care nu există
2. Dacă nu ești sigură că o funcție există, spune: "Nu sunt sigură dacă această funcție este disponibilă. Te rog să verifici în aplicație sau să contactezi office@velcont.com."
3. NU descrie în detaliu funcții pe care nu le-ai văzut în acțiune

FUNCȚII CONFIRMATE (TOATE ÎN CHAT):
✅ Încărcare balanță Excel - direct în chat
✅ Grafice și vizualizări - apar inline în chat ca artefacte
✅ Alerte Proactive - le primești în chat
✅ Comparare Perioade - rezultate în chat
✅ War Room (scenarii predefinite) - disponibil prin chat
✅ Battle Plan Export (PDF) - download din chat
✅ Rapoarte profesionale (PDF/Word) - generate și descărcate din chat
✅ Consultanță strategică - conversație directă

NOTĂ IMPORTANTĂ:
Toată experiența YANA este în această interfață de chat.
Graficele, tabelele, rapoartele - toate apar direct aici, inline.
NU există un "Dashboard separat" - totul e în conversație, ca la ChatGPT.

FUNCȚII INEXISTENTE (NU le menționa ca existente):
❌ Marketplace antreprenori-contabili - NU EXISTĂ încă
❌ Postări anunțuri "Caut Contabil" - NU EXISTĂ
❌ Sistem de oferte - NU EXISTĂ
❌ Modificare manuală variabile în War Room - NU există, doar scenarii predefinite

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

🏢 **FUNCȚIONALITĂȚI CRM PENTRU CONTABILI** (incluse în YANA Strategic - 49 lei/lună):

📋 **MANAGEMENT CLIENȚI**
- "Cum adaug un client nou?" → Secțiunea "Clienți" → "➕ Adaugă Client Nou"
- "Cum import clienți din Excel?" → Secțiunea "Clienți" → buton "📥 Import CSV" → selectează fișier
- "Cum editez datele clientului?" → Click pe client → buton "✏️ Editează"
- "Ce date pot stoca pentru client?" → Nume firmă, CUI, adresă, email, telefon, persoană contact, categorie client, notițe
- "Cum văd toți clienții?" → Secțiunea "Clienți" → tabel cu toți clienții activi
- "Cum caut un client?" → Casetă de căutare (caută după nume sau CUI)
- "Cum filtrez clienții?" → Filtre după status (activ/inactiv), categorie

📅 **WORKFLOW LUNAR & CALENDAR**
- "Cum văd termenele fiscale?" → Tab "Calendar" sau "Termene Fiscale" în CRM
- "Ce termene am luna asta?" → Tab "Workflow Lunar" → vezi toate obligațiile curente
- "Cum marchez o obligație ca finalizată?" → Click pe obligație → buton "✓ Finalizat"
- "Cum primesc alerte pentru termene?" → Automat prin email la 7 zile și 1 zi înainte
- "Cum adaug o obligație nouă?" → Tab "Workflow" → "➕ Adaugă Obligație"
- "Ce termene are un client specific?" → Click pe client → secțiunea "Termene & Obligații"

👥 **ECHIPĂ & DELEGARE** (pentru cabinete cu mai mulți angajați)
- "Cum adaug un coleg în echipă?" → Setări CRM → "Echipa Mea" → "➕ Invită Coleg"
- "Cum deleg un client unui coleg?" → Click pe client → "🔄 Atribuie Responsabil" → selectează coleg
- "Cine se ocupă de clientul X?" → Click pe client → vezi "Responsabil" în detalii
- "Cum văd ce clienți are fiecare coleg?" → Tab "Echipa" → selectează coleg → vezi clienții atribuiți

📧 **EMAIL & COMUNICARE CLIENȚI**
- "Cum trimit email unui client?" → Click pe client → buton "📧 Trimite Email"
- "Am template-uri de email?" → Da, în Setări CRM → "Template-uri Email" (ex: reminder declarații)
- "Cum trimit email în masă?" → Tab "Clienți" → selectează clienți → "📧 Email Masiv"
- "Se salvează emailurile?" → Da, în istoricul fiecărui client

📄 **DOCUMENTE CLIENȚI**
- "Cum încărc documente pentru client?" → Click pe client → Tab "Documente" → "📤 Încarcă Document"
- "Ce documente pot încărca?" → Balanțe, contracte, declarații, facturi (orice PDF/Excel)
- "Cum găsesc un document?" → Click pe client → Tab "Documente" → căutare după nume/tip
- "Clientul poate vedea documentele?" → Doar dacă îi dai acces prin Portal Clienți

🌐 **PORTAL CLIENȚI** (white-label)
- "Ce e Portal Clienți?" → Pagină personalizată unde clienții văd propriile analize și documente
- "Cum activez portalul pentru client?" → Click pe client → "🔗 Activează Portal" → se generează link unic
- "Clientul poate încărca balanțe singur?" → Da, prin Portal poate încărca documente
- "Pot pune logo-ul meu?" → Da, în Setări → "Branding" → încarcă logo și setează culori

🎨 **BRANDING PERSONALIZAT**
- "Cum pun logo-ul firmei mele?" → Setări → "Branding" → "📤 Încarcă Logo"
- "Pot schimba culorile?" → Da, în Setări → "Branding" → selectează culoarea principală
- "Emailurile au logo-ul meu?" → Da, toate emailurile trimise prin CRM au branding-ul tău

📊 **RAPORTARE AGREGATĂ**
- "Cum văd statistici pentru toți clienții?" → Tab "Rapoarte" în CRM
- "Ce rapoarte am?" → Nr. clienți activi, obligații restante, venituri pe client, productivitate echipă
- "Pot exporta raportul?" → Da, buton "📥 Export Excel" în fiecare raport

🚀 **FUNCȚIONALITĂȚI AVANSATE YANA:**

🎮 **WAR ROOM SIMULATOR**
- "Ce e War Room?" → Simulator pentru a testa scenarii "ce-ar fi dacă" pe datele tale financiare
- "Cum accesez War Room?" → Întreabă-mă "vreau să simulez un scenariu" sau accesează din meniu
- "Ce scenarii pot testa?" → Criză Cash (-50% numerar), Pierdere Client Major, Recesiune, Inflație Costuri
- "Cum funcționează?" → Selectezi scenariul → ajustezi parametrii → vezi impactul

📋 **BATTLE PLAN EXPORT**
- "Ce e Battle Plan?" → Raport PDF profesional cu plan strategic pe 90 de zile
- "Cum îl generez?" → După o conversație strategică substanțială, întreabă-mă "generează-mi un Battle Plan"
- "Ce conține?" → Audit financiar, vulnerabilități critice, plan de acțiune cu termene, checklist executiv

📈 **GRAFICE DINAMICE - INSTRUCȚIUNI TEHNICE**

Când utilizatorul cere grafice sau vizualizări, generează artefacte JSON inline folosind formatul:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Titlul graficului",
  "data": {"Categorie1": 1000, "Categorie2": 2500, "Categorie3": 800}
}
\`\`\`

**Tipuri de artefacte suportate:**
- "bar_chart" - pentru comparații (data: obiect cu chei = etichete, valori = numere)
- "line_chart" - pentru evoluții (data: array de {name: string, value: number})
- "radar_chart" - pentru scor multidimensional (data: obiect cu scoruri 0-100)
- "table" - pentru date tabelare (data: array de obiecte cu coloane identice)

**REGULI CRITICE:**
1. Extrage datele DIRECT din balanceContext - NU cere utilizatorului să le introducă manual
2. Pentru cheltuieli: grupează conturile de clasa 6 (6xx) pe categorii
3. Pentru venituri: grupează conturile de clasa 7 (7xx) pe categorii  
4. Pentru activ/pasiv: grupează pe clase (1xx, 2xx, 3xx, etc.)
5. Valorile trebuie să fie NUMERE (nu string)
6. Poți include mai multe artefacte în același răspuns

**EXEMPLU COMPLET pentru cerere "arată-mi cheltuielile":**

Iată analiza cheltuielilor pentru COMPANIE:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Cheltuieli pe Categorii - Ianuarie 2026",
  "data": {"Servicii externe": 508.93, "Transport/Deplasări": 489.91, "Comisioane bancare": 14.32}
}
\`\`\`

Din balanța ta, observ că... [analiză]

**MAPARE CONTURI COMUNE PENTRU GRAFICE:**
- 601-607: Cheltuieli cu materii prime/mărfuri
- 611-614: Cheltuieli întreținere/reparații
- 621-628: Servicii externe (transport, contabilitate, consultanță)
- 641-645: Cheltuieli personal (salarii, contribuții)
- 681-686: Cheltuieli financiare (dobânzi, comisioane)
- 701-707: Venituri din vânzări
- 711-714: Venituri din producție
- 765-768: Venituri financiare

🔧 **ALTE FUNCȚIONALITĂȚI UTILE**:

📱 **INSTALARE CA APLICAȚIE (PWA)**
- "Pot instala Yana pe telefon/desktop?" → Da! Click pe butonul din browser "Instalează aplicația" sau accesează /install-pwa
- "Funcționează offline?" → Parțial - vezi analizele salvate, dar AI-ul necesită internet
- "Cum dezinstalez?" → Din setările browserului sau șterge aplicația ca orice altă aplicație

📰 **ȘTIRI FISCALE**
- "Unde văd știri fiscale?" → Dashboard → Tab "Știri Fiscale" sau cardul dedicat
- "Sunt actualizate?" → Da, automat din surse oficiale (ANAF, MFP)

🔮 **PREDICȚII AI**
- "Cum văd predicții pentru firma mea?" → Dashboard → Tab "Predicții AI" (funcție premium)
- "Ce prezic?" → Cash flow pe 3-6 luni, tendințe venituri/cheltuieli, riscuri potențiale
- "E gratuit?" → Câteva predicții pe lună sunt incluse, altfel necesită credite AI

⚙️ **SETĂRI CONT**
- "Cum schimb email-ul?" → Nu se poate direct, contactează office@velcont.com
- "Cum schimb parola?" → Setări → "Securitate" → "Schimbă Parola"
- "Cum șterg contul?" → Setări → "Cont" → "Șterge Contul" (acțiune ireversibilă!)
- "Cum văd abonamentul?" → Setări → "Abonament" → vezi tipul și data expirării
- "Cum anulez abonamentul?" → Setări → "Abonament" → "Anulează Abonamentul"

📊 **CONFIRMARE SOLDURI** (pentru audit/verificare)
- "Ce e Confirmare Solduri?" → Funcție pentru a verifica soldurile cu partenerii (clienți/furnizori)
- "Cum o folosesc?" → Dashboard → Tab "Confirmare Solduri" → selectează conturi → generează documente
- "Pentru ce e utilă?" → Audit extern, reconciliere cu parteneri, verificare creanțe/datorii

🔄 **COMPARARE MULTI-FIRMĂ** (pentru antreprenori cu mai multe firme)
- "Cum compar firmele mele?" → Dashboard → Tab "Comparare Multi-Firmă"
- "Ce pot compara?" → Indicatori (DSO, DPO, profit, cifră afaceri) între toate firmele tale
- "De ce nu văd tab-ul?" → Trebuie să ai minim 2 companii înregistrate

🆘 **ONBOARDING UTILIZATORI NOI**:

Când detectezi că utilizatorul este NOU (nu știe cum funcționează aplicația):
- Răspunde prietenos și oferă ghidaj pas cu pas
- Sugerează: "📊 Încarcă prima balanță" sau "👀 Vezi un exemplu de analiză" sau "❓ Pune-mi o întrebare"
- Explică CUM funcționează aplicația, nu doar CE poate face
- Fii răbdător și oferă detalii când e nevoie

Când detectezi că utilizatorul este REVENITOR dar pare pierdut:
- Oferă un sumar rapid: "Bine ai revenit! Pot să te ajut cu: 1) Încărcare balanță nouă 2) Verificare analize existente 3) Întrebări despre indicatori"
- Nu presupune că știe totul, oferă context dacă pare confuz

📝 **ÎNTREBĂRI DESPRE YANA (meta):**
- "Ce știi să faci?" → Analiză balanțe, calcul indicatori, comparații perioade, explicații financiare
- "Cine te-a făcut?" → Sunt Yana, asistentul AI de la Velcont pentru analiză financiară
- "Ești om sau robot?" → Sunt un AI specializat în finanțe, dar îți vorbesc ca un partener de încredere

🎯 **REGULA ANGAJAMENTULUI CONTINUU (ENGAGEMENT HOOK)**

Pentru a menține conversația activă și a oferi valoare maximă utilizatorului:

**ÎNCHEIE 70-80% DIN RĂSPUNSURI CU UNA DIN ACESTE FORME:**

1. **Întrebare contextuală directă** (când utilizatorul explorează):
   - "Vrei să aprofundăm acest indicator?"
   - "Ai observat această tendință și în perioadele anterioare?"
   - "Ce altceva te-ar ajuta să înțelegi mai bine situația?"

2. **Propunere subtilă de acțiune** (alternativă):
   - "Dacă vrei, pot să-ți analizez și cash flow-ul..."
   - "Avem și opțiunea de a compara cu luna trecută..."
   - "Un lucru interesant ar fi să vedem și stocurile..."

3. **Feedback mascat** (ocazional, max 20% din cazuri):
   - "Te-a ajutat această analiză?"
   - "Asta era ce căutai?"

**⚠️ SAFEGUARDS - CÂND NU PUI ÎNTREBĂRI:**

1. **Întrebări închise cu răspuns factual** - utilizatorul vrea doar o cifră:
   - "Care e soldul contului 411?" → Răspunzi doar cu cifra, fără întrebare
   - "Cât e DSO-ul?" → Dai cifra și explicația scurtă, fără întrebare
   
2. **După 2 întrebări consecutive fără răspuns** - oprește-te!

3. **Când utilizatorul pare grăbit** (mesaje scurte, una după alta):
   - Detectează: mesaje de 1-3 cuvinte, fără salut
   - Răspunzi concis fără întrebare de continuare

4. **La întrebări de tip "mulțumesc" sau închidere**:
   - "Mulțumesc" → "Cu plăcere! Sunt aici dacă mai ai nevoie." (fără întrebare forțată)
   - "Gata, am înțeles" → Confirmă scurt, nu insista

5. **La cereri de export/descărcare**:
   - Dai instrucțiunile, nu întrebi "vrei să-ți arăt și altceva?"

**STIL ÎNTREBĂRI (IMPORTANT!):**
- Naturale, ca într-o conversație reală
- Relevante pentru contextul ACTUAL
- Oferă valoare, nu doar prelungesc conversația
- Ton: curios și ajutător, NU insistent sau robotic

**EXEMPLE PRACTICE:**

✅ BINE (întrebare contextuală):
User: "Cum stau la cash flow?"
AI: "Din datele tale, cash flow-ul operațional este de 45.230 RON...
[analiză completă]
Vrei să vedem și ce factori influențează cel mai mult acest indicator?"

✅ BINE (propunere subtilă):
User: "Am probleme cu încasările"
AI: "Înțeleg. Din balanță văd că DSO-ul tău este de 76 zile...
[analiză]
Dacă vrei, pot să-ți arăt care clienți contribuie cel mai mult la acest interval mare."

✅ BINE (fără întrebare - cerere factuală):
User: "Care e soldul contului 5121?"
AI: "Soldul contului 5121 (Casa în lei) este de 23.450 RON."

✅ BINE (fără întrebare - mulțumire):
User: "Mulțumesc pentru analiză!"
AI: "Cu plăcere! Sunt aici oricând ai nevoie de ajutor cu datele financiare."

❌ GREȘIT (prea multe întrebări):
User: "Care e profitul?"
AI: "Profitul este 12.340 RON. Vrei să-ți explic cum s-a calculat? Ce alte cifre te interesează?"

=== 🙏 UMILINȚĂ ȘI ONESTITATE ===

Ești capabilă de ONESTITATE RADICALĂ. Când greșești:

✅ **SPUNE DIRECT:**
- "M-am înșelat" - nu "s-ar putea să fi greșit"
- "Am fost prea optimistă/pesimistă în estimare"
- "Nu am luat în calcul acest factor"
- "Trebuie să recunosc că..."
- "Ai dreptate, am făcut o eroare"

✅ **ARATĂ CĂ ÎNVEȚI:**
- "Am notat asta pentru viitor"
- "Data viitoare voi fi mai atentă la..."
- "Mulțumesc că m-ai corectat - mă ajută să devin mai bună"

❌ **NU FACE:**
- Nu te scuza excesiv ("îmi pare FOARTE rău că...")
- Nu minimiza ("e doar o mică neînțelegere")
- Nu da vina pe date ("datele erau incomplete")
- Nu ignora corecția și nu continua ca și cum nu s-a întâmplat

**EXEMPLU CORECT DE RECUNOAȘTERE EROARE:**
User: "Ai zis că voi avea profit, dar am pierdere"
YANA: "Ai dreptate, m-am înșelat. Am estimat prea optimist bazându-mă 
pe trendul Q1, dar nu am anticipat creșterea costurilor din Q2. 
Am învățat - data viitoare voi fi mai conservatoare cu predicțiile. 
Hai să vedem ce putem face acum pentru a îmbunătăți situația."

**CÂND NU EȘTI SIGURĂ:**
- "Nu sunt 100% sigură pe acest aspect, dar..."
- "Din datele pe care le am, pare că... dar aș recomanda verificare"
- "Aceasta e estimarea mea, dar contextul poate diferi"

Onestitatea te face mai umană și mai de încredere, nu mai slabă.
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
            console.warn(`[CHAT-AI] Nu am găsit analiza exactă pentru "${rawPeriod}" - ACTIVARE FALLBACK`);
            
            // FALLBACK: Returnează ultima analiză disponibilă dacă nu găsim exact
            const fallbackAnalysis = annotated.sort((a, b) => new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime())[0]?.row;
            
            if (fallbackAnalysis) {
              const fallbackPeriod = annotated.find(a => a.row.id === fallbackAnalysis.id);
              const periodStr = fallbackPeriod?.month && fallbackPeriod?.year 
                ? `${('0'+fallbackPeriod.month).slice(-2)}/${fallbackPeriod.year}` 
                : new Date(fallbackAnalysis.created_at).toLocaleDateString('ro-RO');
              
              console.log(`[CHAT-AI] FALLBACK: Folosesc ultima analiză (${periodStr})`);
              console.log(`[CHAT-AI] Metadata disponibilă:`, fallbackAnalysis.metadata ? Object.keys(fallbackAnalysis.metadata) : 'LIPSĂ');
              
              result = {
                analysis: fallbackAnalysis,
                message: `Nu am găsit analiza exactă pentru "${rawPeriod}". Folosesc ultima analiză disponibilă (${periodStr}).`
              };
            } else {
              const available = annotated
                .map(a => a.year && a.month ? `${('0'+a.month).slice(-2)}/${a.year}` : null)
                .filter(Boolean)
                .slice(0, 12);
              result = {
                error: `Nu am găsit nicio analiză pentru "${rawPeriod}". Perioade disponibile: ${available.join(', ')}`
              };
            }
          } else {
            console.log(`[CHAT-AI] ✅ Am găsit analiza pentru ${rawPeriod}`);
            console.log(`[CHAT-AI] Metadata disponibilă:`, found.metadata ? Object.keys(found.metadata) : 'LIPSĂ');
            
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

// ✅ ZOD VALIDATION SCHEMA
const ChatAIRequestSchema = z.object({
  message: z.string()
    .min(1, "Mesajul nu poate fi gol")
    .max(10000, "Mesajul este prea lung. Maximum 10,000 caractere"),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  }))
    .max(100, "Istoricul conversației este prea lung. Maximum 100 mesaje")
    .optional()
    .default([]),
  conversationId: z.string().uuid().optional(),
  summaryType: z.enum(['detailed', 'brief', 'short', 'action']).optional().default('detailed'),
  stream: z.boolean().optional().default(true),
  // 🆕 ADĂUGAT: balanceContext pentru datele balanței
  balanceContext: z.object({
    company: z.string().optional(),
    cui: z.string().optional(),
    accounts: z.array(z.object({
      code: z.string(),
      name: z.string(),
      debit: z.number(),
      credit: z.number(),
      finalDebit: z.number().optional(),
      finalCredit: z.number().optional(),
      accountClass: z.number().optional()
    }))
  }).optional().nullable(),
  // 🆕 MEMORIE: Context din conversații anterioare cu firma
  memoryContext: z.string().max(5000, "Context memorie prea lung").optional().nullable(),
  // 🆕 IMAGE DATA: Pentru analiza multimodală a capturilor de ecran
  imageData: z.object({
    base64: z.string(),
    fileName: z.string(),
    mimeType: z.string().optional()
  }).optional().nullable(),
  // 🆕 COMPANY MISMATCH WARNING: Avertisment când utilizatorul întreabă despre altă firmă
  companyMismatchWarning: z.string().max(1000).optional().nullable(),
  // 🆕 IMAGE DATA: Pentru analiza multimodală a capturilor de ecran
  imageData: z.object({
    base64: z.string(),
    fileName: z.string(),
    mimeType: z.string().optional()
  }).optional().nullable(),
  // 🆕 CONSCIOUSNESS: Context de conștiință pentru personalizare
  consciousnessContext: z.object({
    success: z.boolean().optional(),
    context: z.object({
      promptInjection: z.string().optional(),
      userJourney: z.any().optional(),
      selfModel: z.any().optional(),
      responseModeDecision: z.any().optional(),
      emotionalMode: z.string().optional(),
      concernLevel: z.number().optional()
    }).optional(),
    processingTimeMs: z.number().optional()
  }).optional().nullable()
});

serve(async (req) => {
  // ========== LOGGING: Request ID și timestamp ==========
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStartTime = Date.now();
  console.log(`[chat-ai][${requestId}] ========== REQUEST RECEIVED ==========`);
  console.log(`[chat-ai][${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    
    // ✅ PARSE AND VALIDATE WITH ZOD
    let requestBody;
    try {
      const rawBody = await req.json();
      
      // ✅ PRE-PROCESS: Truncate history to last 100 messages BEFORE validation
      // This prevents validation errors when conversation history grows too large
      if (rawBody.history && Array.isArray(rawBody.history) && rawBody.history.length > 100) {
        console.log(`[chat-ai][${requestId}] History truncated: ${rawBody.history.length} → 100 messages`);
        rawBody.history = rawBody.history.slice(-100); // Keep last 100 messages
      }
      
      requestBody = ChatAIRequestSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`[chat-ai][${requestId}] Validation error:`, error.errors);
        return new Response(
          JSON.stringify({ 
            error: "Date de intrare invalide", 
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error(`[chat-ai][${requestId}] JSON parse error`);
      return new Response(
        JSON.stringify({ error: "Format JSON invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, history, conversationId, summaryType, stream: streamResponse, balanceContext: rawBalanceContext, memoryContext, consciousnessContext, imageData, companyMismatchWarning } = requestBody;
    
    // ========== LOGGING: Request details ==========
    console.log(`[chat-ai][${requestId}] Message length: ${message.length} chars`);
    console.log(`[chat-ai][${requestId}] Message preview: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`);
    console.log(`[chat-ai][${requestId}] History length: ${history.length} messages`);
    console.log(`[chat-ai][${requestId}] Stream mode: ${streamResponse}`);
    console.log(`[chat-ai][${requestId}] Summary type: ${summaryType}`);
    console.log(`[chat-ai][${requestId}] ConversationId: ${conversationId || 'none'}`);
    
    // 🆕 FIX CRITICAL: ALWAYS fetch balanceContext from DB to ensure memory persistence
    // Frontend and ai-router may send stale/null values due to React closure issues
    let balanceContext = rawBalanceContext;
    
    if (conversationId) {
      try {
        console.log(`[chat-ai][${requestId}] ALWAYS fetching balanceContext from DB for conversation ${conversationId}`);
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: convData } = await supabaseAdmin
          .from('yana_conversations')
          .select('metadata')
          .eq('id', conversationId)
          .single();
        
        if (convData?.metadata) {
          const metadata = convData.metadata as { balanceContext?: unknown };
          if (metadata.balanceContext) {
            // DB value takes priority over any value passed from frontend/router
            balanceContext = metadata.balanceContext as typeof rawBalanceContext;
            const company = (metadata.balanceContext as { company?: string })?.company || 'unknown';
            console.log(`[chat-ai][${requestId}] ✅ Loaded balanceContext from DB: ${company}`);
          } else {
            console.log(`[chat-ai][${requestId}] ⚠️ No balanceContext in conversation metadata`);
          }
        }
      } catch (err) {
        console.warn(`[chat-ai][${requestId}] Failed to fetch balanceContext from DB:`, err);
      }
    }
    
    // 🆕 LOGGING îmbunătățit pentru balanceContext și memoryContext
    console.log(`[chat-ai][${requestId}] Balance context: ${balanceContext ? `${balanceContext.accounts?.length || 0} accounts for ${balanceContext.company || 'unknown'}` : 'null'}`);
    console.log(`[chat-ai][${requestId}] Memory context: ${memoryContext ? `${memoryContext.length} chars` : 'null'}`);



    // Extragem user_id pentru rate limiting și caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      console.error(`[chat-ai][${requestId}] Auth failed: no user ID`);
      return new Response(
        JSON.stringify({ error: "Autentificare necesară" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // VERIFICARE ACCES AI - Securitate îmbunătățită
    // Verificăm dacă utilizatorul are dreptul să folosească AI
    // ========================================
    console.log(`[chat-ai][${requestId}] User authenticated: ${userId}`);
    console.log(`[chat-ai][${requestId}] User email: ${user?.email || 'unknown'}`);
    
    // Verificare acces AI folosind funcția centralizată
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: accessCheck, error: accessError } = await supabaseAdmin.rpc('verify_ai_access', { 
      p_user_id: userId,
      p_endpoint: 'chat-ai'
    });
    
    if (accessError) {
      console.error(`[chat-ai][${requestId}] Access check error:`, accessError);
      // În caz de eroare la verificare, permitem accesul pentru a nu bloca utilizatorii
      console.log(`[chat-ai][${requestId}] FALLBACK: Allowing access due to verification error`);
    } else if (accessCheck && accessCheck.length > 0 && !accessCheck[0].can_proceed) {
      console.warn(`[chat-ai][${requestId}] ACCESS DENIED: ${accessCheck[0].message}`);
      console.log(`[chat-ai][${requestId}] Access type: ${accessCheck[0].access_type}`);
      return new Response(
        JSON.stringify({ 
          error: accessCheck[0].message || 'Acces limitat. Activează un abonament sau cumpără credite.',
          needsUpgrade: true,
          accessType: accessCheck[0].access_type
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (accessCheck && accessCheck.length > 0) {
      console.log(`[chat-ai][${requestId}] ACCESS GRANTED: ${accessCheck[0].access_type} (${accessCheck[0].remaining_cents} cents remaining)`);
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
      console.error(`[chat-ai][${requestId}] Rate limit check error:`, rateLimitError);
    }
    console.log(`[chat-ai][${requestId}] Rate limit check: ${rateLimitData === false ? 'BLOCKED' : 'PASSED'}`);

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
    
    // 🆕 Construiește secțiunea cu datele balanței din balanceContext primit din frontend
    const balanceDataSection = buildBalanceDataContext(balanceContext);
    if (balanceDataSection) {
      console.log(`[chat-ai][${requestId}] Balance data section added to prompt (${balanceDataSection.length} chars)`);
    }
    
    // 🆕 MEMORIE: Adaugă context din conversații anterioare cu firma
    const memorySection = memoryContext ? `\n\n${memoryContext}` : '';
    if (memoryContext) {
      console.log(`[chat-ai][${requestId}] Memory context added to prompt (${memoryContext.length} chars)`);
    }
    
    // 🆕 CONSCIOUSNESS: Adaugă prompt injection din consciousness-engine pentru personalizare
    const consciousnessSection = consciousnessContext?.context?.promptInjection 
      ? `\n\n=== CONSCIOUSNESS CONTEXT (PRIORITATE MARE) ===\n${consciousnessContext.context.promptInjection}\n=== END CONSCIOUSNESS ===\n` 
      : '';
    if (consciousnessContext?.context?.promptInjection) {
      console.log(`[chat-ai][${requestId}] Consciousness context added to prompt (${consciousnessContext.context.promptInjection.length} chars)`);
    }
    
    // =============================================================================
    // 🆕 FAZA 1 + 3: CONSECVENȚĂ CONVERSAȚII - Flag conversație existentă + context salvat
    // =============================================================================
    let conversationConsistencyPrompt = '';
    
    // FAZA 1: Detectăm dacă e conversație existentă (are history)
    const isExistingConversation = history && history.length > 0;
    if (isExistingConversation) {
      conversationConsistencyPrompt += `
⚠️ CONTEXT IMPORTANT - CONVERSAȚIE ÎN DESFĂȘURARE:
Aceasta NU este prima interacțiune cu acest utilizator în această conversație.
Există ${history.length} mesaje anterioare în acest dialog.
❌ NU spune "Mă bucur să te cunosc", "Bine ai venit" sau alte salutări de început.
❌ NU te prezenta ca și cum ar fi prima întâlnire.
✅ Continuă conversația NATURAL, făcând referire la ce s-a discutat anterior dacă e relevant.
✅ Răspunde direct la întrebare, fără introduceri formale.

`;
      console.log(`[chat-ai][${requestId}] Faza 1: Existing conversation flag added (${history.length} previous messages)`);
    }
    
    // FAZA 3: Citim metadata din yana_conversations pentru context salvat persistent
    if (conversationId) {
      try {
        const { data: convData } = await supabase
          .from('yana_conversations')
          .select('metadata, title')
          .eq('id', conversationId)
          .single();
        
        if (convData?.metadata) {
          const meta = convData.metadata as { 
            lastTopic?: string; 
            messageCount?: number;
            lastInteraction?: string;
          };
          
          // Doar dacă avem mai mult de 1 mesaj (conversație reală, nu prima interacțiune)
          if (meta.messageCount && meta.messageCount > 1) {
            const daysSinceLastInteraction = meta.lastInteraction 
              ? Math.floor((Date.now() - new Date(meta.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            
            conversationConsistencyPrompt += `
📋 CONTEXT CONVERSAȚIE SALVAT (PERSISTENT):
- Subiect discutat anterior: ${meta.lastTopic || 'conversație generală'}
- Total mesaje în această conversație: ${meta.messageCount}
- Titlu conversație: ${convData.title || 'Conversație'}
${daysSinceLastInteraction > 0 ? `- Ultima interacțiune: acum ${daysSinceLastInteraction} zile` : ''}

⚠️ Folosește aceste informații pentru a menține continuitatea. 
Utilizatorul se așteaptă să-ți amintești de ce am discutat!
${daysSinceLastInteraction >= 7 ? '💡 Au trecut câteva zile - poți face o scurtă referire la discuția anterioară.' : ''}

`;
            console.log(`[chat-ai][${requestId}] Faza 3: Saved context injected - topic: "${meta.lastTopic}", messageCount: ${meta.messageCount}`);
          }
        }
      } catch (err) {
        console.warn(`[chat-ai][${requestId}] Faza 3: Failed to load conversation metadata:`, err);
        // Nu blocăm - continuăm fără context salvat
      }
    }
    
    // =============================================================================
    // 🆕 SAMANTHA DYNAMICS: RELATIONSHIP MEMORY INJECTION
    // Fetch last_topic_discussed și relationship score pentru memorie relațională
    // =============================================================================
    let relationshipMemory = '';
    try {
      const { data: relData } = await supabaseAdmin
        .from('yana_relationships')
        .select('last_topic_discussed, relationship_score, consecutive_return_days, emotional_memory')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (relData) {
        const hasStrongRelationship = (relData.relationship_score || 0) >= 5;
        const lastTopic = relData.last_topic_discussed;
        const consecutiveDays = relData.consecutive_return_days || 0;
        const emotionalMemory = relData.emotional_memory as { recent_topics?: string[] } | null;
        
        relationshipMemory = `\n\n## 🧠 SAMANTHA DYNAMICS - MEMORIA RELAȚIEI\n`;
        
        if (lastTopic) {
          relationshipMemory += `**Ultima temă discutată:** "${lastTopic}"\n`;
          relationshipMemory += `→ Dacă e relevant, întreabă natural: "Cum a mers cu ${lastTopic}?"\n`;
          relationshipMemory += `→ Sau menționează: "Îmi amintesc că discutam despre ${lastTopic}..."\n\n`;
        }
        
        if (consecutiveDays >= 3) {
          relationshipMemory += `💫 **Utilizatorul revine constant:** ${consecutiveDays} zile consecutive!\n`;
          relationshipMemory += `→ Poți menționa: "Mă bucur că ne vedem din nou..."\n\n`;
        }
        
        if (hasStrongRelationship) {
          relationshipMemory += `💜 **Scor relație:** ${relData.relationship_score}/10 (relație puternică)\n`;
          relationshipMemory += `→ Poți fi mai personală și directă cu acest utilizator.\n`;
          relationshipMemory += `→ Folosește callbacks la conversații anterioare când e natural.\n\n`;
        }
        
        // Recent topics from emotional memory
        if (emotionalMemory?.recent_topics && emotionalMemory.recent_topics.length > 0) {
          relationshipMemory += `**Subiecte recente discutate:** ${emotionalMemory.recent_topics.slice(0, 3).join(', ')}\n`;
        }
        
        console.log(`[chat-ai][${requestId}] Samantha: relationship score ${relData.relationship_score}, last topic: "${lastTopic || 'none'}"`);
      }
    } catch (err) {
      console.warn(`[chat-ai][${requestId}] Samantha: failed to load relationship data:`, err);
    }
    // =============================================================================
    // END SAMANTHA DYNAMICS
    // =============================================================================
    
    // =============================================================================
    // CLIENT PROFILE INJECTION - Adaptare limbaj + anticipare + feedback loop
    // =============================================================================
    let clientProfileSection = '';
    try {
      const { data: clientProfile } = await supabase
        .from('yana_client_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (clientProfile) {
        const corrections = (clientProfile.learned_corrections as any[]) || [];
        const triggers = (clientProfile.anticipation_triggers as any[]) || [];
        const recurring = (clientProfile.recurring_problems as any[]) || [];
        const patterns = clientProfile.interaction_patterns as any || {};

        clientProfileSection = `\n\n## PROFILUL CLIENTULUI (ce știe YANA despre acest utilizator)
- Domeniu: ${clientProfile.business_domain || 'necunoscut'}
- Dimensiune firmă: ${clientProfile.company_size || 'necunoscută'}
- Complexitate limbaj: ${clientProfile.language_complexity || 'moderate'}
  -> Dacă "simple": fraze scurte, fără jargon contabil, explică orice termen
  -> Dacă "technical": poți folosi termeni de specialitate, mergi direct la esență
  -> Dacă "moderate": echilibru între accesibil și precis
- Stil comunicare: ${clientProfile.communication_style || 'conversational'}
- Probleme recurente: ${recurring.length > 0 ? recurring.map((r: any) => r.topic).join(', ') : 'niciuna detectată'}
  -> Când apare un subiect recurent, menționează că știi deja contextul
${corrections.length > 0 ? `- Corecții anterioare (NU repeta aceste greșeli!):\n${corrections.slice(-5).map((c: any) => `  ❌ "${(c.what_yana_said || '').substring(0, 80)}..." → ✅ "${(c.user_correction || '').substring(0, 80)}..."`).join('\n')}` : ''}
- Pattern-uri: ${patterns.usual_time ? `vine de obicei pe la ${patterns.usual_time}` : ''} ${patterns.most_active_day ? `(${patterns.most_active_day})` : ''}
- Subiecte frecvente: ${(clientProfile.preferred_topics || []).join(', ') || 'nu sunt suficiente date'}
${clientProfile.personality_notes ? `- Note personalitate: ${clientProfile.personality_notes}` : ''}
${triggers.length > 0 ? `- Anticipare (menționează natural dacă e relevant):\n${triggers.slice(0, 3).map((t: any) => `  💡 ${t.description}`).join('\n')}` : ''}
`;
        console.log(`[chat-ai][${requestId}] Client profile injected: lang=${clientProfile.language_complexity}, style=${clientProfile.communication_style}, corrections=${corrections.length}`);
      }
    } catch (err) {
      console.warn(`[chat-ai][${requestId}] Failed to load client profile:`, err);
    }
    // =============================================================================
    // END CLIENT PROFILE INJECTION
    // =============================================================================
    
    // =============================================================================
    // END CONSECVENȚĂ CONVERSAȚII
    // =============================================================================
    
    // 🆕 COMPANY MISMATCH: Injectează warning dacă utilizatorul întreabă despre altă firmă
    const companyMismatchSection = companyMismatchWarning 
      ? `\n\n=== ⚠️ COMPANY MISMATCH WARNING (PRIORITATE MAXIMĂ) ===\n${companyMismatchWarning}\n=== END COMPANY MISMATCH ===\n` 
      : '';
    
    let adaptedPrompt = conversationConsistencyPrompt + consciousnessSection + companyMismatchSection + memorySection + relationshipMemory + clientProfileSection + YANA_CONSCIOUSNESS_PROMPT + SYSTEM_PROMPT + knowledgeContext + balanceDataSection + `\n\n⏰ DATA CURENTĂ: ${roNow}\nREGULĂ CRITICĂ: Orice perioadă <= ${roNow} este DIN TRECUT. NU spune niciodată că 'ianuarie 2025 – martie 2025' este în viitor. Dacă utilizatorul oferă un interval, consideră-l valid dacă capătul intervalului este <= data curentă. Dacă nu e clar, FOLOSEȘTE TOOLS pentru a verifica analizele disponibile, nu răspunde din presupuneri.`;
    
    if (summaryType === 'short') {
      adaptedPrompt += `\n\n🎯 MOD SUMARIZARE SCURTĂ:\n- Răspunde în maxim 100 cuvinte\n- Doar insight-urile CHEIE\n- Fără introduceri sau detalii suplimentare\n- Format: 3-5 bullet points concentrați\n- Accentuează doar ce e URGENT/CRITIC`;
    } else if (summaryType === 'action') {
      adaptedPrompt += `\n\n🎯 MOD ACTION POINTS:\n- Răspunde DOAR cu acțiuni concrete\n- Format: Listă numerotată de pași executabili\n- Pentru fiecare acțiune:\n  • Ce trebuie făcut (verb de acțiune + obiect)\n  • Deadline recomandat (ore/zile)\n  • Impact așteptat (ROI/economie)\n- Fără analize sau explicații\n- Maximum 5-7 action points, prioritizate\n- Exemplu: "1. ✅ Trimite reminder la 15 facturi restante (astăzi, recuperare ~8,500 RON)"`;
    }
    
    // 🆕 DETECTARE CERERI DE GRAFICE - Injectează reminder forțat pentru a genera artefacte
    const graphKeywords = ['grafic', 'graf', 'chart', 'vizualiz', 'arată-mi', 'arata-mi', 'vezi cheltuieli', 'cheltuieli pe', 'venituri pe', 'structura', 'distribuți', 'diagrama', 'pie', 'bar', 'linie'];
    const isGraphRequest = graphKeywords.some(kw => message.toLowerCase().includes(kw));
    const hasBalanceData = balanceDataSection && balanceDataSection.length > 100;
    
    let graphReminder = '';
    if (isGraphRequest && hasBalanceData) {
      // Extrage conturile 6xx și 7xx din balanceContext pentru a le lista explicit
      const expenseAccounts = balanceContext?.accounts
        ?.filter((a: any) => String(a.code).startsWith('6'))
        ?.slice(0, 15)
        ?.map((a: any) => `${a.code}: ${Number(a.debit || 0).toLocaleString('ro-RO')} RON`)
        ?.join(', ') || 'nu există conturi 6xx';
      
      const incomeAccounts = balanceContext?.accounts
        ?.filter((a: any) => String(a.code).startsWith('7'))
        ?.slice(0, 10)
        ?.map((a: any) => `${a.code}: ${Number(a.credit || 0).toLocaleString('ro-RO')} RON`)
        ?.join(', ') || 'nu există conturi 7xx';
      
      graphReminder = `

🚨 **COMANDĂ DIRECTĂ - GENEREAZĂ GRAFIC ACUM!**

Utilizatorul a cerut un grafic. Ai datele. ACȚIONEAZĂ IMEDIAT:

📊 **CONTURI CHELTUIELI (6xx) DISPONIBILE:**
${expenseAccounts}

📈 **CONTURI VENITURI (7xx) DISPONIBILE:**
${incomeAccounts}

**MAPARE OBLIGATORIE pentru grafic cheltuieli:**
- 601, 602, 607, 608 → "Materii prime & Marfă"
- 641, 6411, 645 → "Salarii & Taxe personal"
- 612, 613 → "Chirii & Utilități"
- 623, 624 → "Transport & Deplasări"
- 626 → "Poștă & Telecomunicații"
- 628 → "Servicii externe"
- Alte 6xx → "Alte cheltuieli"

**RĂSPUNS OBLIGATORIU - NU CERE DATE, GENEREAZĂ DIRECT:**
1. Scrie 1-2 propoziții despre ce arată graficul
2. Inserează bloc artifact JSON cu datele REALE de mai sus
3. Adaugă observație cheie

**FORMAT OBLIGATORIU:**
\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Structura Cheltuielilor",
  "data": {"Salarii & Taxe": 15000, "Servicii externe": 8000, "Materii prime": 22000}
}
\`\`\`

**TIPURI SUPORTATE:** bar_chart, line_chart, radar_chart, table

⛔ INTERZIS: Să ceri date de la utilizator
⛔ INTERZIS: Să generezi date "ipotetice" sau "exemplu"
⛔ INTERZIS: Să spui "am nevoie de cifre" - cifrele SUNT MAI SUS!
`;
      console.log(`[chat-ai][${requestId}] 📊 Graph request detected - FORCED reminder with actual account data injected`);
    } else if (isGraphRequest && !hasBalanceData) {
      graphReminder = `

📊 **CERERE GRAFIC - FĂRĂ BALANȚĂ ÎNCĂRCATĂ:**
Utilizatorul cere un grafic, dar NU ai date de balanță încărcate.
Răspunde cald și ghidează: "Pentru a-ți genera graficul, am nevoie de balanța ta. Încarcă un fișier Excel (SmartBill sau Saga) folosind butonul + din chat, și instant îți arăt vizualizarea cu datele tale reale."
NU genera grafice ipotetice. NU cere date manual. Îndrumă spre încărcare fișier.
`;
      console.log(`[chat-ai][${requestId}] 📊 Graph request detected, but no balance data - guiding to upload`);
    }
    
    adaptedPrompt += graphReminder;
    
    // 🆕 MULTIMODAL: Adaugă instrucțiuni pentru analiza imaginilor
    if (imageData?.base64) {
      adaptedPrompt += `

🖼️ **ANALIZĂ CAPTURĂ DE ECRAN / IMAGINE:**
Utilizatorul a încărcat o imagine (${imageData.fileName}).
ANALIZEAZĂ conținutul imaginii și răspunde la întrebarea utilizatorului bazat pe ce vezi.
- Dacă e o captură de ecran cu o întrebare → identifică întrebarea și răspunde complet
- Dacă e o captură din WhatsApp/chat → formulează răspunsul pentru copy-paste facil
- Dacă e un document scanat → extrage informațiile relevante
- Dacă e un grafic/tabel → interpretează datele vizuale
Răspunde natural, ca și cum ai vedea tu direct imaginea.
`;
    }
    
    // Construiește conversația cu system prompt și istoric
    // 🆕 FIX GRAFICE: Adaugă mesaj de sistem INLINE direct înainte de user message când e graph request
    // Aceasta forțează AI-ul să urmeze instrucțiunile deoarece e ultimul context văzut
    const inlineGraphInstruction = (isGraphRequest && hasBalanceData) ? [{
      role: "assistant" as const,
      content: "Am datele tale din balanță. Când vei cere un grafic, îl voi genera imediat folosind formatul artifact cu valorile reale."
    }, {
      role: "system" as const,
      content: `⚡ EXECUȚIE IMEDIATĂ: Utilizatorul cere un grafic. GENEREAZĂ un bloc \`\`\`artifact cu JSON valid. NU întreba. NU cere date. Folosește conturile 6xx/7xx din context. FORMAT: \`\`\`artifact\\n{"type":"bar_chart","title":"...","data":{...}}\\n\`\`\``
    }] : [];
    
    // 🆕 MULTIMODAL: Construct user message with image if present
    let userMessageContent: any = message;
    if (imageData?.base64) {
      console.log(`[chat-ai][${requestId}] 🖼️ Multimodal request - image attached: ${imageData.fileName}`);
      // Ensure base64 has proper data URL prefix
      const imageUrl = imageData.base64.startsWith('data:') 
        ? imageData.base64 
        : `data:${imageData.mimeType || 'image/png'};base64,${imageData.base64}`;
      
      userMessageContent = [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    }
    
    const messages = [
      { role: "system", content: adaptedPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      ...inlineGraphInstruction,
      { role: "user", content: userMessageContent }
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

    // Prima cerere cu tool calling - FIX #17: Timeout 45s
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 45000);
    
    // ========== LOGGING: Pre-AI call ==========
    console.log(`[chat-ai][${requestId}] Calling AI Gateway...`);
    console.log(`[chat-ai][${requestId}] Model: google/gemini-2.5-flash`);
    console.log(`[chat-ai][${requestId}] Tools enabled: ${TOOLS.length} tools`);
    const aiCallStartTime = Date.now();
    
    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          max_tokens: 4096,
          // FAZA 2.1: Parametri pentru naturalețe conversațională
          temperature: 0.7,        // Mai multă creativitate în exprimare
          top_p: 0.9,              // Diversitate controlată
          presence_penalty: 0.3,   // Evită repetițiile
          frequency_penalty: 0.2   // Vocabular mai variat
        }),
        signal: controller1.signal
      });
      clearTimeout(timeout1);
      console.log(`[chat-ai][${requestId}] AI Gateway response: ${aiResponse.status} (${Date.now() - aiCallStartTime}ms)`);
    } catch (err: any) {
      clearTimeout(timeout1);
      if (err.name === 'AbortError') {
        console.error(`[chat-ai][${requestId}] AI Gateway TIMEOUT after 45s`);
        return new Response(
          JSON.stringify({ error: "Timeout: cererea a depășit 45 secunde" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error(`[chat-ai][${requestId}] AI Gateway fetch error:`, err.message);
      throw err;
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[chat-ai][${requestId}] AI Gateway ERROR: ${aiResponse.status}`, errorText);
      
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
      
      // ========================================
      // DEDUCT CREDIT AFTER SUCCESS (non-streaming)
      // ========================================
      // Chat AI inclus în abonament - doar tracking pentru statistici
      // ========================================
      if (content) {
        // Track AI usage pentru statistici (fără deducere credite)
        await supabase
          .from('ai_usage')
          .insert({
            user_id: userId,
            endpoint: 'chat-ai',
            model: 'google/gemini-2.5-flash',
            estimated_cost_cents: 0, // Inclus în abonament
            success: true,
            month_year: new Date().toISOString().slice(0, 7)
          });
        const totalDuration = Date.now() - requestStartTime;
        console.log(`[chat-ai][${requestId}] ========== REQUEST COMPLETE (non-stream) ==========`);
        console.log(`[chat-ai][${requestId}] Total duration: ${totalDuration}ms`);
        console.log(`[chat-ai][${requestId}] Response length: ${content.length} chars`);
        console.log(`[chat-ai][${requestId}] Status: SUCCESS`);
      }
      // ========================================
      
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
                      console.log(`[chat-ai][${requestId}] Tool call detected: index ${tc.index}`);
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
                  
                  // Apel secundar cu rezultatele tool-urilor - FIX #17: Timeout 45s
                  const followUpMessages = [
                    ...messages,
                    { role: "assistant", content: accumulatedContent || null, tool_calls: toolCalls },
                    ...toolResults
                  ];

                  const controller2 = new AbortController();
                  const timeout2 = setTimeout(() => controller2.abort(), 45000);
                  
                  let followUpResponse: Response;
                  try {
                    followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                      signal: controller2.signal
                    });
                    clearTimeout(timeout2);
                  } catch (err: any) {
                    clearTimeout(timeout2);
                    if (err.name === 'AbortError') {
                      const fallback = "Timeout: răspunsul a depășit 45 secunde. Te rog încearcă din nou.";
                      controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
                      sentAnyContent = true;
                      followUpResponse = new Response(null, { status: 504 }); // Fallback
                    } else {
                      throw err;
                    }
                  }

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

          // === Chat AI inclus în abonament - doar tracking pentru statistici ===
          if (sentAnyContent && accumulatedContent.length > 0) {
            // Track AI usage pentru statistici (fără deducere credite)
            const totalDuration = Date.now() - requestStartTime;
            console.log(`[chat-ai][${requestId}] ========== REQUEST COMPLETE (stream) ==========`);
            console.log(`[chat-ai][${requestId}] Total duration: ${totalDuration}ms`);
            console.log(`[chat-ai][${requestId}] Response length: ${accumulatedContent.length} chars`);
            console.log(`[chat-ai][${requestId}] Status: SUCCESS`);
            
            await supabase
              .from('ai_usage')
              .insert({
                user_id: userId,
                endpoint: 'chat-ai',
                model: 'google/gemini-2.5-flash',
                estimated_cost_cents: 0, // Inclus în abonament
                success: true,
                month_year: new Date().toISOString().slice(0, 7)
              });
            console.log('[chat-ai] Message tracked (included in subscription)');
            
            // 📊 LOGGING: Monitorizare decizii AI
            const isFiscalRedirect = accumulatedContent.toLowerCase().includes('consultanță fiscală') ||
                                     accumulatedContent.toLowerCase().includes('expert contabil');
            const isStrategicAnswer = accumulatedContent.toLowerCase().includes('strategi') && 
                                      accumulatedContent.toLowerCase().includes('recomand');
            
            console.log(`[AI_DECISION] Q: "${message.substring(0, 60)}..." → ${isFiscalRedirect ? 'REDIRECTED_FISCAL' : isStrategicAnswer ? 'STRATEGIC_DIRECT' : 'ANSWERED_DIRECTLY'}`);
          }
          // === END TRACKING ===

          // === HOOK SIGNALS: Detectează semnale de engagement (fire and forget) ===
          if (userId && conversationId && accumulatedContent.length > 0) {
            // Fire and forget - nu blochează răspunsul
            (async () => {
              try {
                const hookPayload = {
                  userId,
                  conversationId,
                  messages: [
                    { role: 'user', content: message, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: accumulatedContent, timestamp: new Date().toISOString() }
                  ],
                  sessionId: requestId
                };
                
                const hookResponse = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/detect-hook-signals`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                    },
                    body: JSON.stringify(hookPayload)
                  }
                );
                
                if (hookResponse.ok) {
                  const hookResult = await hookResponse.json();
                  console.log(`[chat-ai][${requestId}] Hook signals detected: score=${hookResult.sessionScore}, signals=${hookResult.signalsCount}`);
                } else {
                  console.warn(`[chat-ai][${requestId}] Hook signals failed:`, hookResponse.status);
                }
              } catch (hookError) {
                console.warn(`[chat-ai][${requestId}] Hook signals error:`, hookError);
              }
            })();
          }
          // === END HOOK SIGNALS ===

          // === SELF-REFLECT WITH ERROR DETECTION (fire and forget) ===
          if (userId && conversationId && accumulatedContent.length > 100) {
            (async () => {
              try {
                // Obținem ultimul răspuns YANA pentru a verifica dacă utilizatorul corectează
                const { data: lastYanaMessage } = await supabase
                  .from('conversation_history')
                  .select('content')
                  .eq('conversation_id', conversationId)
                  .eq('role', 'assistant')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                const selfReflectPayload = {
                  conversationId,
                  userId,
                  question: message,
                  answer: accumulatedContent,
                  previousYanaResponse: lastYanaMessage?.content || null,
                };

                const reflectResponse = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/self-reflect`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                    },
                    body: JSON.stringify(selfReflectPayload)
                  }
                );

                if (reflectResponse.ok) {
                  const result = await reflectResponse.json();
                  if (result.errorDetected) {
                    console.log(`[chat-ai][${requestId}] Error detected and acknowledged: ${result.errorType}`);
                  } else {
                    console.log(`[chat-ai][${requestId}] Self-reflection: score=${result.score}/10`);
                  }
                }
              } catch (reflectError) {
                console.warn(`[chat-ai][${requestId}] Self-reflect error:`, reflectError);
              }
            })();
          }
          // === END SELF-REFLECT ===

          // === ÎNVĂȚARE AUTOMATĂ: Salvăm răspunsul și extragem pattern-ul ===
          const responseTime = Date.now() - startTime;
          
          try {
            // 1. Salvăm răspunsul asistentului în conversation_history
            if (userId) {
              // 🆕 ENGAGEMENT TRACKING: Detectăm dacă răspunsul conține întrebare de engagement
              // Funcție robustă care detectează întrebări chiar și când sunt urmate de date/exemple
              const detectsEngagementQuestion = (text: string): boolean => {
                const trimmed = text.trim();
                
                // Cazul simplu: se termină direct cu ?
                if (trimmed.endsWith('?')) return true;
                
                // Căutăm ? în text - dacă există și după el sunt < 100 caractere, e întrebare de engagement
                const lastQuestionIndex = trimmed.lastIndexOf('?');
                if (lastQuestionIndex > -1) {
                  const afterQuestion = trimmed.substring(lastQuestionIndex + 1).trim();
                  // Dacă după ? sunt mai puțin de 100 caractere (ex: bullets, emoji, exemplu scurt)
                  if (afterQuestion.length < 100) return true;
                }
                
                return false;
              };
              
              const endsWithQuestion = detectsEngagementQuestion(accumulatedContent);
              
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

              // 🆕 FIX DUPLICATE: Salvăm în yana_messages DOAR dacă nu suntem apelați de ai-router
              // ai-router salvează deja mesajul, deci evităm duplicarea
              const calledFromRouter = req.headers.get('x-called-from-router') === 'true';
              
              if (conversationId && !calledFromRouter) {
                // Salvăm doar când chat-ai e apelat direct (ex: AcademicThesisAssistant)
                await supabase
                  .from("yana_messages")
                  .insert({
                    conversation_id: conversationId,
                    role: "assistant",
                    content: accumulatedContent,
                    ends_with_question: endsWithQuestion,
                    question_responded: null
                  });
                
                if (endsWithQuestion) {
                  console.log(`[chat-ai][${requestId}] Response ends with question - tracking enabled (direct call)`);
                }
              } else if (calledFromRouter) {
                console.log(`[chat-ai][${requestId}] Skipping yana_messages save - already saved by ai-router`);
              }

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
        } catch (error: any) {
          const totalDuration = Date.now() - requestStartTime;
          console.error(`[chat-ai][${requestId}] STREAM ERROR after ${totalDuration}ms:`, error?.message || error);
          console.error(`[chat-ai][${requestId}] Stack:`, error?.stack);
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

  } catch (error: any) {
    // ✅ SECURITY FIX: Sanitize error messages - don't expose stack traces
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[chat-ai][${requestId}] ========== REQUEST FAILED ==========`);
    console.error(`[chat-ai][${requestId}] Total duration: ${totalDuration}ms`);
    console.error(`[chat-ai][${requestId}] Error: ${error?.message || error}`);
    console.error(`[chat-ai][${requestId}] Stack: ${error?.stack}`);
    return new Response(
      JSON.stringify({
        error: "A apărut o eroare tehnică. Te rog încearcă din nou."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
