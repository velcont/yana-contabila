import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, AlertCircle, TrendingUp, FileText, ListChecks, FileBarChart, Maximize2, Minimize2, Lightbulb, History, Menu, Mic, Bell, ThumbsUp, ThumbsDown, BookOpen, Zap, BarChart3, ExternalLink, GraduationCap, Scale, Loader2, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { extractCompanyNameFromFileName } from '@/utils/companyNameExtractor';
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
import { generateUUID } from '@/utils/uuid';
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter';
import { generateAccountantSections, generateLegalNoteSectionIfNeeded } from './BalanceConfirmationHistory';

// 🧠 AI Learning System
import { getEnhancedPrompt, saveConversation, saveFeedback } from '@/lib/ai/conversational-memory';
// Componente refactorizate
import { BalanceUploader } from './chat-ai/BalanceUploader';
import { ChatMessage } from './chat/ChatMessage';
import { ChatInput } from './chat/ChatInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string; // ID pentru feedback
  conversationId?: string; // 🧠 ID conversație pentru AI Learning
  feedbackGiven?: boolean; // 🧠 Marker pentru feedback dat
  sources?: Array<{ title: string; url: string; domain: string }>;
  related_questions?: string[];
  structuredData?: {
    cui: string;
    company: string;
    accounts: Array<{
      code: string;
      name: string;
      debit: number;
      credit: number;
      accountClass: number;
    }>;
  };
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
  forceTutorialMode?: boolean; // FIX #2: forțează modul 'balance' când tutorialul e activ
}

export const ChatAI = ({ autoStart = false, onAutoStartComplete, onOpenDashboard, openOnLoad = false, forceTutorialMode = false }: ChatAIProps = {}) => {
  const { isAccountant, subscriptionType } = useSubscription();
  const { currentTheme } = useThemeRole();
  const isAccountantModule = currentTheme === 'accountant';
  
  
  const [isOpen, setIsOpen] = useState(openOnLoad);
  const [chatMode, setChatMode] = useState<'balance' | 'fiscal'>('balance');
  const [showModeSwitchBanner, setShowModeSwitchBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  
  // FIX #2: Forțează modul 'balance' când tutorialul e activ
  useEffect(() => {
    if (forceTutorialMode && chatMode !== 'balance') {
      setChatMode('balance');
      logger.log('🎓 [ChatAI] Forțat modul balance pentru tutorial');
    }
  }, [forceTutorialMode, chatMode]);
  
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
  const [fiscalConversationId, setFiscalConversationId] = useState<string>(generateUUID());
  const [isLoading, setIsLoading] = useState(false);
  const [balanceStructuredData, setBalanceStructuredData] = useState<{
    cui: string;
    company: string;
    accounts: Array<{
      code: string;
      name: string;
      debit: number;
      credit: number;
      accountClass: number;
    }>;
  } | null>(null);
  const [premiumSuggestionShown, setPremiumSuggestionShown] = useState(false);
  
  // 🆕 Helper function pentru verificare și adăugare sugestie premium
  const addPremiumReportSuggestion = (
    content: string, 
    hasStructuredData: boolean,
    userQuestion: string = '', // 🆕 PARAMETRU pentru context întrebare
    isBalanceUpload: boolean = false // 🆕 FLAG special pentru upload balanță
  ): string => {
    // 🆕 VERIFICARE PRIORITARĂ: Dacă sugestia a fost deja afișată în această conversație
    if (premiumSuggestionShown) {
      console.log('🚫 [Premium Suggestion] Sugestie deja afișată în conversație');
      return content;
    }
    
    // Verificări preliminare: modul balance + antreprenor
    if (chatMode !== 'balance') return content;
    if (subscriptionType !== 'entrepreneur') return content;
    
    // ✅ CAZUL SPECIAL: La upload balanță ÎNTOTDEAUNA afișează sugestia
    if (isBalanceUpload && hasStructuredData) {
      console.log('✅ [Premium Suggestion] Upload balanță detectat - afișare sugestie GARANTATĂ');
      setPremiumSuggestionShown(true);
      
      const premiumSuggestion = `\n\n---\n\n📄 **Raport Financiar Premium Disponibil!**\n\nDacă vrei să citești analiza într-un format mai structurat (12-20 pagini cu grafice), am pregătit un raport Word complet pentru tine.\n\n**Îl găsești în:** Dashboard → "Dosarul Meu" → Selectează analiza → "Generează Raport Premium"\n\n💡 **Ce găsești în raport:**\n✅ Tot ce am discutat aici, dar mult mai detaliat\n✅ Zone de risc identificate automat\n✅ Soluții concrete de optimizare\n✅ Checklist lunar de verificări\n✅ Grafice și indicatori vizuali\n\n🔄 **Dar hai să continuăm discuția aici! Cu ce te pot ajuta acum?** 😊`;
      
      return content + premiumSuggestion;
    }
    
    // Pentru întrebări ulterioare (NU upload), verifică contextul
    
    // 🚫 EXCLUDE întrebările META despre platformă
    const metaQuestions = /ce (po[tț]i|[sș]tii|faci|este|[îi]nseamn[aă])|cum (func[tț]ioneaz[aă]|te folosesc|s[aă]|[îi]ncarc)|unde ([îi]ncarc|g[aă]sesc|este)|ajutor|help|explica|tutorial|ghid/i;
    
    if (metaQuestions.test(userQuestion)) {
      console.log('🚫 [Premium Suggestion] Întrebare META detectată - skip sugestie:', userQuestion);
      return content;
    }
    
    // 🚫 EXCLUDE răspunsurile fără calcule financiare concrete
    const hasFinancialCalculations = /\d+.*RON|\d+.*lei|DSO.*\d+|DPO.*\d+|lichiditate.*\d+|sold.*\d+|profit.*\d+|pierdere.*\d+/i.test(content);
    
    if (!hasFinancialCalculations && !hasStructuredData) {
      console.log('🚫 [Premium Suggestion] Fără calcule financiare concrete - skip sugestie');
      return content;
    }
    
    const isLongResponse = content.length > 500;
    
    // Logica pentru întrebări ulterioare: trebuie balanță + (răspuns lung SAU calcule)
    const shouldSuggest = hasStructuredData && (isLongResponse || hasFinancialCalculations);
    
    if (!shouldSuggest) {
      console.log('🚫 [Premium Suggestion] Condiții nesatisfăcute - skip sugestie');
      return content;
    }
    
    console.log('✅ [Premium Suggestion] Afișare sugestie premium relevantă contextual');
    setPremiumSuggestionShown(true);
    
    const premiumSuggestion = `\n\n---\n\n📄 **Raport Financiar Premium Disponibil!**\n\nDacă vrei să citești analiza într-un format mai structurat (12-20 pagini cu grafice), am pregătit un raport Word complet pentru tine.\n\n**Îl găsești în:** Dashboard → "Dosarul Meu" → Selectează analiza → "Generează Raport Premium"\n\n💡 **Ce găsești în raport:**\n✅ Tot ce am discutat aici, dar mult mai detaliat\n✅ Zone de risc identificate automat\n✅ Soluții concrete de optimizare\n✅ Checklist lunar de verificări\n✅ Grafice și indicatori vizuali\n\n🔄 **Dar hai să continuăm discuția aici! Cu ce te pot ajuta acum?** 😊`;
    
    return content + premiumSuggestion;
  };
  
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
  const [conversationId, setConversationId] = useState<string>(generateUUID());
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

      // 🆕 Adaugă sugestie premium doar pentru întrebări relevante (NU la upload)
      const originalContent = assistantContent;
      assistantContent = addPremiumReportSuggestion(
        assistantContent,
        balanceStructuredData !== null,
        userMessage, // Verifică contextul întrebării
        false // NU este upload (este întrebare ulterioară)
      );

      // Update mesajul final doar dacă s-a adăugat sugestia
      if (assistantContent !== originalContent) {
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

    // 🆕 Resetează flag-ul pentru noua analiză
    setPremiumSuggestionShown(false);

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

          // 📊 Salvează datele structurate pentru generare Word
          if (data.structuredData) {
            setBalanceStructuredData(data.structuredData);
            logger.log('📊 [ChatAI] Date structurate salvate pentru Word:', {
              cui: data.structuredData.cui,
              company: data.structuredData.company,
              accountsCount: data.structuredData.accounts?.length || 0
            });
          }

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
            
            // Extract company name: prioritate AI > file_name > null
            const extractedCompanyName = data.company_name || 
                                         extractCompanyNameFromFileName(file.name) || 
                                         null;

            const { error: saveError } = await supabase
              .from('analyses')
              .insert({
                user_id: user.id,
                analysis_text: data.analysis || '',
                metadata: {
                  ...metadataToSave,
                  structuredData: data.structuredData // ✅ Include structuredData pentru Word
                },
                file_name: file.name,
                company_name: extractedCompanyName,
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

          // Construiește conținutul mesajului
          let aiContent = data.analysis ? 
            `${data.analysis}\n\n✅ Ți-am analizat balanța! Cu ce informații pot să te ajut?` :
            "✅ Ți-am analizat balanța! Cu ce informații pot să te ajut?";

          // 🆕 Adaugă sugestie premium ÎNTOTDEAUNA la upload balanță
          aiContent = addPremiumReportSuggestion(
            aiContent, 
            data.structuredData !== null && data.structuredData !== undefined,
            '', // Nu contează întrebarea la upload
            true // ✅ FLAG special: este upload balanță → afișează GARANTAT
          );

          // Add AI response
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: aiContent,
            structuredData: data.structuredData // 📊 Salvează datele structurate în mesaj
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

          // 📄 DESCĂRCARE AUTOMATĂ RAPORT WORD PREMIUM
          if (data.structuredData) {
            setTimeout(async () => {
              try {
                toast({
                  title: "📄 Generare Raport Premium...",
                  description: "Raportul Word se descarcă automat în câteva secunde."
                });

                // Generare simplificată Word Premium automat
                const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } = await import('docx');
                const { saveAs } = await import('file-saver');
                
                const doc = new Document({
                  sections: [{
                    properties: {},
                    children: [
                      new Paragraph({
                        text: "RAPORT FINANCIAR PREMIUM",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Companie: ${data.structuredData.company}`, bold: true, size: 28 })
                        ],
                        spacing: { after: 200 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `CUI: ${data.structuredData.cui}`, size: 24 })
                        ],
                        spacing: { after: 400 }
                      }),
                      new Paragraph({
                        text: "ANALIZA FINANCIARĂ",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 }
                      }),
                      new Paragraph({
                        text: data.analysis || 'Analiză indisponibilă',
                        spacing: { after: 400 }
                      }),
                      new Paragraph({
                        text: `Generat automat de YANA la ${new Date().toLocaleString('ro-RO')}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600 }
                      })
                    ]
                  }]
                });

                const blob = await Packer.toBlob(doc);
                const fileName = `Raport_Premium_${data.structuredData.cui}_${new Date().toISOString().split('T')[0]}.docx`;
                saveAs(blob, fileName);

                toast({
                  title: "✅ Raport Premium Descărcat!",
                  description: `Fișierul ${fileName} a fost salvat automat.`
                });
              } catch (error) {
                console.error('Eroare generare Word automat:', error);
                toast({
                  title: "⚠️ Raport disponibil în Dashboard",
                  description: "Pentru raportul complet, mergi la Dashboard → selectează analiza.",
                  variant: "default"
                });
              }
            }, 1500);
          }
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

  // Funcție generare confirmare Word
  const handleGenerateWordConfirmation = async (structuredData: typeof balanceStructuredData) => {
    if (!structuredData) return;
    
    try {
      const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer, BorderStyle } = await import('docx');
      const { saveAs } = await import('file-saver');
      
      // 🔍 Verificare tip utilizator: CONTABIL sau ANTREPRENOR
      const isAccountantMode = currentTheme === 'accountant' || subscriptionType === 'accounting_firm';
      console.log('📊 [ChatAI] Generare raport Word:', {
        currentTheme,
        subscriptionType,
        isAccountantMode: isAccountantMode ? 'DA - CONTABIL' : 'NU - ANTREPRENOR'
      });

      // Helper function pentru chenarele call-to-action Chat AI
      const createChatAICallToAction = (type: 'hero' | 'section' | 'final') => {
        if (type === 'hero') {
          return [
            new Paragraph({
              text: "🚀 AI-ul YANA te așteaptă!",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 200 },
              shading: { fill: "FF6B35" }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Ai întrebări despre raport? Pune-le acum Chat AI-ului care știe EXACT situația firmei tale!\n\n",
                  bold: true,
                  size: 24
                }),
                new TextRun({ 
                  text: "Exemple reale:\n",
                  bold: true,
                  size: 22
                }),
                new TextRun({ 
                  text: "• \"De ce am pierdere dacă am încasat bine?\"\n",
                  size: 22
                }),
                new TextRun({ 
                  text: "• \"Cât pot să-mi scot dividende fără să rămân fără cash?\"\n",
                  size: 22
                }),
                new TextRun({ 
                  text: "• \"Ce furnizor să plătesc primul luna asta?\"\n",
                  size: 22
                }),
                new TextRun({ 
                  text: "• \"Cum reduc cheltuielile cu 10.000 RON/lună?\"\n\n",
                  size: 22
                }),
                new TextRun({ 
                  text: "→ Deschide Chat AI acum!",
                  bold: true,
                  size: 26,
                  color: "FF6B35"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              border: {
                top: { color: "FF6B35", size: 12, style: BorderStyle.SINGLE },
                bottom: { color: "FF6B35", size: 12, style: BorderStyle.SINGLE },
                left: { color: "FF6B35", size: 12, style: BorderStyle.SINGLE },
                right: { color: "FF6B35", size: 12, style: BorderStyle.SINGLE }
              },
              shading: { fill: "FFF3E0" }
            })
          ];
        } else if (type === 'section') {
          return [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "💬 Ai întrebări despre această secțiune?\n",
                  bold: true,
                  size: 22
                }),
                new TextRun({ 
                  text: "Scrie direct Chat AI-ului YANA → răspunde instant!",
                  size: 20
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 300, after: 300 },
              border: {
                top: { color: "9E9E9E", size: 6, style: BorderStyle.SINGLE },
                bottom: { color: "9E9E9E", size: 6, style: BorderStyle.SINGLE },
                left: { color: "9E9E9E", size: 6, style: BorderStyle.SINGLE },
                right: { color: "9E9E9E", size: 6, style: BorderStyle.SINGLE }
              },
              shading: { fill: "F5F5F5" }
            })
          ];
        } else { // final
          return [
            new Paragraph({
              text: "⚡ NU mai aștepta răspuns de la contabil 3 zile!",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { before: 600, after: 200 },
              shading: { fill: "D32F2F" }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Chat AI YANA știe deja totul despre firma ta și îți răspunde în 5 secunde.\n\n",
                  bold: true,
                  size: 26,
                  color: "FFFFFF"
                }),
                new TextRun({ 
                  text: "Click aici și întreabă orice vrei!",
                  bold: true,
                  size: 28,
                  color: "FFEB3B"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              border: {
                top: { color: "D32F2F", size: 12, style: BorderStyle.SINGLE },
                bottom: { color: "D32F2F", size: 12, style: BorderStyle.SINGLE },
                left: { color: "D32F2F", size: 12, style: BorderStyle.SINGLE },
                right: { color: "D32F2F", size: 12, style: BorderStyle.SINGLE }
              },
              shading: { fill: "FFCDD2" }
            })
          ];
        }
      };

      let sections: any[];

      if (isAccountantMode) {
        // ✅ MODUL CONTABIL - Raport concis și profesional
        console.log('✅ [ChatAI] Generare raport CONTABIL');
        
        // Convertim array în Record pentru generateAccountantSections
        const accountsRecord: Record<string, { debit: number; credit: number }> = structuredData.accounts.reduce((acc, account) => {
          acc[account.code] = { 
            debit: account.debit || 0, 
            credit: account.credit || 0 
          };
          return acc;
        }, {} as Record<string, { debit: number; credit: number }>);

        sections = [
          ...generateAccountantSections(
            accountsRecord,
            structuredData.cui,
            structuredData.company,
            new Date().toLocaleDateString('ro-RO')
          ),
          ...generateLegalNoteSectionIfNeeded(true)
        ];

      } else {
        // ✅ MODUL ANTREPRENOR - Raport detaliat și educațional (LOGICA EXISTENTĂ)
        console.log('✅ [ChatAI] Generare raport ANTREPRENOR');
        
      // Explicații conturi complete și detaliate - TOATE CONTURILE
      const getAccountExplanation = (acc: any): string => {
        const amount = acc.debit > 0 ? acc.debit : acc.credit;
        const soldType = acc.debit > 0 ? 'debitor' : 'creditor';
        const code = acc.code;
        const classNum = Math.floor(parseInt(code) / 100);
        
        // CLASA 1 - CAPITALURI
        if (code === "101") return `💼 Capital social subscris nevărsat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - capitalul promis de acționari dar nevirat încă. Trebuie plătit conform actelor constitutive.`;
        if (code === "1011" || code === "1012") return `💼 Capital social: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - banii pe care asociații i-au pus efectiv în firmă la înființare, înscriși la Registrul Comerțului.`;
        if (code === "104") return `💰 Prime de capital: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - sume suplimentare peste valoarea nominală primite la emisiunea de acțiuni.`;
        if (code === "105" || code === "1068" || code === "106") return `💰 Rezerve: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - profit din anii trecuți păstrat ca rezervă de siguranță (obligatoriu legal min 5% din capital). Bani pentru situații neprevăzute.`;
        if (code === "117" || code === "1171") {
          const isLoss = acc.debit > 0;
          return `📊 Rezultat reportat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON ${isLoss ? 'PIERDERE' : 'PROFIT'} din anii trecuți reportată în anul curent. ${isLoss ? '⚠️ Pierdere veche neacoperită - trebuie acoperită din profituri viitoare.' : '✅ Profit vechi reinvestit în firmă.'}`;
        }
        if (code === "121") {
          const isLoss = acc.debit > 0;
          return isLoss 
            ? `⚠️ PIERDERE: Firma ta a pierdut ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON în această perioadă. Cheltuielile (clasa 6) au depășit veniturile (clasa 7). ATENȚIE: pierderi repetate pot atrage control ANAF - firma trebuie să genereze profit! Ce poți face: analizează unde cheltuielile sunt mari și caută să crești veniturile prin mai multe vânzări.`
            : `✅ PROFIT: Firma ta a câștigat ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON în această perioadă! Veniturile (clasa 7) au depășit cheltuielile (clasa 6). Rezultat pozitiv - afacerea merge bine. Continuă activitățile profitabile!`;
        }
        if (code === "129") return `📊 Repartizarea profitului: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON profit care urmează să fie distribuit acționarilor sau reinvestit.`;
        
        // CLASA 2 - IMOBILIZĂRI
        if (code === "211") return `🏢 Terenuri: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - valoarea terenurilor deținute. Active fixe folosite pentru activitate (sediu, depozit), NU pentru vânzare.`;
        if (code === "212") return `🏗️ Amenajări terenuri: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - investiții în îmbunătățiri (împrejmuire, nivelări, drenaj). Cresc valoarea terenului.`;
        if (code === "2131" || code === "2135") return `🏗️ Construcții: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - valoarea clădirilor (sedii, hale, depozite). Se amortizează în timp - valoarea contabilă scade.`;
        if (code === "2133" || code === "2134") return `🏭 Echipamente și instalații: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - utilaje, mașini, echipamente tehnice. Investiții în active de producție care se amortizează lunar.`;
        if (code === "214") return `⚙️ Mobilier și echipamente birotice: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - mobilier, calculatoare, imprimante. Echipamente pentru operațiuni zilnice.`;
        if (code === "2814" || code === "2815") return `📉 Amortizare cumulată: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - depreciere cumulată a activelor fixe din uzură în timp. Nu e cheltuială efectivă, ci ajustare contabilă.`;
        
        // CLASA 3 - STOCURI
        if (code === "301") return `🏭 Materii prime: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - materiale de bază pentru producție. Trebuie suficiente dar nu excesive - altfel blochezi bani.`;
        if (code === "302") return `🔧 Materiale consumabile: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - materiale auxiliare (piese, consumabile). Monitorizează consumul - creștere bruscă poate indica risipă sau furt.`;
        if (code === "303") return `🎁 Obiecte de inventar: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - obiecte mici (unelte, ustensile) care se consumă rapid.`;
        if (code === "345") return `📦 Produse finite: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - produse fabricate gata de vânzare. Vinde-le rapid pentru a nu bloca banii!`;
        if (code === "346") return `♻️ Produse reziduale: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - deșeuri valorificabile din producție. Verifică dacă poți genera venit suplimentar.`;
        if (code === "371") return `📦 Mărfuri în stoc: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON mărfuri în depozit. VERIFICĂ FIZIC la inventar dacă corespunde! Dacă lipsesc → pierderi. Dacă prea multe → bani blocați. Ideal: vinde rapid pentru cash.`;
        if (code === "381") return `📦 Mărfuri la terți: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - mărfuri trimise la terți (consignație) dar încă proprietatea ta. Monitorizează-le.`;
        
        // CLASA 4 - TERȚI
        if (code === "401") return `💳 Datorii furnizori: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON datorați pentru bunuri/servicii primite și NEACHITATE. VERIFICĂ SCADENȚELE - întârzieri = penalități, dobânzi sau oprirea livrărilor! Planifică cash flow-ul pentru plăți la timp.`;
        if (code === "404") return `🏗️ Furnizori imobilizări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - datorii pentru echipamente cumpărate pe termen lung. Verifică ratele lunare.`;
        if (code === "408") return `💸 Facturi nesosite: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - ai primit bunuri/servicii dar nu ai primit încă factura. Datorie în așteptare.`;
        if (code === "409") return `📉 Avansuri furnizori: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - furnizori care ÎȚI DATOREAZĂ bani (avansuri plătite). Recuperează-i rapid!`;
        if (code === "411" || code === "4111") return `💰 Clienți: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON pe care clienții ÎI DATOREAZĂ pentru livrări efectuate. URMĂREȘTE-I ACTIV! Dacă nu plătesc la timp → cash-flow blocat. Sună-i, trimite reminder-uri, ia măsuri de recuperare! Banii ăștia TREBUIE încasați!`;
        if (code === "418" || code === "4118") return `🔮 Facturi de întocmit: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - ai livrat dar nu ai emis factura. EMITE-O RAPID pentru a putea încasa legal!`;
        if (code === "419") return `📉 Avansuri clienți: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - clienți care au plătit în avans. Datorie față de ei - compensează cu livrări viitoare.`;
        if (code === "421") return `💼 Salarii datorate: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - salarii calculate dar neplatite încă. Datorie de onoare - plătește la termen (max 15 a lunii)!`;
        if (code === "423") return `💸 Ajutoare materiale: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - ajutoare acordate angajaților care urmează să fie plătite.`;
        if (code === "4281" || code === "4282") return `🏦 Alte datorii: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - datorii diverse (chirie, utilități, servicii). Verifică scadențele și plătește la timp.`;
        if (code === "431" || code === "4311" || code === "4312") return `🏛️ Contribuții sociale: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - CAS, CASS pentru salarii. TERMEN: 25 a lunii următoare. NU întârzia - amenzi mari!`;
        if (code === "437") return `👥 Contribuții angajați: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - rețineri din salarii pentru CAS/CASS. Virare până la 25 împreună cu contribuțiile angajatorului.`;
        if (code === "4423") return `🏛️ TVA de plată: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON TVA colectat care TREBUIE VIRAT la stat până la 25 a lunii următoare! NU întârzia - riști amenzi mari (0.01%-0.02% pe zi) și dobânzi. Prioritate fiscală critică!`;
        if (code === "4424") return `↩️ TVA de recuperat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON TVA deductibil de RECUPERAT de la ANAF. Depune decontul la timp (până la 25). ATENȚIE: Sume mari (peste 45.000) = verificări suplimentare, poate dura 2-6 luni. Pregătește toate facturile!`;
        if (code === "4426" || code === "4427") return `💼 TVA imobilizări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - TVA pentru echipamente/utilaje. Aceleași reguli ca TVA-ul curent.`;
        if (code === "4428") return `🏦 TVA neexigibil: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - TVA pentru care termenul de plată nu a venit. Devine 4423 la scadență.`;
        if (code === "444") return `💸 Impozit profit: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - impozit 16% pe profit, de plată trimestrial. Verifică termenele.`;
        if (code === "446") return `🏢 Alte taxe: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - taxe locale (teren, clădiri, auto, publicitate). Verifică scadențele specifice.`;
        if (code === "4481" || code === "4482") return `🧾 Impozit reținut: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - impozit pe dividende/colaboratori. Virare până la 25 a lunii următoare.`;
        if (code === "4551") {
          const isDebt = acc.credit > 0;
          return isDebt 
            ? `🤝 Datorii asociați: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON datorați asociaților (împrumuturi de la ei). NU sunt cheltuieli - datorie internă care poate fi rambursată când firma are lichidități. Fără dobânzi sau scadențe stricte (de obicei).`
            : `🤝 Creanțe asociați: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON pe care asociații îi datorează firmei (cheltuieli plătite pentru ei). Recuperează-i sau compensează cu dividende viitoare.`;
        }
        if (code === "4562") return `💵 Dividende de plată: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - profit distribuit asociaților. Termen plată: 30-60 zile de la hotărârea AGA.`;
        if (code === "462" || code === "4661" || code === "4662") return `🏦 Credite bancare: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - împrumuturi de la bancă. Monitorizează ratele lunare - neplata = executare silită!`;
        
        // CLASA 5 - TREZORERIE
        if (code === "5121") return `🏦 Bani în bancă: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON disponibili EFECTIV în cont ACUM. Compară cu extrasul! Dacă prea puțin → risc cash-flow. Dacă mult → poți investi sau achita datorii.`;
        if (code === "5124") return `💱 Cont valută: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON echivalent în euro/dolari. Atenție la cursul de schimb - fluctuații pot genera câștiguri/pierderi.`;
        if (code === "5125") return `💳 Sume în decontare: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - plăți cu cardul neîncasate încă (2-3 zile). Banii vin, dar NU sunt disponibili acum.`;
        if (code === "5311") return `💵 Numerar casă: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON cash în casierie. VERIFICĂ FIZIC că banii din sertar corespund! Dacă nu → lipsă la inventar. IMPORTANT: maxim legal 50.000 RON. Peste = NELEGAL, riști amenzi!`;
        if (code === "542") return `💸 Avansuri trezorerie: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - bani dați în avans angajaților (deplasări). Trebuie justificați cu documente rapid.`;
        
        // CLASA 6 - CHELTUIELI
        if (code === "601") return `🏭 Cheltuieli materii prime: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - cost materii în producție. Compară cu veniturile (7XX) - dacă cheltuielile cresc prea mult, profitul scade!`;
        if (code === "602" || code === "6028") return `🔧 Materiale consumabile: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - materiale auxiliare. Verifică dacă sunt justificate - consum excesiv = risipă sau furt.`;
        if (code === "603") return `📦 Obiecte de inventar: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - unelte, ustensile, mobilier mic. Monitorizează achiziții nejustificate.`;
        if (code === "6022") return `⛽ Combustibil: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON. ȚINE EVIDENȚA BONURILOR - ANAF verifică strict dacă consumul corespunde cu activitatea (km, tipul vehiculului). Consum excesiv = risc respingere la deductibilitate!`;
        if (code === "607") return `🛒 Cheltuieli mărfuri: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - prețul de ACHIZIȚIE al mărfurilor. COMPARĂ cu 707 (venituri) pentru marja comercială. Formula: Profit = 707 - 607. Cu cât marja e mai mare, cu atât afacerea e mai profitabilă!`;
        if (code === "609") return `📉 Reduceri primite: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - discounturi de la furnizori. Reduce costul de achiziție - economie!`;
        if (code === "611") return `🛠️ Întreținere și reparații: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - mentenanță active. Dacă prea mari, poate e cazul să înlocuiești echipamentul vechi.`;
        if (code === "612") return `🔌 Chirii și redevențe: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - chirii spații, licențe software. Costuri fixe - verifică dacă sunt competitive.`;
        if (code === "613") return `📦 Leasing: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - rate leasing pentru echipamente/vehicule. Contract pe termen lung.`;
        if (code === "621") return `👥 Colaboratori: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - plăți către colaboratori/freelanceri (NU angajați). Asigură-te că ai CONTRACTE și FACTURI pentru toate - ANAF verifică să nu fie salarii ascunse (riști amenzi mari!)`;
        if (code === "6231") return `🚗 Protocol și reclamă: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - reprezentare, cadouri, reclame. Limită deductibilitate: 2% din cifra de afaceri. Peste = nedeductibil!`;
        if (code === "624") return `🚚 Transport: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - transport mărfuri (curierat, rutier). Verifică documente justificative (AWB, CMR).`;
        if (code === "625") return `🏖️ Deplasări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - diurnă, cazare, transport în interes de serviciu. Păstrează TOATE bonurile și ordinele de deplasare - ANAF verifică strict!`;
        if (code === "626") return `📞 Telecomunicații: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - telefonie, internet, poștale. Verifică abonamentele - poți reduce costurile schimbând furnizorul.`;
        if (code === "627") return `🏦 Servicii bancare: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - comisioane băncii. COMPARĂ ofertele băncilor - poți reduce costurile schimbând sau negociind!`;
        if (code === "628") return `🛎️ Alte servicii: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - servicii diverse (consultanță, contabilitate, juridic, marketing, IT, curățenie). Verifică că TOATE au facturi și sunt justificate - ANAF respinge cheltuielile nejustificate!`;
        if (code === "635") return `🏢 Impozite și taxe: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - taxe locale (teren, clădiri, auto), ecotaxă. Costuri obligatorii - plătește la timp.`;
        if (code === "641") return `👷 Salarii: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - total salarii brute. Cel mai mare cost pentru majoritatea firmelor. Verifică productivitatea angajaților.`;
        if (code === "645") return `🏥 Contribuții sociale: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - CAS (25%) pentru angajați. Obligatoriu legal - virare lunară.`;
        if (code === "6583" || code === "658") return `📊 Alte cheltuieli: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - cheltuieli diverse (amenzi, despăgubiri, donații). Minimizează-le - nu aduc valoare!`;
        if (code === "666") return `💸 Dobânzi: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - dobânzi la credite. Cu cât mai multe credite, cu atât dobânzile reduc profitul. Rambursează creditele scumpe mai repede.`;
        if (code === "681") return `📉 Amortizări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - amortizare lunară active fixe. Nu e ieșire efectivă de bani - doar depreciere contabilă.`;
        
        // CLASA 7 - VENITURI
        if (code === "701") return `🏭 Venituri produse: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - vânzarea produselor fabricate. Compară cu cheltuielile de producție (601, 602) pentru profitabilitate.`;
        if (code === "704") return `💼 Venituri servicii: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - încasări din servicii prestate. MOTORUL AFACERII TALE! Compară cu lunile anterioare să vezi evoluția. Dacă scade → marketing agresiv sau clienți noi.`;
        if (code === "707") return `🛒 Venituri vânzări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - prețul de VÂNZARE al mărfurilor. COMPARĂ cu 607 (cost achiziție) pentru marja brută. Formula: Profit = 707 - 607. Cu cât marja mai mare, cu atât mai profitabil!`;
        if (code === "708") return `📦 Activități diverse: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - venituri auxiliare (vânzare deșeuri, ambalaje). Bani bonus pe lângă activitatea principală.`;
        if (code === "754") return `🎁 Subvenții: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - subvenții de la stat. Verifică condițiile - dacă nu le respecți, trebuie returnate!`;
        if (code === "758" || code === "7588") return `➕ Alte venituri: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - venituri diverse (chirii încasate, diferențe favorabile). Asigură-te că sunt DOCUMENTATE CORECT pentru ANAF - venituri nejustificate pot fi considerate din surse necunoscute!`;
        if (code === "765") return `💱 Diferențe curs valutar: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - câștiguri din fluctuații valutare. Dacă ai conturi/tranzacții în valută.`;
        if (code === "766") return `💰 Dobânzi primite: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - dobânzi de la bancă (depozite) sau clienți (întârzieri). Venit pasiv.`;
        if (code === "7815") return `🔄 Venituri reevaluări: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - creșteri valoare din reevaluarea activelor. Apreciere contabilă - nu e intrare efectivă de bani.`;
        
        // Fallback îmbunătățit pentru conturi rare
        const classNames: Record<number, string> = {
          1: 'Capitaluri - fonduri proprii și rezultate financiare',
          2: 'Imobilizări - active fixe folosite pe termen lung',
          3: 'Stocuri - mărfuri și materiale pentru activitate',
          4: 'Terți - relații cu clienți, furnizori, stat și angajați',
          5: 'Trezorerie - disponibilități bănești în bănci și casă',
          6: 'Cheltuieli - costuri pentru derularea activității',
          7: 'Venituri - încasări din vânzări și alte surse'
        };
        
        return `📋 ${acc.name.toUpperCase()}\n\nCE REPREZINTĂ:\nContul ${code} aparține Clasei ${classNum}: ${classNames[classNum] || 'cont contabil'}.\n\nSOLD ACTUAL: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON (${soldType})\n\n📌 Pentru interpretare specifică detaliată a acestui cont particular, consultă specialistul contabil.`;
      };
      
      // Grupează conturile pe clase
      const accountsByClass: Record<number, typeof structuredData.accounts> = {};
      structuredData.accounts.forEach(acc => {
        if (!accountsByClass[acc.accountClass]) {
          accountsByClass[acc.accountClass] = [];
        }
        accountsByClass[acc.accountClass].push(acc);
      });
      
      // DEBUG: Verifică gruparea
      console.log('📄 [WORD-GEN] Generare Word cu date:', {
        cui: structuredData.cui,
        company: structuredData.company,
        totalAccounts: structuredData.accounts.length,
        accountsByClass: Object.keys(accountsByClass).map(cls => ({
          class: parseInt(cls),
          count: accountsByClass[parseInt(cls)].length,
          accounts: accountsByClass[parseInt(cls)].map(a => `${a.code} (D:${a.debit}, C:${a.credit})`)
        }))
      });
      
      // Creare secțiuni document
      sections = [];
      
      // Header
      sections.push(
        new Paragraph({
          text: `RAPORT DE ANALIZĂ FINANCIARĂ COMPLETĂ`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Analiză detaliată a tuturor conturilor contabile cu recomandări de optimizare`, italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `CUI: `, bold: true }),
            new TextRun({ text: structuredData.cui })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Companie: `, bold: true }),
            new TextRun({ text: structuredData.company })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Dată generare: `, bold: true }),
            new TextRun({ text: new Date().toLocaleDateString('ro-RO') })
          ],
          spacing: { after: 400 }
        }),
        
        // CHENAR PORTOCALIU MARE - HERO CALL TO ACTION
        ...createChatAICallToAction('hero')
      );
      
      // DISCLAIMER JURIDIC
      sections.push(
        new Paragraph({
          text: "NOTĂ IMPORTANTĂ - INFORMAȚII LEGALE",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 },
          shading: { fill: "FFF3CD" }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: `Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale. Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie fiscală validată.`,
              italics: true
            })
          ],
          spacing: { after: 400 },
          alignment: AlignmentType.JUSTIFIED,
          border: {
            top: { color: "FFC107", size: 6, style: BorderStyle.SINGLE },
            bottom: { color: "FFC107", size: 6, style: BorderStyle.SINGLE },
            left: { color: "FFC107", size: 6, style: BorderStyle.SINGLE },
            right: { color: "FFC107", size: 6, style: BorderStyle.SINGLE }
          }
        })
      );
      
      // REZUMAT EXECUTIV - Calcul automat
      const bank = structuredData.accounts.find(a => a.code === '5121')?.credit || 0;
      const cash = structuredData.accounts.find(a => a.code === '5311')?.credit || 0;
      const profit = structuredData.accounts.find(a => a.code === '121')?.credit || 0;
      const loss = structuredData.accounts.find(a => a.code === '121')?.debit || 0;
      const clients = structuredData.accounts.find(a => a.code === '411')?.debit || 0;
      const suppliers = structuredData.accounts.find(a => a.code === '401')?.credit || 0;
      const stocks = structuredData.accounts.find(a => a.code === '371')?.debit || 0;
      
      const totalCash = bank + cash;
      const netProfitLoss = profit - loss;
      
      let healthStatus = 'MEDIE';
      let alerts = 0;
      if (totalCash < 1000) {
        healthStatus = 'SLABĂ';
        alerts++;
      } else if (totalCash > 10000 && netProfitLoss > 0) {
        healthStatus = 'BUNĂ';
      }
      if (netProfitLoss < 0) alerts++;
      if (suppliers > clients * 1.5) alerts++;
      
      sections.push(
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "📊 REZUMAT EXECUTIV - SITUAȚIA TA FINANCIARĂ",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "BANII TĂI ACUM:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: `💰 În bancă: ${bank.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `💵 În casă: ${cash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `📊 TOTAL DISPONIBILITĂȚI: ${totalCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, bold: true })
          ],
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "SITUAȚIA GENERALĂ:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: `📈 Cât ai câștigat (Profit/Pierdere): ${netProfitLoss.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `👥 Cine îți datorează bani (Clienți): ${clients.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `💸 Cui le datorezi bani (Furnizori): ${suppliers.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `📦 Valoare stocuri: ${stocks.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "INDICATORI CHEIE:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: `✅ Sănătate financiară: ${healthStatus}`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `⚠️ Alerte identificate: ${alerts}`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `🎯 Recomandări prioritare: Vezi secțiunile "Zone de Risc" și "Soluții de Optimizare"`,
          spacing: { after: 400 }
        }),
        
        // CHENAR GRI - Call to Action după REZUMAT EXECUTIV
        ...createChatAICallToAction('section')
      );
      
      // Parcurge clasele 1-7
      const classNames: Record<number, string> = {
        1: 'CAPITALURI',
        2: 'IMOBILIZĂRI',
        3: 'STOCURI',
        4: 'TERȚI (Clienți, Furnizori, etc.)',
        5: 'TREZORERIE (Bănci, Casă)',
        6: 'CHELTUIELI',
        7: 'VENITURI'
      };
      
      for (let classNum = 1; classNum <= 7; classNum++) {
        const accounts = accountsByClass[classNum] || [];
        if (accounts.length === 0) continue;
        
        sections.push(
          new Paragraph({
            text: `\nCLASA ${classNum}: ${classNames[classNum]}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );
        
        accounts.forEach(acc => {
          const explanation = getAccountExplanation(acc);
          
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${acc.code} - `, bold: true }),
                new TextRun({ text: acc.name })
              ],
              spacing: { before: 200 }
            }),
            new Paragraph({
              text: explanation,
              spacing: { after: 200 }
            })
          );
        });
        
        // CHENAR GRI - Call to Action după fiecare clasă
        sections.push(...createChatAICallToAction('section'));
      }
      
      // ========== ZONE DE RISC ȘI ALERTE ==========
      const critical: string[] = [];
      const warnings: string[] = [];
      const vat = structuredData.accounts.find(a => a.code === '4427')?.credit || 0;
      
      if (totalCash < 1000) {
        critical.push('🔴 Sold bancă + casă FOARTE SCĂZUT (<1000 RON) - risc URGENT de cash-flow! Prioritizează încasările sau caută finanțare.');
      }
      if (vat > 500) {
        critical.push(`🔴 TVA de plată neachitat: ${vat.toLocaleString('ro-RO')} RON - risc de BLOCARE cont ANAF! Plătește URGENT până la scadență.`);
      }
      if (suppliers > 10000) {
        critical.push(`🔴 Furnizori neplătiți: ${suppliers.toLocaleString('ro-RO')} RON - risc de penalități și pierdere furnizori! Stabilește plan de plată.`);
      }
      
      if (loss > 0) {
        warnings.push(`🟡 Pierdere înregistrată: ${loss.toLocaleString('ro-RO')} RON - reduce cheltuielile sau crește veniturile!`);
      }
      if (cash > 5000) {
        warnings.push(`🟡 Numerar în casă mare: ${cash.toLocaleString('ro-RO')} RON - depune în bancă pentru siguranță (limită legală 50.000 RON).`);
      }
      
      sections.push(
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 }
        }),
        new Paragraph({
          text: "⚠️ ZONE DE RISC IDENTIFICATE",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );
      
      if (critical.length > 0) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: "ALERTE CRITICE (Acționează URGENT):", bold: true })],
            shading: { fill: "FFEBEE" },
            spacing: { before: 200, after: 100 }
          })
        );
        critical.forEach(alert => {
          sections.push(new Paragraph({ text: alert, spacing: { after: 100 } }));
        });
      }
      
      if (warnings.length > 0) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: "\nAVERTISMENTE (Monitorizează):", bold: true })],
            shading: { fill: "FFF9C4" },
            spacing: { before: 300, after: 100 }
          })
        );
        warnings.forEach(warning => {
          sections.push(new Paragraph({ text: warning, spacing: { after: 100 } }));
        });
      }
      
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "\nRECOMANDĂRI GENERALE:", bold: true })],
          spacing: { before: 300, after: 100 }
        }),
        new Paragraph({ text: "✓ Verifică lunar balanța cu contabilul", spacing: { after: 50 } }),
        new Paragraph({ text: "✓ Reconciliază conturile bancare săptămânal", spacing: { after: 50 } }),
        new Paragraph({ text: "✓ Monitorizează cash-flow-ul zilnic", spacing: { after: 50 } }),
        new Paragraph({ text: "✓ Păstrează TOATE documentele justificative (facturi, chitanțe)", spacing: { after: 400 } }),
        
        // CHENAR GRI - Call to Action după ZONE DE RISC
        ...createChatAICallToAction('section')
      );
      
      // ========== SOLUȚII DE OPTIMIZARE ==========
      sections.push(
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 }
        }),
        new Paragraph({
          text: "💡 SOLUȚII DE OPTIMIZARE FINANCIARĂ",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "OPTIMIZĂRI IMEDIATE (poți face ACUM):", bold: true })],
          shading: { fill: "E8F5E9" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "✅ Reduce cheltuieli bancare - negociază sau schimbă banca", spacing: { after: 50 } }),
        new Paragraph({ text: "✅ Automatizează plățile recurente - economisești timp", spacing: { after: 50 } }),
        new Paragraph({ text: "✅ Solicită discounturi de la furnizori pentru plată anticipată", spacing: { after: 50 } }),
        new Paragraph({ text: "✅ Monitorizează consumul de combustibil/utilități - reduce risipa", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "OPTIMIZĂRI PE TERMEN MEDIU (1-3 luni):", bold: true })],
          shading: { fill: "E3F2FD" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "📈 Crește prețurile sau volumul vânzărilor", spacing: { after: 50 } }),
        new Paragraph({ text: "📉 Renegociază contractele cu furnizorii", spacing: { after: 50 } }),
        new Paragraph({ text: "💰 Implementează sistem de recuperare creanțe (clienți restanți)", spacing: { after: 50 } }),
        new Paragraph({ text: "📦 Optimizează stocurile - vinde sau returnează produsele stagnante", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "OPTIMIZĂRI STRATEGICE (3-12 luni):", bold: true })],
          shading: { fill: "F3E5F5" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "🎯 Diversifică sursele de venit", spacing: { after: 50 } }),
        new Paragraph({ text: "💼 Externalizează activități non-core (contabilitate, IT, curățenie)", spacing: { after: 50 } }),
        new Paragraph({ text: "🏦 Refinanțează creditele scumpe", spacing: { after: 50 } }),
        new Paragraph({ text: "📊 Implementează software de management financiar", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "ECONOMII ESTIMATE:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "→ Reduce comisioanele bancare: 100-300 RON/lună", spacing: { after: 50 } }),
        new Paragraph({ text: "→ Optimizează consumuri: 200-500 RON/lună", spacing: { after: 50 } }),
        new Paragraph({ text: `→ Recuperează creanțe: ${clients.toLocaleString('ro-RO')} RON`, spacing: { after: 50 } }),
        new Paragraph({ 
          children: [new TextRun({ text: "→ TOTAL POTENȚIAL: 300-800 RON/lună = 3.600-9.600 RON/an", bold: true })],
          spacing: { after: 400 } 
        }),
        
        // CHENAR GRI - Call to Action după SOLUȚII DE OPTIMIZARE
        ...createChatAICallToAction('section')
      );
      
      // ========== CHECKLIST DE VERIFICARE ==========
      sections.push(
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 }
        }),
        new Paragraph({
          text: "✅ CHECKLIST LUNAR DE VERIFICARE",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "VERIFICĂRI OBLIGATORII (fă LUNAR):", bold: true })],
          shading: { fill: "FFEBEE" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "□ Compară soldul băncii (5121) cu extrasul bancar", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Compară soldul casei (5311) cu registrul de casă", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Verifică clienții restanți (411) - contactează-i", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Verifică scadențele furnizorilor (401) - plătește la timp", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Verifică TVA de plată (4427) - nu rata scadența!", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Verifică salarii și contribuții (421, 431, 437) - plătește în termen", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "VERIFICĂRI FINANCIARE:", bold: true })],
          shading: { fill: "E3F2FD" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "□ Analizează profitul/pierderea (121) - evoluție pozitivă?", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Compară veniturile cu luna anterioară - creștere sau scădere?", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Compară cheltuielile cu veniturile - sunt sub control?", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Calculează marja comercială (707-607) - e suficientă?", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "VERIFICĂRI FISCALE:", bold: true })],
          shading: { fill: "FFF9C4" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "□ Toate facturile au TVA corect calculat", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Toate cheltuielile au documente justificative", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Colaboratorii (621) au contract și factură", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Deplasările (625) au bon fiscal și ordin de deplasare", spacing: { after: 300 } }),
        
        new Paragraph({
          children: [new TextRun({ text: "VERIFICĂRI LEGALE:", bold: true })],
          shading: { fill: "E8F5E9" },
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: "□ Toate documentele sunt arhivate corect", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Contractele cu furnizorii sunt valabile", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Licențele și autorizațiile sunt în termen", spacing: { after: 50 } }),
        new Paragraph({ text: "□ Asigurările (RCA, CASCO, etc.) sunt la zi", spacing: { after: 400 } }),
        
        // CHENAR GRI - Call to Action după CHECKLIST LUNAR
        ...createChatAICallToAction('section')
      );
      
      // Footer comun pentru ANTREPRENOR
      sections.push(
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 }
        }),
        new Paragraph({
          text: "📄 INFORMAȚII DOCUMENT",
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: "═══════════════════════════════════════════",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: `Document generat automat de: Yana AI - Platformă de analiză financiară`, italics: true })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Data generării: ${new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}`, italics: true })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Versiune raport: 2.0 (Premium - Analiză Completă)`, italics: true })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Sursa datelor: Balanță de verificare contabilă`, italics: true })],
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "ASISTENȚĂ ȘI SUPORT:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "→ Pentru întrebări despre conturi specifice, contactează contabilul",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "→ Pentru optimizări personalizate, accesează Consilier Strategic în platformă",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "→ Pentru alertele ANAF și legislație fiscală, vezi secțiunea Știri Fiscale",
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [new TextRun({ text: "IMPORTANT:", bold: true })],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "Acest raport este generat automat pe baza datelor din balanță. Recomandăm verificarea și validarea cu un contabil autorizat înainte de luarea deciziilor financiare majore.", italics: true })],
          spacing: { after: 400 },
          alignment: AlignmentType.JUSTIFIED
        }),
        
        // CHENAR ROȘU MARE - FINAL CALL TO ACTION
        ...createChatAICallToAction('final')
      );
      } // ✅ Sfârșit ELSE block pentru ANTREPRENOR
      
      // ========== COD COMUN PENTRU AMBELE MODURI ==========
      
      // Creare document
      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      });
      
      // Generare și download
      const blob = await Packer.toBlob(doc);
      const fileName = `Raport_Financiar_${structuredData.cui}_${new Date().toISOString().split('T')[0]}.docx`;
      console.log('📄 Salvare document cu numele:', fileName);
      saveAs(blob, fileName);
      
      // Salvare în baza de date
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Încearcă să găsești company_id după CUI
        let companyId = null;
        if (structuredData.cui) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('id')
            .eq('cui', structuredData.cui)
            .single();
          
          if (companyData) companyId = companyData.id;
        }

        const { error: saveError } = await supabase
          .from('balance_confirmations')
          .insert({
            user_id: user.id,
            company_id: companyId,
            cui: structuredData.cui,
            company_name: structuredData.company,
          accounts_data: structuredData.accounts
        });
        
        if (saveError) {
          console.error('❌ [ChatAI] Eroare salvare confirmare:', saveError);
          toast({
            title: '⚠️ Avertisment',
            description: 'Raportul Word a fost generat, dar nu a putut fi salvat în istoric.',
            variant: 'destructive'
          });
        } else {
          console.log('✅ [ChatAI] Confirmare salvată în istoric');
          // 🔄 Declanșează refetch în BalanceConfirmationHistory
          window.dispatchEvent(new Event('balanceConfirmationAdded'));
        }
      }
      
      toast({
        title: '✅ Document Word generat!',
        description: 'Găsești toate analizele tale salvate în tab-ul "Dosarul Meu" 📂',
        duration: 6000
      });
      
      // Reset state pentru următoarea analiză
      setBalanceStructuredData(null);
      
    } catch (error) {
      console.error('Eroare generare Word:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut genera documentul Word.',
        variant: 'destructive'
      });
    }
  };

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
      <Card className={`pointer-events-auto ${isMaximized ? 'w-full flex-1 m-4 h-[calc(100vh-2rem)]' : 'w-[95vw] sm:w-[480px] md:w-[560px] lg:w-[640px] h-[70vh] md:h-[580px]'} bg-background/80 backdrop-blur-md shadow-2xl border border-primary/20 rounded-2xl overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3 px-3 md:px-4 border-b bg-gradient-to-r from-background to-muted/30">
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
              <div className="ml-4 flex-1 min-w-0 flex flex-wrap items-center gap-2 bg-muted/50 rounded-lg p-2 border-2 border-primary/20 max-w-full overflow-x-auto">
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

          {/* Grup dreapta - Controale unificate */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showHistory ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-8 w-8 hidden md:flex relative"
                    aria-label="Istoric conversații"
                    data-tour="conversation-history"
                  >
                    <History className="h-3.5 w-3.5" />
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
                    className="h-8 w-8"
                    aria-label="Conversație vocală"
                    data-tour="voice-button"
                  >
                    <Mic className="h-3.5 w-3.5" />
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
                    className="h-8 w-8 relative"
                    aria-label="Alerte"
                  >
                    <Bell className="h-3.5 w-3.5" />
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
                    className="h-8 w-8 hidden lg:flex"
                    aria-label="Mod Lectură"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
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
                    className="h-8 w-8"
                    aria-label={isMaximized ? 'Minimizează' : 'Maximizează'}
                  >
                    {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMaximized ? 'Minimizează' : 'Maximizează'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Închide chat"
                    data-tour="close-chatai"
                  >
                    <X className="h-3.5 w-3.5" />
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
                      
                      {/* Preview și buton generare Word (doar pentru analiză balanță) */}
                      {msg.role === 'assistant' && chatMode === 'balance' && msg.structuredData && (
                        <div className="mt-3 p-3 bg-accent/5 rounded-lg border border-accent/20 space-y-3">
                          <div className="text-sm space-y-1.5">
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground">CUI:</span>
                              <span className="text-foreground">{msg.structuredData.cui || 'N/A'}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground">Companie:</span>
                              <span className="text-foreground">{msg.structuredData.company || 'N/A'}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground">Conturi detectate:</span>
                              <Badge variant="secondary" className="ml-1">
                                {msg.structuredData.accounts?.length || 0}
                              </Badge>
                            </p>
                        </div>
                          
                          {/* Banner VIZIBIL - Dosarul Meu */}
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 text-2xl">📂</div>
                              <div className="flex-1">
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 text-sm">
                                  ✅ Analiza ta este salvată automat!
                                </h4>
                                <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed mb-3">
                                  Găsești toate analizele tale în tab-ul <span className="font-bold bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded">"Dosarul Meu"</span> din Dashboard. 
                                  Poți revedea datele și regenera rapoarte oricând dorești.
                                </p>
                                <Button
                                  onClick={() => window.location.href = '/app'}
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  📁 Toate Analizele Mele
                                </Button>
                              </div>
                            </div>
                          </div>
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
                          data-tour="file-upload"
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
              <div className="flex-1 flex gap-2" data-tour="chat-input-area">
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
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
