import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SurpriseDetectorRequest {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
}

interface DetectedSurprise {
  previousBelief: string;
  newInformation: string;
  contradictionType: 'data_conflict' | 'assumption_wrong' | 'context_shift' | 'emotional_shift' | 'goal_change' | 'unexpected_success';
  intensity: number;
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, conversationId, userMessage, assistantResponse }: SurpriseDetectorRequest = await req.json();
    
    if (!userId || !userMessage) {
      throw new Error("Missing required fields");
    }

    console.log(`[Surprise-Detector] Analyzing for user ${userId.substring(0, 8)}...`);

    // =============================================================================
    // RATE LIMITING: Max 1 detecție la fiecare 5 mesaje
    // =============================================================================
    
    const { count } = await supabase
      .from('ai_surprises')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Ultimele 10 minute
    
    if ((count || 0) >= 2) {
      console.log(`[Surprise-Detector] Rate limited: ${count} detections in last 10 minutes`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'rate_limited' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================================================
    // FETCH USER JOURNEY pentru context
    // =============================================================================
    
    const { data: journey } = await supabase
      .from('user_journey')
      .select('primary_goal, knowledge_gaps, emotional_state')
      .eq('user_id', userId)
      .single();

    // =============================================================================
    // FETCH RECENT CONVERSATIONS pentru a detecta contradicții
    // =============================================================================
    
    const { data: recentConversations } = await supabase
      .from('ai_conversations')
      .select('question, answer, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const conversationContext = recentConversations?.map(c => 
      `Q: ${c.question.substring(0, 200)}\nA: ${c.answer.substring(0, 300)}`
    ).join('\n---\n') || 'Fără istoric relevant';

    // =============================================================================
    // DETECȚIE CONTRADICȚII CU AI
    // =============================================================================
    
    if (!lovableApiKey) {
      console.log('[Surprise-Detector] No Lovable API key, skipping AI detection');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_api_key' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detectionPrompt = `Ești un detector de contradicții și surprize în conversații business.

CONTEXT UTILIZATOR:
- Obiectiv principal: ${journey?.primary_goal || 'Necunoscut'}
- Stare emoțională: ${journey?.emotional_state || 'Neutră'}
- Lacune cunoaștere: ${JSON.stringify(journey?.knowledge_gaps || [])}

CONVERSAȚII ANTERIOARE:
${conversationContext}

MESAJ CURENT DE LA UTILIZATOR:
"${userMessage}"

RĂSPUNSUL YANA:
"${assistantResponse.substring(0, 500)}"

ANALIZEAZĂ dacă mesajul utilizatorului conține SURPRIZE sau CONTRADICȚII față de:
1. Ce știam despre utilizator din conversații anterioare
2. Ce presupuneam despre situația lui
3. Schimbări emoționale sau de context

TIPURI DE CONTRADICȚII:
- data_conflict: Cifre noi contrazic date anterioare
- assumption_wrong: Presupunerile noastre erau greșite
- context_shift: Situația s-a schimbat semnificativ
- emotional_shift: Starea emoțională s-a schimbat
- goal_change: Obiectivele utilizatorului s-au schimbat
- unexpected_success: Succes neașteptat

RĂSPUNDE în format JSON STRICT:
{
  "hasSurprise": true/false,
  "surprises": [
    {
      "previousBelief": "Ce credeam înainte",
      "newInformation": "Ce am aflat acum",
      "contradictionType": "tipul",
      "intensity": 1-10
    }
  ]
}

Dacă NU există contradicții semnificative, returnează:
{"hasSurprise": false, "surprises": []}

IMPORTANT: Detectează doar surprize REALE și SEMNIFICATIVE, nu variații minore.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: detectionPrompt }],
        max_tokens: 500,
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Surprise-Detector] AI API error:', errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const responseText = aiResult.choices?.[0]?.message?.content || '';
    
    // Parse JSON din răspuns
    let detection: { hasSurprise: boolean; surprises: DetectedSurprise[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        detection = JSON.parse(jsonMatch[0]);
      } else {
        detection = { hasSurprise: false, surprises: [] };
      }
    } catch {
      console.error('[Surprise-Detector] Failed to parse AI response:', responseText);
      detection = { hasSurprise: false, surprises: [] };
    }

    // =============================================================================
    // SALVARE SURPRIZE DETECTATE
    // =============================================================================
    
    let savedCount = 0;
    if (detection.hasSurprise && detection.surprises.length > 0) {
      for (const surprise of detection.surprises) {
        if (surprise.intensity >= 4) { // Doar surprize semnificative
          const { error } = await supabase
            .from('ai_surprises')
            .insert({
              user_id: userId,
              conversation_id: conversationId,
              previous_belief: surprise.previousBelief,
              new_information: surprise.newInformation,
              contradiction_type: surprise.contradictionType,
              surprise_intensity: surprise.intensity,
              resolution_status: 'pending'
            });
          
          if (!error) savedCount++;
        }
      }
      
      console.log(`[Surprise-Detector] Saved ${savedCount} surprises for user ${userId.substring(0, 8)}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Surprise-Detector] Completed in ${processingTime}ms, detected: ${detection.surprises.length}, saved: ${savedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        detected: detection.surprises.length,
        saved: savedCount,
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Surprise-Detector] Error after ${processingTime}ms:`, error);
    
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
