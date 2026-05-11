import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2,
  Activity,
  MessageSquare,
  Plus,
  Flame,
  Camera,
  Clock,
  Menu,
  PanelRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { YanaHomeButton } from "@/components/YanaHomeButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ContactDossierDialog } from "@/components/crm/ContactDossierDialog";
import { CRMChatStream } from "@/components/crm/copilot/CRMChatStream";
import { CRMLeftNav, type CRMView } from "@/components/crm/copilot/CRMLeftNav";
import { CRMContextPanel } from "@/components/crm/copilot/CRMContextPanel";

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
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineContact, setTimelineContact] = useState<Contact | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [importingCard, setImportingCard] = useState(false);
  const [dossierContact, setDossierContact] = useState<Contact | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [lastActivityByContact, setLastActivityByContact] = useState<Record<string, string>>({});
  const [view, setView] = useState<CRMView>("chat");
  const [navOpenMobile, setNavOpenMobile] = useState(false);
  const [contextOpenMobile, setContextOpenMobile] = useState(false);
  // Suggestions injected into chat composer when user clicks an alert
  const [chatSeedSuggestions, setChatSeedSuggestions] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    document.title = "CRM YANA — Copilot conversational";
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
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
      const map: Record<string, string> = {};
      (feed.data || []).forEach((a: any) => {
        const cid = a.contact_id;
        if (cid && !map[cid]) map[cid] = a.created_at;
      });
      setLastActivityByContact(map);
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
      if ((c as any).linkedin_url) { score += 10; reasons.push("+10 LinkedIn"); }
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

  async function openTimeline(contact: Contact) {
    if (!user) return;
    setTimelineContact(contact);
    setTimelineOpen(true);
    setTimelineLoading(true);
    setTimelineItems([]);
    try {
      const { data, error } = await supabase.from("crm_activities")
        .select("id, activity_type, subject, description, created_at, completed_at, status")
        .eq("user_id", user.id).eq("contact_id", contact.id)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setTimelineItems((data || []) as TimelineItem[]);
    } catch (e) {
      toast.error("Nu am putut încărca timeline-ul");
      console.error(e);
    } finally {
      setTimelineLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function importBusinessCard(file: File) {
    if (!user) return;
    setImportingCard(true);
    toast.loading("Yana citește cartea de vizită...", { id: "card" });
    try {
      const dataUrl = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("yana-agent", {
        body: {
          message: "Importă această carte de vizită în CRM.",
          conversation_history: [],
          fileData: { type: "image", dataUrl, hint: "business_card_for_crm_import" },
        },
      });
      if (error) throw error;
      toast.success("Card procesat — verifică Contacte", { id: "card" });
      loadAll();
    } catch (e) {
      toast.error("Eroare la import: " + (e as Error).message, { id: "card" });
    } finally {
      setImportingCard(false);
    }
  }

  // === Derived data ===
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId);

  const now = Date.now();
  const staleDeals = deals.filter(d => d.expected_close_date && new Date(d.expected_close_date).getTime() < now);
  const hotUncontacted = topLeads.filter(l => l.lead_score >= 60 && !lastActivityByContact[l.id]);
  const churnRisk = contacts.filter(c => {
    const last = lastActivityByContact[c.id];
    if (!last) return false;
    return now - new Date(last).getTime() > 30 * 86400000;
  });
  const totalAlerts = staleDeals.length + hotUncontacted.length + churnRisk.length;

  const contextSummary = useMemo(() => ({
    pipelineValue: totalPipelineValue,
    dealsOpen: deals.length,
    contacts: contacts.length,
    staleDeals: staleDeals.length,
    hotUncontacted: hotUncontacted.length,
    churnRisk: churnRisk.length,
    recentActivity: activityFeed.slice(0, 5).map(a => ({
      ts: new Date(a.created_at).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      label: `${a.activity_type} · ${a.subject}`,
    })),
  }), [totalPipelineValue, deals.length, contacts.length, staleDeals.length, hotUncontacted.length, churnRisk.length, activityFeed]);

  function askYana(q: string) {
    setView("chat");
    setNavOpenMobile(false);
    setContextOpenMobile(false);
    setChatSeedSuggestions([q, ...((chatSeedSuggestions || []).filter(s => s !== q))].slice(0, 6));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header — compact */}
      <header className="h-12 flex items-center justify-between border-b border-border px-3 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sheet open={navOpenMobile} onOpenChange={setNavOpenMobile}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden h-8 w-8">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <CRMLeftNav active={view} onSelect={(v) => { setView(v); setNavOpenMobile(false); }} alertCount={totalAlerts} />
            </SheetContent>
          </Sheet>
          <YanaHomeButton />
          <span className="text-muted-foreground text-sm">/</span>
          <h1 className="text-sm font-semibold">CRM Copilot</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <label>
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importBusinessCard(f); e.target.value = ""; }} />
            <Button asChild variant="outline" size="sm" className="gap-1.5 h-8" disabled={importingCard}>
              <span>{importingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}<span className="hidden sm:inline text-xs">Card vizită</span></span>
            </Button>
          </label>
          <Button onClick={() => navigate("/yana")} variant="ghost" size="sm" className="gap-1.5 h-8">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">YANA full</span>
          </Button>
          <Sheet open={contextOpenMobile} onOpenChange={setContextOpenMobile}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden h-8 w-8">
                <PanelRight className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
              <div className="p-2"><CRMContextPanelMobile summary={contextSummary} onAsk={askYana} /></div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main 3-column shell */}
      <div className="flex-1 flex min-h-0">
        {/* Left nav — desktop only */}
        <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-muted/10 shrink-0 overflow-y-auto">
          <CRMLeftNav active={view} onSelect={setView} alertCount={totalAlerts} />
          <div className="px-3 py-3 mt-auto border-t border-border/60 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Firme</span><span className="font-semibold text-foreground">{companies.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contacte</span><span className="font-semibold text-foreground">{contacts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Deals active</span><span className="font-semibold text-foreground">{deals.length}</span>
            </div>
          </div>
        </aside>

        {/* Center */}
        <main className="flex-1 flex flex-col min-w-0">
          {view === "chat" ? (
            <CRMChatStream
              suggestions={chatSeedSuggestions}
              onMutation={loadAll}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
                <ViewHeader title={CRM_VIEW_LABELS[view]} hint={CRM_VIEW_HINTS[view]} onAsk={askYana} />
                {view === "pipeline" && <PipelineView stages={stages} dealsByStage={dealsByStage} totalValue={totalPipelineValue} onAsk={askYana} />}
                {view === "alerts" && <AlertsView staleDeals={staleDeals} hotUncontacted={hotUncontacted} churnRisk={churnRisk} lastActivityByContact={lastActivityByContact} onAsk={askYana} />}
                {view === "companies" && <CompaniesView companies={companies} onAsk={askYana} />}
                {view === "contacts" && <ContactsView contacts={contacts} openTimeline={openTimeline} openDossier={(c) => { setDossierContact(c); setDossierOpen(true); }} onAsk={askYana} />}
                {view === "leads" && <LeadsView topLeads={topLeads} loading={advancedLoading} onScore={scoreAllLeads} onAsk={askYana} />}
                {view === "forecast" && <ForecastView forecast={forecast} onAsk={askYana} />}
                {view === "reports" && <ReportsView metrics={reportMetrics} onAsk={askYana} />}
                {view === "templates" && <TemplatesView templates={templates} onAsk={askYana} />}
                {view === "duplicates" && <DuplicatesView duplicates={duplicates} feed={activityFeed} onAsk={askYana} />}
              </div>
            </div>
          )}
        </main>

        {/* Right context panel — desktop */}
        <CRMContextPanel summary={contextSummary} onAsk={askYana} />
      </div>

      {/* Timeline dialog */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timeline — {timelineContact?.first_name} {timelineContact?.last_name}</DialogTitle>
            <DialogDescription>Toate activitățile ultimelor 100 acțiuni.</DialogDescription>
          </DialogHeader>
          {timelineLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nicio activitate înregistrată.</p>
          ) : (
            <ol className="space-y-2">
              {timelineItems.map(t => (
                <li key={t.id} className="border-l-2 border-primary/40 pl-3 py-1">
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ro-RO")}</p>
                  <p className="text-sm font-medium">{t.subject}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>

      <ContactDossierDialog
        contact={dossierContact as any}
        open={dossierOpen}
        onOpenChange={setDossierOpen}
        onSaved={loadAll}
      />
    </div>
  );
};

// ====== View labels ======
const CRM_VIEW_LABELS: Record<CRMView, string> = {
  chat: "Chat copilot",
  pipeline: "Pipeline",
  alerts: "Alerte proactive",
  companies: "Firme",
  contacts: "Contacte",
  leads: "Scor leads",
  forecast: "Forecast",
  reports: "Rapoarte",
  templates: "Templates email",
  duplicates: "Duplicate & activitate",
};
const CRM_VIEW_HINTS: Record<CRMView, string> = {
  chat: "",
  pipeline: "Toate deal-urile active grupate pe etape.",
  alerts: "YANA monitorizează pipeline-ul și-ți semnalează ce cere atenție.",
  companies: "Companiile din CRM. Cere YANA: 'adaugă firma X'.",
  contacts: "Toate contactele tale. Deschide timeline sau dosar.",
  leads: "Top contacte după scor AI.",
  forecast: "Forecast ponderat = valoare deal × probabilitate etapă.",
  reports: "Indicatori cheie de performanță.",
  templates: "Șabloane email refolosibile.",
  duplicates: "Posibile duplicate + activity feed.",
};

function ViewHeader({ title, hint, onAsk }: { title: string; hint: string; onAsk: (q: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 pb-2 border-b border-border/50">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 h-8 shrink-0" onClick={() => onAsk(`Analizează "${title}" și propune 3 acțiuni.`)}>
        <Sparkles className="w-3.5 h-3.5" /> Întreabă YANA
      </Button>
    </div>
  );
}

function PipelineView({ stages, dealsByStage, totalValue, onAsk }: any) {
  if (stages.length === 0) return <EmptyView message="Nu ai încă deal-uri. Cere YANA: 'creează un deal nou'." onAsk={onAsk} />;
  return (
    <>
      <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3 flex items-center justify-between"><span className="text-sm">Pipeline total</span><span className="font-bold text-primary">{(totalValue / 1000).toFixed(0)}k RON</span></CardContent></Card>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 pb-2" style={{ minWidth: "fit-content" }}>
          {stages.filter((s: any) => !s.is_lost).map((stage: any) => {
            const sd = dealsByStage(stage.id);
            const sv = sd.reduce((s: number, d: any) => s + d.value, 0);
            return (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="rounded-lg bg-muted/40 p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="font-semibold text-sm">{stage.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{sd.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{(sv / 1000).toFixed(1)}k RON</p>
                </div>
                <div className="space-y-2">
                  {sd.map((deal: any) => (
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
                  {sd.length === 0 && <div className="text-xs text-muted-foreground/60 text-center py-4">Niciun deal</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function AlertsView({ staleDeals, hotUncontacted, churnRisk, lastActivityByContact, onAsk }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" />Deal-uri în pericol ({staleDeals.length})</h3>
        {staleDeals.length === 0
          ? <Card className="border-dashed border-success/30"><CardContent className="p-4 text-center text-xs text-muted-foreground">Niciun deal cu termen depășit.</CardContent></Card>
          : staleDeals.slice(0, 10).map((d: any) => (
            <Card key={d.id} className="mb-2 border-destructive/30"><CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-medium text-sm truncate">{d.title}</p><p className="text-xs text-muted-foreground truncate">{d.crm_companies?.name || "—"} · termen {new Date(d.expected_close_date).toLocaleDateString("ro-RO")}</p></div>
              <Badge variant="destructive" className="shrink-0">{d.value.toLocaleString("ro-RO")} {d.currency}</Badge>
            </CardContent></Card>
          ))}
      </div>
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Flame className="w-4 h-4 text-amber-500" />Lead-uri fierbinți necontactate ({hotUncontacted.length})</h3>
        {hotUncontacted.length === 0
          ? <Card className="border-dashed"><CardContent className="p-4 text-center text-xs text-muted-foreground">Toate lead-urile fierbinți au fost atinse.</CardContent></Card>
          : hotUncontacted.slice(0, 10).map((l: any) => (
            <Card key={l.id} className="mb-2 border-amber-500/30"><CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-medium text-sm truncate">{l.first_name} {l.last_name}</p><p className="text-xs text-muted-foreground truncate">{l.crm_companies?.name || l.email || l.job_title || "—"}</p></div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-amber-500 text-white">scor {l.lead_score}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAsk(`Scrie un follow-up scurt pentru ${l.first_name} ${l.last_name || ""} (${l.crm_companies?.name || l.email || ""}).`)}>
                  <Sparkles className="w-3 h-3" /> Follow-up
                </Button>
              </div>
            </CardContent></Card>
          ))}
      </div>
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-muted-foreground" />Risc de churn — fără contact 30+ zile ({churnRisk.length})</h3>
        {churnRisk.length === 0
          ? <Card className="border-dashed"><CardContent className="p-4 text-center text-xs text-muted-foreground">Toți clienții activi au interacționat recent.</CardContent></Card>
          : churnRisk.slice(0, 10).map((c: any) => (
            <Card key={c.id} className="mb-2"><CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-medium text-sm truncate">{c.first_name} {c.last_name}</p><p className="text-xs text-muted-foreground truncate">{c.crm_companies?.name || c.email || "—"} · ultima activitate {new Date(lastActivityByContact[c.id]).toLocaleDateString("ro-RO")}</p></div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAsk(`Propune o reactivare pentru ${c.first_name} ${c.last_name || ""}.`)}><Sparkles className="w-3 h-3" />Reactivare</Button>
            </CardContent></Card>
          ))}
      </div>
    </div>
  );
}

function CompaniesView({ companies, onAsk }: any) {
  if (companies.length === 0) return <EmptyView message="Nu ai încă firme. Cere YANA: 'adaugă firma X'." onAsk={onAsk} />;
  return (<div className="space-y-2">{companies.map((c: any) => (
    <Card key={c.id}><CardContent className="p-4 flex items-center justify-between">
      <div className="space-y-1"><p className="font-semibold">{c.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {c.cui && <span>CUI {c.cui}</span>}{c.industry && <span>· {c.industry}</span>}{c.city && <span>· {c.city}</span>}
        </div>
      </div>
      {c.annual_revenue && <Badge variant="outline">{(c.annual_revenue / 1000).toFixed(0)}k RON/an</Badge>}
    </CardContent></Card>
  ))}</div>);
}

function ContactsView({ contacts, openTimeline, openDossier, onAsk }: any) {
  if (contacts.length === 0) return <EmptyView message="Nu ai încă contacte. Cere YANA: 'adaugă contactul Ion Popescu'." onAsk={onAsk} />;
  return (<div className="space-y-2">{contacts.map((c: any) => (
    <Card key={c.id}><CardContent className="p-4 flex items-center justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <p className="font-semibold truncate">{c.first_name} {c.last_name}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {c.job_title && <span>{c.job_title}</span>}{c.crm_companies?.name && <span>· {c.crm_companies.name}</span>}{c.email && <span className="truncate">· {c.email}</span>}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="gap-1 shrink-0 h-8" onClick={() => openTimeline(c)}><Clock className="w-3 h-3" />Timeline</Button>
      <Button size="sm" variant="outline" className="gap-1 shrink-0 h-8" onClick={() => openDossier(c)}>📁 Dosar</Button>
    </CardContent></Card>
  ))}</div>);
}

function LeadsView({ topLeads, loading, onScore, onAsk }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Top contacte după scor AI (0-100).</p>
        <Button size="sm" onClick={onScore} disabled={loading} className="gap-2"><Flame className="w-3 h-3" />Recalculează scor</Button>
      </div>
      {topLeads.length === 0
        ? <EmptyView message="Apasă 'Recalculează scor' pentru a scora contactele tale." onAsk={onAsk} />
        : topLeads.filter((l: any) => l.lead_score > 0).map((l: any) => (
          <Card key={l.id}><CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="font-semibold truncate">{l.first_name} {l.last_name}</p>{l.crm_companies?.name && <Badge variant="outline" className="text-xs">{l.crm_companies.name}</Badge>}</div>
              <div className="flex flex-wrap gap-1">{(l.lead_score_reasons || []).slice(0, 4).map((r: string, i: number) => (
                <span key={i} className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{r}</span>
              ))}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-2xl font-bold ${l.lead_score >= 70 ? "text-success" : l.lead_score >= 40 ? "text-amber-500" : "text-muted-foreground"}`}>{l.lead_score}</span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </CardContent></Card>
        ))}
    </div>
  );
}

function ForecastView({ forecast, onAsk }: any) {
  if (forecast.length === 0) return <EmptyView message="Nu ai încă deal-uri active pentru forecast." onAsk={onAsk} />;
  return (
    <div className="space-y-3">
      {forecast.map((f: any, i: number) => (
        <Card key={i}><CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between"><p className="font-semibold">{f.stage_name}</p><Badge variant="secondary">{f.deal_count} deals</Badge></div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Valoare totală</p><p className="font-bold">{Number(f.total_value).toLocaleString("ro-RO")} {f.currency}</p></div>
            <div><p className="text-xs text-muted-foreground">Forecast ponderat</p><p className="font-bold text-primary">{Math.round(Number(f.weighted_value)).toLocaleString("ro-RO")} {f.currency}</p></div>
          </div>
        </CardContent></Card>
      ))}
      <Card className="bg-primary/5 border-primary/30"><CardContent className="p-4 flex items-center justify-between">
        <p className="font-semibold">Forecast total ponderat</p>
        <p className="text-2xl font-bold text-primary">{Math.round(forecast.reduce((s: number, f: any) => s + Number(f.weighted_value), 0)).toLocaleString("ro-RO")} RON</p>
      </CardContent></Card>
    </div>
  );
}

function ReportsView({ metrics, onAsk }: any) {
  if (!metrics) return <EmptyView message="Nu există date suficiente pentru rapoarte." onAsk={onAsk} />;
  const Card2 = ({ label, value, hint }: any) => (
    <Card><CardContent className="p-4 space-y-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p>{hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}</CardContent></Card>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Card2 label="Conversion rate" value={`${metrics.conversion_rate || 0}%`} hint="Won / (Won + Lost)" />
      <Card2 label="Cycle time mediu" value={`${metrics.avg_cycle_days || 0} zile`} hint="Creare → Won" />
      <Card2 label="Total câștigat" value={`${Number(metrics.total_won_value || 0).toLocaleString("ro-RO")} RON`} hint="Suma deals won" />
      <Card2 label="Deal-uri active" value={metrics.open_deals || 0} hint="Status: open" />
      <Card2 label="Câștigate" value={metrics.won_deals || 0} hint="Status: won" />
      <Card2 label="Pierdute" value={metrics.lost_deals || 0} hint="Status: lost" />
    </div>
  );
}

function TemplatesView({ templates, onAsk }: any) {
  if (templates.length === 0) return <EmptyView message="Niciun template. Cere YANA să creeze unul." onAsk={onAsk} />;
  return (<div className="space-y-3">{templates.map((t: any) => (
    <Card key={t.id}><CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between"><p className="font-semibold">{t.name}</p><Badge variant="outline" className="text-xs">{t.use_count} utilizări</Badge></div>
      <p className="text-sm font-medium text-primary">{t.subject}</p>
      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
    </CardContent></Card>
  ))}</div>);
}

function DuplicatesView({ duplicates, feed, onAsk }: any) {
  return (
    <div className="space-y-3">
      {duplicates.length === 0
        ? <Card className="border-dashed border-success/30"><CardContent className="p-8 text-center text-sm text-muted-foreground">Niciun duplicate detectat.</CardContent></Card>
        : duplicates.map((g: any, i: number) => (
          <Card key={i}><CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between"><Badge variant={g.match_type === "email" ? "default" : "secondary"}>{g.match_type}</Badge><span className="text-xs text-muted-foreground">{g.count} duplicate</span></div>
            <p className="text-sm font-mono truncate">{g.match_key}</p>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAsk(`Unește duplicatele pentru ${g.match_key}.`)}><Sparkles className="w-3 h-3" />Unește cu YANA</Button>
          </CardContent></Card>
        ))}
      {feed.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Activity feed (ultimele 7 zile)</h3>
          {feed.slice(0, 10).map((a: any) => (
            <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
              <Badge variant="outline" className="text-[10px]">{a.activity_type}</Badge>
              <div className="flex-1 min-w-0"><p className="font-medium truncate">{a.subject}</p>
                <p className="text-muted-foreground">
                  {a.crm_contacts && `${a.crm_contacts.first_name} ${a.crm_contacts.last_name || ""}`}
                  {a.crm_companies?.name && ` · ${a.crm_companies.name}`}
                  {a.crm_deals?.title && ` · ${a.crm_deals.title}`}
                  {" · "}{new Date(a.created_at).toLocaleString("ro-RO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyView({ message, onAsk }: { message: string; onAsk: (q: string) => void }) {
  return (
    <Card className="border-dashed"><CardContent className="p-10 flex flex-col items-center text-center space-y-3">
      <Plus className="w-10 h-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      <Button onClick={() => onAsk(message)} className="gap-2"><MessageSquare className="w-4 h-4" />Întreabă YANA</Button>
    </CardContent></Card>
  );
}

function CRMContextPanelMobile(props: React.ComponentProps<typeof CRMContextPanel>) {
  // Same content but always rendered (the desktop one is hidden under lg)
  return (
    <div className="block">
      <div className="lg:hidden">
        <CRMContextPanelInline {...props} />
      </div>
    </div>
  );
}

// Reuse aside content as inline component for mobile sheet
function CRMContextPanelInline({ summary, onAsk }: React.ComponentProps<typeof CRMContextPanel>) {
  const totalAlerts = summary.staleDeals + summary.hotUncontacted + summary.churnRisk;
  return (
    <div className="p-3 space-y-4">
      <Card><CardContent className="p-3 space-y-1.5">
        <div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">Pipeline</span><span className="font-bold text-primary text-lg">{(summary.pipelineValue / 1000).toFixed(0)}k RON</span></div>
        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Deals active</span><span className="font-semibold">{summary.dealsOpen}</span></div>
        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Contacte</span><span className="font-semibold">{summary.contacts}</span></div>
      </CardContent></Card>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Atenție acum {totalAlerts > 0 && <Badge variant="destructive" className="text-[10px] ml-auto">{totalAlerts}</Badge>}
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Deal-uri cu termen depășit", value: summary.staleDeals, q: "Arată-mi deal-urile cu termen depășit." },
            { label: "Lead-uri fierbinți necontactate", value: summary.hotUncontacted, q: "Listează lead-urile fierbinți necontactate." },
            { label: "Risc de churn (30+ zile)", value: summary.churnRisk, q: "Care contacte au risc de churn?" },
          ].map((r) => (
            <button key={r.label} onClick={() => onAsk(r.q)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card hover:bg-accent border border-border/50 text-left">
              <span className="text-xs flex-1">{r.label}</span>
              <span className="text-xs font-semibold">{r.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CRM;
