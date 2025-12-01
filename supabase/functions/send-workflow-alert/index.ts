import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverdueStage {
  id: string;
  stage_name: string;
  stage_number: number;
  started_at: string;
  estimated_days: number;
  responsible_person_name: string | null;
  workflow_instance: {
    month_year: string;
    companies: {
      company_name: string;
    };
  };
  workflow_team_members: {
    member_email: string;
    member_name: string;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'YanaCRM <noreply@yanacrm.com>';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting protection (defense-in-depth for public cron endpoint)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`[RATE-LIMIT] Checking rate limit for IP: ${clientIp}`);

    const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: clientIp,
      p_endpoint: 'send-workflow-alert',
      p_max_requests: 10 // Max 10 requests per minute (cron could check multiple times per day)
    });

    if (rateLimitError) {
      console.error('[RATE-LIMIT] Error checking rate limit:', rateLimitError);
    } else if (!canProceed) {
      console.warn(`[RATE-LIMIT] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Searching for overdue workflow stages...');

    // Fetch toate etapele în întârziere (status = 'in_progress' și started_at + estimated_days < NOW())
    const { data: overdueStages, error: fetchError } = await supabase
      .from('monthly_workflow_stages')
      .select(`
        id,
        stage_name,
        stage_number,
        started_at,
        estimated_days,
        responsible_person_name,
        workflow_instance:monthly_workflow_instances!inner(
          month_year,
          companies!inner(company_name)
        ),
        workflow_team_members(member_email, member_name)
      `)
      .eq('status', 'in_progress')
      .not('started_at', 'is', null) as { data: OverdueStage[] | null; error: any };

    if (fetchError) {
      console.error('❌ Error fetching overdue stages:', fetchError);
      throw fetchError;
    }

    if (!overdueStages || overdueStages.length === 0) {
      console.log('✅ No overdue stages found.');
      return new Response(
        JSON.stringify({ message: 'No overdue stages found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Found ${overdueStages.length} overdue stage(s). Sending notifications...`);

    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    for (const stage of overdueStages) {
      const startedAt = new Date(stage.started_at);
      const now = new Date();
      const daysPassed = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = daysPassed - stage.estimated_days;

      // Verifică dacă etapa este în întârziere
      if (daysOverdue <= 0) {
        continue; // Nu e încă în întârziere
      }

      const recipientEmail = stage.workflow_team_members?.member_email;
      const recipientName = stage.workflow_team_members?.member_name || stage.responsible_person_name || 'Coleg';
      const companyName = stage.workflow_instance.companies.company_name;
      const monthYear = stage.workflow_instance.month_year;

      if (!recipientEmail) {
        console.warn(`⚠️ No email found for stage ${stage.id}. Skipping.`);
        continue;
      }

      // Compune email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #4b5563; }
            .value { color: #1f2937; }
            .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⚠️ Atenție: Etapă în întârziere</h2>
            </div>
            <div class="content">
              <p>Bună ${recipientName},</p>
              
              <div class="info-row">
                <span class="label">Companie:</span>
                <span class="value">${companyName}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Lună:</span>
                <span class="value">${monthYear}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Etapă:</span>
                <span class="value">${stage.stage_name} (Etapa ${stage.stage_number}/5)</span>
              </div>
              
              <div class="info-row">
                <span class="label">Început:</span>
                <span class="value">${new Date(stage.started_at).toLocaleDateString('ro-RO', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Zile estimate:</span>
                <span class="value">${stage.estimated_days}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Zile trecute:</span>
                <span class="value">${daysPassed}</span>
              </div>
              
              <div class="warning">
                <strong style="color: #ef4444;">Această etapă a depășit termenul estimat cu ${daysOverdue} ${daysOverdue === 1 ? 'zi' : 'zile'}.</strong>
              </div>
              
              <p>Te rugăm să contactezi contabilul pentru actualizare status.</p>
            </div>
            <div class="footer">
              <p>Acest email a fost trimis automat de YanaCRM.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        // Send email using Resend API
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipientEmail,
            subject: `⚠️ Etapă în întârziere: ${stage.stage_name} - ${companyName}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.statusText}`);
        }

        emailsSent.push(recipientEmail);
        console.log(`✅ Email sent to ${recipientEmail} for stage ${stage.stage_name}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${recipientEmail}:`, emailError);
        emailsFailed.push(recipientEmail);
      }
    }

    console.log(`📊 Summary: ${emailsSent.length} sent, ${emailsFailed.length} failed`);

    return new Response(
      JSON.stringify({
        message: 'Workflow alert notifications processed',
        total_overdue: overdueStages.length,
        emails_sent: emailsSent.length,
        emails_failed: emailsFailed.length,
        sent_to: emailsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in send-workflow-alert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
