import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, AlertCircle, TrendingUp, FileText, ListChecks, FileBarChart, Maximize2, Minimize2, Lightbulb, History, Menu, Mic, Bell, ThumbsUp, ThumbsDown, BookOpen, Zap, BarChart3, ExternalLink, GraduationCap, Paperclip, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
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
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useThemeRole } from '@/contexts/ThemeRoleContext';
// 🧠 AI Learning System
import { getEnhancedPrompt, saveConversation, saveFeedback } from '@/lib/ai/conversational-memory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string; // ID pentru feedback
  conversationId?: string; // 🧠 ID conversație pentru AI Learning
  feedbackGiven?: boolean; // 🧠 Marker pentru feedback dat
  sources?: Array<{ title: string; url: string; domain: string }>;
  related_questions?: string[];
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
  const { isAccountant } = useSubscription();
  const { currentTheme } = useThemeRole();
  const isAccountantModule = currentTheme === 'accountant';
  
  const [isOpen, setIsOpen] = useState(openOnLoad);
  const [chatMode, setChatMode] = useState<'balance' | 'fiscal'>('balance');
  const [showModeSwitchBanner, setShowModeSwitchBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  
  const [messages, setMessages] = useState<Message[]>(
    autoStart ? [] : [
      {
        role: 'assistant',
        content: isAccountantModule ? 
          `👋 Bună! Sunt Yana, asistenta ta AI financiară!

📊 **Pentru analiză balanță:**
- Încarcă fișier Excel (.xls sau .xlsx)
- Numele fișierului trebuie să conțină luna și anul
- Exemplu: Balanta_Ianuarie_2025.xls

💡 **Important:** Eu analizez doar datele din balanța ta (indicatori financiari, DSO, cash flow, etc.).

🏛️ Pentru consultanță fiscală → folosește butonul verde "Consultanță Fiscală" din YanaCRM`
          :
          `👋 Bună! Sunt Yana, asistenta ta AI financiară!

📊 **Pentru analiză balanță:**
- Încarcă fișier Excel (.xls sau .xlsx)
- Numele fișierului trebuie să conțină luna și anul
- Exemplu: Balanta_Ianuarie_2025.xls

💡 **Important:** Eu analizez doar datele din balanța ta (indicatori financiari, DSO, cash flow, etc.).

⚖️ Pentru **consultanță fiscală** despre taxe, legislație fiscală și impozite → schimbă pe tab-ul "Consultanță Fiscală" de mai jos.`
      }
    ]
  );
  const [input, setInput] = useState('');
  const [fiscalMessages, setFiscalMessages] = useState<Message[]>([]);
  const [fiscalConversationId, setFiscalConversationId] = useState<string>(crypto.randomUUID());
  const [isLoading, setIsLoading] = useState(false);
  
  // Încarcă istoric fiscal când se schimbă pe modul fiscal
  useEffect(() => {
    if (chatMode === 'fiscal' && isOpen && fiscalMessages.length <= 1) {
      loadFiscalConversationHistory();
    }
  }, [chatMode, isOpen]);

  // Încarcă istoric balance când componenta se deschide
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  
  useEffect(() => {
    // NU reîncărca istoricul dacă:
    // 1. Am deja mai mult de 1 mesaj (conversație activă)
    // 2. Am deja încărcat istoricul în această sesiune
    // 3. Este autoStart (pornire automată)
    if (chatMode === 'balance' && isOpen && messages.length <= 1 && !autoStart && !hasLoadedHistory) {
      loadBalanceConversationHistory();
      setHasLoadedHistory(true);
    }
  }, [isOpen, autoStart, hasLoadedHistory]);

  const loadBalanceConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('📜 Încărcare istoric conversații analiză balanță...');

      // Încarcă ultimele mesaje de analiză balanță
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .or('metadata->>type.eq.balance,metadata->>type.is.null')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading balance history:', error);
        return;
      }

      if (data && data.length > 0) {
        // Grupează pe conversation_id
        const conversationGroups = data.reduce((acc, msg) => {
          if (!acc[msg.conversation_id]) {
            acc[msg.conversation_id] = [];
          }
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, typeof data>);

        const lastConvId = Object.keys(conversationGroups)[0];
        if (lastConvId) {
          const lastMessages = conversationGroups[lastConvId]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(msg => {
              const metadata = msg.metadata as any;
              return {
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                conversationId: msg.conversation_id,
                sources: metadata?.sources || [],
                insights: metadata?.insights || [],
                feedbackGiven: false
              };
            });

          // Filtrează mesajele de "încărcare" care nu au răspuns imediat după
          const filteredMessages = lastMessages.filter((msg, idx) => {
            // Dacă mesajul conține "Aștept analiza" și următorul mesaj este tot de la user sau nu există
            if (msg.content.includes('Aștept analiza') && 
                (idx === lastMessages.length - 1 || lastMessages[idx + 1]?.role === 'user')) {
              console.log('🗑️ Filtrare mesaj de încărcare fără răspuns:', msg.content.substring(0, 50));
              return false;
            }
            return true;
          });

          if (filteredMessages.length > 0) {
            setMessages(filteredMessages);
            setConversationId(lastConvId);
            console.log('✅ Încărcat istoric balance:', filteredMessages.length, 'mesaje din conversația', lastConvId);
          } else {
            // Dacă toate mesajele au fost filtrate, nu încărca nimic - lasă mesajul de bun venit
            console.log('⚠️ Toate mesajele au fost filtrate - păstrare mesaj de bun venit');
          }
        }
      }
    } catch (err) {
      console.error('Error loading balance conversation:', err);
    }
  };

  const loadFiscalConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Încarcă ultimele mesaje fiscale din ChatAI
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('metadata->>type', 'fiscal_chatai')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading fiscal ChatAI history:', error);
        return;
      }

      if (data && data.length > 0) {
        // Grupează pe conversation_id
        const conversationGroups = data.reduce((acc, msg) => {
          if (!acc[msg.conversation_id]) {
            acc[msg.conversation_id] = [];
          }
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, typeof data>);

        const lastConvId = Object.keys(conversationGroups)[0];
        if (lastConvId) {
          const lastMessages = conversationGroups[lastConvId]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(msg => {
              const metadata = msg.metadata as any;
              return {
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                sources: metadata?.sources || [],
                related_questions: metadata?.related_questions || []
              };
            });

          setFiscalMessages(lastMessages);
          setFiscalConversationId(lastConvId);
          console.log('✅ Încărcat istoric fiscal ChatAI:', lastMessages.length, 'mesaje');
        }
      }
    } catch (err) {
      console.error('Error loading fiscal conversation:', err);
    }
  };
  const [insights, setInsights] = useState<Insight[]>([]);
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());
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
  
  // 🧠 AI Learning: Feedback handler pentru noul sistem de învățare
  const handleFeedback = async (messageId: string, rating: number) => {
    try {
      console.log('📊 AI Learning: Processing feedback...');
      
      // Găsește mesajul în state pentru a obține conversationId
      const allMessages = chatMode === 'balance' ? messages : fiscalMessages;
      const messageIndex = allMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1 || !allMessages[messageIndex].conversationId) {
        console.warn('⚠️ Message not found or no conversationId');
        return;
      }
      
      const conversationId = allMessages[messageIndex].conversationId!;
      const wasHelpful = rating > 0;
      const ratingValue = Math.abs(rating);
      
      // Salvează feedback în noul sistem
      const success = await saveFeedback(conversationId, wasHelpful, ratingValue);
      
      if (success) {
        toast({
          title: '✅ Mulțumim pentru feedback!',
          description: 'AI-ul Yana învață din răspunsul tău pentru a se îmbunătăți.'
        });
        
        // Marchează mesajul ca având feedback dat
        if (chatMode === 'balance') {
          setMessages(prev => prev.map((msg, idx) => 
            idx === messageIndex ? { ...msg, feedbackGiven: true } : msg
          ));
        } else {
          setFiscalMessages(prev => prev.map((msg, idx) => 
            idx === messageIndex ? { ...msg, feedbackGiven: true } : msg
          ));
        }
      }
      
      // Fallback la sistemul vechi pentru compatibilitate
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
  }, [messages, fiscalMessages]);

  // Banner explicativ la schimbarea modului
  useEffect(() => {
    if (chatMode === 'balance') {
      setBannerMessage('📊 Modul ANALIZĂ BALANȚĂ activat - încarcă fișier Excel pentru analiză');
    } else {
      setBannerMessage('⚖️ Modul CONSULTANȚĂ FISCALĂ activat - întreabă despre legislație');
    }
    setShowModeSwitchBanner(true);
    const timer = setTimeout(() => setShowModeSwitchBanner(false), 3000);
    return () => clearTimeout(timer);
  }, [chatMode]);

  // Funcție SEPARATĂ pentru mesaje fiscale (Perplexity) - NU AFECTEAZĂ analiza balanțelor
  const sendFiscalMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const userMessage: Message = { role: 'user', content: userMessageContent };
    setFiscalMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Eroare de autentificare',
          description: 'Trebuie să fii logat pentru a folosi Yana Fiscală.',
          variant: 'destructive',
        });
        setFiscalMessages(prev => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      // Salvează mesajul user în baza de date
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: fiscalConversationId,
          role: 'user',
          content: userMessageContent,
          metadata: { type: 'fiscal_chatai' }
        });
      }

      const { data, error } = await supabase.functions.invoke('fiscal-chat', {
        body: {
          message: userMessageContent,
          messages: [{ role: 'user', content: userMessageContent }]
        }
      });

      if (error) {
        console.error('[FISCAL-CHAT] Error:', error);
        toast({
          title: 'Eroare',
          description: 'Nu am putut trimite mesajul. Te rog încearcă din nou.',
          variant: 'destructive',
        });
        setFiscalMessages(prev => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      const content = data?.message || data?.response;
      if (!content) {
        toast({
          title: 'Eroare',
          description: 'Yana Fiscală nu a putut răspunde.',
          variant: 'destructive',
        });
        setFiscalMessages(prev => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content,
        sources: data.sources || [],
        related_questions: data.related_questions || []
      };

      setFiscalMessages(prev => [...prev, assistantMessage]);

      // Salvează răspunsul în baza de date
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: fiscalConversationId,
          role: 'assistant',
          content: content,
          metadata: { 
            type: 'fiscal_chatai',
            sources: data.sources || [],
            related_questions: data.related_questions || []
          }
        });
        console.log('✅ Conversație fiscală salvată în BD (ChatAI)');
      }
    } catch (err) {
      console.error('[FISCAL-CHAT] Fatal error:', err);
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare. Te rog încearcă din nou.',
        variant: 'destructive',
      });
      setFiscalMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

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
      // 1) Încercare răspuns direct din DB pentru întrebări despre o lună specifică
      const msgLower = userMessage.toLowerCase();
      const months: Record<string, string> = {
        'ianuarie':'ianuarie','februarie':'februarie','martie':'martie','aprilie':'aprilie','mai':'mai','iunie':'iunie','iulie':'iulie','august':'august','septembrie':'septembrie','octombrie':'octombrie','noiembrie':'noiembrie','decembrie':'decembrie'
      };
      const detectedMonth = Object.keys(months).find(m => msgLower.includes(m)) || null;

      if (detectedMonth) {
        console.log('[Chat] Detected month:', detectedMonth, '- checking DB...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: found, error: findErr } = await supabase
            .from('analyses')
            .select('metadata, file_name, created_at')
            .eq('user_id', user.id)
            .ilike('file_name', `%${detectedMonth}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('[Chat] DB query result:', { 
            found: found?.length || 0,
            hasMetadata: found?.[0]?.metadata ? 'YES' : 'NO',
            fileName: found?.[0]?.file_name
          });

            if (!findErr && found && found.length > 0 && found[0]?.metadata) {
            const md = found[0].metadata as any;
            let answer: string | null = null;
            if (/(cifra|venit|ca)/i.test(userMessage)) {
              const revenue = Number(md?.revenue || 0);
              console.log('[Chat] Răspund cu revenue:', revenue);
              answer = `Cifra de afaceri pentru ${detectedMonth} este ${revenue.toLocaleString('ro-RO')} RON.`;
            } else if (/profit/i.test(userMessage)) {
              const profit = Number(md?.profit || 0);
              console.log('[Chat] Răspund cu profit:', profit);
              answer = `Profitul pentru ${detectedMonth} este ${profit.toLocaleString('ro-RO')} RON.`;
            } else if (/(cheltuieli)/i.test(userMessage)) {
              const expenses = Number(md?.expenses || 0);
              console.log('[Chat] Răspund cu expenses:', expenses);
              answer = `Cheltuielile pentru ${detectedMonth} sunt ${expenses.toLocaleString('ro-RO')} RON.`;
            } else if (/(stoc|inventar|marfuri|m[ăa]rfuri|materii\s*prime|materiale)/i.test(userMessage)) {
              const stocuri = Number(md?.soldStocuri || 0);
              const materiiPrime = Number(md?.soldMateriiPrime || 0);
              const materiale = Number(md?.soldMateriale || 0);
              const totalStocuri = stocuri + materiiPrime + materiale;
              const dio = Number(md?.dio || 0);
              
              if (totalStocuri > 0) {
                answer = `📦 **Stocuri pentru ${detectedMonth}:**\n\n`;
                if (stocuri > 0) answer += `• Mărfuri (371): **${stocuri.toLocaleString('ro-RO')} RON**\n`;
                if (materiiPrime > 0) answer += `• Materii prime (301): **${materiiPrime.toLocaleString('ro-RO')} RON**\n`;
                if (materiale > 0) answer += `• Materiale (302): **${materiale.toLocaleString('ro-RO')} RON**\n`;
                answer += `\n💰 **Total stocuri: ${totalStocuri.toLocaleString('ro-RO')} RON**\n`;
                if (dio > 0) answer += `⏱️ **Rotație stocuri (DIO): ${dio} zile**\n`;
                answer += `\n*Sursa: Balanța ${found[0].file_name}*`;
                console.log('[Chat] Răspund cu stocuri:', { totalStocuri, dio });
              } else {
                answer = `Nu am găsit informații despre stocuri în balanța pentru ${detectedMonth}. Verifică dacă balanța conține conturile 301 (Materii prime), 302 (Materiale) sau 371 (Mărfuri).`;
                console.log('[Chat] Nu există stocuri în metadata pentru', detectedMonth);
              }
            }
            if (answer) {
              console.log('[Chat] ✅ Răspuns direct din DB:', answer.substring(0, 100));
              setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
              setIsLoading(false);
              return;
            }
          } else {
            console.log('[Chat] Nu am găsit date pentru', detectedMonth);
          }
        }
      }

      // 🧠 AI Learning: Obține prompt îmbogățit cu context învățat
      let finalMessage = userMessage;
      let learningContext = null;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Încearcă să obții compania selectată
          const { data: companies } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (companies && companies.length > 0) {
            const companyId = companies[0].id;
            
            // Obține prompt îmbogățit cu învățături din trecut
            learningContext = await getEnhancedPrompt({
              question: userMessage,
              companyId: companyId,
              userId: user.id,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear()
            });
            
            // Folosește prompt-ul îmbogățit dacă e disponibil
            if (learningContext?.enhancedPrompt) {
              finalMessage = learningContext.enhancedPrompt;
              console.log('🧠 AI Learning: Using enhanced prompt with learned context');
            }
          }
        }
      } catch (learningError) {
        console.error('⚠️ AI Learning error (non-critical):', learningError);
        // Continue cu mesajul original - aplicația merge mai departe
      }

      // 2) Fallback: apel funcție backend chat-ai
      console.log('[Chat] Apel AI generic pentru răspuns...');
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
            message: finalMessage, // 🧠 Folosește prompt-ul îmbogățit
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

      // 🧠 AI Learning: Salvează conversația în noul sistem
      let savedConversationId: string | null = null;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && assistantContent) {
          // Salvează în sistemul vechi (conversation_history)
          await supabase.from('conversation_history').insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent
          });
          
          // 🧠 Salvează în noul sistem de învățare
          const { data: companies } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (companies && companies.length > 0) {
            savedConversationId = await saveConversation(
              userMessage, // întrebarea originală
              assistantContent, // răspunsul AI
              {
                question: userMessage,
                companyId: companies[0].id,
                userId: user.id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
              }
            );
            
            if (savedConversationId) {
              console.log('✅ AI Learning: Conversation saved for future learning');
              
              // Update ultimul mesaj cu conversationId pentru feedback
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    conversationId: savedConversationId || undefined
                  };
                }
                return newMessages;
              });
            }
          }
        }
      } catch (err) {
        console.error('⚠️ Error saving conversation (non-critical):', err);
        // Aplicația continuă chiar dacă salvarea eșuează
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
      if (chatMode === 'fiscal') {
        sendFiscalMessage();
      } else {
        sendMessage();
      }
    }
  };

  // Încarcă o conversație anterioară
  const loadConversation = async (loadConversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Încarcă toate mesajele conversației
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('conversation_id', loadConversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Convertește din format DB în format Message
        const loadedMessages: Message[] = data.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          id: msg.id,
          conversationId: msg.conversation_id
        }));

        setMessages(loadedMessages);
        setConversationId(loadConversationId);
        setShowHistory(false);
        
        toast({
          title: 'Conversație încărcată',
          description: `${data.length} mesaje încărcate`
        });

        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca conversația',
        variant: 'destructive'
      });
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

    // Validate file size (max 20MB pentru consistență cu Index.tsx)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Mărimea maximă permisă este 20MB.",
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
          if (data?.error) throw new Error(data.error);

          // Save analysis to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user && data) {
            // PRIORITATE 1: Metadata din edge function
            let metadataToSave = data.metadata || {};
            logger.log('📊 [ChatAI] Metadata primită de la edge function:', metadataToSave);
            logger.log('📊 [ChatAI] Număr indicatori:', Object.keys(metadataToSave).length);
            
            // PRIORITATE 2: Dacă metadata lipsește complet, parsează din text AI (fallback)
            if (!data.metadata || Object.keys(data.metadata).length === 0) {
              logger.warn('⚠️ [ChatAI] Metadata lipsește - folosesc fallback parsing din text');
              const { parseAnalysisText } = await import('@/utils/analysisParser');
              metadataToSave = parseAnalysisText(data.analysis);
              logger.log('📊 [ChatAI] Metadata din fallback:', metadataToSave);
            }
            
            logger.log(`💾 Salvare analiză în DB - metadata cu ${Object.keys(metadataToSave).length} chei:`, Object.keys(metadataToSave));
            
            // Extract CUI from filename and find company_id
            const cuiMatch = file.name.match(/(\d{8})\.xls/i);
            let companyId = null;
            
            if (cuiMatch) {
              const cui = cuiMatch[1];
              const { data: companyData } = await supabase
                .from('companies')
                .select('id')
                .eq('cui', cui)
                .eq('managed_by_accountant_id', user.id)
                .single();
              
              if (companyData) {
                companyId = companyData.id;
                console.log(`✅ [COMPANY-LINK] Găsit company_id pentru CUI ${cui}:`, companyId);
              }
            }
            
            const { error: saveError } = await supabase
              .from('analyses')
              .insert({
                user_id: user.id,
                analysis_text: data.analysis || '',
                metadata: metadataToSave,
                file_name: file.name,
                company_name: data.company_name || null,
                company_id: companyId
              });

            if (saveError) {
              console.error('❌ Eroare salvare analiză:', saveError);
            } else {
              console.log('✅ Analiză salvată cu succes în baza de date');
              window.dispatchEvent(new CustomEvent('analysis:created'));
              
              // Verifică dacă metadata a fost salvată corect
              if (Object.keys(metadataToSave).length === 0) {
                console.warn('⚠️ ATENȚIE: Metadata salvată este GOALĂ! Acest lucru va cauza probleme la comparații.');
              }
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
          const errorMessage = error instanceof Error ? error.message : "Nu am putut analiza balanța. Te rog încearcă din nou.";
          toast({
            title: "Eroare",
            description: errorMessage,
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
      <div className="fixed bottom-4 left-4 flex items-center gap-3 animate-in fade-in slide-in-from-left-5 duration-500">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg font-medium text-sm">
          💬 Chat Financiar Personal
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
              <p>Analizează-ți balanța și primește sfaturi personalizate {insights.length > 0 && `(${insights.length} alerte)`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={`${isMaximized || showHistory || showInsights ? 'fixed inset-0 z-50 flex pointer-events-none' : 'fixed bottom-4 left-4 z-50 pointer-events-none'}`}>
      {/* Sidebar Istoric - doar când e deschis */}
      {showHistory && (
        <div className="pointer-events-auto w-80 h-full p-4">
          <ConversationHistory 
            onSelectConversation={loadConversation}
            currentConversationId={conversationId}
          />
        </div>
      )}
      
      {/* Chat principal */}
      <Card className={`pointer-events-auto ${isMaximized ? 'w-full flex-1 m-4 h-[calc(100vh-2rem)]' : 'w-[95vw] sm:w-[480px] md:w-[560px] lg:w-[640px] h-[70vh] md:h-[580px]'} bg-background/80 backdrop-blur-md shadow-2xl border border-primary/20 rounded-2xl relative flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pr-4 border-b bg-gradient-to-r from-background to-muted/30">
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
                  onSelectConversation={loadConversation}
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

            {/* Mode Switcher - Tabs cu separare vizuală îmbunătățită */}
            {!isAccountantModule && (
              <div className="ml-4 flex flex-wrap items-center gap-2 bg-muted/50 rounded-lg p-2 border-2 border-primary/20 max-w-full overflow-hidden">
                <span className="text-[10px] font-semibold text-muted-foreground px-2 whitespace-nowrap hidden sm:block">
                  Alege funcția:
                </span>
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={chatMode === 'balance' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setChatMode('balance')}
                          className={`h-8 px-3 text-xs font-semibold transition-all flex-shrink-0 ${
                            chatMode === 'balance' 
                              ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <FileBarChart className="h-4 w-4 mr-1" />
                          <span className="whitespace-nowrap">📊 Analiză Balanță</span>
                          <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/30 hidden sm:inline-flex">
                            💡 Analiză personală
                          </Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Analizează-ți balanța și primește sfaturi personalizate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="h-6 w-px bg-border flex-shrink-0" /> {/* Separator vizual */}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={chatMode === 'fiscal' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setChatMode('fiscal')}
                          className={`h-8 px-3 text-xs font-semibold transition-all flex-shrink-0 ${
                            chatMode === 'fiscal' 
                              ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <Scale className="h-4 w-4 mr-1" />
                          <span className="whitespace-nowrap">🏛️ Legislație Fiscală</span>
                          <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/30 hidden sm:inline-flex">
                            🔍 Caută în legislație
                          </Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Caută informații oficiale în legislația fiscală română</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>

          {/* Grup dreapta - Controale */}
          <div className="flex items-center gap-2">
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-9 w-9"
                    aria-label="Închide chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Închide Chat</TooltipContent>
              </Tooltip>
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
          <div className="space-y-3 py-2">
            {/* Banner Tutorial - vizibil mereu - FIXED: proper sizing and responsive layout */}
            <Card className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-accent/20">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5 truncate">🎓 Tutorial Interactiv</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Descoperă toate funcțiile Yana</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowTutorialMenu(true)}
                    className="flex items-center gap-1 h-8 text-xs px-3 w-full sm:w-auto shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Deschide</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Banner promovare Dashboard - vizibil mereu - FIXED: proper sizing and responsive layout */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5 truncate">📊 Dashboard Grafice Interactive</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Evoluții și comparații financiare</p>
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
                    className="flex items-center gap-1 h-8 text-xs px-3 w-full sm:w-auto shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Deschide</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Banner explicativ la schimbarea modului */}
            {showModeSwitchBanner && (
              <Card className="bg-primary/10 border-2 border-primary animate-in slide-in-from-top duration-300">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-primary text-center">
                    {bannerMessage}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Selectează mesajele corecte bazat pe modul activ */}
            {(chatMode === 'balance' ? messages : fiscalMessages).map((msg, idx) => (
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
                        <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">{msg.content}</p>
                      </div>
                      {msg.id && !msg.feedbackGiven && (
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
                              <TooltipContent>Răspuns util 👍</TooltipContent>
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
                              <TooltipContent>Răspuns neutil 👎</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                      {msg.feedbackGiven && (
                        <div className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Mulțumim! AI învață din feedback-ul tău.
                        </div>
                      )}
                      
                      {/* Sources și Related Questions (doar în modul fiscal) */}
                      {chatMode === 'fiscal' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1 text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            Surse verificate:
                          </p>
                          <div className="space-y-1">
                            {msg.sources.map((source, sourceIdx) => (
                              <a
                                key={sourceIdx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs hover:underline flex items-start gap-1 text-primary hover:text-primary/80"
                              >
                                <span>📄</span>
                                <span className="flex-1">{source.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {chatMode === 'fiscal' && msg.related_questions && msg.related_questions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Întrebări similare:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.related_questions.slice(0, 3).map((q, qIdx) => (
                              <Button
                                key={qIdx}
                                variant="ghost"
                                size="sm"
                                onClick={() => setInput(q)}
                                className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[90%] rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-primary-foreground shadow-sm ml-auto">
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">{msg.content}</p>
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
              {/* Buton upload - doar în modul balanță */}
              {chatMode === 'balance' && (
                <div className="relative">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading || isUploadingFile}
                          variant="outline"
                          size="icon"
                          className="shrink-0 relative animate-glow-pulse border-2"
                          aria-label="Încarcă fișier"
                        >
                          <Paperclip className="h-5 w-5" />
                          {/* Animated arrow indicator cu culori mai vizibile */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
                            <span className="text-xs font-bold text-warning whitespace-nowrap bg-warning/30 px-3 py-1 rounded-full border-2 border-warning shadow-lg">
                              📤 Încarcă balanța aici
                            </span>
                            <svg 
                              className="w-5 h-5 text-warning animate-pulse drop-shadow-lg" 
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
                          <p className="font-semibold">📊 Încarcă balanță Excel pentru analiză</p>
                          <p className="text-xs">📋 Format: .xls sau .xlsx</p>
                          <p className="text-xs">📅 Nume recomandat: Balanta_Luna_An.xls</p>
                          <p className="text-xs opacity-80">Exemplu: Balanta_Ianuarie_2025.xls</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => input.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={
                  isUploadingFile 
                    ? "Încărcare..." 
                    : chatMode === 'fiscal'
                    ? "Întreabă despre legislație fiscală, proceduri ANAF, monografii..."
                    : "Întreabă despre analizele tale sau încarcă o balanță..."
                }
                disabled={isLoading || isUploadingFile}
                className="flex-1"
              />
              <Button
                onClick={chatMode === 'fiscal' ? sendFiscalMessage : sendMessage}
                disabled={isLoading || !input.trim() || isUploadingFile}
                size="icon"
                className="shrink-0"
                aria-label="Trimite mesaj"
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
