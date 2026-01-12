import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// YANA INITIATIVE SCHEDULER
// Procesează și trimite inițiativele proactive ale YANA
// Cu toate safeguards-urile implementate
// =====================================================

// Configurație safeguards
const CONFIG = {
  RATE_LIMIT_HOURS: 24,           // Max 1 inițiativă per user per 24h
  MIN_RELATIONSHIP_SCORE: 4,      // Eligibilitate minimă
  QUIET_HOURS_START: 22,          // 22:00
  QUIET_HOURS_END: 8,             // 08:00
  EXPIRY_DAYS: 7,                 // Expiră după 7 zile
  BATCH_SIZE: 50,                 // Procesează max 50 per run
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[yana-initiative-scheduler] Starting processing...");
    const now = new Date();

    // =====================================================
    // PASUL 0: Rulare cross-learner pentru insights zilnice
    // =====================================================
    try {
      const crossLearnerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/cross-learner`;
      const crossLearnerPromise = fetch(crossLearnerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ scheduled: true }),
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      
      await Promise.race([crossLearnerPromise, timeoutPromise]);
      console.log("[yana-initiative-scheduler] ✓ Cross-learner completed");
    } catch (err) {
      console.warn("[yana-initiative-scheduler] Cross-learner skipped:", err);
      // Nu oprim execuția - cross-learner e opțional
    }
    const stats = {
      processed: 0,
      sent: 0,
      cancelled: 0,
      expired: 0,
      skipped_quiet_hours: 0,
      skipped_rate_limit: 0,
      skipped_opt_out: 0,
      skipped_low_score: 0,
    };

    // =====================================================
    // PASUL 1: Marchează inițiativele expirate
    // =====================================================
    const expiryDate = new Date(now.getTime() - CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredInitiatives, error: expireError } = await supabase
      .from('yana_initiatives')
      .update({ 
        status: 'expired',
        cancelled_reason: 'Expired after 7 days without sending'
      })
      .eq('status', 'pending')
      .lt('created_at', expiryDate)
      .select('id');

    if (expireError) {
      console.error("[yana-initiative-scheduler] Error expiring initiatives:", expireError);
    } else {
      stats.expired = expiredInitiatives?.length || 0;
      if (stats.expired > 0) {
        console.log(`[yana-initiative-scheduler] Expired ${stats.expired} old initiatives`);
      }
    }

    // =====================================================
    // PASUL 2: Verifică quiet hours
    // =====================================================
    const currentHour = now.getHours();
    const isQuietHours = currentHour >= CONFIG.QUIET_HOURS_START || currentHour < CONFIG.QUIET_HOURS_END;
    
    if (isQuietHours) {
      console.log(`[yana-initiative-scheduler] Quiet hours active (${currentHour}:00). Skipping sends.`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Quiet hours - no initiatives sent",
          stats: { ...stats, skipped_quiet_hours: "all" },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // PASUL 3: Găsește inițiativele pending gata de trimitere
    // =====================================================
    const { data: pendingInitiatives, error: fetchError } = await supabase
      .from('yana_initiatives')
      .select(`
        id,
        user_id,
        initiative_type,
        content,
        triggering_insight,
        priority,
        scheduled_for,
        created_at
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(CONFIG.BATCH_SIZE);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingInitiatives || pendingInitiatives.length === 0) {
      console.log("[yana-initiative-scheduler] No pending initiatives to process");
      return new Response(
        JSON.stringify({ success: true, message: "No pending initiatives", stats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[yana-initiative-scheduler] Found ${pendingInitiatives.length} pending initiatives`);

    // =====================================================
    // PASUL 4: Procesează fiecare inițiativă cu safeguards
    // =====================================================
    for (const initiative of pendingInitiatives) {
      stats.processed++;

      // 4a. Verifică profilul utilizatorului (opt-out + relationship score)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name, yana_initiatives_opt_out')
        .eq('id', initiative.user_id)
        .single();

      if (profileError || !profile) {
        console.error(`[yana-initiative-scheduler] Profile not found for ${initiative.user_id}`);
        await cancelInitiative(supabase, initiative.id, 'Profile not found');
        stats.cancelled++;
        continue;
      }

      // 4b. Verifică opt-out
      if (profile.yana_initiatives_opt_out) {
        console.log(`[yana-initiative-scheduler] User ${initiative.user_id} opted out`);
        await cancelInitiative(supabase, initiative.id, 'User opted out');
        stats.skipped_opt_out++;
        stats.cancelled++;
        continue;
      }

      // 4c. Verifică relationship score
      const { data: relationship } = await supabase
        .from('yana_relationships')
        .select('relationship_score')
        .eq('user_id', initiative.user_id)
        .single();

      const relationshipScore = relationship?.relationship_score || 0;
      if (relationshipScore < CONFIG.MIN_RELATIONSHIP_SCORE) {
        console.log(`[yana-initiative-scheduler] User ${initiative.user_id} score too low (${relationshipScore})`);
        await cancelInitiative(supabase, initiative.id, `Relationship score ${relationshipScore} < ${CONFIG.MIN_RELATIONSHIP_SCORE}`);
        stats.skipped_low_score++;
        stats.cancelled++;
        continue;
      }

      // 4d. Verifică rate limiting (max 1 per 24h)
      const rateLimitDate = new Date(now.getTime() - CONFIG.RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recentSent, error: rateLimitError } = await supabase
        .from('yana_initiatives')
        .select('id')
        .eq('user_id', initiative.user_id)
        .eq('status', 'sent')
        .gte('sent_at', rateLimitDate)
        .limit(1);

      if (rateLimitError) {
        console.error(`[yana-initiative-scheduler] Rate limit check error:`, rateLimitError);
      }

      if (recentSent && recentSent.length > 0) {
        console.log(`[yana-initiative-scheduler] Rate limit hit for user ${initiative.user_id}`);
        // Nu anulăm, doar amânăm pentru mai târziu (reschedule)
        await supabase
          .from('yana_initiatives')
          .update({ 
            scheduled_for: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString() // +6h
          })
          .eq('id', initiative.id);
        stats.skipped_rate_limit++;
        continue;
      }

      // =====================================================
      // PASUL 5: Trimite inițiativa
      // =====================================================
      try {
        // Marchează ca trimisă
        const { error: updateError } = await supabase
          .from('yana_initiatives')
          .update({
            status: 'sent',
            sent_at: now.toISOString(),
          })
          .eq('id', initiative.id);

        if (updateError) throw updateError;

        // Adaugă în jurnalul YANA (pentru afișare în UI)
        await supabase
          .from('yana_journal')
          .insert({
            user_id: initiative.user_id,
            entry_type: 'initiative',
            content: initiative.content,
            emotional_context: {
              type: initiative.initiative_type,
              triggering_insight: initiative.triggering_insight,
            },
            is_shared: true, // Vizibil pentru utilizator
          });

        // Log în email_logs pentru tracking
        await supabase
          .from('email_logs')
          .insert({
            user_id: initiative.user_id,
            email_type: 'yana_initiative',
            recipient_email: profile.email,
            subject: getInitiativeSubject(initiative.initiative_type),
            metadata: {
              initiative_id: initiative.id,
              initiative_type: initiative.initiative_type,
              triggering_insight: initiative.triggering_insight,
            },
            status: 'processed',
            sent_at: now.toISOString(),
          });

        console.log(`[yana-initiative-scheduler] ✓ Sent ${initiative.initiative_type} to user ${initiative.user_id}`);
        stats.sent++;

      } catch (sendError) {
        console.error(`[yana-initiative-scheduler] Error sending initiative:`, sendError);
        await cancelInitiative(supabase, initiative.id, `Send error: ${sendError}`);
        stats.cancelled++;
      }
    }

    // =====================================================
    // PASUL 6: Raport final
    // =====================================================
    console.log(`[yana-initiative-scheduler] Complete:`, stats);

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[yana-initiative-scheduler] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Anulează o inițiativă cu motiv
async function cancelInitiative(supabase: any, initiativeId: string, reason: string) {
  await supabase
    .from('yana_initiatives')
    .update({
      status: 'cancelled',
      cancelled_reason: reason,
    })
    .eq('id', initiativeId);
}

// Helper: Generează subiect bazat pe tip
function getInitiativeSubject(type: string): string {
  const subjects: Record<string, string> = {
    proactive_insight: 'YANA a observat ceva în datele tale',
    relationship_checkin: 'YANA: Mi-a fost dor de tine',
    goal_proposal: 'YANA: Am o sugestie pentru tine',
    learning_share: 'YANA: Am învățat ceva ce te-ar putea ajuta',
    celebration: 'YANA: Hai să sărbătorim împreună!',
  };
  return subjects[type] || 'YANA are un mesaj pentru tine';
}
