import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * SISTEM 1: OBSERVATORUL (Învățare Pasivă)
 * Observă TOATE conversațiile fără a interveni.
 * Extrage: erori, pattern-uri, feedback, corecții, knowledge gaps.
 * Cost AI: ZERO — folosește doar regex/heuristici locale.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ObservationInput {
  userId: string;
  conversationId: string;
  question: string;
  answer: string;
  selfScore?: number;
  wasCorrected?: boolean;
  userFeedback?: string;
  processingTimeMs?: number;
  modelUsed?: string;
  route?: string;
}

// ============= PATTERN DETECTION (local, no AI) =============

function detectErrorPatterns(question: string, answer: string): string[] {
  const errors: string[] = [];
  
  // Answer contains uncertainty markers
  if (/nu (sunt|pot fi) sigur|nu am informații|nu știu exact/i.test(answer)) {
    errors.push("uncertainty_detected");
  }
  
  // Very short answer to complex question
  if (question.length > 100 && answer.length < 50) {
    errors.push("insufficient_response");
  }
  
  // Answer repeats the question without adding value
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const answerWords = answer.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const overlap = questionWords.filter(w => answerWords.includes(w)).length;
  if (questionWords.length > 5 && overlap / questionWords.length > 0.7) {
    errors.push("echo_response");
  }
  
  // Generic filler response
  if (/este important să|trebuie menționat că|în general/i.test(answer) && answer.length < 200) {
    errors.push("generic_filler");
  }
  
  return errors;
}

function detectKnowledgeGaps(question: string, answer: string): string[] {
  const gaps: string[] = [];
  
  // User asks about specific regulations
  if (/ordin|hotărâre|lege|normă|cod fiscal|art\.\s*\d+/i.test(question)) {
    if (!/art\.\s*\d+|alin\.\s*\d+|lit\.\s*[a-z]/i.test(answer)) {
      gaps.push("missing_legal_reference");
    }
  }
  
  // User asks about specific accounting entries
  if (/cont\s*\d{3,4}|înregistrare contabilă|notă contabilă/i.test(question)) {
    if (!/\d{3,4}\s*[=\/]\s*\d{3,4}/i.test(answer)) {
      gaps.push("missing_accounting_entry");
    }
  }
  
  // User asks about deadlines
  if (/termen|dată limită|până când|deadline/i.test(question)) {
    if (!/\d{1,2}\s*(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)/i.test(answer)) {
      gaps.push("missing_deadline_info");
    }
  }
  
  return gaps;
}

function detectPositiveFeedback(question: string, answer: string): boolean {
  return /mulțumesc|perfect|excelent|exact ce|super|bravo|genial/i.test(question);
}

function detectUserStruggle(question: string, history?: string[]): boolean {
  // User reformulates the same question (struggle)
  if (/adică|vreau să zic|nu asta am întrebat|altceva|din nou/i.test(question)) {
    return true;
  }
  return false;
}

function classifyTopic(question: string): string {
  if (/balanț|bilanț|cont\s*\d/i.test(question)) return "accounting";
  if (/tva|impozit|taxă|fiscal|anaf/i.test(question)) return "fiscal";
  if (/salariu|hr|angajat|concediu/i.test(question)) return "hr";
  if (/profit|venit|cheltuial|cash|lichiditat/i.test(question)) return "financial";
  if (/strategi|plan|creșter|afacer/i.test(question)) return "strategy";
  if (/doctorat|teză|academic|cercet/i.test(question)) return "academic";
  return "general";
}

function calculateLearningPotential(
  errorPatterns: string[],
  knowledgeGaps: string[],
  selfScore: number | undefined,
  wasCorrected: boolean | undefined
): number {
  let potential = 0.3; // base
  
  // Corrections have highest learning value
  if (wasCorrected) potential += 0.4;
  
  // Low self-score means the system knows it struggled
  if (selfScore !== undefined && selfScore < 5) potential += 0.2;
  
  // Each error pattern adds learning value
  potential += errorPatterns.length * 0.1;
  
  // Knowledge gaps are valuable
  potential += knowledgeGaps.length * 0.15;
  
  return Math.min(potential, 1.0);
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const input: ObservationInput = await req.json();
    const observations: Array<{
      observation_type: string;
      source_user_id: string;
      source_conversation_id: string;
      raw_data: Record<string, unknown>;
      learning_potential: number;
    }> = [];

    const { question, answer, userId, conversationId } = input;

    // 1. Detect error patterns
    const errorPatterns = detectErrorPatterns(question, answer);
    if (errorPatterns.length > 0) {
      observations.push({
        observation_type: "error_detected",
        source_user_id: userId,
        source_conversation_id: conversationId,
        raw_data: {
          errors: errorPatterns,
          question_preview: question.slice(0, 200),
          answer_length: answer.length,
          model: input.modelUsed,
          route: input.route,
        },
        learning_potential: calculateLearningPotential(errorPatterns, [], input.selfScore, input.wasCorrected),
      });
    }

    // 2. Detect knowledge gaps
    const knowledgeGaps = detectKnowledgeGaps(question, answer);
    if (knowledgeGaps.length > 0) {
      observations.push({
        observation_type: "knowledge_gap",
        source_user_id: userId,
        source_conversation_id: conversationId,
        raw_data: {
          gaps: knowledgeGaps,
          topic: classifyTopic(question),
          question_preview: question.slice(0, 200),
        },
        learning_potential: 0.7,
      });
    }

    // 3. Detect user correction
    if (input.wasCorrected) {
      observations.push({
        observation_type: "correction_received",
        source_user_id: userId,
        source_conversation_id: conversationId,
        raw_data: {
          question_preview: question.slice(0, 200),
          answer_preview: answer.slice(0, 200),
          feedback: input.userFeedback,
          topic: classifyTopic(question),
        },
        learning_potential: 0.9,
      });
    }

    // 4. Detect positive feedback
    if (detectPositiveFeedback(question, answer)) {
      observations.push({
        observation_type: "positive_feedback",
        source_user_id: userId,
        source_conversation_id: conversationId,
        raw_data: {
          topic: classifyTopic(question),
          question_preview: question.slice(0, 200),
          model: input.modelUsed,
          response_time_ms: input.processingTimeMs,
        },
        learning_potential: 0.4,
      });
    }

    // 5. Detect user struggle
    if (detectUserStruggle(question)) {
      observations.push({
        observation_type: "user_struggle",
        source_user_id: userId,
        source_conversation_id: conversationId,
        raw_data: {
          question_preview: question.slice(0, 200),
          topic: classifyTopic(question),
        },
        learning_potential: 0.6,
      });
    }

    // 6. Always log a pattern observation for topic tracking
    observations.push({
      observation_type: "pattern_found",
      source_user_id: userId,
      source_conversation_id: conversationId,
      raw_data: {
        topic: classifyTopic(question),
        question_length: question.length,
        answer_length: answer.length,
        self_score: input.selfScore,
        processing_time_ms: input.processingTimeMs,
        model: input.modelUsed,
        route: input.route,
      },
      learning_potential: 0.2,
    });

    // Insert all observations
    if (observations.length > 0) {
      const { error } = await supabase
        .from("yana_observations")
        .insert(observations);

      if (error) {
        console.error("[Observer] Insert error:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        observations_count: observations.length,
        types: observations.map(o => o.observation_type),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Observer] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
