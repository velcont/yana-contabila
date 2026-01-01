import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExperimentTrackerRequest {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
}

interface DetectedExperiment {
  experimentType: 'suggested_action' | 'asked_question' | 'challenged_assumption' | 'showed_emotion' | 'proactive_insight' | 'risk_warning';
  hypothesis: string;
  actionTaken: string;
}

// =============================================================================
// MAIN HANDLER
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

    const { userId, conversationId, userMessage, assistantResponse }: ExperimentTrackerRequest = await req.json();
    
    if (!userId || !assistantResponse) {
      throw new Error("Missing required fields");
    }

    console.log(`[Experiment-Tracker] Analyzing for user ${userId.substring(0, 8)}...`);

    // =============================================================================
    // RATE LIMITING: Max 1 tracking la fiecare 10 mesaje
    // =============================================================================
    
    const { count } = await supabase
      .from('ai_experiments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Ultimele 15 minute
    
    if ((count || 0) >= 3) {
      console.log(`[Experiment-Tracker] Rate limited: ${count} experiments in last 15 minutes`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'rate_limited' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================================================
    // EVALUATE PENDING EXPERIMENTS
    // =============================================================================
    
    // Verifică dacă avem experimente pending care pot fi evaluate
    const { data: pendingExperiments } = await supabase
      .from('ai_experiments')
      .select('id, action_taken, hypothesis')
      .eq('user_id', userId)
      .eq('outcome', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    // Evaluăm experimentele pe baza răspunsului utilizatorului
    if (pendingExperiments && pendingExperiments.length > 0) {
      const lowerUserMessage = userMessage.toLowerCase();
      
      for (const exp of pendingExperiments) {
        let outcome: 'success' | 'partial' | 'failed' | null = null;
        let userReaction = '';
        let emotionalResonance: number | null = null;
        
        // Indicatori de succes
        const successIndicators = ['mulțumesc', 'perfect', 'exact', 'da', 'corect', 'bun', 'super', 'excelent', 'ajutat', 'înțeleg', 'clar'];
        const partialIndicators = ['poate', 'nu sunt sigur', 'parțial', 'cumva', 'oarecum'];
        const failIndicators = ['nu', 'greșit', 'altceva', 'nu asta', 'nu înțeleg', 'confuz'];
        
        if (successIndicators.some(ind => lowerUserMessage.includes(ind))) {
          outcome = 'success';
          userReaction = 'Răspuns pozitiv';
          emotionalResonance = 8;
        } else if (failIndicators.some(ind => lowerUserMessage.includes(ind))) {
          outcome = 'failed';
          userReaction = 'Răspuns negativ';
          emotionalResonance = 3;
        } else if (partialIndicators.some(ind => lowerUserMessage.includes(ind))) {
          outcome = 'partial';
          userReaction = 'Răspuns parțial';
          emotionalResonance = 5;
        }
        
        // Update doar dacă am determinat un outcome
        if (outcome) {
          await supabase
            .from('ai_experiments')
            .update({
              outcome,
              user_reaction: userReaction,
              emotional_resonance: emotionalResonance,
              evaluated_at: new Date().toISOString(),
              learning: outcome === 'success' 
                ? 'Abordarea a funcționat, poate fi repetată' 
                : outcome === 'failed'
                ? 'Abordarea nu a funcționat, evită în viitor'
                : 'Rezultat mixt, necesită ajustare'
            })
            .eq('id', exp.id);
          
          console.log(`[Experiment-Tracker] Updated experiment ${exp.id} with outcome: ${outcome}`);
        }
      }
    }

    // =============================================================================
    // DETECT NEW EXPERIMENTS IN ASSISTANT RESPONSE
    // =============================================================================
    
    if (!openRouterKey) {
      console.log('[Experiment-Tracker] No OpenRouter key, skipping AI detection');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_api_key' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detectionPrompt = `Ești un analizator de comportament AI. Detectează ce "experimente" a încercat YANA în răspunsul ei.

RĂSPUNSUL YANA:
"${assistantResponse.substring(0, 1000)}"

UN "EXPERIMENT" este când YANA:
1. **suggested_action** - A sugerat o acțiune concretă utilizatorului
2. **asked_question** - A pus o întrebare exploratorie pentru a afla mai mult
3. **challenged_assumption** - A provocat o presupunere a utilizatorului
4. **showed_emotion** - A arătat explicit emoție (bucurie, îngrijorare, empatie)
5. **proactive_insight** - A oferit un insight proactiv fără să i se ceară
6. **risk_warning** - A avertizat despre un risc potențial

RĂSPUNDE în format JSON STRICT:
{
  "experiments": [
    {
      "experimentType": "tipul",
      "hypothesis": "Ce a vrut YANA să afle/obțină",
      "actionTaken": "Ce a făcut efectiv (max 100 caractere)"
    }
  ]
}

Detectează MAXIMUM 2 experimente cele mai semnificative.
Dacă nu există experimente clare, returnează: {"experiments": []}`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yana.ro',
        'X-Title': 'YANA Experiment Tracker'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [{ role: 'user', content: detectionPrompt }],
        max_tokens: 400,
        temperature: 0.2
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Experiment-Tracker] AI API error:', errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const responseText = aiResult.choices?.[0]?.message?.content || '';
    
    // Parse JSON din răspuns
    let detection: { experiments: DetectedExperiment[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        detection = JSON.parse(jsonMatch[0]);
      } else {
        detection = { experiments: [] };
      }
    } catch {
      console.error('[Experiment-Tracker] Failed to parse AI response:', responseText);
      detection = { experiments: [] };
    }

    // =============================================================================
    // SALVARE EXPERIMENTE NOI
    // =============================================================================
    
    let savedCount = 0;
    if (detection.experiments && detection.experiments.length > 0) {
      for (const exp of detection.experiments) {
        // Generează pattern anonimizat pentru cross-learning
        const anonymizedPattern = `${exp.experimentType}: ${exp.actionTaken.substring(0, 50)}`;
        
        const { error } = await supabase
          .from('ai_experiments')
          .insert({
            user_id: userId,
            conversation_id: conversationId,
            experiment_type: exp.experimentType,
            hypothesis: exp.hypothesis,
            action_taken: exp.actionTaken,
            outcome: 'pending',
            anonymized_pattern: anonymizedPattern
          });
        
        if (!error) savedCount++;
      }
      
      console.log(`[Experiment-Tracker] Saved ${savedCount} new experiments for user ${userId.substring(0, 8)}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Experiment-Tracker] Completed in ${processingTime}ms, detected: ${detection.experiments.length}, saved: ${savedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        detected: detection.experiments.length,
        saved: savedCount,
        evaluatedPending: pendingExperiments?.length || 0,
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Experiment-Tracker] Error after ${processingTime}ms:`, error);
    
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
