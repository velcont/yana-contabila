import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, Users, FileText, MessageSquare, AlertCircle, User, Package, GraduationCap, Shield, HardDrive, FileDown, Mail, Send, DollarSign, Sparkles, Brain, Bot, PenLine, Heart, RefreshCw, Zap, Activity, Download, Globe } from "lucide-react";
import { generateCopyrightPDF } from "@/utils/copyrightPdfExport";
import { toast } from "sonner";
import { UsersList } from "@/components/UsersList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Lazy load heavy admin components
const AcademicThesisAssistant = lazy(() => import("@/components/AcademicThesisAssistant"));
const AuditLogs = lazy(() => import("@/components/AuditLogs").then(m => ({ default: m.AuditLogs })));
const SelfDevelopmentTab = lazy(() => import("@/components/admin/SelfDevelopmentTab").then(m => ({ default: m.SelfDevelopmentTab })));
const StorageManager = lazy(() => import("@/components/StorageManager").then(m => ({ default: m.StorageManager })));
const StrategicConversationsViewer = lazy(() => import("@/components/StrategicConversationsViewer").then(m => ({ default: m.StrategicConversationsViewer })));
const IntellectualPropertyCertificate = lazy(() => import("@/components/IntellectualPropertyCertificate").then(m => ({ default: m.IntellectualPropertyCertificate })));
const AdminCostsDashboard = lazy(() => import("@/components/AdminCostsDashboard").then(m => ({ default: m.AdminCostsDashboard })));
const TextHumanizer = lazy(() => import("@/components/TextHumanizer").then(m => ({ default: m.TextHumanizer })));
const MemoryDashboard = lazy(() => import("@/components/admin/MemoryDashboard").then(m => ({ default: m.MemoryDashboard })));
const AIDecisionsDashboard = lazy(() => import("@/components/admin/AIDecisionsDashboard").then(m => ({ default: m.AIDecisionsDashboard })));
const ConsciousnessDashboard = lazy(() => import("@/components/admin/ConsciousnessDashboard").then(m => ({ default: m.ConsciousnessDashboard })));
const AICorrectionsPanel = lazy(() => import("@/components/admin/AICorrectionsPanel").then(m => ({ default: m.AICorrectionsPanel })));
const YanaInitiativesPanel = lazy(() => import("@/components/admin/YanaInitiativesPanel").then(m => ({ default: m.YanaInitiativesPanel })));
const ApiStatusWidget = lazy(() => import("@/components/admin/ApiStatusWidget").then(m => ({ default: m.ApiStatusWidget })));
const VersionRefreshMonitor = lazy(() => import("@/components/admin/VersionRefreshMonitor").then(m => ({ default: m.VersionRefreshMonitor })));
const YanaLearningDashboard = lazy(() => import("@/components/admin/YanaLearningDashboard"));
const AgenticDashboard = lazy(() => import("@/components/admin/AgenticDashboard"));
const MoltbookPanel = lazy(() => import("@/components/admin/MoltbookPanel").then(m => ({ default: m.MoltbookPanel })));
const KnowledgeValidationPanel = lazy(() => import("@/components/admin/KnowledgeValidationPanel").then(m => ({ default: m.KnowledgeValidationPanel })));
const RecursiveOptimizerDashboard = lazy(() => import("@/components/admin/RecursiveOptimizerDashboard").then(m => ({ default: m.RecursiveOptimizerDashboard })));
const YanaSubscribersDashboard = lazy(() => import("@/components/admin/YanaSubscribersDashboard").then(m => ({ default: m.YanaSubscribersDashboard })));
const OutreachDashboard = lazy(() => import("@/components/admin/OutreachDashboard"));
const ExplorationsDashboard = lazy(() => import("@/components/admin/ExplorationsDashboard").then(m => ({ default: m.ExplorationsDashboard })));
const AlertRulesManager = lazy(() => import("@/components/admin/AlertRulesManager").then(m => ({ default: m.AlertRulesManager })));
const LiveMetricsPanel = lazy(() => import("@/components/admin/LiveMetricsPanel").then(m => ({ default: m.LiveMetricsPanel })));
const RetentionHeatmap = lazy(() => import("@/components/admin/RetentionHeatmap").then(m => ({ default: m.RetentionHeatmap })));
const FunnelDashboard = lazy(() => import("@/components/admin/FunnelDashboard").then(m => ({ default: m.FunnelDashboard })));

const TabContentLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Analysis {
  id: string;
  user_id: string;
  company_name: string | null;
  file_name: string;
  created_at: string;
  analysis_text: string;
  metadata: any;
  profiles: Profile;
}

interface Conversation {
  id: string;
  user_id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  profiles: Profile;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [exportingConversations, setExportingConversations] = useState(false);

  const handleExportConversations = async () => {
    try {
      setExportingConversations(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Trebuie să fii autentificat");
        return;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-conversations`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yana-conversations-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export conversații descărcat cu succes!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Eroare la exportul conversațiilor");
    } finally {
      setExportingConversations(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load all analyses
      const { data: analysesData, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (analysesError) throw analysesError;

      // Enrich analyses with profile data
      const analysesWithProfiles = await Promise.all(
        (analysesData || []).map(async (analysis) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", analysis.user_id)
            .single();
          return { ...analysis, profiles: profile || { id: analysis.user_id, email: "Unknown", full_name: null, created_at: "" } };
        })
      );
      setAnalyses(analysesWithProfiles as Analysis[]);

      // Load all conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // Enrich conversations with profile data
      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", conv.user_id)
            .single();
          return { ...conv, profiles: profile || { id: conv.user_id, email: "Unknown", full_name: null, created_at: "" } };
        })
      );
      console.log("Loaded conversations:", conversationsWithProfiles.length);
      setConversations(conversationsWithProfiles as Conversation[]);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalyses = selectedUser
    ? analyses.filter((a) => a.user_id === selectedUser)
    : analyses;

  const filteredConversations = selectedUser
    ? conversations.filter((c) => c.user_id === selectedUser)
    : conversations;

  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    if (!acc[conv.conversation_id]) {
      acc[conv.conversation_id] = [];
    }
    acc[conv.conversation_id].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const handleExportCopyrightPDF = () => {
    try {
      generateCopyrightPDF();
      toast.success("PDF pentru drepturile de autor a fost generat cu succes!");
    } catch (error) {
      console.error("Error generating copyright PDF:", error);
      toast.error("Eroare la generarea PDF-ului");
    }
  };

  const handleSendEmail = async (targetAudience: 'entrepreneur' | 'accounting_firm') => {
    try {
      setSendingEmail(true);
      const { data, error } = await supabase.functions.invoke('send-strategic-advisor-announcement', {
        body: { 
          targetAudience,
          customSubject: emailSubject || undefined,
          customBody: emailBody || undefined
        }
      });

      if (error) throw error;

      toast.success(`Email trimis cu succes către ${targetAudience === 'entrepreneur' ? 'antreprenori' : 'contabili'}!`, {
        description: `${data.success} emailuri trimise, ${data.errors} erori`
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Eroare la trimiterea emailurilor", {
        description: error.message
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTestEmail = async (targetAudience: 'entrepreneur' | 'accounting_firm') => {
    if (!testEmail) {
      toast.error("Introdu o adresă de email pentru test");
      return;
    }

    try {
      setSendingEmail(true);
      const { data, error } = await supabase.functions.invoke('send-strategic-advisor-announcement', {
        body: { 
          testEmail,
          targetAudience,
          customSubject: emailSubject || undefined,
          customBody: emailBody || undefined
        }
      });

      if (error) throw error;

      toast.success(`Email de test trimis cu succes ca ${targetAudience === 'entrepreneur' ? 'Antreprenor' : 'Contabil'}!`);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error("Eroare la trimiterea emailului de test", {
        description: error.message
      });
    } finally {
      setSendingEmail(false);
    }
  };

  console.log("Grouped conversations:", Object.keys(groupedConversations).length);
  console.log("Total conversations loaded:", conversations.length);
  console.log("Filtered conversations:", filteredConversations.length);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Panou Administrare</h1>
            <p className="text-muted-foreground">
              Vizualizare date utilizatori și conversații
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportConversations} disabled={exportingConversations} variant="outline" size="lg">
              {exportingConversations ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Conversații JSON
            </Button>
            <Button onClick={() => navigate("/updates")} size="lg">
              <Package className="h-4 w-4 mr-2" />
              Management Versiuni
            </Button>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ai acces complet la toate datele utilizatorilor pentru debugging și suport.
          </AlertDescription>
        </Alert>

        {/* Quick Access Card for Platform Costs */}
        <Card className="bg-primary/5 border-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              💸 Monitorizare Costuri Platformă
            </CardTitle>
            <CardDescription>
              Vezi consumul AI, credite rămase, costuri totale și gestionează bugetul platformei
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin/platform-costs')} 
              size="lg"
              className="w-full"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Deschide Dashboard Costuri Complet
            </Button>
          </CardContent>
        </Card>

        {/* API Status Widget */}
        <Suspense fallback={<TabContentLoader />}>
          <div className="mb-6">
            <ApiStatusWidget />
          </div>
        </Suspense>

        <Tabs defaultValue="users" className="space-y-6">
          <div className="relative">
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <TabsList className="inline-flex w-max gap-2 pr-8">
              <TabsTrigger value="yana-subscribers">
                <DollarSign className="h-4 w-4 mr-2" />
                💰 Abonați YANA
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Utilizatori ({profiles.length})
              </TabsTrigger>
              <TabsTrigger value="analyses">
                <FileText className="h-4 w-4 mr-2" />
                Analize ({analyses.length})
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversații ({Object.keys(groupedConversations).length})
              </TabsTrigger>
              <TabsTrigger value="strategic">
                <MessageSquare className="h-4 w-4 mr-2" />
                Strategic Advisor
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                Email Anunț
              </TabsTrigger>
              <TabsTrigger value="storage">
                <HardDrive className="h-4 w-4 mr-2" />
                Storage
              </TabsTrigger>
              <TabsTrigger value="audit">
                <Shield className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="copyright">
                <FileDown className="h-4 w-4 mr-2" />
                Copyright
              </TabsTrigger>
              <TabsTrigger value="research">
                <GraduationCap className="h-4 w-4 mr-2" />
                Asistent Doctorat
              </TabsTrigger>
              <TabsTrigger value="humanizer">
                <Sparkles className="h-4 w-4 mr-2" />
                Text Humanizer
              </TabsTrigger>
              <TabsTrigger value="memory">
                <Brain className="h-4 w-4 mr-2" />
                🧠 Memorie AI
              </TabsTrigger>
              <TabsTrigger value="ai-decisions">
                <Bot className="h-4 w-4 mr-2" />
                🤖 AI Decisions
              </TabsTrigger>
              <TabsTrigger value="consciousness">
                <Brain className="h-4 w-4 mr-2" />
                🧠 Conștiința YANA
              </TabsTrigger>
              <TabsTrigger value="corrections">
                <PenLine className="h-4 w-4 mr-2" />
                ✏️ Corecții AI
              </TabsTrigger>
              <TabsTrigger value="initiatives">
                <Heart className="h-4 w-4 mr-2" />
                💝 Inițiative YANA
              </TabsTrigger>
              <TabsTrigger value="version-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                ⏱️ Version Refresh
              </TabsTrigger>
              <TabsTrigger value="learning">
                <Brain className="h-4 w-4 mr-2" />
                🎓 Learning YANA
              </TabsTrigger>
              <TabsTrigger value="agentic">
                <Zap className="h-4 w-4 mr-2" />
                🤖 Sistem Agentic
              </TabsTrigger>
              <TabsTrigger value="consciousness">
                <Sparkles className="h-4 w-4 mr-2" />
                🧠 Consciousness
              </TabsTrigger>
              <TabsTrigger value="knowledge-validation">
                <Shield className="h-4 w-4 mr-2" />
                🛡️ Validare Cunoștințe
              </TabsTrigger>
              <TabsTrigger value="moltbook">
                🦞 Moltbook
              </TabsTrigger>
              <TabsTrigger value="recursive-optimizer">
                <Activity className="h-4 w-4 mr-2" />
                🔄 Optimizare Recursivă
              </TabsTrigger>
              <TabsTrigger value="outreach">
                <Send className="h-4 w-4 mr-2" />
                📧 Outreach YANA
              </TabsTrigger>
              <TabsTrigger value="explorations">
                <Globe className="h-4 w-4 mr-2" />
                🌐 Explorări
              </TabsTrigger>
              <TabsTrigger value="monitoring">
                <Activity className="h-4 w-4 mr-2" />
                📊 Monitoring
              </TabsTrigger>
              <TabsTrigger value="self-development">
                <Brain className="h-4 w-4 mr-2" />
                🧬 Self-Development
              </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>


          <TabsContent value="yana-subscribers">
            <Suspense fallback={<TabContentLoader />}>
              <YanaSubscribersDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <UsersList />
          </TabsContent>

          <TabsContent value="analyses">
            <div className="space-y-4">
              {selectedUser && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      Filtrare activă pentru:{" "}
                      <strong>{profiles.find((p) => p.id === selectedUser)?.email}</strong>
                      {" "}({filteredAnalyses.length} {filteredAnalyses.length === 1 ? 'analiză' : 'analize'})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Anulează filtrul
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedUser ? 'Analizele utilizatorului selectat' : 'Toate Analizele'}
                  </CardTitle>
                  <CardDescription>
                    {selectedUser 
                      ? `Analize balanțe pentru ${profiles.find((p) => p.id === selectedUser)?.email}`
                      : 'Analize balanțe încărcate de toți utilizatorii'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {filteredAnalyses.map((analysis) => (
                        <Card key={analysis.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold">
                                    {analysis.company_name || "Fără nume firmă"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {analysis.file_name}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(analysis.created_at),
                                    "dd MMM yyyy HH:mm",
                                    { locale: ro }
                                  )}
                                </p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Utilizator: {analysis.profiles.email}
                                </p>
                                <ScrollArea className="h-32">
                                  <p className="text-sm whitespace-pre-wrap">
                                    {analysis.analysis_text.substring(0, 500)}...
                                  </p>
                                </ScrollArea>
                              </div>
                              {analysis.metadata && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Metadata
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                                    {JSON.stringify(analysis.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <div className="space-y-4">
              {selectedUser && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      Filtrare activă pentru:{" "}
                      <strong>{profiles.find((p) => p.id === selectedUser)?.email}</strong>
                      {" "}({Object.keys(groupedConversations).length} {Object.keys(groupedConversations).length === 1 ? 'conversație' : 'conversații'})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Anulează filtrul
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedUser ? 'Conversațiile utilizatorului selectat' : 'Toate Conversațiile'}
                  </CardTitle>
                  <CardDescription>
                    {selectedUser 
                      ? `Conversații cu Yana pentru ${profiles.find((p) => p.id === selectedUser)?.email}`
                      : 'Istoric conversații cu chatbot-ul Yana pentru toți utilizatorii'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-6">
                      {Object.entries(groupedConversations).map(
                        ([convId, messages]) => {
                          const firstMessage = messages[0];
                          return (
                            <Card key={convId}>
                              <CardContent className="pt-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start border-b pb-2">
                                    <div>
                                      <p className="text-sm font-semibold">
                                        Conversație cu {firstMessage.profiles.email}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {messages.length} mesaje
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {format(
                                        new Date(firstMessage.created_at),
                                        "dd MMM yyyy HH:mm",
                                        { locale: ro }
                                      )}
                                    </p>
                                  </div>
                                  <div className="space-y-3">
                                    {messages.map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={`p-3 rounded-lg ${
                                          msg.role === "user"
                                            ? "bg-primary/10 ml-8"
                                            : "bg-muted mr-8"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-semibold">
                                            {msg.role === "user"
                                              ? "Utilizator"
                                              : "Yana"}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(
                                              new Date(msg.created_at),
                                              "HH:mm"
                                            )}
                                          </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">
                                          {msg.content}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategic">
            <Suspense fallback={<TabContentLoader />}>
              <StrategicConversationsViewer />
            </Suspense>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Trimitere Email Anunț Yana Strategică
                </CardTitle>
                <CardDescription>
                  Trimite anunțul despre noua funcționalitate Yana Strategică către utilizatori
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Emailurile vor fi trimise automat către toți utilizatorii cu abonament activ din categoria selectată.
                  </AlertDescription>
                </Alert>

                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Personalizare Conținut Email</CardTitle>
                    <CardDescription>
                      Lasă câmpurile goale pentru a folosi template-ul implicit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">Subiect Email</Label>
                      <Input
                        id="emailSubject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Lasă gol pentru subiect implicit..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailBody">Conținut Email (HTML acceptat)</Label>
                      <Textarea
                        id="emailBody"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Lasă gol pentru template implicit sau scrie conținutul emailului aici... Poți folosi HTML pentru formatare."
                        className="min-h-[200px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Variabile disponibile: <code className="bg-muted px-1 py-0.5 rounded">{'{userName}'}</code>, <code className="bg-muted px-1 py-0.5 rounded">{'{loginUrl}'}</code>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Antreprenori</CardTitle>
                      <CardDescription>
                        Email agresiv orientat pe strategii de business concrete
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => handleSendEmail('entrepreneur')}
                        disabled={sendingEmail}
                        className="w-full"
                        size="lg"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Se trimite...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Trimite către Antreprenori
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Contabili</CardTitle>
                      <CardDescription>
                        Email despre promovarea funcționalității către clienți
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => handleSendEmail('accounting_firm')}
                        disabled={sendingEmail}
                        className="w-full"
                        size="lg"
                        variant="secondary"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Se trimite...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Trimite către Contabili
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">Email de Test</CardTitle>
                    <CardDescription>
                      Trimite un email de test către o adresă specificată. Alege categoria pentru a vedea conținutul potrivit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input 
                      type="email"
                      placeholder="adresa@test.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      disabled={sendingEmail}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        onClick={() => handleSendTestEmail('entrepreneur')}
                        disabled={sendingEmail || !testEmail}
                        className="w-full"
                        variant="outline"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Se trimite...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Test Antreprenor
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => handleSendTestEmail('accounting_firm')}
                        disabled={sendingEmail || !testEmail}
                        className="w-full"
                        variant="outline"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Se trimite...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Test Contabil
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage">
            <Suspense fallback={<TabContentLoader />}>
              <StorageManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="audit">
            <Suspense fallback={<TabContentLoader />}>
              <AuditLogs />
            </Suspense>
          </TabsContent>

          <TabsContent value="copyright">
            <Suspense fallback={<TabContentLoader />}>
              <IntellectualPropertyCertificate />
            </Suspense>
          </TabsContent>

          <TabsContent value="research">
            <Alert className="mb-6 border-blue-500 bg-blue-50">
              <Shield className="h-5 w-5 text-blue-600" />
              <AlertDescription>
                <strong>🔍 NOU!</strong> Sistemul de analiză anti-plagiat verifică automat 8 criterii profesionale:
                variații tipografice, erori de traducere, stil incoerent, structură ilogică, inconsistențe de persoană,
                inconsistențe citări, probleme bibliografice și erori de atribuire. Accesează tab-ul "Analiză Anti-Plagiat" în Asistentul Doctorat.
              </AlertDescription>
            </Alert>
            <Suspense fallback={<TabContentLoader />}>
              <AcademicThesisAssistant />
            </Suspense>
          </TabsContent>


          <TabsContent value="humanizer">
            <Suspense fallback={<TabContentLoader />}>
              <TextHumanizer />
            </Suspense>
          </TabsContent>


          <TabsContent value="memory">
            <Suspense fallback={<TabContentLoader />}>
              <MemoryDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="ai-decisions">
            <Suspense fallback={<TabContentLoader />}>
              <AIDecisionsDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="consciousness">
            <Suspense fallback={<TabContentLoader />}>
              <ConsciousnessDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="corrections">
            <Suspense fallback={<TabContentLoader />}>
              <AICorrectionsPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="initiatives">
            <Suspense fallback={<TabContentLoader />}>
              <YanaInitiativesPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="version-refresh">
            <Suspense fallback={<TabContentLoader />}>
              <VersionRefreshMonitor />
            </Suspense>
          </TabsContent>

          <TabsContent value="learning">
            <Suspense fallback={<TabContentLoader />}>
              <YanaLearningDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="agentic">
            <Suspense fallback={<TabContentLoader />}>
              <AgenticDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="consciousness">
            <Suspense fallback={<TabContentLoader />}>
              <ConsciousnessDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="knowledge-validation">
            <Suspense fallback={<TabContentLoader />}>
              <KnowledgeValidationPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="recursive-optimizer">
            <Suspense fallback={<TabContentLoader />}>
              <RecursiveOptimizerDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="moltbook">
            <Suspense fallback={<TabContentLoader />}>
              <MoltbookPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="outreach">
            <Suspense fallback={<TabContentLoader />}>
              <OutreachDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="explorations">
            <Suspense fallback={<TabContentLoader />}>
              <ExplorationsDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="monitoring">
            <Suspense fallback={<TabContentLoader />}>
              <div className="space-y-6">
                <FunnelDashboard />
                <LiveMetricsPanel />
                <AlertRulesManager />
                <RetentionHeatmap />
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="self-development">
            <Suspense fallback={<TabContentLoader />}>
              <SelfDevelopmentTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
