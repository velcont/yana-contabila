import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Building2, Users, TrendingUp, Activity, MessageSquare, Plus } from "lucide-react";
import { YanaHomeButton } from "@/components/YanaHomeButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Company { id: string; name: string; cui?: string | null; industry?: string | null; city?: string | null; annual_revenue?: number | null; }
interface Contact { id: string; first_name: string; last_name?: string | null; email?: string | null; phone?: string | null; job_title?: string | null; crm_companies?: { name: string } | null; }
interface Deal { id: string; title: string; value: number; currency: string; status: string; stage_id: string; expected_close_date?: string | null; crm_companies?: { name: string } | null; }
interface Stage { id: string; name: string; display_order: number; color: string; is_won: boolean; is_lost: boolean; }

const CRM = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

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
    } catch (err) {
      console.error(err);
      toast.error("Eroare la încărcarea CRM-ului");
    } finally {
      setLoading(false);
    }
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="companies">Firme</TabsTrigger>
            <TabsTrigger value="contacts">Contacte</TabsTrigger>
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