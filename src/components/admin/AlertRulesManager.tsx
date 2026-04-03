import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

const METRICS = [
  { value: 'ai_cost_daily', label: 'Cost AI zilnic (RON)' },
  { value: 'error_rate', label: 'Rata erori (%)' },
  { value: 'new_users_daily', label: 'Utilizatori noi/zi' },
  { value: 'low_engagement', label: 'Engagement scăzut (conversații/zi)' },
  { value: 'active_users', label: 'Utilizatori activi' },
  { value: 'trial_conversions', label: 'Conversii trial→paid' },
];

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'eq', label: '=' },
];

const SEVERITIES = [
  { value: 'info', label: 'Info', color: 'bg-blue-500' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
}

export function AlertRulesManager() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    metric: 'ai_cost_daily',
    operator: 'gt',
    threshold: '',
    severity: 'warning',
    cooldown_minutes: '60',
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRules(data as unknown as AlertRule[]);
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name || !form.threshold) {
      toast.error('Completează numele și pragul');
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('alert_rules').insert({
      name: form.name,
      metric: form.metric,
      operator: form.operator,
      threshold: parseFloat(form.threshold),
      severity: form.severity,
      cooldown_minutes: parseInt(form.cooldown_minutes),
      created_by: userData.user?.id,
    } as any);
    if (error) {
      toast.error('Eroare la salvare: ' + error.message);
    } else {
      toast.success('Regulă creată!');
      setShowForm(false);
      setForm({ name: '', metric: 'ai_cost_daily', operator: 'gt', threshold: '', severity: 'warning', cooldown_minutes: '60' });
      loadRules();
    }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    await supabase.from('alert_rules').update({ enabled } as any).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
  };

  const deleteRule = async (id: string) => {
    await supabase.from('alert_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Regulă ștearsă');
  };

  const getMetricLabel = (metric: string) => METRICS.find(m => m.value === metric)?.label || metric;
  const getOperatorLabel = (op: string) => OPERATORS.find(o => o.value === op)?.label || op;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Reguli Alerting (Grafana-style)
            </CardTitle>
            <CardDescription>Configurează praguri care declanșează alerte automat</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Regulă nouă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <Card className="border-dashed border-primary/50">
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nume regulă</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Cost AI prea mare" />
                </div>
                <div>
                  <Label>Metrică</Label>
                  <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Operator</Label>
                  <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prag</Label>
                  <Input type="number" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} />
                </div>
                <div>
                  <Label>Severitate</Label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cooldown (min)</Label>
                  <Input type="number" value={form.cooldown_minutes} onChange={e => setForm(f => ({ ...f, cooldown_minutes: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">Salvează regula</Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nicio regulă configurată. Adaugă una pentru a primi alerte automate.
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Switch checked={rule.enabled} onCheckedChange={v => toggleRule(rule.id, v)} />
                  <div>
                    <div className="font-medium text-sm">{rule.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getMetricLabel(rule.metric)} {getOperatorLabel(rule.operator)} {rule.threshold}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.severity === 'critical' ? 'destructive' : rule.severity === 'warning' ? 'secondary' : 'outline'}>
                    {rule.severity}
                  </Badge>
                  {rule.last_triggered_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(rule.last_triggered_at), { locale: ro, addSuffix: true })}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
