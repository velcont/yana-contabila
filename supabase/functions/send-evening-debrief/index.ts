import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmailFooter } from '../_shared/email-footer.ts';

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

    // Get active users who opted in for evening debrief
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_status, has_free_access')
      .or('subscription_status.eq.active,has_free_access.eq.true')
      .not('email', 'is', null);

    if (usersError) throw usersError;

    const results: { email: string; status: string }[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    for (const user of users || []) {
      try {
        // Check if user has evening debrief enabled
        const { data: profile } = await supabase
          .from('yana_client_profiles')
          .select('evening_debrief_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile && profile.evening_debrief_enabled === false) {
          results.push({ email: user.email, status: 'skipped_disabled' });
          continue;
        }

        // 1. Tasks completed today
        const { data: completedTasks } = await supabase
          .from('yana_action_items')
          .select('action_text, category')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', todayStr + 'T00:00:00Z')
          .lte('completed_at', todayStr + 'T23:59:59Z')
          .limit(10);

        // 2. Tasks postponed today
        const { data: postponedTasks } = await supabase
          .from('yana_action_items')
          .select('action_text, postponed_reason')
          .eq('user_id', user.id)
          .gte('postponed_at', todayStr + 'T00:00:00Z')
          .lte('postponed_at', todayStr + 'T23:59:59Z')
          .limit(10);

        // 3. Pending tasks for tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: tomorrowTasks } = await supabase
          .from('yana_action_items')
          .select('action_text, priority, deadline')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lte('deadline', tomorrowStr + 'T23:59:59Z')
          .order('priority', { ascending: true })
          .limit(5);

        const completedCount = completedTasks?.length || 0;
        const postponedCount = postponedTasks?.length || 0;
        const tomorrowCount = tomorrowTasks?.length || 0;

        // Skip if no content at all
        if (completedCount === 0 && postponedCount === 0 && tomorrowCount === 0) {
          results.push({ email: user.email, status: 'skipped_no_content' });
          continue;
        }

        const firstName = (user.full_name || '').split(' ')[0] || 'CEO';
        const todayRo = today.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });

        // Productivity message
        let productivityMsg = '';
        if (completedCount >= 5) {
          productivityMsg = '🏆 Ai avut o zi extrem de productivă! Merită o pauză bine meritată.';
        } else if (completedCount >= 3) {
          productivityMsg = '👏 Zi bună! Ai bifat sarcini importante. Relaxează-te cu încredere.';
        } else if (completedCount >= 1) {
          productivityMsg = '✅ Progres solid azi. Fiecare pas contează.';
        } else {
          productivityMsg = '🌟 Mâine e o zi nouă, cu noi oportunități. Odihnește-te bine!';
        }

        // Build sections
        let completedHtml = '';
        if (completedTasks && completedTasks.length > 0) {
          const items = completedTasks.map(t => `<li>✅ ${t.action_text}</li>`).join('');
          completedHtml = `
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="color: #166534; margin: 0 0 8px;">Rezolvate azi (${completedCount})</h3>
              <ul style="margin: 0; padding-left: 20px; color: #15803d;">${items}</ul>
            </div>`;
        }

        let postponedHtml = '';
        if (postponedTasks && postponedTasks.length > 0) {
          const items = postponedTasks.map(t => {
            const reason = t.postponed_reason ? ` — ${t.postponed_reason}` : '';
            return `<li>⏳ ${t.action_text}${reason}</li>`;
          }).join('');
          postponedHtml = `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="color: #92400e; margin: 0 0 8px;">Amânate (${postponedCount})</h3>
              <ul style="margin: 0; padding-left: 20px; color: #a16207;">${items}</ul>
            </div>`;
        }

        let tomorrowHtml = '';
        if (tomorrowTasks && tomorrowTasks.length > 0) {
          const items = tomorrowTasks.map(t => {
            const priorityEmoji = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '🟢';
            return `<li>${priorityEmoji} ${t.action_text}</li>`;
          }).join('');
          tomorrowHtml = `
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="color: #1e40af; margin: 0 0 8px;">Pe mâine (${tomorrowCount})</h3>
              <ul style="margin: 0; padding-left: 20px; color: #1d4ed8;">${items}</ul>
            </div>`;
        }

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%); color: white; padding: 28px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">🌙 Bună seara, ${firstName}!</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">${todayRo} — Rezumatul zilei tale</p>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    
    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">${productivityMsg}</p>
    
    ${completedHtml}
    ${postponedHtml}
    ${tomorrowHtml}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.velcont.com/yana" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Deschide YANA →</a>
    </p>
    ${renderEmailFooter({ userId: user.id, emailTypeLabel: 'Rezumatul de seară' })}
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
            subject: `🌙 Rezumatul zilei — ${todayRo}`,
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
    console.error('Evening debrief error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
