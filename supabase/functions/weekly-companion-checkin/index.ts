import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[WEEKLY-CHECKIN][${requestId}] Starting weekly companion check-in`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Yana <noreply@yana-contabila.lovable.app>';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      throw new Error('Missing required secrets: RESEND_API_KEY or LOVABLE_API_KEY');
    }

    // 1. Find active users (had conversations in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activeUsers, error: usersError } = await supabase
      .from('yana_conversations')
      .select('user_id')
      .gte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false });

    if (usersError) throw usersError;

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set((activeUsers || []).map(u => u.user_id))];
    console.log(`[WEEKLY-CHECKIN][${requestId}] Found ${uniqueUserIds.length} active users`);

    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get profiles and emails for active users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, has_free_access, subscription_status')
      .in('id', uniqueUserIds);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No profiles found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out users who unsubscribed from YANA emails
    const { data: unsubscribed } = await supabase
      .from('yana_email_preferences')
      .select('user_id')
      .eq('weekly_checkin', false);
    
    const unsubscribedIds = new Set((unsubscribed || []).map(u => u.user_id));

    const eligibleProfiles = profiles.filter(p => 
      p.email && !unsubscribedIds.has(p.id)
    );

    console.log(`[WEEKLY-CHECKIN][${requestId}] ${eligibleProfiles.length} eligible users after filtering`);

    const emailBatch: Array<{
      from: string;
      to: string[];
      subject: string;
      html: string;
    }> = [];

    // 3. For each user, generate personalized message
    for (const profile of eligibleProfiles.slice(0, 100)) { // Max 100 per batch
      try {
        // Get last 3 conversations
        const { data: recentConvs } = await supabase
          .from('yana_conversations')
          .select('title, updated_at')
          .eq('user_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(3);

        // Get client profile for context
        const { data: clientProfile } = await supabase
          .from('yana_client_profiles')
          .select('business_domain, onboarding_answers, preferred_topics')
          .eq('user_id', profile.id)
          .maybeSingle();

        const firstName = profile.full_name?.split(' ')[0] || 'Antreprenor';
        const lastTopics = (recentConvs || [])
          .map(c => c.title)
          .filter(t => t && t !== 'Conversație nouă')
          .slice(0, 3);
        
        const businessContext = (clientProfile as any)?.onboarding_answers?.businessDescription || 
          clientProfile?.business_domain || '';

        // Generate personalized message with Gemini Flash Lite (cheapest)
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
                content: `Ești Yana, un companion AI de business. Scrie un email scurt și cald (max 4 propoziții) pentru un antreprenor. 
Tonul: prietenos, direct, ca un prieten care se gândește la tine. NU fi formal sau corporatist.
NU folosi formule de genul "Sper că ești bine". Intră direct în subiect.
Limba: română.
Încheie cu o întrebare specifică despre business-ul lor.`
              },
              {
                role: "user",
                content: `Numele: ${firstName}
Business: ${businessContext || 'necunoscut'}
Ultimele subiecte discutate: ${lastTopics.length > 0 ? lastTopics.join(', ') : 'niciun subiect specific'}
Scrie un email scurt de check-in săptămânal.`
              }
            ],
            max_tokens: 200,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`[WEEKLY-CHECKIN][${requestId}] AI error for ${profile.id}`);
          continue;
        }

        const aiResult = await aiResponse.json();
        const personalizedMessage = aiResult.choices?.[0]?.message?.content?.trim() || '';

        if (!personalizedMessage) continue;

        const appUrl = 'https://yana-contabila.velcont.com/yana';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-yana-emails?user_id=${profile.id}`;
        const preferencesUrl = 'https://yana-contabila.velcont.com/settings?tab=notifications';

        emailBatch.push({
          from: RESEND_FROM_EMAIL,
          to: [profile.email!],
          subject: `${firstName}, cum merge săptămâna asta? 💛`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
              <p style="font-size: 15px; line-height: 1.6; color: #1a1a1a;">
                ${personalizedMessage.replace(/\n/g, '<br/>')}
              </p>
              <div style="margin-top: 24px;">
                <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                  Continuă conversația
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;">
              <p style="font-size: 12px; color: #6b7280; line-height: 1.6; text-align: center;">
                Primești acest email pentru că ai activat <strong>check-in-ul săptămânal YANA</strong>.<br>
                <a href="${preferencesUrl}" style="color: #6366f1; text-decoration: underline; margin: 0 6px;">Gestionează preferințe</a>
                •
                <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline; margin: 0 6px;">Dezabonare cu un singur click</a>
              </p>
              <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 12px 0 0;">
                <strong style="color: #4b5563;">YANA</strong> — AI Business Companion<br>
                Operator: Suciu Gyorfi Nicolae PFA · Sediu: România · <a href="mailto:office@velcont.com" style="color: #9ca3af;">office@velcont.com</a><br>
                © ${new Date().getFullYear()} YANA by Velcont
              </p>
            </div>
          `,
        });

        // Create initiative for display in chat
        await supabase.from('yana_initiatives').insert({
          user_id: profile.id,
          initiative_type: 'weekly_checkin',
          content: personalizedMessage,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

      } catch (err) {
        console.error(`[WEEKLY-CHECKIN][${requestId}] Error processing user ${profile.id}:`, err);
      }
    }

    // 4. Send emails in batch (max 100 per Resend batch API)
    let sentCount = 0;
    if (emailBatch.length > 0) {
      const batchResponse = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBatch),
      });

      if (batchResponse.ok) {
        sentCount = emailBatch.length;
        console.log(`[WEEKLY-CHECKIN][${requestId}] ✅ Sent ${sentCount} check-in emails`);
      } else {
        const errorText = await batchResponse.text();
        console.error(`[WEEKLY-CHECKIN][${requestId}] Resend batch error:`, errorText);
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        eligible: eligibleProfiles.length,
        message: `Weekly check-in completed: ${sentCount} emails sent`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[WEEKLY-CHECKIN][${requestId}] ERROR:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
