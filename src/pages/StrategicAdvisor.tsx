import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Brain, TrendingUp, ArrowLeft, MessageSquarePlus, BookmarkIcon, Save, Users, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { StrategicQuickReplies } from "@/components/StrategicQuickReplies";
import { SavedStrategies } from "@/components/SavedStrategies";
import { StrategicCouncil } from "@/components/StrategicCouncil";
import { YanaStrategicaTutorial } from "@/components/YanaStrategicaTutorial";
import { CreditAndTrialIndicator } from "@/components/CreditAndTrialIndicator";
import { StrategicFeedback } from "@/components/StrategicFeedback";
import CompareAnalyses from "@/components/CompareAnalyses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  showFeedback?: boolean;
}

export default function StrategicAdvisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('strategic-advisor-conversation-id');
    if (saved) return saved;
    // Otherwise create new one
    const newId = crypto.randomUUID();
    localStorage.setItem('strategic-advisor-conversation-id', newId);
    return newId;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showSavedStrategies, setShowSavedStrategies] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [userAnalyses, setUserAnalyses] = useState<any[]>([]);
  const [selectedMessageToSave, setSelectedMessageToSave] = useState<Message | null>(null);
  const [saveForm, setSaveForm] = useState({
    title: "",
    category: "general",
    tags: [] as string[],
    tagInput: ""
  });

  // Check access
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) setProfile(data);
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin"
        });

        // Permite acces pentru utilizatori cu abonament activ
        // Verificarea creditelor se face în backend
        const access = isAdmin || 
          ((profile?.subscription_type === "entrepreneur" || 
            profile?.subscription_type === "accounting_firm") && 
           profile?.subscription_status === "active");
        
        console.log("[STRATEGIC-ADVISOR-UI] Access check:", {
          isAdmin,
          subscriptionType: profile?.subscription_type,
          subscriptionStatus: profile?.subscription_status,
          hasFreeAccess: profile?.has_free_access,
          finalAccess: access
        });
        
        setHasAccess(access);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, profile]);

  // Load conversation history & user analyses
  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !conversationId) {
        setIsLoadingHistory(false);
        return;
      }
      
      console.info("[StrategicAdvisor] 📜 Loading history", { conversationId, userId: user.id });
      setIsLoadingHistory(true);
      try {
        // Load conversation history
        const { data, error } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
          const loadedMessages: Message[] = data.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at!)
          }));
          // Nu suprascrie mesajele trimise deja în sesiunea curentă
          setMessages(prev => (prev.length > 0 ? prev : loadedMessages));
        }
        
        // Load user analyses for compare
        const { data: analyses, error: analysesError } = await supabase
          .from('analyses')
          .select('id, company_name, file_name, created_at, analysis_text, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!analysesError && analyses) {
          setUserAnalyses(analyses);
        }
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();

    // Cleanup: never leave loading flags stuck
    return () => {
      console.warn("[StrategicAdvisor] 🧹 Cleanup – resetting loading flags");
      setIsLoadingHistory(false);
      setIsLoading(false);
    };
  }, [user, conversationId]);

  const startNewConversation = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem('strategic-advisor-conversation-id', newId);
    setConversationId(newId);
    setMessages([]);
    toast.success("Conversație nouă începută");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (textToSend?: string) => {
    const messageText = textToSend ?? input.trim();

    console.log("🔍 [CHATBOT-DEBUG] sendMessage called");
    console.log("🔍 [CHATBOT-DEBUG] messageText:", messageText);
    console.log("🔍 [CHATBOT-DEBUG] isLoading:", isLoading);
    console.log("🔍 [CHATBOT-DEBUG] input state:", input);

    if (!messageText || isLoading) {
      console.warn("⚠️ [CHATBOT-DEBUG] Mesaj blocat - messageText:", messageText, "isLoading:", isLoading);
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    console.log("✅ [CHATBOT-DEBUG] Trimit mesaj:", userMessage);

    setMessages(prev => [...prev, userMessage]);
    // Nu goli inputul înainte de răspuns – evităm senzația că "dispare" textul
    setIsLoading(true);

    // Watchdog suplimentar ca să nu rămână blocat UI-ul
    const watchdog = setTimeout(() => {
      console.warn("[StrategicAdvisor] ⏱️ Timeout – reset isLoading");
      setIsLoading(false);
      toast.error("Răspunsul întârzie. Te rugăm încearcă din nou.");
    }, 15000);

    try {
      console.log("📡 [CHATBOT-DEBUG] Invoking edge function...");

      // Timeout hard de 30s pentru invoke
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Edge function nu a răspuns în 30 secunde")), 30000)
      );

      const invokePromise = supabase.functions.invoke("strategic-advisor", {
        body: {
          message: userMessage.content,
          conversationId
        }
      });

      const { data, error } = (await Promise.race([invokePromise, timeoutPromise])) as any;

      console.log("📡 [CHATBOT-DEBUG] Edge function response:", { data, error });
      if (error) {
        console.error("❌ [CHATBOT-DEBUG] Edge function error:", error);
        // Forțează deblocare
        setIsLoading(false);
        throw error;
      }

      if (data?.error) {
        console.error("❌ [CHATBOT-DEBUG] Data error:", data.error);
        toast.error(data.error);
        setIsLoading(false);
        // adăugăm un mic mesaj în conversatie pentru claritate
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `⚠️ ${data.error}`, timestamp: new Date(), showFeedback: false }
        ]);
        return;
      }

      let aiContent = typeof data === "string" ? data : data?.response ?? JSON.stringify(data ?? {});

      const aiMessage: Message = {
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
        showFeedback: true
      };

      console.log("✅ [CHATBOT-DEBUG] AI răspuns primit:", aiMessage);
      setMessages(prev => [...prev, aiMessage]);

      // NU mai golim inputul automat; păstrăm textul utilizatorului după trimitere
      // setInput("");
    } catch (error) {
      console.error("❌ [CHATBOT-DEBUG] Catch error:", error);
      const friendly =
        (error as any)?.message?.includes("429")
          ? "Limita de cereri a fost depășită. Încearcă peste câteva secunde."
          : (error as any)?.message?.includes("402")
          ? "Nu mai sunt credite AI. Te rugăm să alimentezi pentru a continua."
          : (error as any)?.message?.includes("Timeout")
          ? "Timeout: serverul nu a răspuns în timp util. Încearcă din nou."
          : "A apărut o eroare. Te rog încearcă din nou.";
      toast.error(friendly);
      setMessages(prev => [...prev, { role: "assistant", content: friendly, timestamp: new Date(), showFeedback: false }]);
    } finally {
      clearTimeout(watchdog);
      console.log("🏁 [CHATBOT-DEBUG] setIsLoading(false)");
      setIsLoading(false);
    }
  };

  const handleQuickReplySelect = (text: string) => {
    setInput(text);
    sendMessage(text);
  };

  const openSaveDialog = (message: Message) => {
    setSelectedMessageToSave(message);
    setSaveForm({
      title: "",
      category: "general",
      tags: [],
      tagInput: ""
    });
    setShowSaveDialog(true);
  };

  const handleAddTag = () => {
    if (saveForm.tagInput.trim() && !saveForm.tags.includes(saveForm.tagInput.trim())) {
      setSaveForm(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ""
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSaveForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const saveStrategy = async () => {
    if (!selectedMessageToSave || !saveForm.title.trim()) {
      toast.error("Te rog completează titlul strategiei");
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_strategies')
        .insert({
          user_id: user!.id,
          conversation_id: conversationId,
          title: saveForm.title,
          content: selectedMessageToSave.content,
          category: saveForm.category,
          tags: saveForm.tags,
          action_items: []
        });

      if (error) throw error;

      toast.success("Strategie salvată cu succes!");
      setShowSaveDialog(false);
      setSelectedMessageToSave(null);
    } catch (error) {
      console.error("Error saving strategy:", error);
      toast.error("Eroare la salvarea strategiei");
    }
  };

  if (isCheckingAccess || isLoadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-2xl">
          <div className="text-center mb-6">
            <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Bine ai venit la Yana Strategica! 🎯</h1>
            <p className="text-muted-foreground">
              Consilierul tău strategic AI pentru decizii de business agresive și competitive
            </p>
          </div>

          {/* DISCLAIMER IMPORTANT */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              ⚠️ Disclaimer Important - Citește Înainte!
            </h3>
            <div className="text-sm space-y-2">
              <p>
                <strong>Yana Strategica e un asistent AI pentru brainstorming, NU un consultant garantat.</strong>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Șanse reale:</strong> ~30-45% sfaturi valoroase, ~15-25% soluții concrete</li>
                <li><strong>NU are:</strong> Date reale de piață, context specific industriei tale, experiență practică</li>
                <li><strong>Depinde de tine:</strong> Calitatea răspunsurilor = calitatea datelor pe care le dai</li>
              </ul>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mt-2">
                💡 Folosește ca punct de plecare pentru idei, dar consultă profesioniști înainte de decizii importante!
              </p>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Ce primești cu Yana Strategica?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ Strategii competitive bazate pe teoria jocului</li>
                <li>✅ Analiză război de preț și eliminare concurență</li>
                <li>✅ Optimizare fiscală și managementul cash-flow</li>
                <li>✅ Planuri de acțiune cu KPIs măsurabili</li>
                <li>✅ Consilieri strategici virtuali dedicați</li>
              </ul>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold mb-2">Cum funcționează accesul?</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Pas 1:</strong> Ai nevoie de un abonament activ (Antreprenor 99 lei/lună sau Contabil 149 lei/lună)
                </p>
                <p>
                  <strong className="text-foreground">Pas 2:</strong> Primești GRATUIT 50 RON (5000 cents) credite de testare! 🎁
                </p>
                <p className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-300 dark:border-green-700">
                  <strong className="text-green-800 dark:text-green-200">🎁 BONUS:</strong> Toți utilizatorii premium primesc automat <strong>50 RON credite gratuite</strong> (~25-50 conversații strategice) pentru a testa Yana Strategica fără risc!
                </p>
                <p>
                  <strong className="text-foreground">Pas 3 (opțional):</strong> După testare, poți cumpăra credite suplimentare:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• Starter: 19 lei = 100 credite (~50 conversații)</li>
                  <li>• Professional: 49 lei = 300 credite (~150 conversații) - cel mai popular!</li>
                  <li>• Enterprise: 129 lei = 1000 credite (~500 conversații)</li>
                </ul>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-300 dark:border-red-700 mt-3">
                  <p className="font-bold text-red-800 dark:text-red-200 mb-1">⚠️ Politica de Rambursare:</p>
                  <ul className="space-y-1 text-xs">
                    <li>✅ Credite <strong>neutilizate</strong> = rambursabile în 14 zile</li>
                    <li>❌ Credite <strong>consumate</strong> = NU sunt rambursabile (costurile AI reale deja plătite)</li>
                    <li>💡 De aceea îți oferim 50 RON GRATUIT să testezi înainte!</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={() => navigate('/my-ai-costs')}
                size="lg"
                className="w-full"
              >
                Activează Abonamentul & Primește 50 RON Gratuit! 🎁
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/app')}
                size="lg"
                className="w-full"
              >
                Înapoi la Dashboard
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              💡 Abonamentul tău de bază include analiza financiară nelimitată și chat-ul normal. 
              Yana Strategica este funcționalitatea premium dedicată strategiei de business.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for council */}
      {showCouncil && (
        <div className="w-96 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Consiliul Strategic
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCouncil(false)}
            >
              Ascunde
            </Button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
            <StrategicCouncil />
          </div>
        </div>
      )}

      {/* Sidebar for saved strategies */}
      {showSavedStrategies && (
        <div className="w-96 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <BookmarkIcon className="w-5 h-5 text-primary" />
              Strategii Salvate
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSavedStrategies(false)}
            >
              Ascunde
            </Button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
            <SavedStrategies />
          </div>
        </div>
      )}
      
      {/* Sidebar for compare analyses */}
      {showCompare && (
        <div className="w-[600px] border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-primary" />
              Comparare Perioade
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompare(false)}
            >
              Ascunde
            </Button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
            <CompareAnalyses analyses={userAnalyses} />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="container mx-auto px-4 py-3">
            <CreditAndTrialIndicator />
            
            {/* Banner explicativ pentru Modul 2: Yana Strategică */}
            <div className="mb-3 p-3 bg-primary/5 border-l-4 border-primary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">🧠 Modul 2: Yana Strategică</h2>
                  <p className="text-sm text-muted-foreground">
                    Consultant AI strategic pentru decizii de business bazate pe Teoria Jocului
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app')}
                  className="ml-4"
                >
                  ← Modul 1: Analiză Balanță
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Yana Strategica</h1>
                <p className="text-sm text-muted-foreground">
                  Consultant AI Strategic - Teoria Jocului în Business
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCouncil(!showCouncil)}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Consiliu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedStrategies(!showSavedStrategies)}
                className="gap-2"
              >
                <BookmarkIcon className="w-4 h-4" />
                Strategii
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompare(!showCompare)}
                className="gap-2"
              >
                <GitCompareArrows className="w-4 h-4" />
                Comparare
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Conversație Nouă
              </Button>
              {isLoading && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    console.log("🚨 [CHATBOT-DEBUG] FORȚARE DEBLOCARE");
                    setIsLoading(false);
                    toast.success("Chatbot deblocat manual");
                  }}
                  className="gap-2 animate-pulse"
                >
                  <Loader2 className="w-4 h-4" />
                  Deblochează Chatbot
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Tutorial educativ */}
        <div className="border-b bg-background p-4">
          <div className="container mx-auto max-w-4xl">
            <YanaStrategicaTutorial />
          </div>
        </div>

        {/* Chat Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="container mx-auto max-w-4xl space-y-4">
            {messages.length === 0 && (
              <>
                <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h2 className="text-xl font-semibold mb-2">
                    Bun venit la Yana Strategica!
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Sunt partenerul tău AI pentru decizii strategice de business bazate pe teoria jocurilor. Să fim clari. Nu sunt aici să vă țin de mână sau să discutăm despre cultura organizațională. Sunt aici pentru a vă transforma afacerea într-o armă și pentru a elimina orice obstacol din calea dominației voastre. Piața este o junglă, iar eu sunt prădătorul pe care îl angajați pentru a vâna. Acum, să-mi arătați cine trebuie să dispară primul.
                  </p>
                </Card>
                <StrategicQuickReplies 
                  onSelect={handleQuickReplySelect} 
                  conversationId={conversationId}
                />
              </>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${msg.role === "assistant" ? "space-y-2" : ""}`}>
                  <Card
                    className={`p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-2 flex items-center justify-between ${
                      msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      <span>
                        {msg.timestamp.toLocaleTimeString("ro-RO", { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </span>
                      {msg.role === "assistant" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSaveDialog(msg)}
                            className="h-6 px-2 gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Salvează
                          </Button>
                          {msg.showFeedback && (
                            <StrategicFeedback
                              conversationId={conversationId}
                              messageContent={msg.content}
                              onFeedbackSent={() => {
                                setMessages(prev =>
                                  prev.map(m =>
                                    m === msg ? { ...m, showFeedback: false } : m
                                  )
                                );
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <Card className="p-4 bg-card">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </Card>
              </div>
            )}

            {messages.length > 0 && !isLoading && (
              <StrategicQuickReplies 
                onSelect={handleQuickReplySelect} 
                conversationId={conversationId}
              />
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="container mx-auto max-w-4xl p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => {
                  console.log("⌨️ [CHATBOT-DEBUG] Input onChange:", e.target.value);
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  console.log("⌨️ [CHATBOT-DEBUG] Key pressed:", e.key, "shiftKey:", e.shiftKey);
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    console.log("⌨️ [CHATBOT-DEBUG] Enter pressed - calling sendMessage");
                    sendMessage();
                  }
                }}
                placeholder="Descrie provocarea ta de business aici..."
                className="min-h-[60px] resize-none"
                disabled={false}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={false}
                size="lg"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Apasă Enter pentru a trimite. Shift+Enter pentru linie nouă.
            </p>
          </div>
        </div>
      </div>

      {/* Save Strategy Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Salvează Strategia</DialogTitle>
            <DialogDescription>
              Adaugă această strategie în biblioteca ta pentru acces rapid ulterior
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titlu</Label>
              <Input
                id="title"
                placeholder="Ex: Strategie de intrare pe piața din Cluj"
                value={saveForm.title}
                onChange={(e) => setSaveForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categorie</Label>
              <Select
                value={saveForm.category}
                onValueChange={(value) => setSaveForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectează categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operațiuni</SelectItem>
                  <SelectItem value="competitive">Competiție</SelectItem>
                  <SelectItem value="innovation">Inovație</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tag-uri</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Adaugă tag (ex: preturi, competitori)"
                  value={saveForm.tagInput}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, tagInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="secondary">
                  Adaugă
                </Button>
              </div>
              {saveForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {saveForm.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Anulează
            </Button>
            <Button onClick={saveStrategy} disabled={!saveForm.title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Salvează Strategia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
