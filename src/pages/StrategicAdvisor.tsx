import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Send, 
  Loader2, 
  Brain, 
  AlertCircle,
  ArrowLeft,
  MessageSquarePlus,
  MessageSquare
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  showFeedback?: boolean;
}

export default function StrategicAdvisor() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => {
    const stored = localStorage.getItem('yana_strategic_conversation_id');
    if (stored) {
      console.log("📖 [CONVERSATION] Reusing existing conversation:", stored);
      return stored;
    }
    const newId = crypto.randomUUID();
    localStorage.setItem('yana_strategic_conversation_id', newId);
    console.log("🆕 [CONVERSATION] Created new conversation:", newId);
    return newId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [creditRemaining, setCreditRemaining] = useState<number>(0);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get authenticated user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check access and credit on mount
  useEffect(() => {
    const checkAccessAndCredit = async () => {
      if (!user) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        console.log("🔐 [ACCESS-CHECK] Checking access for user:", user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, subscription_type, trial_credit_remaining, stripe_subscription_id, has_free_access")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("❌ [ACCESS-CHECK] Profile error:", profileError);
          throw profileError;
        }

        console.log("📊 [ACCESS-CHECK] Profile data:", profile);

        // ✅ VERIFICARE: Doar utilizatorii cu planul Antreprenor au acces
        if (profile?.subscription_type !== 'entrepreneur') {
          console.log("❌ [ACCESS-CHECK] Wrong subscription type - requires entrepreneur plan");
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        setSubscriptionStatus(profile?.subscription_status || "none");

        // ✅ TOȚI UTILIZATORII folosesc DOAR sistemul de CREDITE
        // NU există acces nelimitat - credite se cumpără separat
        let creditLeft = profile?.trial_credit_remaining;
        
        // 🆕 Inițializare automată: toți antreprenorii primesc 10 lei credit inițial
        if (creditLeft === null || creditLeft === undefined) {
          console.log("🎁 [ACCESS-CHECK] Initializing 10 lei trial credit for new entrepreneur");
          creditLeft = 10;
          
          // Actualizează în database
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ trial_credit_remaining: 10 })
            .eq("id", user.id);
          
          if (updateError) {
            console.error("❌ [ACCESS-CHECK] Failed to initialize trial credit:", updateError);
          } else {
            console.log("✅ [ACCESS-CHECK] Trial credit initialized successfully");
          }
        }
        
        console.log(`💰 [ACCESS-CHECK] Credit remaining: ${creditLeft} lei`);
        setCreditRemaining(creditLeft);
        
        if (creditLeft > 0) {
          console.log("✅ [ACCESS-CHECK] User has credit - access granted");
          setHasAccess(true);
        } else {
          console.log("❌ [ACCESS-CHECK] No credit remaining - access denied");
          setHasAccess(false);
        }
      } catch (error) {
        console.error("❌ [ACCESS-CHECK] Error:", error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccessAndCredit();
  }, [user]);

  // Load conversation history ONLY on mount
  useEffect(() => {
    if (!user || !conversationId) return;
    
    let isMounted = true;
    
    const loadHistory = async () => {
      try {
        console.log("📜 [HISTORY] Loading conversation history for:", conversationId);
        
        const { data, error } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("❌ [HISTORY] Error loading history:", error);
          return;
        }
        
        if (isMounted && data && data.length > 0) {
          console.log(`📜 [HISTORY] Loaded ${data.length} history records`);
          const loadedMessages: Message[] = data.map(record => ({
            role: record.role as "user" | "assistant",
            content: record.content,
            timestamp: new Date(record.created_at),
            showFeedback: record.role === "assistant"
          }));
          setMessages(loadedMessages);
        } else {
          console.log("📜 [HISTORY] No history found");
        }
      } catch (error) {
        console.error("❌ [HISTORY] Error:", error);
      }
    };

    loadHistory();
    
    return () => {
      isMounted = false;
    };
  }, [user, conversationId]);

  const sendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input.trim();
    
    if (!messageText || isLoading) {
      console.log("⚠️ [SEND] Blocked: empty message or already loading");
      return;
    }

    // Check credit before sending
    if (creditRemaining <= 0) {
      console.error("❌ [SEND] Credit exhausted");
      toast.error("Credit epuizat. Cumpără credite pentru a continua.");
      setHasAccess(false);
      return;
    }

    console.log("📤 [SEND] Sending message:", messageText.substring(0, 50) + "...");

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log("📡 [SEND] Invoking edge function...");
      
      const { data, error } = await supabase.functions.invoke("strategic-advisor", {
        body: {
          message: userMessage.content,
          conversationId,
          userId: user?.id
        }
      });

      console.log("📡 [SEND] Edge function response:", { data, error });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Deduct cost (estimated 0.5 lei per message)
      const messageCost = 0.5;
      const newCredit = Math.max(0, creditRemaining - messageCost);
      console.log(`💰 [CREDIT] Deducting ${messageCost} lei. New balance: ${newCredit} lei`);
      setCreditRemaining(newCredit);
      
      // Update in DB
      await supabase
        .from("profiles")
        .update({ trial_credit_remaining: newCredit })
        .eq("id", user?.id);
      
      if (newCredit <= 0) {
        console.warn("⚠️ [CREDIT] Credit exhausted!");
        toast.warning("Credit epuizat! Cumpără credite pentru a continua.");
        setHasAccess(false);
      } else if (newCredit <= 2) {
        console.warn(`⚠️ [CREDIT] Low credit warning: ${newCredit} lei`);
        toast.warning(`Atenție: Mai ai doar ${newCredit.toFixed(2)} lei credit!`);
      }

      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        showFeedback: true
      };

      console.log("✅ [SEND] AI response received, adding to messages");
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("❌ [SEND] Error:", error);
      toast.error("A apărut o eroare. Te rog încearcă din nou.");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    console.log("🔄 [CONVERSATION] Starting new conversation");
    localStorage.removeItem('yana_strategic_conversation_id');
    setMessages([]);
    window.location.reload();
  };

  // Loading state
  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificare acces...</p>
        </div>
      </div>
    );
  }

  // No access state
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-4">
            {creditRemaining === 0 ? "Credit Epuizat" : "Acces Restricționat"}
          </h2>
          <p className="text-muted-foreground mb-6">
            <strong>Yana Strategică</strong> este disponibilă EXCLUSIV pentru utilizatori cu <strong>Planul Antreprenor</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {creditRemaining === 0 ? (
              <>
                Ai epuizat creditul disponibil. 
                Pentru a continua, <strong>cumpără credite AI</strong> sau activează <strong>Planul Antreprenor (49 lei/lună)</strong> pentru acces la platforma de bază.
              </>
            ) : (
              <>
                Această funcționalitate necesită <strong>Planul Antreprenor</strong>. 
                Toți antreprenorii primesc <strong>10 lei credit inițial</strong> și pot achiziționa credite suplimentare pentru Yana Strategică.
              </>
            )}
          </p>
          <div className="flex flex-col gap-3">
            {creditRemaining === 0 ? (
              <>
                <Button onClick={() => navigate("/my-ai-costs")} size="lg">
                  Cumpără Credite AI
                </Button>
                <Button variant="outline" onClick={() => navigate("/subscription")}>
                  Activează Planul Antreprenor
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/subscription")} size="lg">
                Activează Planul Antreprenor
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/app")}>
              Înapoi la Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                aria-label="Înapoi la aplicație"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Yana Strategică</h1>
                <p className="text-sm text-muted-foreground">
                  Consultant AI Strategic - Teoria Jocului în Business
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Conversation activity indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                {messages.length > 0 ? (
                  <span>Conversație activă: {messages.length} mesaje</span>
                ) : (
                  <span>Conversație nouă</span>
                )}
              </div>
              
              {/* Credit indicator - arată creditul în RON */}
              <div className={`px-4 py-2 rounded-lg border-2 ${
                creditRemaining <= 2 
                  ? 'border-destructive bg-destructive/10' 
                  : creditRemaining <= 5 
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-primary bg-primary/10'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    creditRemaining <= 2 
                      ? 'bg-destructive animate-pulse' 
                      : creditRemaining <= 5
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-primary'
                  }`} />
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">
                      Credit Disponibil
                    </p>
                    <p className="text-lg font-bold">
                      {creditRemaining.toFixed(2)} lei
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Conversație Nouă
              </Button>
            </div>
          </div>

          {/* Credit warning banner */}
          {creditRemaining <= 5 && creditRemaining > 0 && (
            <div className={`border-l-4 p-3 rounded ${
              creditRemaining <= 2 
                ? 'bg-destructive/10 border-destructive' 
                : 'bg-yellow-500/10 border-yellow-500'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${
                  creditRemaining <= 2 ? 'text-destructive' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {creditRemaining <= 2 
                      ? `⚠️ Credit aproape epuizat: ${creditRemaining.toFixed(2)} lei`
                      : `Credit scăzut: ${creditRemaining.toFixed(2)} lei`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cumpără credite AI pentru a continua să folosești Yana Strategică.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate("/my-ai-costs")}
                >
                  Cumpără Credite
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center p-8">
              <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">
                Bun venit la Yana Strategică!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Sunt partenerul tău AI pentru decizii strategice de business bazate pe teoria jocurilor. 
                Pune-mi o întrebare sau descrie provocarea ta de business.
              </p>
            </div>
          )}

          {/* Messages list */}
          {messages.map((msg, idx) => (
            <div
              key={`${msg.timestamp.getTime()}-${idx}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-2 ${msg.role === "user" ? "opacity-70" : "text-muted-foreground"}`}>
                  {msg.timestamp.toLocaleTimeString("ro-RO", { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Descrie provocarea ta de business aici..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
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
            Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
          </p>
        </div>
      </div>
    </div>
  );
}