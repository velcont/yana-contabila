import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Activity, Clock, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface AgentTrace {
  id: string;
  trace_id: string;
  agent_name: string;
  input_summary: string | null;
  output_summary: string | null;
  duration_ms: number | null;
  tokens_used: number;
  cost_cents: number;
  parent_trace_id: string | null;
  created_at: string;
}

interface AgentStats {
  name: string;
  totalCalls: number;
  avgDuration: number;
  totalCost: number;
  successRate: number;
}

const AGENT_COLORS: Record<string, string> = {
  "self-reflect": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "yana-observer": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "yana-actor": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "yana-explorer": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "yana-brain": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "memory-manager": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

export function AgentTracesTab() {
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("yana_agent_traces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const typedData = data as unknown as AgentTrace[];
      setTraces(typedData);

      // Calculate stats per agent
      const agentMap = new Map<string, { calls: number; totalDuration: number; totalCost: number; successes: number }>();
      typedData.forEach((t) => {
        const existing = agentMap.get(t.agent_name) || { calls: 0, totalDuration: 0, totalCost: 0, successes: 0 };
        existing.calls++;
        existing.totalDuration += t.duration_ms || 0;
        existing.totalCost += t.cost_cents || 0;
        if (t.output_summary && !t.output_summary.toLowerCase().includes("error")) {
          existing.successes++;
        }
        agentMap.set(t.agent_name, existing);
      });

      const computed: AgentStats[] = Array.from(agentMap.entries()).map(([name, s]) => ({
        name,
        totalCalls: s.calls,
        avgDuration: Math.round(s.totalDuration / s.calls),
        totalCost: s.totalCost,
        successRate: Math.round((s.successes / s.calls) * 100),
      }));
      computed.sort((a, b) => b.totalCalls - a.totalCalls);
      setStats(computed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Agent Traces — Observability
          </h3>
          <p className="text-sm text-muted-foreground">Urmărește apelurile între agenți și performanța lor</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTraces}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Traces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{traces.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Agenți Activi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Durată Medie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {traces.length > 0
                ? `${Math.round(traces.reduce((s, t) => s + (t.duration_ms || 0), 0) / traces.length)}ms`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Cost Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(traces.reduce((s, t) => s + (t.cost_cents || 0), 0) / 100).toFixed(2)} RON
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Stats */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performanță per Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge className={AGENT_COLORS[s.name] || "bg-gray-100 text-gray-800"}>
                      {s.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{s.totalCalls} apeluri</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.avgDuration}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {(s.totalCost / 100).toFixed(2)} RON
                    </span>
                    <span className="flex items-center gap-1">
                      {s.successRate >= 90 ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      {s.successRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Traces Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ultimele Trace-uri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {traces.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-2 rounded border border-border/50 text-sm">
                <Badge variant="outline" className={`text-xs shrink-0 ${AGENT_COLORS[t.agent_name] || ""}`}>
                  {t.agent_name}
                </Badge>
                <div className="flex-1 min-w-0">
                  {t.input_summary && (
                    <p className="text-muted-foreground truncate text-xs">
                      ➡️ {t.input_summary}
                    </p>
                  )}
                  {t.output_summary && (
                    <p className="truncate text-xs">
                      ⬅️ {t.output_summary}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0 text-right">
                  <div>{t.duration_ms}ms</div>
                  <div>{format(new Date(t.created_at), "d MMM HH:mm", { locale: ro })}</div>
                </div>
              </div>
            ))}
            {traces.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Niciun trace înregistrat încă. Agenții vor loga aici automat.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}