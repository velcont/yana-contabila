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

interface FinancialIndicators {
  hasStock: boolean;
  hasCapital: boolean;
  hasDebts: boolean;
  hasRevenue: boolean;
  hasCashBank: boolean;
  hasClients: boolean;
  hasSuppliers: boolean;
  hasTaxes: boolean;
  hasExpenses: boolean;
  isProfit: boolean;
}

interface AIResponse {
  role: string;
  provider: string; // 'lovable', 'perplexity', 'openai'
  verdict: string;
  confidence: number;
  findings: Partial<FinancialIndicators>;
  alerts: string[];
  recommendations: string[];
  executionTime?: number;
}

interface IndicatorVote {
  value: boolean;
  votes: { yes: number; no: number; abstain: number };
  consensusReached: boolean;
  providers: { lovable?: boolean; perplexity?: boolean; openai?: boolean };
}

interface ConsensusResult {
  validated: boolean;
  confidence: number;
  aiResponses: AIResponse[];
  agreements: Record<string, IndicatorVote>;
  discrepancies: Array<{ field: string; reason: string; votes: string }>;
  alerts: string[];
  recommendations: string[];
  consensus: {
    total: number;
    indicatorsWithConsensus: number;
    verdict: string;
  };
}

// Helper: Extract JSON from mixed text response
function extractJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// Helper: Parse Perplexity response (may not be perfect JSON)
function parsePerplexityResponse(text: string): Partial<FinancialIndicators> {
  const findings: Partial<FinancialIndicators> = {};
  
  // Extract boolean indicators from text
  findings.hasStock = /\b(stoc|stocuri|marfă|371|301|302)\b/i.test(text) && !/\bnot?\b/i.test(text);
  findings.hasCapital = /\b(capital|1012)\b/i.test(text);
  findings.hasDebts = /\b(datorii|furnizori|401|404|419)\b/i.test(text);
  findings.hasRevenue = /\b(venit|CA|cifra de afaceri|7011|704)\b/i.test(text);
  findings.hasCashBank = /\b(casă|bancă|531|512|disponibilit)\b/i.test(text);
  
  return findings;
}

// Calculate consensus from multiple AI responses
function calculateConsensus(aiResponses: AIResponse[]): {
  agreements: Record<string, IndicatorVote>;
  discrepancies: Array<{ field: string; reason: string; votes: string }>;
  overallConfidence: number;
} {
  const indicators: (keyof FinancialIndicators)[] = [
    'hasStock', 'hasCapital', 'hasDebts', 'hasRevenue', 'hasCashBank',
    'hasClients', 'hasSuppliers', 'hasTaxes', 'hasExpenses', 'isProfit'
  ];
  
  const agreements: Record<string, IndicatorVote> = {};
  const discrepancies: Array<{ field: string; reason: string; votes: string }> = [];
  
  for (const indicator of indicators) {
    const votes = { yes: 0, no: 0, abstain: 0 };
    const providers: { lovable?: boolean; perplexity?: boolean; openai?: boolean } = {};
    
    for (const response of aiResponses) {
      const value = response.findings[indicator];
      
      if (value === true) {
        votes.yes++;
        providers[response.provider as keyof typeof providers] = true;
      } else if (value === false) {
        votes.no++;
        providers[response.provider as keyof typeof providers] = false;
      } else {
        votes.abstain++;
      }
    }
    
    // Determine consensus (majority wins)
    const total = votes.yes + votes.no;
    const consensusValue = votes.yes > votes.no;
    const consensusReached = total >= 2 && (votes.yes >= 2 || votes.no >= 2);
    
    agreements[indicator] = {
      value: consensusValue,
      votes,
      consensusReached,
      providers
    };
    
    // Detect discrepancies (no clear majority)
    if (!consensusReached && total > 0) {
      discrepancies.push({
        field: indicator,
        reason: `Split vote: ${votes.yes} YES, ${votes.no} NO`,
        votes: `Lovable: ${providers.lovable ?? '?'}, Perplexity: ${providers.perplexity ?? '?'}, OpenAI: ${providers.openai ?? '?'}`
      });
    }
  }
  
  // Calculate overall confidence
  const totalIndicators = indicators.length;
  const indicatorsWithConsensus = Object.values(agreements).filter(a => a.consensusReached).length;
  const overallConfidence = Math.round((indicatorsWithConsensus / totalIndicators) * 100);
  
  return { agreements, discrepancies, overallConfidence };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metadata, analysisText, balanceText, userId }: ValidationRequest = await req.json();
    
    console.log(`🔍 [AI-COUNCIL] Starting validation for user ${userId}`);
    console.log(`📊 [AI-COUNCIL] Metadata keys:`, Object.keys(metadata));

    // Validate ALL API keys
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const missingKeys = [];
    if (!LOVABLE_API_KEY) missingKeys.push("LOVABLE_API_KEY");
    if (!PERPLEXITY_API_KEY) missingKeys.push("PERPLEXITY_API_KEY");
    if (!OPENAI_API_KEY) missingKeys.push("OPENAI_API_KEY");
    
    if (missingKeys.length > 0) {
      throw new Error(`Missing API keys: ${missingKeys.join(", ")}`);
    }

    // Pregătește contextul pentru validare cu DATA CORECTĂ
    const currentDate = new Date().toLocaleDateString('ro-RO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const contextSummary = `
**DATA CURENTĂ: ${currentDate}**

IMPORTANT: Orice perioadă anterioară acestei date este în TRECUT, nu în viitor!
Exemplu: Dacă data curentă este noiembrie 2025, atunci septembrie 2025 este în TRECUT (acum 2 luni).

METADATA FINANCIARĂ EXTRASĂ:
- Cifră de afaceri: ${metadata.ca || metadata.revenue || 'N/A'} RON
- Profit/Pierdere: ${metadata.profit || 'N/A'} RON
- EBITDA: ${metadata.ebitda || 'N/A'} RON
- Sold clienți (411): ${metadata.soldClienti || 'N/A'} RON
- Sold furnizori (401): ${metadata.soldFurnizori || 'N/A'} RON
- Sold bancă: ${metadata.soldBanca || 'N/A'} RON
- Sold casă: ${metadata.soldCasa || 'N/A'} RON
- Stocuri (371): ${metadata.soldStocuri || 'N/A'} RON
- DSO (zile încasare): ${metadata.dso || 'N/A'} zile
- DPO (zile plată): ${metadata.dpo || 'N/A'} zile
- DIO (rotație stocuri): ${metadata.dio || 'N/A'} zile
- Cheltuieli: ${metadata.cheltuieli || metadata.expenses || 'N/A'} RON

ANALIZA INIȚIALĂ AI:
${analysisText.slice(0, 1500)}
`;

    // Define specialized prompts for 3 different AI providers
    const lovablePrompt = {
      role: "Contabil Expert Român",
      provider: "lovable",
      system: `Ești un contabil expert român cu 20 ani experiență. Analizezi interpretarea conturilor conform OMFP 1802/2014.

SARCINĂ: Verifică interpretarea indicatorilor financiari și returnează findings structurate.

Răspunde DOAR în format JSON:
{
  "verdict": "VALID/PARTIAL/INVALID",
  "confidence": 0-100,
  "findings": {
    "hasStock": true/false,
    "hasCapital": true/false,
    "hasDebts": true/false,
    "hasRevenue": true/false,
    "hasCashBank": true/false,
    "hasClients": true/false,
    "hasSuppliers": true/false,
    "hasTaxes": true/false,
    "hasExpenses": true/false,
    "isProfit": true/false
  },
  "alerts": ["alerta1", "alerta2"],
  "recommendations": ["recomandare1"]
}`
    };

    const perplexityPrompt = {
      role: "Auditor Financiar",
      provider: "perplexity",
      system: `You are a financial auditor. Analyze the Romanian financial data and detect anomalies.

TASK: Identify risks, inconsistencies, and red flags in the financial analysis.

Respond ONLY in JSON format:
{
  "verdict": "SAFE/WARNING/CRITICAL",
  "confidence": 0-100,
  "findings": {
    "hasStock": true/false,
    "hasCapital": true/false,
    "hasDebts": true/false,
    "hasRevenue": true/false,
    "hasCashBank": true/false,
    "hasClients": true/false,
    "hasSuppliers": true/false,
    "hasTaxes": true/false,
    "hasExpenses": true/false,
    "isProfit": true/false
  },
  "alerts": ["risk1", "risk2"],
  "recommendations": ["corrective action"]
}`
    };

    const openaiPrompt = {
      role: "CFO Strategic",
      provider: "openai",
      system: `You are a CFO evaluating the financial health of a Romanian company.

TASK: Assess overall financial health and provide strategic recommendations.

Respond ONLY in JSON format:
{
  "verdict": "EXCELLENT/GOOD/FAIR/POOR",
  "confidence": 0-100,
  "findings": {
    "hasStock": true/false,
    "hasCapital": true/false,
    "hasDebts": true/false,
    "hasRevenue": true/false,
    "hasCashBank": true/false,
    "hasClients": true/false,
    "hasSuppliers": true/false,
    "hasTaxes": true/false,
    "hasExpenses": true/false,
    "isProfit": true/false
  },
  "alerts": ["warning1"],
  "recommendations": ["strategy1", "strategy2"]
}`
    };

    // Create PARALLEL API calls with timeout
    const timeout = 10000; // 10 seconds
    
    const aiCalls = [
      // Lovable AI call
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const startTime = Date.now();
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: lovablePrompt.system },
                { role: "user", content: contextSummary }
              ],
              temperature: 0.3,
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const executionTime = Date.now() - startTime;
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [LOVABLE] Failed:`, response.status, errorText);
            return null;
          }
          
          const data = await response.json();
          const aiText = data.choices?.[0]?.message?.content || "";
          const parsed = extractJSON(aiText);
          
          if (parsed) {
            console.log(`✅ [LOVABLE] Verdict: ${parsed.verdict} (${executionTime}ms)`);
            return {
              role: lovablePrompt.role,
              provider: "lovable",
              verdict: parsed.verdict || "UNKNOWN",
              confidence: parsed.confidence || 50,
              findings: parsed.findings || {},
              alerts: parsed.alerts || [],
              recommendations: parsed.recommendations || [],
              executionTime
            } as AIResponse;
          }
          return null;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`❌ [LOVABLE] Error:`, error);
          return null;
        }
      })(),
      
      // Perplexity AI call
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const startTime = Date.now();
          const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-sonar-small-128k-online",
              messages: [
                { role: "system", content: perplexityPrompt.system },
                { role: "user", content: contextSummary }
              ],
              temperature: 0.2,
              max_tokens: 1000,
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const executionTime = Date.now() - startTime;
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [PERPLEXITY] Failed:`, response.status, errorText);
            return null;
          }
          
          const data = await response.json();
          const aiText = data.choices?.[0]?.message?.content || "";
          let parsed = extractJSON(aiText);
          
          // Fallback: parse from text if JSON extraction fails
          if (!parsed) {
            console.log(`⚠️ [PERPLEXITY] No JSON, parsing text...`);
            const findings = parsePerplexityResponse(aiText);
            parsed = {
              verdict: "WARNING",
              confidence: 60,
              findings,
              alerts: [],
              recommendations: []
            };
          }
          
          console.log(`✅ [PERPLEXITY] Verdict: ${parsed.verdict} (${executionTime}ms)`);
          return {
            role: perplexityPrompt.role,
            provider: "perplexity",
            verdict: parsed.verdict || "WARNING",
            confidence: parsed.confidence || 60,
            findings: parsed.findings || {},
            alerts: parsed.alerts || [],
            recommendations: parsed.recommendations || [],
            executionTime
          } as AIResponse;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`❌ [PERPLEXITY] Error:`, error);
          return null;
        }
      })(),
      
      // OpenAI call
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const startTime = Date.now();
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: openaiPrompt.system },
                { role: "user", content: contextSummary }
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const executionTime = Date.now() - startTime;
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [OPENAI] Failed:`, response.status, errorText);
            return null;
          }
          
          const data = await response.json();
          const aiText = data.choices?.[0]?.message?.content || "";
          const parsed = extractJSON(aiText);
          
          if (parsed) {
            console.log(`✅ [OPENAI] Verdict: ${parsed.verdict} (${executionTime}ms)`);
            return {
              role: openaiPrompt.role,
              provider: "openai",
              verdict: parsed.verdict || "FAIR",
              confidence: parsed.confidence || 50,
              findings: parsed.findings || {},
              alerts: parsed.alerts || [],
              recommendations: parsed.recommendations || [],
              executionTime
            } as AIResponse;
          }
          return null;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`❌ [OPENAI] Error:`, error);
          return null;
        }
      })()
    ];

    // Wait for ALL API calls to complete (parallel execution)
    const results = await Promise.allSettled(aiCalls);
    
    // Extract successful responses
    const aiResponses: AIResponse[] = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<AIResponse | null>).value!)
      .filter(v => v !== null);
    
    console.log(`📊 [AI-COUNCIL] Received ${aiResponses.length}/3 responses`);
    
    // Require minimum 2 AI responses
    if (aiResponses.length < 2) {
      throw new Error(`Consiliul AI nu a putut fi reunit (doar ${aiResponses.length}/3 AI-uri au răspuns). Necesare minimum 2 AI-uri.`);
    }

    // Calculate consensus
    const { agreements, discrepancies, overallConfidence } = calculateConsensus(aiResponses);
    
    // Collect all unique alerts and recommendations
    const allAlerts = new Set<string>();
    const allRecommendations = new Set<string>();
    
    aiResponses.forEach(response => {
      response.alerts.forEach(alert => allAlerts.add(alert));
      response.recommendations.forEach(rec => allRecommendations.add(rec));
    });

    // Calculate average confidence from individual AIs
    const avgConfidence = aiResponses.reduce((sum, r) => sum + r.confidence, 0) / aiResponses.length;
    
    // Determine final validation status
    const indicatorsWithConsensus = Object.values(agreements).filter(a => a.consensusReached).length;
    const validated = overallConfidence >= 70 && discrepancies.length === 0;

    const validationResult: ConsensusResult = {
      validated,
      confidence: Math.round((avgConfidence + overallConfidence) / 2),
      aiResponses,
      agreements,
      discrepancies,
      alerts: Array.from(allAlerts),
      recommendations: Array.from(allRecommendations),
      consensus: {
        total: aiResponses.length,
        indicatorsWithConsensus,
        verdict: validated ? "VALIDATED" : (discrepancies.length > 2 ? "REQUIRES_REVIEW" : "ACCEPTABLE")
      }
    };

    console.log(`✅ [AI-COUNCIL] Validation complete`);
    console.log(`   - Verdict: ${validationResult.consensus.verdict}`);
    console.log(`   - Confidence: ${validationResult.confidence}%`);
    console.log(`   - Consensus on ${indicatorsWithConsensus}/10 indicators`);
    console.log(`   - Discrepancies: ${discrepancies.length}`);

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
