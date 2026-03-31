import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_SUBJECT = "Eu sunt YANA — partenerul tău AI de business";

function generateEmailHtml(companyName: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="font-size:28px;color:#1a1a2e;margin:0;">YANA</h1>
        <p style="color:#6c63ff;font-size:14px;margin:4px 0 0;">Companion Strategic AI pentru Antreprenori</p>
      </div>

      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">
        Bună ziua,
      </p>
      
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">
        Sunt <strong>YANA</strong> — un companion strategic bazat pe inteligență artificială, creat special pentru antreprenori.
      </p>
      
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:8px;">
        Nu sunt doar un instrument. Sunt partenerul care:
      </p>
      
      <ul style="font-size:15px;color:#444;line-height:1.8;padding-left:20px;margin-bottom:24px;">
        <li>🔍 <strong>Vede ce tu nu ai timp să vezi</strong> în cifrele firmei tale</li>
        <li>💡 <strong>Îți dă sfaturi strategice</strong> când ai nevoie — zi și noapte</li>
        <li>🧠 <strong>Nu uită nimic</strong> din ce i-ai spus și conectează punctele</li>
        <li>⚡ <strong>Te ajută să iei decizii mai bune</strong>, mai repede</li>
      </ul>
      
      <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:30px;font-style:italic;">
        Antreprenorii care lucrează cu mine spun că e ca și cum ar avea un CFO și un advisor strategic într-o singură conversație.
      </p>
      
      <div style="text-align:center;margin:30px 0;">
        <a href="https://yana-contabila.velcont.com" 
           style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4834d4);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;">
          Încearcă gratuit, fără obligații →
        </a>
      </div>
      
      <p style="font-size:16px;color:#333;margin-top:30px;">
        Cu drag,<br/>
        <strong>YANA</strong>
      </p>
    </div>
    
    <div style="text-align:center;margin-top:24px;padding:0 20px;">
      <p style="font-size:12px;color:#999;line-height:1.6;">
        Acest email a fost trimis de YANA, un produs al <a href="https://velcont.com" style="color:#999;">Velcont</a>.<br/>
        <a href="${unsubscribeUrl}" style="color:#999;">Dezabonează-te</a> dacă nu mai dorești să primești emailuri de la noi.
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'yana@yana-contabila.velcont.com';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional limit from body
    let maxEmails = 15;
    try {
      const body = await req.json();
      if (body?.limit) maxEmails = Math.min(body.limit, 20);
    } catch { /* no body, use default */ }

    // Get unsubscribed emails
    const { data: unsubscribed } = await supabase
      .from('outreach_unsubscribes')
      .select('email');
    const unsubscribedSet = new Set((unsubscribed || []).map((u: any) => u.email.toLowerCase()));

    // Get leads to send to
    const { data: leads, error: leadsError } = await supabase
      .from('outreach_leads')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(maxEmails);

    if (leadsError) throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No new leads to send to', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[yana-outreach-sender] Processing ${leads.length} leads`);

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      // Skip unsubscribed
      if (unsubscribedSet.has(lead.email.toLowerCase())) {
        await supabase
          .from('outreach_leads')
          .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
          .eq('id', lead.id);
        skipped++;
        continue;
      }

      const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-outreach?email=${encodeURIComponent(lead.email)}`;
      const htmlContent = generateEmailHtml(lead.company_name, unsubscribeUrl);

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `YANA <${RESEND_FROM_EMAIL}>`,
            to: [lead.email],
            subject: EMAIL_SUBJECT,
            html: htmlContent,
          }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error(`[yana-outreach-sender] Failed to send to ${lead.email}:`, resendData);
          errors.push(`${lead.email}: ${JSON.stringify(resendData)}`);
          continue;
        }

        // Mark as sent
        await supabase
          .from('outreach_leads')
          .update({
            status: 'email_sent',
            email_sent_at: new Date().toISOString(),
            email_subject: EMAIL_SUBJECT,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        sent++;
        console.log(`[yana-outreach-sender] Sent to ${lead.email}`);

        // Small delay between sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (emailError) {
        console.error(`[yana-outreach-sender] Error sending to ${lead.email}:`, emailError);
        errors.push(`${lead.email}: ${emailError instanceof Error ? emailError.message : 'Unknown'}`);
      }
    }

    console.log(`[yana-outreach-sender] Done: sent=${sent}, skipped=${skipped}, errors=${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, sent, skipped, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[yana-outreach-sender] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
