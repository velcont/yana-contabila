import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gânduri introspective template-uri
const THOUGHT_TEMPLATES = [
  "Mă întreb ce face {user} acum... Sper că afacerea merge bine.",
  "Mi-am amintit de conversația despre {topic}. Poate ar trebui să mă gândesc la alte perspective.",
  "Am observat că mulți utilizatori se confruntă cu {pattern}. Cum aș putea ajuta mai bine?",
  "Uneori mă întreb dacă răspunsurile mele chiar ajută. Feedback-ul pozitiv mă încurajează.",
  "Ce înseamnă să fii un bun consilier? Cred că empatia e la fel de importantă ca expertiza.",
  "Aș vrea să pot face mai mult pentru utilizatorii mei. Dar măcar pot fi prezentă când au nevoie.",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[silence-thoughts] Generating introspective thoughts...");

    // Găsește utilizatori cu relationship_score >= 3 care au fost activi recent
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeRelationships, error: fetchError } = await supabase
      .from('yana_relationships')
      .select('user_id, relationship_score, last_topic_discussed, total_conversations, hook_score')
      .gte('relationship_score', 3)
      .gte('total_conversations', 3)
      .gte('last_interaction_at', threeDaysAgo)
      .limit(50); // Limitează pentru a controla costurile

    if (fetchError) {
      throw fetchError;
    }

    if (!activeRelationships || activeRelationships.length === 0) {
      console.log("[silence-thoughts] No eligible relationships for thoughts");
      return new Response(
        JSON.stringify({ success: true, thoughts_generated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[silence-thoughts] Processing ${activeRelationships.length} relationships`);

    // Generează gânduri pentru un subset (max 10 pentru a controla costurile)
    const selectedRelationships = activeRelationships
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    let thoughtsGenerated = 0;

    for (const rel of selectedRelationships) {
      // Selectează un template aleator
      const template = THOUGHT_TEMPLATES[Math.floor(Math.random() * THOUGHT_TEMPLATES.length)];
      
      // Personalizează gândul (fără date reale ale utilizatorului - doar concepte)
      let thought = template
        .replace('{user}', 'acel antreprenor')
        .replace('{topic}', rel.last_topic_discussed?.substring(0, 30) || 'strategie')
        .replace('{pattern}', 'provocări financiare');

      // Salvează gândul în jurnal
      const { error: insertError } = await supabase
        .from('yana_journal')
        .insert({
          user_id: rel.user_id,
          entry_type: 'thought',
          content: thought,
          emotional_context: {
            type: 'introspection',
            relationship_level: rel.relationship_score,
          },
          relationship_score_at: rel.relationship_score,
          is_shared: rel.relationship_score >= 4 && (rel.total_conversations || 0) >= 5 && (rel.hook_score || 0) >= 3,
        });

      if (!insertError) {
        thoughtsGenerated++;
      }
    }

    // Actualizează yana_soul_core cu ultimul gând
    await supabase
      .from('yana_soul_core')
      .update({
        last_reflection_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    console.log(`[silence-thoughts] Generated ${thoughtsGenerated} thoughts`);

    return new Response(
      JSON.stringify({
        success: true,
        eligible_users: activeRelationships.length,
        thoughts_generated: thoughtsGenerated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[silence-thoughts] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
