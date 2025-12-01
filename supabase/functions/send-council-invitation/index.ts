import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod validation schema for input security
const InvitationSchema = z.object({
  to_email: z.string().email({ message: "Invalid email address" }).max(255),
  to_name: z.string().trim().min(1).max(255),
  invitation_token: z.string().uuid({ message: "Invalid invitation token" }),
  role: z.enum(['advisor', 'partner', 'accountant', 'observer']),
  message: z.string().max(1000).optional()
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input with Zod
    const validationResult = InvitationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('[VALIDATION] Invalid input:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to_email, to_name, invitation_token, role, message } = validationResult.data;

    const roleLabels: Record<string, string> = {
      advisor: "Consultant Fiscal",
      partner: "Partener de Afaceri",
      accountant: "Contabil",
      observer: "Observator"
    };

    const acceptUrl = `${Deno.env.get('SUPABASE_URL')}/accept-council-invitation?token=${invitation_token}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .role-badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 4px; font-weight: 600; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Invitație în Consiliul Strategic</h1>
            </div>
            <div class="content">
              <p>Bună ${to_name},</p>
              
              <p>Ai fost invitat să faci parte din <strong>Consiliul Strategic</strong> al unui antreprenor în platforma Yana.</p>
              
              <p>Rolul tău în consiliu: <span class="role-badge">${roleLabels[role]}</span></p>
              
              ${message ? `
                <div class="message-box">
                  <p><strong>Mesaj personal:</strong></p>
                  <p>${message}</p>
                </div>
              ` : ''}
              
              <p>În calitate de membru al consiliului, vei putea:</p>
              <ul>
                <li>📊 Vizualiza strategiile împărtășite</li>
                <li>💬 Comenta și oferi feedback</li>
                <li>🤝 Colabora cu AI-ul strategic</li>
                <li>📈 Contribui la dezvoltarea strategiilor</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button">Acceptă Invitația</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">
                Această invitație este valabilă 7 zile. Dacă nu accesezi link-ul în acest interval, va expira automat.
              </p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} Yana - Platform Strategic AI</p>
                <p>Dacă nu te așteptai la această invitație, poți ignora acest email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Yana Strategic <${RESEND_FROM_EMAIL}>`,
        to: [to_email],
        subject: `🎯 Invitație în Consiliul Strategic - ${roleLabels[role]}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Council invitation email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-council-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
