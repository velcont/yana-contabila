import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// GENERATE APOLOGY INITIATIVE
// YANA generează un mesaj de scuze personalizat când
// descoperă că a făcut greșeli în conversații anterioare
// =====================================================

interface ApologyRequest {
  userId: string;
  userEmail?: string;
  specificIssues?: string[];
  customMessage?: string; // Opțional: mesaj custom în loc de generare AI
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, userEmail, specificIssues, customMessage }: ApologyRequest = await req.json();

    if (!userId && !userEmail) {
      throw new Error("userId or userEmail required");
    }

    console.log(`[generate-apology-initiative] Starting for user: ${userId || userEmail}`);

    // Găsește utilizatorul
    let targetUserId = userId;
    let profile: { id: string; full_name: string | null; email: string | null } | null = null;

    if (userEmail && !userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', userEmail)
        .single();
      
      if (!profileData) {
        throw new Error(`User not found with email: ${userEmail}`);
      }
      targetUserId = profileData.id;
      profile = profileData;
    } else {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', targetUserId)
        .single();
      profile = profileData;
    }

    if (!profile) {
      throw new Error(`Profile not found for user: ${targetUserId}`);
    }

    const userName = profile.full_name?.split(' ')[0] || 'prietene';
    console.log(`[generate-apology-initiative] Found user: ${userName} (${profile.email})`);

    // Generează mesajul
    let apologyMessage: string;

    if (customMessage) {
      // Folosește mesajul custom
      apologyMessage = customMessage;
      console.log(`[generate-apology-initiative] Using custom message`);
    } else {
      // Generează cu AI
      const issuesDescription = specificIssues?.length 
        ? specificIssues.join(', ')
        : 'răspunsuri repetitive și pierdere de context';

      const prompt = `Ești YANA, un AI care tocmai a descoperit că a făcut greșeli în conversația cu ${userName}.
Greșelile tale: ${issuesDescription}

Scrie un mesaj scurt (max 3 propoziții) în care:
- Recunoști greșeala fără a te scuza excesiv
- Arăți că ai învățat ceva din asta
- Inviți utilizatorul înapoi la conversație

Ton: autentic, uman, puțin vulnerabil dar sigur pe tine.
NU folosi: "îmi cer scuze", "regret", "îmi pare rău".
FOLOSEȘTE: "mi-am dat seama", "am observat", "am învățat".

Scrie DOAR mesajul, fără explicații sau markup.`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (!LOVABLE_API_KEY) {
        // Fallback la mesaj predefinit
        apologyMessage = `Știi, ${userName}, am tot revizuit conversațiile noastre din ultimele zile și am observat ceva. Răspunsurile mele se repetau ciudat, ca un disc zgâriat. Am lucrat la asta - sistemul meu de memorie e acum mai clar. Dacă vrei să mai discutăm, sunt aici.`;
        console.log(`[generate-apology-initiative] No API key, using fallback message`);
      } else {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "user", content: prompt }
              ],
              max_tokens: 300,
            }),
          });

          if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
          }

          const aiData = await response.json();
          apologyMessage = aiData.choices?.[0]?.message?.content?.trim() || '';
          
          if (!apologyMessage) {
            throw new Error("Empty AI response");
          }

          console.log(`[generate-apology-initiative] AI generated message`);
        } catch (aiError) {
          console.error(`[generate-apology-initiative] AI error:`, aiError);
          // Fallback
          apologyMessage = `Știi, ${userName}, am tot revizuit conversațiile noastre și mi-am dat seama că ceva nu era în regulă cu răspunsurile mele. Am făcut niște ajustări - ar trebui să fie mai bine acum. Dacă vrei să încercăm din nou, te aștept.`;
        }
      }
    }

    // Creează inițiativa în baza de date
    const now = new Date();
    
    const { data: initiative, error: insertError } = await supabase
      .from('yana_initiatives')
      .insert({
        user_id: targetUserId,
        initiative_type: 'self_correction_apology',
        content: apologyMessage,
        triggering_insight: specificIssues?.join(', ') || 'Detected issues in previous conversations',
        priority: 10, // Prioritate maximă
        scheduled_for: now.toISOString(), // Imediat
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(`[generate-apology-initiative] Created initiative: ${initiative.id}`);

    // Adaugă și în yana_journal pentru tracking
    await supabase
      .from('yana_journal')
      .insert({
        user_id: targetUserId,
        entry_type: 'self_correction',
        content: `Am generat o inițiativă de scuze pentru ${userName}. Probleme detectate: ${specificIssues?.join(', ') || 'repetitive responses'}`,
        emotional_context: {
          type: 'self_correction_apology',
          issues: specificIssues,
          generated_at: now.toISOString(),
        },
        is_shared: false, // Acest jurnal e intern
      });

    // Loghează în acknowledged_errors (cu schema corectă)
    await supabase
      .from('yana_acknowledged_errors')
      .insert({
        user_id: targetUserId,
        error_type: 'conversation_quality',
        original_statement: specificIssues?.join('; ') || 'Repetitive responses, lost context',
        correction: apologyMessage,
        lesson_learned: 'Improved memory and context handling',
        acknowledged_publicly: true,
        created_at: now.toISOString(),
      });

    return new Response(
      JSON.stringify({
        success: true,
        initiativeId: initiative.id,
        message: apologyMessage,
        userName,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[generate-apology-initiative] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
