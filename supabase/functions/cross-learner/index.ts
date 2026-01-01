import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExperimentAggregate {
  anonymized_pattern: string;
  experiment_type: string;
  success_count: number;
  total_count: number;
  avg_emotional_resonance: number | null;
}

// =============================================================================
// MAIN HANDLER - Rulează periodic (cron) sau manual
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Cross-Learner] Starting aggregation...');

    // =============================================================================
    // STEP 1: Agregare experimente cu outcome != pending
    // =============================================================================
    
    // Obținem toate experimentele evaluate din ultimele 30 zile
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: experiments } = await supabase
      .from('ai_experiments')
      .select('anonymized_pattern, experiment_type, outcome, emotional_resonance')
      .neq('outcome', 'pending')
      .gte('created_at', thirtyDaysAgo)
      .not('anonymized_pattern', 'is', null);

    if (!experiments || experiments.length === 0) {
      console.log('[Cross-Learner] No experiments to aggregate');
      return new Response(
        JSON.stringify({ success: true, message: 'No experiments to aggregate' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Cross-Learner] Found ${experiments.length} experiments to aggregate`);

    // Grupăm pe pattern anonimizat
    const patternMap = new Map<string, {
      type: string;
      successCount: number;
      totalCount: number;
      emotionalSum: number;
      emotionalCount: number;
    }>();

    for (const exp of experiments) {
      if (!exp.anonymized_pattern) continue;
      
      const key = exp.anonymized_pattern;
      const existing = patternMap.get(key) || {
        type: exp.experiment_type,
        successCount: 0,
        totalCount: 0,
        emotionalSum: 0,
        emotionalCount: 0
      };
      
      existing.totalCount++;
      if (exp.outcome === 'success') existing.successCount++;
      if (exp.emotional_resonance) {
        existing.emotionalSum += exp.emotional_resonance;
        existing.emotionalCount++;
      }
      
      patternMap.set(key, existing);
    }

    console.log(`[Cross-Learner] Aggregated into ${patternMap.size} patterns`);

    // =============================================================================
    // STEP 2: Filtrăm pattern-urile cu suficient sample size (>= 3)
    // =============================================================================
    
    const significantPatterns: ExperimentAggregate[] = [];
    
    for (const [pattern, data] of patternMap.entries()) {
      if (data.totalCount >= 3) {
        significantPatterns.push({
          anonymized_pattern: pattern,
          experiment_type: data.type,
          success_count: data.successCount,
          total_count: data.totalCount,
          avg_emotional_resonance: data.emotionalCount > 0 
            ? data.emotionalSum / data.emotionalCount 
            : null
        });
      }
    }

    if (significantPatterns.length === 0) {
      console.log('[Cross-Learner] No patterns with sufficient sample size');
      return new Response(
        JSON.stringify({ success: true, message: 'No significant patterns yet' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Cross-Learner] ${significantPatterns.length} patterns have sufficient sample size`);

    // =============================================================================
    // STEP 3: Generăm insights cu AI pentru pattern-urile top
    // =============================================================================
    
    // Sortăm după success rate
    significantPatterns.sort((a, b) => 
      (b.success_count / b.total_count) - (a.success_count / a.total_count)
    );

    const topPatterns = significantPatterns.slice(0, 10);
    let insightsCreated = 0;

    if (openRouterKey) {
      for (const pattern of topPatterns) {
        const successRate = pattern.success_count / pattern.total_count;
        
        // Generăm insight doar pentru pattern-uri cu succes > 50% sau eșec > 70%
        if (successRate < 0.5 && successRate > 0.3) continue;

        const isSuccessPattern = successRate >= 0.5;
        
        const insightPrompt = `Analizează acest pattern de comportament YANA care ${isSuccessPattern ? 'FUNCȚIONEAZĂ' : 'NU funcționează'}:

PATTERN: "${pattern.anonymized_pattern}"
TIP: ${pattern.experiment_type}
SUCCES: ${pattern.success_count}/${pattern.total_count} (${Math.round(successRate * 100)}%)
REZONANȚĂ EMOȚIONALĂ MEDIE: ${pattern.avg_emotional_resonance?.toFixed(1) || 'N/A'}/10

Generează un insight pentru YANA:
1. pattern_description: Descrie concis pattern-ul (max 100 caractere)
2. recommended_response: Cum ar trebui să procedeze YANA în situații similare (max 200 caractere)
3. emotional_approach: Ce ton emoțional funcționează (curiozitate/empatie/provocare/etc)
4. anti_pattern: Ce să evite (max 100 caractere)

RĂSPUNDE în format JSON:
{
  "pattern_description": "...",
  "recommended_response": "...",
  "emotional_approach": "...",
  "anti_pattern": "..."
}`;

        try {
          const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://yana.ro',
              'X-Title': 'YANA Cross Learner'
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-preview-05-20',
              messages: [{ role: 'user', content: insightPrompt }],
              max_tokens: 300,
              temperature: 0.3
            })
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            const responseText = aiResult.choices?.[0]?.message?.content || '';
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const insight = JSON.parse(jsonMatch[0]);
              
              // Upsert în cross_user_insights
              const patternType = isSuccessPattern ? 'effective_approach' : 'common_mistake';
              
              await supabase
                .from('cross_user_insights')
                .upsert({
                  pattern_type: patternType,
                  pattern_description: insight.pattern_description || pattern.anonymized_pattern,
                  occurrence_count: pattern.total_count,
                  success_rate: successRate,
                  recommended_response: insight.recommended_response,
                  anti_pattern: insight.anti_pattern,
                  emotional_approach: insight.emotional_approach,
                  last_updated: new Date().toISOString()
                }, {
                  onConflict: 'pattern_type,pattern_description'
                });
              
              insightsCreated++;
              console.log(`[Cross-Learner] Created insight: ${insight.pattern_description?.substring(0, 50)}...`);
            }
          }
        } catch (e) {
          console.error(`[Cross-Learner] Failed to generate insight for pattern:`, e);
        }
        
        // Rate limiting pentru API calls
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.log('[Cross-Learner] No OpenRouter key, skipping AI insights');
      
      // Salvăm statisticile de bază fără AI
      for (const pattern of topPatterns) {
        const successRate = pattern.success_count / pattern.total_count;
        const patternType = successRate >= 0.5 ? 'effective_approach' : 'common_mistake';
        
        await supabase
          .from('cross_user_insights')
          .upsert({
            pattern_type: patternType,
            pattern_description: pattern.anonymized_pattern,
            occurrence_count: pattern.total_count,
            success_rate: successRate,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'pattern_type,pattern_description'
          });
        
        insightsCreated++;
      }
    }

    // =============================================================================
    // STEP 4: Cleanup - Ștergem insights vechi sau cu sample size mic
    // =============================================================================
    
    const { data: deletedOld } = await supabase
      .from('cross_user_insights')
      .delete()
      .lt('last_updated', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');

    if (deletedOld && deletedOld.length > 0) {
      console.log(`[Cross-Learner] Cleaned up ${deletedOld.length} old insights`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Cross-Learner] Completed in ${processingTime}ms, created/updated ${insightsCreated} insights`);

    return new Response(
      JSON.stringify({
        success: true,
        experimentsAnalyzed: experiments.length,
        patternsFound: patternMap.size,
        significantPatterns: significantPatterns.length,
        insightsCreated,
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Cross-Learner] Error after ${processingTime}ms:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
