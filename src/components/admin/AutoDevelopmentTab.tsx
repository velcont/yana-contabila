import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Sparkles, Zap, RefreshCw, PlayCircle, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";

interface GeneratedAgent {
  id: string;
  agent_slug: string;
  display_name: string;
  description: string | null;
  agent_type: string;
  allowed_tools: string[] | null;
  schedule: string;
  is_active: boolean;
  created_by: string | null;
  creation_reason: string | null;
  execution_count: number | null;
  success_count: number | null;
  last_executed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AgentExecution {
  id: string;
  agent_id: string;
  trigger_source: string | null;
  input_summary: string | null;
  output_summary: string | null;
  success: boolean | null;
  duration_ms: number | null;
  created_at: string;
}

interface TimelineItem {
  id: string;
  ts: string;
  kind: "agent_created" | "agent_executed" | "brain_decision";
  title: string;
  detail: string;
}

export default function AutoDevelopmentTab() {
  const [agents, setAgents] = useState<GeneratedAgent[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [spawning, setSpawning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, execsRes, decisionsRes] = await Promise.all([
        supabase.from("yana_generated_agents").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("yana_agent_executions").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("yana_brain_decisions").select("id, decision_type, to_mode, reasoning, created_at").order("created_at", { ascending: false }).limit(15),
      ]);

      const agentList = (agentsRes.data as GeneratedAgent[]) || [];
      const execList = (execsRes.data as AgentExecution[]) || [];
      setAgents(agentList);
      setExecutions(execList);

      const items: TimelineItem[] = [];
      for (const a of agentList) {
        items.push({
          id: `a-${a.id}`,
          ts: a.created_at,
          kind: "agent_created",
          title: `🆕 Agent angajat: ${a.display_name}`,
          detail: a.creation_reason || "Auto-spawn",
        });
      }
      for (const e of execList) {
        const agent = agentList.find((a) => a.id === e.agent_id);
        items.push({
          id: `e-${e.id}`,
          ts: e.created_at,
          kind: "agent_executed",
          title: `${e.success ? "✅" : "❌"} ${agent?.display_name || "Agent"} a executat`,
          detail: (e.output_summary || e.input_summary || "").slice(0, 120),
        });
      }
      for (const d of (decisionsRes.data || []) as Array<{ id: string; decision_type: string; to_mode: string; reasoning: Record<string, unknown>; created_at: string }>) {
        items.push({
          id: `d-${d.id}`,
          ts: d.created_at,
          kind: "brain_decision",
          title: `🧠 Brain → mod ${d.to_mode}`,
          detail: String((d.reasoning as { description?: string })?.description || d.decision_type),
        });
      }
      items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setTimeline(items.slice(0, 60));
    } catch (err) {
      console.error("AutoDev fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const forceSpawn = async () => {
    setSpawning(true);
    try {
      const resp = await supabase.functions.invoke("yana-agent-spawner", { body: { force: true, source: "manual_admin" } });
      if (resp.error) throw resp.error;
      const spawned = (resp.data as { spawned?: unknown[] })?.spawned || [];
      toast.success(`Spawner: ${spawned.length} agenți noi`, {
        description: spawned.length === 0 ? "Niciun semnal puternic acum" : `Verifică «Hiring Board»`,
      });
      await fetchData();
    } catch (err) {
      toast.error("Eroare la spawner", { description: (err as Error).message });
    } finally {
      setSpawning(false);
    }
  };

  const runAgent = async (slug: string, displayName: string) => {
    try {
      const resp = await supabase.functions.invoke("yana-dynamic-agent", {
        body: { agent_slug: slug, input: "Rulează ciclul tău standard. Raportează ce ai descoperit.", trigger_source: "manual_admin" },
      });
      if (resp.error) throw resp.error;
      toast.success(`${displayName} a rulat`, {
        description: ((resp.data as { output?: string })?.output || "").slice(0, 100),
      });
      await fetchData();
    } catch (err) {
      toast.error("Eroare la execuție", { description: (err as Error).message });
    }
  };

  const totalExecutions = agents.reduce((s, a) => s + (a.execution_count || 0), 0);
  const totalSuccess = agents.reduce((s, a) => s + (a.success_count || 0), 0);
  const successRate = totalExecutions > 0 ? Math.round((totalSuccess / totalExecutions) * 100) : 0;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + Force Spawn */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Sparkles className="w-8 h-8 text-primary mt-1" />
              <div>
                <h3 className="font-bold text-lg">Auto-Dezvoltare YANA</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  YANA detectează singură ce nu știe și își „angajează" agenți AI specializați. Vezi mai jos echipa ei și ce face fiecare.
                </p>
              </div>
            </div>
            <Button onClick={forceSpawn} disabled={spawning} size="sm">
              <Zap className={`w-4 h-4 mr-2 ${spawning ? "animate-pulse" : ""}`} />
              {spawning ? "Caut semnale..." : "Forțează spawn acum"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Agenți angajați</p>
            <p className="text-2xl font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-primary" />{agents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Activi</p>
            <p className="text-2xl font-bold text-green-500">{agents.filter((a) => a.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Execuții totale</p>
            <p className="text-2xl font-bold">{totalExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Success rate</p>
            <p className="text-2xl font-bold flex items-center gap-1"><TrendingUp className="w-5 h-5 text-green-500" />{successRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> Hiring Board — Echipa AI a YANA</CardTitle>
          <CardDescription>Fiecare agent a fost creat autonom de YANA pentru un scop concret.</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded border">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Niciun agent încă</p>
                <p className="text-sm text-muted-foreground">Spawner-ul rulează automat la 6h sau folosește butonul «Forțează spawn acum» ca să vezi ciclul end-to-end.</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {agents.map((a) => {
                  const sr = (a.execution_count || 0) > 0 ? Math.round(((a.success_count || 0) / (a.execution_count || 1)) * 100) : null;
                  return (
                    <div key={a.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{a.display_name}</p>
                            <Badge variant={a.is_active ? "default" : "secondary"} className="text-xs">{a.is_active ? "activ" : "pauză"}</Badge>
                            <Badge variant="outline" className="text-xs">{a.agent_type}</Badge>
                            <Badge variant="outline" className="text-xs">{a.schedule}</Badge>
                          </div>
                          {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => runAgent(a.agent_slug, a.display_name)}>
                          <PlayCircle className="w-3.5 h-3.5 mr-1" /> Rulează
                        </Button>
                      </div>
                      {a.creation_reason && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                          De ce există: {a.creation_reason}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Execuții: <strong className="text-foreground">{a.execution_count || 0}</strong></span>
                        {sr !== null && <span>Success: <strong className="text-foreground">{sr}%</strong></span>}
                        <span>Creat de: <strong className="text-foreground">{a.created_by || "—"}</strong></span>
                        <span>Creat: {format(new Date(a.created_at), "d MMM HH:mm", { locale: ro })}</span>
                        {a.last_executed_at && <span>Ultima rulare: {format(new Date(a.last_executed_at), "d MMM HH:mm", { locale: ro })}</span>}
                      </div>
                      {Array.isArray(a.allowed_tools) && a.allowed_tools.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {a.allowed_tools.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline autonomie</CardTitle>
          <CardDescription>Decizii Brain + agenți creați + execuții, în ordine cronologică.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nicio activitate încă.</p>
            ) : (
              <div className="space-y-1.5">
                {timeline.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-2 rounded border text-sm">
                    <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                      {format(new Date(t.ts), "d MMM HH:mm", { locale: ro })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.title}</p>
                      {t.detail && <p className="text-xs text-muted-foreground truncate">{t.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}