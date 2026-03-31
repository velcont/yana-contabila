import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// STEP 1: Email de prezentare + cerere consimțământ (NU comercial)
function generateConsentRequestHtml(companyName: string, optInUrl: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="font-size:28px;color:#1a1a2e;margin:0;">YANA</h1>
        <p style="color:#6c63ff;font-size:14px;margin:4px 0 0;">Companion Strategic AI</p>
      </div>

      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">
        Bună ziua,
      </p>
      
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">
        Mă numesc <strong>YANA</strong> și sunt un companion strategic bazat pe inteligență artificială, creat special pentru antreprenori din România.
      </p>
      
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">
        Am găsit firma dumneavoastră online și m-am gândit că ați putea fi interesat/ă să aflați cum inteligența artificială poate ajuta antreprenorii să ia decizii mai bune.
      </p>

      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:24px;">
        <strong>Doresc să vă respect timpul și intimitatea.</strong> De aceea, vă întreb: ați dori să aflați mai multe despre ce pot face pentru afacerea dumneavoastră?
      </p>
      
      <div style="text-align:center;margin:30px 0;">
        <a href="${optInUrl}" 
           style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4834d4);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;">
          Da, vreau să aflu mai multe →
        </a>
      </div>
      
      <p style="font-size:14px;color:#888;line-height:1.6;margin-top:24px;">
        Dacă nu sunteți interesat/ă, nu trebuie să faceți nimic — nu voi mai trimite emailuri.
      </p>
      
      <p style="font-size:16px;color:#333;margin-top:24px;">
        Cu respect,<br/>
        <strong>YANA</strong>
      </p>
    </div>
    
    <div style="text-align:center;margin-top:24px;padding:0 20px;">
      <p style="font-size:12px;color:#999;line-height:1.6;">
        Acest email a fost trimis o singură dată de YANA, un produs al <a href="https://velcont.com" style="color:#999;">Velcont</a>.<br/>
        Emailul dumneavoastră a fost găsit pe pagina publică a firmei. Nu va fi folosit în alt scop.<br/>
        <a href="${unsubscribeUrl}" style="color:#999;">Nu mai doresc să fiu contactat</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// STEP 2: Email de prezentare completă (doar după opt-in)
function generatePresentationHtml(companyName: string, unsubscribeUrl: string): string {
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
        Mulțumesc că ați acceptat să aflați mai multe! 🎉
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
        Primiți acest email deoarece ați acceptat să aflați mai multe despre YANA.<br/>
        <a href="${unsubscribeUrl}" style="color:#999;">Dezabonează-te</a> dacă nu mai dorești să primești emailuri.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// STEP 3: Email periodic de nurturing (doar pentru opted_in)
function generateNurturingHtml(tipIndex: number, unsubscribeUrl: string): string {
  const tips = [
    {
      subject: "Un sfat rapid de la YANA pentru afacerea ta",
      title: "💡 Știai că...",
      content: "80% dintre antreprenori iau decizii bazate pe intuiție, nu pe date? YANA te ajută să vezi clar ce îți spun cifrele firmei tale — fără jargon contabil.",
    },
    {
      subject: "YANA: Cum să-ți protejezi cash flow-ul",
      title: "🛡️ Cash flow-ul tău e în siguranță?",
      content: "Mulți antreprenori descoperă probleme de lichiditate prea târziu. Cu YANA, primești alerte proactive înainte ca situația să devină critică.",
    },
    {
      subject: "YANA: War Room — simulează scenarii pentru firma ta",
      title: "🎯 War Room: Ia decizii cu încredere",
      content: "Funcția War Room din YANA îți permite să simulezi scenarii financiare (ce-ar fi dacă...?) pentru a lua decizii strategice fără risc.",
    },
  ];

  const tip = tips[tipIndex % tips.length];

  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;color:#1a1a2e;margin:0;">YANA</h1>
      </div>

      <h2 style="font-size:20px;color:#1a1a2e;margin:0 0 16px;">${tip.title}</h2>
      
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:24px;">
        ${tip.content}
      </p>
      
      <div style="text-align:center;margin:24px 0;">
        <a href="https://yana-contabila.velcont.com" 
           style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4834d4);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
          Vorbește cu YANA →
        </a>
      </div>
      
      <p style="font-size:14px;color:#888;margin-top:20px;">— YANA</p>
    </div>
    
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:12px;color:#999;line-height:1.6;">
        <a href="${unsubscribeUrl}" style="color:#999;">Dezabonează-te</a>
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
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'yana@yana-contabila.velcont.com';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let maxEmails = 15;
    let mode = 'auto'; // auto, consent, presentation, nurturing
    try {
      const body = await req.json();
      if (body?.limit) maxEmails = Math.min(body.limit, 20);
      if (body?.mode) mode = body.mode;
    } catch { /* no body */ }

    // Get unsubscribed emails
    const { data: unsubscribed } = await supabase
      .from('outreach_unsubscribes')
      .select('email');
    const unsubscribedSet = new Set((unsubscribed || []).map((u: any) => u.email.toLowerCase()));

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    // PHASE 1: Send consent requests to NEW leads
    if (mode === 'auto' || mode === 'consent') {
      const { data: newLeads } = await supabase
        .from('outreach_leads')
        .select('*')
        .eq('status', 'new')
        .order('created_at', { ascending: true })
        .limit(maxEmails);

      for (const lead of (newLeads || [])) {
        if (unsubscribedSet.has(lead.email.toLowerCase())) {
          await supabase.from('outreach_leads')
            .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
            .eq('id', lead.id);
          skipped++;
          continue;
        }

        const optInUrl = `${supabaseUrl}/functions/v1/unsubscribe-outreach?action=optin&email=${encodeURIComponent(lead.email)}`;
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-outreach?action=unsubscribe&email=${encodeURIComponent(lead.email)}`;
        const htmlContent = generateConsentRequestHtml(lead.company_name, optInUrl, unsubscribeUrl);

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `YANA <${RESEND_FROM_EMAIL}>`,
              to: [lead.email],
              subject: "Pot să vă povestesc despre YANA?",
              html: htmlContent,
            }),
          });
          const data = await res.json();
          if (!res.ok) { errors.push(`${lead.email}: ${JSON.stringify(data)}`); continue; }

          await supabase.from('outreach_leads')
            .update({ status: 'consent_sent', email_sent_at: new Date().toISOString(), email_subject: 'Cerere consimțământ', updated_at: new Date().toISOString() })
            .eq('id', lead.id);
          sent++;
          await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) { errors.push(`${lead.email}: ${e.message}`); }
      }
    }

    // PHASE 2: Send presentation to OPTED-IN leads
    if (mode === 'auto' || mode === 'presentation') {
      const { data: optedInLeads } = await supabase
        .from('outreach_leads')
        .select('*')
        .eq('status', 'opted_in')
        .order('updated_at', { ascending: true })
        .limit(maxEmails - sent);

      for (const lead of (optedInLeads || [])) {
        if (unsubscribedSet.has(lead.email.toLowerCase())) { skipped++; continue; }

        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-outreach?action=unsubscribe&email=${encodeURIComponent(lead.email)}`;
        const htmlContent = generatePresentationHtml(lead.company_name, unsubscribeUrl);

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `YANA <${RESEND_FROM_EMAIL}>`,
              to: [lead.email],
              subject: "Eu sunt YANA — partenerul tău AI de business",
              html: htmlContent,
            }),
          });
          const data = await res.json();
          if (!res.ok) { errors.push(`${lead.email}: ${JSON.stringify(data)}`); continue; }

          await supabase.from('outreach_leads')
            .update({ status: 'presentation_sent', email_sent_at: new Date().toISOString(), email_subject: 'Prezentare YANA', updated_at: new Date().toISOString() })
            .eq('id', lead.id);
          sent++;
          await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) { errors.push(`${lead.email}: ${e.message}`); }
      }
    }

    // PHASE 3: Send nurturing to leads who received presentation (7+ days ago)
    if (mode === 'auto' || mode === 'nurturing') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: nurturingLeads } = await supabase
        .from('outreach_leads')
        .select('*')
        .eq('status', 'presentation_sent')
        .lt('email_sent_at', sevenDaysAgo)
        .order('email_sent_at', { ascending: true })
        .limit(Math.max(0, maxEmails - sent));

      for (const lead of (nurturingLeads || [])) {
        if (unsubscribedSet.has(lead.email.toLowerCase())) { skipped++; continue; }

        const nurturingCount = parseInt(lead.notes || '0');
        if (nurturingCount >= 3) continue; // Max 3 nurturing emails

        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-outreach?action=unsubscribe&email=${encodeURIComponent(lead.email)}`;
        const htmlContent = generateNurturingHtml(nurturingCount, unsubscribeUrl);
        const tips = [
          "Un sfat rapid de la YANA pentru afacerea ta",
          "YANA: Cum să-ți protejezi cash flow-ul",
          "YANA: War Room — simulează scenarii pentru firma ta",
        ];

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `YANA <${RESEND_FROM_EMAIL}>`,
              to: [lead.email],
              subject: tips[nurturingCount % tips.length],
              html: htmlContent,
            }),
          });
          const data = await res.json();
          if (!res.ok) { errors.push(`${lead.email}: ${JSON.stringify(data)}`); continue; }

          await supabase.from('outreach_leads')
            .update({ 
              email_sent_at: new Date().toISOString(), 
              email_subject: tips[nurturingCount % tips.length],
              notes: String(nurturingCount + 1),
              updated_at: new Date().toISOString() 
            })
            .eq('id', lead.id);
          sent++;
          await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) { errors.push(`${lead.email}: ${e.message}`); }
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
