import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "office@velcont.com";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Yana Contabila <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔒 SECURITY: Zod validation schema
const DeletionEmailSchema = z.object({
  userEmail: z.string().email("Invalid email format"),
  userName: z.string().optional(),
  deletedBy: z.string().min(1, "deletedBy is required"),
  deletionDate: z.string().min(1, "deletionDate is required")
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔒 SECURITY: Rate limiting by IP address
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: canProceed } = await supabase.rpc('check_rate_limit', {
    p_user_id: clientIp,
    p_endpoint: 'send-account-deletion-email',
    p_max_requests: 5 // 5 deletion emails per minute (should be rare)
  });

  if (!canProceed) {
    console.error(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ error: 'Too many deletion email requests' }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 🔒 SECURITY: Validate input with Zod
    const rawBody = await req.json();
    const validationResult = DeletionEmailSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { userEmail, userName, deletedBy, deletionDate } = validationResult.data;

    console.log(`Trimit email de confirmare ștergere către ${userEmail}`);

    // Email către utilizatorul șters
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            .feedback-section { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #667eea; font-size: 18px; margin-top: 0; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .warning { color: #dc3545; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Confirmare Ștergere Cont</h1>
          </div>
          <div class="content">
            <p>Bună ${userName || ""},</p>
            
            <div class="info-box">
              <h2>Contul tău a fost șters</h2>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Data ștergerii:</strong> ${deletionDate}</p>
              <p><strong>Șters de:</strong> ${deletedBy}</p>
            </div>

            <p>Acest email confirmă că contul tău Yana Contabila a fost șters permanent din sistemul nostru.</p>

            <p class="warning">⚠️ IMPORTANT: Toate datele asociate contului tău au fost șterse permanent și nu pot fi recuperate.</p>

            <div class="feedback-section">
              <h2>📋 Ne-ar ajuta mult feedback-ul tău</h2>
              <p>Ne pare rău că ne părăsești. Pentru a îmbunătăți serviciile noastre, te rugăm să ne spui:</p>
              <ul>
                <li><strong>Ce nu ți-a plăcut</strong> la Yana Contabila?</li>
                <li><strong>Ce am putea îmbunătăți</strong> pentru viitor?</li>
                <li><strong>Ce funcționalități</strong> ai fi dorit să ai?</li>
              </ul>
              <p>Răspunde direct la acest email cu feedback-ul tău. Orice sugestie este prețioasă pentru noi! 🙏</p>
            </div>

            <p><strong>Dacă ștergerea a fost făcută din greșeală</strong> sau dorești să revii, te rugăm să ne contactezi urgent:</p>
            <p>
              📧 Email: <a href="mailto:office@velcont.com">office@velcont.com</a><br>
              📞 Telefon: [Număr de contact]
            </p>

            <p>Mulțumim că ai încercat Yana Contabila!</p>

            <div class="footer">
              <p>© 2025 Yana Contabila - Powered by Velcont</p>
              <p>Acest email a fost trimis automat. Pentru întrebări, contactează-ne la office@velcont.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Email către admin (BCC - utilizatorul nu va vedea)
    const adminNotificationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; }
            h1 { margin: 0; font-size: 20px; }
            .label { font-weight: bold; color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🗑️ NOTIFICARE: Cont Șters</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <p><span class="label">Utilizator șters:</span> ${userEmail}</p>
              <p><span class="label">Nume:</span> ${userName || "N/A"}</p>
              <p><span class="label">Data ștergerii:</span> ${deletionDate}</p>
              <p><span class="label">Șters de admin:</span> ${deletedBy}</p>
            </div>
            <p><strong>Acțiune completată cu succes.</strong> Email de confirmare trimis către utilizator.</p>
            <p>⚠️ <strong>Așteaptă feedback de la utilizator</strong> - verifică răspunsurile la acest email.</p>
          </div>
        </body>
      </html>
    `;

    // Trimite email către utilizator cu BCC către admin
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        bcc: [ADMIN_EMAIL],
        subject: "Confirmare Ștergere Cont - Yana Contabila",
        html: userEmailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Eroare trimitere email utilizator:", errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log(`✅ Email de confirmare ștergere trimis către ${userEmail} (BCC: ${ADMIN_EMAIL})`);

    // Trimite email separat către admin cu detalii interne
    const adminEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `[ADMIN] Cont Șters: ${userEmail}`,
        html: adminNotificationHtml,
      }),
    });

    if (!adminEmailResponse.ok) {
      const adminErrorData = await adminEmailResponse.json();
      console.warn("Eroare trimitere notificare admin:", adminErrorData);
      // Nu returnăm eroare - emailul principal a fost trimis
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de confirmare ștergere trimis cu succes",
        emailId: emailData?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Eroare în send-account-deletion-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
