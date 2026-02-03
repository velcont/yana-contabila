import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LearningExtractionRequest {
  conversationId: string;
  userId: string;
  userMessage: string;
  aiResponse: string;
  emotionalState?: string;
  balanceContext?: any;
}

// Patterns that indicate unresolved problems
const UNRESOLVED_PATTERNS = [
  /nu înțeleg/i,
  /încă nu știu/i,
  /nu mi-e clar/i,
  /dar cum fac/i,
  /și dacă/i,
  /nu răspunde la/i,
  /altceva vroiam/i,
  /nu asta am întrebat/i,
  /e prea complicat/i,
  /mă confuzi/i,
  /nu m-ai ajutat/i,
  /tot nu știu/i,
];

// Patterns that indicate user preferences
const PREFERENCE_PATTERNS = {
  wantsSimpler: [/mai simplu/i, /pe scurt/i, /fără detalii/i, /pe românește/i],
  wantsDetails: [/mai multe detalii/i, /explică mai bine/i, /detaliază/i],
  wantsExamples: [/un exemplu/i, /exemplu concret/i, /arată-mi/i],
  prefersVisual: [/tabel/i, /grafic/i, /vizual/i, /listă/i],
  isUrgent: [/urgent/i, /repede/i, /acum/i, /deadline/i, /azi/i],
};

// Patterns that indicate satisfaction
const SATISFACTION_PATTERNS = {
  positive: [/mulțumesc/i, /super/i, /excelent/i, /perfect/i, /exact/i, /da!/i, /genial/i, /bravo/i, /asta voiam/i],
  negative: [/nu e bun/i, /greșit/i, /nu ajută/i, /altceva/i, /nu!/i, /dezamăgit/i, /prost/i],
};

// Extract question categories
const QUESTION_CATEGORIES = {
  fiscal: [/tva/i, /impozit/i, /cass/i, /cas/i, /anaf/i, /declarați/i, /e-factura/i, /saf-t/i],
  strategic: [/strategie/i, /plan/i, /creștere/i, /dezvoltare/i, /concurență/i, /piață/i],
  operational: [/cont/i, /sold/i, /balanță/i, /factură/i, /plată/i, /client/i, /furnizor/i],
  emotional: [/stres/i, /îngrijor/i, /teamă/i, /anxietate/i, /speranț/i, /frică/i],
};

function detectPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function detectPreferences(text: string): Record<string, boolean> {
  const prefs: Record<string, boolean> = {};
  for (const [key, patterns] of Object.entries(PREFERENCE_PATTERNS)) {
    prefs[key] = detectPatterns(text, patterns);
  }
  return prefs;
}

function detectCategory(text: string): string {
  for (const [category, patterns] of Object.entries(QUESTION_CATEGORIES)) {
    if (detectPatterns(text, patterns)) {
      return category;
    }
  }
  return 'general';
}

function detectSatisfaction(text: string): { satisfied: boolean | null; score: number } {
  const hasPositive = detectPatterns(text, SATISFACTION_PATTERNS.positive);
  const hasNegative = detectPatterns(text, SATISFACTION_PATTERNS.negative);
  
  if (hasPositive && !hasNegative) return { satisfied: true, score: 0.8 };
  if (hasNegative && !hasPositive) return { satisfied: false, score: 0.2 };
  if (hasPositive && hasNegative) return { satisfied: null, score: 0.5 };
  return { satisfied: null, score: 0.5 };
}

function extractKeyPhrases(response: string): string[] {
  // Extract phrases that might be effective
  const phrases: string[] = [];
  
  // Look for empathy phrases
  const empathyMatch = response.match(/înțeleg că|știu că e greu|normal să simți|am observat că/gi);
  if (empathyMatch) phrases.push(...empathyMatch);
  
  // Look for action phrases
  const actionMatch = response.match(/următorul pas|trebuie să|poți să|recomand să/gi);
  if (actionMatch) phrases.push(...actionMatch);
  
  return [...new Set(phrases)].slice(0, 5);
}

function isNewQuestion(question: string): boolean {
  // Heuristic: questions with specific context are more likely new
  const hasSpecificNumbers = /\d{4,}|\d+%|\d+ lei|\d+ euro/i.test(question);
  const isComplex = question.split(' ').length > 10;
  return hasSpecificNumbers || isComplex;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[EXTRACT-LEARNINGS][${requestId}] Starting extraction`);

  try {
    const body: LearningExtractionRequest = await req.json();
    const { conversationId, userId, userMessage, aiResponse, emotionalState, balanceContext } = body;

    if (!conversationId || !userId || !userMessage || !aiResponse) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract patterns from user message
    const unresolvedSignals: string[] = [];
    for (const pattern of UNRESOLVED_PATTERNS) {
      if (pattern.test(userMessage)) {
        unresolvedSignals.push(userMessage.substring(0, 100));
        break;
      }
    }

    // Detect preferences
    const detectedPreferences = detectPreferences(userMessage);
    const activePreferences: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(detectedPreferences)) {
      if (value) activePreferences[key] = true;
    }

    // Detect category
    const category = detectCategory(userMessage);

    // Detect satisfaction
    const { satisfied, score } = detectSatisfaction(userMessage);

    // Check if it's a new question pattern
    const newQuestions: string[] = [];
    if (isNewQuestion(userMessage)) {
      newQuestions.push(userMessage.substring(0, 200));
    }

    // Extract effective phrases from AI response
    const keyPhrases = extractKeyPhrases(aiResponse);

    // 1. Insert into learning log
    const { error: logError } = await supabase
      .from('yana_learning_log')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        new_questions: newQuestions,
        given_answers: [aiResponse.substring(0, 500)],
        user_preferences: Object.keys(activePreferences).length > 0 ? activePreferences : {},
        unresolved_signals: unresolvedSignals,
        emotional_state: emotionalState || null,
        specific_situation: balanceContext?.company ? `Company: ${balanceContext.company}` : null,
        user_satisfied: satisfied,
        response_worked: satisfied !== false,
        engagement_score: score,
      });

    if (logError) {
      console.error(`[EXTRACT-LEARNINGS][${requestId}] Log insert error:`, logError);
    }

    // 2. Update knowledge gaps if unresolved
    if (unresolvedSignals.length > 0) {
      // Check if similar gap exists
      const { data: existingGaps } = await supabase
        .from('yana_knowledge_gaps')
        .select('id, frequency, example_questions')
        .ilike('question_pattern', `%${userMessage.substring(0, 50)}%`)
        .limit(1);

      if (existingGaps && existingGaps.length > 0) {
        const gap = existingGaps[0];
        await supabase
          .from('yana_knowledge_gaps')
          .update({
            frequency: gap.frequency + 1,
            example_questions: [...(gap.example_questions || []), userMessage.substring(0, 200)].slice(-10),
            last_asked_at: new Date().toISOString(),
          })
          .eq('id', gap.id);
      } else {
        await supabase
          .from('yana_knowledge_gaps')
          .insert({
            question_pattern: userMessage.substring(0, 100),
            example_questions: [userMessage.substring(0, 200)],
            category: category,
            severity: 'medium',
            last_asked_at: new Date().toISOString(),
          });
      }
    }

    // 3. Update effective responses if positive
    if (satisfied === true && keyPhrases.length > 0) {
      const toneUsed = emotionalState || 'neutral';
      const approachType = keyPhrases.some(p => /înțeleg|simt/i.test(p)) ? 'empathetic' : 
                          keyPhrases.some(p => /trebuie|pas/i.test(p)) ? 'action-oriented' : 'analytical';

      // Check if similar response pattern exists
      const { data: existingResponses } = await supabase
        .from('yana_effective_responses')
        .select('id, times_used, positive_reactions, key_phrases')
        .eq('context_type', category)
        .eq('approach_type', approachType)
        .limit(1);

      if (existingResponses && existingResponses.length > 0) {
        const resp = existingResponses[0];
        await supabase
          .from('yana_effective_responses')
          .update({
            times_used: resp.times_used + 1,
            positive_reactions: resp.positive_reactions + 1,
            key_phrases: [...new Set([...(resp.key_phrases || []), ...keyPhrases])].slice(-10),
          })
          .eq('id', resp.id);
      } else {
        await supabase
          .from('yana_effective_responses')
          .insert({
            response_pattern: `${category}_${approachType}`,
            context_type: category,
            times_used: 1,
            positive_reactions: 1,
            key_phrases: keyPhrases,
            tone_used: toneUsed,
            approach_type: approachType,
            example_question: userMessage.substring(0, 200),
            example_response: aiResponse.substring(0, 500),
          });
      }
    }

    // 4. Update trending topics
    const topicKeywords = [
      ...Object.entries(QUESTION_CATEGORIES)
        .filter(([_, patterns]) => detectPatterns(userMessage, patterns))
        .map(([key]) => key)
    ];

    for (const topic of topicKeywords) {
      const { data: existingTopics } = await supabase
        .from('yana_trending_topics')
        .select('id, mention_count, unique_users, user_ids')
        .eq('topic', topic)
        .limit(1);

      if (existingTopics && existingTopics.length > 0) {
        const t = existingTopics[0];
        const userIds = t.user_ids || [];
        const isNewUser = !userIds.includes(userId);
        
        await supabase
          .from('yana_trending_topics')
          .update({
            mention_count: t.mention_count + 1,
            unique_users: isNewUser ? t.unique_users + 1 : t.unique_users,
            user_ids: isNewUser ? [...userIds, userId].slice(-100) : userIds,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', t.id);
      } else {
        await supabase
          .from('yana_trending_topics')
          .insert({
            topic: topic,
            topic_category: category,
            mention_count: 1,
            unique_users: 1,
            user_ids: [userId],
            last_seen_at: new Date().toISOString(),
          });
      }
    }

    console.log(`[EXTRACT-LEARNINGS][${requestId}] ✅ Extraction complete`);

    return new Response(
      JSON.stringify({
        success: true,
        extracted: {
          newQuestions: newQuestions.length,
          unresolvedSignals: unresolvedSignals.length,
          preferences: Object.keys(activePreferences).length,
          satisfied: satisfied,
          category: category,
          keyPhrases: keyPhrases.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[EXTRACT-LEARNINGS][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
