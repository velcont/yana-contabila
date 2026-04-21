import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Search, Code2, FlaskConical, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const SelfDevelopmentTab = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({ gaps: [], discoveries: [], proposals: [] });

  const load = async () => {
    setLoading(true);
    const [gapsRes, discRes, propRes, settingsRes] = await Promise.all([
      supabase.from('yana_capability_gaps').select('*').order('impact_score', { ascending: false }).limit(15),
      supabase.from('yana_discovery_feed').select('*').order('discovered_at', { ascending: false }).limit(15),
      supabase.from('yana_self_proposals').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('yana_self_dev_settings').select('enabled').limit(1).maybeSingle(),
    ]);
    setStats({ gaps: gapsRes.data || [], discoveries: discRes.data || [], proposals: propRes.data || [] });
    setEnabled(settingsRes.data?.enabled ?? true);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleEnabled = async (val: boolean) => {
    const { error } = await supabase.from('yana_self_dev_settings').update({ enabled: val }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast.error('Eroare la salvare'); else { setEnabled(val); toast.success(val ? 'Self-development activat' : 'Self-development pus pe pauză'); }
  };

  const runFunction = async (fn: string, label: string) => {
    setRunning(fn);
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setRunning(null);
    if (error) toast.error(`${label} eșuat: ${error.message}`);
    else { toast.success(`${label} rulat cu succes`); console.log(`[${fn}]`, data); load(); }
  };

  const statusColor = (s: string) => {
    if (['deployed', 'resolved'].includes(s)) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (['rolled_back', 'rejected', 'ignored'].includes(s)) return 'bg-red-500/20 text-red-700 dark:text-red-400';
    if (['shadow_testing', 'in_progress'].includes(s)) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Brain className="h-6 w-6" /> Self-Development Engine</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">YANA se observă, descoperă unelte, scrie cod nou și testează singură.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">{enabled ? 'Activ' : 'Pauză'}</span>
              <Switch checked={enabled} onCheckedChange={toggleEnabled} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => runFunction('yana-self-diagnose', 'Diagnoză')} disabled={!!running || !enabled} variant="outline" size="sm">
            {running === 'yana-self-diagnose' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            Rulează diagnoză
          </Button>
          <Button onClick={() => runFunction('yana-ecosystem-scout', 'Scout')} disabled={!!running || !enabled} variant="outline" size="sm">
            {running === 'yana-ecosystem-scout' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Scanează GitHub/arxiv
          </Button>
          <Button onClick={() => runFunction('yana-self-coder', 'Self-Coder')} disabled={!!running || !enabled} variant="outline" size="sm">
            {running === 'yana-self-coder' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Code2 className="h-4 w-4 mr-2" />}
            Scrie cod nou
          </Button>
          <Button onClick={() => runFunction('yana-proposal-tester', 'Tester')} disabled={!!running || !enabled} variant="outline" size="sm">
            {running === 'yana-proposal-tester' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Testează propuneri
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Lacune ({stats.gaps.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {stats.gaps.length === 0 && <p className="text-sm text-muted-foreground">Nicio lacună detectată încă. Rulează diagnoza.</p>}
            {stats.gaps.map((g: any) => (
              <div key={g.id} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{g.topic}</span>
                  <Badge className={statusColor(g.status)} variant="outline">{g.status}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{g.description}</p>
                <p className="mt-1 text-muted-foreground">Impact: {(g.impact_score || 0).toFixed(1)} • freq: {g.frequency}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Descoperiri ({stats.discoveries.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {stats.discoveries.length === 0 && <p className="text-sm text-muted-foreground">Nicio descoperire încă. Rulează scout-ul.</p>}
            {stats.discoveries.map((d: any) => (
              <div key={d.id} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">{d.source}</Badge>
                  <span className="text-muted-foreground">★ {(d.relevance_score || 0).toFixed(2)}</span>
                </div>
                <a href={d.url} target="_blank" rel="noopener" className="font-medium hover:underline line-clamp-1">{d.title}</a>
                <p className="text-muted-foreground line-clamp-2 mt-1">{d.ai_evaluation || d.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4" /> Propuneri ({stats.proposals.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {stats.proposals.length === 0 && <p className="text-sm text-muted-foreground">Nicio propunere încă. Rulează self-coder după diagnoză.</p>}
            {stats.proposals.map((p: any) => (
              <div key={p.id} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{p.title}</span>
                  <Badge className={statusColor(p.status)} variant="outline">{p.status}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{p.rationale}</p>
                {p.current_success_rate !== null && (
                  <p className="mt-1 text-muted-foreground">
                    {p.status === 'deployed' ? <CheckCircle2 className="h-3 w-3 inline text-green-600" /> : p.status === 'rolled_back' ? <XCircle className="h-3 w-3 inline text-red-600" /> : null}
                    {' '}Succes: {((p.current_success_rate || 0) * 100).toFixed(0)}% (baseline {((p.baseline_success_rate || 0) * 100).toFixed(0)}%)
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
