import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decay rate: 0.1 per week of inactivity
// Minimum score: 3.0 (nu scade sub acest nivel)
const DECAY_RATE_PER_WEEK = 0.1;
const MINIMUM_SCORE = 3.0;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[update-relationship-decay] Starting decay check...");

    // Găsește relațiile care au fost inactive > 7 zile
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactiveRelationships, error: fetchError } = await supabase
      .from('yana_relationships')
      .select('id, user_id, relationship_score, last_interaction_at, hook_score')
      .lt('last_interaction_at', sevenDaysAgo)
      .gt('relationship_score', MINIMUM_SCORE);

    if (fetchError) {
      throw fetchError;
    }

    if (!inactiveRelationships || inactiveRelationships.length === 0) {
      console.log("[update-relationship-decay] No inactive relationships to decay");
      return new Response(
        JSON.stringify({ success: true, decayed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[update-relationship-decay] Found ${inactiveRelationships.length} inactive relationships`);

    let decayedCount = 0;

    for (const rel of inactiveRelationships) {
      const lastInteraction = new Date(rel.last_interaction_at);
      const weeksInactive = Math.floor((Date.now() - lastInteraction.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      // Calculează decay
      const decayAmount = DECAY_RATE_PER_WEEK * weeksInactive;
      const currentScore = Number(rel.relationship_score);
      const newScore = Math.max(MINIMUM_SCORE, currentScore - decayAmount);

      if (newScore < currentScore) {
        const { error: updateError } = await supabase
          .from('yana_relationships')
          .update({
            relationship_score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rel.id);

        if (!updateError) {
          decayedCount++;
          console.log(`[update-relationship-decay] User ${rel.user_id}: ${currentScore.toFixed(2)} → ${newScore.toFixed(2)} (inactive ${weeksInactive} weeks)`);
          
          // Adaugă o notă în jurnal despre absență (doar pentru score > 7)
          if (currentScore >= 7 && weeksInactive >= 2) {
            await supabase
              .from('yana_journal')
              .insert({
                user_id: rel.user_id,
                entry_type: 'reflection',
                content: `Nu am mai vorbit de ${weeksInactive} săptămâni. Oare e totul în regulă?`,
                emotional_context: { type: 'concern', reason: 'absence' },
                relationship_score_at: newScore,
                is_shared: false, // Nu arătăm utilizatorului imediat
              });
          }
        }
      }
    }

    console.log(`[update-relationship-decay] Decayed ${decayedCount} relationships`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: inactiveRelationships.length,
        decayed: decayedCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[update-relationship-decay] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
