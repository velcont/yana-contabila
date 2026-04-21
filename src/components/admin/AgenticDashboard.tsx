import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Beaker,
  Users,
  Zap,
  Target,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Cog,
  Moon
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import AutoDevelopmentTab from "./AutoDevelopmentTab";

// ============= BRAIN TAB COMPONENT =============

interface BrainDecision {
  id: string;
  decision_type: string;
  from_mode: string;
  to_mode: string;
  reasoning: Record<string, unknown>;
  metrics_snapshot: Record<string, unknown>;
  actions_triggered: string[];
  created_at: string;
}

interface Observation {
  id: string;
  observation_type: string;
  learning_potential: number;
  processed: boolean;
  processed_by: string | null;
  created_at: string;
  raw_data: Record<string, unknown>;
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "observe": return <Eye className="w-4 h-4" />;
    case "act": return <Cog className="w-4 h-4" />;
    case "reflect": return <Moon className="w-4 h-4" />;
    default: return <Brain className="w-4 h-4" />;
  }
}

function getModeColor(mode: string) {
  switch (mode) {
    case "observe": return "bg-blue-500";
    case "act": return "bg-amber-500";
    case "reflect": return "bg-purple-500";
    default: return "bg-muted";
  }
}

function BrainTab() {
  const [brainDecisions, setBrainDecisions] = useState<BrainDecision[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [obsStats, setObsStats] = useState({ total: 0, unprocessed: 0, byType: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrainData = async () => {
      setLoading(true);
      try {
        const [decisionsRes, obsRes, unprocessedRes] = await Promise.all([
          supabase
            .from("yana_brain_decisions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("yana_observations")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("yana_observations")
            .select("*", { count: "exact", head: true })
            .eq("processed", false),
        ]);

        setBrainDecisions((decisionsRes.data as BrainDecision[]) || []);
        const obsData = (obsRes.data as Observation[]) || [];
        setObservations(obsData);

        // Aggregate stats
        const byType: Record<string, number> = {};
        for (const o of obsData) {
          byType[o.observation_type] = (byType[o.observation_type] || 0) + 1;
        }
        setObsStats({
          total: obsData.length,
          unprocessed: unprocessedRes.count || 0,
          byType,
        });
      } catch (err) {
        console.error("Brain data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrainData();
  }, []);

  const currentMode = brainDecisions[0]?.to_mode || "observe";

  const triggerBrain = async () => {
    try {
      const resp = await supabase.functions.invoke("yana-brain", { body: {} });
      if (resp.error) throw resp.error;
      toast.success(`Brain: mod ${resp.data?.new_mode}`, {
        description: resp.data?.trigger || "Evaluare completă",
      });
    } catch (err) {
      toast.error("Eroare la triggerarea Brain-ului");
    }
  };

  const triggerActor = async () => {
    try {
      const resp = await supabase.functions.invoke("yana-actor", { body: {} });
      if (resp.error) throw resp.error;
      toast.success(`Actor: ${resp.data?.actions_applied || 0} acțiuni aplicate`, {
        description: `${resp.data?.observations_processed || 0} observații procesate`,
      });
    } catch (err) {
      toast.error("Eroare la triggerarea Actorului");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Current Brain Mode */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getModeColor(currentMode)} text-white`}>
                {getModeIcon(currentMode)}
              </div>
              <div>
                <p className="font-bold text-lg">Mod Curent: {currentMode.toUpperCase()}</p>
                <p className="text-sm text-muted-foreground">
                  {brainDecisions[0]
                    ? `Ultima decizie: ${format(new Date(brainDecisions[0].created_at), "d MMM HH:mm", { locale: ro })}`
                    : "Nicio decizie încă"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={triggerBrain}>
                <Brain className="w-4 h-4 mr-1" /> Brain
              </Button>
              <Button size="sm" variant="outline" onClick={triggerActor}>
                <Cog className="w-4 h-4 mr-1" /> Actor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observation Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Observații Total</p>
            <p className="text-2xl font-bold">{obsStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Neprocesate</p>
            <p className="text-2xl font-bold text-amber-500">{obsStats.unprocessed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Erori Detectate</p>
            <p className="text-2xl font-bold text-destructive">{obsStats.byType["error_detected"] || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Feedback Pozitiv</p>
            <p className="text-2xl font-bold text-green-500">{obsStats.byType["positive_feedback"] || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Brain Decisions History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decizii Brain</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {brainDecisions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nicio decizie încă. Brain-ul va rula automat.</p>
              ) : (
                brainDecisions.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded border">
                    <Badge className={getModeColor(d.to_mode)} >{d.to_mode}</Badge>
                    <span className="text-sm flex-1">{(d.reasoning as Record<string, unknown>)?.description as string || d.decision_type}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "d MMM HH:mm", { locale: ro })}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observații Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {observations.slice(0, 20).map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-2 rounded border">
                  <Badge variant={o.processed ? "secondary" : "default"}>
                    {o.observation_type.replace(/_/g, " ")}
                  </Badge>
                  <Progress value={o.learning_potential * 100} className="h-2 w-16" />
                  <span className="text-xs text-muted-foreground">
                    {(o.learning_potential * 100).toFixed(0)}% LP
                  </span>
                  {o.processed && <span className="text-xs text-muted-foreground">✓ {o.processed_by}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(o.created_at), "d MMM HH:mm", { locale: ro })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface ABExperiment {
  id: string;
  experiment_name: string;
  hypothesis: string;
  status: string;
  category: string;
  variant_a_impressions: number;
  variant_b_impressions: number;
  variant_a_score: number;
  variant_b_score: number;
  statistical_significance: number;
  created_at: string;
}

interface ImprovementDecision {
  id: string;
  decision_type: string;
  trigger_reason: string;
  status: string;
  confidence_score: number;
  created_at: string;
  auto_approved: boolean;
}

interface UserContextEvolution {
  id: string;
  user_id: string;
  user_type: string;
  churn_risk_score: number;
  engagement_velocity: number;
  satisfaction_trend: number;
  captured_at: string;
}

interface CommonRequest {
  id: string;
  request_pattern: string;
  category: string;
  frequency: number;
  unique_users: number;
  is_trending: boolean;
  avg_satisfaction: number;
}

interface AgenticStats {
  activeExperiments: number;
  pendingDecisions: number;
  avgChurnRisk: number;
  trendingRequests: number;
  totalOptimizations: number;
}

export default function AgenticDashboard() {
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [decisions, setDecisions] = useState<ImprovementDecision[]>([]);
  const [userContexts, setUserContexts] = useState<UserContextEvolution[]>([]);
  const [commonRequests, setCommonRequests] = useState<CommonRequest[]>([]);
  const [stats, setStats] = useState<AgenticStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch A/B experiments
      const { data: expData } = await supabase
        .from('yana_ab_experiments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setExperiments((expData as ABExperiment[]) || []);

      // Fetch improvement decisions
      const { data: decData } = await supabase
        .from('yana_improvement_decisions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setDecisions((decData as ImprovementDecision[]) || []);

      // Fetch user context evolution (latest per user)
      const { data: contextData } = await supabase
        .from('yana_user_context_evolution')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(50);
      setUserContexts((contextData as UserContextEvolution[]) || []);

      // Fetch common requests
      const { data: requestData } = await supabase
        .from('yana_common_requests')
        .select('*')
        .order('frequency', { ascending: false })
        .limit(20);
      setCommonRequests((requestData as CommonRequest[]) || []);

      // Calculate stats
      const activeExps = (expData as ABExperiment[])?.filter(e => e.status === 'active').length || 0;
      const pendingDecs = (decData as ImprovementDecision[])?.filter(d => d.status === 'pending').length || 0;
      const avgChurn = (contextData as UserContextEvolution[])?.reduce((acc, c) => acc + (c.churn_risk_score || 0), 0) / ((contextData as UserContextEvolution[])?.length || 1);
      const trending = (requestData as CommonRequest[])?.filter(r => r.is_trending).length || 0;
      const totalOpts = (decData as ImprovementDecision[])?.filter(d => d.status === 'applied').length || 0;

      setStats({
        activeExperiments: activeExps,
        pendingDecisions: pendingDecs,
        avgChurnRisk: avgChurn,
        trendingRequests: trending,
        totalOptimizations: totalOpts,
      });

    } catch (error) {
      console.error('Error fetching agentic data:', error);
      toast.error('Eroare la încărcarea datelor agentice');
    } finally {
      setLoading(false);
    }
  };

  const runFullAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('pattern-analyzer', {
        body: { type: 'run_full_analysis' }
      });

      if (response.error) throw response.error;

      toast.success('Analiză completă finalizată!', {
        description: `${response.data?.proactiveAlerts?.generatedAlerts || 0} alerte generate`
      });

      await fetchData();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Eroare la analiză');
    } finally {
      setAnalyzing(false);
    }
  };

  const approveDecision = async (decisionId: string) => {
    try {
      const { error } = await supabase
        .from('yana_improvement_decisions')
        .update({ 
          status: 'approved', 
          approved_by: 'admin_manual',
          applied_at: new Date().toISOString()
        })
        .eq('id', decisionId);

      if (error) throw error;
      toast.success('Decizie aprobată!');
      await fetchData();
    } catch (error) {
      toast.error('Eroare la aprobare');
    }
  };

  const rejectDecision = async (decisionId: string) => {
    try {
      const { error } = await supabase
        .from('yana_improvement_decisions')
        .update({ status: 'rejected' })
        .eq('id', decisionId);

      if (error) throw error;
      toast.success('Decizie respinsă');
      await fetchData();
    } catch (error) {
      toast.error('Eroare la respingere');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-amber-500';
      case 'applied': return 'bg-blue-500';
      case 'rejected': return 'bg-red-500';
      case 'winner_a': case 'winner_b': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getChurnColor = (score: number) => {
    if (score >= 0.7) return 'text-red-500';
    if (score >= 0.4) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Sistem Agentic YANA
          </h2>
          <p className="text-muted-foreground">
            Auto-îmbunătățire continuă, A/B testing, pattern detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runFullAnalysis} disabled={analyzing} variant="default" size="sm">
            <Zap className={`w-4 h-4 mr-2 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analizez...' : 'Rulează Analiză Completă'}
          </Button>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">A/B Active</p>
                  <p className="text-2xl font-bold">{stats.activeExperiments}</p>
                </div>
                <Beaker className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Decizii Pending</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.pendingDecisions}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Churn Risk</p>
                  <p className={`text-2xl font-bold ${getChurnColor(stats.avgChurnRisk)}`}>
                    {(stats.avgChurnRisk * 100).toFixed(0)}%
                  </p>
                </div>
                <Users className="w-8 h-8 text-muted/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trending</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.trendingRequests}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Optimizări</p>
                  <p className="text-2xl font-bold text-green-500">{stats.totalOptimizations}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="brain" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="brain" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Creier
          </TabsTrigger>
          <TabsTrigger value="autodev" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Auto-Dezvoltare
          </TabsTrigger>
          <TabsTrigger value="experiments" className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Decizii
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilizatori
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Cereri Comune
          </TabsTrigger>
        </TabsList>

        {/* Brain Tab - NEW */}
        <TabsContent value="brain">
          <BrainTab />
        </TabsContent>

        {/* Auto-Development Tab - dovezi că YANA "angajează" agenți AI */}
        <TabsContent value="autodev">
          <AutoDevelopmentTab />
        </TabsContent>

        {/* A/B Experiments Tab */}
        <TabsContent value="experiments">
          <Card>
            <CardHeader>
              <CardTitle>Experimente A/B Active</CardTitle>
              <CardDescription>
                Testare variante de răspuns cu statistici în timp real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {experiments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Niciun experiment activ. Creează unul pentru a testa variante!
                    </p>
                  ) : (
                    experiments.map((exp) => (
                      <Card key={exp.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusColor(exp.status)}>
                                  {exp.status}
                                </Badge>
                                {exp.category && (
                                  <Badge variant="outline">{exp.category}</Badge>
                                )}
                              </div>
                              <p className="font-medium">{exp.experiment_name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {exp.hypothesis}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Varianta A</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={exp.variant_a_score * 100} className="h-2 flex-1" />
                                    <span className="text-sm font-medium">
                                      {(exp.variant_a_score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {exp.variant_a_impressions} impressions
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Varianta B</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={exp.variant_b_score * 100} className="h-2 flex-1" />
                                    <span className="text-sm font-medium">
                                      {(exp.variant_b_score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {exp.variant_b_impressions} impressions
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs text-muted-foreground">
                                  Semnificație statistică:
                                </span>
                                <Progress 
                                  value={exp.statistical_significance * 100} 
                                  className="h-2 w-24"
                                />
                                <span className="text-xs font-medium">
                                  {(exp.statistical_significance * 100).toFixed(0)}%
                                </span>
                                {exp.statistical_significance >= 0.95 && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle>Decizii de Îmbunătățire</CardTitle>
              <CardDescription>
                Decizii propuse de sistem pentru optimizare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {decisions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nicio decizie de îmbunătățire încă. Rulează analiza!
                    </p>
                  ) : (
                    decisions.map((dec) => (
                      <Card key={dec.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusColor(dec.status)}>
                                  {dec.status}
                                </Badge>
                                <Badge variant="outline">{dec.decision_type}</Badge>
                                {dec.auto_approved && (
                                  <Badge variant="secondary">Auto-aprobat</Badge>
                                )}
                              </div>
                              <p className="text-sm">{dec.trigger_reason}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Confidence: {(dec.confidence_score * 100).toFixed(0)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  • {format(new Date(dec.created_at), 'd MMM HH:mm', { locale: ro })}
                                </span>
                              </div>
                            </div>
                            {dec.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => approveDecision(dec.id)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => rejectDecision(dec.id)}
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Evoluție Context Utilizatori</CardTitle>
              <CardDescription>
                Tracking churn risk, engagement, și satisfacție
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {userContexts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nicio evoluție de context încă. Datele vor apărea în curând!
                    </p>
                  ) : (
                    userContexts.map((ctx) => (
                      <Card key={ctx.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                ctx.user_type === 'power_user' ? 'bg-purple-500/20' :
                                ctx.user_type === 'regular' ? 'bg-blue-500/20' : 'bg-gray-500/20'
                              }`}>
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{ctx.user_type}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {ctx.user_id.slice(0, 8)}...
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(ctx.captured_at), 'd MMM HH:mm', { locale: ro })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Churn Risk</p>
                                <p className={`text-lg font-bold ${getChurnColor(ctx.churn_risk_score)}`}>
                                  {(ctx.churn_risk_score * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Engagement</p>
                                <p className="text-lg font-bold">
                                  {ctx.engagement_velocity?.toFixed(1)}/zi
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Satisfacție</p>
                                <div className="flex items-center">
                                  <p className="text-lg font-bold">
                                    {(ctx.satisfaction_trend * 100).toFixed(0)}%
                                  </p>
                                  {ctx.satisfaction_trend > 0.6 ? (
                                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Cereri Comune Detectate</CardTitle>
              <CardDescription>
                Pattern-uri recurente în întrebările utilizatorilor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {commonRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Niciun pattern detectat încă. Rulează analiza!
                    </p>
                  ) : (
                    commonRequests.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{req.category}</Badge>
                                {req.is_trending && (
                                  <Badge className="bg-orange-500">🔥 Trending</Badge>
                                )}
                                <Badge variant="secondary">
                                  {req.frequency}x
                                </Badge>
                              </div>
                              <p className="font-medium">{req.request_pattern}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>{req.unique_users} utilizatori unici</span>
                                <span>•</span>
                                <span>Satisfacție: {(req.avg_satisfaction * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
