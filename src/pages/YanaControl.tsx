import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Brain, Sparkles, Target, ShieldCheck, Activity, Loader2, Check, X, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

interface AutonomySettings {
  autonomy_level: number;
  max_auto_spend_cents: number;
  categories: Record<string, number>;
}

interface RiskDecision {
  id: string;
  action_type: string;
  action_category: string;
  amount_cents: number;
  risk_score: number;
  user_decision: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

interface ActionVerification {
  id: string;
  action_name: string;
  success: boolean;
  error_message: string | null;
  verified_at: string;
}

interface Intention {
  id: string;
  intention: string;
  progress_pct: number | null;
  status: string;
  priority: number;
}

interface Simulation {
  id: string;
  question: string;
  scenarios: Array<{ label: string; narrative: string; probability: number }>;
  chosen_scenario_index: number;
  reasoning: string;
  created_at: string;
}

export default function YanaControl() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutonomySettings | null>(null);
  const [pending, setPending] = useState<RiskDecision[]>([]);
  const [verifications, setVerifications] = useState<ActionVerification[]>([]);
  const [goals, setGoals] = useState<Intention[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [simQuestion, setSimQuestion] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainTitle, setExplainTitle] = useState("");

  useEffect(() => {
    if (!user) return;
    loadAll();

    const channel = supabase.channel("yana-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "yana_risk_decisions", filter: `user_id=eq.${user.id}` }, loadPending)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "yana_action_verifications", filter: `user_id=eq.${user.id}` }, loadVerifications)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAll = async () => {
    await Promise.all([loadSettings(), loadPending(), loadVerifications(), loadGoals(), loadSimulations()]);
  };

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_or_create_autonomy_settings", { p_user_id: user.id });
    if (data) setSettings(data as AutonomySettings);
  };
  const loadPending = async () => {
    if (!user) return;
    const { data } = await supabase.from("yana_risk_decisions").select("*")
      .eq("user_id", user.id).eq("user_decision", "pending").order("created_at", { ascending: false }).limit(20);
    setPending((data || []) as RiskDecision[]);
  };
  const loadVerifications = async () => {
    if (!user) return;
    const { data } = await supabase.from("yana_action_verifications").select("*")
      .eq("user_id", user.id).order("verified_at", { ascending: false }).limit(20);
    setVerifications((data || []) as ActionVerification[]);
  };
  const loadGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from("yana_intentions").select("id, intention, progress_pct, status, priority")
      .eq("user_id", user.id).eq("status", "active").is("parent_goal_id", null).order("priority", { ascending: true }).limit(10);
    setGoals((data || []) as Intention[]);
  };
  const loadSimulations = async () => {
    if (!user) return;
    const { data } = await supabase.from("yana_simulations").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setSimulations((data || []) as unknown as Simulation[]);
  };

  const updateSettings = async (next: Partial<AutonomySettings>) => {
    if (!user || !settings) return;
    const merged = { ...settings, ...next };
    setSettings(merged);
    await supabase.from("yana_autonomy_settings").update(merged).eq("user_id", user.id);
  };

  const decidePending = async (id: string, decision: "approved" | "rejected") => {
    await supabase.from("yana_risk_decisions").update({
      user_decision: decision, decided_at: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: decision === "approved" ? "Aprobat" : "Respins", description: "Yana a fost notificată." });
    loadPending();
  };

  const runSimulation = async () => {
    if (!user || !simQuestion.trim()) return;
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke("yana-future-engine", {
        body: { user_id: user.id, question: simQuestion, horizon_days: 30 },
      });
      if (error) throw error;
      toast({ title: "Simulare gata", description: data?.reasoning?.slice(0, 100) });
      setSimQuestion("");
      loadSimulations();
    } catch (e) {
      toast({ title: "Eroare", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const explain = async (source: string, recordId: string, title: string) => {
    if (!user) return;
    setExplainTitle(title);
    setExplainText("");
    setExplainOpen(true);
    setExplainLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("yana-decision-explainer", {
        body: { source, record_id: recordId, user_id: user.id },
      });
      if (error) throw error;
      setExplainText(data?.explanation || "Nu am putut genera o explicație.");
    } catch (e) {
      setExplainText("Eroare: " + (e as Error).message);
    } finally {
      setExplainLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const autonomyLabel = (lvl: number) => {
    if (lvl < 25) return "Manual";
    if (lvl < 50) return "Asistat";
    if (lvl < 75) return "Autonom";
    return "Total Autonom";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/yana")}><ArrowLeft className="h-5 w-5" /></Button>
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-bold text-lg">Yana Control Center</h1>
            <p className="text-xs text-muted-foreground">Comanda autonomiei tale cognitive</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Autonomy Dial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Nivel de Autonomie</CardTitle>
            <CardDescription>Cât de mult o lași pe Yana să decidă singură?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings && (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Autonomie globală</span>
                    <Badge variant={settings.autonomy_level > 75 ? "default" : "secondary"}>
                      {settings.autonomy_level}% — {autonomyLabel(settings.autonomy_level)}
                    </Badge>
                  </div>
                  <Slider value={[settings.autonomy_level]} onValueChange={([v]) => updateSettings({ autonomy_level: v })} max={100} step={5} />
                </div>
                <div>
                  <label className="text-sm font-medium">Buget maxim auto-cheltuibil (RON)</label>
                  <Input type="number" value={settings.max_auto_spend_cents / 100}
                    onChange={(e) => updateSettings({ max_auto_spend_cents: Math.max(0, Number(e.target.value) * 100) })}
                    className="mt-1 max-w-xs" />
                  <p className="text-xs text-muted-foreground mt-1">Acțiuni peste această sumă cer confirmare.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(settings.categories).map(([cat, val]) => (
                    <div key={cat}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs capitalize">{cat}</span>
                        <span className="text-xs font-medium">{val}%</span>
                      </div>
                      <Slider value={[val]} onValueChange={([v]) => updateSettings({ categories: { ...settings.categories, [cat]: v } })} max={100} step={5} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="pending">În Așteptare {pending.length > 0 && <Badge variant="destructive" className="ml-2">{pending.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="goals">Obiective</TabsTrigger>
            <TabsTrigger value="simulations">Simulări</TabsTrigger>
            <TabsTrigger value="activity">Activitate</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nicio acțiune în așteptare. Yana decide singură.</CardContent></Card>
            ) : pending.map(p => (
              <Card key={p.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>{p.action_category}</Badge>
                      <span className="font-medium">{p.action_type}</span>
                      {p.amount_cents > 0 && <Badge variant="outline">{(p.amount_cents/100).toFixed(2)} RON</Badge>}
                      <Badge variant={p.risk_score > 60 ? "destructive" : "secondary"}>Risc {p.risk_score}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {String((p.context as { reason?: string })?.reason || JSON.stringify(p.context).slice(0, 120))}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => explain("risk_decision", p.id, `${p.action_type}`)}>
                      <HelpCircle className="h-4 w-4 mr-1" />De ce?
                    </Button>
                    <Button size="sm" variant="default" onClick={() => decidePending(p.id, "approved")}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => decidePending(p.id, "rejected")}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="goals" className="space-y-3 mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Obiective active</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {goals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Niciun obiectiv activ. Spune-i Yanei ce vrei să atingi.</p>
                ) : goals.map(g => (
                  <div key={g.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium truncate flex-1">{g.intention}</span>
                      <span className="text-xs text-muted-foreground ml-2">{g.progress_pct ?? 0}%</span>
                    </div>
                    <Progress value={g.progress_pct ?? 0} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulations" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Future Engine</CardTitle>
                <CardDescription>Întreabă Yana ce s-ar întâmpla dacă... și primește 3 scenarii comparate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={simQuestion} onChange={(e) => setSimQuestion(e.target.value)}
                  placeholder="Ex: Ce se întâmplă dacă angajez 2 oameni în 60 zile?" rows={2} />
                <Button onClick={runSimulation} disabled={simulating || !simQuestion.trim()}>
                  {simulating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Simulează
                </Button>
              </CardContent>
            </Card>
            {simulations.map(s => {
              const chosen = s.scenarios?.[s.chosen_scenario_index];
              return (
                <Card key={s.id}>
                  <CardContent className="py-4 space-y-2">
                    <p className="font-medium text-sm">{s.question}</p>
                    {chosen && (
                      <div className="bg-muted rounded p-3">
                        <Badge className="mb-2 capitalize">{chosen.label} • ales</Badge>
                        <p className="text-sm">{chosen.narrative}</p>
                      </div>
                    )}
                    <p className="text-xs italic text-muted-foreground">De ce: {s.reasoning}</p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Verificări acțiuni (live)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {verifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nicio acțiune verificată recent.</p>
                ) : verifications.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {v.success ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <X className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="truncate">{v.action_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(v.verified_at).toLocaleTimeString("ro-RO")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}