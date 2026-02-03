import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptimizationRequest {
  type: 'analyze' | 'apply_winner' | 'generate_decision' | 'track_context';
  experimentId?: string;
  userId?: string;
  satisfactionScore?: number;
  topics?: string[];
  responseStyle?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[AUTO-OPTIMIZER][${requestId}] Starting optimization`);

  try {
    const body: OptimizationRequest = await req.json();
    const { type, experimentId, userId, satisfactionScore, topics, responseStyle } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: Record<string, unknown> = {};

    switch (type) {
      case 'analyze': {
        // Analizează toate experimentele active și calculează statisticile
        const { data: experiments } = await supabase
          .from('yana_ab_experiments')
          .select('*')
          .eq('status', 'active');

        const analysis: Array<Record<string, unknown>> = [];

        for (const exp of experiments || []) {
          const totalImpressions = exp.variant_a_impressions + exp.variant_b_impressions;
          const isSignificant = exp.statistical_significance >= 0.95;
          const hasEnoughData = totalImpressions >= exp.min_sample_size * 2;

          analysis.push({
            id: exp.id,
            name: exp.experiment_name,
            totalImpressions,
            variantAScore: exp.variant_a_score,
            variantBScore: exp.variant_b_score,
            significance: exp.statistical_significance,
            isSignificant,
            hasEnoughData,
            recommendedAction: isSignificant && hasEnoughData
              ? (exp.variant_a_score > exp.variant_b_score ? 'apply_variant_a' : 'apply_variant_b')
              : 'continue_testing',
          });
        }

        result = { experiments: analysis, count: analysis.length };
        break;
      }

      case 'apply_winner': {
        if (!experimentId) {
          throw new Error("experimentId is required for apply_winner");
        }

        // Aplică câștigătorul unui experiment
        const { data: experiment } = await supabase
          .from('yana_ab_experiments')
          .select('*')
          .eq('id', experimentId)
          .single();

        if (!experiment) {
          throw new Error("Experiment not found");
        }

        const winner = experiment.variant_a_score > experiment.variant_b_score ? 'a' : 'b';
        const winnerVariant = winner === 'a' ? experiment.variant_a : experiment.variant_b;

        // Creăm o decizie de îmbunătățire
        const { data: decision, error: decisionError } = await supabase
          .from('yana_improvement_decisions')
          .insert({
            decision_type: 'ab_test_winner',
            trigger_reason: `A/B test "${experiment.experiment_name}" completed with statistical significance ${(experiment.statistical_significance * 100).toFixed(1)}%`,
            trigger_data: {
              experiment_id: experimentId,
              winner_variant: winner,
              variant_a_score: experiment.variant_a_score,
              variant_b_score: experiment.variant_b_score,
            },
            decision_content: winnerVariant,
            impact_scope: experiment.category ? `category:${experiment.category}` : 'all_users',
            confidence_score: experiment.statistical_significance,
            auto_approved: experiment.statistical_significance >= 0.99, // Auto-approve doar dacă e foarte sigur
            status: experiment.statistical_significance >= 0.99 ? 'approved' : 'pending',
          })
          .select()
          .single();

        if (decisionError) {
          console.error(`[AUTO-OPTIMIZER][${requestId}] Decision insert error:`, decisionError);
        }

        // Actualizăm experimentul
        await supabase
          .from('yana_ab_experiments')
          .update({
            status: winner === 'a' ? 'winner_a' : 'winner_b',
            winner_auto_applied: experiment.statistical_significance >= 0.99,
            completed_at: new Date().toISOString(),
          })
          .eq('id', experimentId);

        result = {
          winner,
          winnerVariant,
          decision: decision?.id,
          autoApplied: experiment.statistical_significance >= 0.99,
        };
        break;
      }

      case 'generate_decision': {
        // Generează decizii de îmbunătățire bazate pe date
        const decisions: Array<Record<string, unknown>> = [];

        // 1. Verifică knowledge gaps critice
        const { data: criticalGaps } = await supabase
          .from('yana_knowledge_gaps')
          .select('*')
          .eq('severity', 'critical')
          .eq('resolved', false)
          .gte('frequency', 5);

        for (const gap of criticalGaps || []) {
          decisions.push({
            decision_type: 'knowledge_gap_fix',
            trigger_reason: `Critical knowledge gap detected: "${gap.question_pattern}" (${gap.frequency} occurrences)`,
            trigger_data: { gap_id: gap.id, category: gap.category },
            decision_content: {
              action: 'add_to_prompt',
              pattern: gap.question_pattern,
              suggested_response_template: `Pentru întrebări despre ${gap.category}, YANA trebuie să...`,
            },
            impact_scope: `category:${gap.category}`,
            confidence_score: 0.7,
          });
        }

        // 2. Verifică răspunsuri cu scor mic de satisfacție
        const { data: lowSatisfaction } = await supabase
          .from('yana_learning_log')
          .select('*')
          .eq('user_satisfied', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if ((lowSatisfaction?.length || 0) >= 10) {
          // Pattern de insatisfacție - propunem ajustare ton
          decisions.push({
            decision_type: 'tone_adjustment',
            trigger_reason: `High dissatisfaction rate: ${lowSatisfaction?.length} negative signals in recent conversations`,
            trigger_data: { count: lowSatisfaction?.length },
            decision_content: {
              action: 'adjust_empathy_level',
              direction: 'increase',
              suggested_phrases: ['Înțeleg că e frustrant...', 'Hai să încercăm altfel...'],
            },
            impact_scope: 'all_users',
            confidence_score: 0.6,
          });
        }

        // 3. Verifică trending topics fără răspunsuri optimizate
        const { data: trendingWithoutOptimal } = await supabase
          .from('yana_trending_topics')
          .select('*')
          .eq('is_trending', true)
          .order('mention_count', { ascending: false })
          .limit(5);

        for (const topic of trendingWithoutOptimal || []) {
          // Verifică dacă avem răspuns eficient pentru acest topic
          const { data: effectiveResponse } = await supabase
            .from('yana_effective_responses')
            .select('id')
            .eq('context_type', topic.topic_category)
            .gte('effectiveness_score', 0.7)
            .limit(1);

          if (!effectiveResponse || effectiveResponse.length === 0) {
            decisions.push({
              decision_type: 'response_template_needed',
              trigger_reason: `Trending topic "${topic.topic}" lacks optimized response template`,
              trigger_data: { topic_id: topic.id, mentions: topic.mention_count },
              decision_content: {
                action: 'create_response_template',
                topic: topic.topic,
                category: topic.topic_category,
              },
              impact_scope: `category:${topic.topic_category}`,
              confidence_score: 0.65,
            });
          }
        }

        // Inserăm toate deciziile
        if (decisions.length > 0) {
          const { error: insertError } = await supabase
            .from('yana_improvement_decisions')
            .insert(decisions);

          if (insertError) {
            console.error(`[AUTO-OPTIMIZER][${requestId}] Decisions insert error:`, insertError);
          }
        }

        result = { generatedDecisions: decisions.length, decisions };
        break;
      }

      case 'track_context': {
        if (!userId) {
          throw new Error("userId is required for track_context");
        }

        // Folosim funcția PostgreSQL pentru tracking
        const { error: trackError } = await supabase.rpc('track_user_context_evolution', {
          p_user_id: userId,
          p_satisfaction_score: satisfactionScore || null,
          p_topics: topics || null,
          p_response_style: responseStyle || null,
        });

        if (trackError) {
          console.error(`[AUTO-OPTIMIZER][${requestId}] Track context error:`, trackError);
          throw trackError;
        }

        // Obținem ultimul snapshot
        const { data: latestSnapshot } = await supabase
          .from('yana_user_context_evolution')
          .select('*')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();

        result = { tracked: true, snapshot: latestSnapshot };
        break;
      }

      default:
        throw new Error(`Unknown optimization type: ${type}`);
    }

    console.log(`[AUTO-OPTIMIZER][${requestId}] ✅ Optimization complete: ${type}`);

    return new Response(
      JSON.stringify({ success: true, type, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[AUTO-OPTIMIZER][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
