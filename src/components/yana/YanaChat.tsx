import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, Search, Lightbulb, ThumbsUp, ThumbsDown, ChevronUp, BarChart3, Scale, Sparkles, ShieldAlert } from 'lucide-react';
import { saveFeedback } from '@/lib/ai/conversational-memory';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from './DocumentUploader';
import { ArtifactRenderer } from './ArtifactRenderer';
import { ContextIndicator } from './ContextIndicator';
import { SourcesDisplay } from './SourcesDisplay';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePremiumWordReport } from '@/utils/generatePremiumWordReport';
import { Link } from 'react-router-dom';
import { ProactiveInitiativeCard } from './ProactiveInitiativeCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  created_at: string;
  route?: string;
  sources?: string[];
  aiConversationId?: string; // ID din ai_conversations pentru feedback
}

interface Artifact {
  type: 'radar_chart' | 'bar_chart' | 'line_chart' | 'table' | 'download' | 'war_room' | 'battle_plan';
  data: unknown;
  title?: string;
  downloadUrl?: string;
  fileName?: string;
}

interface YanaChatProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function YanaChat({ conversationId, onConversationCreated }: YanaChatProps) {
  const { user } = useAuth();
  const { hasCredits, hasFreeAccess, isLoading: creditsLoading } = useAICredits();
  const { accessType, loading: subLoading } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [activeContext, setActiveContext] = useState<{ companyName?: string; balanceId?: string } | null>(null);
  const [balanceContext, setBalanceContext] = useState<unknown>(null); // Memoria balanței pentru conversație
  const [userName, setUserName] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [proactiveInitiative, setProactiveInitiative] = useState<{
    id: string;
    content: string;
    initiative_type: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user profile for personalized greeting
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (data?.full_name) {
        const firstName = data.full_name.split(' ')[0];
        setUserName(firstName);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Fetch proactive initiatives (e.g., apology messages from YANA)
  useEffect(() => {
    const fetchProactiveInitiatives = async () => {
      if (!user) return;
      
      // Caută inițiative trimise în ultimele 7 zile care nu au fost afișate
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: initiatives, error } = await supabase
        .from('yana_initiatives')
        .select('id, content, initiative_type, sent_at')
        .eq('user_id', user.id)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('[YanaChat] Error fetching initiatives:', error);
        return;
      }
      
      if (initiatives && initiatives.length > 0) {
        const initiative = initiatives[0];
        // Verifică dacă a fost deja afișat (dismissed) în localStorage
        const dismissedKey = `yana_initiative_dismissed_${initiative.id}`;
        const isDismissed = localStorage.getItem(dismissedKey);
        
        if (!isDismissed) {
          setProactiveInitiative({
            id: initiative.id,
            content: initiative.content,
            initiative_type: initiative.initiative_type,
          });
          console.log('[YanaChat] Showing proactive initiative:', initiative.initiative_type);
        }
      }
    };
    
    fetchProactiveInitiatives();
  }, [user]);

  // Track if conversation is fully loaded (for blocking send)
  const conversationLoadedRef = useRef(false);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      conversationLoadedRef.current = false;
      
      if (!conversationId) {
        setMessages([]);
        setActiveContext(null);
        setBalanceContext(null);
        return;
      }

      const { data, error } = await supabase
        .from('yana_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages((data || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        artifacts: (m.artifacts as unknown as Artifact[]) || [],
        created_at: m.created_at || new Date().toISOString(),
      })));

      // Load conversation context including balanceContext
      const { data: convData } = await supabase
        .from('yana_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();

      if (convData?.metadata) {
        const metadata = convData.metadata as { companyName?: string; balanceId?: string; balanceContext?: unknown };
        setActiveContext({ companyName: metadata.companyName, balanceId: metadata.balanceId });
        if (metadata.balanceContext) {
          setBalanceContext(metadata.balanceContext);
        }
      }
      
      conversationLoadedRef.current = true;
    };

    loadMessages();
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversation = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('yana_conversations')
      .insert({
        user_id: user!.id,
        title: 'Conversație nouă',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const sendMessage = useCallback(async (content: string, fileData?: { fileName: string; fileContent: string; fileType: string }) => {
    if (!content.trim() && !fileData) return;
    if (!user) return;

    setIsLoading(true);
    setInput('');

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
        onConversationCreated(convId);
      }

      // 🆕 FIX CRITICAL: ALWAYS fetch balanceContext from DB to avoid stale closure issues
      // React's useCallback captures balanceContext at creation time, so subsequent messages
      // may have stale/null values even though state was updated. Direct DB read is the only reliable fix.
      let effectiveBalanceContext: unknown = null;
      
      if (convId) {
        console.log('[YanaChat] ALWAYS fetching balanceContext from DB for conversation:', convId);
        try {
          const { data: convData } = await supabase
            .from('yana_conversations')
            .select('metadata')
            .eq('id', convId)
            .single();
          
          if (convData?.metadata) {
            const metadata = convData.metadata as { balanceContext?: unknown };
            if (metadata.balanceContext) {
              effectiveBalanceContext = metadata.balanceContext;
              console.log('[YanaChat] ✅ Loaded balanceContext from DB successfully:', 
                (metadata.balanceContext as {company?: string})?.company || 'unknown company');
            } else {
              console.log('[YanaChat] ⚠️ No balanceContext found in conversation metadata');
            }
          }
        } catch (err) {
          console.error('[YanaChat] Error fetching balanceContext from DB:', err);
        }
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: fileData ? `📎 ${fileData.fileName}\n\n${content}` : content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Save user message
      await supabase.from('yana_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: userMessage.content,
      });

      // 🆕 FIX STEP 2: Build history from FRESH DB data to avoid stale closure
      // Fetch fresh message history from DB to ensure we have complete context
      const { data: freshMessages } = await supabase
        .from('yana_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(30);
      
      // Include the current user message in history
      const allMessages = [
        ...(freshMessages || []),
        { role: 'user', content: content }
      ];
      
      // 🆕 FIX: Truncare inteligentă - păstrează primul 500 + ultimul 2000 caractere
      // Astfel păstrăm atât contextul inițial cât și cel recent/relevant
      const smartTruncate = (text: string, maxLen: number = 2500): string => {
        if (text.length <= maxLen) return text;
        const keepStart = 500;
        const keepEnd = maxLen - keepStart - 10; // 10 chars for separator
        return text.substring(0, keepStart) + '\n[...]\n' + text.substring(text.length - keepEnd);
      };
      
      const historyForAI = allMessages.slice(-25).map(m => ({
        role: m.role,
        content: smartTruncate(m.content)
      }));

      // Call AI router with history and balanceContext
      const { data: response, error } = await supabase.functions.invoke('ai-router', {
        body: {
          message: content,
          conversationId: convId,
          fileData,
          history: historyForAI,
          balanceContext: effectiveBalanceContext || undefined,
        },
      });

      if (error) throw error;

      // Build artifacts array
      const artifacts: Artifact[] = response.artifacts || [];

      // Generate Word report for balance analysis and save balanceContext
      if (response.route === 'analyze-balance' && response.structuredData) {
        // Save balance context for future messages in this conversation
        setBalanceContext(response.structuredData);
        
        try {
          const { blob, fileName } = await generatePremiumWordReport({
            structuredData: response.structuredData,
            grokValidation: response.grokValidation || null,
            companyInfo: {
              name: response.structuredData.company || response.companyName || 'Companie',
              cui: response.structuredData.cui || 'N/A'
            }
          });

          const downloadUrl = URL.createObjectURL(blob);
          artifacts.push({
            type: 'download',
            title: 'Raport Analiză Financiară',
            fileName: fileName,
            downloadUrl: downloadUrl,
            data: null
          });
        } catch (wordError) {
          console.error('Error generating Word report:', wordError);
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response || response.analysis || 'Am procesat cererea ta.',
        artifacts,
        created_at: new Date().toISOString(),
        route: response.route,
        sources: response.citations || response.sources,
        aiConversationId: response.aiConversationId || null, // Pentru feedback
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update context if company name was detected or balance was uploaded
      if (response.companyName || response.structuredData) {
        const newCompanyName = response.companyName || activeContext?.companyName;
        if (newCompanyName) {
          setActiveContext(prev => ({ ...prev, companyName: newCompanyName }));
        }
        
        // Update conversation metadata with balanceContext for persistence
        const metadataUpdate: { companyName?: string; balanceContext?: unknown } = {};
        if (newCompanyName) {
          metadataUpdate.companyName = newCompanyName;
        }
        if (response.structuredData) {
          metadataUpdate.balanceContext = response.structuredData;
        }
        
        // 🆕 FIX: Merge metadata instead of replacing to preserve balanceContext
        const { data: existingConv } = await supabase
          .from('yana_conversations')
          .select('metadata')
          .eq('id', convId)
          .single();

        const existingMetadata = (existingConv?.metadata || {}) as Record<string, unknown>;

        await supabase
          .from('yana_conversations')
          .update({ 
            metadata: {
              ...existingMetadata,
              ...metadataUpdate
            } as never,
            ...(newCompanyName ? { title: `Analiză ${newCompanyName}` } : {}),
          })
          .eq('id', convId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('credit') || errorMsg.includes('budget') || errorMsg.includes('Budget')) {
        toast.info('Sesiune întreruptă', { 
          description: 'Poți continua oricând - suntem aici când ești gata.' 
        });
      } else if (errorMsg.includes('rate') || errorMsg.includes('limit')) {
        toast.info('Un moment de răgaz', { 
          description: 'Îți pregătesc răspunsul - încearcă din nou în câteva secunde.' 
        });
      } else if (errorMsg.includes('Unauthorized') || errorMsg.includes('token') || errorMsg.includes('401')) {
        toast.info('Sesiune expirată', { 
          description: 'Te rog să te reconectezi pentru a continua.' 
        });
      } else {
        toast.info('Ceva nu a mers bine. Încearcă din nou.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user, onConversationCreated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileUpload = async (file: File, content: string) => {
    setShowUploader(false);
    await sendMessage(`Analizează documentul: ${file.name}`, {
      fileName: file.name,
      fileContent: content,
      fileType: file.type,
    });
  };

  const handleFeedback = async (messageId: string, wasHelpful: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.aiConversationId) {
      console.warn('[YanaChat] No aiConversationId for feedback');
      toast.error('Nu s-a putut salva feedback-ul');
      return;
    }
    
    const success = await saveFeedback(
      message.aiConversationId,
      wasHelpful,
      wasHelpful ? 5 : 1
    );
    
    if (success) {
      setFeedbackGiven(prev => ({ ...prev, [messageId]: true }));
      toast.success(wasHelpful ? 'Mulțumim pentru feedback pozitiv!' : 'Feedback înregistrat. Vom îmbunătăți răspunsurile!');
    } else {
      toast.error('Nu s-a putut salva feedback-ul');
    }
  };

  const handleDismissInitiative = () => {
    if (proactiveInitiative) {
      // Salvează în localStorage ca afișat/dismissed
      localStorage.setItem(`yana_initiative_dismissed_${proactiveInitiative.id}`, 'true');
      setProactiveInitiative(null);
    }
  };

  // Check if this is a new user (no previous conversations)
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkNewUser = async () => {
      if (!user) return;
      
      const { count } = await supabase
        .from('yana_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setIsNewUser(count === 0 || count === null);
    };
    
    checkNewUser();
  }, [user]);

  // Samantha-style welcome messages - warm, present, curious
  const getWelcomeMessage = () => {
    if (messages.length > 0) return null;
    
    // New user gets a warm, authentic welcome (Samantha-style)
    if (isNewUser === true) {
      if (userName) {
        return `Salut, ${userName}. Mă bucur că ești aici. 

Sunt Yana — nu sunt expert autorizat, dar pot să te ajut să gândești mai clar despre business, cifre și decizii. 

Când lucrurile devin complexe, îți voi spune sincer că merită să vorbești cu un specialist.

Spune-mi ce te frământă.`;
      }
      return `Salut. Mă bucur că ești aici.

Sunt Yana — nu sunt expert autorizat, dar pot să te ajut să gândești mai clar despre business, cifre și decizii.

Când lucrurile devin complexe, îți voi spune sincer că merită să vorbești cu un specialist.

Spune-mi ce te frământă.`;
    }
    
    // Returning user gets a warm, curious message (Samantha-style)
    if (userName) {
      return `Salut, ${userName}. Mă bucur să te văd din nou. 

Cum te simți azi? Cu ce te pot ajuta?`;
    }
    return `Salut. Mă bucur că ai revenit.

Cu ce te pot ajuta azi?`;
  };

  const welcomeMessage = getWelcomeMessage();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Context Indicator */}
      {activeContext?.companyName && (
        <ContextIndicator
          companyName={activeContext.companyName}
          onClear={() => setActiveContext(null)}
        />
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
      >
        {welcomeMessage && (
          <div className="flex justify-center py-10 sm:py-20">
            <div className="text-center space-y-3 sm:space-y-4 max-w-md px-4">
              <div className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl sm:text-2xl">Y</span>
              </div>
              <h2 className="text-lg sm:text-xl font-medium text-foreground whitespace-pre-line">{welcomeMessage}</h2>
              
              {/* Quick Actions - pentru discoverability */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm touch-action-manipulation"
                  onClick={() => setShowUploader(true)}
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Analiză financiară
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm touch-action-manipulation"
                  onClick={() => {
                    setInput('Dă-mi un sfat strategic pentru a crește profitul companiei mele');
                    textareaRef.current?.focus();
                  }}
                >
                  <Lightbulb className="h-4 w-4 mr-1.5" />
                  Sfat strategic
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm touch-action-manipulation"
                  onClick={() => {
                    setInput('Am o întrebare despre TVA și deduceri fiscale');
                    textareaRef.current?.focus();
                  }}
                >
                  <Scale className="h-4 w-4 mr-1.5" />
                  Întrebare fiscală
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm touch-action-manipulation border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => {
                    // Send the message directly - ai-router will handle missing balance gracefully
                    sendMessage('Care e riscul meu de control ANAF pe baza balanței?');
                  }}
                >
                  <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-500" />
                  Risc ANAF
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Proactive Initiative Card - displayed before messages */}
        {proactiveInitiative && (
          <ProactiveInitiativeCard
            content={proactiveInitiative.content}
            initiativeType={proactiveInitiative.initiative_type}
            onDismiss={handleDismissInitiative}
          />
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 max-w-3xl mx-auto',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">Y</span>
              </div>
            )}
            
            <div
              className={cn(
                'rounded-2xl px-4 py-3 max-w-[80%]',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {/* Render content - Markdown for assistant, plain text for user */}
              {message.role === 'assistant' ? (
                <MarkdownRenderer content={message.content} className="text-left" />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}
              
              {/* Display sources for fiscal responses */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <SourcesDisplay sources={message.sources} />
              )}
              
              {/* Render artifacts */}
              {message.artifacts && message.artifacts.length > 0 && (
                <div className="mt-4 space-y-3">
                  {message.artifacts.map((artifact, index) => (
                    <ArtifactRenderer key={index} artifact={artifact} />
                  ))}
                </div>
              )}

              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && message.aiConversationId && !feedbackGiven[message.id] && (
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground mr-2">Util?</span>
                  <button
                    onClick={() => handleFeedback(message.id, true)}
                    className="p-1.5 hover:bg-green-500/20 rounded-md transition-colors"
                    title="Răspuns util"
                    aria-label="Marchează răspunsul ca util"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground hover:text-green-500" />
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id, false)}
                    className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
                    title="Răspuns nu a fost util"
                    aria-label="Marchează răspunsul ca neutil"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              )}
              {message.role === 'assistant' && feedbackGiven[message.id] && (
                <div className="flex items-center gap-1 mt-3 pt-2 text-xs text-muted-foreground border-t border-border/30">
                  ✓ Mulțumim pentru feedback!
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground font-medium text-xs">
                  {userName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">Y</span>
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" 
                  style={{ animationDuration: '2s' }} 
                />
                <span className="text-sm text-muted-foreground">Gândesc...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Top Button - pozitionat cu safe-area pentru mobil */}
      {scrollPosition > 200 && (
        <button
          onClick={() => messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed right-4 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg z-20 hover:bg-primary/90 transition-colors touch-action-manipulation"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Upload Modal */}
      {showUploader && (
        <DocumentUploader
          onUpload={handleFileUpload}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Input Area - stil ChatGPT simplificat */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-3 sm:p-4 pb-safe">
        <div className="max-w-3xl mx-auto">
          {/* Subtle notification când nu are credite - exclude utilizatorii în trial */}
          {!hasCredits && !hasFreeAccess && accessType !== 'trial' && !creditsLoading && !subLoading && (
            <div className="mb-3 p-3 bg-muted/50 border border-border/50 rounded-lg flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Poți adăuga credite oricând pentru a continua.
              </p>
              <Link to="/pricing">
                <Button variant="outline" size="sm" className="shrink-0">
                  Vezi opțiuni
                </Button>
              </Link>
            </div>
          )}
          <div className="relative flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-11 w-11 sm:h-10 sm:w-10 touch-action-manipulation"
              onClick={() => setShowUploader(true)}
              disabled={isLoading}
              title="Încarcă document"
            >
              <Plus className="h-5 w-5" />
            </Button>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Întreabă orice despre afacerea ta..."
              className="min-h-[44px] max-h-32 resize-none bg-background border-border text-sm sm:text-base"
              disabled={isLoading}
            />
            
            <Button
              size="icon"
              className="shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-full touch-action-manipulation"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Footer ascuns pe mobil */}
          <div className="hidden sm:flex items-center justify-center gap-2 mt-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Yana poate face greșeli. Verifică informațiile importante.
            </p>
            <span className="text-xs text-muted-foreground">•</span>
            <Link to="/pricing" className="text-xs text-primary hover:underline">
              Prețuri
            </Link>
            <span className="text-xs text-muted-foreground">•</span>
            <Link to="/contact" className="text-xs text-primary hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}