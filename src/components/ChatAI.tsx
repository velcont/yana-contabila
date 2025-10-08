import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, AlertCircle, TrendingUp, FileText, ListChecks, FileBarChart, Maximize2, Minimize2, Lightbulb, History, Menu, Mic, Bell, ThumbsUp, ThumbsDown, BookOpen, Zap, Paperclip, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypingIndicator } from './TypingIndicator';
import { QuickReplySuggestions } from './QuickReplySuggestions';
import { ConversationHistory } from './ConversationHistory';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoiceInterface from './VoiceInterface';
import { Progress } from '@/components/ui/progress';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string; // ID pentru feedback
  attachments?: {
    name: string;
    type: string;
    path: string;
  }[];
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
      content: `Bună ziua! Sunt Yana, asistenta ta virtuală în domeniul contabil și juridic.

Te ajut cu analiza bilanțurilor, indicatori financiari și verificarea contractelor comerciale.

Cum te pot ajuta?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [summaryType, setSummaryType] = useState<SummaryType>('detailed');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [suggestions, setSuggestions] = useState<QuestionPattern[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topQuestions, setTopQuestions] = useState<QuestionPattern[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Yana analizează...');
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                          file.type === 'application/msword';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast({
          title: 'Format invalid',
          description: `${file.name} nu este PDF sau DOCX`,
          variant: 'destructive'
        });
      }
      if (!isValidSize) {
        toast({
          title: 'Fișier prea mare',
          description: `${file.name} depășește 10MB`,
          variant: 'destructive'
        });
      }
      
      return isValidType && isValidSize;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToStorage = async (userId: string): Promise<{name: string; type: string; path: string}[]> => {
    const uploadedPaths = [];
    
    for (const file of uploadedFiles) {
      const filePath = `${userId}/${conversationId}/${Date.now()}_${file.name}`;
      
      const { error } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, file);
      
      if (error) throw error;
      
      uploadedPaths.push({
        name: file.name,
        type: file.type,
        path: filePath
      });
    }
    
    return uploadedPaths;
  };

  const sendMessage = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setIsUploading(uploadedFiles.length > 0);

    let attachments: {name: string; type: string; path: string}[] = [];
    
    // Upload fișiere dacă există
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      if (uploadedFiles.length > 0) {
        attachments = await uploadFilesToStorage(user.id);
        setUploadedFiles([]);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      toast({
        title: 'Eroare upload',
        description: 'Nu am putut încărca documentele',
        variant: 'destructive'
      });
      setIsLoading(false);
      setIsUploading(false);
      return;
    }

    const newUserMsg: Message = { 
      role: 'user' as const, 
      content: userMessage || '📎 Document atașat',
      attachments
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsUploading(false);

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
            message: userMessage || '📎 Document atașat pentru analiză',
            history: messages,
            conversationId,
            summaryType,
            attachments
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
      setStreamingProgress(0);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) {
          setStreamingProgress(100);
          break;
        }

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
              setStreamingProgress(prev => Math.min(prev + 2, 90));
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
      setStreamingProgress(0);
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
      <Card className={`pointer-events-auto ${isMaximized ? 'flex-1 m-4' : 'ml-auto mr-4 mb-4 mt-auto w-full max-w-full md:max-w-[900px] lg:max-w-[1000px]'} ${isMaximized ? 'h-[calc(100vh-2rem)]' : 'h-[650px]'} shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-gradient-to-r from-background to-muted/30">
          {/* Grup stânga - Branding + Actions */}
          <div className="flex items-center gap-3">
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
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
            
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <CardTitle className="text-base font-semibold">Chat AI Yana</CardTitle>
                <p className="text-[10px] text-muted-foreground">Asistentă Financiară</p>
              </div>
            </div>
          </div>

          {/* Grup dreapta - Controale */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showHistory ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-9 w-9 hidden md:flex relative"
                    aria-label="Istoric conversații"
                    data-tour="conversation-history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Istoric Conversații</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showVoice ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowVoice(!showVoice)}
                    className="h-9 w-9"
                    aria-label="Conversație vocală"
                    data-tour="voice-button"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Conversație Vocală</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showInsights ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowInsights(!showInsights)}
                    className="h-9 w-9 relative"
                    aria-label="Alerte"
                  >
                    <Bell className="h-4 w-4" />
                    {insights.length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                      >
                        {insights.length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Alerte ({insights.length})</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isReadingMode ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setIsReadingMode(!isReadingMode)}
                    className="h-9 w-9 hidden lg:flex"
                    aria-label="Mod Lectură"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mod Lectură</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMaximized((v) => !v)}
                    className="h-9 w-9"
                    aria-label={isMaximized ? 'Minimizează' : 'Maximizează'}
                  >
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMaximized ? 'Minimizează' : 'Maximizează'}</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9"
                aria-label="Închide"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipProvider>
          </div>
        </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
        {/* Sheet Insights - Floating */}
        <Sheet open={showInsights} onOpenChange={setShowInsights}>
          <SheetContent side="right" className="w-full sm:w-96">
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Alerte Automate</h3>
              </div>
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nicio alertă nouă</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <Card
                      key={insight.id}
                      className={`${
                        insight.severity === 'critical' ? 'border-destructive' :
                        insight.severity === 'warning' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant={insight.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {insight.severity === 'critical' ? 'Critic' : insight.severity === 'warning' ? 'Atenție' : 'Info'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markInsightAsRead(insight.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setInput(`Explică-mi mai mult despre: ${insight.title}`);
                            markInsightAsRead(insight.id);
                            setShowInsights(false);
                          }}
                          className="h-auto p-0 text-xs"
                        >
                          Discută cu Yana →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Quick Actions - sticky când scrollezi */}
        {messages.length === 1 && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mx-4 px-4">
            <QuickReplySuggestions
              onSelectSuggestion={(question) => {
                setInput(question);
                inputRef.current?.focus();
              }}
              contextual={true}
              showFrequency={true}
            />
          </div>
        )}

        {/* Voice Interface */}
        {showVoice && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <VoiceInterface 
              onTranscript={(text, role) => {
                if (role === 'user') {
                  setMessages(prev => [...prev, { role: 'user', content: text }]);
                } else {
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      // Append to existing assistant message
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        content: lastMsg.content + text
                      };
                      return newMessages;
                    } else {
                      // Create new assistant message
                      return [...prev, { role: 'assistant', content: text }];
                    }
                  });
                }
              }}
            />
          </div>
        )}

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === 'assistant' ? (
                  <div className={`flex gap-2 ${isReadingMode ? 'max-w-full' : 'max-w-[90%]'} group`}>
                    {/* Avatar AI */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      {/* Progress bar pentru streaming */}
                      {isLoading && idx === messages.length - 1 && streamingProgress > 0 && streamingProgress < 100 && (
                        <Progress value={streamingProgress} className="h-1 mb-2" />
                      )}
                      <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3 border-l-2 border-primary/30">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      {msg.id && (
                        <div className="flex items-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleFeedback(msg.id!, 1)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title="Răspuns util"
                                >
                                  <ThumbsUp className="h-3 w-3 text-muted-foreground hover:text-green-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Răspuns util</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleFeedback(msg.id!, -1)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title="Răspuns neutil"
                                >
                                  <ThumbsDown className="h-3 w-3 text-muted-foreground hover:text-red-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Răspuns neutil</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[90%] ml-auto space-y-2">
                    <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-primary-foreground shadow-sm">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-1">
                        {msg.attachments.map((file, fileIdx) => (
                          <div key={fileIdx} className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2 text-xs">
                            <File className="h-4 w-4 text-primary" />
                            <span className="text-primary truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && <TypingIndicator message={thinkingMessage} />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="space-y-3 pt-3 border-t bg-background/95 backdrop-blur-sm">
          {/* Previzualizare fișiere încărcate */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-xs border group">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Stiluri răspuns - tabs vizibile */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Stil:
            </span>
            <Tabs value={summaryType} onValueChange={(value) => setSummaryType(value as SummaryType)} className="flex-1">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="detailed" className="text-xs gap-1.5">
                  <FileBarChart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Detaliat</span>
                </TabsTrigger>
                <TabsTrigger value="short" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Scurt</span>
                </TabsTrigger>
                <TabsTrigger value="action" className="text-xs gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Acțiuni</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || uploadedFiles.length >= 5}
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Atașează contracte sau documente (PDF, DOCX)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => input.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={uploadedFiles.length > 0 ? "Adaugă întrebare despre document..." : "Întreabă despre analizele tale..."}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                size="icon"
                className="shrink-0"
              >
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute bottom-full mb-2 left-0 right-12 max-h-64 overflow-hidden shadow-xl border-primary/20 animate-in slide-in-from-bottom-2 duration-200 z-[60] bg-background/95 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="px-3 py-2 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      Sugestii populare
                    </p>
                  </div>
                  <ScrollArea className="max-h-52">
                    <div className="py-1">
                      {suggestions.map((pattern, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(pattern.question_pattern)}
                          className="w-full px-3 py-2.5 text-left hover:bg-primary/5 transition-all group border-l-2 border-transparent hover:border-primary"
                        >
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {pattern.question_pattern}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {pattern.question_category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {pattern.frequency}× întrebat
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
