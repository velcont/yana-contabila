import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, AlertCircle, TrendingUp, FileText, ListChecks, FileBarChart, Maximize2, Minimize2, Lightbulb, Zap, History, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypingIndicator } from './TypingIndicator';
import { QuickReplySuggestions } from './QuickReplySuggestions';
import { ConversationHistory } from './ConversationHistory';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import VoiceInterface from './VoiceInterface';
import { DividendVsSalaryCalculator } from './calculators/DividendVsSalaryCalculator';
import { MicroVsProfitCalculator } from './calculators/MicroVsProfitCalculator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string; // ID pentru feedback
  calculatorType?: 'dividend-vs-salary' | 'micro-vs-profit'; // tip calculator
}

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
}

interface QuestionPattern {
  question_pattern: string;
  question_category: string;
  frequency: number;
  last_asked_at: string;
}

type SummaryType = 'detailed' | 'short' | 'action';

export const ChatAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Bună! Sunt Yana, asistenta ta AI financiară. Cu ce te pot ajuta astăzi?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [summaryType, setSummaryType] = useState<SummaryType>('detailed');
  const [isMaximized, setIsMaximized] = useState(false);
  const [suggestions, setSuggestions] = useState<QuestionPattern[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topQuestions, setTopQuestions] = useState<QuestionPattern[]>([
    { question_pattern: "Simulează extindere DPO la 60 zile - impact cash flow", question_category: "simulator", frequency: 95, last_asked_at: '' },
    { question_pattern: "Top 3 probleme și oportunități ultima lună", question_category: "analysis", frequency: 90, last_asked_at: '' },
    { question_pattern: "Plan de acțiune pentru reducere DSO", question_category: "action_plan", frequency: 85, last_asked_at: '' },
  ]);
  const [showHistory, setShowHistory] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Yana analizează...');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Feedback handler pentru sistem de învățare
  const handleFeedback = async (messageId: string, rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('chat_feedback').insert({
        conversation_message_id: messageId,
        user_id: user.id,
        rating,
        question_category: null, // Va fi extras automat de trigger
        response_length: null,
        response_time_ms: null
      });
      
      if (!error) {
        toast({
          title: rating > 0 ? '✅ Mulțumim pentru feedback!' : '📝 Feedback înregistrat',
          description: 'Ne ajuți să îmbunătățim răspunsurile',
          duration: 2000
        });
      }
    } catch (err) {
      console.error('Eroare feedback:', err);
    }
  };

  // Încarcă insights proactivi
  useEffect(() => {
    const loadInsights = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_insights')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(3);

        if (data && !error) {
          setInsights(data as Insight[]);
          
          // Alertează user-ul dacă există insights noi
          if (data.length > 0) {
            toast({
              title: '⚠️ Alerte Detectate',
              description: `Am detectat ${data.length} ${data.length === 1 ? 'alertă nouă' : 'alerte noi'} în analizele tale`,
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('Error loading insights:', error);
      }
    };

    if (isOpen) {
      loadInsights();
    }
  }, [isOpen, toast]);

  const markInsightAsRead = async (insightId: string) => {
    try {
      await supabase
        .from('chat_insights')
        .update({ is_read: true })
        .eq('id', insightId);
      
      setInsights(prev => prev.filter(i => i.id !== insightId));
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newUserMsg = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    // Detectează cereri pentru calculatoare
    const lowerMessage = userMessage.toLowerCase();
    
    // Calculator Dividende vs Salarii
    if (lowerMessage.match(/(dividend|salari).*?(dividend|salari)/i) || 
        lowerMessage.includes('dividende vs') || 
        lowerMessage.includes('salarii vs') ||
        lowerMessage.includes('ce aleg')) {
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '💼 Aici ai calculatorul pentru comparație:',
        calculatorType: 'dividend-vs-salary'
      }]);
      setIsLoading(false);
      return;
    }
    
    // Calculator Micro vs Profit
    if (lowerMessage.match(/(micro|profit).*(micro|profit)/i) || 
        lowerMessage.includes('microintreprindere') ||
        lowerMessage.includes('impozit pe profit') ||
        lowerMessage.includes('regim fiscal')) {
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '📊 Aici ai calculatorul pentru comparație regimuri fiscale:',
        calculatorType: 'micro-vs-profit'
      }]);
      setIsLoading(false);
      return;
    }

    // Salvează mesajul user în istoric
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'user',
          content: userMessage
        });
      }
    } catch (err) {
      console.error('Error saving user message:', err);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            message: userMessage,
            history: messages,
            conversationId,
            summaryType
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId: string | null = null;
      let thinkingShown = false;

      // Adaugă mesaj assistant gol pentru streaming
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'thinking') {
              if (!thinkingShown) {
                setThinkingMessage(parsed.message || 'Yana analizează...');
                thinkingShown = true;
              }
            } else if (parsed.type === 'content') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  id: assistantMessageId || undefined
                };
                return newMessages;
              });
            } else if (parsed.type === 'message_id') {
              // Capturăm message_id pentru feedback
              assistantMessageId = parsed.message_id;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].id = assistantMessageId || undefined;
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      // Asigură conținut: dacă streamul n-a livrat nimic, trimitem un fallback prietenos
      if (!assistantContent.trim()) {
        assistantContent = 'Îmi pare rău, răspunsul nu a putut fi generat acum. Te rog specifică perioada exactă (ex: „martie 2025”) sau încearcă din nou în câteva secunde.';
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantContent,
            id: assistantMessageId || undefined
          };
          return newMessages;
        });
      }

      // Salvează răspunsul assistant în istoric
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && assistantContent) {
          await supabase.from('conversation_history').insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent
          });
        }
      } catch (err) {
        console.error('Error saving assistant message:', err);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut trimite mesajul. Te rog încearcă din nou.',
        variant: 'destructive'
      });
      // Elimină mesajul assistant gol în caz de eroare
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Încarcă top întrebări frecvente
  useEffect(() => {
    const loadTopQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_patterns')
          .select('*')
          .order('frequency', { ascending: false })
          .limit(6);
        
        if (data && !error) {
          setTopQuestions(data as QuestionPattern[]);
        }
      } catch (error) {
        console.error('Error loading top questions:', error);
      }
    };

    if (isOpen && messages.length === 1) {
      loadTopQuestions();
    }
  }, [isOpen, messages.length]);

  // Autocomplete inteligent cu sugestii din pattern-uri
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!input.trim() || input.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('chat_patterns')
          .select('*')
          .or(`question_pattern.ilike.%${input}%,question_category.ilike.%${input}%`)
          .order('frequency', { ascending: false })
          .limit(5);
        
        if (data && !error && data.length > 0) {
          setSuggestions(data as QuestionPattern[]);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [input]);

  const selectSuggestion = (pattern: string) => {
    setInput(pattern);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Verifică insights chiar și când chat-ul e închis
  useEffect(() => {
    const checkInsights = async () => {
      try {
        const { count, error } = await supabase
          .from('chat_insights')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false);

        if (!error && count && count > 0) {
          setInsights(prev => prev.length === 0 ? [{ id: '', title: '', description: '', severity: 'info', is_read: false, created_at: '' }] : prev);
        }
      } catch (error) {
        console.error('Error checking insights:', error);
      }
    };

    checkInsights();
    const interval = setInterval(checkInsights, 60000); // Verifică la fiecare minut
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 flex items-center gap-3 animate-in fade-in slide-in-from-right-5 duration-500">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg font-medium text-sm">
          Întreabă Yana 💬
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform relative"
                size="icon"
                data-tour="chat-button"
              >
                <MessageCircle className="h-6 w-6" />
                {insights.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {insights.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Deschide Chat AI {insights.length > 0 && `(${insights.length} alerte)`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      {/* Sidebar Istoric - doar când e deschis */}
      {showHistory && (
        <div className="pointer-events-auto w-80 h-full p-4">
          <ConversationHistory 
            onSelectConversation={(id) => {
              console.log('Load conversation:', id);
              toast({
                title: 'Funcție în dezvoltare',
                description: 'Încărcarea conversațiilor anterioare va fi disponibilă în curând'
              });
            }}
            currentConversationId={conversationId}
          />
        </div>
      )}
      
      {/* Chat principal */}
      <Card className={`pointer-events-auto ${isMaximized ? 'flex-1 m-4' : 'ml-auto mr-4 mb-4 mt-auto w-full max-w-[650px] h-[650px]'} shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  aria-label="Istoric conversații"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <ConversationHistory 
                  onSelectConversation={(id) => {
                    console.log('Load conversation:', id);
                    toast({
                      title: 'Funcție în dezvoltare',
                      description: 'Încărcarea conversațiilor va fi disponibilă în curând'
                    });
                    setShowHistory(false);
                  }}
                  currentConversationId={conversationId}
                />
              </SheetContent>
            </Sheet>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-8 w-8 hidden md:flex relative"
                    aria-label="Istoric conversații"
                    data-tour="conversation-history"
                  >
                    <History className="h-4 w-4" />
                    {!showHistory && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] animate-pulse"
                      >
                        ✨
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>📚 Istoric Conversații (NOU!)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Chat AI Yana</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized((v) => !v)}
              className="h-8 w-8"
              aria-label={isMaximized ? 'Minimizează chat' : 'Maximizează chat'}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
              aria-label="Închide chatul"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Insights proactivi */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Alerte Automate
            </p>
            <div className="space-y-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border text-xs ${
                    insight.severity === 'critical' ? 'border-destructive bg-destructive/5' :
                    insight.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
                    'border-blue-500 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium mb-1">{insight.title}</p>
                      <p className="text-muted-foreground">{insight.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markInsightAsRead(insight.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setInput(`Explică-mi mai mult despre: ${insight.title}`);
                      markInsightAsRead(insight.id);
                    }}
                    className="h-auto p-0 mt-1 text-xs"
                  >
                    Discută cu Yana →
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Întrebări Populare - afișate la început */}
        {messages.length === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Întrebări Populare</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { text: "Care e DSO-ul meu?", icon: TrendingUp },
                { text: "Dividende vs Salarii - ce aleg?", icon: ListChecks },
                { text: "Micro vs Profit - care e mai avantajos?", icon: FileBarChart },
                { text: "Cum pot îmbunătăți cash flow-ul?", icon: Zap },
                { text: "Care sunt Top 3 probleme și oportunități din ultima balanță?", icon: AlertCircle },
                { text: "Simulează: dacă plătesc furnizorii în 60 zile în loc de 30, cum arată cash-ul?", icon: TrendingUp }
              ].map((suggestion, idx) => {
                const Icon = suggestion.icon;
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => {
                      setInput(suggestion.text);
                      sendMessage();
                    }}
                    className="h-auto py-3 px-4 text-left justify-start hover:bg-primary/10 hover:border-primary transition-all group"
                  >
                    <Icon className="h-4 w-4 mr-2 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm leading-tight">{suggestion.text}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {msg.role === 'assistant' ? (
                <div className="max-w-[85%] space-y-2">
                  {msg.calculatorType === 'dividend-vs-salary' ? (
                    <div className="space-y-2">
                      <div className="bg-muted rounded-2xl px-4 py-2.5">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <DividendVsSalaryCalculator />
                    </div>
                  ) : msg.calculatorType === 'micro-vs-profit' ? (
                    <div className="space-y-2">
                      <div className="bg-muted rounded-2xl px-4 py-2.5">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <MicroVsProfitCalculator />
                    </div>
                  ) : (
                    <div className="bg-muted rounded-2xl px-4 py-2.5">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                  {msg.id && !msg.calculatorType && (
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-xs text-muted-foreground">A fost util?</span>
                      <button
                        onClick={() => handleFeedback(msg.id!, 1)}
                        className="text-lg hover:scale-110 transition-transform"
                        title="Răspuns util"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id!, -1)}
                        className="text-lg hover:scale-110 transition-transform"
                        title="Răspuns neutil"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          ))}
          {isLoading && <TypingIndicator message={thinkingMessage} />}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Stil răspuns:</span>
            <Select value={summaryType} onValueChange={(value: SummaryType) => setSummaryType(value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed" className="text-xs">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="h-3 w-3" />
                    <span>Detaliat</span>
                  </div>
                </SelectItem>
                <SelectItem value="short" className="text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Scurt</span>
                  </div>
                </SelectItem>
                <SelectItem value="action" className="text-xs">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-3 w-3" />
                    <span>Action Points</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 pb-2">
            <VoiceInterface 
              onTranscript={(text, role) => {
                if (role === 'user') {
                  setMessages(prev => [...prev, { role: 'user', content: text }]);
                } else {
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      return [...prev.slice(0, -1), { role: 'assistant', content: lastMsg.content + text }];
                    }
                    return [...prev, { role: 'assistant', content: text }];
                  });
                }
              }}
            />
          </div>
          
          <div className="relative">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => input.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Întreabă despre analizele tale..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute bottom-full mb-2 left-0 right-12 max-h-64 overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 duration-200 z-50">
                <CardContent className="p-0">
                  <div className="px-3 py-2 border-b bg-muted/50">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Alți utilizatori au întrebat...
                    </p>
                  </div>
                  <ScrollArea className="max-h-52">
                    <div className="py-1">
                      {suggestions.map((pattern, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(pattern.question_pattern)}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {pattern.question_pattern}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {pattern.question_category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  Întrebat de {pattern.frequency}x
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
