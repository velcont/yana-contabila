import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for pending trial notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('trial_notifications')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('sent', false)
      .limit(50);

    if (fetchError) throw fetchError;

    if (!notifications || notifications.length === 0) {
      console.log("No pending trial notifications to send");
      return new Response(
        JSON.stringify({ success: true, message: "No notifications to send", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let sentCount = 0;
    const errors = [];

    for (const notification of notifications) {
      try {
        const profile = notification.profiles;
        if (!profile || !profile.email) {
          console.error(`No email found for user ${notification.user_id}`);
          continue;
        }

        const trialEndDate = new Date(notification.trial_ends_at).toLocaleDateString('ro-RO');
        
        let subject = "";
        let message = "";

        switch (notification.notification_type) {
          case '30_days':
            subject = "YANA - Perioada gratuită se apropie de final (30 zile)";
            message = `
              <h2>Bună ${profile.full_name || 'Utilizator YANA'},</h2>
              <p>Îți mulțumim că folosești YANA!</p>
              <p>Perioada ta gratuită de 3 luni se va încheia în <strong>30 de zile</strong>, pe data de <strong>${trialEndDate}</strong>.</p>
              <p>Pentru a continua să beneficiezi de toate funcționalitățile YANA, te rugăm să achiziționezi un abonament din secțiunea "Abonament" a aplicației.</p>
              <p>Dacă ai întrebări, nu ezita să ne contactezi la office@velcont.com</p>
              <p>Cu stimă,<br>Echipa YANA</p>
            `;
            break;

          case '15_days':
            subject = "⚠️ YANA - Mai ai doar 15 zile până la expirarea perioadei gratuite!";
            message = `
              <h2>Bună ${profile.full_name || 'Utilizator YANA'},</h2>
              <p><strong>⚠️ ATENȚIE: Mai ai doar 15 zile!</strong></p>
              <p>Perioada ta gratuită de 3 luni se va încheia pe data de <strong>${trialEndDate}</strong>.</p>
              <p><strong>Ce se întâmplă dacă nu achiziționezi un abonament?</strong></p>
              <ul>
                <li>Accesul la platformă va fi restricționat</li>
                <li>Nu vei putea genera analize noi</li>
                <li>Datele tale vor fi păstrate în siguranță și vor fi accesibile după reactivarea abonamentului</li>
              </ul>
              <p>👉 <a href="${Deno.env.get("SUPABASE_URL")}/subscription">Achiziționează un abonament acum</a></p>
              <p>Cu stimă,<br>Echipa YANA</p>
            `;
            break;

          case 'expired':
            subject = "🔴 YANA - Perioada gratuită a expirat";
            message = `
              <h2>Bună ${profile.full_name || 'Utilizator YANA'},</h2>
              <p><strong>🔴 Perioada ta gratuită de 3 luni a expirat.</strong></p>
              <p>Pentru a redobândi accesul la platformă, te rugăm să achiziționezi un abonament.</p>
              <p><strong>Datele tale sunt în siguranță!</strong> Toate analizele și documentele tale sunt păstrate și vor fi disponibile imediat după reactivarea abonamentului.</p>
              <p>👉 <a href="${Deno.env.get("SUPABASE_URL")}/subscription">Achiziționează un abonament acum</a></p>
              <p>Dacă ai întrebări, contactează-ne la office@velcont.com</p>
              <p>Cu stimă,<br>Echipa YANA</p>
            `;
            break;
        }

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: "YANA <onboarding@resend.dev>",
          to: [profile.email],
          subject: subject,
          html: message,
        });

        if (emailResponse.error) {
          throw emailResponse.error;
        }

        // Mark notification as sent
        await supabaseClient
          .from('trial_notifications')
          .update({ 
            sent: true, 
            sent_at: new Date().toISOString() 
          })
          .eq('id', notification.id);

        sentCount++;
        console.log(`Trial notification sent to ${profile.email} (type: ${notification.notification_type})`);

      } catch (error) {
        console.error(`Error sending notification ${notification.id}:`, error);
        errors.push({ notificationId: notification.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-trial-notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
