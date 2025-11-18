import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TEXTUL EDUCAȚIONAL COMPLET
const EDUCATIONAL_TEXT = `
Conturile din clasa 1, 2, 3, 4, 5 se analizează doar pe coloana Solduri finale Debitoare sau Creditoare. 
Conturile din clasa 6 și 7 se analizează doar pe coloana Total sume Debitoare și Creditoare.

Reguli specifice:
• Conturile TVA de plată (4423) trebuie să apară în solduri finale creditoare.
• Conturile TVA de recuperat (4424) apar în solduri finale debitoare.
• Contul Clienți (4111) are sold în solduri finale debitoare.
• Contul Furnizori (401) are sold în solduri finale creditoare.
• Contul 4551 (cont curent asociați):
  - Sold CREDITOR = asociații au BĂGAT bani în firmă (firma datorează asociaților)
  - Sold DEBITOR = asociații au RETRAS bani din firmă (asociații datorează firmei)
• Conturile 5121 (conturi curente bancare) și 5311 (casa în lei) au solduri finale debitoare.
• Contul 121 (Profit sau pierdere):
  - Sold CREDITOR = PROFIT (venituri > cheltuieli)
  - Sold DEBITOR = PIERDERE (cheltuieli > venituri)

Profil business:
• Cont 704 (venituri din servicii) → Prestări servicii
• Cont 707 (venituri din mărfuri) → Comerț
• Cont 701 (venituri din producție) → Producție

IMPORTANT: NU inventa date! NU asocia automat conturi fără dovezi explicite!
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { structuredData, companyInfo, analysisText } = await req.json();
    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    
    if (!GROK_API_KEY) {
      throw new Error('GROK_API_KEY not configured');
    }

    console.log('[Grok] Validation request for company:', companyInfo?.name || 'N/A');

    // Construiește prompt pentru Grok
    const prompt = `
=== VALIDARE SOLDURI BANCĂ vs CASĂ – REGULA FINALĂ (PRIORITATE MAXIMĂ) ===

1. Conturi bănci (5121, 5124, 5125, 5126, 5128, 5129):
   - Sold NEGATIV (debitor minus sau creditor pozitiv) → ESTE NORMAL în România!
   Spare: overdraft / credit revolving pe cont curent.
   → Validează ca OK + doar WARNING: "Sold bancă minus = credit overdraft X RON – monitorizează dobânzi și limite."
   → ready_for_report: true

2. Cont casă (5311, 5314):
   - Sold NEGATIV → ANOMALIE GRAVĂ! Nu ai voie să ai numerar negativ.
   → Blochează raportul + CRITICAL ERROR: "Sold casă 5311 negativ – eroare contabilă! Corectează înainte de raport!"

3. Toate celelalte conturi de trezorerie (581, 519 etc.):
   - Aplică regula clasică (negativ = anomalie).

=== HOTFIX FINAL – PRIORITATE MAXIMĂ ===

1. În contabilitatea românească, diferența dintre total debitoare clasa 6 și total creditoare clasa 7 ESTE ÎNTOTDEAUNA exact profitul sau pierderea lunii (cont 121). NU este eroare și NU trebuie marcată niciodată ca „balanță nebalansată"!

2. Dacă rulajele contului 704 reprezintă peste 90% din total rulaje clasa 7 → este PRESTĂRI SERVICII. NU afișa niciodată recomandări pentru comerț, stocuri, import direct, negocieri cu furnizori marfă etc.

=== INSTRUCȚIUNI DE BAZĂ ===

Ești un EXPERT CONTABIL ROMÂN specialist în validare balanțe de verificare.

MISIUNEA TA:
Validează corectitudinea interpretării balanței contabile și detectează anomalii CRITICE înainte de generarea raportului financiar.

// ==== REGULA DE AUR – BALANȚĂ ROMÂNEASCĂ (PRIORITATE MAXIMĂ) ====
În balanța de verificare românească (conform OMFP 1802/2014 și practica SAGA/SmartBill):
Total debitoare clasa 6 ≠ Total creditoare clasa 7 este NORMAL și CORECT!
Diferența dintre cele două este exact PROFITUL sau PIERDEREA lunii (cont 121).

Exemple corecte:
• Dacă clasa 6 > clasa 7 → PIERDERE (cont 121 sold debitor)
• Dacă clasa 7 > clasa 6 → PROFIT (cont 121 sold creditor)

NU este eroare de balanță!
NU trebuie marcată niciodată ca anomalie!
NU trebuie blocată generarea raportului din acest motiv!

Doar dacă diferența dintre clasa 6 și clasa 7 NU se regăsește exact (la leu) în soldul final al contului 121 → atunci este eroare reală.

REGULI FUNDAMENTALE:
${EDUCATIONAL_TEXT}

BALANȚA DE ANALIZAT:
Companie: ${companyInfo?.name || 'N/A'}
CUI: ${companyInfo?.cui || 'N/A'}
Perioadă: ${companyInfo?.period || 'N/A'}

Date structurate:
${JSON.stringify(structuredData, null, 2)}

Text analiză:
${analysisText?.substring(0, 3000) || 'N/A'}

VERIFICĂ OBLIGATORIU (în această ordine):

1. **ANOMALII CRITICE** (blochează raportul):
   - Conturi 1-5 cu sold DUBLU (debit ȘI credit simultan)
   - TVA 4423 în sold DEBITOR (trebuie CREDITOR)
   - TVA 4424 în sold CREDITOR (trebuie DEBITOR)
   - Diferența (Clasa 7 - Clasa 6) ≠ Sold cont 121 (discrepanță matematică reală)
   - Cont 121 cu sold dublu (debit ȘI credit)
   - Casa (5311) cu sold CREDITOR (imposibil!)

2. **INTERPRETĂRI CORECTE**:
   - Cont 4551: sold creditor = BĂGAT / sold debitor = RETRAS
   - Cont 121: sold creditor = PROFIT / sold debitor = PIERDERE
   - Profil business: 704=servicii, 707=mărfuri, 701=producție

3. **VERIFICĂRI MATEMATICE**:
   - Profit calculat (Clasa 7 - Clasa 6) = Cont 121
   - Cash total (5121 + 5311) = suma soldurilor debitoare
   - Cifra afaceri anuală = suma conturilor 70x (Total sume creditoare)

4. **AVERTISMENTE** (permit raportul, dar afișează banner):
   - Creanțe mari (DSO > 90 zile)
   - Stocuri mari (DIO > 120 zile)
   - Lipsă cont 4551 când există 462 creditor
   - Marje neobișnuite (< 5% sau > 95%)

RETURNEAZĂ EXCLUSIV JSON în acest format (fără text suplimentar):
{
  "validation_status": "VALID" | "WARNING" | "CRITICAL",
  "anomalies": [
    {
      "type": "CONT_INVALID" | "INTERPRETARE_ERONATA" | "DISCREPANTA_MATEMATICA",
      "severity": "CRITICAL" | "WARNING",
      "account": "4423",
      "message": "TVA de plată (4423) are sold DEBITOR 15.000 RON - trebuie CREDITOR!",
      "recommendation": "Verifică înregistrările TVA pentru luna curentă. Posibilă inversare debit/credit."
    }
  ],
  "interpretations_validated": {
    "cont_4551": "✅ Corect - sold creditor 826.123 RON = bani BĂGAȚI de asociați",
    "profil_business": "✅ Corect - Prestări servicii (cont 704 prezent, 707/701 absent)",
    "profit_loss": "✅ Corect - sold debitor 87.162,78 RON = PIERDERE"
  },
  "mathematical_checks": {
    "profit_calculated_vs_cont121": "✅ Match: (2.074.071,90 - 2.161.234,68) = -87.162,78 RON",
    "cash_total": "✅ Confirmat: 5121 (260.238,96) + 5311 (150,00) = 260.388,96 RON",
    "clasa6_vs_clasa7": "⚠️ Diferență -87.162,78 RON (NORMAL pentru pierdere)"
  },
  "ready_for_report": true,
  "blocked_reasons": [],
  "grok_confidence_score": 0.98,
  "timestamp": "${new Date().toISOString()}"
}

REGULI STRICTE:
- Dacă găsești ORICE anomalie CRITICAL → setează validation_status: "CRITICAL" și ready_for_report: false
- Dacă doar WARNING → setează validation_status: "WARNING" și ready_for_report: true
- NU inventa date care nu sunt în balanță!
- Fii extrem de strict cu anomaliile contabile - ele pot ruina afaceri!
`;

    console.log('[Grok] Sending validation request to x.ai API...');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { 
            role: 'system', 
            content: 'Ești un expert contabil român specializat în validare balanțe. Returnezi DOAR JSON valid, fără text suplimentar.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Minimizează creativitatea, maximizează acuratețea
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Grok] API error:', response.status, errorText);
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const grokResponse = await response.json();
    console.log('[Grok] Raw response received');

    let validationResult;
    try {
      const content = grokResponse.choices[0].message.content;
      // Extrage JSON din răspuns (elimină eventuale backticks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Grok response');
      }
      validationResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[Grok] JSON parse error:', parseError);
      throw new Error('Failed to parse Grok JSON response');
    }

    // Validare răspuns Grok
    if (!validationResult.validation_status) {
      throw new Error('Invalid Grok response structure');
    }

    console.log('[Grok] Validation completed:', validationResult.validation_status);

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Grok] Validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        validation_status: 'ERROR',
        ready_for_report: false,
        anomalies: [{
          type: 'SYSTEM_ERROR',
          severity: 'CRITICAL',
          message: `Eroare validare Grok: ${error.message}`,
          recommendation: 'Contactează suportul tehnic'
        }]
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
