import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface MetricCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sparkline: number[];
  trend?: string;
  color: string;
}

export function LiveMetricsPanel() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadMetrics = useCallback(async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().slice(0, 7);

    const [activeSessions, aiUsageToday, conversationsToday, trialProfiles, paidProfiles] = await Promise.all([
      supabase.from('active_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('ai_usage').select('estimated_cost_cents').eq('month_year', currentMonth).gte('created_at', todayStr),
      supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'yana_conversation_started').gte('created_at', todayStr),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).not('trial_ends_at', 'is', null),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    ]);

    const costToday = (aiUsageToday.data || []).reduce((sum, r) => sum + (r.estimated_cost_cents || 0), 0) / 100;
    const trialCount = trialProfiles.count || 0;
    const paidCount = paidProfiles.count || 0;
    const convRate = trialCount > 0 ? Math.round((paidCount / trialCount) * 100) : 0;

    // Generate sparkline data (last 7 days placeholder - real data would need aggregation)
    const spark = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10) + 1);

    setMetrics([
      {
        label: 'Utilizatori activi',
        value: activeSessions.count || 0,
        icon: <Users className="h-5 w-5" />,
        sparkline: spark,
        color: '#8884d8',
      },
      {
        label: 'Cost AI azi',
        value: `${costToday.toFixed(2)} RON`,
        icon: <DollarSign className="h-5 w-5" />,
        sparkline: spark.map(v => v * 2),
        color: '#82ca9d',
      },
      {
        label: 'Conversații azi',
        value: conversationsToday.count || 0,
        icon: <MessageSquare className="h-5 w-5" />,
        sparkline: spark.map(v => v * 3),
        color: '#ffc658',
      },
      {
        label: 'Rată conversie',
        value: `${convRate}%`,
        icon: <TrendingUp className="h-5 w-5" />,
        sparkline: spark.map(v => v + 5),
        color: '#ff7300',
      },
    ]);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Metrics (Grafana-style)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Auto-refresh 30s • {lastRefresh.toLocaleTimeString('ro-RO')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{m.icon}</span>
              </div>
              <div className="text-2xl font-bold">{m.value}</div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <div className="h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.sparkline.map((v, j) => ({ v, j }))}>
                    <Line type="monotone" dataKey="v" stroke={m.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
