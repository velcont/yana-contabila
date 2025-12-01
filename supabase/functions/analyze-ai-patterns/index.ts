import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 AI Pattern Analysis: Starting...');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('❌ Authorization failed: User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Admin user verified:', user.email);

    // Obține toate companiile cu conversații recente (ultimele 30 zile)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: companies, error: companiesError } = await supabaseClient
      .from('companies')
      .select('id, company_name')
      .limit(100);

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      throw companiesError;
    }

    console.log(`📊 Analyzing patterns for ${companies?.length || 0} companies...`);

    let patternsCreated = 0;
    let patternsUpdated = 0;
    let preferencesLearned = 0;

    // Pentru fiecare companie
    for (const company of companies || []) {
      console.log(`🔍 Processing company: ${company.company_name}`);

      // 1. Obține conversații utile din ultimele 30 zile
      const { data: conversations, error: convsError } = await supabaseClient
        .from('ai_conversations')
        .select('*')
        .eq('company_id', company.id)
        .eq('was_helpful', true)
        .gte('created_at', thirtyDaysAgo);

      if (convsError) {
        console.error(`❌ Error fetching conversations for ${company.company_name}:`, convsError);
        continue;
      }

      if (!conversations || conversations.length < 3) {
        console.log(`⚠️ Not enough data for ${company.company_name} (${conversations?.length || 0} conversations)`);
        continue;
      }

      console.log(`📝 Found ${conversations.length} helpful conversations for ${company.company_name}`);

      // 2. ANALIZĂ PATTERN-URI: Grupează întrebări similare
      const questionGroups: Record<string, any[]> = {};

      conversations.forEach(conv => {
        // Extrage keywords simple
        const keywords = extractKeywords(conv.question);
        const key = keywords.slice(0, 2).sort().join('_');

        if (!questionGroups[key]) {
          questionGroups[key] = [];
        }
        questionGroups[key].push(conv);
      });

      // 3. Creează/Update pattern-uri pentru grupuri cu ≥3 întrebări similare
      for (const [key, group] of Object.entries(questionGroups)) {
        if (group.length >= 3) {
          // Verifică dacă pattern-ul există deja
          const { data: existingPattern } = await supabaseClient
            .from('ai_learned_patterns')
            .select('id, times_validated, confidence_score')
            .eq('pattern_key', key)
            .eq('applies_to_company_id', company.id)
            .maybeSingle();

          if (existingPattern) {
            // Update pattern existent - crește confidence
            const newConfidence = Math.min(existingPattern.confidence_score + 0.1, 1.0);
            
            await supabaseClient
              .from('ai_learned_patterns')
              .update({
                times_validated: existingPattern.times_validated + 1,
                confidence_score: newConfidence,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPattern.id);

            patternsUpdated++;
            console.log(`✅ Updated pattern: ${key} (confidence: ${newConfidence.toFixed(2)})`);
          } else {
            // Creează pattern nou
            const firstQuestion = group[0];
            const keywords = extractKeywords(firstQuestion.question);

            await supabaseClient
              .from('ai_learned_patterns')
              .insert({
                pattern_type: 'common_question',
                pattern_key: key,
                pattern_description: `Întrebări frecvente despre ${keywords.join(', ')}`,
                applies_to_company_id: company.id,
                example_questions: group.map(g => g.question).slice(0, 5),
                suggested_answer_template: firstQuestion.answer.substring(0, 500),
                confidence_score: 0.6,
                times_validated: group.length
              });

            patternsCreated++;
            console.log(`✅ Created new pattern: ${key}`);
          }
        }
      }

      // 4. ÎNVAȚĂ PREFERINȚE: Analizează conversații cu rating mare (4-5 stele)
      const { data: goodConversations } = await supabaseClient
        .from('ai_conversations')
        .select('*')
        .eq('company_id', company.id)
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .limit(20);

      if (goodConversations && goodConversations.length >= 5) {
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
        await supabaseClient
          .from('ai_company_preferences')
          .upsert({
            company_id: company.id,
            preference_type: 'response_style',
            preference_value: preferredStyle,
            confidence: Math.min(goodConversations.length / 20, 1.0),
            examples_count: goodConversations.length
          }, {
            onConflict: 'company_id,preference_type'
          });

        preferencesLearned++;
        console.log(`✅ Learned preferences for ${company.company_name}: ${preferredStyle.preferred_length}`);
      }
    }

    const result = {
      success: true,
      companies_analyzed: companies?.length || 0,
      patterns_created: patternsCreated,
      patterns_updated: patternsUpdated,
      preferences_learned: preferencesLearned,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Pattern analysis completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in analyze-ai-patterns:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Extrage keywords dintr-o întrebare (helper function)
 */
function extractKeywords(question: string): string[] {
  const stopWords = [
    'care', 'sunt', 'este', 'cum', 'pentru', 'din', 'la', 'cu', 'pe', 'de',
    'ce', 'mai', 'când', 'unde', 'având', 'avea', 'am', 'ai', 'are', 'a',
    'sau', 'dar', 'și', 'în', 'să', 'fie', 'fost', 'între', 'după'
  ];

  const words = question
    .toLowerCase()
    .replace(/[^\w\săâîșț]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));

  return words.slice(0, 5);
}
