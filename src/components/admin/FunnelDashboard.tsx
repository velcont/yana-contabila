import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface FunnelStep {
  name: string;
  count: number;
  percent: number;
  dropOff: number;
}

const FUNNEL_EVENTS = [
  { key: 'page_view_landing', label: 'Landing View' },
  { key: 'landing_cta_click', label: 'CTA Click' },
  { key: 'page_view_auth', label: 'Auth Page' },
  { key: 'signup_success', label: 'Signup' },
  { key: 'page_view_yana', label: 'Yana Page' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary) / 0.85)', 'hsl(var(--primary) / 0.7)', 'hsl(var(--primary) / 0.55)', 'hsl(var(--primary) / 0.4)'];

export const FunnelDashboard = () => {
  const [period, setPeriod] = useState('7');
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState('all');

  useEffect(() => {
    fetchFunnelData();
  }, [period, deviceFilter]);

  const fetchFunnelData = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));

    const results: FunnelStep[] = [];

    for (const event of FUNNEL_EVENTS) {
      let query = supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since.toISOString())
        .eq('event_name', event.key);

      if (deviceFilter !== 'all') {
        query = query.ilike('user_agent', deviceFilter === 'mobile' ? '%Mobile%' : '%Mozilla%');
      }

      const { count } = await query;
      const c = count ?? 0;
      const firstCount = results.length === 0 ? c : results[0].count;
      const prevCount = results.length === 0 ? c : results[results.length - 1].count;

      results.push({
        name: event.label,
        count: c,
        percent: firstCount > 0 ? Math.round((c / firstCount) * 100) : 0,
        dropOff: prevCount > 0 ? Math.round(((prevCount - c) / prevCount) * 100) : 0,
      });
    }

    setSteps(results);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">🔍 Funnel Conversie</CardTitle>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 zile</SelectItem>
                <SelectItem value="30">30 zile</SelectItem>
                <SelectItem value="90">90 zile</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={steps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, _: string, props: any) => [
                    `${value} (${props.payload.percent}%)`,
                    'Vizitatori',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {steps.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {steps.map((step, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground mb-1">{step.name}</div>
                  <div className="text-lg font-bold text-foreground">{step.count}</div>
                  {i > 0 && (
                    <div className="text-xs text-destructive">
                      -{step.dropOff}% drop
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
