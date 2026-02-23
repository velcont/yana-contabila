import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OptimizationCycle {
  id: string;
  cycle_number: number;
  started_at: string;
  completed_at: string | null;
  phase: string;
  metrics_snapshot: Record<string, number>;
  bottlenecks_detected: Array<{ type: string; severity: string; value: number; threshold: number; description: string }>;
  actions_taken: Array<{ action: string; target: string; confidence: number; auto_applied: boolean; details: string }>;
  meta_score: number;
  meta_adjustments: Record<string, unknown>;
  status: string;
}

interface OptimizerConfig {
  id: string;
  config_key: string;
  config_value: number;
  default_value: number;
  min_value: number;
  max_value: number;
  last_adjusted_by_cycle: number;
}

export function RecursiveOptimizerDashboard() {
  const [cycles, setCycles] = useState<OptimizationCycle[]>([]);
  const [config, setConfig] = useState<OptimizerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [cyclesRes, configRes] = await Promise.all([
      supabase
        .from("yana_optimization_cycles")
        .select("*")
        .order("cycle_number", { ascending: false })
        .limit(30),
      supabase.from("yana_optimizer_config").select("*").order("config_key"),
    ]);

    setCycles((cyclesRes.data as unknown as OptimizationCycle[]) || []);
    setConfig((configRes.data as unknown as OptimizerConfig[]) || []);
    setLoading(false);
  };

  const runOptimizer = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("recursive-optimizer");
      if (error) throw error;
      toast.success(`Ciclu #${data.cycle_number} completat`, {
        description: `${data.bottlenecks_found} bottleneck-uri, ${data.actions_generated} acțiuni, meta_score: ${data.meta_score}`,
      });
      loadData();
    } catch (e: any) {
      toast.error("Eroare la rularea optimizatorului", { description: e.message });
    } finally {
      setRunning(false);
    }
  };

  const saveConfig = async (key: string) => {
    const newVal = parseFloat(editingConfig[key]);
    const cfg = config.find((c) => c.config_key === key);
    if (!cfg || isNaN(newVal)) return;
    if (newVal < cfg.min_value || newVal > cfg.max_value) {
      toast.error(`Valoarea trebuie să fie între ${cfg.min_value} și ${cfg.max_value}`);
      return;
    }
    await supabase.from("yana_optimizer_config").update({ config_value: newVal }).eq("config_key", key);
    toast.success(`${key} actualizat la ${newVal}`);
    setEditingConfig((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    loadData();
  };

  const chartData = [...cycles]
    .reverse()
    .map((c) => ({
      cycle: `#${c.cycle_number}`,
      meta_score: c.meta_score,
      quality: c.metrics_snapshot?.avg_quality_score || 0,
      cost: c.metrics_snapshot?.avg_cost_cents || 0,
    }));

  const latestCycle = cycles[0];
  const latestBottlenecks = latestCycle?.bottlenecks_detected || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔄 Optimizare Recursivă</h2>
          <p className="text-muted-foreground">
            {cycles.length} cicluri completate | Meta-score ultimul ciclu:{" "}
            <strong>{latestCycle?.meta_score?.toFixed(2) ?? "N/A"}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runOptimizer} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Rulează Acum
          </Button>
        </div>
      </div>

      {/* Meta Score Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evoluție Meta-Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cycle" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Line type="monotone" dataKey="meta_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Meta Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Current Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bottleneck-uri Curente ({latestBottlenecks.length})
          </CardTitle>
          <CardDescription>Din ultimul ciclu de optimizare</CardDescription>
        </CardHeader>
        <CardContent>
          {latestBottlenecks.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Niciun bottleneck detectat — performanță optimă!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {latestBottlenecks.map((bn, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={bn.severity === "critical" ? "destructive" : "secondary"}>
                      {bn.severity}
                    </Badge>
                    <div>
                      <p className="font-medium capitalize">{bn.type}</p>
                      <p className="text-sm text-muted-foreground">{bn.description}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>Valoare: <strong>{typeof bn.value === "number" ? bn.value.toFixed(2) : bn.value}</strong></p>
                    <p className="text-muted-foreground">Prag: {bn.threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurație Praguri
          </CardTitle>
          <CardDescription>Pragurile pe care meta-optimizatorul le ajustează automat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.map((cfg) => (
              <div key={cfg.config_key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium font-mono text-sm">{cfg.config_key}</p>
                  <p className="text-xs text-muted-foreground">
                    Default: {cfg.default_value} | Min: {cfg.min_value} | Max: {cfg.max_value}
                    {cfg.last_adjusted_by_cycle > 0 && ` | Ajustat la ciclul #${cfg.last_adjusted_by_cycle}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={editingConfig[cfg.config_key] ?? cfg.config_value}
                    onChange={(e) => setEditingConfig((prev) => ({ ...prev, [cfg.config_key]: e.target.value }))}
                  />
                  {editingConfig[cfg.config_key] !== undefined && (
                    <Button size="sm" onClick={() => saveConfig(cfg.config_key)}>
                      Save
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Cycles */}
      <Card>
        <CardHeader>
          <CardTitle>Istoric Cicluri</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {cycles.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={c.status === "completed" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>
                      #{c.cycle_number}
                    </Badge>
                    <span>{new Date(c.started_at).toLocaleDateString("ro-RO")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{(c.bottlenecks_detected || []).length} bottleneck-uri</span>
                    <span>{(c.actions_taken || []).length} acțiuni</span>
                    <span>Meta: <strong className="text-foreground">{c.meta_score?.toFixed(2)}</strong></span>
                  </div>
                </div>
              ))}
              {cycles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Niciun ciclu încă. Apasă &quot;Rulează Acum&quot; pentru primul ciclu.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
