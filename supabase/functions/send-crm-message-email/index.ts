import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CRM-MESSAGE-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1. Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // 2. Extract message_id from request
    const { message_id } = await req.json();
    if (!message_id) {
      throw new Error("Missing message_id");
    }
    logStep("Request received", { message_id });

    // 3. Fetch message + company (without relying on sender profile relationship)
    const { data: messageData, error: fetchError } = await supabaseAdmin
      .from('crm_messages')
      .select(`
        *,
        companies!company_id(
          company_name, 
          contact_email, 
          accountant_logo_url, 
          accountant_brand_color,
          managed_by_accountant_id
        )
      `)
      .eq('id', message_id)
      .single();

    if (fetchError || !messageData) {
      logStep("ERROR: Message not found", { message_id, error: fetchError });
      throw new Error("Message not found");
    }
    logStep("Message data fetched", { 
      messageId: messageData.id, 
      companyName: messageData.companies?.company_name
    });

    // 3b. Fetch sender profile separately (no FK relationship required)
    const { data: senderProfile, error: senderProfileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', messageData.sender_id)
      .single();
    if (senderProfileError) {
      logStep('WARN: Sender profile fetch failed', { error: senderProfileError });
    }


    // 4. Security validations
    if (messageData.sender_id !== user.id) {
      logStep("ERROR: Unauthorized - sender mismatch", { 
        messageSenderId: messageData.sender_id, 
        requestUserId: user.id 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only send emails for your own messages' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messageData.companies?.managed_by_accountant_id !== user.id) {
      logStep("ERROR: Unauthorized - not accountant for this company", { 
        companyAccountantId: messageData.companies?.managed_by_accountant_id,
        requestUserId: user.id 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You are not the accountant for this company' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messageData.companies?.contact_email) {
      logStep("ERROR: No contact email for company", { companyId: messageData.company_id });
      return new Response(
        JSON.stringify({ error: 'Company has no contact email configured' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Process attachments (if any)
    const attachments = messageData.attachments || [];
    const resendAttachments = [];
    
    if (Array.isArray(attachments) && attachments.length > 0) {
      logStep("Processing attachments", { count: attachments.length });
      
      for (const att of attachments) {
        try {
          // Download file from storage
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('crm-attachments')
            .download(att.path);
          
          if (downloadError) {
            logStep(`ERROR downloading file: ${att.name}`, downloadError);
            continue;
          }
          
          // Convert to base64 for Resend
          const arrayBuffer = await fileData.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...uint8Array));
          
          resendAttachments.push({
            filename: att.name,
            content: base64,
          });
          
          logStep(`Attachment processed: ${att.name}`, { size: att.size });
        } catch (attError) {
          logStep(`ERROR processing attachment: ${att.name}`, attError);
        }
      }
    }

    // 6. Build email HTML
    const companyName = messageData.companies?.company_name || 'Firmă';
    const contactEmail = messageData.companies?.contact_email;
    const logoUrl = messageData.companies?.accountant_logo_url;
    const brandColor = messageData.companies?.accountant_brand_color || '#10b981';
    const senderName = senderProfile?.full_name || 'Contabilul tău';
    const senderEmail = senderProfile?.email || user.email;
    const subject = messageData.subject;
    const message = messageData.message;

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="Logo Contabil" style="height: 60px; margin-bottom: 20px;">` 
      : '';

    const attachmentsHtml = resendAttachments.length > 0 
      ? `
        <div style="background: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid ${brandColor};">
          <strong style="color: ${brandColor};">📎 Documente atașate:</strong>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            ${attachments.map((att: any) => `
              <li style="margin: 5px 0;">📄 ${att.name} (${(att.size / 1024).toFixed(1)} KB)</li>
            `).join('')}
          </ul>
          <p style="font-size: 0.9em; color: #6b7280; margin-top: 10px;">
            Documentele sunt atașate la acest email.
          </p>
        </div>
      `
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              border-bottom: 3px solid ${brandColor}; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .message-box { 
              background: #f9fafb; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 8px; 
              border-left: 4px solid ${brandColor}; 
            }
            .subject { 
              font-size: 1.3em; 
              font-weight: bold; 
              color: ${brandColor}; 
              margin-bottom: 15px; 
            }
            .message-content { 
              font-size: 1.05em; 
              line-height: 1.7; 
              white-space: pre-wrap;
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              color: #6b7280; 
              font-size: 0.9em; 
            }
            .contact-info {
              background: #eff6ff;
              padding: 15px;
              margin: 20px 0;
              border-radius: 8px;
              border-left: 4px solid ${brandColor};
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoHtml}
              <h1 style="color: ${brandColor}; margin: 0;">📩 Mesaj de la Contabilul Tău</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">${companyName}</p>
            </div>

            <p>Bună ziua,</p>
            <p>Ai primit un mesaj nou de la contabilul tău, <strong>${senderName}</strong>:</p>

            <div class="message-box">
              <div class="subject">${subject}</div>
              <div class="message-content">${message}</div>
            </div>

            ${attachmentsHtml}

            <div class="contact-info">
              <strong>📞 Pentru răspuns sau întrebări:</strong>
              <p style="margin: 5px 0 0 0;">
                Email: <a href="mailto:${senderEmail}" style="color: ${brandColor};">${senderEmail}</a>
              </p>
              <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #6b7280;">
                Poți răspunde direct la acest email sau contactează-ne la adresa de mai sus.
              </p>
            </div>

            <div class="footer">
              <p>Acest mesaj a fost trimis automat prin sistemul Yana CRM.</p>
              <p>© ${new Date().getFullYear()} - Toate drepturile rezervate</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 7. Send through Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const envFrom = Deno.env.get("RESEND_FROM_EMAIL");
    const fromEmail = envFrom && envFrom.trim().length > 0
      ? envFrom
      : "Yana CRM <noreply@yana-contabila.velcont.com>";

    logStep("About to send email", { 
      from: fromEmail, 
      to: contactEmail,
      subject: `[${companyName}] ${subject}`,
      attachmentsCount: resendAttachments.length
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [contactEmail],
      subject: `[${companyName}] ${subject}`,
      html: emailHtml,
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      reply_to: senderEmail
    });

    if (emailError) {
      logStep("ERROR sending email", emailError);
      
      // Log failed email
      await supabaseAdmin.from('email_logs').insert({
        recipient_email: contactEmail,
        subject: `[${companyName}] ${subject}`,
        email_type: 'crm_message',
        status: 'failed',
        metadata: {
          message_id,
          company_id: messageData.company_id,
          sender_id: user.id,
          attachments_count: resendAttachments.length,
          error: emailError.message
        }
      });

      throw new Error(`Eroare trimitere email: ${emailError.message}`);
    }

    logStep("Email sent successfully", { emailId: emailData?.id, to: contactEmail });

    // 8. Log success
    await supabaseAdmin.from('email_logs').insert({
      recipient_email: contactEmail,
      subject: `[${companyName}] ${subject}`,
      email_type: 'crm_message',
      status: 'sent',
      metadata: {
        message_id,
        company_id: messageData.company_id,
        sender_id: user.id,
        sender_email: senderEmail,
        attachments_count: resendAttachments.length,
        email_id: emailData?.id
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent_to: contactEmail,
        attachments_sent: resendAttachments.length,
        message: "Email trimis cu succes"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
