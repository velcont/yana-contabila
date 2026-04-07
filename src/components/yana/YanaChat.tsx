import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, Search, Lightbulb, ThumbsUp, ThumbsDown, ChevronUp, BarChart3, Scale, Sparkles, ShieldAlert, Brain } from 'lucide-react';
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
import { TypingIndicator } from '@/components/TypingIndicator';
import { OnboardingFlow, type OnboardingAnswers } from './OnboardingFlow';
import { SuggestionChips } from './SuggestionChips';
import { ActionItemsPanel } from './ActionItemsPanel';
import { OfficeFeatureAnnouncement } from './OfficeFeatureAnnouncement';

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
  type: 'radar_chart' | 'bar_chart' | 'line_chart' | 'table' | 'download' | 'document_download' | 'war_room' | 'battle_plan' | 'ai_strategy_form' | 'ai_strategy_results';
  data: unknown;
  title?: string;
  downloadUrl?: string;
  fileName?: string;
  onStrategySubmit?: (profile: import('@/config/aiStrategyData').BusinessProfile) => void;
  isStrategyLoading?: boolean;
  isStrategySubmitted?: boolean;
  strategyProfile?: import('@/config/aiStrategyData').BusinessProfile;
}

interface YanaChatProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  resetKey?: number;
}

export function YanaChat({ conversationId, onConversationCreated, resetKey }: YanaChatProps) {
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
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategySubmitted, setStrategySubmitted] = useState(false);
  const [strategyProfile, setStrategyProfile] = useState<import('@/config/aiStrategyData').BusinessProfile | null>(null);

  const [onboardingNeeded, setOnboardingNeeded] = useState<boolean | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('yana_client_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Need onboarding if no profile exists or onboarding not completed
      const completed = (data as any)?.onboarding_completed === true;
      setOnboardingNeeded(!completed);
    };
    
    checkOnboarding();
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
  
  // Guard: prevent loadMessages from overwriting state during active send
  const isSendingRef = useRef(false);

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

      // Skip loading if we're in the middle of sending a message (race condition fix)
      if (isSendingRef.current) {
        conversationLoadedRef.current = true;
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
    isSendingRef.current = true;

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
      if ((response.route === 'analyze-balance' || response.route === 'analyze-balance-saga') && response.structuredData) {
        // Save balance context for future messages in this conversation
        setBalanceContext(response.structuredData);
        
        // 🆕 AUTO-GENERATE 3 VISUAL CHARTS from structuredData
        try {
          const accounts = response.structuredData.accounts || [];
          
          // Chart 1: Profit / Pierdere (Venituri vs Cheltuieli)
          const totalVenituri = accounts
            .filter((a: { accountClass: number; credit: number }) => a.accountClass === 7)
            .reduce((sum: number, a: { credit: number }) => sum + (a.credit || 0), 0);
          const totalCheltuieli = accounts
            .filter((a: { accountClass: number; debit: number }) => a.accountClass === 6)
            .reduce((sum: number, a: { debit: number }) => sum + (a.debit || 0), 0);
          const rezultat = totalVenituri - totalCheltuieli;
          
          if (totalVenituri > 0 || totalCheltuieli > 0) {
            artifacts.push({
              type: 'bar_chart',
              title: `📊 Profit / Pierdere: ${rezultat >= 0 ? '+' : ''}${Math.round(rezultat).toLocaleString('ro-RO')} RON`,
              data: {
                'Venituri (Cl.7)': Math.round(totalVenituri),
                'Cheltuieli (Cl.6)': Math.round(totalCheltuieli),
                'Rezultat': Math.round(rezultat),
              },
            });
          }

          // Chart 2: Top 5 Cheltuieli (cele mai mari conturi din Clasa 6)
          const cheltuieliConturi = accounts
            .filter((a: { accountClass: number; debit: number; code: string }) => a.accountClass === 6 && a.debit > 0)
            .sort((a: { debit: number }, b: { debit: number }) => b.debit - a.debit)
            .slice(0, 5);
          
          if (cheltuieliConturi.length > 0) {
            const topExpenses: Record<string, number> = {};
            cheltuieliConturi.forEach((a: { code: string; name: string; debit: number }) => {
              const label = `${a.code} ${(a.name || '').substring(0, 20)}`;
              topExpenses[label] = Math.round(a.debit);
            });
            artifacts.push({
              type: 'bar_chart',
              title: '💰 Top 5 Cheltuieli',
              data: topExpenses,
            });
          }

          // Chart 3: Cash Runway (numerar disponibil vs cheltuieli lunare)
          const cashAccounts = accounts.filter(
            (a: { code: string; finalDebit: number }) => 
              a.code.startsWith('512') || a.code.startsWith('531')
          );
          const totalCash = cashAccounts.reduce(
            (sum: number, a: { finalDebit: number }) => sum + (a.finalDebit || 0), 0
          );
          
          if (totalCash > 0 && totalCheltuieli > 0) {
            // Detectează numărul de luni din perioada balanței
            const period = response.structuredData?.period || '';
            let monthsInPeriod = 12; // fallback
            const periodMatch = period.match(/(\d{2})\.(\d{4})\s*[-–]\s*(\d{2})\.(\d{4})/);
            if (periodMatch) {
              const startMonth = parseInt(periodMatch[1]);
              const endMonth = parseInt(periodMatch[3]);
              const startYear = parseInt(periodMatch[2]);
              const endYear = parseInt(periodMatch[4]);
              monthsInPeriod = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth + 1));
            } else {
              // Fallback: caută doar o lună (ex: "Ianuarie 2025")
              const singleMonthMatch = period.match(/(\d{2})\.(\d{4})$/);
              if (singleMonthMatch) {
                monthsInPeriod = parseInt(singleMonthMatch[1]) || 12;
              }
            }
            const cheltuieliLunare = totalCheltuieli / monthsInPeriod;
            const runwayLuni = cheltuieliLunare > 0 ? totalCash / cheltuieliLunare : 0;
            artifacts.push({
              type: 'bar_chart',
              title: `🏦 Cash Runway: ~${Math.round(runwayLuni)} luni`,
              data: {
                'Cash disponibil': Math.round(totalCash),
                'Cheltuieli/lună (est.)': Math.round(cheltuieliLunare),
              },
            });
          }
        } catch (chartError) {
          console.error('Error generating charts:', chartError);
        }

        // Generate Word report
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
        aiConversationId: response.aiConversationId || null,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 🆕 Pro Tips after balance analysis - discovery organic al funcțiilor premium
      // Arată Pro Tip doar o singură dată per utilizator (verificăm localStorage)
      if (response.route === 'analyze-balance' || response.route === 'analyze-balance-saga') {
        const proTipShownKey = `yana_pro_tip_shown_${user!.id}`;
        const alreadyShown = localStorage.getItem(proTipShownKey);
        
        if (!alreadyShown) {
          const proTips = [
            '💡 **Știai că pot să-ți simulez scenarii?** Spune "War Room" și îți arăt ce se întâmplă dacă pierzi cel mai mare client sau cresc costurile cu 20%.',
            '⚔️ **Vrei un plan de acțiune concret?** Spune "Battle Plan" și îți creez un plan strategic bazat pe cifrele tale reale.',
            '📊 **Compară perioade diferite!** Încarcă balanța lunii anterioare și îți arăt exact ce s-a schimbat.',
          ];
          const randomTip = proTips[Math.floor(Math.random() * proTips.length)];
          
          localStorage.setItem(proTipShownKey, new Date().toISOString());
          
          setTimeout(() => {
            const tipMessage: Message = {
              id: `pro-tip-${Date.now()}`,
              role: 'assistant',
              content: randomTip,
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, tipMessage]);
          }, 2000);
        }
      }

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
        
        // 🆕 FIX COMPANY CONFUSION: Detect if company changed and REPLACE (not merge) metadata
        const { data: existingConv } = await supabase
          .from('yana_conversations')
          .select('metadata')
          .eq('id', convId)
          .single();

        const existingMetadata = (existingConv?.metadata || {}) as Record<string, unknown>;
        
        // Check if company changed - if so, clear old balanceContext to prevent mixing
        const oldCompanyName = (existingMetadata.companyName as string || '').toLowerCase().trim();
        const newCompanyLower = (newCompanyName || '').toLowerCase().trim();
        const companyChanged = oldCompanyName && newCompanyLower && oldCompanyName !== newCompanyLower;
        
        if (companyChanged && response.structuredData) {
          console.log(`[YanaChat] ⚠️ COMPANY CHANGED: "${oldCompanyName}" → "${newCompanyLower}" - REPLACING metadata (not merging)`);
          // Full replacement: clear old balance data to prevent confusion
          await supabase
            .from('yana_conversations')
            .update({ 
              metadata: metadataUpdate as never,
              title: `Analiză ${newCompanyName}`,
            })
            .eq('id', convId);
        } else {
          // Same company or no previous company - safe to merge
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

  const handleStrategySubmit = useCallback(async (profile: import('@/config/aiStrategyData').BusinessProfile) => {
    if (!user) return;
    setStrategyLoading(true);
    setStrategyProfile(profile);

    try {
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
        onConversationCreated(convId);
      }

      // Add user summary message
      const userMsg: Message = {
        id: `strategy-user-${Date.now()}`,
        role: 'user',
        content: `Analizează strategia AI pentru afacerea mea: ${profile.industry}, ${profile.employeesCount} angajați, CA ${profile.annualRevenue.toLocaleString('ro-RO')} RON`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => prev.map(m => 
        m.artifacts?.some(a => a.type === 'ai_strategy_form') 
          ? { ...m, artifacts: m.artifacts?.map(a => a.type === 'ai_strategy_form' ? { ...a, isStrategySubmitted: true } : a) }
          : m
      ));
      setMessages(prev => [...prev, userMsg]);

      await supabase.from('yana_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: userMsg.content,
      });

      // Call edge function directly
      const { data: response, error } = await supabase.functions.invoke('ai-strategy-advisor', {
        body: {
          industry: profile.industry,
          employeesCount: profile.employeesCount,
          annualRevenue: profile.annualRevenue,
          netProfit: profile.netProfit,
          departments: profile.departments,
          businessDescription: profile.businessDescription,
        },
      });

      if (error) throw error;

      const analysis = response.analysis || response;

      const assistantMsg: Message = {
        id: `strategy-result-${Date.now()}`,
        role: 'assistant',
        content: '📊 Am finalizat analiza strategică. Iată oportunitățile AI identificate, costurile estimate, previziunile ROI și planul de implementare:',
        artifacts: [{
          type: 'ai_strategy_results' as const,
          data: analysis,
          strategyProfile: profile,
        }],
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStrategySubmitted(true);

      // Save assistant message
      await supabase.from('yana_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantMsg.content,
        artifacts: assistantMsg.artifacts as unknown as import('@/integrations/supabase/types').Json,
      });

    } catch (err) {
      console.error('Strategy error:', err);
      toast.info('Nu am putut genera analiza. Încearcă din nou.');
    } finally {
      setStrategyLoading(false);
    }
  }, [conversationId, user, onConversationCreated]);

  const handleStartStrategy = useCallback(() => {
    const formMsg: Message = {
      id: `strategy-form-${Date.now()}`,
      role: 'assistant',
      content: '🧠 Hai să analizăm cum poate AI-ul să transforme afacerea ta. Completează datele de mai jos:',
      artifacts: [{
        type: 'ai_strategy_form' as const,
        data: null,
        onStrategySubmit: handleStrategySubmit,
        isStrategyLoading: strategyLoading,
        isStrategySubmitted: strategySubmitted,
      }],
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, formMsg]);
    setStrategySubmitted(false);
  }, [handleStrategySubmit, strategyLoading, strategySubmitted]);

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
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
   
   // Detect if page was refreshed (reload) vs normal navigation
   const isPageReload = useRef<boolean>(
     (() => {
       try {
         const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
         return navigation?.type === 'reload';
       } catch {
         return false;
       }
     })()
   );
   
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

  // Generate welcome message content for new conversations
  const getWelcomeMessage = () => {
     // Check if this is a page refresh - show thank you message
     const wasReloaded = isPageReload.current;
     
     if (wasReloaded && isNewUser === false) {
       // User refreshed the page - thank them!
       if (userName) {
         return `Mulțumesc, ${userName}! 😊 Acum ai ultima versiune.
 
 Cu ce te pot ajuta azi?`;
       }
       return `Mulțumesc! 😊 Acum ai ultima versiune.
 
 Cu ce te pot ajuta?`;
     }
     
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
      return `Salut, ${userName}! Mă bucur să te văd din nou. 😊

🔄 Actualizează pagina pentru ultima versiune:
Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
Mobil: Trage în jos pentru refresh

Gata? Hai să începem! Cu ce te pot ajuta azi?`;
    }
    return `Salut! Mă bucur că ai revenit. 😊

🔄 Actualizează pagina pentru ultima versiune:
Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
Mobil: Trage în jos pentru refresh

Gata? Hai să începem! Cu ce te pot ajuta?`;
  };

  // Add automatic welcome message for new conversations (as assistant message)
  useEffect(() => {
    // Only for new conversations (no conversationId) with no messages yet
    if (conversationId === null && messages.length === 0 && !welcomeMessageShown && isNewUser !== null) {
      const welcomeContent = getWelcomeMessage();
      if (welcomeContent) {
        const welcomeMsg: Message = {
          id: 'welcome-auto',
          role: 'assistant',
          content: welcomeContent,
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
        setWelcomeMessageShown(true);
      }
    }
  }, [conversationId, messages.length, welcomeMessageShown, isNewUser, userName]);

  // Reset welcome shown AND clear messages when starting a new conversation
  useEffect(() => {
    if (conversationId === null) {
      setMessages([]);
      setWelcomeMessageShown(false);
      setActiveContext(null);
      setBalanceContext(null);
    }
  }, [conversationId, resetKey]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Context Indicator */}
      {activeContext?.companyName && (
        <ContextIndicator
          companyName={activeContext.companyName}
          onClear={() => setActiveContext(null)}
        />
      )}

      {/* Office Feature Announcement */}
      <OfficeFeatureAnnouncement />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
      >
        {/* Proactive Initiative Card - displayed before messages */}
        {proactiveInitiative && (
          <ProactiveInitiativeCard
            content={proactiveInitiative.content}
            initiativeType={proactiveInitiative.initiative_type}
            onDismiss={handleDismissInitiative}
          />
        )}

        {/* Onboarding Flow - shown for new users without completed onboarding */}
        {onboardingNeeded && !onboardingCompleted && conversationId === null && messages.length <= 1 && (
          <OnboardingFlow
            userId={user!.id}
            userName={userName}
            onComplete={(answers) => {
              setOnboardingCompleted(true);
              setOnboardingNeeded(false);
            }}
          />
        )}

        {/* Action Items Panel - shows pending tasks */}
        {!onboardingNeeded && messages.length <= 1 && (
          <div className="max-w-3xl mx-auto">
            <ActionItemsPanel onAskYana={(msg) => sendMessage(msg)} />
          </div>
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
                  {message.artifacts.map((artifact, index) => {
                    // Inject live callbacks for strategy form artifacts
                    if (artifact.type === 'ai_strategy_form') {
                      return (
                        <ArtifactRenderer key={index} artifact={{
                          ...artifact,
                          onStrategySubmit: handleStrategySubmit,
                          isStrategyLoading: strategyLoading,
                          isStrategySubmitted: strategySubmitted,
                        }} />
                      );
                    }
                    if (artifact.type === 'ai_strategy_results' && strategyProfile) {
                      return (
                        <ArtifactRenderer key={index} artifact={{
                          ...artifact,
                          strategyProfile: artifact.strategyProfile || strategyProfile,
                        }} />
                      );
                    }
                    return <ArtifactRenderer key={index} artifact={artifact} />;
                  })}
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
              
              {/* Quick Actions - shown after welcome message only */}
              {message.id === 'welcome-auto' && (
                <div className="flex flex-wrap gap-2 pt-4 mt-3 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs touch-action-manipulation"
                    onClick={() => setShowUploader(true)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Analiză financiară
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs touch-action-manipulation"
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
                    className="h-9 px-3 text-xs touch-action-manipulation"
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
                     className="h-9 px-3 text-xs touch-action-manipulation border-amber-500/30 hover:bg-amber-500/10"
                     onClick={() => {
                       sendMessage('Care e riscul meu de control ANAF pe baza balanței?');
                     }}
                   >
                     <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-500" />
                     Risc ANAF
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     className="h-9 px-3 text-xs touch-action-manipulation border-blue-500/30 hover:bg-blue-500/10"
                     onClick={handleStartStrategy}
                   >
                     <Brain className="h-4 w-4 mr-1.5 text-blue-500" />
                     Strategie AI
                   </Button>
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
          <div className="max-w-3xl mx-auto">
            <TypingIndicator 
              variant={activeContext?.companyName ? 'analyzing' : 'thinking'} 
              showProgress={true}
            />
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
          {/* Suggestion Chips - visible when no onboarding is in progress */}
          {!onboardingNeeded && (
            <SuggestionChips
              onSendMessage={(msg) => sendMessage(msg)}
              onUpload={() => setShowUploader(true)}
              disabled={isLoading}
              postAnalysis={!!balanceContext}
            />
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