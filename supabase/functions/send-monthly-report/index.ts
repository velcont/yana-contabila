import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-MONTHLY-REPORT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user profile to determine context
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_type, full_name')
      .eq('id', user.id)
      .single();

    const isAccountant = profile?.subscription_type === 'accounting_firm';

    const { 
      companyId, 
      clientEmails, 
      clientEmail, 
      clientName, 
      reportData, 
      companyName: directCompanyName,
      pdfAttachment 
    } = await req.json();
    
    // Support both single email (legacy) and multiple emails
    const emailList = clientEmails || (clientEmail ? [clientEmail] : []);
    logStep("Request data received", { companyId, emailList, isAccountant });

    if (!emailList || emailList.length === 0 || !reportData) {
      throw new Error("Missing required fields: clientEmails and reportData");
    }

    let company = null;
    let companyName = directCompanyName || 'Firmă';
    let logoUrl = null;
    let brandColor = '#10b981';

    // For accountants, get company details from database
    if (isAccountant && companyId) {
      const { data: companyData } = await supabaseClient
        .from('companies')
        .select('company_name, accountant_logo_url, accountant_brand_color')
        .eq('id', companyId)
        .single();

      if (companyData) {
        company = companyData;
        companyName = companyData.company_name;
        logoUrl = companyData.accountant_logo_url;
        brandColor = companyData.accountant_brand_color || '#10b981';
      }
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Build email HTML with branding
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="Logo" style="height: 60px; margin-bottom: 20px;">` 
      : '';

    const senderInfo = isAccountant 
      ? 'Acest raport a fost generat automat. Pentru detalii suplimentare, te rugăm să contactezi firma de contabilitate.'
      : `Acest raport a fost generat automat de ${profile?.full_name || user.email} folosind platforma Yana.`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 3px solid ${brandColor}; padding-bottom: 20px; margin-bottom: 30px; }
            .metric { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${brandColor}; }
            .metric-label { font-weight: bold; color: ${brandColor}; }
            .metric-value { font-size: 1.2em; margin-top: 5px; }
            .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
            .attachment-note { background: #eff6ff; border-left: 4px solid ${brandColor}; padding: 15px; margin: 20px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoHtml}
              <h1 style="color: ${brandColor}; margin: 0;">Raport Financiar</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">${companyName}</p>
              <p style="color: #9ca3af; margin: 5px 0 0 0;">${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' })}</p>
            </div>

            <p>Bună ${clientName || 'ziua'},</p>
            <p>${isAccountant ? 'Iți transmitem raportul financiar lunar pentru compania ta.' : 'Iată raportul tău financiar generat automat.'} Aici găsești principalii indicatori și recomandări:</p>

            ${pdfAttachment ? `
              <div class="attachment-note">
                <strong>📎 Analiza completă este atașată în format PDF</strong>
                <p style="margin: 5px 0 0 0; font-size: 0.9em;">Deschide fișierul atașat pentru a vizualiza raportul detaliat.</p>
              </div>
            ` : ''}

            <h2 style="color: ${brandColor}; margin-top: 30px;">Indicatori Cheie</h2>
            ${reportData.metrics ? reportData.metrics.map((metric: any) => `
              <div class="metric">
                <div class="metric-label">${metric.label}</div>
                <div class="metric-value">${metric.value}</div>
              </div>
            `).join('') : ''}

            ${reportData.alerts && reportData.alerts.length > 0 ? `
              <h2 style="color: #ef4444; margin-top: 30px;">⚠️ Alerte Importante</h2>
              ${reportData.alerts.map((alert: string) => `
                <div class="alert">${alert}</div>
              `).join('')}
            ` : ''}

            ${reportData.recommendations ? `
              <h2 style="color: ${brandColor}; margin-top: 30px;">💡 Recomandări</h2>
              <ul>
                ${reportData.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ul>
            ` : ''}

            <div class="footer">
              <p>${senderInfo}</p>
              <p>© ${new Date().getFullYear()} - Toate drepturile rezervate</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare attachments
    const attachments = [];
    if (pdfAttachment) {
      attachments.push({
        filename: pdfAttachment.filename,
        content: pdfAttachment.content,
      });
    }

    // Send email to all recipients
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Raport Financiar <onboarding@resend.dev>",
      to: emailList,
      subject: `Raport Financiar - ${companyName} - ${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' })}`,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (emailError) {
      logStep("ERROR", { message: emailError.message });
      
      // Provide user-friendly error messages in Romanian
      if (emailError.message && emailError.message.includes('verify a domain at resend.com/domains')) {
        throw new Error('⚠️ Funcția de email este în modul de test. Pentru a trimite emailuri către orice destinatar, trebuie să verifici un domeniu la resend.com/domains și să schimbi adresa "from" cu un email de pe acel domeniu. În modul de test, poți trimite doar către adresa ta verificată.');
      }
      
      throw new Error(`Eroare trimitere email: ${emailError.message}`);
    }

    logStep("Email sent successfully", { emailId: emailData?.id, recipients: emailList.length });

    // Log the email send for each recipient
    const emailLogs = emailList.map((email: string) => ({
      recipient_email: email,
      subject: `Raport Financiar - ${companyName}`,
      email_type: 'monthly_report',
      status: 'sent',
      metadata: {
        company_id: companyId,
        sender_id: user.id,
        sender_type: profile?.subscription_type,
        report_month: new Date().toISOString().slice(0, 7),
        has_pdf_attachment: !!pdfAttachment,
        recipient_count: emailList.length
      }
    }));

    await supabaseClient
      .from('email_logs')
      .insert(emailLogs);

    return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
