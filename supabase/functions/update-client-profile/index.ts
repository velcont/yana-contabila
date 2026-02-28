import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileUpdateRequest {
  userId: string;
  conversationId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[UPDATE-CLIENT-PROFILE][${requestId}] Starting profile consolidation`);

  try {
    const { userId }: ProfileUpdateRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch last 20 learning log entries
    const { data: learningLogs } = await supabase
      .from('yana_learning_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 2. Fetch latest context evolution
    const { data: contextEvolution } = await supabase
      .from('yana_user_context_evolution')
      .select('*')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })
      .limit(5);

    // 3. Fetch relationship data
    const { data: relationship } = await supabase
      .from('yana_relationships')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 4. Fetch existing profile
    const { data: existingProfile } = await supabase
      .from('yana_client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 5. Analyze patterns from learning logs
    const logs = learningLogs || [];
    
    // Detect language complexity from preferences
    let languageComplexity = existingProfile?.language_complexity || 'moderate';
    const wantsSimpler = logs.filter(l => l.user_preferences?.wantsSimpler).length;
    const wantsDetails = logs.filter(l => l.user_preferences?.wantsDetails).length;
    
    if (wantsSimpler > wantsDetails + 2) {
      languageComplexity = 'simple';
    } else if (wantsDetails > wantsSimpler + 2) {
      languageComplexity = 'technical';
    }

    // Detect communication style
    let communicationStyle = existingProfile?.communication_style || 'conversational';
    const wantsVisual = logs.filter(l => l.user_preferences?.prefersVisual).length;
    const isUrgent = logs.filter(l => l.user_preferences?.isUrgent).length;
    
    if (isUrgent > 3) {
      communicationStyle = 'direct';
    } else if (wantsDetails > 3) {
      communicationStyle = 'detailed';
    }

    // Extract recurring problems from categories
    const categoryCounts: Record<string, number> = {};
    const unresolvedTopics: string[] = [];
    
    for (const log of logs) {
      // Count categories from new_questions
      if (log.new_questions && Array.isArray(log.new_questions)) {
        for (const q of log.new_questions) {
          const lower = (q as string).toLowerCase();
          if (lower.includes('tva')) categoryCounts['TVA'] = (categoryCounts['TVA'] || 0) + 1;
          if (lower.includes('cash') || lower.includes('lichiditate')) categoryCounts['Cash Flow'] = (categoryCounts['Cash Flow'] || 0) + 1;
          if (lower.includes('profit') || lower.includes('pierdere')) categoryCounts['Profitabilitate'] = (categoryCounts['Profitabilitate'] || 0) + 1;
          if (lower.includes('impozit') || lower.includes('fiscal')) categoryCounts['Fiscal'] = (categoryCounts['Fiscal'] || 0) + 1;
          if (lower.includes('salar') || lower.includes('angajat')) categoryCounts['Salarii'] = (categoryCounts['Salarii'] || 0) + 1;
          if (lower.includes('stoc') || lower.includes('inventar')) categoryCounts['Stocuri'] = (categoryCounts['Stocuri'] || 0) + 1;
          if (lower.includes('client') || lower.includes('crean')) categoryCounts['Creanțe'] = (categoryCounts['Creanțe'] || 0) + 1;
          if (lower.includes('furnizor') || lower.includes('dator')) categoryCounts['Datorii'] = (categoryCounts['Datorii'] || 0) + 1;
        }
      }
      
      // Track unresolved
      if (log.unresolved_signals && Array.isArray(log.unresolved_signals) && log.unresolved_signals.length > 0) {
        unresolvedTopics.push(...(log.unresolved_signals as string[]));
      }
    }

    const recurringProblems = Object.entries(categoryCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count, lastSeen: new Date().toISOString() }));

    // Extract preferred topics
    const preferredTopics = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    // Detect business domain from relationship and logs
    let businessDomain = existingProfile?.business_domain || null;
    if (!businessDomain && relationship?.emotional_memory) {
      const emotionalMemory = relationship.emotional_memory as any;
      if (emotionalMemory?.company_context) {
        businessDomain = emotionalMemory.company_context;
      }
    }

    // Calculate interaction patterns
    const interactionHours: number[] = [];
    const interactionDays: number[] = [];
    
    for (const log of logs) {
      if (log.created_at) {
        const date = new Date(log.created_at);
        interactionHours.push(date.getHours());
        interactionDays.push(date.getDay());
      }
    }

    const avgHour = interactionHours.length > 0 
      ? Math.round(interactionHours.reduce((a, b) => a + b, 0) / interactionHours.length)
      : null;
    
    const mostActiveDay = interactionDays.length > 0
      ? getMostFrequent(interactionDays)
      : null;

    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

    const interactionPatterns = {
      usual_hour: avgHour,
      usual_time: avgHour !== null ? `${avgHour}:00` : null,
      most_active_day: mostActiveDay !== null ? dayNames[mostActiveDay] : null,
      total_interactions: relationship?.total_conversations || logs.length,
      avg_satisfaction: logs.filter(l => l.engagement_score).length > 0
        ? (logs.reduce((sum, l) => sum + (l.engagement_score || 0), 0) / logs.filter(l => l.engagement_score).length).toFixed(2)
        : null,
    };

    // Build anticipation triggers
    const anticipationTriggers = existingProfile?.anticipation_triggers || [];
    
    // Detect monthly patterns (e.g., TVA questions around same dates)
    if (categoryCounts['TVA'] && categoryCounts['TVA'] >= 3) {
      const hasTVATrigger = (anticipationTriggers as any[]).some((t: any) => t.type === 'monthly_tva');
      if (!hasTVATrigger) {
        (anticipationTriggers as any[]).push({
          type: 'monthly_tva',
          description: 'Utilizatorul întreabă frecvent despre TVA - menționează proactiv termenele',
          created_at: new Date().toISOString(),
        });
      }
    }
    
    if (categoryCounts['Cash Flow'] && categoryCounts['Cash Flow'] >= 3) {
      const hasCashTrigger = (anticipationTriggers as any[]).some((t: any) => t.type === 'recurring_cashflow');
      if (!hasCashTrigger) {
        (anticipationTriggers as any[]).push({
          type: 'recurring_cashflow',
          description: 'Probleme recurente de cash flow - amintește la fiecare conversație dacă e natural',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Synthesize personality notes using AI (minimal call)
    let personalityNotes = existingProfile?.personality_notes || null;
    
    if (logs.length >= 5 && !personalityNotes) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const sampleMessages = logs
            .filter(l => l.new_questions && (l.new_questions as string[]).length > 0)
            .slice(0, 5)
            .map(l => (l.new_questions as string[])[0])
            .join('\n');

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: "Ești un analist de comportament. Primești mesaje ale unui utilizator și trebuie să descrii în 2-3 propoziții scurte stilul său de comunicare, preferințele și trăsăturile observabile. Răspunde DOAR cu observațiile, fără introduceri. Limba: română."
                },
                {
                  role: "user",
                  content: `Analizează aceste mesaje ale utilizatorului și descrie stilul său:\n\n${sampleMessages}`
                }
              ],
              max_tokens: 150,
            }),
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            personalityNotes = aiResult.choices?.[0]?.message?.content?.trim() || null;
            console.log(`[UPDATE-CLIENT-PROFILE][${requestId}] AI personality notes generated`);
          }
        }
      } catch (err) {
        console.warn(`[UPDATE-CLIENT-PROFILE][${requestId}] AI personality notes failed:`, err);
      }
    }

    // Get company size from context evolution
    let companySize = existingProfile?.company_size || 'unknown';
    if (contextEvolution && contextEvolution.length > 0) {
      const latestCtx = contextEvolution[0];
      if (latestCtx.user_type === 'power_user') {
        companySize = 'mediu'; // Power users tend to be from medium companies
      }
    }

    // 6. Upsert profile
    const profileData = {
      user_id: userId,
      business_domain: businessDomain,
      company_size: companySize,
      language_complexity: languageComplexity,
      communication_style: communicationStyle,
      recurring_problems: recurringProblems,
      learned_corrections: existingProfile?.learned_corrections || [],
      anticipation_triggers: anticipationTriggers,
      preferred_topics: preferredTopics,
      personality_notes: personalityNotes,
      interaction_patterns: interactionPatterns,
      last_profile_update: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('yana_client_profiles')
      .upsert(profileData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error(`[UPDATE-CLIENT-PROFILE][${requestId}] Upsert error:`, upsertError);
      throw upsertError;
    }

    console.log(`[UPDATE-CLIENT-PROFILE][${requestId}] ✅ Profile updated for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          languageComplexity,
          communicationStyle,
          recurringProblems: recurringProblems.length,
          preferredTopics,
          hasPersonalityNotes: !!personalityNotes,
          interactionPatterns,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[UPDATE-CLIENT-PROFILE][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getMostFrequent(arr: number[]): number {
  const counts: Record<number, number> = {};
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}
