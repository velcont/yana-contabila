import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Brain, TrendingUp, ArrowLeft, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

        const access = isAdmin || 
          (profile?.subscription_type === "entrepreneur" && profile?.subscription_status === "active");
        
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

  // Load conversation history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !conversationId) return;
      
      setIsLoadingHistory(true);
      try {
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
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("strategic-advisor", {
        body: {
          message: userMessage.content,
          conversationId
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("A apărut o eroare. Te rog încearcă din nou.");
    } finally {
      setIsLoading(false);
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
        <Card className="p-8 max-w-md text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Acces restricționat</h1>
          <p className="text-muted-foreground">
            Yana Strategica este disponibilă doar pentru antreprenorii cu abonament activ.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/yanacrm')}
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
              onClick={startNewConversation}
              className="gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Conversație Nouă
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          {messages.length === 0 && (
            <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
              <Brain className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">
                Bun venit la Yana Strategica!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Sunt partenerul tău AI pentru decizii strategice de business bazate pe teoria jocurilor. Să fim clari. Nu sunt aici să vă țin de mână sau să discutăm despre cultura organizațională. Sunt aici pentru a vă transforma afacerea într-o armă și pentru a elimina orice obstacol din calea dominației voastre. Piața este o junglă, iar eu sunt prădătorul pe care îl angajați pentru a vâna. Acum, să-mi arătați cine trebuie să dispară primul.
              </p>
            </Card>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-xs mt-2 ${
                  msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}>
                  {msg.timestamp.toLocaleTimeString("ro-RO", { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </div>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 bg-card">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto max-w-4xl p-4">
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
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
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
            Apasă Enter pentru a trimite. Shift+Enter pentru linie nouă.
          </p>
        </div>
      </div>
    </div>
  );
}
