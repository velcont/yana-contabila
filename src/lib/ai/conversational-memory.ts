// src/lib/ai/conversational-memory.ts
// Serviciu de memorie conversațională pentru AI Learning System

import { supabase } from '@/integrations/supabase/client';

/**
 * Interfețe pentru tipuri
 */
export interface ConversationContext {
  question: string;
  companyId: string;
  userId: string;
  month?: number;
  year?: number;
  category?: string;
  intent?: string;
  analysisId?: string;
  [key: string]: any;
}

export interface SavedConversation {
  id: string;
  question: string;
  answer: string;
  context: any;
  was_helpful: boolean;
  user_feedback?: string | null;
  created_at: string;
  similarity_score?: number;
}

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  pattern_description: string;
  example_questions: string[];
  suggested_answer_template: string | null;
  confidence_score: number;
}

export interface CompanyPreferences {
  [key: string]: any;
}

export interface EnhancedPromptResult {
  enhancedPrompt: string;
  similarConversations: SavedConversation[];
  learnedPatterns: LearnedPattern[];
  companyPreferences: CompanyPreferences;
}

/**
 * Extrage keywords dintr-o întrebare pentru căutare
 */
function extractKeywords(question: string): string[] {
  // Îndepărtează cuvinte comune românești (stop words)
  const stopWords = [
    'care', 'sunt', 'este', 'cum', 'pentru', 'din', 'la', 'cu', 'pe', 'de',
    'ce', 'mai', 'când', 'unde', 'având', 'avea', 'am', 'ai', 'are', 'a',
    'sau', 'dar', 'și', 'în', 'să', 'fie', 'fost', 'între', 'după', 'să'
  ];
  
  // Tokenizare simplă și curățare
  const words = question
    .toLowerCase()
    .replace(/[^\w\săâîșț]/g, ' ') // Păstrează diacriticele românești
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Return primele 5 keywords cele mai relevante
  return words.slice(0, 5);
}

/**
 * Găsește conversații similare din istoric
 */
export async function findSimilarConversations(
  companyId: string,
  question: string,
  limit: number = 5
): Promise<SavedConversation[]> {
  try {
    console.log('🔍 AI Learning: Searching for similar conversations...');
    
    const keywords = extractKeywords(question);
    console.log(`📝 Keywords extracted: ${keywords.join(', ')}`);
    
    if (keywords.length === 0) {
      console.log('⚠️ No keywords found, skipping similarity search');
      return [];
    }
    
    // Apelează funcția PostgreSQL pentru căutare
    const { data, error } = await supabase.rpc('find_similar_conversations', {
      p_company_id: companyId,
      p_question_keywords: keywords,
      p_limit: limit
    });
    
    if (error) {
      console.error('❌ Error finding similar conversations:', error);
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} similar conversations`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in findSimilarConversations:', error);
    return [];
  }
}

/**
 * Obține pattern-uri învățate relevante
 */
export async function getLearnedPatterns(
  companyId: string,
  patternType?: string
): Promise<LearnedPattern[]> {
  try {
    console.log('🧠 AI Learning: Loading learned patterns...');
    
    let query = supabase
      .from('ai_learned_patterns')
      .select('*')
      .or(`applies_to_company_id.eq.${companyId},applies_to_company_id.is.null`)
      .gte('confidence_score', 0.6)
      .order('confidence_score', { ascending: false })
      .limit(5);
    
    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error getting learned patterns:', error);
      return [];
    }
    
    console.log(`✅ Loaded ${data?.length || 0} learned patterns`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in getLearnedPatterns:', error);
    return [];
  }
}

/**
 * Obține preferințele companiei
 */
export async function getCompanyPreferences(
  companyId: string
): Promise<CompanyPreferences> {
  try {
    console.log('⚙️ AI Learning: Loading company preferences...');
    
    const { data, error } = await supabase
      .from('ai_company_preferences')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.error('❌ Error getting company preferences:', error);
      return {};
    }
    
    // Convertește array de preferințe în obiect
    const preferences: CompanyPreferences = {};
    data?.forEach(pref => {
      preferences[pref.preference_type] = pref.preference_value;
    });
    
    console.log(`✅ Loaded ${Object.keys(preferences).length} preferences`);
    return preferences;
  } catch (error) {
    console.error('❌ Error in getCompanyPreferences:', error);
    return {};
  }
}

/**
 * Construiește prompt îmbogățit cu context învățat
 */
export async function getEnhancedPrompt(
  context: ConversationContext
): Promise<EnhancedPromptResult> {
  try {
    console.log('🧠 AI Learning: Building enhanced prompt with learned context...');
    
    // 1. Găsește conversații similare din trecut
    const similarConversations = await findSimilarConversations(
      context.companyId,
      context.question,
      5
    );
    
    // 2. Obține pattern-uri învățate
    const learnedPatterns = await getLearnedPatterns(context.companyId);
    
    // 3. Obține preferințele companiei
    const companyPreferences = await getCompanyPreferences(context.companyId);
    
    // 4. Construiește prompt îmbogățit
    let enhancedPrompt = `Tu ești YANA, asistentul financiar AI pentru firme de contabilitate din România.

CONTEXT IMPORTANT:
Răspunzi în limba română, folosești termeni contabili corecți pentru legislația română, 
și dai sfaturi practice bazate pe experiența acumulată din conversațiile anterioare.
`;

    // Adaugă conversații similare dacă există
    if (similarConversations.length > 0) {
      enhancedPrompt += `

ÎNVĂȚĂTURI DIN CONVERSAȚII ANTERIOARE CU ACEASTĂ FIRMĂ:
${similarConversations.map((conv, idx) => `
${idx + 1}. Întrebare anterioară: "${conv.question}"
   Răspuns care a fost util: "${conv.answer.substring(0, 300)}${conv.answer.length > 300 ? '...' : ''}"
   ${conv.user_feedback ? `Feedback utilizator: "${conv.user_feedback}"` : ''}
`).join('\n')}

Folosește aceste învățături pentru a oferi un răspuns mai personalizat și relevant pentru această firmă.
`;
    }
    
    // Adaugă pattern-uri învățate
    if (learnedPatterns.length > 0) {
      enhancedPrompt += `

PATTERN-URI IDENTIFICATE PENTRU FIRME SIMILARE:
${learnedPatterns.map((pattern, idx) => `
${idx + 1}. ${pattern.pattern_description}
   Întrebări tipice: ${pattern.example_questions?.slice(0, 3).join(', ')}
   ${pattern.suggested_answer_template ? `Template răspuns: ${pattern.suggested_answer_template.substring(0, 200)}` : ''}
`).join('\n')}
`;
    }
    
    // Adaugă preferințele companiei
    if (Object.keys(companyPreferences).length > 0) {
      enhancedPrompt += `

PREFERINȚE ÎNVĂȚATE PENTRU ACEASTĂ FIRMĂ:
${Object.entries(companyPreferences).map(([key, value]) => `
- ${key}: ${JSON.stringify(value, null, 2)}
`).join('\n')}

Respectă aceste preferințe în răspunsul tău.
`;
    }
    
    // Adaugă întrebarea curentă
    enhancedPrompt += `

ÎNTREBAREA CURENTĂ:
${context.question}

CONTEXT ADIȚIONAL:
${context.month ? `Luna: ${context.month}` : ''}
${context.year ? `Anul: ${context.year}` : ''}
${context.category ? `Categorie: ${context.category}` : ''}
${context.intent ? `Intent detectat: ${context.intent}` : ''}

Te rog să răspunzi:
1. Bazându-te pe învățările din conversațiile anterioare
2. Folosind pattern-urile identificate
3. Respectând preferințele firmei
4. Oferind un răspuns practic, specific și acționabil
5. În limba română, cu termeni contabili corecți
`;

    console.log(`✅ Enhanced prompt built with ${similarConversations.length} similar conversations, ${learnedPatterns.length} patterns`);

    return {
      enhancedPrompt,
      similarConversations,
      learnedPatterns,
      companyPreferences
    };
  } catch (error) {
    console.error('❌ Error creating enhanced prompt:', error);
    
    // Fallback la prompt basic - aplicația merge mai departe
    return {
      enhancedPrompt: `Tu ești YANA, asistentul financiar AI pentru România.

ÎNTREBARE: ${context.question}

Răspunde în limba română, folosind termeni contabili corecți.`,
      similarConversations: [],
      learnedPatterns: [],
      companyPreferences: {}
    };
  }
}

/**
 * Salvează conversația în DB
 */
export async function saveConversation(
  question: string,
  answer: string,
  context: ConversationContext,
  tokensUsed?: number
): Promise<string | null> {
  try {
    console.log('💾 AI Learning: Saving conversation to database...');
    
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: context.userId,
        company_id: context.companyId,
        question: question,
        answer: answer,
        context: {
          month: context.month,
          year: context.year,
          category: context.category,
          intent: context.intent,
          analysis_id: context.analysisId
        },
        tokens_used: tokensUsed,
        model_used: 'google/gemini-2.5-flash'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error saving conversation:', error);
      return null;
    }
    
    console.log(`✅ Conversation saved with ID: ${data?.id}`);
    return data?.id || null;
  } catch (error) {
    console.error('❌ Error in saveConversation:', error);
    return null;
  }
}

/**
 * Salvează feedback pentru o conversație
 */
export async function saveFeedback(
  conversationId: string,
  wasHelpful: boolean,
  rating?: number,
  userComment?: string
): Promise<boolean> {
  try {
    console.log(`📊 AI Learning: Saving feedback (${wasHelpful ? '👍 Helpful' : '👎 Not helpful'})...`);
    
    // Update conversația cu feedback
    const { error: updateError } = await supabase
      .from('ai_conversations')
      .update({
        was_helpful: wasHelpful,
        rating: rating,
        user_feedback: userComment,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    if (updateError) {
      console.error('❌ Error updating conversation feedback:', updateError);
      return false;
    }
    
    // Dacă feedback-ul e negativ și există comentariu, salvează și în tabelul de feedback detaliat
    if (!wasHelpful && userComment) {
      const { error: feedbackError } = await supabase
        .from('ai_response_feedback')
        .insert({
          conversation_id: conversationId,
          feedback_type: 'not_helpful',
          user_comment: userComment,
          rating: rating
        });
      
      if (feedbackError) {
        console.error('⚠️ Error saving detailed feedback (non-critical):', feedbackError);
      }
    }
    
    console.log('✅ Feedback saved successfully - AI will learn from this!');
    return true;
  } catch (error) {
    console.error('❌ Error in saveFeedback:', error);
    return false;
  }
}

/**
 * Analizează conversațiile și creează pattern-uri noi
 * (Rulează periodic - de ex. zilnic prin cron job)
 */
export async function analyzeAndCreatePatterns(
  companyId?: string
): Promise<void> {
  try {
    console.log('🔬 AI Learning: Analyzing conversations for patterns...');
    
    // Obține toate conversațiile utile din ultimele 30 zile
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('was_helpful', true)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data: conversations, error } = await query;
    
    if (error || !conversations || conversations.length < 10) {
      console.log('⚠️ Not enough data to create patterns (need at least 10 conversations)');
      return;
    }
    
    console.log(`📊 Analyzing ${conversations.length} conversations for pattern extraction`);
    
    // Grupează întrebări similare
    const questionGroups: Record<string, any[]> = {};
    
    conversations.forEach(conv => {
      const keywords = extractKeywords(conv.question);
      const key = keywords.slice(0, 2).sort().join('_');
      
      if (!questionGroups[key]) {
        questionGroups[key] = [];
      }
      questionGroups[key].push(conv);
    });
    
    // Creează pattern-uri pentru grupurile cu mai mult de 3 întrebări similare
    let patternsCreated = 0;
    for (const [key, group] of Object.entries(questionGroups)) {
      if (group.length >= 3) {
        // Verifică dacă pattern-ul există deja
        const { data: existingPattern } = await supabase
          .from('ai_learned_patterns')
          .select('id, times_validated, confidence_score')
          .eq('pattern_key', key)
          .eq('applies_to_company_id', companyId || null)
          .maybeSingle();
        
        if (existingPattern) {
          // Update pattern existent - crește confidence
          await supabase
            .from('ai_learned_patterns')
            .update({
              times_validated: existingPattern.times_validated + 1,
              confidence_score: Math.min(existingPattern.confidence_score + 0.1, 1.0),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPattern.id);
          
          console.log(`✅ Updated existing pattern: ${key}`);
        } else {
          // Creează pattern nou
          await supabase
            .from('ai_learned_patterns')
            .insert({
              pattern_type: 'common_question',
              pattern_key: key,
              pattern_description: `Întrebări frecvente despre ${extractKeywords(group[0].question).join(', ')}`,
              applies_to_company_id: companyId || null,
              example_questions: group.map(g => g.question).slice(0, 5),
              suggested_answer_template: group[0].answer.substring(0, 500),
              confidence_score: 0.6,
              times_validated: group.length
            });
          
          patternsCreated++;
          console.log(`✅ Created new pattern: ${key}`);
        }
      }
    }
    
    console.log(`✅ Pattern analysis completed: ${patternsCreated} new patterns created`);
  } catch (error) {
    console.error('❌ Error in analyzeAndCreatePatterns:', error);
  }
}

/**
 * Învață preferințele companiei bazat pe feedback
 */
export async function learnCompanyPreferences(
  companyId: string
): Promise<void> {
  try {
    console.log('📚 AI Learning: Learning company preferences from feedback...');
    
    // Obține toate conversațiile cu rating mare (4-5 stele)
    const { data: goodConversations, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('company_id', companyId)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error || !goodConversations || goodConversations.length < 5) {
      console.log('⚠️ Not enough data to learn preferences (need at least 5 high-rated conversations)');
      return;
    }
    
    // Analizează lungimea răspunsurilor preferate
    const avgLength = goodConversations.reduce((sum, conv) => sum + conv.answer.length, 0) / goodConversations.length;
    
    const preferredStyle = {
      preferred_length: avgLength > 500 ? 'detailed' : 'concise',
      average_length: Math.round(avgLength),
      include_examples: goodConversations.filter(c => 
        c.answer.includes('exemplu') || c.answer.includes('de exemplu')
      ).length > goodConversations.length * 0.5
    };
    
    // Salvează sau update preferința
    await supabase
      .from('ai_company_preferences')
      .upsert({
        company_id: companyId,
        preference_type: 'response_style',
        preference_value: preferredStyle,
        confidence: Math.min(goodConversations.length / 20, 1.0),
        examples_count: goodConversations.length
      }, {
        onConflict: 'company_id,preference_type'
      });
    
    console.log(`✅ Company preferences learned successfully: ${JSON.stringify(preferredStyle)}`);
  } catch (error) {
    console.error('❌ Error learning company preferences:', error);
  }
}

export default {
  getEnhancedPrompt,
  saveConversation,
  saveFeedback,
  findSimilarConversations,
  analyzeAndCreatePatterns,
  learnCompanyPreferences
};
