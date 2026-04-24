import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Building2, Users, TrendingUp, Activity, MessageSquare, Plus, Flame, Mail, Copy, BarChart3, Target, Camera, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { YanaHomeButton } from "@/components/YanaHomeButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Company { id: string; name: string; cui?: string | null; industry?: string | null; city?: string | null; annual_revenue?: number | null; }
interface Contact { id: string; first_name: string; last_name?: string | null; email?: string | null; phone?: string | null; job_title?: string | null; crm_companies?: { name: string } | null; }
interface Deal { id: string; title: string; value: number; currency: string; status: string; stage_id: string; expected_close_date?: string | null; crm_companies?: { name: string } | null; }
interface Stage { id: string; name: string; display_order: number; color: string; is_won: boolean; is_lost: boolean; }
interface ScoredContact { id: string; first_name: string; last_name?: string | null; email?: string | null; job_title?: string | null; lead_score: number; lead_score_reasons?: string[]; crm_companies?: { name: string } | null; }
interface Template { id: string; name: string; subject: string; body: string; category: string; use_count: number; }
interface ForecastStage { stage_name: string; deal_count: number; total_value: number; weighted_value: number; currency: string; }
interface DuplicateGroup { match_type: string; match_key: string; contact_ids: string[]; count: number; }
interface ActivityFeedItem { id: string; activity_type: string; subject: string; created_at: string; crm_contacts?: { first_name: string; last_name?: string } | null; crm_companies?: { name: string } | null; crm_deals?: { title: string } | null; }
interface TimelineItem { id: string; activity_type: string; subject: string; description?: string | null; created_at: string; completed_at?: string | null; status?: string | null; }

const CRM = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [topLeads, setTopLeads] = useState<ScoredContact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [forecast, setForecast] = useState<ForecastStage[]>([]);
  const [reportMetrics, setReportMetrics] = useState<Record<string, number> | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  useEffect(() => {
    document.title = "CRM YANA — Pipeline conversational AI";
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      // Asigură pipeline default
      const { data: pipelineId } = await supabase.rpc("ensure_default_crm_pipeline", { p_user_id: user.id });

      const [c, p, d, s] = await Promise.all([
        supabase.from("crm_companies").select("*").order("updated_at", { ascending: false }).limit(50),
        supabase.from("crm_contacts").select("*, crm_companies(name)").order("updated_at", { ascending: false }).limit(50),
        supabase.from("crm_deals").select("*, crm_companies(name)").eq("status", "open").order("value", { ascending: false }),
        pipelineId ? supabase.from("crm_pipeline_stages").select("*").eq("pipeline_id", pipelineId).order("display_order") : Promise.resolve({ data: [] as Stage[], error: null }),
      ]);

      setCompanies((c.data || []) as Company[]);
      setContacts((p.data || []) as Contact[]);
      setDeals((d.data || []) as Deal[]);
      setStages((s.data || []) as Stage[]);
      loadAdvanced();
    } catch (err) {
      console.error(err);
      toast.error("Eroare la încărcarea CRM-ului");
    } finally {
      setLoading(false);
    }
  }

  async function loadAdvanced() {
    if (!user) return;
    setAdvancedLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [leads, tpls, fc, rm, dups, feed] = await Promise.all([
        supabase.from("crm_contacts").select("id, first_name, last_name, email, job_title, lead_score, lead_score_reasons, crm_companies(name)").eq("user_id", user.id).order("lead_score", { ascending: false }).limit(20),
        supabase.from("crm_email_templates").select("*").eq("user_id", user.id).order("use_count", { ascending: false }),
        supabase.rpc("crm_forecast_revenue", { p_user_id: user.id }),
        supabase.rpc("crm_report_metrics", { p_user_id: user.id }),
        supabase.rpc("detect_contact_duplicates", { p_user_id: user.id }),
        supabase.from("crm_activities").select("*, crm_contacts(first_name, last_name), crm_companies(name), crm_deals(title)").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      ]);
      setTopLeads((leads.data || []) as ScoredContact[]);
      setTemplates((tpls.data || []) as Template[]);
      setForecast((fc.data || []) as ForecastStage[]);
      setReportMetrics((rm.data || null) as Record<string, number> | null);
      setDuplicates((dups.data || []) as DuplicateGroup[]);
      setActivityFeed((feed.data || []) as ActivityFeedItem[]);
    } catch (e) { console.error(e); }
    finally { setAdvancedLoading(false); }
  }

  async function scoreAllLeads() {
    if (!user) return;
    toast.loading("Calculez scoruri...", { id: "score" });
    const { data: cs } = await supabase.from("crm_contacts").select("*").eq("user_id", user.id);
    let updated = 0;
    for (const c of cs || []) {
      let score = 0;
      const reasons: string[] = [];
      if (c.email) { score += 15; reasons.push("+15 email"); }
      if (c.phone) { score += 10; reasons.push("+10 telefon"); }
      if (c.job_title) {
        const t = String(c.job_title).toLowerCase();
        if (/(ceo|director|owner|fondator|founder|administrator)/.test(t)) { score += 25; reasons.push("+25 decision maker"); }
        else if (/(cfo|cto|coo|vp|head)/.test(t)) { score += 20; reasons.push("+20 C-level"); }
        else { score += 5; reasons.push("+5 job title"); }
      }
      if (c.linkedin_url) { score += 10; reasons.push("+10 LinkedIn"); }
      if (c.company_id) { score += 15; reasons.push("+15 firmă"); }
      const tags = (c.tags as string[]) || [];
      if (tags.includes("VIP") || tags.includes("hot")) { score += 15; reasons.push("+15 VIP"); }
      score = Math.min(100, score);
      await supabase.from("crm_contacts").update({ lead_score: score, lead_score_reasons: reasons }).eq("id", c.id);
      updated++;
    }
    toast.success(`${updated} contacte scorate`, { id: "score" });
    loadAdvanced();
  }

  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <YanaHomeButton />
            <span className="text-muted-foreground">/</span>
            <h1 className="text-lg font-bold">CRM</h1>
          </div>
          <Button onClick={() => navigate("/yana")} variant="default" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Vorbește cu YANA</span>
            <span className="sm:hidden">Chat</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Hero AI hint */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">Y</div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold">CRM-ul tău conversațional</p>
              <p className="text-sm text-muted-foreground">
                Adaugă contacte, creează deal-uri, mută etape — toate prin chat. Spune-i YANA:{" "}
                <em>"Adaugă SC Alpha SRL ca client nou, deal 50.000 RON pentru consultanță fiscală."</em>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Building2} label="Firme" value={companies.length} />
          <StatCard icon={Users} label="Contacte" value={contacts.length} />
          <StatCard icon={TrendingUp} label="Deals active" value={deals.length} />
          <StatCard icon={Activity} label="Pipeline" value={`${(totalPipelineValue / 1000).toFixed(0)}k RON`} />
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="companies">Firme</TabsTrigger>
            <TabsTrigger value="contacts">Contacte</TabsTrigger>
            <TabsTrigger value="leads"><Flame className="w-3 h-3 mr-1" />Scor</TabsTrigger>
            <TabsTrigger value="forecast"><Target className="w-3 h-3 mr-1" />Forecast</TabsTrigger>
            <TabsTrigger value="reports"><BarChart3 className="w-3 h-3 mr-1" />Rapoarte</TabsTrigger>
            <TabsTrigger value="templates"><Mail className="w-3 h-3 mr-1" />Templates</TabsTrigger>
            <TabsTrigger value="duplicates"><Copy className="w-3 h-3 mr-1" />Duplicate</TabsTrigger>
          </TabsList>

          {/* Pipeline Kanban */}
          <TabsContent value="pipeline" className="mt-4">
            {stages.length === 0 ? (
              <EmptyState message="Nu ai încă deal-uri. Cere YANA: 'creează un deal nou'." onCTA={() => navigate("/yana")} />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-3 pb-2" style={{ minWidth: "fit-content" }}>
                  {stages.filter(s => !s.is_lost).map(stage => {
                    const stageDeals = dealsByStage(stage.id);
                    const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                    return (
                      <div key={stage.id} className="w-72 flex-shrink-0">
                        <div className="rounded-lg bg-muted/40 p-3 mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                              <span className="font-semibold text-sm">{stage.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{(stageValue / 1000).toFixed(1)}k RON</p>
                        </div>
                        <div className="space-y-2">
                          {stageDeals.map(deal => (
                            <Card key={deal.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                              <CardContent className="p-3 space-y-1">
                                <p className="font-medium text-sm leading-tight">{deal.title}</p>
                                {deal.crm_companies?.name && <p className="text-xs text-muted-foreground">{deal.crm_companies.name}</p>}
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-sm font-bold text-primary">{deal.value.toLocaleString("ro-RO")} {deal.currency}</span>
                                  {deal.expected_close_date && <span className="text-xs text-muted-foreground">{new Date(deal.expected_close_date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}</span>}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {stageDeals.length === 0 && (
                            <div className="text-xs text-muted-foreground/60 text-center py-4">Niciun deal</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Companies */}
          <TabsContent value="companies" className="mt-4 space-y-2">
            {companies.length === 0 ? (
              <EmptyState message="Nu ai încă firme în CRM. Cere YANA: 'adaugă firma X'." onCTA={() => navigate("/yana")} />
            ) : (
              companies.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.cui && <span>CUI {c.cui}</span>}
                        {c.industry && <span>• {c.industry}</span>}
                        {c.city && <span>• {c.city}</span>}
                      </div>
                    </div>
                    {c.annual_revenue && <Badge variant="outline">{(c.annual_revenue / 1000).toFixed(0)}k RON/an</Badge>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Contacts */}
          <TabsContent value="contacts" className="mt-4 space-y-2">
            {contacts.length === 0 ? (
              <EmptyState message="Nu ai încă contacte. Cere YANA: 'adaugă contactul Ion Popescu'." onCTA={() => navigate("/yana")} />
            ) : (
              contacts.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold truncate">{c.first_name} {c.last_name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {c.job_title && <span>{c.job_title}</span>}
                        {c.crm_companies?.name && <span>• {c.crm_companies.name}</span>}
                        {c.email && <span className="truncate">• {c.email}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* LEAD SCORING */}
          <TabsContent value="leads" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Top contacte după scor AI (0-100). Bazat pe email, telefon, rol, LinkedIn, firmă, activitate.</p>
              <Button size="sm" onClick={scoreAllLeads} disabled={advancedLoading} className="gap-2">
                <Flame className="w-3 h-3" />Recalculează scor
              </Button>
            </div>
            {topLeads.length === 0 ? (
              <EmptyState message="Apasă 'Recalculează scor' pentru a scora contactele tale." onCTA={scoreAllLeads} />
            ) : (
              topLeads.filter(l => l.lead_score > 0).map(l => (
                <Card key={l.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{l.first_name} {l.last_name}</p>
                        {l.crm_companies?.name && <Badge variant="outline" className="text-xs">{l.crm_companies.name}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(l.lead_score_reasons || []).slice(0, 4).map((r, i) => (
                          <span key={i} className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{r}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-2xl font-bold ${l.lead_score >= 70 ? "text-success" : l.lead_score >= 40 ? "text-amber-500" : "text-muted-foreground"}`}>{l.lead_score}</span>
                      <span className="text-[10px] text-muted-foreground">/ 100</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* FORECAST */}
          <TabsContent value="forecast" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Forecast ponderat = valoare deal × probabilitate etapă.</p>
            {forecast.length === 0 ? (
              <EmptyState message="Nu ai încă deal-uri active pentru forecast." onCTA={() => navigate("/yana")} />
            ) : (
              <>
                {forecast.map((f, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{f.stage_name}</p>
                        <Badge variant="secondary">{f.deal_count} deals</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Valoare totală</p>
                          <p className="font-bold">{Number(f.total_value).toLocaleString("ro-RO")} {f.currency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Forecast ponderat</p>
                          <p className="font-bold text-primary">{Math.round(Number(f.weighted_value)).toLocaleString("ro-RO")} {f.currency}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-primary/5 border-primary/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <p className="font-semibold">Forecast total ponderat</p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(forecast.reduce((s, f) => s + Number(f.weighted_value), 0)).toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* REPORTS */}
          <TabsContent value="reports" className="mt-4 space-y-3">
            {!reportMetrics ? (
              <EmptyState message="Nu există date suficiente pentru rapoarte." onCTA={() => navigate("/yana")} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard label="Conversion rate" value={`${reportMetrics.conversion_rate || 0}%`} hint="Won / (Won + Lost)" />
                <MetricCard label="Cycle time mediu" value={`${reportMetrics.avg_cycle_days || 0} zile`} hint="Creare → Won" />
                <MetricCard label="Total câștigat" value={`${Number(reportMetrics.total_won_value || 0).toLocaleString("ro-RO")} RON`} hint="Suma deals won" />
                <MetricCard label="Deal-uri active" value={reportMetrics.open_deals || 0} hint="Status: open" />
                <MetricCard label="Câștigate" value={reportMetrics.won_deals || 0} hint="Status: won" />
                <MetricCard label="Pierdute" value={reportMetrics.lost_deals || 0} hint="Status: lost" />
              </div>
            )}
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Șabloane email refolosibile. Cere YANA: <em>"creează un template de ofertare"</em>.</p>
            {templates.length === 0 ? (
              <EmptyState message="Niciun template. Cere YANA să creeze unul." onCTA={() => navigate("/yana")} />
            ) : (
              templates.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{t.name}</p>
                      <Badge variant="outline" className="text-xs">{t.use_count} utilizări</Badge>
                    </div>
                    <p className="text-sm font-medium text-primary">{t.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* DUPLICATES */}
          <TabsContent value="duplicates" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Contacte detectate ca posibile duplicate (după email sau nume+telefon).</p>
            {duplicates.length === 0 ? (
              <Card className="border-dashed border-success/30">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">✅ Niciun duplicate detectat.</CardContent>
              </Card>
            ) : (
              duplicates.map((g, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={g.match_type === "email" ? "default" : "secondary"}>{g.match_type}</Badge>
                      <span className="text-xs text-muted-foreground">{g.count} duplicate</span>
                    </div>
                    <p className="text-sm font-mono truncate">{g.match_key}</p>
                    <p className="text-xs text-muted-foreground">Cere YANA: <em>"unește duplicatele pentru {g.match_key}"</em></p>
                  </CardContent>
                </Card>
              ))
            )}

            {activityFeed.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Activity feed (ultimele 7 zile)</h3>
                {activityFeed.slice(0, 10).map(a => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
                    <Badge variant="outline" className="text-[10px]">{a.activity_type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.subject}</p>
                      <p className="text-muted-foreground">
                        {a.crm_contacts && `${a.crm_contacts.first_name} ${a.crm_contacts.last_name || ""}`}
                        {a.crm_companies?.name && ` • ${a.crm_companies.name}`}
                        {a.crm_deals?.title && ` • ${a.crm_deals.title}`}
                        {" • "}{new Date(a.created_at).toLocaleString("ro-RO")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4 space-y-1">
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

const MetricCard = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card>
    <CardContent className="p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </CardContent>
  </Card>
);

const EmptyState = ({ message, onCTA }: { message: string; onCTA: () => void }) => (
  <Card className="border-dashed">
    <CardContent className="p-10 flex flex-col items-center text-center space-y-3">
      <Plus className="w-10 h-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      <Button onClick={onCTA} className="gap-2">
        <MessageSquare className="w-4 h-4" />
        Deschide chat-ul YANA
      </Button>
    </CardContent>
  </Card>
);

export default CRM;