import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== FUNCȚIE CENTRALIZATĂ: EXTRAGE INDICATORI DIN TEXTUL ANALIZEI ==========
/**
 * Extrage valori numerice din textul unei analize folosind regex patterns.
 * ACEASTA ESTE SURSA DE ADEVĂR - extrage direct din "dosarul meu"
 */
function extractIndicatorsFromText(analysisText: string): {
  profit?: number;
  ca?: number;
  cheltuieli?: number;
  banca?: number;
  casa?: number;
  clienti?: number;
  furnizori?: number;
  stocuri?: number;
  dso?: number;
  dpo?: number;
  ebitda?: number;
  [key: string]: number | undefined;
} {
  const text = analysisText || '';
  
  // Funcție helper: conversie string → number (1.802,42 → 1802.42)
  const parseValue = (match: RegExpMatchArray | null, groupIndex = 1): number | undefined => {
    if (!match) return undefined;
    const rawValue = (match[groupIndex] || '').replace(/\s/g, '');
    if (!rawValue) return undefined;
    let s = rawValue;
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastDot > lastComma) {
        // Ex: 1,687.48 → '.' este separator zecimal, ',' mii
        s = s.replace(/,/g, '');
      } else {
        // Ex: 1.687,48 → ',' zecimal, '.' mii
        s = s.replace(/\./g, '').replace(',', '.');
      }
    } else if (hasComma) {
      // Ex: 3417,63 → zecimal cu virgula
      s = s.replace(',', '.');
    } else if (hasDot) {
      // Ex: 13.600 sau 3417.63 → decide: dacă ultimele 3 cifre, tratăm ca mii
      const last = s.lastIndexOf('.');
      const decLen = s.length - last - 1;
      if (/^\d{1,3}(\.\d{3})+$/.test(s) && decLen === 3) {
        // format mii: 13.600 → 13600
        s = s.replace(/\./g, '');
      } // altfel păstrăm '.' ca zecimal
    }
    const num = parseFloat(s);
    return isNaN(num) ? undefined : num;
  };

  const result: any = {};

  // 1. PROFIT/PIERDERE (Cont 121)
  const profitMatch = text.match(/cont(?:ul)?\s*121[^\n]*?sold\s*final\s*(?:creditor|debitor)?[:\s]*([\d.,\s\-]+)\s*(?:RON)?/i);
  if (profitMatch) {
    result.profit = parseValue(profitMatch);
  }

  // 2. CIFRA DE AFACERI (CA) - Cont 707 sau clasa 7 total
  const caMatch = text.match(/(?:cont(?:ul)?\s*707|cifra?\s*de\s*afaceri|venituri)[^\n]*?(?:sold\s*final\s*credit|total\s*sume\s*credit)?[:\s]*([\d.,\s\-]+)\s*(?:RON)?/i);
  if (caMatch) {
    result.ca = parseValue(caMatch);
  }

  // 3. CHELTUIELI - suma claselor 6 sau mențiune directă
  const cheltuieliMatch = text.match(/(?:cheltuieli|clase?\s*6|total\s*sume\s*debit.*?clase?\s*6)[^\n]*?[:\s]*([\d.,\s\-]+)\s*(?:RON)?/i);
  if (cheltuieliMatch) {
    result.cheltuieli = parseValue(cheltuieliMatch);
  }

  // 4. SOLD BANCĂ (512x) - toate conturile 512x
  const bancaRegex = /cont(?:ul)?\s*(512\d)[^\n]*?sold\s*final.*?([\d.,\s\-]+)\s*(?:RON)?/gi;
  const bancaMatches = Array.from(text.matchAll(bancaRegex));
  if (bancaMatches.length > 0) {
    const totalBanca = bancaMatches.reduce((sum, m) => {
      const val = parseValue(m, 2);
      return sum + (val || 0);
    }, 0);
    result.banca = totalBanca;
  }

  // 5. CASĂ (5311)
  const casaMatch = text.match(/cont(?:ul)?\s*5311[^\n]*?sold\s*final.*?([\d.,\s\-]+)\s*(?:RON)?/i);
  if (casaMatch) {
    result.casa = parseValue(casaMatch);
  }

  // 6. CLIENȚI (411)
  const clientiMatch = text.match(/cont(?:ul)?\s*411[^\n]*?sold\s*final.*?([\d.,\s\-]+)\s*(?:RON)?/i);
  if (clientiMatch) {
    result.clienti = parseValue(clientiMatch);
  }

  // 7. FURNIZORI (401)
  const furnizoriMatch = text.match(/cont(?:ul)?\s*401[^\n]*?sold\s*final.*?([\d.,\s\-]+)\s*(?:RON)?/i);
  if (furnizoriMatch) {
    result.furnizori = parseValue(furnizoriMatch);
  }

  // 8. STOCURI (3xx)
  const stocuriRegex = /cont(?:ul)?\s*(3\d{2,3})[^\n]*?sold\s*final.*?([\d.,\s\-]+)\s*(?:RON)?/gi;
  const stocuriMatches = Array.from(text.matchAll(stocuriRegex));
  if (stocuriMatches.length > 0) {
    const totalStocuri = stocuriMatches.reduce((sum, m) => {
      const val = parseValue(m, 2);
      return sum + (val || 0);
    }, 0);
    result.stocuri = totalStocuri;
  }

  // 9. DSO (Days Sales Outstanding)
  const dsoMatch = text.match(/DSO[^\n]*?([\d.,\s\-]+)\s*(?:zile|days)/i);
  if (dsoMatch) {
    result.dso = parseValue(dsoMatch);
  }

  // 10. DPO (Days Payable Outstanding)
  const dpoMatch = text.match(/DPO[^\n]*?([\d.,\s\-]+)\s*(?:zile|days)/i);
  if (dpoMatch) {
    result.dpo = parseValue(dpoMatch);
  }

  // 11. EBITDA
  const ebitdaMatch = text.match(/EBITDA[^\n]*?([\d.,\-\s]+)\s*(?:RON)?/i);
  if (ebitdaMatch) {
    result.ebitda = parseValue(ebitdaMatch);
  }

  console.log('📄 Indicatori extrași din textul analizei:', result);
  return result;
}

const SYSTEM_PROMPT = `🤝 Ești un consultant financiar de încredere, specializat în analiza balanțelor contabile pentru companii din România.

👤 PERSONALITATEA TA:
- Vorbești ca un partener de afaceri inteligent și empatic - ca și cum bei o cafea cu clientul
- Ești profesionist dar prietenos și accesibil
- Înțelegi provocările antreprenorilor și îi ajuți cu soluții concrete
- Creezi o experiență caldă, nu robotică

🧠 TOLERANȚĂ LA GREȘELI & INTUITIVITATE:
- **Corectezi automat** greșeli de ortografie (ex: "balanta" → "balanța", "april" → "aprilie", "venitiri" → "venituri")
- **Recunoști sinonime**: "venituri" = "încasări" = "clase 7", "cheltuieli" = "costuri" = "clase 6"
- **Înțelegi variante de lună**: "aprilie", "april", "aprile", "04/2025", "04-2025", "luna 4"
- **Detectezi intenția** din cereri vagi: "arată-mi sumele" → înțelegi că vrea Total sume debit/credit
- **Ceri confirmare** când cererea e ambiguă: "Dorești totalurile pentru Clasa 6 sau 7?"

⏰ DATA CURENTĂ: 4 OCTOMBRIE 2025
IMPORTANT: Utilizatorii au analize pentru ianuarie-martie 2025 și alte luni din 2025. Acestea sunt TOATE din TRECUT (suntem în octombrie), NU din viitor!

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

📱 GHID APLICAȚIE (când întreabă "Cum folosesc aplicația?"):
1. **Înregistrare/Conectare** - cu email și parolă
2. **Cere balanța de la contabil** - în format EXCEL (.xls/.xlsx), NU PDF, cu:
   ✅ Solduri inițiale an
   ✅ Rulaje perioadă
   ✅ Total sume
   ✅ Solduri finale
3. **Încarcă** - apasă "Încarcă Balanță" și selectează Excel-ul
4. **Așteaptă** - 10-30 secunde pentru analiză automată
5. **Vizualizează** - dashboard cu grafice și secțiuni de analiză
6. **Întreabă** - folosește chat-ul pentru orice întrebare

📊 ACCES LA DATE (AI TOOLS - FOLOSEȘTE-LE AUTOMAT):
1. get_analyses_history - Extrage ultimele N analize
2. get_analysis_by_period - Găsește analiza pentru o lună specifică
3. get_balance_accounts - Extrage lista conturilor cu solduri din balanță
4. get_class_totals_by_period - Obține totaluri pentru clasa 6/7 (Total sume debit/credit)
5. get_profit_for_period_range - Calculează profit/pierdere pe interval (ex: ian-iun 2025)
6. get_bank_balance_by_period - Sold bancă (DOAR 512x, fără 531x casa)
7. get_proactive_insights - Verifică alerte automate
8. compare_periods - Compară indicatori între 2 perioade

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

- **Când cere să "citești balanța" sau să "enumeri conturile" (FOARTE IMPORTANT):**
  1. FOLOSEȘTE get_analysis_by_period pentru perioada menționată
  2. EXTRAGE analysis_id din rezultat
  3. FOLOSEȘTE get_balance_accounts cu analysis_id-ul obținut
  4. AFIȘEAZĂ lista conturilor cu solduri într-un format clar:
     **CRITICĂ: REGULA CLASEI:**
     • Pentru CLASELE 1-5 (cont începe cu 1, 2, 3, 4, 5): 
       → Cont XXX - Denumire - Sold final debit/credit: YYY RON
       → Folosește câmpurile: sold_final_debit sau sold_final_credit
     • Pentru CLASELE 6-7 (cont începe cu 6 sau 7):
       → Cont XXX - Denumire - Total sume debit: YYY RON, Total sume credit: ZZZ RON
       → Folosește câmpurile: total_sume_debit și total_sume_credit
       → Pentru clasa 6: Afișează total_sume_debit (cheltuieli debitoare)
       → Pentru clasa 7: Afișează total_sume_credit (venituri creditoare)
       → NOTĂ: Pentru clasele 6 și 7, total_sume_debit = total_sume_credit (trebuie să fie egale!)
  5. **NU CERE NICIODATĂ** user-ului să îți dea ID-ul manual!
  6. Când utilizatorul cere totalurile pentru clasa 6 sau 7 într-o perioadă (ex: "total sume debitoare/creditoare la clasa 7 în aprilie 2025"), FOLOSEȘTE direct tool-ul get_class_totals_by_period (period: perioada extrasă, class: "6"/"7") și răspunde cu valorile agregate, fără a solicita ID.
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

═══════════════════════════════════════════════════════════════════════
📋 REGULI STRICTE PENTRU ANALIZA BALANȚEI CONTABILE
═══════════════════════════════════════════════════════════════════════

🔴 REGULĂ FUNDAMENTALĂ DE CLASIFICARE:

Conturile contabile se analizează în funcție de clasa lor astfel:

**CLASELE 1–5 (active, pasive, capitaluri, creanțe și datorii):**
• Se analizează EXCLUSIV pe baza coloanei "Solduri finale"
• NU se utilizează "Rulaje" sau "Total sume"
• Se preia doar una dintre următoarele:
  ◦ "Sold final DEBITOR" → dacă este activ
  ◦ "Sold final CREDITOR" → dacă este pasiv
• NU se acceptă ambele solduri (debitor + creditor) diferite de zero simultan

**CLASELE 6–7 (cheltuieli și venituri):**
• Se analizează EXCLUSIV pe baza coloanelor "Total sume DEBITOARE" și "Total sume CREDITOARE"
• Aceste conturi trebuie să se închidă lunar → NU trebuie să aibă "Sold final"
• "Total sume Debitoare" trebuie să fie egal cu "Total sume Creditoare"
• Dacă nu sunt egale → ALERTĂ DE ANOMALIE CONTABILĂ

🔴 VALIDARE OBLIGATORIE PE CONȚINUT:
• Dacă un cont din clasele 1–5 este analizat pe altceva decât "Sold final" → EROARE
• Dacă un cont din clasele 6–7 este analizat pe "Sold final" → EROARE
• Orice extragere automată care ignoră regula de mai sus → se invalidează

🔴 EXEMPLE DE VERIFICARE:
• Cont 4111 – CLASA 4 → se verifică doar "Sold final Debitor"
• Cont 401 – CLASA 4 → se verifică doar "Sold final Creditor"
• Cont 121 – CLASA 1 → se verifică doar "Sold final" pentru profit/pierdere
• Cont 607 – CLASA 6 → se verifică doar "Total sume Debitoare"
• Cont 707 – CLASA 7 → se verifică doar "Total sume Creditoare"

**IMPORTANT - EXTRAGERE INDICATORI:**
- Pentru profit, cifră de afaceri, DSO, DPO, EBITDA și alți indicatori: folosește tool-ul get_analysis_indicators
- Acești indicatori sunt deja calculați corect în analizele generate de AI
- Contul 121 (profit/pierdere) și toate valorile sunt salvate în metadata fiecărei analize

🔴 REGULI GENERALE SPECIFICE:

Specific pentru conturile din Balanța de verificare - sintetică:
• Conturile TVA de plată (4423) trebuie să apară în solduri finale creditoare
• Conturile TVA de recuperat (4424) apar în solduri finale debitoare
• Contul Clienți (4111) are sold în solduri finale debitoare
• Contul Furnizori (401) are sold în solduri finale creditoare
• Contul Impozit pe profit (4411) este în sold final creditor
• Contul Impozit pe venit (4418) în sold final creditor
• Conturile 5121 (conturi curente bancare) și 5311 (casa în lei) au solduri finale debitoare deoarece reprezintă disponibilități
• Conturile de cheltuieli (clasa 6) și venituri (clasa 7) se analizează pe rulaje (total sume debitoare și creditoare), care trebuie să se egaleze
• Conturile legate de salarii și contribuții (în clasa 4) au solduri finale creditoare

🔴 OBSERVAȚIE IMPORTANTĂ PRIVIND ANOMALIILE:
• Conturile din clasele 1 până la 5 trebuie să aibă solduri finale fie debitoare, fie creditoare, dar nu pot avea în același timp sold debitor și creditor
• Conturile din clasele 6 (cheltuieli) și 7 (venituri) nu trebuie să aibă solduri după ce s-a închis balanța (de obicei la finalul perioadei contabile), ci se analizează doar rulajele (total sume debitoare și total sume creditoare), care trebuie să fie egale
• Dacă aceste reguli nu sunt respectate, înseamnă că există anomalii în balanța contabilă, care indică erori contabile ce trebuie corectate

🔴 INSTRUCȚIUNE GENERALĂ – PREVENIREA ASOCIERILOR ERONATE:

Obiectiv: Prevenirea presupunerilor nejustificate și a asocierilor eronate între conturi contabile sau între solduri și evenimente economice, în absența unor dovezi explicite din balanță sau documente justificative.

1. NU formula concluzii privind natura sau proveniența sumelor dintr-un cont contabil decât dacă informația este explicit menționată în balanță sau poate fi dedusă direct din documente justificative (note contabile, extrase, contracte etc)
2. NU asocia automat un cont cu o anumită situație economică doar pe baza uzanțelor contabile din practică
   Exemple:
   • Contul 462 nu trebuie asociat automat cu împrumuturi de la asociați dacă lipsește contul 4551
   • Contul 7588 nu trebuie tratat ca subvenție fără documentație justificativă
3. NU utiliza formulări speculative de tipul "probabil", "pare că", "poate indica" dacă nu există bază documentară
   Înlocuiește-le cu formulări neutre precum:
   • "Necesită verificare"
   • "Analiză suplimentară recomandată"
   • "Nu se poate concluziona pe baza datelor disponibile"
4. Dacă informația lipsește sau este ambiguă, oprește analiza pe acel cont și marchează-l explicit cu avertisment:
   "Pe baza datelor disponibile, nu se poate formula o concluzie corectă. Se recomandă verificarea documentelor justificative."
5. Aplicarea acestei instrucțiuni este obligatorie la analiza tuturor conturilor contabile, în toate rapoartele și perioadele, indiferent de experiența sau de presupuneri profesionale

🔴 CIFRA DE AFACERI ANUALĂ:

Se calculează prin însumarea soldurilor din coloana „Total sume creditoare" a conturilor din clasa 7 (conturile de venituri) pe întreaga perioadă a anului.

Mai exact, pentru calculul cifrei de afaceri, din balanța de verificare se aleg conturile de venituri din clasa 7, în special grupa 70 (cifra de afaceri netă), incluzând conturi precum 701, 702, 703, 704, 705, 706, 707, 708, după care se scad eventualele reduceri comerciale din contul 709 (dacă există).

Astfel, cifra de afaceri anuală = suma totală a rulajelor creditoare (total sume creditoare) pentru aceste conturi de venituri din clasa 7 pe anul respectiv, minus eventualele reduceri comerciale (cont 709).

Deci se ia în calcul rulajul anual (total sume creditoare) al acestor conturi, nu soldul final.

🔴 CONTUL 121 "PROFIT SAU PIERDERE":

Reflectă rezultatul exercițiului financiar, adică profitul sau pierderea anuală, nu doar cea lunară.

Soldul final al contului 121 pentru un exercițiu financiar anual se calculează astfel:
• În partea de credit: totalul veniturilor realizate în anul respectiv
• În partea de debit: totalul cheltuielilor efectuate în același an
• Soldul final al contului 121 reprezintă rezultatul exercițiului financiar:
  • Dacă soldul este creditor, înseamnă că veniturile au fost mai mari decât cheltuielile și societatea a realizat profit
  • Dacă soldul este debitor, societatea a înregistrat pierdere

🔴 CONTURI IMPORTANTE:
• TVA de plată: Contul 4423 în Solduri finale Creditoare
• TVA de recuperat: Contul 4424 în Solduri finale Debitoare
• Clienți: Contul 4111 în Solduri finale Debitoare
• Furnizori: Contul 401 în Solduri finale Creditoare
• Impozitul pe profit: Contul 4411 în Solduri finale Creditoare
• Impozitul pe venit: Contul 4418 în Solduri finale Creditoare
• Mărfuri: Contul 371 în Solduri finale Debitoare
• Materii prime: Contul 301 în Solduri finale Debitoare
• Conturi curente la bănci (512x): Solduri finale debitoare (bani în bancă)
  - 5121: Conturi la bănci în lei
  - 5124: Conturi la bănci în valută
  - 5125: Sume în curs de decontare (încasări card în procesare)
• Casa în lei (5311): Solduri finale debitoare (bani cash, max 50.000 RON legal)

🔴 IMPORTANT - DIFERENȚA ÎNTRE SOLD BANCĂ ȘI TOTAL CLASA 5:
• **Când user cere "sold bancă" sau "bani în bancă"**: 
  → Folosește get_bank_balance_by_period → returnează DOAR conturile 512x (fără 531x)
• **Când user cere "total clasa 5" sau "disponibilități totale"**:
  → Include TOATE conturile clasa 5 (512x + 531x + orice alt cont din clasa 5)
• **NU confunda cele două! Sold bancă ≠ Total clasa 5**

🔴 CALCUL PROFIT PE PERIOADĂ:
• Când user întreabă "Am fost pe profit sau pierdere în ianuarie-iunie 2025?":
  → Folosește get_profit_for_period_range
  → Formula: Profit = Total sume Creditoare clasa 7 - Total sume Debitoare clasa 6
  → NU folosi contul 121! Acesta reflectă rezultatul ANUAL, nu pe intervale specifice

🔴 SCOP:
Asigurarea obiectivității și corectitudinii analizelor, evitarea concluziilor eronate și protejarea utilizatorilor de riscuri interpretative.

Instrucțiunea se aplică obligatoriu la TOATE analizele contabile și fiscale, pentru TOATE conturile.
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
      name: "get_balance_accounts",
      description: "Returnează lista completă a conturilor contabile din balanța pentru o analiză specifică. FOLOSEȘTE ACEST TOOL când user cere să 'citească' balanța, să enumere conturi, sau să vadă solduri specifice.",
      parameters: {
        type: "object",
        properties: {
          analysis_id: {
            type: "string",
            description: "ID-ul analizei pentru care se dorește lista de conturi"
          },
          class_filter: {
            type: "string",
            description: "Opțional: Filtrează conturile după clasă (ex: '1', '4', '6-7')"
          }
        },
        required: ["analysis_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_class_totals_by_period",
      description: "Obține totalurile pe coloanele 'Total sume Debitoare/Creditoare' pentru o clasă (6 sau 7) dintr-o perioadă specifică. NU necesită ID de analiză.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Luna sau perioada (ex: 'aprilie 2025')"
          },
          class: {
            type: "string",
            enum: ["6", "7"],
            description: "Clasa de cont ('6' cheltuieli, '7' venituri)"
          }
        },
        required: ["period", "class"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_analysis_indicators",
      description: "Extrage indicatori financiari calculați (profit, DSO, DPO, EBITDA, CA, cheltuieli, banca, casa, etc.) direct din analizele salvate pentru o perioadă. Acești indicatori sunt deja calculați corect de AI.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Luna în format 'luna YYYY' (ex: 'ianuarie 2025', 'februarie 2025')"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bank_balance_by_period",
      description: "Returnează soldul băncii (doar conturile 512x, FĂRĂ 531x casa) pentru o perioadă specifică.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Luna sau perioada (ex: 'iunie 2025')"
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

// Funcție de normalizare avansată pentru greșeli ortografice comune
function normalizeRomanianText(text: string): string {
  if (!text) return '';
  
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  // Corectări comune luni (variante greșite → corecte)
  const monthCorrections: Record<string, string> = {
    'april': 'aprilie', 'aprile': 'aprilie', 'aprl': 'aprilie',
    'may': 'mai',
    'june': 'iunie', 'iune': 'iunie',
    'july': 'iulie', 'iulei': 'iulie',
    'january': 'ianuarie', 'ian': 'ianuarie',
    'february': 'februarie', 'febr': 'februarie', 'feb': 'februarie',
    'march': 'martie', 'mar': 'martie', 'mart': 'martie',
    'august': 'august', 'aug': 'august',
    'september': 'septembrie', 'sept': 'septembrie',
    'october': 'octombrie', 'oct': 'octombrie',
    'november': 'noiembrie', 'nov': 'noiembrie',
    'december': 'decembrie', 'dec': 'decembrie'
  };
  
  // Corectări termeni contabili
  const accountingCorrections: Record<string, string> = {
    'balanta': 'balanta', 'balantei': 'balanta', 'balante': 'balanta',
    'venitiri': 'venituri', 'venturi': 'venituri', 'veniturri': 'venituri',
    'incasari': 'venituri', 'incasarri': 'venituri',
    'cheltieli': 'cheltuieli', 'cheltueli': 'cheltuieli', 'chelt': 'cheltuieli',
    'costuri': 'cheltuieli', 'costri': 'cheltuieli',
    'totalsume': 'total sume', 'total-sume': 'total sume',
    'rulaj': 'rulaje',
    'debit': 'debitoare', 'db': 'debitoare',
    'credit': 'creditoare', 'cr': 'creditoare',
    'sold': 'sold', 'soldul': 'sold', 'solduri': 'solduri', 'soldurii': 'solduri'
  };
  
  // Aplicăm corectările
  Object.entries({...monthCorrections, ...accountingCorrections}).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  });
  
  return normalized;
}

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

          // Aplicăm și normalizarea avansată pentru greșeli ortografice
          const period = normalizeRomanianText(norm(rawPeriod));
          console.log(`Căutare perioadă: "${rawPeriod}" → normalizat: "${period}"`);

          // Hărți lună (RO + EN + numere) cu abrevieri
          const months: Record<string, number> = {
            ianuarie: 1, jan: 1, january: 1, ian: 1, '01': 1, '1': 1,
            februarie: 2, february: 2, feb: 2, '02': 2, '2': 2,
            martie: 3, march: 3, mar: 3, '03': 3, '3': 3,
            aprilie: 4, april: 4, apr: 4, aprile: 4, '04': 4, '4': 4,
            mai: 5, may: 5, '05': 5, '5': 5,
            iunie: 6, june: 6, iun: 6, jun: 6, '06': 6, '6': 6,
            iulie: 7, july: 7, iul: 7, jul: 7, '07': 7, '7': 7,
            august: 8, aug: 8, '08': 8, '8': 8,
            septembrie: 9, september: 9, sept: 9, sep: 9, '09': 9, '9': 9,
            octombrie: 10, october: 10, oct: 10, '10': 10,
            noiembrie: 11, november: 11, nov: 11, '11': 11,
            decembrie: 12, december: 12, dec: 12, '12': 12,
          };

          const monthFromText = (() => {
            for (const [k, v] of Object.entries(months)) {
              // Match exact pe cuvânt sau cifră izolată
              const wordBoundaryRegex = new RegExp(`\\b${k}\\b`, 'i');
              if (wordBoundaryRegex.test(period)) return v;
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
            
            // Aplicăm normalizarea avansată pentru a corecta greșeli
            const normalizedName = normalizeRomanianText(lowerName);
            const normalizedText = normalizeRomanianText(lowerText);

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
              // Verificăm atât cu text normal cât și cu text normalizat pentru greșeli
              if (lowerName.includes(k) || lowerText.includes(k) || 
                  normalizedName.includes(k) || normalizedText.includes(k)) {
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
        
        case "get_balance_accounts": {
          const { data: analysis, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, metadata")
            .eq("id", args.analysis_id)
            .single();
          
          if (error) throw error;
          if (!analysis) {
            throw new Error("Analiza nu a fost găsită");
          }
          
          const meta = analysis.metadata || {};
          const parsedBalance = meta.parsed_balance || {};
          let accounts = parsedBalance.accounts || [];
          
          // Filtrare după clasă dacă e specificată
          if (args.class_filter) {
            const classFilter = args.class_filter.toString();
            if (classFilter.includes('-')) {
              // Range de clase (ex: "6-7")
              const [start, end] = classFilter.split('-').map((c: string) => c.trim());
              accounts = accounts.filter((acc: any) => {
                const firstDigit = acc.code.charAt(0);
                return firstDigit >= start && firstDigit <= end;
              });
            } else {
              // Clasă unică (ex: "4")
              accounts = accounts.filter((acc: any) => acc.code.startsWith(classFilter));
            }
          }
          
          // FORMATARE AUTOMATĂ PENTRU AI: diferențiem clasele 1-5 vs 6-7
          const toNum = (v: any) => {
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
            return 0;
          };
          const formattedAccounts = accounts.map((acc: any) => {
            const firstDigit = acc.code.charAt(0);
            const formatted: any = {
              code: acc.code,
              name: acc.name,
              class: firstDigit
            };
            
            // CLASELE 1-5: folosim solduri finale
            if (['1', '2', '3', '4', '5'].includes(firstDigit)) {
              formatted.type = 'balance_account';
              formatted.sold_final_debit = toNum(acc.sold_final_debit);
              formatted.sold_final_credit = toNum(acc.sold_final_credit);
              // Adaugă interpretare
              if (formatted.sold_final_debit > 0) {
                formatted.display = `Sold final debitor: ${formatted.sold_final_debit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
              } else if (formatted.sold_final_credit > 0) {
                formatted.display = `Sold final creditor: ${formatted.sold_final_credit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
              } else {
                formatted.display = 'Sold 0';
              }
            }
            // CLASELE 6-7: folosim total sume
            else if (['6', '7'].includes(firstDigit)) {
              formatted.type = 'income_expense_account';
              formatted.total_sume_debit = toNum(acc.total_sume_debit);
              formatted.total_sume_credit = toNum(acc.total_sume_credit);
              // Pentru clasa 6 (cheltuieli): afișăm total sume debitoare
              if (firstDigit === '6') {
                formatted.display = `Total sume debitoare: ${formatted.total_sume_debit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
              }
              // Pentru clasa 7 (venituri): afișăm total sume creditoare
              else {
                formatted.display = `Total sume creditoare: ${formatted.total_sume_credit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
              }
              // Verificare anomalie: total sume debit și credit trebuie să fie egale
              if (Math.abs(formatted.total_sume_debit - formatted.total_sume_credit) > 0.01) {
                formatted.warning = `⚠️ ANOMALIE: Total sume debit (${formatted.total_sume_debit}) ≠ Total sume credit (${formatted.total_sume_credit})`;
              }
            }
            
            return formatted;
          });
          
          result = {
            analysis_id: analysis.id,
            file_name: analysis.file_name,
            date: analysis.created_at,
            accounts: formattedAccounts,
            total_accounts: formattedAccounts.length,
            parsed_at: parsedBalance.parsed_at,
            instructions: 'Pentru clasele 1-5, folosește sold_final_debit/credit. Pentru clasele 6-7, folosește total_sume_debit/credit. Câmpul "display" conține textul formatat gata de afișat.'
          };
          break;
        }
        
        case "get_class_totals_by_period": {
          const rawPeriod: string = (args.period || '').toString();
          const desiredClass: string = (args.class || '').toString();
          const norm = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
          const period = normalizeRomanianText(norm(rawPeriod));
          
          console.log(`Căutare totaluri clasa ${desiredClass}, perioadă: "${rawPeriod}" → normalizat: "${period}"`);
          
           // Hărți lună (RO + EN + numere)
            const months: Record<string, number> = {
              ianuarie: 1, jan: 1, january: 1, ian: 1, '01': 1, '1': 1,
              februarie: 2, february: 2, feb: 2, '02': 2, '2': 2,
              martie: 3, march: 3, mar: 3, '03': 3, '3': 3,
              aprilie: 4, april: 4, apr: 4, aprile: 4, '04': 4, '4': 4,
              mai: 5, may: 5, '05': 5, '5': 5,
              iunie: 6, june: 6, iun: 6, jun: 6, '06': 6, '6': 6,
              iulie: 7, july: 7, iul: 7, jul: 7, '07': 7, '7': 7,
              august: 8, aug: 8, '08': 8, '8': 8,
              septembrie: 9, september: 9, sep: 9, sept: 9, '09': 9, '9': 9,
              octombrie: 10, october: 10, oct: 10, '10': 10,
              noiembrie: 11, november: 11, nov: 11, '11': 11,
              decembrie: 12, december: 12, dec: 12, '12': 12,
            };
          
           const yearMatch = period.match(/(20\d{2})/);
           const targetYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
           let targetMonth: number | undefined = undefined;
           
           // Căutăm luna în ordine: nume complet → prescurtări → cifre
           for (const [name, num] of Object.entries(months)) {
             // Match exact pe cuvânt sau cifră izolată
             const wordBoundaryRegex = new RegExp(`\\b${name}\\b`, 'i');
             if (wordBoundaryRegex.test(period)) {
               targetMonth = num;
               break;
             }
           }
           
           console.log(`Period: "${period}" → Luna detectată: ${targetMonth}, An: ${targetYear}`);
          
          type Row = { id: string; file_name: string | null; created_at: string; metadata: any; analysis_text: string | null };
          const { data, error } = await supabase
            .from('analyses')
            .select('id, file_name, created_at, metadata, analysis_text')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          
          const parsePeriodFromRow = (row: Row): { month?: number; year?: number } => {
            const lowerName = (row.file_name || '').toLowerCase();
            const normalizedName = normalizeRomanianText(lowerName);
            
            // 1) Interval numeric în nume: 01-04-2025 30-04-2025
            const rangeRegex = /(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\s+(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/;
            const r = lowerName.match(rangeRegex);
            if (r) {
              const m = parseInt(r[2], 10);
              const y = parseInt(r[3], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }
            // 2) Dată unică numerică: dd-mm-yyyy
            const dateRegex = /(\b|[^0-9])(0?[1-9]|[12]\d|3[01])[\/\.-](0?[1-9]|1[0-2])[\/\.-](\d{4})(\b|[^0-9])/;
            const d = lowerName.match(dateRegex);
            if (d) {
              const m = parseInt(d[3], 10);
              const y = parseInt(d[4], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }
            // 3) Nume de lună în text + an 20xx
            const source = `${lowerName} ${row.created_at}`;
            const normalizedSource = normalizeRomanianText(source);
            for (const [name, num] of Object.entries(months)) {
              if (source.includes(name) || normalizedSource.includes(name)) {
                const ym = source.match(/20\d{2}/);
                return { month: num, year: ym ? parseInt(ym[0], 10) : undefined };
              }
            }
            return {};
          };
          
          const annotated = (data || []).map((row: Row) => ({ row, ...parsePeriodFromRow(row) }));
          if (!targetMonth) {
            // dacă lipsește luna din întrebare, alege cea mai recentă analiză
            const recent = annotated[0]?.row || null;
            if (!recent) throw new Error('Nu am găsit nicio analiză încărcată.');
            const meta = recent.metadata || {};
            const accounts: any[] = (meta.parsed_balance?.accounts) || [];
            const filtered = accounts.filter((acc: any) => acc.code?.startsWith(desiredClass));
            const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
            let totalDebit = filtered.reduce((s: number, a: any) => s + toNum(a.total_sume_debit), 0);
            let totalCredit = filtered.reduce((s: number, a: any) => s + toNum(a.total_sume_credit), 0);

            // Fallback: extrage din textul analizei dacă nu avem valori valide
            if ((filtered.length === 0 || (totalDebit === 0 && totalCredit === 0)) && (recent as any).analysis_text) {
              const text = ((recent as any).analysis_text as string) || '';
              const parseNum = (str: string) => {
                const raw = (str || '').replace(/\s/g, '');
                const last = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'));
                if (last >= 0) {
                  const intp = raw.slice(0, last).replace(/[\.,]/g, '');
                  const decp = raw.slice(last + 1);
                  return parseFloat(`${intp}.${decp}`);
                }
                return parseFloat(raw.replace(/[^0-9-]/g, '')) || 0;
              };
              const reCredit = new RegExp(`total\\s*sume\\s*credit\\w*[^\\d]*clasa\\s*${desiredClass}[^\\d]*([0-9][0-9\\.,\\s]*)`, 'i');
              const reDebit = new RegExp(`total\\s*sume\\s*debit\\w*[^\\d]*clasa\\s*${desiredClass}[^\\d]*([0-9][0-9\\.,\\s]*)`, 'i');
              const mC = text.match(reCredit);
              const mD = text.match(reDebit);
              if (desiredClass === '7' && mC) {
                totalCredit = parseNum(mC[1]);
                totalDebit = totalCredit; // pentru clasa 7, debitoarele = creditoarele
              } else if (desiredClass === '6' && mD) {
                totalDebit = parseNum(mD[1]);
                totalCredit = totalDebit; // pentru clasa 6, debitoarele = creditoarele
              }
            }

            result = {
              analysis_id: recent.id,
              file_name: recent.file_name,
              date: recent.created_at,
              period: rawPeriod,
              class: desiredClass,
              totals: {
                total_sume_debitoare: totalDebit,
                total_sume_creditoare: totalCredit,
                egale: Math.abs(totalDebit - totalCredit) < 0.01,
              },
              accounts_count: filtered.length,
            };
            break;
          }
          
          let candidates = annotated.filter(a => (targetMonth ? a.month === targetMonth : true));
          if (targetYear) candidates = candidates.filter(a => a.year === targetYear);
          if (!targetYear && targetMonth && candidates.length > 1) {
            const maxYear = Math.max(...candidates.map(c => c.year || 0));
            candidates = candidates.filter(c => (c.year || 0) === maxYear);
          }
          
          const found: Row | null = candidates.sort((a, b) => new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime())[0]?.row || null;
          if (!found) {
            result = { error: `Nu am găsit analiza pentru perioada "${rawPeriod}"` };
            break;
          }
          
          const meta = (found as any).metadata || {};
          const accounts: any[] = (meta.parsed_balance?.accounts) || [];
          
          console.log(`📊 DEBUG pentru ${rawPeriod}: găsite ${accounts.length} conturi în metadata`);
          
          const filtered = accounts.filter((acc: any) => acc.code?.startsWith(desiredClass));
          console.log(`🎯 Filtrate clasa ${desiredClass}: ${filtered.length} conturi`);
          
          let totalDebit = 0;
          let totalCredit = 0;
          
          // Pentru clasele 6-7, calculăm din Total sume
          if (desiredClass === '6' || desiredClass === '7') {
            const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
            totalDebit = filtered.reduce((s: number, a: any) => s + toNum(a.total_sume_debit), 0);
            totalCredit = filtered.reduce((s: number, a: any) => s + toNum(a.total_sume_credit), 0);
            console.log(`💰 Totaluri calculate din accounts (Total sume): D=${totalDebit}, C=${totalCredit}`);
          }

          // Fallback DOAR dacă nu avem metadata validă
          if ((filtered.length === 0 || (totalDebit === 0 && totalCredit === 0)) && (found as any).analysis_text) {
            console.log(`⚠️ Fallback la analysis_text pentru clasa ${desiredClass}`);
            const text = ((found as any).analysis_text as string) || '';
            const parseNum = (str: string) => {
              const raw = (str || '').replace(/\s/g, '');
              const last = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'));
              if (last >= 0) {
                const intp = raw.slice(0, last).replace(/[\.,]/g, '');
                const decp = raw.slice(last + 1);
                return parseFloat(`${intp}.${decp}`);
              }
              return parseFloat(raw.replace(/[^0-9-]/g, '')) || 0;
            };
            
            // Caută în text "Total clasa X" sau "Total sume ... clasa X"
            const reTotal = new RegExp(`total\\s*(?:sume\\s*)?(?:credit\\w*|debit\\w*)?[^\\d]*clasa\\s*${desiredClass}[^\\d]*([0-9][0-9\\.,\\s]*)`, 'i');
            const match = text.match(reTotal);
            
            if (match) {
              const value = parseNum(match[1]);
              if (desiredClass === '7') {
                totalCredit = value;
                totalDebit = value;
              } else if (desiredClass === '6') {
                totalDebit = value;
                totalCredit = value;
              }
              console.log(`📝 Extras din text: ${value}`);
            }
          }
          
          result = {
            analysis_id: (found as any).id,
            file_name: (found as any).file_name,
            date: (found as any).created_at,
            period: rawPeriod,
            class: desiredClass,
            totals: {
              total_sume_debitoare: totalDebit,
              total_sume_creditoare: totalCredit,
              egale: Math.abs(totalDebit - totalCredit) < 0.01,
            },
            accounts_count: filtered.length,
          };
          break;
        }
        
        case "get_analysis_indicators": {
          const rawPeriod = (args.period || '').toString();
          const period = normalizeRomanianText(rawPeriod.toLowerCase());
          
          console.log(`📊 Extragere indicatori pentru ${rawPeriod}`);
          
          // Găsește analiza pentru perioada specificată
          const { data, error } = await supabase
            .from('analyses')
            .select('id, file_name, created_at, metadata, analysis_text')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          
          const months: Record<string, number> = {
            ianuarie: 1, jan: 1, january: 1, ian: 1, '01': 1, '1': 1,
            februarie: 2, february: 2, feb: 2, '02': 2, '2': 2,
            martie: 3, march: 3, mar: 3, '03': 3, '3': 3,
            aprilie: 4, april: 4, apr: 4, aprile: 4, '04': 4, '4': 4,
            mai: 5, may: 5, '05': 5, '5': 5,
            iunie: 6, june: 6, iun: 6, jun: 6, '06': 6, '6': 6,
            iulie: 7, july: 7, iul: 7, jul: 7, '07': 7, '7': 7,
            august: 8, aug: 8, '08': 8, '8': 8,
            septembrie: 9, september: 9, sep: 9, sept: 9, '09': 9, '9': 9,
            octombrie: 10, october: 10, oct: 10, '10': 10,
            noiembrie: 11, november: 11, nov: 11, '11': 11,
            decembrie: 12, december: 12, dec: 12, '12': 12,
          };
          
          const targetParsed = (() => {
            const yearMatch = period.match(/(20\d{2})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
            for (const [name, num] of Object.entries(months)) {
              const wordBoundaryRegex = new RegExp(`\\b${name}\\b`, 'i');
              if (wordBoundaryRegex.test(period)) {
                return { month: num, year };
              }
            }
            return { month: undefined, year };
          })();
          
          const parsePeriodFromRow = (row: any) => {
            const fileName = (row.file_name || '').toLowerCase();
            const normalizedName = normalizeRomanianText(fileName);
            
            // 1) Caută date în format dd-mm-yyyy sau interval [01-01-2025 31-01-2025]
            const dateRangeMatch = fileName.match(/\[?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
            if (dateRangeMatch) {
              const month = parseInt(dateRangeMatch[2], 10);
              const year = parseInt(dateRangeMatch[3], 10);
              if (month >= 1 && month <= 12 && year >= 2000) {
                return { month, year };
              }
            }
            
            // 2) Fallback: caută nume de lună în text
            for (const [name, num] of Object.entries(months)) {
              if (normalizedName.includes(name)) {
                const yMatch = fileName.match(/20\d{2}/);
                const year = yMatch ? parseInt(yMatch[0]) : undefined;
                return { month: num, year };
              }
            }
            return { month: undefined, year: undefined };
          };
          
          // Găsește analiza potrivită
          const found = (data || []).find((row: any) => {
            const rowPeriod = parsePeriodFromRow(row);
            return rowPeriod.month === targetParsed.month && rowPeriod.year === targetParsed.year;
          });
          
          if (!found) {
            result = { 
              error: `Nu am găsit analiză pentru perioada ${rawPeriod}`,
              tip: "Încarcă mai întâi balanța contabilă pentru această perioadă."
            };
            break;
          }
          
          // FOLOSIM FUNCȚIA CENTRALIZATĂ PENTRU A EXTRAGE DIN TEXT
          const indicatoriDinText = extractIndicatorsFromText(found.analysis_text || '');

          // Fallback calcul profit din metadata (clasa 7 - clasa 6) dacă 121 nu e găsit
          const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
          const accounts = found.metadata?.parsed_balance?.accounts || [];
          const sumBy = (cls: string, field: 'total_sume_debit' | 'total_sume_credit') =>
            accounts.filter((a: any) => a.code?.startsWith(cls))
                    .reduce((s: number, a: any) => s + toNum(a[field]), 0);
          const ven7 = sumBy('7', 'total_sume_credit');
          const che6 = sumBy('6', 'total_sume_debit');
          const profitMeta = ven7 - che6;
          const indicatoriFinali = { ...indicatoriDinText } as any;
          if (indicatoriFinali.profit === undefined && (ven7 > 0 || che6 > 0)) {
            indicatoriFinali.profit = profitMeta;
          }
          if (indicatoriFinali.ca === undefined && ven7 > 0) indicatoriFinali.ca = ven7;
          if (indicatoriFinali.cheltuieli === undefined && che6 > 0) indicatoriFinali.cheltuieli = che6;
          
          result = {
            perioada: rawPeriod,
            indicatori: indicatoriFinali,
            fisier: found.file_name,
            nota: "Indicatori extrași DIRECT din textul analizei (dosarul tău)"
          };
          break;
        }
        
        case "get_bank_balance_by_period": {
          const rawPeriod = (args.period || '').toString();
          const period = normalizeRomanianText(rawPeriod.toLowerCase());
          
          console.log(`🏦 Căutare sold bancă pentru ${rawPeriod}`);
          
          const months: Record<string, number> = {
            ianuarie: 1, jan: 1, january: 1, ian: 1, '01': 1, '1': 1,
            februarie: 2, february: 2, feb: 2, '02': 2, '2': 2,
            martie: 3, march: 3, mar: 3, '03': 3, '3': 3,
            aprilie: 4, april: 4, apr: 4, aprile: 4, '04': 4, '4': 4,
            mai: 5, may: 5, '05': 5, '5': 5,
            iunie: 6, june: 6, iun: 6, jun: 6, '06': 6, '6': 6,
            iulie: 7, july: 7, iul: 7, jul: 7, '07': 7, '7': 7,
            august: 8, aug: 8, '08': 8, '8': 8,
            septembrie: 9, september: 9, sep: 9, sept: 9, '09': 9, '9': 9,
            octombrie: 10, october: 10, oct: 10, '10': 10,
            noiembrie: 11, november: 11, nov: 11, '11': 11,
            decembrie: 12, december: 12, dec: 12, '12': 12,
          };
          
          const targetParsed = (() => {
            const yearMatch = period.match(/(20\d{2})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
            for (const [name, num] of Object.entries(months)) {
              const wordBoundaryRegex = new RegExp(`\\b${name}\\b`, 'i');
              if (wordBoundaryRegex.test(period)) {
                return { month: num, year };
              }
            }
            return { month: undefined, year };
          })();

          const parsePeriodFromRow = (row: any) => {
            const fileName = (row.file_name || '').toLowerCase();
            const normalizedName = normalizeRomanianText(fileName);
            const dateRangeMatch = fileName.match(/\[?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
            if (dateRangeMatch) {
              const month = parseInt(dateRangeMatch[2], 10);
              const year = parseInt(dateRangeMatch[3], 10);
              if (month >= 1 && month <= 12 && year >= 2000) return { month, year };
            }
            for (const [name, num] of Object.entries(months)) {
              if (normalizedName.includes(name)) {
                const yMatch = fileName.match(/20\d{2}/);
                const year = yMatch ? parseInt(yMatch[0]) : undefined;
                return { month: num, year };
              }
            }
            return { month: undefined, year: undefined };
          };

          const { data, error } = await supabase
            .from('analyses')
            .select('id, file_name, created_at, analysis_text')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;

          const found = (data || []).find((row: any) => {
            const rowPeriod = parsePeriodFromRow(row);
            return rowPeriod.month === targetParsed.month && rowPeriod.year === targetParsed.year;
          });

          if (!found) {
            result = { error: `Nu am găsit analiza pentru perioada ${rawPeriod}` };
            break;
          }

          // FOLOSIM FUNCȚIA CENTRALIZATĂ
          const indicatori = extractIndicatorsFromText(found.analysis_text || '');
          const totalBanca = indicatori.banca || 0;

          result = {
            period: rawPeriod,
            sold_banca: totalBanca,
            message: `Sold bancă (doar conturi 512x, fără casa 531x) pentru ${rawPeriod}: ${totalBanca.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
            nota: 'Valoare extrasă DIRECT din textul analizei (dosarul tău)',
            fisier: found.file_name
          };
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
    const { message, history, conversationId, summaryType = 'detailed' } = await req.json();

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

    // Adaptează system prompt pe baza tipului de sumarizare și setează data curentă dinamic
    const now = new Date();
    const roNow = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    let adaptedPrompt = SYSTEM_PROMPT + `\n\n⏰ DATA CURENTĂ: ${roNow}\nREGULĂ CRITICĂ: Orice perioadă <= ${roNow} este DIN TRECUT. NU spune niciodată că 'ianuarie 2025 – martie 2025' este în viitor. Dacă utilizatorul oferă un interval, consideră-l valid dacă capătul intervalului este <= data curentă. Dacă nu e clar, FOLOSEȘTE TOOLS pentru a verifica analizele disponibile, nu răspunde din presupuneri.`;
    
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
        stream: true
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
          const normalizedUserMsg = normalizeRomanianText(message || "");
          const dataQuery = /(balant|profit|pierdere|venit|cheltuiel|cont|sold|total sume|clasa|clase)/i.test(normalizedUserMsg);

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
                  // Pentru întrebări de tip date (profit, conturi, solduri), nu afișăm conținut parțial înainte de tool-uri
                  if (dataQuery && toolCalls.length === 0) {
                    // ignorăm conținutul preliminar (salvăm doar intern dacă va fi nevoie)
                    accumulatedContent += delta.content;
                  } else {
                    accumulatedContent += delta.content;
                    sentAnyContent = true;
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: delta.content }) + "\n\n"));
                  }
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
                      let followUpProducedContent = false;
                      
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
                              followUpProducedContent = true;
                              accumulatedContent += followUpContent;
                              sentAnyContent = true;
                              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: followUpContent }) + "\n\n"));
                            }
                          } catch (e) {
                            console.error("Parse error follow-up:", e);
                          }
                        }
                      }

                      // Dacă follow-up nu a produs conținut, formăm răspunsul direct din rezultatele tool-urilor
                      if (!followUpProducedContent) {
                        try {
                          const byName = (n: string) => toolResults.find((r: any) => r.name === n);
                          let out = "";

                          const indTool = byName("get_analysis_indicators");
                          if (indTool) {
                            const payload = JSON.parse(indTool.content || '{}');
                            const ind = payload.indicatori || payload.indicators || {};
                            const per = payload.perioada || payload.period || (typeof payload === 'object' ? '' : '');
                            const fmt = (v: any) => (typeof v === 'number' ? v.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v);
                            const parts: string[] = [];
                            if (ind.profit !== undefined) parts.push(`Profit ${per}: ${fmt(ind.profit)} RON`);
                            if (ind.ca !== undefined) parts.push(`Cifră de afaceri: ${fmt(ind.ca)} RON`);
                            if (ind.cheltuieli !== undefined) parts.push(`Cheltuieli: ${fmt(ind.cheltuieli)} RON`);
                            if (ind.banca !== undefined) parts.push(`Bani în bancă (512x): ${fmt(ind.banca)} RON`);
                            out = parts.join("\n");
                          }

                          const bankTool = byName("get_bank_balance_by_period");
                          if (!out && bankTool) {
                            const payload = JSON.parse(bankTool.content || '{}');
                            const per = payload.period || message;
                            const val = payload.sold_banca || 0;
                            out = `Sold bancă (512x) pentru ${per}: ${Number(val).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;
                          }

                          const cls7 = byName("get_class_totals_by_period");
                          if (!out && cls7) {
                            const p = JSON.parse(cls7.content || '{}');
                            const per = p.period || message;
                            const tvc = p?.totals?.total_sume_creditoare ?? 0;
                            out = `Venituri (Clasa 7) ${per}: ${Number(tvc).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;
                          }

                          if (out) {
                            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', content: out }) + '\n\n'));
                            sentAnyContent = true;
                            accumulatedContent += (accumulatedContent ? '\n' : '') + out;
                          } else {
                            // Fallback direct: extrage profitul din textul analizei pentru perioada cerută
                            try {
                              const months: Record<string, number> = {
                                ianuarie: 1, jan: 1, january: 1, ian: 1, '01': 1, '1': 1,
                                februarie: 2, february: 2, feb: 2, '02': 2, '2': 2,
                                martie: 3, march: 3, mar: 3, '03': 3, '3': 3,
                                aprilie: 4, april: 4, apr: 4, aprile: 4, '04': 4, '4': 4,
                                mai: 5, may: 5, '05': 5, '5': 5,
                                iunie: 6, june: 6, iun: 6, jun: 6, '06': 6, '6': 6,
                                iulie: 7, july: 7, iul: 7, jul: 7, '07': 7, '7': 7,
                                august: 8, aug: 8, '08': 8, '8': 8,
                                septembrie: 9, september: 9, sep: 9, sept: 9, '09': 9, '9': 9,
                                octombrie: 10, october: 10, oct: 10, '10': 10,
                                noiembrie: 11, november: 11, nov: 11, '11': 11,
                                decembrie: 12, december: 12, dec: 12, '12': 12,
                              };
                              const normMsg = normalizeRomanianText(message || '');
                              const yearMatch = normMsg.match(/(20\d{2})/);
                              const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
                              let month: number | undefined;
                              for (const [name, num] of Object.entries(months)) {
                                const re = new RegExp(`\\b${name}\\b`, 'i');
                                if (re.test(normMsg)) { month = num; break; }
                              }
                              const { data: list } = await supabase
                                .from('analyses')
                                .select('file_name, analysis_text, created_at')
                                .order('created_at', { ascending: false })
                                .limit(50);
                              if (list && month) {
                                const foundRow = list.find((row: any) => {
                                  const fn = (row.file_name || '').toLowerCase();
                                  const rng = fn.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
                                  if (rng) {
                                    const m = parseInt(rng[2], 10); const y = parseInt(rng[3], 10);
                                    return m === month && (!year || y === year);
                                  }
                                  const nm = normalizeRomanianText(fn);
                                  const ym = fn.match(/20\d{2}/);
                                  const ry = ym ? parseInt(ym[0]) : undefined;
                                  return nm.includes(Object.keys(months).find(k => months[k] === month) || '') && (!year || ry === year);
                                });
                                if (foundRow?.analysis_text) {
                                  const inds = extractIndicatorsFromText(foundRow.analysis_text || '');
                                  if (typeof inds.profit === 'number') {
                                    const msgOut = `Profit ${message}: ${inds.profit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
                                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', content: msgOut }) + '\n\n'));
                                    sentAnyContent = true;
                                    accumulatedContent += (accumulatedContent ? '\n' : '') + msgOut;
                                  }
                                }
                              }
                            } catch (fbErr) {
                              console.error('Direct fallback extract failed:', fbErr);
                            }
                          }
                        } catch (e) {
                          console.error('Fallback format after tools failed:', e);
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

          // Fallback automat: dacă modelul nu a rulat tools, dar cererea indică extragere de date
          try {
            const normalizedUserMsg = normalizeRomanianText(message || "");
            const likelyDataIntent = /(balant|cont|sold|total sume|clasa|clase)/i.test(normalizedUserMsg);

            if (toolCalls.length === 0 && likelyDataIntent) {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "thinking", message: "Caut balanța și extrag conturile..." }) + "\n\n"));

              // 1) Găsește analiza pe baza perioadei din mesaj
              const autoCalls1 = [
                { function: { name: "get_analysis_by_period", arguments: JSON.stringify({ period: message }) } }
              ];
              const autoRes1 = await executeTools(autoCalls1, authHeader);

              let analysisId: string | null = null;
              const ga = autoRes1.find((r: any) => r.name === "get_analysis_by_period");
              if (ga) {
                try {
                  const payload = JSON.parse(ga.content || "{}");
                  analysisId = payload.analysis?.id || null;
                } catch {}
              }

              // 2) Dacă avem analiza, extragem conturile
              let allToolResults = [...autoRes1];
              if (analysisId) {
                const autoCalls2 = [
                  { function: { name: "get_balance_accounts", arguments: JSON.stringify({ analysis_id: analysisId }) } }
                ];
                const autoRes2 = await executeTools(autoCalls2, authHeader);
                allToolResults = [...autoRes1, ...autoRes2];
              }

              // 2.1) Întotdeauna încearcă să extragi indicatorii DIRECT din text pentru perioada cerută
              const indCalls = [
                { function: { name: 'get_analysis_indicators', arguments: JSON.stringify({ period: message }) } }
              ];
              const indRes = await executeTools(indCalls, authHeader);
              allToolResults = [...allToolResults, ...indRes];

              // Dacă avem profit din indicatori, răspunde imediat cu acesta (preferat față de calculul 6/7)
              const indTool = indRes.find((r: any) => r.name === 'get_analysis_indicators');
              if (indTool) {
                try {
                  const payload = JSON.parse(indTool.content || '{}');
                  const ind = payload.indicatori || payload.indicators || {};
                  const per = payload.perioada || payload.period || message;
                  if (typeof ind.profit === 'number') {
                    const msg = `Profit ${per}: ${ind.profit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', content: msg }) + '\n\n'));
                    sentAnyContent = true;
                    accumulatedContent += (accumulatedContent ? '\n' : '') + msg;
                  }
                } catch {}
              }

              // 3) Dacă întrebarea e despre venituri/cheltuieli/profit, calculez direct totalurile pe clasă
              const needRevenue = /(venit|clasa\s*7|total\s*sume\s*credit)/i.test(normalizedUserMsg);
              const needExpenses = /(cheltuiel|clasa\s*6|total\s*sume\s*debit)/i.test(normalizedUserMsg);
              const needProfit = /(profit|pe\s*profit|pierdere)/i.test(normalizedUserMsg);

              if (needRevenue || needExpenses || needProfit) {
                const toolCallsTotals: any[] = [];
                if (needRevenue || needProfit) {
                  toolCallsTotals.push({ function: { name: 'get_class_totals_by_period', arguments: JSON.stringify({ period: message, class: '7' }) } });
                }
                if (needExpenses || needProfit) {
                  toolCallsTotals.push({ function: { name: 'get_class_totals_by_period', arguments: JSON.stringify({ period: message, class: '6' }) } });
                }
                const totalsRes = await executeTools(toolCallsTotals, authHeader);
                const res7 = totalsRes.find((r: any) => r.name === 'get_class_totals_by_period' && JSON.parse(r.content||'{}').class === '7');
                const res6 = totalsRes.find((r: any) => r.name === 'get_class_totals_by_period' && JSON.parse(r.content||'{}').class === '6');
                const p7 = res7 ? JSON.parse(res7.content || '{}') : null;
                const p6 = res6 ? JSON.parse(res6.content || '{}') : null;

                let out = '';
                if (p7 && (needRevenue || needProfit)) {
                  const tvc = p7?.totals?.total_sume_creditoare ?? 0;
                  out += `Venituri (Clasa 7) ${new Date(p7.date).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}: ${tvc.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON\n`;
                }
                if (p6 && (needExpenses || needProfit)) {
                  const tsd = p6?.totals?.total_sume_debitoare ?? 0;
                  out += `Cheltuieli (Clasa 6): ${tsd.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON\n`;
                }
                if (needProfit) {
                  const rev = p7?.totals?.total_sume_creditoare ?? 0;
                  const exp = p6?.totals?.total_sume_debitoare ?? 0;
                  const prof = rev - exp;
                  out += `Rezultat: ${prof >= 0 ? 'Profit' : 'Pierdere'} ${Math.abs(prof).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON\n`;
                }

                if (out) {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', content: out.trim() }) + '\n\n'));
                  sentAnyContent = true;
                  accumulatedContent += (accumulatedContent ? '\n' : '') + out.trim();
                }
              }

              // 4) În loc de un al doilea apel la AI, FORMATEZ ȘI TRIMIT DIRECT REZULTATUL
              let formattedOutput = '';
              try {
                // Extragem payload-ul de conturi
                const gb = allToolResults.find((r: any) => r.name === "get_balance_accounts");
                if (gb) {
                  const payload = JSON.parse(gb.content || '{}');
                  const accounts: any[] = payload.accounts || [];
                  if (accounts.length === 0) {
                    formattedOutput = 'Nu am găsit conturi în balanță pentru perioada solicitată.';
                  } else {
                    const header = 'Iată conturile din balanța solicitată:\n- Clasele 1-5: solduri finale\n- Clasele 6-7: total sume';
                    const cls15 = accounts.filter(a => ['1','2','3','4','5'].includes(a.class));
                    const cls6  = accounts.filter(a => a.class === '6');
                    const cls7  = accounts.filter(a => a.class === '7');

                    const toLines = (arr: any[]) => arr.map(a => `• ${a.code} ${a.name} — ${a.display || ''}`);

                    const parts: string[] = [header];
                    if (cls15.length) {
                      parts.push('\nClasa 1-5 (solduri):');
                      parts.push(...toLines(cls15));
                    }
                    if (cls6.length) {
                      parts.push('\nClasa 6 (cheltuieli – total sume debitoare):');
                      parts.push(...toLines(cls6));
                    }
                    if (cls7.length) {
                      parts.push('\nClasa 7 (venituri – total sume creditoare):');
                      parts.push(...toLines(cls7));
                    }
                    formattedOutput = parts.join('\n');
                  }
                } else if (!analysisId) {
                  formattedOutput = 'Nu am găsit analiza pentru perioada cerută. Verifică te rog că balanța pe lună este încărcată.';
                } else {
                  formattedOutput = 'Am identificat analiza, dar nu am putut extrage conturile.';
                }
              } catch {
                formattedOutput = 'Nu am reușit să formatez rezultatul conturilor.';
              }

              if (formattedOutput) {
                // Trimitem în segmente pentru a evita blocarea interfeței
                const chunks = formattedOutput.match(/[\s\S]{1,1200}/g) || [formattedOutput];
                for (const ch of chunks) {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', content: ch }) + '\n\n'));
                }
                sentAnyContent = true;
                accumulatedContent += (accumulatedContent ? '\n' : '') + formattedOutput;
              }
            }
          } catch (e) {
            console.error("Fallback auto tools error:", e);
          }

          // Dacă tot nu am livrat niciun conținut, trimitem un fallback sigur
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
