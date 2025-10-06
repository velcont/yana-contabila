import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyData {
  hasEmployees: boolean;
  hasIntraCommunity: boolean;
  isVATpayer: boolean;
  vatFrequency?: 'lunar' | 'trimestrial';
  taxType: 'microenterprise' | 'profit';
}

interface EmailRequest {
  emails: string[];
  companyName: string;
  analysisText: string;
  companyData: CompanyData;
  analysisDate: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { emails, companyName, analysisText, companyData, analysisDate }: EmailRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error('At least one email address is required');
    }

    // Construiește detaliile firmei pentru email
    const companyDetails = `
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin: 0 0 15px 0;">Date Firmă</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Salariați:</strong> ${companyData.hasEmployees ? 'Da' : 'Nu'}
          </li>
          <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Achiziții Intracomunitare:</strong> ${companyData.hasIntraCommunity ? 'Da' : 'Nu'}
          </li>
          <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Plătitor TVA:</strong> ${companyData.isVATpayer ? 'Da' : 'Nu'}
            ${companyData.isVATpayer && companyData.vatFrequency ? ` (${companyData.vatFrequency === 'lunar' ? 'Lunar' : 'Trimestrial'})` : ''}
          </li>
          <li style="padding: 8px 0;">
            <strong>Tip Impozit:</strong> ${companyData.taxType === 'microenterprise' ? 'Impozit pe venitul microîntreprinderilor' : 'Impozit pe profit'}
          </li>
        </ul>
      </div>
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">YANA - Analiză Financiară</h1>
          <p style="margin: 10px 0 0 0;">Raport pentru ${companyName}</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151;">
            Bună ziua,
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Ți-am trimis analiza financiară pentru <strong>${companyName}</strong> din data de <strong>${analysisDate}</strong>.
          </p>

          ${companyDetails}

          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Analiză Completă</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap; line-height: 1.8; color: #1f2937;">
              ${analysisText}
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${Deno.env.get('SUPABASE_URL') || 'https://yana-contabila.velcont.com'}" 
               style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accesează Dashboard YANA
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
            Acest email a fost generat automat de YANA AI.<br>
            Pentru mai multe informații, vizitează dashboard-ul.
          </p>
        </div>
      </div>
    `;

    // Trimite email către fiecare destinatar
    const emailPromises = emails.map(email => 
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Yana AI <noreply@yana-contabila.velcont.com>",
          to: [email],
          subject: `📊 Analiză Financiară - ${companyName} (${analysisDate})`,
          html,
        }),
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent: successCount,
        totalEmails: emails.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in send-analysis-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
