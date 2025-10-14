import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, AlertCircle, TrendingUp, FileText, ListChecks, FileBarChart, Maximize2, Minimize2, Lightbulb, History, Menu, Mic, Bell, ThumbsUp, ThumbsDown, BookOpen, Zap, BarChart3, ExternalLink, GraduationCap, Paperclip } from 'lucide-react';
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
import { useTutorial } from '@/contexts/TutorialContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string; // ID pentru feedback
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

interface ChatAIProps {
  autoStart?: boolean;
  onAutoStartComplete?: () => void;
  onOpenDashboard?: () => void;
  openOnLoad?: boolean;
}

export const ChatAI = ({ autoStart = false, onAutoStartComplete, onOpenDashboard, openOnLoad = false }: ChatAIProps = {}) => {
  const [isOpen, setIsOpen] = useState(openOnLoad);
  const [messages, setMessages] = useState<Message[]>(
    autoStart ? [] : [
      {
        role: 'assistant',
        content: `👋 Bună! Sunt Yana, asistenta ta AI financiară!

📊 **Pentru analiză balanță:**
- Încarcă fișier Excel (.xls sau .xlsx)
- Numele fișierului trebuie să conțină luna și anul
- Exemplu: Balanta_Ianuarie_2025.xls`
      }
    ]
  );
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoStartedRef = useRef(false); // Protecție împotriva execuției duble
  const { toast } = useToast();
  const { setShowTutorialMenu } = useTutorial();
  
  // Auto-open chat effect
  useEffect(() => {
    if (openOnLoad) {
      setIsOpen(true);
    }
  }, [openOnLoad]);

  // Golește mesajele când autoStart devine activ
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      setMessages([]);
    }
  }, [autoStart]);
  
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

      // Check if response is JSON (for "remember" functionality) or streaming
      const contentType = response.headers.get('content-type');
      let assistantContent = '';
      let assistantMessageId: string | null = null;
      
      if (contentType?.includes('application/json')) {
        // Handle JSON response (for "Ține minte" functionality)
        const jsonData = await response.json();
        assistantContent = jsonData.response || jsonData.error || 'Răspuns primit.';
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: assistantContent,
          id: assistantMessageId || undefined
        }]);
      } else {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format invalid",
        description: "Te rog încarcă un fișier Excel (.xlsx sau .xls)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Mărimea maximă permisă este 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingFile(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const base64Data = base64.split(',')[1];

          // Add user message
          const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: `📎 Am încărcat balanța: **${file.name}**\n\nAștept analiza...`
          };
          setMessages(prev => [...prev, userMessage]);
          scrollToBottom();

          // Show loading
          setIsLoading(true);
          setThinkingMessage("Analizez balanța încărcată...");

          // Call analyze-balance edge function
          const { data, error } = await supabase.functions.invoke('analyze-balance', {
            body: { 
              excelBase64: base64Data,
              fileName: file.name 
            }
          });

          if (error) throw error;

          // Save analysis to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user && data) {
            const { error: saveError } = await supabase
              .from('analyses')
              .insert({
                user_id: user.id,
                analysis_text: data.analysis || '',
                metadata: data.metadata || {},
                file_name: file.name,
                company_name: data.company_name || null
              });

            if (saveError) {
              console.error('Error saving analysis to database:', saveError);
            } else {
              window.dispatchEvent(new CustomEvent('analysis:created'));
            }
          }

          // Add AI response
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.analysis ? 
              `${data.analysis}\n\n✅ Ți-am analizat balanța! Cu ce informații pot să te ajut?` :
              "✅ Ți-am analizat balanța! Cu ce informații pot să te ajut?"
          };
          setMessages(prev => [...prev, aiMessage]);
          scrollToBottom();

          // Save to conversation history
          if (user) {
            await supabase.from('conversation_history').insert([
              {
                user_id: user.id,
                conversation_id: conversationId,
                role: 'user',
                content: userMessage.content,
                metadata: { fileName: file.name, fileSize: file.size }
              },
              {
                user_id: user.id,
                conversation_id: conversationId,
                role: 'assistant',
                content: aiMessage.content
              }
            ]);
          }

          toast({
            title: "Succes!",
            description: "Balanța a fost analizată și salvată în dosarul tău."
          });
        } catch (error) {
          console.error('Error analyzing balance:', error);
          toast({
            title: "Eroare",
            description: "Nu am putut analiza balanța. Te rog încearcă din nou.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
          setThinkingMessage('Yana analizează...');
          setIsUploadingFile(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Eroare",
          description: "Nu am putut citi fișierul.",
          variant: "destructive"
        });
        setIsUploadingFile(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Eroare",
        description: "Eroare la încărcarea fișierului.",
        variant: "destructive"
      });
      setIsUploadingFile(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Deschide automat chatbot-ul când autoStart devine true
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      setIsOpen(true);
    }
  }, [autoStart]);

  // Pornire automată după încărcarea balanței
  useEffect(() => {
    const startAutomaticAnalysis = async () => {
      if (!autoStart || !isOpen || autoStartedRef.current) return;
      
      // Marchează că autostart-ul a fost deja executat
      autoStartedRef.current = true;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Încarcă toate balanțele utilizatorului
        const { data: analyses, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error || !analyses || analyses.length === 0) return;

        let autoMessage = '';
        
        if (analyses.length === 1) {
          // O singură balanță - prezintă direct
          const analysis = analyses[0];
          const metadata = analysis.metadata as any;
          const fileName = analysis.file_name || '';
          const monthMatch = fileName.match(/(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*(\d{4})/i);
          const period = monthMatch ? `${monthMatch[1]} ${monthMatch[2]}` : 'ultima perioadă';
          
          autoMessage = `👋 Bună! Am analizat balanța companiei **${analysis.company_name || 'dvs.'}** din **${period}**.\n\n`;
          
          // Indicatori critici
          const criticalIssues = [];
          if (metadata?.profit && parseFloat(metadata.profit) < 0) {
            criticalIssues.push(`🔴 **Profit negativ**: ${metadata.profit} RON`);
          }
          if (metadata?.ebitda && parseFloat(metadata.ebitda) < 0) {
            criticalIssues.push(`🔴 **EBITDA negativ**: ${metadata.ebitda} RON`);
          }
          if (metadata?.casa && parseFloat(metadata.casa) > 50000) {
            criticalIssues.push(`⛔ **Casa depășește plafonul legal**: ${metadata.casa} RON (max 50.000 RON)`);
          }
          
          // Avertismente
          const warnings = [];
          if (metadata?.dso && parseFloat(metadata.dso) > 60) {
            warnings.push(`⚠️ **DSO ridicat**: ${metadata.dso} zile (banii sunt blocați)`);
          }
          if (metadata?.dio && parseFloat(metadata.dio) > 90) {
            warnings.push(`⚠️ **Stocuri cu rotație lentă**: ${metadata.dio} zile`);
          }
          
          // Indicatori pozitivi
          const positives = [];
          if (metadata?.ca) {
            positives.push(`✅ **Cifră de afaceri**: ${metadata.ca} RON`);
          }
          if (metadata?.profit && parseFloat(metadata.profit) > 0) {
            positives.push(`✅ **Profit net**: ${metadata.profit} RON`);
          }
          
          if (criticalIssues.length > 0) {
            autoMessage += '**🚨 Probleme critice detectate:**\n' + criticalIssues.join('\n') + '\n\n';
          }
          if (warnings.length > 0) {
            autoMessage += '**⚠️ Avertismente:**\n' + warnings.join('\n') + '\n\n';
          }
          if (positives.length > 0) {
            autoMessage += '**📊 Indicatori:**\n' + positives.join('\n') + '\n\n';
          }
          
          autoMessage += '💡 **Recomandare:** Vezi **Dashboard-ul** pentru grafice interactive și evoluție completă!\n\n';
          autoMessage += '**Cu ce te pot ajuta astăzi?**';
          
        } else {
          // Multiple balanțe - întreabă utilizatorul
          autoMessage = `👋 Bună! Am detectat **${analyses.length} balanțe** încărcate.\n\n📊 **Vizualizează toate datele în Dashboard** pentru grafice și comparații complete!\n\n`;
          
          analyses.slice(0, 5).forEach((analysis, idx) => {
            const fileName = analysis.file_name || '';
            
            // Mapare luni
            const monthNames: { [key: string]: string } = {
              '01': 'ianuarie', '02': 'februarie', '03': 'martie', '04': 'aprilie',
              '05': 'mai', '06': 'iunie', '07': 'iulie', '08': 'august',
              '09': 'septembrie', '10': 'octombrie', '11': 'noiembrie', '12': 'decembrie'
            };
            
            // Încearcă să extragă luna în format text
            let monthMatch = fileName.match(/(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*(\d{4})/i);
            let period = '';
            
            if (monthMatch) {
              period = `${monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase()} ${monthMatch[2]}`;
            } else {
              // Încearcă să extragă luna în format numeric (01, 02, etc.)
              const numericMatch = fileName.match(/(\d{2})[\s._-]*(\d{4})/);
              if (numericMatch) {
                const monthNum = numericMatch[1];
                const year = numericMatch[2];
                if (monthNames[monthNum]) {
                  period = `${monthNames[monthNum].charAt(0).toUpperCase() + monthNames[monthNum].slice(1)} ${year}`;
                } else {
                  period = `Balanța ${idx + 1}`;
                }
              } else {
                period = `Balanța ${idx + 1}`;
              }
            }
            
            const isMostRecent = idx === 0;
            autoMessage += `${isMostRecent ? '🔹' : '  •'} **${period}** - ${analysis.company_name || 'Companie'}${isMostRecent ? ' *(cea mai recentă)*' : ''}\n`;
          });
          
          if (analyses.length > 5) {
            autoMessage += `\n*...și alte ${analyses.length - 5} balanțe*\n`;
          }
          
          autoMessage += '\n📊 **Vizualizează toate datele în Dashboard** pentru grafice și comparații complete!\n\n';
          autoMessage += '**Care perioadă vrei să o analizez în detaliu?**';
        }
        
        // Adaugă mesajul automat
        setMessages(prev => [...prev, { role: 'assistant', content: autoMessage }]);
        
        // Notifică că autostart-ul s-a completat
        if (onAutoStartComplete) {
          onAutoStartComplete();
        }
      } catch (error) {
        console.error('Error in automatic analysis:', error);
      }
    };

    if (autoStart && isOpen) {
      startAutomaticAnalysis();
    }
  }, [autoStart, isOpen, onAutoStartComplete]);

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
    <div className={`${isMaximized || showHistory || showInsights ? 'fixed inset-0 z-50 flex pointer-events-none' : 'fixed bottom-4 right-4 z-50 pointer-events-none'}`}>
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
      <Card className={`pointer-events-auto ${isMaximized ? 'flex-1 m-4 h-[calc(100vh-2rem)]' : 'w-[95vw] sm:w-[480px] md:w-[560px] lg:w-[640px] h-[70vh] md:h-[580px]'} bg-background/80 backdrop-blur-md shadow-2xl border border-primary/20 rounded-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
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
            {/* Banner Tutorial - vizibil mereu */}
            <Card className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 mb-2 sticky top-0 z-10">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-0.5">🎓 Tutorial Interactiv</p>
                      <p className="text-[10px] text-muted-foreground">Descoperă toate funcțiile Yana pas cu pas</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowTutorialMenu(true)}
                    className="flex items-center gap-1 h-8 text-xs whitespace-nowrap"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Deschide</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Banner promovare Dashboard - vizibil mereu */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 mb-4 sticky top-0 z-10">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-0.5">📊 Dashboard cu Grafice Interactive</p>
                      <p className="text-[10px] text-muted-foreground">Evoluții complete și comparații financiare</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      if (onOpenDashboard) {
                        onOpenDashboard();
                        setIsOpen(false);
                      }
                    }}
                    className="flex items-center gap-1 h-8 text-xs whitespace-nowrap"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Deschide</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
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
                  <div className="max-w-[90%] rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-primary-foreground shadow-sm ml-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            {isLoading && <TypingIndicator message={thinkingMessage} />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="space-y-3 pt-3 border-t bg-background/95 backdrop-blur-sm">
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploadingFile}
                        variant="outline"
                        size="icon"
                        className="shrink-0 relative"
                      >
                        <Paperclip className="h-4 w-4" />
                        {/* Animated arrow indicator */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
                          <span className="text-[10px] font-medium text-primary whitespace-nowrap bg-primary/10 px-2 py-0.5 rounded-full">
                            Încarcă balanța aici
                          </span>
                          <svg 
                            className="w-4 h-4 text-primary animate-pulse" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">Încarcă balanță Excel pentru analiză</p>
                        <p className="text-xs">📋 Format: .xls sau .xlsx</p>
                        <p className="text-xs">📅 Nume recomandat: Balanta_Luna_An.xls</p>
                        <p className="text-xs opacity-80">Exemplu: Balanta_Ianuarie_2025.xls</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => input.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={isUploadingFile ? "Încărcare..." : "Întreabă despre analizele tale sau încarcă o balanță..."}
                disabled={isLoading || isUploadingFile}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isUploadingFile}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
