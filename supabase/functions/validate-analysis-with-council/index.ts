import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  metadata: Record<string, any>;
  analysisText: string;
  balanceText?: string;
  userId: string;
}

interface AIResponse {
  role: string;
  verdict: string;
  confidence: number;
  alerts: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metadata, analysisText, balanceText, userId }: ValidationRequest = await req.json();
    
    console.log(`🔍 [AI-COUNCIL] Starting validation for user ${userId}`);
    console.log(`📊 [AI-COUNCIL] Metadata keys:`, Object.keys(metadata));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Pregătește contextul pentru validare
    const contextSummary = `
METADATA FINANCIARĂ EXTRASĂ:
- Cifră de afaceri: ${metadata.ca || metadata.revenue || 'N/A'} RON
- Profit/Pierdere: ${metadata.profit || 'N/A'} RON
- EBITDA: ${metadata.ebitda || 'N/A'} RON
- Sold clienți (411): ${metadata.soldClienti || 'N/A'} RON
- Sold furnizori (401): ${metadata.soldFurnizori || 'N/A'} RON
- Sold bancă: ${metadata.soldBanca || 'N/A'} RON
- Sold casă: ${metadata.soldCasa || 'N/A'} RON
- Stocuri (371): ${metadata.soldStocuri || 'N/A'} RON
- Materii prime (301): ${metadata.soldMateriiPrime || 'N/A'} RON
- Materiale (302): ${metadata.soldMateriale || 'N/A'} RON
- DSO (zile încasare): ${metadata.dso || 'N/A'} zile
- DPO (zile plată): ${metadata.dpo || 'N/A'} zile
- DIO (rotație stocuri): ${metadata.dio || 'N/A'} zile
- Cash Conversion Cycle: ${metadata.cashConversionCycle || 'N/A'} zile
- Cheltuieli: ${metadata.cheltuieli || metadata.expenses || 'N/A'} RON

ANALIZA INIȚIALĂ AI:
${analysisText.slice(0, 2000)}
`;

    // Definește cei 3 AI cu roluri specializate
    const aiPrompts = [
      {
        role: "Contabil Expert Român",
        system: `Ești un contabil expert român cu 20 ani experiență. Analizezi interpretarea conturilor conform normelor contabile românești (OMFP 1802/2014).

SARCINĂ: Verifică dacă interpretarea indicatorilor financiari este CORECTĂ și COMPLETĂ.

Verifică OBLIGATORIU:
✓ Profit/Pierdere (121) - interpretare corectă vs CA
✓ Capital social (1012) - structură și modificări
✓ Clienți (411) - sold normal debitor, alerte dacă creditor
✓ Furnizori (401) - sold normal creditor, alerte dacă debitor
✓ TVA colectată (4427) vs TVA deductibilă (4426)
✓ Stocuri (301, 302, 371) - rotație și valoare
✓ Disponibilități (512, 531) - lichiditate
✓ Conturi problematice (419, 4551, 462, 7588)

Răspunde DOAR în format JSON:
{
  "verdict": "VALID/PARTIAL/INVALID",
  "confidence": 0-100,
  "alerts": ["alerta1", "alerta2"],
  "recommendations": ["recomandare1"]
}`
      },
      {
        role: "Auditor Financiar",
        system: `Ești un auditor financiar senior. Detectezi ANOMALII, INCONSISTENȚE și RISCURI în analiză.

SARCINĂ: Identifică orice semne de:
⚠️ Erori contabile (solduri inversate pe conturi)
⚠️ Inconsistențe matematice (profit ≠ CA - Cheltuieli)
⚠️ Alerte fiscale (TVA, impozite neachitate)
⚠️ Probleme de lichiditate (DSO > 90 zile, DPO < 30 zile)
⚠️ Stocuri supraevaluate (DIO > 180 zile)
⚠️ Clienți neîncasați mult timp (411 mare vs CA mică)
⚠️ Conturi suspicioase (419 cu sold mare, 462 cu sold creditor)

Răspunde DOAR în format JSON:
{
  "verdict": "SAFE/WARNING/CRITICAL",
  "confidence": 0-100,
  "alerts": ["risc1", "risc2"],
  "recommendations": ["acțiune corectivă"]
}`
      },
      {
        role: "CFO Strategic",
        system: `Ești un CFO cu experiență în evaluarea sănătății financiare a companiilor românești.

SARCINĂ: Evaluează SĂNĂTATEA FINANCIARĂ GENERALĂ și oferă RECOMANDĂRI STRATEGICE.

Analizează:
📈 Profitabilitate (marjă profitabilitate = profit/CA)
💰 Lichiditate (cash available vs obligații pe termen scurt)
⏱️ Cash Conversion Cycle (DSO + DIO - DPO)
📊 Eficiență operațională
🎯 Indicatori cheie (DSO, DPO, DIO)
💡 Oportunități de îmbunătățire

Răspunde DOAR în format JSON:
{
  "verdict": "EXCELLENT/GOOD/FAIR/POOR",
  "confidence": 0-100,
  "alerts": ["atenționare1"],
  "recommendations": ["strategie1", "strategie2"]
}`
      }
    ];

    // Apelează cei 3 AI-uri în paralel
    const aiResponses: AIResponse[] = [];
    
    for (const prompt of aiPrompts) {
      console.log(`🤖 [AI-COUNCIL] Calling ${prompt.role}...`);
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: prompt.system },
              { role: "user", content: contextSummary }
            ],
            temperature: 0.3, // Low temperature pentru consistență
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [AI-COUNCIL] ${prompt.role} failed:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || "";
        
        // Extrage JSON din răspuns
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiResponses.push({
            role: prompt.role,
            verdict: parsed.verdict || "UNKNOWN",
            confidence: parsed.confidence || 50,
            alerts: parsed.alerts || [],
            recommendations: parsed.recommendations || []
          });
          console.log(`✅ [AI-COUNCIL] ${prompt.role} verdict: ${parsed.verdict} (${parsed.confidence}% confidence)`);
        }
      } catch (error) {
        console.error(`❌ [AI-COUNCIL] Error with ${prompt.role}:`, error);
      }
    }

    // Analizează consensul
    const totalResponses = aiResponses.length;
    if (totalResponses === 0) {
      throw new Error("No AI responses received");
    }

    // Colectează toate alertele unice
    const allAlerts = new Set<string>();
    const allRecommendations = new Set<string>();
    
    aiResponses.forEach(response => {
      response.alerts.forEach(alert => allAlerts.add(alert));
      response.recommendations.forEach(rec => allRecommendations.add(rec));
    });

    // Calculează scor de validare (media confidence)
    const avgConfidence = aiResponses.reduce((sum, r) => sum + r.confidence, 0) / totalResponses;

    // Determină verdict final
    const criticalAlerts = aiResponses.filter(r => 
      r.verdict === "INVALID" || r.verdict === "CRITICAL" || r.verdict === "POOR"
    ).length;

    const validationResult = {
      validated: criticalAlerts === 0 && avgConfidence >= 70,
      confidence: Math.round(avgConfidence),
      aiResponses,
      alerts: Array.from(allAlerts),
      recommendations: Array.from(allRecommendations),
      consensus: {
        total: totalResponses,
        critical: criticalAlerts,
        verdict: criticalAlerts >= 2 ? "REQUIRES_REVIEW" : (avgConfidence >= 80 ? "VALIDATED" : "ACCEPTABLE")
      }
    };

    console.log(`✅ [AI-COUNCIL] Validation complete - Verdict: ${validationResult.consensus.verdict}`);

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ [AI-COUNCIL] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      validated: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
