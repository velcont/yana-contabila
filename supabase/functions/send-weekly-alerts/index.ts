import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obține toate alertele necitite din ultima săptămână
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: alerts, error: alertsError } = await supabaseClient
      .from('chat_insights')
      .select('*, profiles!inner(email, full_name)')
      .eq('is_read', false)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('severity', { ascending: true }); // critical first

    if (alertsError) throw alertsError;

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unread alerts to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grupează alertele pe utilizator
    const userAlerts = new Map();
    alerts.forEach((alert: any) => {
      const email = alert.profiles.email;
      if (!userAlerts.has(email)) {
        userAlerts.set(email, {
          email,
          fullName: alert.profiles.full_name,
          alerts: []
        });
      }
      userAlerts.get(email).alerts.push(alert);
    });

    // Trimite email fiecărui utilizator
    const emailPromises = Array.from(userAlerts.values()).map(async (userData) => {
      const criticalAlerts = userData.alerts.filter((a: any) => a.severity === 'critical');
      const warningAlerts = userData.alerts.filter((a: any) => a.severity === 'warning');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">YANA</h1>
            <p style="margin: 10px 0 0 0;">Raport Săptămânal de Alerte</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Bună ${userData.fullName || 'Utilizator'},</p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Ai <strong>${userData.alerts.length}</strong> alerte noi în această săptămână care necesită atenția ta.
            </p>

            ${criticalAlerts.length > 0 ? `
              <div style="margin: 20px 0; padding: 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">⚠️ Alerte CRITICE (${criticalAlerts.length})</h3>
                ${criticalAlerts.map((alert: any) => `
                  <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #fee2e2;">
                    <p style="margin: 0; font-weight: bold; color: #991b1b;">${alert.title}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #7f1d1d;">${alert.description}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${warningAlerts.length > 0 ? `
              <div style="margin: 20px 0; padding: 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <h3 style="color: #d97706; margin: 0 0 15px 0; font-size: 18px;">⚡ Alerte de ATENȚIE (${warningAlerts.length})</h3>
                ${warningAlerts.map((alert: any) => `
                  <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #fef3c7;">
                    <p style="margin: 0; font-weight: bold; color: #92400e;">${alert.title}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">${alert.description}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div style="margin-top: 30px; text-align: center;">
              <a href="${Deno.env.get('SUPABASE_URL') || 'https://yana-contabila.velcont.com'}" 
                 style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Vezi Dashboard Complet
              </a>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
              Primești acest email pentru că ai activat notificările săptămânale în Yana.<br>
              Poți dezactiva notificările din setările Dashboard-ului.
            </p>
          </div>
        </div>
      `;

      // Trimite email folosind Resend API direct
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Yana AI <noreply@yana-contabila.velcont.com>",
          to: [userData.email],
          subject: `🚨 ${criticalAlerts.length} Alerte Critice - Raport Săptămânal Yana`,
          html,
        }),
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent: successCount,
        totalAlerts: alerts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});