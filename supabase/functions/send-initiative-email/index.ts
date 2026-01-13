import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  initiative_id: string;
  user_id: string;
  email: string;
  name: string;
  content: string;
  initiative_type: string;
}

// Subiect bazat pe tipul inițiativei
function getSubject(type: string): string {
  const subjects: Record<string, string> = {
    'self_correction_apology': 'YANA: Îmi cer scuze pentru ceva',
    'learning_share': 'YANA: Am descoperit ceva interesant pentru tine',
    'proactive_insight': 'YANA: O observație care te-ar putea ajuta',
    'celebration': 'YANA: Vreau să sărbătorim ceva împreună',
    'check_in': 'YANA: Cum te mai descurci?',
    'reminder': 'YANA: Un mic reminder prietenesc',
  };
  return subjects[type] || 'YANA: Am ceva să-ți spun';
}

// Template HTML pentru email
function generateEmailHTML(name: string, content: string, initiativeType: string, unsubscribeUrl: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YANA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header cu gradient YANA -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%); padding: 32px 40px; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                YANA
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Your Accounting Neural Assistant
              </p>
            </td>
          </tr>
          
          <!-- Conținut principal -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #334155; font-size: 18px; line-height: 1.6;">
                Salut <strong>${name}</strong>,
              </p>
              
              <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px 24px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                <p style="margin: 0; color: #0f766e; font-size: 16px; line-height: 1.7; white-space: pre-wrap;">
${content}
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      💬 Răspunde lui YANA
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; text-align: center;">
                Ai primit acest email pentru că YANA ține la tine. 💚
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                Nu mai vrei să primești? 
                <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Dezabonare</a>
              </p>
              <p style="margin: 16px 0 0 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} YANA Contabilă • yanacontabila.ro
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-initiative-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { initiative_id, user_id, email, name, content, initiative_type }: EmailRequest = await req.json();

    console.log(`[send-initiative-email] Processing initiative ${initiative_id} for ${email}`);

    // Verifică dacă emailul a fost deja trimis pentru această inițiativă
    const { data: initiative } = await supabase
      .from('yana_initiatives')
      .select('email_sent_at')
      .eq('id', initiative_id)
      .single();

    if (initiative?.email_sent_at) {
      console.log(`[send-initiative-email] Email already sent for initiative ${initiative_id} at ${initiative.email_sent_at}`);
      return new Response(
        JSON.stringify({ success: true, already_sent: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifică dacă utilizatorul are emailurile YANA activate
    const { data: profile } = await supabase
      .from('profiles')
      .select('yana_emails_enabled')
      .eq('id', user_id)
      .single();

    if (profile && profile.yana_emails_enabled === false) {
      console.log(`[send-initiative-email] User ${user_id} has opted out of YANA emails`);
      return new Response(
        JSON.stringify({ success: false, reason: 'opted_out' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generează URL-uri
    const appUrl = "https://yanacontabila.ro/yana";
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-yana-emails?user_id=${user_id}&token=${initiative_id}`;

    // Generează email HTML
    const subject = getSubject(initiative_type);
    const html = generateEmailHTML(name, content, initiative_type, unsubscribeUrl, appUrl);

    // Trimite emailul (temporar folosim onboarding@resend.dev până verificăm domeniul)
    const emailResponse = await resend.emails.send({
      from: "YANA <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log(`[send-initiative-email] Resend response:`, JSON.stringify(emailResponse));

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    // Marchează emailul ca trimis
    await supabase
      .from('yana_initiatives')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', initiative_id);

    // Log în email_logs
    await supabase
      .from('email_logs')
      .insert({
        email_type: 'yana_initiative',
        recipient_email: email,
        subject: subject,
        status: 'sent',
        metadata: {
          initiative_id,
          initiative_type,
          resend_id: emailResponse.data?.id,
        },
      });

    console.log(`[send-initiative-email] ✅ Email sent successfully to ${email} for initiative ${initiative_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        resend_id: emailResponse.data?.id,
        email: email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-initiative-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
