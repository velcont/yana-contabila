import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw, Send, X, Building2, MapPin, Globe, CheckCircle2 } from "lucide-react";

type ProspectLead = {
  id: string;
  company_name: string;
  cui: string | null;
  county: string | null;
  city: string | null;
  caen_description: string | null;
  email: string | null;
  email_confidence: string | null;
  website: string | null;
  status: string;
  initial_email_subject: string | null;
  initial_email_body: string | null;
  follow_up_subject: string | null;
  follow_up_body: string | null;
  registration_date: string | null;
  created_at: string;
  sent_at: string | null;
};

const STATUS_TABS = [
  { value: "pending_review", label: "În așteptare" },
  { value: "follow_up_due", label: "Follow-up" },
  { value: "sent", label: "Trimise" },
  { value: "rejected", label: "Respinse" },
  { value: "no_email_found", label: "Fără email" },
];

export default function Prospect() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const loadLeads = async (status: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_leads")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setLeads((data || []) as ProspectLead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads(activeTab);
  }, [activeTab]);

  const runScraper = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Trebuie să fii autentificat", variant: "destructive" });
      return;
    }
    setRunning(true);
    toast({ title: "Pornesc scraper-ul ONRC...", description: "Poate dura 1-2 minute." });
    const { data, error } = await supabase.functions.invoke("prospect-onrc-scraper", {
      body: { user_id: user.id, target_count: 15 },
    });
    setRunning(false);
    if (error) {
      toast({ title: "Eroare scraper", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { inserted?: number; no_email?: number; errors?: number } | null;
    toast({
      title: "Scraper finalizat",
      description: `${r?.inserted ?? 0} lead-uri noi cu email, ${r?.no_email ?? 0} fără email.`,
    });
    loadLeads(activeTab);
  };

  const startEdit = (lead: ProspectLead, type: "initial" | "follow_up") => {
    setEditingId(`${lead.id}-${type}`);
    if (type === "initial") {
      setEditSubject(lead.initial_email_subject || "");
      setEditBody(lead.initial_email_body || "");
    } else {
      setEditSubject(lead.follow_up_subject || "");
      setEditBody(lead.follow_up_body || "");
    }
  };

  const saveEdit = async (lead: ProspectLead, type: "initial" | "follow_up") => {
    const update = type === "initial"
      ? { initial_email_subject: editSubject, initial_email_body: editBody }
      : { follow_up_subject: editSubject, follow_up_body: editBody };
    const { error } = await supabase.from("prospect_leads").update(update).eq("id", lead.id);
    if (error) {
      toast({ title: "Eroare salvare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Draft salvat" });
      setEditingId(null);
      loadLeads(activeTab);
    }
  };

  const openInGmail = (lead: ProspectLead, type: "initial" | "follow_up") => {
    if (!lead.email) return;
    const subject = type === "initial" ? lead.initial_email_subject : lead.follow_up_subject;
    const body = type === "initial" ? lead.initial_email_body : lead.follow_up_body;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
    window.open(url, "_blank");
  };

  const markSent = async (lead: ProspectLead) => {
    const { error } = await supabase
      .from("prospect_leads")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marcat ca trimis", description: "Follow-up automat în 7 zile." });
      loadLeads(activeTab);
    }
  };

  const reject = async (lead: ProspectLead) => {
    const { error } = await supabase.from("prospect_leads").update({ status: "rejected" }).eq("id", lead.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead respins" });
      loadLeads(activeTab);
    }
  };

  const confidenceBadge = (c: string | null) => {
    if (c === "high") return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Sigur</Badge>;
    if (c === "medium") return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Probabil</Badge>;
    return <Badge variant="outline">Incert</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prospectare automată</h1>
          <p className="text-muted-foreground mt-1">
            Lead-uri noi de la ONRC. Aprobă, editează și trimite manual din Gmail.
          </p>
        </div>
        <Button onClick={runScraper} disabled={running} size="lg">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Caută firme noi acum
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-6 space-y-4">
            {loading && (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            )}
            {!loading && leads.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Niciun lead în categoria asta. {t.value === "pending_review" && "Apasă \"Caută firme noi acum\" ca să începi."}
              </CardContent></Card>
            )}
            {!loading && leads.map((lead) => {
              const type: "initial" | "follow_up" = t.value === "follow_up_due" ? "follow_up" : "initial";
              const editKey = `${lead.id}-${type}`;
              const isEditing = editingId === editKey;
              const subj = type === "initial" ? lead.initial_email_subject : lead.follow_up_subject;
              const body = type === "initial" ? lead.initial_email_body : lead.follow_up_body;

              return (
                <Card key={lead.id}>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {lead.company_name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {lead.cui && <span>CUI: {lead.cui}</span>}
                          {(lead.city || lead.county) && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[lead.city, lead.county].filter(Boolean).join(", ")}</span>
                          )}
                          {lead.caen_description && <span>{lead.caen_description}</span>}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                              <Globe className="h-3 w-3" />Website
                            </a>
                          )}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4" />
                            <span className="font-mono">{lead.email}</span>
                            {confidenceBadge(lead.email_confidence)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="Subiect" />
                        <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} className="font-mono text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(lead, type)}>Salvează</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Anulează</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="text-sm font-semibold">📧 {subj}</div>
                        <div className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-6">{body}</div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {lead.email && t.value !== "sent" && t.value !== "rejected" && (
                          <>
                            <Button onClick={() => openInGmail(lead, type)} className="gap-2">
                              <Send className="h-4 w-4" />Deschide în Gmail
                            </Button>
                            <Button variant="outline" onClick={() => markSent(lead)} className="gap-2">
                              <CheckCircle2 className="h-4 w-4" />Marchează trimis
                            </Button>
                          </>
                        )}
                        {t.value !== "sent" && t.value !== "rejected" && (
                          <>
                            <Button variant="outline" onClick={() => startEdit(lead, type)}>Editează draft</Button>
                            <Button variant="ghost" onClick={() => reject(lead)} className="gap-2 text-destructive">
                              <X className="h-4 w-4" />Respinge
                            </Button>
                          </>
                        )}
                        {lead.sent_at && (
                          <span className="text-xs text-muted-foreground self-center">
                            Trimis: {new Date(lead.sent_at).toLocaleString("ro-RO")}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}