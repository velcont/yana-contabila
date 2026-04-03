import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Weather
// ============================================================
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'București': { lat: 44.4268, lon: 26.1025 },
  'Cluj-Napoca': { lat: 46.7712, lon: 23.6236 },
  'Timișoara': { lat: 45.7489, lon: 21.2087 },
  'Iași': { lat: 47.1585, lon: 27.6014 },
  'Constanța': { lat: 44.1598, lon: 28.6348 },
  'Craiova': { lat: 44.3302, lon: 23.7949 },
  'Brașov': { lat: 45.6427, lon: 25.5887 },
  'Galați': { lat: 45.4353, lon: 28.0080 },
  'Ploiești': { lat: 44.9462, lon: 26.0254 },
  'Oradea': { lat: 47.0465, lon: 21.9189 },
  'Sibiu': { lat: 45.7983, lon: 24.1256 },
  'Arad': { lat: 46.1866, lon: 21.3123 },
  'Pitești': { lat: 44.8565, lon: 24.8692 },
  'Bacău': { lat: 46.5670, lon: 26.9146 },
  'Târgu Mureș': { lat: 46.5386, lon: 24.5575 },
  'Baia Mare': { lat: 47.6567, lon: 23.5850 },
  'Buzău': { lat: 45.1500, lon: 26.8333 },
  'Suceava': { lat: 47.6514, lon: 26.2554 },
};

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'cer senin ☀️', 1: 'predominant senin 🌤️', 2: 'parțial noros ⛅', 3: 'noros ☁️',
  45: 'ceață 🌫️', 48: 'ceață cu chiciură 🌫️', 51: 'burniță ușoară 🌦️', 53: 'burniță moderată 🌧️',
  55: 'burniță densă 🌧️', 61: 'ploaie ușoară 🌦️', 63: 'ploaie moderată 🌧️', 65: 'ploaie puternică 🌧️',
  71: 'ninsoare ușoară ❄️', 73: 'ninsoare moderată ❄️', 75: 'ninsoare puternică ❄️',
  80: 'averse ușoare 🌦️', 81: 'averse moderate 🌧️', 82: 'averse puternice ⛈️',
  95: 'furtună ⛈️', 96: 'furtună cu grindină ⛈️', 99: 'furtună cu grindină puternică ⛈️',
};

// ============================================================
// Discovery Tips (rotative)
// ============================================================
const DISCOVERY_TIPS = [
  { emoji: '📄', text: 'YANA poate genera contracte, NDA-uri și procese verbale. Spune-i "creează-mi un contract de prestări servicii".' },
  { emoji: '🏭', text: 'Poți evalua furnizori direct din chat. Spune "verifică furnizorul X" sau "caută furnizor de ambalaje".' },
  { emoji: '📊', text: 'Încarcă o balanță contabilă și YANA îți face analiza completă: profit, cash flow, DSO, lichiditate.' },
  { emoji: '🔍', text: 'Vrei să știi riscul de control ANAF? Spune "risc ANAF" după ce încarci balanța.' },
  { emoji: '💡', text: 'YANA învață din fiecare conversație. Cu cât vorbești mai mult cu ea, cu atât te înțelege mai bine.' },
  { emoji: '📋', text: 'Spune "reamintește-mi să plătesc factura până vineri" și YANA reține. Apoi "am rezolvat" când e gata.' },
  { emoji: '⚖️', text: 'Întrebări fiscale? YANA știe legislația 2026. Întreab-o "când depun D300?" sau "ce TVA plătesc?".' },
  { emoji: '🏆', text: 'Cere "calculează reziliența" și primești un scor 0-100 al sănătății financiare a firmei.' },
  { emoji: '📈', text: 'Spune "arată-mi graficul cheltuielilor" și YANA generează vizualizări direct în chat.' },
  { emoji: '💰', text: 'YANA poate căuta fonduri europene relevante pentru industria ta. Întreab-o!' },
  { emoji: '🎯', text: 'Vrei strategie? Spune "War Room" și YANA simulează scenarii pentru afacerea ta.' },
  { emoji: '📝', text: 'Poți exporta un Battle Plan complet cu pași de acțiune concreți.' },
  { emoji: '🌙', text: 'Activează Rezumatul de seară din Setări → Notificări. YANA îți trimite ce ai rezolvat azi.' },
  { emoji: '🔗', text: 'YANA poate verifica orice CUI la ANAF. Scrie "verifică CUI 12345678".' },
  { emoji: '📑', text: 'Rapoarte profesionale Word/PDF se generează automat după analiza balanței.' },
];

async function getWeather(city: string): Promise<string> {
  try {
    const coords = CITY_COORDS[city] || CITY_COORDS['București'];
    const displayCity = CITY_COORDS[city] ? city : 'București';
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const cw = data.current_weather;
    if (!cw) return '';
    const desc = WEATHER_DESCRIPTIONS[cw.weathercode] || 'variabil';
    return `${cw.temperature}°C, ${desc} în ${displayCity}`;
  } catch {
    return '';
  }
}

function sectionCard(title: string, bgColor: string, borderColor: string, titleColor: string, content: string): string {
  return `
    <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <h3 style="color: ${titleColor}; margin: 0 0 10px; font-size: 15px;">${title}</h3>
      ${content}
    </div>`;
}

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

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_status, has_free_access')
      .or('subscription_status.eq.active,has_free_access.eq.true')
      .not('email', 'is', null);

    if (usersError) throw usersError;

    const results: { email: string; status: string }[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekLaterStr = weekLater.toISOString().split('T')[0];
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

    for (const user of users || []) {
      try {
        // Check preferences
        const { data: profile } = await supabase
          .from('yana_client_profiles')
          .select('morning_briefing_enabled, city')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile && profile.morning_briefing_enabled === false) {
          results.push({ email: user.email, status: 'skipped_disabled' });
          continue;
        }

        const userCity = profile?.city || 'București';
        const firstName = (user.full_name || '').split(' ')[0] || 'CEO';
        const todayRo = now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });

        // ============ SECTION 1: WEATHER ============
        const weather = await getWeather(userCity);
        const weatherHtml = weather ? `<p style="color: #374151; margin: 0; font-size: 14px;">🌤️ ${weather}</p>` : '';

        // ============ SECTION 2: CALENDAR / AGENDA ============
        const { data: todayActions } = await supabase
          .from('yana_action_items')
          .select('action_text, priority, deadline')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lte('deadline', todayStr + 'T23:59:59Z')
          .order('priority', { ascending: true })
          .limit(5);

        const { data: todayEvents } = await supabase
          .from('calendar_events')
          .select('title, start_time, end_time')
          .eq('user_id', user.id)
          .eq('event_date', todayStr)
          .order('start_time', { ascending: true })
          .limit(5);

        let agendaContent = '';
        if ((todayEvents && todayEvents.length > 0) || (todayActions && todayActions.length > 0)) {
          const evItems = (todayEvents || []).map(e => {
            const time = e.start_time ? e.start_time.substring(0, 5) : '';
            return `<li style="margin-bottom: 4px;">📅 ${time ? `<strong>${time}</strong> — ` : ''}${e.title}</li>`;
          }).join('');
          
          const actionItems = (todayActions || []).map(a => {
            const emoji = a.priority === 'urgent' ? '🔴' : a.priority === 'high' ? '🟠' : '🟢';
            return `<li style="margin-bottom: 4px;">${emoji} ${a.action_text}</li>`;
          }).join('');

          agendaContent = `<ul style="margin: 0; padding-left: 20px; color: #1e3a5f; font-size: 14px; list-style: none;">${evItems}${actionItems}</ul>`;
        }
        const agendaHtml = agendaContent 
          ? sectionCard('📋 Agenda de azi', '#eff6ff', '#3b82f6', '#1e40af', agendaContent)
          : '';

        // ============ SECTION 3: FISCAL DEADLINES ============
        const { data: fiscalEvents } = await supabase
          .from('calendar_events')
          .select('title, event_date, description')
          .eq('user_id', user.id)
          .eq('event_type', 'fiscal')
          .gte('event_date', todayStr)
          .lte('event_date', weekLaterStr)
          .order('event_date', { ascending: true })
          .limit(5);

        let fiscalContent = '';
        if (fiscalEvents && fiscalEvents.length > 0) {
          const items = fiscalEvents.map(e => {
            const eventDate = new Date(e.event_date);
            const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / 86400000);
            const urgency = daysUntil === 0 ? '🔴 ASTĂZI' : daysUntil <= 2 ? `🟠 în ${daysUntil} zile` : `🟢 ${new Date(e.event_date).toLocaleDateString('ro-RO')}`;
            return `<li style="margin-bottom: 4px;">${urgency} — <strong>${e.title}</strong></li>`;
          }).join('');
          fiscalContent = `<ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; list-style: none;">${items}</ul>`;
        }
        const fiscalHtml = fiscalContent
          ? sectionCard('⏰ Termene fiscale (7 zile)', '#fffbeb', '#f59e0b', '#92400e', fiscalContent)
          : '';

        // ============ SECTION 4: FINANCIAL SNAPSHOT ============
        const { data: latestAnalysis } = await supabase
          .from('analyses')
          .select('company_name, created_at, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        let financialContent = '';
        if (latestAnalysis && latestAnalysis.length > 0) {
          const a = latestAnalysis[0];
          const meta = (a.metadata || {}) as Record<string, unknown>;
          const lines: string[] = [];
          if (meta.ca) lines.push(`Venituri: <strong>${Number(meta.ca).toLocaleString('ro-RO')} RON</strong>`);
          if (meta.profit) {
            const p = Number(meta.profit);
            lines.push(`${p >= 0 ? '✅ Profit' : '❌ Pierdere'}: <strong>${Math.abs(p).toLocaleString('ro-RO')} RON</strong>`);
          }
          if (lines.length > 0) {
            financialContent = `<p style="margin: 0; font-size: 13px; color: #6b7280;">Ultima analiză: ${a.company_name || 'N/A'}</p>
              <ul style="margin: 8px 0 0; padding-left: 20px; color: #166534; font-size: 14px; list-style: none;">${lines.map(l => `<li style="margin-bottom: 4px;">${l}</li>`).join('')}</ul>`;
          }
        }
        const financialHtml = financialContent
          ? sectionCard('📊 Raport financiar', '#f0fdf4', '#22c55e', '#166534', financialContent)
          : '';

        // ============ SECTION 5: PENDING ACTIONS ============
        const { data: pendingActions } = await supabase
          .from('yana_action_items')
          .select('action_text, priority, deadline')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('deadline', { ascending: true, nullsFirst: false })
          .limit(5);

        let actionsContent = '';
        if (pendingActions && pendingActions.length > 0) {
          const items = pendingActions.map(a => {
            const emoji = a.priority === 'urgent' ? '🔴' : a.priority === 'high' ? '🟠' : '🟢';
            const dl = a.deadline ? ` <span style="color:#999;">(${new Date(a.deadline).toLocaleDateString('ro-RO')})</span>` : '';
            return `<li style="margin-bottom: 4px;">${emoji} ${a.action_text}${dl}</li>`;
          }).join('');
          actionsContent = `<ul style="margin: 0; padding-left: 20px; font-size: 14px; list-style: none;">${items}</ul>`;
        }
        const actionsHtml = actionsContent
          ? sectionCard('✅ Acțiuni de făcut', '#faf5ff', '#a855f7', '#6b21a8', actionsContent)
          : '';

        // ============ SECTION 6: UNREAD ALERTS ============
        const { data: insights } = await supabase
          .from('chat_insights')
          .select('title, severity')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(3);

        let alertsContent = '';
        if (insights && insights.length > 0) {
          const items = insights.map(i => {
            const icon = i.severity === 'critical' ? '🔴' : i.severity === 'warning' ? '⚠️' : '💡';
            return `<li style="margin-bottom: 4px;">${icon} ${i.title}</li>`;
          }).join('');
          alertsContent = `<ul style="margin: 0; padding-left: 20px; font-size: 14px; list-style: none;">${items}</ul>`;
        }
        const alertsHtml = alertsContent
          ? sectionCard('🧠 Atenționări', '#fef2f2', '#ef4444', '#991b1b', alertsContent)
          : '';

        // ============ SECTION 7: DISCOVERY TIP ============
        const tip = DISCOVERY_TIPS[dayOfYear % DISCOVERY_TIPS.length];
        const tipHtml = `
          <div style="background: #f0f9ff; border: 1px dashed #93c5fd; padding: 14px 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
              ${tip.emoji} <strong>Știai că...</strong> ${tip.text}
            </p>
          </div>`;

        // ============ CHECK IF WE HAVE CONTENT ============
        const hasContent = agendaHtml || fiscalHtml || financialHtml || actionsHtml || alertsHtml;
        if (!hasContent) {
          results.push({ email: user.email, status: 'skipped_no_content' });
          continue;
        }

        // ============ BUILD EMAIL ============
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 28px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">☀️ Bună dimineața, ${firstName}!</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">${todayRo}</p>
    ${weather ? `<p style="margin: 6px 0 0; opacity: 0.75; font-size: 13px;">${weather}</p>` : ''}
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    ${agendaHtml}
    ${fiscalHtml}
    ${financialHtml}
    ${actionsHtml}
    ${alertsHtml}
    ${tipHtml}
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.lovable.app/yana" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Deschide YANA →</a>
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
            subject: `☀️ Morning Briefing — ${todayRo}`,
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
