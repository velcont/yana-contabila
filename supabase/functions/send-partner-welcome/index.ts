import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  recipientEmail: string;
  inviterName: string;
  analysisName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, inviterName, analysisName }: WelcomeEmailRequest = await req.json();
    
    console.log('Sending welcome email to:', recipientEmail);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Yana <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: "Bine ai venit în Yana - Ai fost invitat!",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Bine ai venit în Yana!</h1>
                </div>
                <div class="content">
                  <p>Salut!</p>
                  
                  <p><strong>${inviterName}</strong> ți-a dat acces la analiză financiară în <strong>Yana</strong> - platforma ta inteligentă de analiză financiară.</p>
                  
                  <p><strong>Analiza partajată:</strong> ${analysisName}</p>
                  
                  <p>Cu Yana poți:</p>
                  <ul>
                    <li>📊 Analiza automată a documentelor financiare</li>
                    <li>💬 Chat AI pentru întrebări despre finanțe</li>
                    <li>📈 Grafice interactive și rapoarte detaliate</li>
                    <li>🤝 Colaborare în timp real cu echipa ta</li>
                    <li>📧 Export PDF și partajare prin email</li>
                  </ul>
                  
                  <p style="text-align: center;">
                    <a href="${supabaseUrl.replace('https://ygfsuoloxzjpiulogrjz.supabase.co', 'https://ygfsuoloxzjpiulogrjz.lovable.app')}" class="button">
                      Accesează Yana
                    </a>
                  </p>
                  
                  <p><em>Dacă nu ai primit această invitație în mod intenționat, te rugăm să ignori acest email.</em></p>
                  
                  <p>Cu respect,<br><strong>Echipa Yana</strong></p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Yana - Analiză Financiară Inteligentă</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Welcome email sent successfully:", emailData);

    // Log email in database
    await supabase.from('email_logs').insert({
      email_type: 'partner_welcome',
      recipient_email: recipientEmail,
      subject: 'Bine ai venit în Yana - Ai fost invitat!',
      status: 'sent',
      metadata: { inviterName, analysisName }
    });

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-partner-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
