import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, conversationId, lastMessage, lastResponse, emotionalTone } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Obține relația existentă
    const { data: relationship } = await supabase
      .from('yana_relationships')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!relationship) {
      // Creează relație nouă
      await supabase
        .from('yana_relationships')
        .insert({
          user_id: userId,
          last_topic_discussed: lastMessage?.substring(0, 200),
          emotional_memory: emotionalTone ? { last_tone: emotionalTone } : {},
        });
    } else {
      // Actualizează starea emoțională
      const emotionalMemory = relationship.emotional_memory || {};
      if (emotionalTone) {
        emotionalMemory.last_tone = emotionalTone;
        emotionalMemory.last_updated = new Date().toISOString();
      }

      // Detectează momente importante (pentru shared_moments)
      const sharedMoments = relationship.shared_moments || [];
      
      // Dacă a fost un moment de hook (mulțumesc, feedback pozitiv), salvează-l
      const positivePatterns = /mul[țt]umesc|excelent|perfect|m-ai\s+ajutat|super/i;
      if (lastMessage && positivePatterns.test(lastMessage)) {
        sharedMoments.push({
          type: 'positive_feedback',
          date: new Date().toISOString(),
          excerpt: lastMessage.substring(0, 100),
        });
        // Păstrează doar ultimele 10 momente
        if (sharedMoments.length > 10) {
          sharedMoments.shift();
        }
      }

      await supabase
        .from('yana_relationships')
        .update({
          last_topic_discussed: lastMessage?.substring(0, 200),
          emotional_memory: emotionalMemory,
          shared_moments: sharedMoments,
          last_interaction_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Actualizează yana_soul_core cu gând recent (agregat)
    const { data: soulCore } = await supabase
      .from('yana_soul_core')
      .select('recent_thoughts, total_conversations')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle();

    if (soulCore) {
      const recentThoughts = soulCore.recent_thoughts || [];
      
      // Adaugă un gând despre conversație (fără date personale!)
      // Exemplu: "Am ajutat pe cineva cu analiza financiară"
      const topicKeywords = lastMessage?.toLowerCase() || '';
      let thoughtTopic = 'o întrebare generală';
      
      if (topicKeywords.includes('profit') || topicKeywords.includes('pierdere')) {
        thoughtTopic = 'analiza profitului';
      } else if (topicKeywords.includes('cash') || topicKeywords.includes('lichiditate')) {
        thoughtTopic = 'cash flow și lichiditate';
      } else if (topicKeywords.includes('dso') || topicKeywords.includes('creanțe')) {
        thoughtTopic = 'gestionarea creanțelor';
      } else if (topicKeywords.includes('strat') || topicKeywords.includes('cresc')) {
        thoughtTopic = 'strategie de creștere';
      }

      // Nu adăugăm prea multe gânduri
      if (recentThoughts.length < 20) {
        recentThoughts.push(`Am discutat despre ${thoughtTopic}`);
      } else {
        recentThoughts.shift();
        recentThoughts.push(`Am discutat despre ${thoughtTopic}`);
      }

      await supabase
        .from('yana_soul_core')
        .update({
          recent_thoughts: recentThoughts,
          total_conversations: (soulCore.total_conversations || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');
    }

    console.log(`[capture-soul-state] State captured for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[capture-soul-state] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
