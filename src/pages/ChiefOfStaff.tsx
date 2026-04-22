import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Users,
  CheckSquare,
  Sun,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  progress_percent: number;
  category: string | null;
  success_metrics: string | null;
  quarter: string;
}

interface Contact {
  id: string;
  full_name: string;
  role: string | null;
  company: string | null;
  tier: number;
  email: string | null;
  last_interaction_at: string | null;
  recommended_cadence_days: number | null;
  relationship_context: string | null;
}

interface CEOTask {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  due_date: string | null;
  goal_id: string | null;
  contact_id: string | null;
}

const priorityLabel = (p: number) => p === 1 ? "Top" : p === 2 ? "Mediu" : "Secundar";
const priorityColor = (p: number): "destructive" | "default" | "secondary" =>
  p === 1 ? "destructive" : p === 2 ? "default" : "secondary";
const tierLabel = (t: number) => t === 1 ? "Esențial" : t === 2 ? "Important" : "Ocazional";

export default function ChiefOfStaff() {
  const { toast } = useToast();
  const [tab, setTab] = useState("briefing");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<CEOTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<{ active_goals: Goal[]; urgent_tasks: CEOTask[]; stale_contacts: Contact[]; all_tasks_count: number } | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Dialog state
  const [goalDialog, setGoalDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);

  // Form state
  const [goalForm, setGoalForm] = useState({ title: "", description: "", priority: 2, success_metrics: "", category: "" });
  const [contactForm, setContactForm] = useState({ full_name: "", role: "", company: "", tier: 2, email: "", relationship_context: "", recommended_cadence_days: 30 });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: 2, due_date: "", goal_id: "" });

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [g, c, t] = await Promise.all([
      supabase.from("yana_ceo_goals").select("*").order("priority").order("created_at", { ascending: false }),
      supabase.from("yana_ceo_contacts").select("*").order("tier").order("last_interaction_at", { ascending: false, nullsFirst: false }),
      supabase.from("yana_ceo_tasks").select("*").order("status").order("priority").order("due_date"),
    ]);
    setGoals((g.data as Goal[]) || []);
    setContacts((c.data as Contact[]) || []);
    setTasks((t.data as CEOTask[]) || []);
    setLoading(false);
  };

  const generateBriefing = async () => {
    setBriefingLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const activeGoals = goals.filter(g => g.status === "active");
      const urgentTasks = tasks.filter(t => (t.status === "todo" || t.status === "in_progress") && (t.priority === 1 || (t.due_date && t.due_date <= today)));
      const staleContacts = contacts.filter(c => {
        if (c.tier !== 1) return false;
        if (!c.last_interaction_at) return true;
        const days = (Date.now() - new Date(c.last_interaction_at).getTime()) / 86400000;
        return days > (c.recommended_cadence_days || 14);
      }).slice(0, 5);
      setBriefing({
        active_goals: activeGoals,
        urgent_tasks: urgentTasks,
        stale_contacts: staleContacts,
        all_tasks_count: tasks.filter(t => t.status === "todo" || t.status === "in_progress").length,
      });
    } finally {
      setBriefingLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (!loading && tab === "briefing") generateBriefing(); }, [loading, tab, goals, tasks, contacts]);

  const createGoal = async () => {
    if (!goalForm.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("yana_ceo_goals").insert({
      user_id: user.id,
      title: goalForm.title,
      description: goalForm.description || null,
      priority: goalForm.priority,
      success_metrics: goalForm.success_metrics || null,
      category: goalForm.category || null,
    });
    if (error) { toast({ title: "Eroare", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Obiectiv creat" });
    setGoalDialog(false);
    setGoalForm({ title: "", description: "", priority: 2, success_metrics: "", category: "" });
    loadAll();
  };

  const createContact = async () => {
    if (!contactForm.full_name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("yana_ceo_contacts").insert({
      user_id: user.id,
      full_name: contactForm.full_name,
      role: contactForm.role || null,
      company: contactForm.company || null,
      tier: contactForm.tier,
      email: contactForm.email || null,
      relationship_context: contactForm.relationship_context || null,
      recommended_cadence_days: contactForm.recommended_cadence_days,
    });
    if (error) { toast({ title: "Eroare", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contact adăugat" });
    setContactDialog(false);
    setContactForm({ full_name: "", role: "", company: "", tier: 2, email: "", relationship_context: "", recommended_cadence_days: 30 });
    loadAll();
  };

  const createTask = async () => {
    if (!taskForm.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("yana_ceo_tasks").insert({
      user_id: user.id,
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      goal_id: taskForm.goal_id || null,
    });
    if (error) { toast({ title: "Eroare", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Task creat" });
    setTaskDialog(false);
    setTaskForm({ title: "", description: "", priority: 2, due_date: "", goal_id: "" });
    loadAll();
  };

  const completeTask = async (id: string) => {
    await supabase.from("yana_ceo_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    loadAll();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("yana_ceo_goals").delete().eq("id", id);
    loadAll();
  };
  const deleteContact = async (id: string) => {
    await supabase.from("yana_ceo_contacts").delete().eq("id", id);
    loadAll();
  };
  const deleteTask = async (id: string) => {
    await supabase.from("yana_ceo_tasks").delete().eq("id", id);
    loadAll();
  };

  const logInteraction = async (id: string) => {
    await supabase.from("yana_ceo_contacts").update({ last_interaction_at: new Date().toISOString(), is_stale: false }).eq("id", id);
    toast({ title: "Interacțiune înregistrată" });
    loadAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/yana"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chief of Staff</h1>
          <p className="text-muted-foreground text-sm">YANA acționează ca AI Chief of Staff: triază, prioritizează, gestionează relații.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="briefing"><Sun className="h-4 w-4 mr-2" />Briefing</TabsTrigger>
          <TabsTrigger value="goals"><Target className="h-4 w-4 mr-2" />Obiective ({goals.filter(g => g.status === "active").length})</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-4 w-4 mr-2" />Tasks ({tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length})</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 mr-2" />Relații ({contacts.length})</TabsTrigger>
        </TabsList>

        {/* BRIEFING */}
        <TabsContent value="briefing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Briefing-ul de azi</CardTitle>
              <CardDescription>Ce contează cel mai mult acum, prioritizat după obiective.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {briefingLoading || !briefing ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Target className="h-4 w-4" />Obiective active ({briefing.active_goals.length})</h3>
                    {briefing.active_goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nu ai obiective active. <Button variant="link" className="px-1" onClick={() => setTab("goals")}>Adaugă unul</Button></p>
                    ) : (
                      <div className="space-y-2">
                        {briefing.active_goals.slice(0, 3).map(g => (
                          <div key={g.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Badge variant={priorityColor(g.priority)}>{priorityLabel(g.priority)}</Badge>
                              <span className="text-sm font-medium">{g.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{g.progress_percent}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" />Urgente azi ({briefing.urgent_tasks.length})</h3>
                    {briefing.urgent_tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Niciun task urgent.</p>
                    ) : (
                      <div className="space-y-1">
                        {briefing.urgent_tasks.slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                            <span>{t.title}</span>
                            <Button size="sm" variant="ghost" onClick={() => completeTask(t.id)}><CheckCircle2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {briefing.stale_contacts.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Relații stagnante (Tier 1)</h3>
                      <div className="space-y-1">
                        {briefing.stale_contacts.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                            <div>
                              <div className="font-medium">{c.full_name}</div>
                              <div className="text-xs text-muted-foreground">{c.role}{c.company ? ` · ${c.company}` : ""}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => logInteraction(c.id)}>Am vorbit</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GOALS */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Obiectivele tale trimestriale — sursa de adevăr pentru priorități.</p>
            <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Obiectiv nou</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Obiectiv trimestrial</DialogTitle><DialogDescription>Ce vrei să atingi în trimestrul curent.</DialogDescription></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Titlu (ex: Atinge 100k MRR)" value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} />
                  <Textarea placeholder="Descriere" value={goalForm.description} onChange={e => setGoalForm({ ...goalForm, description: e.target.value })} />
                  <Input placeholder="Cum măsori succesul" value={goalForm.success_metrics} onChange={e => setGoalForm({ ...goalForm, success_metrics: e.target.value })} />
                  <Input placeholder="Categorie (Revenue, Product, Team...)" value={goalForm.category} onChange={e => setGoalForm({ ...goalForm, category: e.target.value })} />
                  <Select value={String(goalForm.priority)} onValueChange={v => setGoalForm({ ...goalForm, priority: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Top priority</SelectItem>
                      <SelectItem value="2">Mediu</SelectItem>
                      <SelectItem value="3">Secundar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button onClick={createGoal}>Creează</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {goals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Niciun obiectiv. Adaugă primul tău obiectiv trimestrial.</p>}
            {goals.map(g => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={priorityColor(g.priority)}>{priorityLabel(g.priority)}</Badge>
                        {g.category && <Badge variant="outline">{g.category}</Badge>}
                        <Badge variant={g.status === "achieved" ? "default" : "secondary"}>{g.status}</Badge>
                      </div>
                      <h4 className="font-semibold">{g.title}</h4>
                      {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                      {g.success_metrics && <p className="text-xs text-muted-foreground mt-2">📊 {g.success_metrics}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        <Progress value={g.progress_percent} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{g.progress_percent}%</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Task-uri executive — legate opțional de obiective.</p>
            <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Task nou</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Task nou</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Titlu" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                  <Textarea placeholder="Descriere" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                  <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                  <Select value={String(taskForm.priority)} onValueChange={v => setTaskForm({ ...taskForm, priority: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Top</SelectItem>
                      <SelectItem value="2">Mediu</SelectItem>
                      <SelectItem value="3">Secundar</SelectItem>
                    </SelectContent>
                  </Select>
                  {goals.length > 0 && (
                    <Select value={taskForm.goal_id} onValueChange={v => setTaskForm({ ...taskForm, goal_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Obiectiv asociat (opțional)" /></SelectTrigger>
                      <SelectContent>
                        {goals.filter(g => g.status === "active").map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <DialogFooter><Button onClick={createTask}>Creează</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Niciun task activ.</p>}
            {tasks.filter(t => t.status !== "done" && t.status !== "cancelled").map(t => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Button size="icon" variant="ghost" onClick={() => completeTask(t.id)}><CheckCircle2 className="h-4 w-4" /></Button>
                    <div className="flex-1">
                      <div className="font-medium">{t.title}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={priorityColor(t.priority)} className="text-xs">{priorityLabel(t.priority)}</Badge>
                        {t.due_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{t.due_date}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">CRM personal — relații de aprofundat în timp.</p>
            <Dialog open={contactDialog} onOpenChange={setContactDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Contact nou</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Contact nou</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nume complet" value={contactForm.full_name} onChange={e => setContactForm({ ...contactForm, full_name: e.target.value })} />
                  <Input placeholder="Rol" value={contactForm.role} onChange={e => setContactForm({ ...contactForm, role: e.target.value })} />
                  <Input placeholder="Companie" value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })} />
                  <Input placeholder="Email" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
                  <Textarea placeholder="Context relațional (cum vă cunoașteți, ce e relevant)" value={contactForm.relationship_context} onChange={e => setContactForm({ ...contactForm, relationship_context: e.target.value })} />
                  <Select value={String(contactForm.tier)} onValueChange={v => setContactForm({ ...contactForm, tier: Number(v), recommended_cadence_days: Number(v) === 1 ? 14 : Number(v) === 2 ? 30 : 90 })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tier 1 — Esențial (cadență 14 zile)</SelectItem>
                      <SelectItem value="2">Tier 2 — Important (30 zile)</SelectItem>
                      <SelectItem value="3">Tier 3 — Ocazional (90 zile)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button onClick={createContact}>Adaugă</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-2">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Niciun contact. Adaugă primele relații pe care vrei să le menții.</p>}
            {contacts.map(c => {
              const days = c.last_interaction_at ? Math.floor((Date.now() - new Date(c.last_interaction_at).getTime()) / 86400000) : null;
              const isStale = !c.last_interaction_at || (days !== null && days > (c.recommended_cadence_days || 30));
              return (
                <Card key={c.id} className={isStale && c.tier === 1 ? "border-destructive/50" : ""}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.full_name}</span>
                        <Badge variant={c.tier === 1 ? "destructive" : c.tier === 2 ? "default" : "secondary"} className="text-xs">{tierLabel(c.tier)}</Badge>
                        {isStale && <Badge variant="outline" className="text-xs">Stagnant</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.role}{c.company ? ` · ${c.company}` : ""}</div>
                      {c.last_interaction_at && <div className="text-xs text-muted-foreground mt-1">Ultima interacțiune: {formatDistanceToNow(new Date(c.last_interaction_at), { locale: ro, addSuffix: true })}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => logInteraction(c.id)}>Am vorbit</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteContact(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          💬 <strong>Pro tip:</strong> Întreabă YANA în <Link to="/yana" className="text-primary underline">chat</Link>: "briefing", "obiectivele mele", "cu cine n-am mai vorbit de mult", "task-uri pentru azi" — răspunde direct folosind aceste date.
        </CardContent>
      </Card>
    </div>
  );
}