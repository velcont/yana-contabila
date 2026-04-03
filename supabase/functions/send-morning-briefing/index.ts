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

    // Get active users (active subscription or trial)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_status, trial_ends_at, has_free_access')
      .or('subscription_status.eq.active,has_free_access.eq.true')
      .not('email', 'is', null);

    if (usersError) throw usersError;

    const results: { email: string; status: string }[] = [];

    for (const user of users || []) {
      try {
        // 1. Get pending actions
        const { data: actions } = await supabase
          .from('yana_action_items')
          .select('action_text, priority, deadline, category')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('deadline', { ascending: true, nullsFirst: false })
          .limit(5);

        // 2. Get fiscal deadlines (next 7 days)
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const { data: fiscalEvents } = await supabase
          .from('calendar_events')
          .select('title, event_date, description')
          .eq('user_id', user.id)
          .eq('event_type', 'fiscal')
          .gte('event_date', now.toISOString().split('T')[0])
          .lte('event_date', weekLater.toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(5);

        // 3. Get latest analysis summary
        const { data: latestAnalysis } = await supabase
          .from('analyses')
          .select('company_name, created_at, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // 4. Get recent insights
        const { data: insights } = await supabase
          .from('chat_insights')
          .select('title, severity')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(3);

        // Build email
        const firstName = (user.full_name || '').split(' ')[0] || 'CEO';
        const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });

        let actionsHtml = '';
        if (actions && actions.length > 0) {
          const items = actions.map(a => {
            const deadlineStr = a.deadline ? new Date(a.deadline).toLocaleDateString('ro-RO') : '';
            const priorityEmoji = a.priority === 'urgent' ? '🔴' : a.priority === 'high' ? '🟠' : '🟢';
            return `<li>${priorityEmoji} ${a.action_text}${deadlineStr ? ` <span style="color:#888;">(${deadlineStr})</span>` : ''}</li>`;
          }).join('');
          actionsHtml = `<h3 style="color:#1a1a2e;">📋 Acțiuni de făcut</h3><ul>${items}</ul>`;
        }

        let fiscalHtml = '';
        if (fiscalEvents && fiscalEvents.length > 0) {
          const items = fiscalEvents.map(e =>
            `<li>📅 <strong>${e.title}</strong> — ${new Date(e.event_date).toLocaleDateString('ro-RO')}</li>`
          ).join('');
          fiscalHtml = `<h3 style="color:#1a1a2e;">⏰ Termene fiscale (următoarele 7 zile)</h3><ul>${items}</ul>`;
        }

        let insightsHtml = '';
        if (insights && insights.length > 0) {
          const items = insights.map(i => {
            const icon = i.severity === 'critical' ? '🔴' : i.severity === 'warning' ? '⚠️' : '💡';
            return `<li>${icon} ${i.title}</li>`;
          }).join('');
          insightsHtml = `<h3 style="color:#1a1a2e;">🧠 Atenționări</h3><ul>${items}</ul>`;
        }

        let analysisHtml = '';
        if (latestAnalysis && latestAnalysis.length > 0) {
          const a = latestAnalysis[0];
          const meta = a.metadata as Record<string, unknown> || {};
          const profit = meta.profit ? `Profit: ${Number(meta.profit).toLocaleString('ro-RO')} RON` : '';
          const ca = meta.ca ? `Venituri: ${Number(meta.ca).toLocaleString('ro-RO')} RON` : '';
          analysisHtml = `<h3 style="color:#1a1a2e;">📊 Ultima analiză: ${a.company_name || 'N/A'}</h3><p>${[ca, profit].filter(Boolean).join(' | ') || 'Date disponibile în platformă'}</p>`;
        }

        const hasContent = actionsHtml || fiscalHtml || insightsHtml || analysisHtml;
        if (!hasContent) {
          results.push({ email: user.email, status: 'skipped_no_content' });
          continue;
        }

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">☀️ Bună dimineața, ${firstName}!</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">${today}</p>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    ${analysisHtml}
    ${actionsHtml}
    ${fiscalHtml}
    ${insightsHtml}
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.lovable.app/yana" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Deschide YANA →</a>
    </p>
    <p style="text-align: center; color: #888; font-size: 12px; margin-top: 16px;">Acest email este trimis automat de YANA, companion-ul tău de business.</p>
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
            subject: `☀️ Morning Briefing — ${today}`,
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
    console.error('Morning briefing error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
