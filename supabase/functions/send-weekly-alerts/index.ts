import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function for delay between batches
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Send emails in batches to respect Resend rate limit (2 req/sec)
async function sendEmailsInBatches<T>(
  items: T[],
  sendFn: (item: T) => Promise<{ success: boolean; email: string; error?: any }>,
  batchSize: number = 2,
  delayMs: number = 1100
): Promise<{ success: boolean; email: string; error?: any }[]> {
  const results: { success: boolean; email: string; error?: any }[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    console.log(`[BATCH] Sending batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
    
    // Send batch in parallel
    const batchResults = await Promise.all(batch.map(item => sendFn(item)));
    results.push(...batchResults);
    
    // Log batch progress
    const batchSuccess = batchResults.filter(r => r.success).length;
    console.log(`[BATCH] Batch ${batchNumber} complete: ${batchSuccess}/${batch.length} successful`);
    
    // Delay between batches (skip after last batch)
    if (i + batchSize < items.length) {
      console.log(`[BATCH] Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }
  
  return results;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting protection (defense-in-depth for public cron endpoint)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`[RATE-LIMIT] Checking rate limit for IP: ${clientIp}`);

    const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: clientIp,
      p_endpoint: 'send-weekly-alerts',
      p_max_requests: 2 // Max 2 requests per minute (cron should call once per week)
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

    console.log('Starting weekly alerts email process');

    // Get updates marked for next email
    const { data: updates, error: updatesError } = await supabase
      .from('app_updates')
      .select('*')
      .eq('include_in_next_email', true)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (updatesError) throw updatesError;

    if (!updates || updates.length === 0) {
      console.log('No updates to send');
      return new Response(
        JSON.stringify({ message: 'No updates to send' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all user emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email');

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log('No users to send emails to');
      return new Response(
        JSON.stringify({ message: 'No users found' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[INFO] Preparing to send emails to ${profiles.length} users for ${updates.length} update(s)`);

    // Build updates HTML
    const updatesHtml = updates.map(update => `
      <div style="background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px;">
        <h3 style="color: #667eea; margin: 0 0 10px 0;">
          ${update.version ? `v${update.version} - ` : ''}${update.title}
        </h3>
        <p style="color: #555; margin: 0;">${update.description}</p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
          ${new Date(update.created_at).toLocaleDateString('ro-RO')}
        </p>
      </div>
    `).join('');

    const emailSubject = `🚀 Noutăți Yana - ${updates.length} ${updates.length === 1 ? 'update nou' : 'update-uri noi'}!`;

    // Function to send a single email
    const sendSingleEmail = async (profile: { email: string }) => {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get("RESEND_FROM_EMAIL") || "Yana Updates <onboarding@resend.dev>",
            to: [profile.email],
            subject: emailSubject,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🚀 Noutăți în Yana!</h1>
                    </div>
                    <div class="content">
                      <p>Bună!</p>
                      
                      <p>Avem vești bune! Am adus îmbunătățiri noi platformei Yana pentru tine:</p>
                      
                      ${updatesHtml}
                      
                      <p style="text-align: center;">
                        <a href="${supabaseUrl.replace('https://ygfsuoloxzjpiulogrjz.supabase.co', 'https://yana-contabila.lovable.app')}" class="button">
                          Explorează Noile Funcționalități
                        </a>
                      </p>
                      
                      <p>Mulțumim că folosești Yana!</p>
                      
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

        // Log successful email
        await supabase.from('email_logs').insert({
          email_type: 'weekly_update',
          recipient_email: profile.email,
          subject: emailSubject,
          status: 'sent',
          metadata: { updates_count: updates.length }
        });

        console.log(`[SUCCESS] Email sent to ${profile.email}`);
        return { success: true, email: profile.email };
      } catch (error: any) {
        console.error(`[ERROR] Failed to send email to ${profile.email}:`, error.message || error);
        
        // Log failed email attempt (fire and forget)
        try {
          await supabase.from('email_logs').insert({
            email_type: 'weekly_update',
            recipient_email: profile.email,
            subject: emailSubject,
            status: 'failed',
            metadata: { error: error.message || 'Unknown error' }
          });
        } catch (logErr) {
          console.error('[LOG ERROR]', logErr);
        }
        
        return { success: false, email: profile.email, error: error.message };
      }
    };

    // Send emails in batches (2 emails per batch, 1.1s delay between batches)
    // This respects Resend's rate limit of 2 requests per second
    console.log(`[INFO] Starting batch email sending (batch size: 2, delay: 1100ms)`);
    const results = await sendEmailsInBatches(profiles, sendSingleEmail, 2, 1100);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Reset include_in_next_email flag for sent updates
    await supabase
      .from('app_updates')
      .update({ include_in_next_email: false })
      .eq('include_in_next_email', true);

    console.log(`[COMPLETE] Sent ${successCount}/${profiles.length} emails successfully, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount}/${profiles.length} emails`,
        success: successCount,
        failed: failedCount,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
