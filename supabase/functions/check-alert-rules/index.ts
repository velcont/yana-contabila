import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get active rules
    const { data: rules, error: rulesErr } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('enabled', true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: 'No active rules' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().slice(0, 7);
    const alertsTriggered: string[] = [];

    for (const rule of rules) {
      // Check cooldown
      if (rule.last_triggered_at) {
        const lastTriggered = new Date(rule.last_triggered_at);
        const cooldownMs = (rule.cooldown_minutes || 60) * 60 * 1000;
        if (now.getTime() - lastTriggered.getTime() < cooldownMs) continue;
      }

      let currentValue: number | null = null;

      switch (rule.metric) {
        case 'ai_cost_daily': {
          const { data } = await supabase
            .from('ai_usage')
            .select('estimated_cost_cents')
            .eq('month_year', currentMonth)
            .gte('created_at', todayStr);
          currentValue = (data || []).reduce((sum: number, r: any) => sum + (r.estimated_cost_cents || 0), 0) / 100;
          break;
        }
        case 'error_rate': {
          const { count: total } = await supabase
            .from('ai_usage')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', todayStr);
          const { count: errors } = await supabase
            .from('ai_usage')
            .select('id', { count: 'exact', head: true })
            .eq('success', false)
            .gte('created_at', todayStr);
          currentValue = (total && total > 0) ? ((errors || 0) / total) * 100 : 0;
          break;
        }
        case 'new_users_daily': {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', todayStr);
          currentValue = count || 0;
          break;
        }
        case 'active_users': {
          const { count } = await supabase
            .from('active_sessions')
            .select('id', { count: 'exact', head: true });
          currentValue = count || 0;
          break;
        }
        case 'low_engagement': {
          const { count } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('event_name', 'yana_conversation_started')
            .gte('created_at', todayStr);
          currentValue = count || 0;
          break;
        }
        case 'trial_conversions': {
          const { count: paid } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_status', 'active');
          currentValue = paid || 0;
          break;
        }
        default:
          continue;
      }

      if (currentValue === null) continue;

      let triggered = false;
      switch (rule.operator) {
        case 'gt': triggered = currentValue > rule.threshold; break;
        case 'lt': triggered = currentValue < rule.threshold; break;
        case 'eq': triggered = currentValue === rule.threshold; break;
      }

      if (triggered) {
        // Insert admin alert
        await supabase.from('admin_alerts').insert({
          alert_type: 'rule_triggered',
          severity: rule.severity,
          title: `⚠️ ${rule.name}`,
          description: `Metrica "${rule.metric}" = ${currentValue} (prag: ${rule.operator} ${rule.threshold})`,
          details: { rule_id: rule.id, current_value: currentValue, threshold: rule.threshold },
        });

        // Update last_triggered_at
        await supabase
          .from('alert_rules')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', rule.id);

        alertsTriggered.push(rule.name);
      }
    }

    return new Response(JSON.stringify({
      checked: rules.length,
      triggered: alertsTriggered.length,
      alerts: alertsTriggered,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
