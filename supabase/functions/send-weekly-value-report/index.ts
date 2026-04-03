import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Yana AI <yana@yana-contabila.velcont.com>';
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get active users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or('subscription_status.eq.active,has_free_access.eq.true')
      .not('email', 'is', null);

    const results: { email: string; status: string }[] = [];

    for (const user of users || []) {
      try {
        // Count conversations this week
        const { count: convCount } = await supabase
          .from('conversation_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo);

        // Count analyses this week
        const { count: analysisCount } = await supabase
          .from('analyses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo);

        // Count completed actions
        const { count: actionsCompleted } = await supabase
          .from('yana_action_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('completed_at', weekAgo);

        // Count documents generated (from action items with generated_doc_url)
        const { count: docsGenerated } = await supabase
          .from('yana_action_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('generated_doc_url', 'is', null)
          .gte('created_at', weekAgo);

        const totalValue = (convCount || 0) + (analysisCount || 0) + (actionsCompleted || 0) + (docsGenerated || 0);
        if (totalValue === 0) {
          results.push({ email: user.email, status: 'skipped_no_activity' });
          continue;
        }

        const firstName = (user.full_name || '').split(' ')[0] || 'CEO';

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">📊 Raport Săptămânal YANA</h1>
    <p style="margin: 8px 0 0; opacity: 0.85;">Săptămâna ${new Date(weekAgo).toLocaleDateString('ro-RO')} — ${new Date().toLocaleDateString('ro-RO')}</p>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    <p>Salut, ${firstName}! Iată ce am realizat împreună săptămâna aceasta:</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${convCount || 0}</div>
        <div style="font-size: 13px; color: #64748b;">Conversații</div>
      </div>
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${analysisCount || 0}</div>
        <div style="font-size: 13px; color: #64748b;">Analize financiare</div>
      </div>
      <div style="background: #fefce8; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">${actionsCompleted || 0}</div>
        <div style="font-size: 13px; color: #64748b;">Acțiuni completate</div>
      </div>
      <div style="background: #fdf4ff; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #9333ea;">${docsGenerated || 0}</div>
        <div style="font-size: 13px; color: #64748b;">Documente generate</div>
      </div>
    </div>

    <p style="color: #475569;">YANA te-a ajutat cu <strong>${totalValue} acțiuni</strong> săptămâna aceasta. Continuă!</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.lovable.app/yana" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Continuă cu YANA →</a>
    </p>
    <p style="text-align: center; color: #888; font-size: 12px; margin-top: 16px;">Acest email este trimis automat vineri de YANA.</p>
  </div>
</body>
</html>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [user.email],
            subject: `📊 YANA: ${totalValue} acțiuni săptămâna aceasta`,
            html,
          }),
        });

        const emailResult = await emailRes.json();
        results.push({ email: user.email, status: emailRes.ok ? 'sent' : `error: ${JSON.stringify(emailResult)}` });
      } catch (userErr: unknown) {
        const msg = userErr instanceof Error ? userErr.message : 'unknown';
        results.push({ email: user.email, status: `error: ${msg}` });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weekly value report error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
