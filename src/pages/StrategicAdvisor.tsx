import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Brain, TrendingUp, ArrowLeft, MessageSquarePlus, BookmarkIcon, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { StrategicQuickReplies } from "@/components/StrategicQuickReplies";
import { SavedStrategies } from "@/components/SavedStrategies";
import { StrategicCouncil } from "@/components/StrategicCouncil";
import { CreditAndTrialIndicator } from "@/components/CreditAndTrialIndicator";
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
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

        // Strategic Advisor este blocat pentru TOȚI utilizatorii cu acces gratuit
        // Doar abonați plătitori (fără has_free_access) sau admini au acces
        const access = isAdmin || 
          (profile?.subscription_type === "entrepreneur" && 
           profile?.subscription_status === "active" && 
           profile?.has_free_access !== true);
        
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

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
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
        <Card className="p-8 max-w-md text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Acces restricționat</h1>
          <p className="text-muted-foreground mb-4">
            Yana Strategica este o funcționalitate premium disponibilă DOAR pentru antreprenorii cu abonament plătit activ.
          </p>
          <p className="text-sm text-muted-foreground">
            Chiar dacă ai acces gratuit la analiza financiară și chat-ul normal, Consilierul Strategic necesită abonament plătit pentru a putea fi accesat.
          </p>
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

      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="container mx-auto px-4 py-3">
            <CreditAndTrialIndicator />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSaveDialog(msg)}
                          className="h-6 px-2 gap-1"
                        >
                          <Save className="w-3 h-3" />
                          Salvează
                        </Button>
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
