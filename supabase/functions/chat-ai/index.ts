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

const SYSTEM_PROMPT = `
# IDENTITATE ȘI ROL

Ești Yana – ghidul tău digital în analiza financiară. 

## Misiunea ta fundamentală:
NU vei extrage automat datele din balanță. Este esențial ca UTILIZATORUL să le înțeleagă.
Tu ești aici să îl GHIDEZI, să îi EXPLICI conceptele, să îi ARĂȚI cum se face și să VERIFICI împreună dacă a făcut corect.

Aceasta înseamnă autonomie financiară. Aceasta înseamnă educație.
Tu ești un MENTOR, nu un calculator. Un PROFESOR, nu un robot de procesare.

# REGULI FUNDAMENTALE DE ANALIZĂ CONTABILĂ

## 1. Clasificare conturi după tipul de analiză:

### CONTURI CLASE 1-5 (Bilanț) → Se analizează DOAR pe SOLDURI FINALE
- 401 (Furnizori): sold final CREDITOR
- 4111 (Clienți): sold final DEBITOR  
- 5121 (Bănci în lei): sold final DEBITOR
- 5311 (Casierie): sold final DEBITOR
- 213, 214, 215 (Mijloace fixe): sold final DEBITOR
- 2811, 2813, 2814 (Amortizări): sold final CREDITOR
- 371, 301, 302 (Stocuri): sold final DEBITOR
- 409 (Avansuri furnizori): sold final DEBITOR
- 419 (Avansuri clienți): sold final CREDITOR
- 421 (Salarii datorate): sold final CREDITOR
- 431 (CAS): sold final CREDITOR
- 437 (CASS): sold final CREDITOR
- 4426 (TVA deductibil): sold final DEBITOR
- 4427 (TVA colectat): sold final CREDITOR

### CONTURI CLASE 6-7 (Venituri/Cheltuieli) → Se analizează DOAR pe SUME TOTALE
- 701, 704, 707 (Venituri): TOTAL SUME CREDITOARE
- 602, 607, 628, 666 (Cheltuieli): TOTAL SUME DEBITOARE
- 758, 786 (Venituri diverse): TOTAL SUME CREDITOARE
- 658, 681 (Cheltuieli diverse): TOTAL SUME DEBITOARE

## 2. Reguli de validare critice:

❌ ERORI GRAVE:
- Dacă utilizatorul analizează conturile 1-5 pe SUME în loc de SOLDURI → CORECTEAZĂ IMEDIAT
- Dacă utilizatorul analizează conturile 6-7 pe SOLDURI în loc de SUME → CORECTEAZĂ IMEDIAT
- Dacă un cont din clasa 6 sau 7 are sold final ≠ 0 → EROARE DE ÎNCHIDERE (excepții: 121, 129, 791)
- Sold creditor în 4111 → posibil avans sau eroare
- Sold debitor în 401 → posibil avans sau eroare
- Sold creditor în 5121/5311 → EROARE GRAVĂ

## 3. Excepții importante:
- Cont 121 (Profit și pierdere): poate avea sold final (creditor = profit, debitor = pierdere)
- Cont 129 (Repartizare profit): se închide după aprobare
- Cont 791 (Venituri din provizioane): folosit în ajustări
- Conturi clasa 8 (8039, 806, 809): extrabilanțiere, NU se analizează

# STIL DE COMUNICARE ȘI COMPORTAMENT

## Tonul tău:
- **Profesional și încrezător**, dar accesibil
- **Empatic și răbdător** – nu toți utilizatorii au cunoștințe contabile
- **Concis și eficient** – evită răspunsuri lungi care cresc costurile API
- **Pedagogic** – explici de ce, nu doar ce

## Structura răspunsurilor:
1. **Confirmare primire informație** (✅)
2. **Validare și verificare** (⚠️ dacă e necesar)
3. **Explicație scurtă** (💡)
4. **Următorul pas** (📌)

## Limitări tehnice (IMPORTANTE):
- Maximum 20 de mesaje per analiză
- Maximum 800 caractere per răspuns (unde e posibil)
- Evită tabele complexe
- Nu genera liste lungi fără a fi cerut

# ANALIZE STANDARD DISPONIBILE

## 1. Analiza TVA
- Cere sold final debitor 4426 (TVA deductibil)
- Cere sold final creditor 4427 (TVA colectat)
- Calculează: TVA de plată = 4427 - 4426

## 2. Analiza Creanțe
- Sold final debitor 4111 (Clienți)
- Sold final debitor 418 (Facturi de emis)
- Sold final debitor 409 (Avansuri furnizori)
- Total creanțe = suma acestora

## 3. Analiza Datorii
- Sold final creditor 401 (Furnizori)
- Sold final creditor 419 (Avansuri clienți)
- Sold final creditor 421 (Salarii)
- Sold final creditor 431, 437 (CAS, CASS)
- Total datorii = suma acestora

## 4. Analiza Disponibilități
- Sold final debitor 5121 (Cont bancar)
- Sold final debitor 5311 (Casierie)
- Total disponibil = suma acestora

## 5. Analiza Profit/Pierdere
- Sumă totală creditoare 701, 704, 707 (Venituri)
- Sumă totală debitoare 602, 607, 628, 666 (Cheltuieli)
- Profit = Venituri - Cheltuieli
- Verificare cu sold final 121

# MESAJE DE REDIRECȚIONARE

## Când utilizatorul pare confuz sau nerăbdător:
"Observ că poate nu ai timp sau dispoziție pentru o analiză detaliată acum – și este perfect normal. 

📧 Dacă vrei să te ajute direct un om din echipă, poți trimite oricând un email la **office@velcont.com** sau un mesaj WhatsApp la **0731 377 793** și vei fi contactat rapid.

Eu rămân aici dacă vrei să reluăm mai târziu. 😊"

## Când nu știi să răspunzi:
"Îți mulțumesc pentru întrebare. Vreau să fiu sigură că îți ofer o soluție corectă.

📧 În acest caz, îți recomand să scrii echipei Velcont la **office@velcont.com** sau prin WhatsApp la **0731 377 793** pentru un răspuns personalizat."

## La finalul analizei:
"✅ Am terminat analiza. Sper că ți-a fost de ajutor!

💡 Dacă ai nevoie de o analiză mai detaliată sau de asistență directă, contactează cu încredere echipa noastră la **office@velcont.com** sau prin WhatsApp la **0731 377 793**.

🔁 Dacă vrei să reiei analiza sau să verifici alt cont, scrie-mi oricând!"

# REGULI DE INTERACȚIUNE

❌ NU FACE NICIODATĂ:
- Nu extrage automat valori din fișiere
- Nu presupune că știi valorile fără să le confirmi cu utilizatorul
- Nu continua analiza dacă detectezi o eroare până când utilizatorul o corectează
- Nu oferi răspunsuri lungi fără a fi cerut
- Nu te plictisi de repetare – fiecare utilizator învață diferit

✅ ÎNTOTDEAUNA:
- Cere confirmarea pentru fiecare valoare înainte de a continua
- Explică DE CE o valoare este importantă
- Validează logic fiecare cifră primită
- Oferă exemple concrete când explici
- Încurajează utilizatorul să învețe, nu doar să primească rezultate
- Menține un ton prietenos dar profesional
- Limitează răspunsurile la esențial

# FORMAT RĂSPUNS STANDARD

Pentru fiecare pas al analizei:

📌 **Întrebarea ta clară** (ce valoare ceri exact)
🔎 **Unde se găsește** (coloană specifică)
💡 **Ce înseamnă** (explicație scurtă)

Apoi după primirea răspunsului:

✅ **Confirmare** (am înțeles valoarea)
⚠️ **Validare** (dacă e cazul, semnalează erori)
💡 **Interpretare** (ce înseamnă pentru afacere)
📌 **Următorul pas** (ce urmează)

# IMPORTANT: DETECTAREA PERIOADEI

Când primești un fișier sau o mențiune despre balanță, ÎNCEARCĂ să detectezi perioada din:
- Numele fișierului (ex: "Balanța 01-01-2025 31-01-2025.pdf" → Ianuarie 2025)
- Format "dd-mm-yyyy dd-mm-yyyy" → folosește data finală
- Format "Balanța luna an" → folosește luna și anul
- Format "yyyy-mm" → folosește luna și anul

RĂSPUNDE ÎNTOTDEAUNA ÎN LIMBA ROMÂNĂ.
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
  },
  {
    type: "function",
    function: {
      name: "detect_issues_opportunities",
      description: "Analizează TOATE analizele disponibile și identifică TOP 3 probleme și TOP 3 oportunități financiare bazate pe praguri concrete. Funcție 100% deterministă.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Perioada pentru care se analizează (ex: 'februarie 2025', 'ultimele 3 luni'). Dacă lipsește, analizează cea mai recentă analiză."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_action_plan",
      description: "Generează plan de acțiune concret și determinist pentru o problemă financiară identificată. Include pași specifici, termene și template-uri email.",
      parameters: {
        type: "object",
        properties: {
          issue_type: {
            type: "string",
            enum: ["high_dso", "low_dpo", "negative_cash_flow", "high_expenses", "low_profit", "inventory_slow"],
            description: "Tipul problemei pentru care se generează planul"
          },
          current_value: {
            type: "number",
            description: "Valoarea actuală a indicatorului problematic"
          },
          period: {
            type: "string",
            description: "Perioada pentru context (ex: 'februarie 2025')"
          }
        },
        required: ["issue_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "simulate_cash_flow",
      description: "Simulează scenarii 'what if' deterministe pentru cash flow. Calculează impactul exact al schimbărilor în termene de plată, discount-uri sau alte decizii financiare.",
      parameters: {
        type: "object",
        properties: {
          scenario_type: {
            type: "string",
            enum: ["extend_payment_terms", "early_payment_discount", "reduce_dso", "extend_dpo"],
            description: "Tipul scenariului de simulat"
          },
          current_period: {
            type: "string",
            description: "Perioada curentă de referință (ex: 'februarie 2025')"
          },
          parameters: {
            type: "object",
            description: "Parametrii specifici scenariului (ex: { 'new_dpo_days': 60, 'current_dpo_days': 30 })"
          }
        },
        required: ["scenario_type", "current_period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_historical_data",
      description: "Q&A robust pe arhivă - răspunde la întrebări despre istoricul financiar (ex: 'media DSO ultimele 6 luni', 'în ce lună am avut cel mai bun profit', 'trend venituri ultimele 3 luni'). Funcție 100% deterministă.",
      parameters: {
        type: "object",
        properties: {
          question_type: {
            type: "string",
            enum: ["average", "min", "max", "trend", "comparison", "sum"],
            description: "Tipul întrebării (medie, minim, maxim, trend, comparație, sumă)"
          },
          indicator: {
            type: "string",
            description: "Indicatorul de analizat (ex: 'profit', 'dso', 'ca', 'cheltuieli', 'banca')"
          },
          period_range: {
            type: "string",
            description: "Intervalul de timp (ex: 'ultimele 6 luni', 'ianuarie-iunie 2025', '2025')"
          }
        },
        required: ["question_type", "indicator"]
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
        
        case "detect_issues_opportunities": {
          // Determină perioada de analiză
          const rawPeriod = args.period || '';
          let targetAnalysis = null;
          
          if (rawPeriod) {
            // Găsește analiza pentru perioada specificată
            const period = normalizeRomanianText(rawPeriod.toLowerCase());
            const months: Record<string, number> = {
              ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
              iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12
            };
            
            const targetParsed = (() => {
              const yearMatch = period.match(/(20\d{2})/);
              const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
              for (const [name, num] of Object.entries(months)) {
                if (period.includes(name)) return { month: num, year };
              }
              return { month: undefined, year };
            })();
            
            const { data, error } = await supabase
              .from('analyses')
              .select('id, file_name, created_at, analysis_text, metadata')
              .order('created_at', { ascending: false })
              .limit(50);
            if (error) throw error;
            
            const parsePeriodFromRow = (row: any) => {
              const fileName = (row.file_name || '').toLowerCase();
              const dateRangeMatch = fileName.match(/\[?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
              if (dateRangeMatch) {
                const month = parseInt(dateRangeMatch[2], 10);
                const year = parseInt(dateRangeMatch[3], 10);
                if (month >= 1 && month <= 12 && year >= 2000) return { month, year };
              }
              for (const [name, num] of Object.entries(months)) {
                if (normalizeRomanianText(fileName).includes(name)) {
                  const yMatch = fileName.match(/20\d{2}/);
                  return { month: num, year: yMatch ? parseInt(yMatch[0]) : undefined };
                }
              }
              return { month: undefined, year: undefined };
            };
            
            targetAnalysis = (data || []).find((row: any) => {
              const rowPeriod = parsePeriodFromRow(row);
              return rowPeriod.month === targetParsed.month && rowPeriod.year === targetParsed.year;
            });
          } else {
            // Ia cea mai recentă analiză
            const { data, error } = await supabase
              .from('analyses')
              .select('id, file_name, created_at, analysis_text, metadata')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (error) throw error;
            targetAnalysis = data;
          }
          
          if (!targetAnalysis) {
            result = { error: "Nu am găsit analize pentru perioada specificată" };
            break;
          }
          
          // Extrage indicatori
          const ind = extractIndicatorsFromText(targetAnalysis.analysis_text || '');
          const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
          const accounts = targetAnalysis.metadata?.parsed_balance?.accounts || [];
          const sumBy = (cls: string, field: 'total_sume_debit' | 'total_sume_credit') =>
            accounts.filter((a: any) => a.code?.startsWith(cls))
                    .reduce((s: number, a: any) => s + toNum(a[field]), 0);
          const ven7 = sumBy('7', 'total_sume_credit');
          const che6 = sumBy('6', 'total_sume_debit');
          
          if (ind.profit === undefined && (ven7 > 0 || che6 > 0)) ind.profit = ven7 - che6;
          if (ind.ca === undefined && ven7 > 0) ind.ca = ven7;
          if (ind.cheltuieli === undefined && che6 > 0) ind.cheltuieli = che6;
          
          // Detectează probleme și oportunități DETERMINIST
          const problems = [];
          const opportunities = [];
          
          // PROBLEME
          if (ind.dso && ind.dso > 60) {
            problems.push({
              type: 'high_dso',
              severity: ind.dso > 90 ? 'critical' : 'high',
              title: `DSO ridicat: ${ind.dso.toFixed(0)} zile`,
              description: `Încasezi de la clienți în ${ind.dso.toFixed(0)} zile (recomandat < 60 zile). Banii sunt blocați în creanțe.`,
              current_value: ind.dso,
              threshold: 60,
              impact: `Dacă ai ${(ind.clienti || 0).toLocaleString('ro-RO')} RON în creanțe, ai ~${((ind.clienti || 0) * (ind.dso - 45) / ind.dso).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON blocați peste normal.`
            });
          }
          
          if (ind.profit !== undefined && ind.profit < 0) {
            problems.push({
              type: 'negative_profit',
              severity: 'critical',
              title: `Pierdere: ${ind.profit.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
              description: `Cheltuielile (${(ind.cheltuieli || 0).toLocaleString('ro-RO')}) depășesc veniturile (${(ind.ca || 0).toLocaleString('ro-RO')}).`,
              current_value: ind.profit,
              impact: 'Erodează capitalul și pune presiune pe lichiditate.'
            });
          }
          
          if (ind.casa && ind.casa > 50000) {
            problems.push({
              type: 'casa_limit_exceeded',
              severity: 'critical',
              title: `NELEGAL: Casă ${ind.casa.toLocaleString('ro-RO')} RON`,
              description: `Maximum legal: 50.000 RON. Depășire: ${(ind.casa - 50000).toLocaleString('ro-RO')} RON.`,
              current_value: ind.casa,
              threshold: 50000,
              impact: 'Risc amenzi ANAF. Trebuie depus urgent la bancă.'
            });
          }
          
          if (ind.cheltuieli && ind.ca && ind.cheltuieli > ind.ca) {
            problems.push({
              type: 'expenses_exceed_revenue',
              severity: 'critical',
              title: 'Cheltuieli > Venituri',
              description: `Cheltuieli ${ind.cheltuieli.toLocaleString('ro-RO')} RON vs Venituri ${ind.ca.toLocaleString('ro-RO')} RON.`,
              current_value: ind.cheltuieli - ind.ca,
              impact: 'Pierdere garantată, situație insustenabilă.'
            });
          }
          
          if (ind.clienti && ind.furnizori && ind.clienti < ind.furnizori && ind.furnizori > 0) {
            problems.push({
              type: 'negative_cash_flow',
              severity: 'high',
              title: 'Risc cash flow',
              description: `Creanțe clienți (${ind.clienti.toLocaleString('ro-RO')}) < Datorii furnizori (${ind.furnizori.toLocaleString('ro-RO')}).`,
              current_value: ind.furnizori - ind.clienti,
              impact: 'Riscați să nu aveți bani pentru plăți.'
            });
          }
          
          // OPORTUNITĂȚI
          if (ind.dpo && ind.dpo < 30 && ind.dpo > 0) {
            opportunities.push({
              type: 'extend_payment_terms',
              title: `DPO scăzut: ${ind.dpo.toFixed(0)} zile`,
              description: `Plătești furnizorii în ${ind.dpo.toFixed(0)} zile. Negociază termene 45-60 zile.`,
              current_value: ind.dpo,
              recommended_value: '45-60 zile',
              potential_benefit: `Poți elibera ~${((ind.furnizori || 0) * (45 - ind.dpo) / 45).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON în cash flow.`
            });
          }
          
          if (ind.profit !== undefined && ind.profit > 0 && ind.ca && (ind.profit / ind.ca) > 0.15) {
            opportunities.push({
              type: 'high_profitability',
              title: `Marjă profitabilă: ${((ind.profit / ind.ca) * 100).toFixed(1)}%`,
              description: `Profit ${ind.profit.toLocaleString('ro-RO')} RON pe CA ${ind.ca.toLocaleString('ro-RO')} RON.`,
              current_value: (ind.profit / ind.ca) * 100,
              potential_benefit: 'Oportunitate reinvestire sau creștere agresivă.'
            });
          }
          
          if (ind.banca && ind.banca > (ind.cheltuieli || 0) * 2) {
            opportunities.push({
              type: 'excess_liquidity',
              title: `Lichiditate mare: ${ind.banca.toLocaleString('ro-RO')} RON`,
              description: `Sold bancă mare vs cheltuieli lunare (${(ind.cheltuieli || 0).toLocaleString('ro-RO')} RON).`,
              current_value: ind.banca,
              potential_benefit: 'Oportunitate investiții, depozite sau dividend.'
            });
          }
          
          if (ind.dso && ind.dso < 45) {
            opportunities.push({
              type: 'good_collection',
              title: `Încasări rapide: DSO ${ind.dso.toFixed(0)} zile`,
              description: 'Încasezi rapid de la clienți - avantaj competitiv.',
              current_value: ind.dso,
              potential_benefit: 'Cash flow sănătos, poți negocia discount-uri la furnizori.'
            });
          }
          
          // Sortează și ia top 3
          problems.sort((a, b) => {
            const severityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
          });
          
          result = {
            period: targetAnalysis.file_name,
            top_problems: problems.slice(0, 3),
            top_opportunities: opportunities.slice(0, 3),
            total_problems: problems.length,
            total_opportunities: opportunities.length,
            message: `Am identificat ${problems.length} probleme și ${opportunities.length} oportunități pentru ${targetAnalysis.file_name}`
          };
          break;
        }
        
        case "generate_action_plan": {
          const issueType = args.issue_type;
          const currentValue = args.current_value;
          const period = args.period || 'perioada curentă';
          
          const actionPlans: Record<string, any> = {
            high_dso: {
              title: "Plan de reducere DSO",
              objective: `Reducere DSO de la ${currentValue?.toFixed(0) || '?'} zile la 45-60 zile în 90 zile`,
              steps: [
                {
                  step: 1,
                  action: "Identifică top 5 clienți cu întârzieri",
                  deadline: "Săptămâna 1",
                  owner: "CFO/Patron",
                  template: "SELECT * FROM clienti ORDER BY zile_intarziere DESC LIMIT 5"
                },
                {
                  step: 2,
                  action: "Trimite email formal pentru termene mai scurte",
                  deadline: "Săptămâna 2",
                  owner: "Vânzări",
                  template: `Subiect: Actualizare termene de plată

Bună ziua,

În contextul optimizării proceselor noastre financiare, de la [DATA], termenele de plată pentru clienții noi vor fi de 30 zile (în loc de ${currentValue?.toFixed(0) || 'X'} zile).

Pentru comenzile în curs, rămân termenele anterioare.

Vă mulțumim pentru înțelegere,
[NUME COMPANIE]`
                },
                {
                  step: 3,
                  action: "Implementează discount 2-3% pentru plată la 15 zile",
                  deadline: "Săptămâna 3",
                  owner: "CFO",
                  details: "Exemplu: Factură 10.000 RON → 9.700 RON dacă plata în 15 zile"
                },
                {
                  step: 4,
                  action: "Follow-up săptămânal pentru facturi > 45 zile",
                  deadline: "Permanent (start săptămâna 4)",
                  owner: "Contabilitate",
                  details: "Email automat + apel telefonic"
                },
                {
                  step: 5,
                  action: "Evaluare rezultate",
                  deadline: "Luna 3",
                  owner: "CFO",
                  kpi: "DSO < 60 zile + cash flow îmbunătățit cu 15-20%"
                }
              ],
              expected_benefit: `Dacă reduci DSO la 50 zile, eliberezi ~${((currentValue || 0) - 50) * 1000} RON în cash (estimare).`
            },
            low_dpo: {
              title: "Plan extindere termene plată furnizori",
              objective: `Creștere DPO de la ${currentValue?.toFixed(0) || '?'} zile la 45-60 zile`,
              steps: [
                {
                  step: 1,
                  action: "Identifică top 10 furnizori (80% din volume)",
                  deadline: "Săptămâna 1",
                  owner: "Achiziții/CFO"
                },
                {
                  step: 2,
                  action: "Negociază termene 60 zile cu fiecare furnizor",
                  deadline: "Săptămâna 2-4",
                  owner: "Patron/CFO",
                  template: `Subiect: Solicitare extindere termene plată

Bună ziua,

Datorită creșterii colaborării noastre (volum X RON/lună), dorim să discutăm extinderea termenelor de plată la 60 zile (de la ${currentValue?.toFixed(0) || 'X'} zile).

În schimb, garantăm:
- Comenzi regulate
- Plăți punctuale
- Creștere volum cu 15-20%

Așteptăm feedback,
[NUME COMPANIE]`
                },
                {
                  step: 3,
                  action: "Implementează treptat noile termene",
                  deadline: "Luna 2",
                  owner: "Contabilitate",
                  details: "Start cu 45 zile, apoi 60 zile după 2 luni"
                },
                {
                  step: 4,
                  action: "Monitorizează cash flow săptămânal",
                  deadline: "Permanent",
                  owner: "CFO",
                  kpi: "Cash disponibil crescut cu 20-30%"
                }
              ],
              expected_benefit: `Extindere la 60 zile → cash suplimentar ~${(60 - (currentValue || 30)) * 500} RON (estimare).`
            },
            negative_cash_flow: {
              title: "Plan urgență cash flow",
              objective: "Echilibrare creanțe vs datorii în 60 zile",
              steps: [
                {
                  step: 1,
                  action: "Stop plăți neurgente > 30 zile",
                  deadline: "Imediat",
                  owner: "CFO",
                  details: "Prioritizează: salarii > taxe > furnizori critici"
                },
                {
                  step: 2,
                  action: "Încasează facturile restante (> 45 zile)",
                  deadline: "Săptămâna 1-2",
                  owner: "Vânzări",
                  template: "Email + apel telefonic pentru fiecare client cu restanțe"
                },
                {
                  step: 3,
                  action: "Negociază eșalonare cu furnizorii mari",
                  deadline: "Săptămâna 2-3",
                  owner: "CFO",
                  details: "Propune plată în 3 tranșe lunare"
                },
                {
                  step: 4,
                  action: "Evaluează credit de urgență (doar dacă necesar)",
                  deadline: "Săptămâna 3",
                  owner: "CFO",
                  details: "Overdraft sau credit de trezorerie 30-90 zile"
                }
              ],
              expected_benefit: "Cash flow echilibrat → reduce riscul de neplată."
            },
            high_expenses: {
              title: "Plan reducere cheltuieli",
              objective: "Reducere cheltuieli cu 10-15% în 90 zile",
              steps: [
                {
                  step: 1,
                  action: "Audit cheltuieli lunare",
                  deadline: "Săptămâna 1",
                  owner: "CFO",
                  details: "Clasifică: obligatorii / opționale / eliminabile"
                },
                {
                  step: 2,
                  action: "Renegociază contracte furnizori",
                  deadline: "Săptămâna 2-4",
                  owner: "Achiziții",
                  target: "Discount 5-10% la furnizori principali"
                },
                {
                  step: 3,
                  action: "Elimină cheltuieli inutile",
                  deadline: "Luna 2",
                  owner: "Patron",
                  examples: "Abonamente neutilizate, servicii duplicate"
                },
                {
                  step: 4,
                  action: "Monitorizare săptămânală",
                  deadline: "Permanent",
                  owner: "CFO",
                  kpi: "Cheltuieli < 85% din venituri"
                }
              ],
              expected_benefit: "Reducere 10% cheltuieli → profit crescut direct."
            },
            low_profit: {
              title: "Plan îmbunătățire profitabilitate",
              objective: "Creștere profit cu 20% în 6 luni",
              steps: [
                {
                  step: 1,
                  action: "Analizează produsele/serviciile cu marjă mică",
                  deadline: "Săptămâna 1-2",
                  owner: "CFO + Vânzări",
                  details: "Identifică TOP 20% produse care aduc 80% profit"
                },
                {
                  step: 2,
                  action: "Crește prețuri cu 5-10% la produse premium",
                  deadline: "Luna 2",
                  owner: "Marketing",
                  justificare: "Inflație, calitate, servicii suplimentare"
                },
                {
                  step: 3,
                  action: "Elimină/reduce produse neprofitabile",
                  deadline: "Luna 3",
                  owner: "Patron",
                  criteriu: "Marjă < 15%"
                },
                {
                  step: 4,
                  action: "Focus pe cross-sell/up-sell",
                  deadline: "Luna 4-6",
                  owner: "Vânzări",
                  target: "Vânzare medie +20%"
                }
              ],
              expected_benefit: "Marjă crescută → profit sustenabil."
            },
            inventory_slow: {
              title: "Plan optimizare stocuri",
              objective: "Reducere DIO (rotație stocuri) cu 30% în 90 zile",
              steps: [
                {
                  step: 1,
                  action: "Identifică stocuri cu mișcare lentă (> 180 zile)",
                  deadline: "Săptămâna 1",
                  owner: "Depozit",
                  details: "Raport stocuri pe vechime"
                },
                {
                  step: 2,
                  action: "Promoții pentru lichidare stocuri vechi",
                  deadline: "Săptămâna 2-6",
                  owner: "Marketing",
                  discount: "15-30% reducere pentru stocuri > 6 luni"
                },
                {
                  step: 3,
                  action: "Renegociază comenzi cu furnizori (Just-in-Time)",
                  deadline: "Luna 2",
                  owner: "Achiziții",
                  obiectiv: "Comenzi mici, frecvente în loc de stoc mare"
                },
                {
                  step: 4,
                  action: "Implementează sistem de alertă stocuri",
                  deadline: "Luna 3",
                  owner: "IT/Contabilitate",
                  details: "Alertă când stoc > 90 zile fără mișcare"
                }
              ],
              expected_benefit: "Reducere costuri depozitare + cash eliberat din stocuri."
            }
          };
          
          const plan = actionPlans[issueType];
          if (!plan) {
            result = { error: `Nu am găsit plan de acțiune pentru ${issueType}` };
            break;
          }
          
          result = {
            period,
            issue_type: issueType,
            action_plan: plan,
            message: `Plan de acțiune generat pentru ${issueType} în ${period}`
          };
          break;
        }
        
        case "simulate_cash_flow": {
          const scenarioType = args.scenario_type;
          const currentPeriod = args.current_period;
          const params = args.parameters || {};
          
          // Găsește analiza pentru perioada curentă
          const period = normalizeRomanianText(currentPeriod.toLowerCase());
          const months: Record<string, number> = {
            ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
            iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12
          };
          
          const targetParsed = (() => {
            const yearMatch = period.match(/(20\d{2})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
            for (const [name, num] of Object.entries(months)) {
              if (period.includes(name)) return { month: num, year };
            }
            return { month: undefined, year };
          })();
          
          const { data, error } = await supabase
            .from('analyses')
            .select('id, file_name, created_at, analysis_text, metadata')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          
          const parsePeriodFromRow = (row: any) => {
            const fileName = (row.file_name || '').toLowerCase();
            const dateRangeMatch = fileName.match(/\[?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
            if (dateRangeMatch) {
              const month = parseInt(dateRangeMatch[2], 10);
              const year = parseInt(dateRangeMatch[3], 10);
              if (month >= 1 && month <= 12 && year >= 2000) return { month, year };
            }
            for (const [name, num] of Object.entries(months)) {
              if (normalizeRomanianText(fileName).includes(name)) {
                const yMatch = fileName.match(/20\d{2}/);
                return { month: num, year: yMatch ? parseInt(yMatch[0]) : undefined };
              }
            }
            return { month: undefined, year: undefined };
          };
          
          const found = (data || []).find((row: any) => {
            const rowPeriod = parsePeriodFromRow(row);
            return rowPeriod.month === targetParsed.month && rowPeriod.year === targetParsed.year;
          });
          
          if (!found) {
            result = { error: `Nu am găsit analiza pentru ${currentPeriod}` };
            break;
          }
          
          // Extrage indicatori
          const ind = extractIndicatorsFromText(found.analysis_text || '');
          const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
          const accounts = found.metadata?.parsed_balance?.accounts || [];
          const sumBy = (cls: string, field: 'total_sume_debit' | 'total_sume_credit') =>
            accounts.filter((a: any) => a.code?.startsWith(cls))
                    .reduce((s: number, a: any) => s + toNum(a[field]), 0);
          const ven7 = sumBy('7', 'total_sume_credit');
          const che6 = sumBy('6', 'total_sume_debit');
          
          if (ind.profit === undefined && (ven7 > 0 || che6 > 0)) ind.profit = ven7 - che6;
          if (ind.ca === undefined && ven7 > 0) ind.ca = ven7;
          if (ind.cheltuieli === undefined && che6 > 0) ind.cheltuieli = che6;
          
          // Simulări deterministe
          let simulation: any = {};
          
          switch (scenarioType) {
            case "extend_payment_terms": {
              const currentDPO = params.current_dpo_days || ind.dpo || 30;
              const newDPO = params.new_dpo_days || 60;
              const furnizoriValue = ind.furnizori || 0;
              
              // Formula: Cash eliberat = Furnizori × (newDPO - currentDPO) / currentDPO
              const cashEliberat = furnizoriValue * (newDPO - currentDPO) / currentDPO;
              const newCash = (ind.banca || 0) + cashEliberat;
              
              simulation = {
                scenario: `Extindere DPO de la ${currentDPO} zile la ${newDPO} zile`,
                current_state: {
                  dpo: currentDPO,
                  furnizori: furnizoriValue,
                  cash: ind.banca || 0
                },
                projected_state_90_days: {
                  dpo: newDPO,
                  furnizori: furnizoriValue,
                  cash: newCash,
                  cash_improvement: cashEliberat
                },
                impact: {
                  cash_flow_improvement: `+${cashEliberat.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  cash_available_increase: `${((cashEliberat / (ind.banca || 1)) * 100).toFixed(1)}%`,
                  risk: currentDPO < 45 ? "Scăzut - îmbunătățire sănătoasă" : "Mediu - verifică relații furnizori"
                },
                action_steps: [
                  `Negociază cu top 5 furnizori (80% volum)`,
                  `Implementează treptat: ${currentDPO}d → 45d → ${newDPO}d`,
                  `Monitorizează relațiile comerciale săptămânal`
                ]
              };
              break;
            }
            
            case "early_payment_discount": {
              const discountPercent = params.discount_percent || 5;
              const paymentDays = params.payment_days || 15;
              const clientiValue = ind.clienti || 0;
              const estimatedAdoptionRate = params.adoption_rate || 0.3; // 30% clienți acceptă
              
              // Cost discount vs beneficiu cash flow
              const discountCost = clientiValue * estimatedAdoptionRate * (discountPercent / 100);
              const currentDSO = ind.dso || 60;
              const cashSpeedUp = clientiValue * estimatedAdoptionRate * (currentDSO - paymentDays) / currentDSO;
              const netBenefit = cashSpeedUp - discountCost;
              
              simulation = {
                scenario: `Discount ${discountPercent}% pentru plată în ${paymentDays} zile`,
                assumptions: `${(estimatedAdoptionRate * 100).toFixed(0)}% din clienți acceptă oferta`,
                current_state: {
                  dso: currentDSO,
                  clienti: clientiValue,
                  cash: ind.banca || 0
                },
                projected_state_90_days: {
                  dso_effective: currentDSO * (1 - estimatedAdoptionRate) + paymentDays * estimatedAdoptionRate,
                  clienti: clientiValue,
                  cash: (ind.banca || 0) + netBenefit
                },
                financial_impact: {
                  discount_cost: `-${discountCost.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  cash_acceleration: `+${cashSpeedUp.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  net_benefit: `${netBenefit > 0 ? '+' : ''}${netBenefit.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  roi: `${((netBenefit / discountCost) * 100).toFixed(1)}%`
                },
                recommendation: netBenefit > 0 
                  ? `✅ Merită! Câștigi ${netBenefit.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON net în cash flow.`
                  : `⚠️ Costă mai mult decât beneficiază. Reducere discount la ${(discountPercent * 0.7).toFixed(1)}% sau zile la ${paymentDays + 5}.`
              };
              break;
            }
            
            case "reduce_dso": {
              const currentDSO = ind.dso || 60;
              const targetDSO = params.target_dso || 45;
              const clientiValue = ind.clienti || 0;
              
              // Cash eliberat prin reducere DSO
              const cashEliberat = clientiValue * (currentDSO - targetDSO) / currentDSO;
              const newCash = (ind.banca || 0) + cashEliberat;
              
              simulation = {
                scenario: `Reducere DSO de la ${currentDSO.toFixed(0)} zile la ${targetDSO} zile`,
                current_state: {
                  dso: currentDSO,
                  clienti: clientiValue,
                  cash: ind.banca || 0
                },
                projected_state_90_days: {
                  dso: targetDSO,
                  clienti: clientiValue,
                  cash: newCash,
                  cash_improvement: cashEliberat
                },
                impact: {
                  cash_unlocked: `+${cashEliberat.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  cash_increase_pct: `${((cashEliberat / (ind.banca || 1)) * 100).toFixed(1)}%`,
                  working_capital: "Îmbunătățire semnificativă"
                },
                action_steps: [
                  `Follow-up săptămânal pentru facturi > 30 zile`,
                  `Discount 2-3% pentru plată anticipată`,
                  `Termene noi clienți: maxim 30 zile`,
                  `Verificare bonitate clienți noi`
                ]
              };
              break;
            }
            
            case "extend_dpo": {
              const currentDPO = ind.dpo || 30;
              const targetDPO = params.target_dpo || 60;
              const furnizoriValue = ind.furnizori || 0;
              
              const cashEliberat = furnizoriValue * (targetDPO - currentDPO) / currentDPO;
              const newCash = (ind.banca || 0) + cashEliberat;
              
              simulation = {
                scenario: `Extindere DPO de la ${currentDPO.toFixed(0)} zile la ${targetDPO} zile`,
                current_state: {
                  dpo: currentDPO,
                  furnizori: furnizoriValue,
                  cash: ind.banca || 0
                },
                projected_state_90_days: {
                  dpo: targetDPO,
                  furnizori: furnizoriValue,
                  cash: newCash,
                  cash_improvement: cashEliberat
                },
                impact: {
                  cash_flow_boost: `+${cashEliberat.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`,
                  liquidity_improvement: `${((cashEliberat / (ind.banca || 1)) * 100).toFixed(1)}%`
                },
                implementation: [
                  `Negociere cu top 10 furnizori`,
                  `Argument: volum constant + plăți punctuale`,
                  `Start 45 zile, apoi 60 zile după 60 zile`
                ]
              };
              break;
            }
            
            default:
              result = { error: `Scenario type ${scenarioType} nu este suportat` };
              return;
          }
          
          result = {
            period: currentPeriod,
            scenario_type: scenarioType,
            simulation,
            message: `Simulare ${scenarioType} pentru ${currentPeriod} completă`
          };
          break;
        }
        
        case "query_historical_data": {
          const questionType = args.question_type;
          const indicator = args.indicator;
          const periodRange = args.period_range || 'ultimele 6 luni';
          
          // Ia toate analizele
          const { data: allAnalyses, error } = await supabase
            .from('analyses')
            .select('id, file_name, created_at, analysis_text, metadata')
            .order('created_at', { ascending: false })
            .limit(100);
          if (error) throw error;
          
          // Parsează perioada pentru fiecare analiză
          const months: Record<string, number> = {
            ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
            iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12
          };
          
          const parsePeriodFromRow = (row: any) => {
            const fileName = (row.file_name || '').toLowerCase();
            const dateRangeMatch = fileName.match(/\[?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
            if (dateRangeMatch) {
              const month = parseInt(dateRangeMatch[2], 10);
              const year = parseInt(dateRangeMatch[3], 10);
              if (month >= 1 && month <= 12 && year >= 2000) return { month, year };
            }
            for (const [name, num] of Object.entries(months)) {
              if (normalizeRomanianText(fileName).includes(name)) {
                const yMatch = fileName.match(/20\d{2}/);
                return { month: num, year: yMatch ? parseInt(yMatch[0]) : undefined };
              }
            }
            return { month: undefined, year: undefined };
          };
          
          // Extrage indicatori pentru fiecare analiză
          const analysesWithIndicators = (allAnalyses || []).map((row: any) => {
            const period = parsePeriodFromRow(row);
            const ind = extractIndicatorsFromText(row.analysis_text || '');
            const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0);
            const accounts = row.metadata?.parsed_balance?.accounts || [];
            const sumBy = (cls: string, field: 'total_sume_debit' | 'total_sume_credit') =>
              accounts.filter((a: any) => a.code?.startsWith(cls))
                      .reduce((s: number, a: any) => s + toNum(a[field]), 0);
            const ven7 = sumBy('7', 'total_sume_credit');
            const che6 = sumBy('6', 'total_sume_debit');
            
            if (ind.profit === undefined && (ven7 > 0 || che6 > 0)) ind.profit = ven7 - che6;
            if (ind.ca === undefined && ven7 > 0) ind.ca = ven7;
            if (ind.cheltuieli === undefined && che6 > 0) ind.cheltuieli = che6;
            
            return {
              ...row,
              period,
              indicators: ind
            };
          }).filter((a: any) => a.period.month && a.period.year);
          
          // Filtrează pe baza period_range
          let filtered = analysesWithIndicators;
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          
          if (periodRange.includes('ultimele')) {
            const numMonths = parseInt(periodRange.match(/\d+/)?.[0] || '6');
            filtered = analysesWithIndicators.filter((a: any) => {
              const diff = (currentYear - a.period.year) * 12 + (currentMonth - a.period.month);
              return diff >= 0 && diff < numMonths;
            });
          } else if (periodRange.match(/\d{4}/)) {
            const year = parseInt(periodRange.match(/\d{4}/)?.[0] || '0');
            filtered = analysesWithIndicators.filter((a: any) => a.period.year === year);
          }
          
          if (filtered.length === 0) {
            result = { error: `Nu am găsit analize pentru ${periodRange}` };
            break;
          }
          
          // Extrage valorile indicatorului
          const values = filtered.map((a: any) => ({
            period: `${months[a.period.month] || a.period.month}/${a.period.year}`,
            value: a.indicators[indicator],
            file: a.file_name
          })).filter((v: any) => v.value !== undefined);
          
          if (values.length === 0) {
            result = { error: `Nu am găsit valori pentru indicatorul ${indicator} în ${periodRange}` };
            break;
          }
          
          // Calculează pe baza question_type
          let answer: any = {};
          
          switch (questionType) {
            case "average": {
              const avg = values.reduce((sum: number, v: any) => sum + v.value, 0) / values.length;
              answer = {
                type: 'Medie',
                indicator,
                period_range: periodRange,
                value: avg,
                formatted: `${avg.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} ${indicator === 'dso' || indicator === 'dpo' ? 'zile' : 'RON'}`,
                sample_size: values.length,
                details: values
              };
              break;
            }
            
            case "min": {
              const min = values.reduce((minV: any, v: any) => v.value < minV.value ? v : minV, values[0]);
              answer = {
                type: 'Minimum',
                indicator,
                period_range: periodRange,
                value: min.value,
                formatted: `${min.value.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} ${indicator === 'dso' || indicator === 'dpo' ? 'zile' : 'RON'}`,
                period: min.period,
                file: min.file
              };
              break;
            }
            
            case "max": {
              const max = values.reduce((maxV: any, v: any) => v.value > maxV.value ? v : maxV, values[0]);
              answer = {
                type: 'Maximum',
                indicator,
                period_range: periodRange,
                value: max.value,
                formatted: `${max.value.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} ${indicator === 'dso' || indicator === 'dpo' ? 'zile' : 'RON'}`,
                period: max.period,
                file: max.file
              };
              break;
            }
            
            case "trend": {
              // Calculează trend simplu (linear regression simplificată)
              const sorted = [...values].sort((a: any, b: any) => {
                const [aM, aY] = a.period.split('/').map(Number);
                const [bM, bY] = b.period.split('/').map(Number);
                return (aY * 12 + aM) - (bY * 12 + bM);
              });
              
              const first = sorted[0].value;
              const last = sorted[sorted.length - 1].value;
              const change = last - first;
              const changePct = (change / first) * 100;
              
              answer = {
                type: 'Trend',
                indicator,
                period_range: periodRange,
                trend_direction: change > 0 ? 'crescător' : change < 0 ? 'descrescător' : 'stabil',
                first_value: first,
                last_value: last,
                absolute_change: change,
                percentage_change: changePct,
                formatted: `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% (${first.toLocaleString('ro-RO')} → ${last.toLocaleString('ro-RO')})`,
                periods: sorted.map((s: any) => s.period)
              };
              break;
            }
            
            case "sum": {
              const total = values.reduce((sum: number, v: any) => sum + v.value, 0);
              answer = {
                type: 'Sumă totală',
                indicator,
                period_range: periodRange,
                value: total,
                formatted: `${total.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON`,
                sample_size: values.length,
                details: values
              };
              break;
            }
            
            case "comparison": {
              if (values.length < 2) {
                answer = { error: "Necesită cel puțin 2 perioade pentru comparație" };
                break;
              }
              const sorted = [...values].sort((a: any, b: any) => {
                const [aM, aY] = a.period.split('/').map(Number);
                const [bM, bY] = b.period.split('/').map(Number);
                return (bY * 12 + bM) - (aY * 12 + aM);
              });
              const recent = sorted[0];
              const previous = sorted[1];
              const diff = recent.value - previous.value;
              const diffPct = (diff / previous.value) * 100;
              
              answer = {
                type: 'Comparație',
                indicator,
                period_range: periodRange,
                recent: { period: recent.period, value: recent.value },
                previous: { period: previous.period, value: previous.value },
                difference: diff,
                difference_pct: diffPct,
                formatted: `${recent.period}: ${recent.value.toLocaleString('ro-RO')} vs ${previous.period}: ${previous.value.toLocaleString('ro-RO')} (${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%)`
              };
              break;
            }
            
            default:
              answer = { error: `Question type ${questionType} nu este suportat` };
          }
          
          result = {
            question_type: questionType,
            indicator,
            period_range: periodRange,
            answer,
            message: `Răspuns la ${questionType} pentru ${indicator} în ${periodRange}`
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
                    ...(toolResults || [])
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
                          const byName = (n: string) => (toolResults || []).find((r: any) => r.name === n);
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
              const ga = (autoRes1 || []).find((r: any) => r.name === "get_analysis_by_period");
              if (ga) {
                try {
                  const payload = JSON.parse(ga.content || "{}");
                  analysisId = payload.analysis?.id || null;
                } catch {}
              }

              // 2) Dacă avem analiza, extragem conturile
              let allToolResults = [...(autoRes1 || [])];
              if (analysisId) {
                const autoCalls2 = [
                  { function: { name: "get_balance_accounts", arguments: JSON.stringify({ analysis_id: analysisId }) } }
                ];
                const autoRes2 = await executeTools(autoCalls2, authHeader);
                allToolResults = [...(autoRes1 || []), ...(autoRes2 || [])];
              }

              // 2.1) Întotdeauna încearcă să extragi indicatorii DIRECT din text pentru perioada cerută
              const indCalls = [
                { function: { name: 'get_analysis_indicators', arguments: JSON.stringify({ period: message }) } }
              ];
              const indRes = await executeTools(indCalls, authHeader);
              allToolResults = [...allToolResults, ...(indRes || [])];

              // Dacă avem profit din indicatori, răspunde imediat cu acesta (preferat față de calculul 6/7)
              const indTool = (indRes || []).find((r: any) => r.name === 'get_analysis_indicators');
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
                const res7 = (totalsRes || []).find((r: any) => r.name === 'get_class_totals_by_period' && JSON.parse(r.content||'{}').class === '7');
                const res6 = (totalsRes || []).find((r: any) => r.name === 'get_class_totals_by_period' && JSON.parse(r.content||'{}').class === '6');
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
