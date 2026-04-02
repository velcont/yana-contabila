import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelfReflectRequest {
  conversationId: string;
  userId: string;
  question: string;
  answer: string;
  route?: string;
  previousYanaResponse?: string; // Pentru detecție erori
}

interface ReflectionResult {
  self_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  what_went_well: string[];
  what_could_improve: string[];
  missing_context: string | null;
  suggested_sources: string[];
}

interface ErrorAnalysis {
  isRealError: boolean;
  errorType: 'factual' | 'prediction' | 'advice' | 'tone' | 'assumption' | 'misunderstanding';
  originalStatement: string;
  correction: string;
  whyWrong: string;
  lessonLearned: string;
  confidenceImpact: number;
  recoveryAction: string;
  confidence: number;
}

// Pattern-uri pentru detecție rapidă erori
const CORRECTION_PATTERNS = [
  { pattern: /nu e(ste)? (așa|corect|adevărat)/i, type: 'factual' as const },
  { pattern: /greșit|greșeală/i, type: 'factual' as const },
  { pattern: /te(-ai)? înșeli/i, type: 'assumption' as const },
  { pattern: /nu ai înțeles/i, type: 'misunderstanding' as const },
  { pattern: /dar ai zis (că|ca)/i, type: 'prediction' as const },
  { pattern: /contrazici/i, type: 'factual' as const },
  { pattern: /nu asta am (vrut|întrebat)/i, type: 'misunderstanding' as const },
  { pattern: /ai spus că.*dar/i, type: 'factual' as const },
  { pattern: /cifra.*greșită/i, type: 'factual' as const },
  { pattern: /nu e corect ce ai/i, type: 'factual' as const },
];

// Analizează dacă mesajul utilizatorului conține o corecție
async function analyzeForErrors(
  previousResponse: string,
  userMessage: string,
  lovableApiKey: string
): Promise<ErrorAnalysis | null> {
  
  // 1. Pattern check rapid
  const patternMatch = CORRECTION_PATTERNS.find(p => p.pattern.test(userMessage));
  
  if (!patternMatch) {
    return null; // Nu e corecție
  }
  
  console.log(`[self-reflect] Potential correction detected, pattern: ${patternMatch.type}`);
  
  // 2. Verificare contextuală cu AI (evită false positives)
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Analizează dacă utilizatorul corectează o eroare a AI-ului.

Răspunsul anterior al AI (YANA): "${previousResponse.substring(0, 800)}"

Mesajul utilizatorului: "${userMessage}"

Răspunde DOAR cu JSON valid:
{
  "isRealError": true/false,
  "confidence": 0.0-1.0,
  "errorType": "factual|prediction|advice|tone|assumption|misunderstanding",
  "originalStatement": "ce a spus AI greșit (maxim 100 caractere)",
  "correction": "ce e corect de fapt",
  "whyWrong": "de ce era greșit (1 propoziție)",
  "lessonLearned": "ce ar trebui să învețe AI (1 propoziție)",
  "recoveryAction": "cum poate recâștiga încrederea"
}

IMPORTANT: 
- Dacă utilizatorul doar pune o întrebare nouă sau discută, isRealError = false
- Dacă utilizatorul doar clarifică, nu corectează, isRealError = false
- Doar dacă AI a făcut o greșeală clară, isRealError = true`
        }],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error("[self-reflect] Error analysis AI call failed");
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const analysis: ErrorAnalysis = JSON.parse(jsonMatch[0]);
    
    // Validare: doar erori reale cu confidence > 0.7
    if (analysis.isRealError && analysis.confidence > 0.7) {
      analysis.confidenceImpact = -0.03; // Scade 3% confidence
      console.log(`[self-reflect] Real error confirmed: ${analysis.errorType}, confidence: ${analysis.confidence}`);
      return analysis;
    }
    
    console.log(`[self-reflect] Not a real error (confidence: ${analysis.confidence})`);
    return null;
    
  } catch (error) {
    console.error("[self-reflect] Error in error analysis:", error);
    return null;
  }
}

// Salvează eroarea în baza de date
async function saveAcknowledgedError(
  supabase: any,
  userId: string,
  conversationId: string,
  error: ErrorAnalysis,
  previousResponse: string
) {
  try {
    // 1. Salvăm eroarea
    const { data: savedError, error: saveError } = await supabase
      .from('yana_acknowledged_errors')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        error_type: error.errorType,
        original_statement: error.originalStatement,
        correction: error.correction,
        user_feedback: previousResponse.substring(0, 500),
        why_wrong: error.whyWrong,
        confidence_before: 0.75,
        confidence_after: 0.75 + error.confidenceImpact,
        lesson_learned: error.lessonLearned,
        capability_affected: error.errorType,
        recovery_action: error.recoveryAction,
        acknowledged_publicly: true,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error("[self-reflect] Failed to save acknowledged error:", saveError);
      return null;
    }

    console.log(`[self-reflect] ✅ Error acknowledged and saved (id: ${savedError?.id})`);

    // 2. Actualizăm relationship pentru a nota eroarea
    await supabase
      .from('yana_relationships')
      .update({
        last_error_acknowledged_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 3. Adăugăm în pending recovery
    const { data: selfModel } = await supabase
      .from('yana_self_model')
      .select('confidence_recovery_pending')
      .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      .single();

    const pending = selfModel?.confidence_recovery_pending || [];
    if (!pending.includes(error.errorType)) {
      pending.push(error.errorType);
      await supabase
        .from('yana_self_model')
        .update({ confidence_recovery_pending: pending })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    }

    return savedError?.id;
  } catch (err) {
    console.error("[self-reflect] Error saving acknowledged error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.warn("[self-reflect] LOVABLE_API_KEY not configured, skipping reflection");
      return new Response(
        JSON.stringify({ success: false, reason: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: SelfReflectRequest = await req.json();
    const { conversationId, userId, question, answer, route } = requestData;

    // Validate input
    if (!conversationId || !userId || !question || !answer) {
      console.error("[self-reflect] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, reason: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip very short answers (likely errors or acknowledgements)
    if (answer.length < 50) {
      console.log("[self-reflect] Answer too short, skipping reflection");
      return new Response(
        JSON.stringify({ success: false, reason: "Answer too short for reflection" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[self-reflect] Starting reflection for conversation ${conversationId}`);

    // === ERROR DETECTION ===
    let errorAnalysisResult: { errorId: string | null; errorType: string | null } = {
      errorId: null,
      errorType: null,
    };
    
    // Dacă avem previousYanaResponse, verificăm dacă utilizatorul corectează
    if (requestData.previousYanaResponse && requestData.previousYanaResponse.length > 50) {
      const errorAnalysis = await analyzeForErrors(
        requestData.previousYanaResponse,
        question,
        lovableApiKey
      );
      
      if (errorAnalysis) {
        const errorId = await saveAcknowledgedError(
          supabase,
          userId,
          conversationId,
          errorAnalysis,
          requestData.previousYanaResponse
        );
        
        errorAnalysisResult = {
          errorId,
          errorType: errorAnalysis.errorType,
        };
        
        console.log(`[self-reflect] Error detection completed: ${errorAnalysis.errorType}`);
      }
    }
    // === END ERROR DETECTION ===

    // Build the self-reflection prompt
    const reflectionPrompt = `Ești un evaluator AI critic. Analizează următoarea conversație și oferă o auto-evaluare obiectivă.

ÎNTREBAREA UTILIZATORULUI:
"${question.substring(0, 1000)}"

RĂSPUNSUL YANA:
"${answer.substring(0, 3000)}"

${route ? `CONTEXT: Acest răspuns a fost generat de modulul "${route}".` : ''}

Evaluează răspunsul pe baza următoarelor criterii și returnează un JSON valid:

{
  "self_score": <număr întreg 1-10>,
  "confidence_level": <"low" | "medium" | "high">,
  "what_went_well": [<array de maxim 3 puncte pozitive>],
  "what_could_improve": [<array de maxim 3 puncte de îmbunătățit>],
  "missing_context": <string sau null - ce informații lipsesc pentru un răspuns mai bun>,
  "suggested_sources": [<array de surse care ar fi ajutat: "legislație fiscală", "date ANAF", "istoric firmă", etc.>]
}

CRITERII DE EVALUARE:
- 9-10: Răspuns complet, precis, cu surse și context relevant
- 7-8: Răspuns bun dar lipsesc detalii sau surse
- 5-6: Răspuns acceptabil dar incomplet sau vag
- 3-4: Răspuns parțial corect dar cu lipsuri semnificative
- 1-2: Răspuns incorect, irelevant sau confuz

Returnează DOAR JSON-ul, fără alte explicații.`;

    // Call Lovable AI for reflection
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: reflectionPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[self-reflect] AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reflectionText = aiData.choices?.[0]?.message?.content || "";
    const tokensUsed = aiData.usage?.total_tokens || 0;

    console.log("[self-reflect] AI response received, parsing...");

    // Parse the reflection JSON
    let reflection: ReflectionResult;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = reflectionText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      reflection = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[self-reflect] Failed to parse reflection:", parseError);
      // Use fallback values
      reflection = {
        self_score: 5,
        confidence_level: 'medium',
        what_went_well: ['Răspuns generat cu succes'],
        what_could_improve: ['Auto-evaluare eșuată - verificare manuală recomandată'],
        missing_context: 'Eroare la parsarea auto-evaluării',
        suggested_sources: []
      };
    }

    // Validate and normalize values
    reflection.self_score = Math.min(10, Math.max(1, Math.round(reflection.self_score)));
    if (!['low', 'medium', 'high'].includes(reflection.confidence_level)) {
      reflection.confidence_level = 'medium';
    }

    const processingTimeMs = Date.now() - startTime;

    // === DUAL OBSERVATION STREAM ===
    const dualObservation = {
      governor_quality: {
        completeness: reflection.self_score >= 7 ? 'complete' : reflection.self_score >= 5 ? 'partial' : 'incomplete',
        accuracy_confidence: reflection.confidence_level,
        relevance: reflection.what_went_well?.length > 0 ? 'relevant' : 'questionable',
        reasoning_depth: answer.length > 1000 ? 'deep' : answer.length > 400 ? 'moderate' : 'shallow',
      },
      session_quality: {
        user_sentiment: errorAnalysisResult.errorId ? 'corrective' : 'neutral',
        corrections_detected: !!errorAnalysisResult.errorId,
        error_type: errorAnalysisResult.errorType,
        engagement_signal: question.length > 100 ? 'high' : question.length > 30 ? 'medium' : 'low',
      },
      cross_stream_anomaly: {
        miscalibration_detected: reflection.confidence_level === 'high' && !!errorAnalysisResult.errorId,
        overconfidence_flag: reflection.self_score >= 8 && !!errorAnalysisResult.errorId,
        description: reflection.confidence_level === 'high' && errorAnalysisResult.errorId 
          ? 'YANA was confident but user corrected — miscalibration detected' 
          : null,
      },
      timestamp: new Date().toISOString(),
    };

    // Save to database
    const { data: savedReflection, error: saveError } = await supabase
      .from('ai_reflection_logs')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        question: question.substring(0, 2000),
        answer_preview: answer.substring(0, 500),
        self_score: reflection.self_score,
        confidence_level: reflection.confidence_level,
        what_went_well: reflection.what_went_well || [],
        what_could_improve: reflection.what_could_improve || [],
        missing_context: reflection.missing_context,
        suggested_sources: reflection.suggested_sources || [],
        model_used: 'gemini-2.5-flash-lite',
        tokens_used: tokensUsed,
        processing_time_ms: processingTimeMs,
        dual_observation: dualObservation,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error("[self-reflect] Failed to save reflection:", saveError);
      throw saveError;
    }

    console.log(`[self-reflect] ✅ Reflection saved (id: ${savedReflection?.id}, score: ${reflection.self_score}/10, ${processingTimeMs}ms)`);

    // ===== AGENT TRACE =====
    try {
      const traceId = crypto.randomUUID();
      await supabase.from("yana_agent_traces").insert({
        trace_id: traceId,
        agent_name: "self-reflect",
        input_summary: `Q: ${question.slice(0, 100)}... | Route: ${route || "unknown"}`,
        output_summary: `Score: ${reflection.self_score}/10, Confidence: ${reflection.confidence_level}, Error: ${!!errorAnalysisResult.errorId}`,
        duration_ms: processingTimeMs,
        tokens_used: tokensUsed,
        cost_cents: 0,
      });
    } catch (traceErr) {
      console.warn("[self-reflect] Trace logging failed:", traceErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reflectionId: savedReflection?.id,
        score: reflection.self_score,
        confidence: reflection.confidence_level,
        processingTimeMs,
        // Error detection results
        errorDetected: !!errorAnalysisResult.errorId,
        errorId: errorAnalysisResult.errorId,
        errorType: errorAnalysisResult.errorType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[self-reflect] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
