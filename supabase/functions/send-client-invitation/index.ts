import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod validation schema for input security
const ClientInvitationSchema = z.object({
  invitationId: z.string().uuid({ message: "Invalid invitation ID" })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const rawBody = await req.json();
    
    // Validate input with Zod
    const validationResult = ClientInvitationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('[VALIDATION] Invalid input:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { invitationId } = validationResult.data;

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('accountant_invitations')
      .select('*, profiles!accountant_invitations_accountant_id_fkey(full_name, email)')
      .eq('id', invitationId)
      .single();

    if (inviteError) throw inviteError;

    // Generate invitation link
    const origin = req.headers.get('origin') || 'https://yana-contabila.lovable.app';
    const invitationLink = `${origin}/accept-invitation?token=${invitation.invitation_token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL") || 'YANA Contabilă <onboarding@resend.dev>',
      to: [invitation.client_email],
      subject: `Invitație de la ${invitation.profiles.full_name || 'Contabilul tău'}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎯 Invitație YANA Contabilă</h1>
              </div>
              
              <div class="content">
                <p>Bună${invitation.client_name ? ` ${invitation.client_name}` : ''},</p>
                
                <p>Ai fost invitat de <strong>${invitation.profiles.full_name}</strong> să te alături platformei YANA Contabilă pentru gestionarea firmei <strong>${invitation.company_name}</strong>.</p>
                
                <div class="details">
                  <p><strong>📧 Contabil:</strong> ${invitation.profiles.email}</p>
                  <p><strong>🏢 Firmă:</strong> ${invitation.company_name}</p>
                </div>

                <p>YANA Contabilă îți oferă:</p>
                <ul>
                  <li>✅ Analiză automată a balanțelor cu AI</li>
                  <li>✅ Rapoarte detaliate și vizualizări</li>
                  <li>✅ Chat AI pentru întrebări financiare</li>
                  <li>✅ Monitorizare continuă a sănătății financiare</li>
                </ul>

                <div style="text-align: center;">
                  <a href="${invitationLink}" class="button">
                    Acceptă Invitația
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 14px;">
                  Link-ul este valabil 7 zile. Dacă întâmpini probleme, contactează direct contabilul tău.
                </p>
              </div>

              <div class="footer">
                <p>© ${new Date().getFullYear()} YANA Contabilă. Toate drepturile rezervate.</p>
                <p>Acest email a fost trimis automat. Pentru suport: contact@yana-contabila.ro</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent:', emailResponse);

    // Update invitation status
    await supabaseClient
      .from('accountant_invitations')
      .update({ status: 'sent' })
      .eq('id', invitationId);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
