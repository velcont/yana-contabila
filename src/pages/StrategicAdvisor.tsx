import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { 
  Loader2, 
  Brain, 
  AlertCircle,
  ArrowLeft,
  MessageSquarePlus,
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
  MoreVertical,
  History
} from "lucide-react";
import { ConversationHistory } from "@/components/ConversationHistory";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { ContextualHelp } from "@/components/ContextualHelp";
import { logger } from "@/lib/logger";
import { generateUUID } from "@/utils/uuid";
import { rateLimiter, RATE_LIMITS } from "@/utils/rateLimiter";
import { AI_COSTS } from "@/config/aiCosts";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { StrategicFactsPanel } from "@/components/StrategicFactsPanel";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import { WarRoomSimulator } from "@/components/strategic/WarRoomSimulator";
import { BattlePlanExport } from "@/components/strategic/BattlePlanExport";
import { ConsultYanaDialog } from "@/components/ConsultYanaDialog";
import { AlertTriangle, Plus, FileText, Bot } from "lucide-react";
import { detectGender, extractPreferredName } from "@/utils/genderDetection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  showFeedback?: boolean;
}

export default function StrategicAdvisor() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [conversationId, setConversationId] = useState(() => {
    const stored = localStorage.getItem('yana_strategic_conversation_id');
    if (stored) {
      logger.log("📖 [CONVERSATION] Reusing existing conversation:", stored);
      return stored;
    }
    const newId = generateUUID();
    localStorage.setItem('yana_strategic_conversation_id', newId);
    logger.log("🆕 [CONVERSATION] Created new conversation:", newId);
    return newId;
  });
  
  // History sheet state (ADDITIVE - new feature)
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [creditRemaining, setCreditRemaining] = useState<number>(0);
  const [isAdminUser, setIsAdminUser] = useState(false); // Admin bypass state
  
  // Sidebar and conflict dialog states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  
  // Personality states for welcome message
  const [userProfile, setUserProfile] = useState<{
    preferredName: string | null;
    detectedGender: 'male' | 'female' | 'unknown';
    relationshipLevel: number;
  } | null>(null);
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
  const [mobileWarningShown, setMobileWarningShown] = useState(() => {
    return localStorage.getItem('yana_strategic_mobile_warning_shown') === 'true';
  });
  // Set sidebar open on desktop after initial render
  useEffect(() => {
    if (isMobile === false) {
      setSidebarOpen(true);
    } else if (isMobile === true) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [warRoomOpen, setWarRoomOpen] = useState(false);

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

  // Load user personality profile and show welcome message
  useEffect(() => {
    if (!user || welcomeMessageShown) return;
    
    const loadOrCreatePersonalityProfile = async () => {
      try {
        logger.log("👤 [PERSONALITY] Loading user personality profile...");
        
        // First check if profile exists in user_personal_profile
        const { data: existingProfile } = await supabase
          .from('user_personal_profile')
          .select('preferred_name, detected_gender, relationship_level, total_conversations')
          .eq('user_id', user.id)
          .single();
        
        if (existingProfile) {
          logger.log("👤 [PERSONALITY] Found existing profile:", existingProfile);
          setUserProfile({
            preferredName: existingProfile.preferred_name,
            detectedGender: existingProfile.detected_gender as 'male' | 'female' | 'unknown',
            relationshipLevel: existingProfile.relationship_level || 1
          });
          return existingProfile;
        }
        
        // No profile exists - create one by detecting gender from profiles.full_name
        logger.log("👤 [PERSONALITY] No profile found, creating new one...");
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        const fullName = authProfile?.full_name || '';
        const detectedGender = detectGender(fullName);
        const preferredName = extractPreferredName(fullName);
        
        logger.log(`👤 [PERSONALITY] Detected: name="${preferredName}", gender="${detectedGender}"`);
        
        // Create new personality profile
        const { error: insertError } = await supabase
          .from('user_personal_profile')
          .insert({
            user_id: user.id,
            preferred_name: preferredName || null,
            detected_gender: detectedGender,
            relationship_level: 1,
            total_conversations: 0
          });
        
        if (insertError) {
          logger.error("❌ [PERSONALITY] Error creating profile:", insertError);
        }
        
        setUserProfile({
          preferredName: preferredName || null,
          detectedGender,
          relationshipLevel: 1
        });
        
        return { preferred_name: preferredName, detected_gender: detectedGender, relationship_level: 1 };
      } catch (error) {
        logger.error("❌ [PERSONALITY] Error loading profile:", error);
        return null;
      }
    };
    
    loadOrCreatePersonalityProfile();
  }, [user, welcomeMessageShown]);

  // Show personalized welcome message when profile is loaded and no messages exist
  useEffect(() => {
    if (!userProfile || welcomeMessageShown || messages.length > 0) return;
    
    // Generate personalized welcome message based on Tone B (playful with compliments)
    let welcomeMessage = "";
    
    if (!userProfile.preferredName) {
      // First time user without name - ask for it
      welcomeMessage = "Salut! 😊 Eu sunt Yana, consilierul tău strategic. Îmi place să lucrez cu antreprenori ambițioși! Tu cum te numești?";
    } else if (userProfile.detectedGender === 'male') {
      // Male user - Tone B: playful with subtle strategic compliments
      welcomeMessage = `Salut, ${userProfile.preferredName}! 😊 Îmi place când văd un antreprenor pregătit pentru bătălie strategică. Cu ce războim azi competiția?`;
    } else if (userProfile.detectedGender === 'female') {
      // Female user - warm confidant style
      welcomeMessage = `Salut, ${userProfile.preferredName}! 💕 Ce mă bucur că ai venit. Hai să vedem ce putem construi împreună azi pentru afacerea ta.`;
    } else {
      // Unknown gender - neutral but warm
      welcomeMessage = `Salut, ${userProfile.preferredName}! 😊 Mă bucur să te văd. Sunt Yana, consilierul tău strategic. Cu ce te pot ajuta azi?`;
    }
    
    // Add mobile recommendation note if on mobile and not shown before
    if (isMobile && !mobileWarningShown) {
      welcomeMessage += "\n\n📱 *Observ că ești pe mobil. Aplicația funcționează, dar War Room și Battle Plan arată mai bine pe desktop/laptop.*";
      localStorage.setItem('yana_strategic_mobile_warning_shown', 'true');
      setMobileWarningShown(true);
    }
    
    const welcomeMsg: Message = {
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
      showFeedback: false
    };
    
    setMessages([welcomeMsg]);
    setWelcomeMessageShown(true);
    
    logger.log(`👋 [WELCOME] Showed personalized welcome for ${userProfile.preferredName || 'new user'} (${userProfile.detectedGender})`);
  }, [userProfile, welcomeMessageShown, messages.length, isMobile, mobileWarningShown]);

  // Check access and credit on mount
  useEffect(() => {
    const checkAccessAndCredit = async () => {
      if (!user) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        logger.log("🔐 [ACCESS-CHECK] Checking access for user:", user.id);
        
        // ✅ ADMIN BYPASS: Adminii au acces complet fără verificări
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (isAdmin) {
          logger.log("✅ [ACCESS-CHECK] Admin user detected - granting full access");
          setIsAdminUser(true); // ✅ SALVEZ STATUSUL ADMIN
          setHasAccess(true);
          setCreditRemaining(999); // Admin unlimited credit display
          setIsCheckingAccess(false);
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, subscription_type, trial_credit_remaining, stripe_subscription_id, has_free_access")
          .eq("id", user.id)
          .single();

        if (profileError) {
          logger.error("❌ [ACCESS-CHECK] Profile error:", profileError);
          throw profileError;
        }

        logger.log("📊 [ACCESS-CHECK] Profile data:", profile);

        // ✅ YANA STRATEGIC: All subscribed users have access (single plan)
        // No subscription_type check needed - unified plan

        setSubscriptionStatus(profile?.subscription_status || "none");

        // ✅ Creditul se bazează pe bugetul AI (ai_budget_limits) minus consumul lunar (ai_usage)
        let creditLeft = 0;
        try {
          const { data: usageData, error: usageError } = await supabase.rpc('get_monthly_ai_usage');
          if (usageError) {
            logger.warn('⚠️ [ACCESS-CHECK] get_monthly_ai_usage failed, falling back to profile trial credit:', usageError.message);
            creditLeft = profile?.trial_credit_remaining ?? 0;
          } else {
            const usage = usageData?.[0];
            if (usage) {
              const remainingCents = Math.max(0, (usage.budget_cents || 0) - (usage.total_cost_cents || 0));
              creditLeft = Number((remainingCents / 100).toFixed(2));
            } else {
              creditLeft = profile?.trial_credit_remaining ?? 0;
            }
          }
          } catch (e) {
          logger.warn('⚠️ [ACCESS-CHECK] Usage check error, fallback to profile:', e);
          creditLeft = profile?.trial_credit_remaining ?? 0;
        }
        
        logger.log(`💰 [ACCESS-CHECK] Credit remaining (RON): ${creditLeft}`);
        setCreditRemaining(creditLeft);
        
        if (creditLeft > 0) {
          logger.log("✅ [ACCESS-CHECK] User has credit - access granted");
          setHasAccess(true);
        } else {
          logger.log("❌ [ACCESS-CHECK] No credit remaining - access denied");
          setHasAccess(false);
        }
      } catch (error) {
        logger.error("❌ [ACCESS-CHECK] Error:", error);
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
        logger.log("📜 [HISTORY] Loading conversation history for:", conversationId);
        
        // 🔴 CRITICAL FIX: Filter ONLY strategic conversations, exclude ChatAI balance/fiscal
        const { data, error } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('metadata->>type', 'strategic')  // ✅ ONLY strategic conversations
          .order('created_at', { ascending: true });

        if (error) {
          logger.error("❌ [HISTORY] Error loading history:", error);
          return;
        }
        
        if (isMounted && data && data.length > 0) {
          logger.log(`📜 [HISTORY] Loaded ${data.length} history records`);
          const loadedMessages: Message[] = data.map(record => ({
            role: record.role as "user" | "assistant",
            content: record.content,
            timestamp: new Date(record.created_at),
            showFeedback: record.role === "assistant"
          }));
          setMessages(loadedMessages);
        } else {
          logger.log("📜 [HISTORY] No history found");
        }
      } catch (error) {
        logger.error("❌ [HISTORY] Error:", error);
      }
    };

    loadHistory();
    
    return () => {
      isMounted = false;
    };
  }, [user, conversationId]);

  // Generic credit deduction function using the new AI usage system
  const deductCredit = async (amount: number): Promise<boolean> => {
    // ✅ ADMIN BYPASS: Nu deduce credite pentru admini
    if (isAdminUser) {
      logger.log("✅ [CREDIT] Admin user - skipping deduction");
      return true;
    }
    
    if (creditRemaining < amount) {
      toast.error(`Credit insuficient! Necesari ${amount.toFixed(2)} lei.`);
      return false;
    }

    try {
      // Record usage in ai_usage table (amount in RON * 100 = cents)
      const { error: trackError } = await supabase.functions.invoke('track-ai-usage', {
        body: {
          endpoint: 'strategic-advisor',
          model: 'google/gemini-2.5-flash', // default model used
          inputTokens: Math.floor(amount * 2000), // rough estimate: 1 RON ≈ 2000 tokens
          outputTokens: Math.floor(amount * 2000),
          success: true
        }
      });

      if (trackError) {
        logger.error('Error tracking usage:', trackError);
        // Don't fail the operation, just log the error
      }

      // Refresh credit by re-fetching from get_monthly_ai_usage
      const { data: usageData, error: usageError } = await supabase.rpc('get_monthly_ai_usage');
      if (!usageError && usageData?.[0]) {
        const usage = usageData[0];
        const remainingCents = Math.max(0, (usage.budget_cents || 0) - (usage.total_cost_cents || 0));
        const newCredit = Number((remainingCents / 100).toFixed(2));
        setCreditRemaining(newCredit);

        if (newCredit <= 2) {
          toast.warning(`⚠️ Credit scăzut: ${newCredit.toFixed(2)} lei. Cumpără credite!`, {
            action: {
              label: "Cumpără",
              onClick: () => navigate('/my-ai-costs')
            }
          });
        }
      }

      return true;
    } catch (error) {
      logger.error('Error in deductCredit:', error);
      toast.error('Eroare la deducerea creditelor');
      return false;
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const messageText = typeof textToSend === 'string' ? textToSend : input.trim();
    
    if (!messageText || isLoading) {
      logger.log("⚠️ [SEND] Blocked: empty message or already loading");
      return;
    }

    // Rate limiting
    if (!rateLimiter.check('strategic-advisor', RATE_LIMITS.STRATEGIC_ADVISOR)) {
      toast.error('Prea multe cereri. Te rog așteaptă câteva secunde.');
      return;
    }

    // Check credit before sending (ADMINS BYPASS)
    if (!isAdminUser && creditRemaining <= 0) {
      logger.error("❌ [SEND] Credit exhausted");
      toast.error("Credit epuizat. Cumpără credite pentru a continua.");
      setHasAccess(false);
      return;
    }

    const safeMessagePreview = typeof messageText === 'string' ? messageText.substring(0, 50) : String(messageText).substring(0, 50);
    logger.log("📤 [SEND] Sending message:", safeMessagePreview + "...");

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      logger.log("📡 [SEND] Invoking edge function...");
      
      const { data, error } = await supabase.functions.invoke("strategic-advisor", {
        body: {
          message: userMessage.content,
          conversationId,
          userId: user?.id
        }
      });

      logger.log("📡 [SEND] Edge function response received", { data, error });

      if (error) {
        logger.error("❌ [SEND] Edge function error:", error);
        const errorMessage = error.message || "Eroare la procesarea cererii";
        toast.error(errorMessage, { duration: 7000 });
        throw error;
      }
      
      if (data?.error) {
        logger.error("❌ [SEND] Backend returned error:", data.error, data.details);
        const errorDetails = data.details ? `: ${data.details}` : '';
        toast.error(`${data.error}${errorDetails}`, { duration: 7000 });
        return;
      }

      // Ensure response is a string
      const responseContent = typeof data.response === 'string' 
        ? data.response 
        : typeof data.response === 'object' 
        ? JSON.stringify(data.response) 
        : String(data.response || 'Răspuns lipsă de la server');

      // Deduct cost using the centralized config
      const messageCost = AI_COSTS.STRATEGIC_ADVISOR.MESSAGE_COST;
      logger.log(`💰 [CREDIT] Recording usage of ${messageCost} lei`);
      
      try {
        // Track usage in ai_usage table
        const { error: trackError } = await supabase.functions.invoke('track-ai-usage', {
          body: {
            endpoint: 'strategic-advisor',
            model: 'google/gemini-2.5-flash',
            inputTokens: Math.floor(messageCost * 2000), // rough estimate
            outputTokens: Math.floor(messageCost * 2000),
            success: true
          }
        });

        if (trackError) {
          logger.error('⚠️ [CREDIT] Error tracking usage:', trackError);
        }

        // Refresh credit from ai_budget_limits (ADMINS SKIP)
        if (!isAdminUser) {
          const { data: usageData, error: usageError } = await supabase.rpc('get_monthly_ai_usage');
          if (!usageError && usageData?.[0]) {
            const usage = usageData[0];
            const remainingCents = Math.max(0, (usage.budget_cents || 0) - (usage.total_cost_cents || 0));
            const newCredit = Number((remainingCents / 100).toFixed(2));
            logger.log(`💰 [CREDIT] New balance after refresh: ${newCredit} lei`);
            setCreditRemaining(newCredit);
            
            if (newCredit <= 0) {
              logger.warn("⚠️ [CREDIT] Credit exhausted!");
              toast.warning("Credit epuizat! Cumpără credite pentru a continua.");
              setHasAccess(false);
            } else if (newCredit <= AI_COSTS.STRATEGIC_ADVISOR.WARNING_THRESHOLD) {
              logger.warn(`⚠️ [CREDIT] Low credit warning: ${newCredit} lei`);
              toast.warning(`Atenție: Mai ai doar ${newCredit.toFixed(2)} lei credit!`);
            }
          }
        }
      } catch (error) {
        logger.error('⚠️ [CREDIT] Error in credit deduction:', error);
      }

      const aiMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        showFeedback: true
      };

      logger.log("✅ [SEND] AI response received, adding to messages");
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      logger.error("❌ [SEND] Error:", error);
      toast.error("A apărut o eroare. Te rog încearcă din nou.");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    logger.log("🔄 [CONVERSATION] Starting new conversation");
    localStorage.removeItem('yana_strategic_conversation_id');
    setMessages([]);
    window.location.reload();
  };

  // Handler pentru selectarea unei conversații din istoric (ADDITIVE - new feature)
  const handleSelectConversation = (selectedId: string) => {
    logger.log("📂 [HISTORY] Selecting conversation:", selectedId);
    setConversationId(selectedId);
    localStorage.setItem('yana_strategic_conversation_id', selectedId);
    setShowHistorySheet(false);
    // useEffect[conversationId] va reîncărca automat mesajele
  };


  // Loading state
  if (isCheckingAccess) {
    return <LoadingOverlay message="Verificare acces..." />;
  }

  // No access state
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <EmptyState
          icon={<AlertCircle className="w-16 h-16" />}
          title={creditRemaining === 0 ? "Credit Epuizat" : "Acces Restricționat"}
          description={
            creditRemaining === 0 
              ? "Ai epuizat creditul disponibil. Pentru a continua, cumpără credite AI sau activează Planul Antreprenor (49 lei/lună)."
              : "Yana Strategică este disponibilă EXCLUSIV pentru utilizatori cu Planul Antreprenor. Toți antreprenorii primesc 10 lei credit inițial."
          }
          action={{
            label: creditRemaining === 0 ? "Cumpără Credite AI" : "Activează Planul Antreprenor",
            onClick: () => navigate(creditRemaining === 0 ? "/my-ai-costs" : "/subscription")
          }}
          secondaryAction={{
            label: "Înapoi la Dashboard",
            onClick: () => navigate("/app")
          }}
        />
      </div>
    );
  }

  const handleConflictClick = (fact: any) => {
    setSelectedConflict(fact);
    setConflictDialogOpen(true);
  };

  // Main chat interface
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Section */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur p-4 animate-appear flex-shrink-0">
            <div className="container mx-auto max-w-5xl">
              <div className="flex items-center justify-between mb-3">
                {/* Left side - minimal pe mobil */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/app')}
                    aria-label="Înapoi la aplicație"
                    className="btn-hover-lift flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  
                  {/* Brain icon - doar desktop */}
                  <div className="hidden md:flex p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      {/* Titlu scurt pe mobil, complet pe desktop */}
                      <h1 className="text-lg md:text-2xl font-bold truncate">
                        <span className="md:hidden">Yana</span>
                        <span className="hidden md:inline">Yana Strategică</span>
                      </h1>
                      <p className="text-sm text-muted-foreground hidden md:block">
                        Consultant AI Strategic
                      </p>
                    </div>
                    
                    {/* ContextualHelp - doar desktop */}
                    <div className="hidden md:block flex-shrink-0">
                      <ContextualHelp
                        title="Yana Strategică"
                        content="Consultanță strategică AI pentru afacerea ta. Pune întrebări despre strategii de creștere, analize competitive sau oportunități de expansiune."
                      />
                    </div>
                  </div>
                </div>
                
                {/* Right side - controls esențiale, mereu vizibile */}
                <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                  {/* Message counter - doar desktop */}
                  {activeTab === "chat" && messages.length > 0 && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/30">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{messages.length}</span>
                      <span className="text-xs text-muted-foreground">mesaje</span>
                    </div>
                  )}
                  
                  {/* Credit indicator - compact pe mobil */}
                  <div className={cn(
                    "px-2 py-1 md:px-4 md:py-2 rounded-lg border-2 flex-shrink-0",
                    creditRemaining <= AI_COSTS.STRATEGIC_ADVISOR.WARNING_THRESHOLD
                      ? 'border-destructive bg-destructive/10' 
                      : creditRemaining <= 5 
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-primary bg-primary/10'
                  )}>
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        creditRemaining <= AI_COSTS.STRATEGIC_ADVISOR.WARNING_THRESHOLD
                          ? 'bg-destructive animate-pulse' 
                          : creditRemaining <= 5
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-primary'
                      )} />
                      <p className="text-sm md:text-lg font-bold whitespace-nowrap">
                        {creditRemaining.toFixed(2)}
                        <span className="hidden md:inline"> lei</span>
                      </p>
                    </div>
                  </div>

                  {activeTab === "chat" && (
                    <>
                      {/* Consultă Yana - AI-to-AI dialog */}
                      <ConsultYanaDialog 
                        context={messages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}
                        conversationId={conversationId}
                      />
                      
                      {/* BattlePlan - vizibil pe toate ecranele */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-shrink-0">
                            <BattlePlanExport 
                              conversationId={conversationId}
                              userId={user.id}
                              disabled={messages.length < 8}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {messages.length < 8 
                            ? "Disponibil după 8+ mesaje de strategie"
                            : "Generează plan de acțiune PDF"
                          }
                        </TooltipContent>
                      </Tooltip>


                      {/* Dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background">
                          <DropdownMenuItem onClick={() => setShowHistorySheet(true)}>
                            <History className="w-4 h-4 mr-2" />
                            Istoric Conversații
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setWarRoomOpen(true)}>
                            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                            War Room Simulator
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={startNewConversation}>
                            <Plus className="w-4 h-4 mr-2" />
                            Conversație Nouă
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  
                  {/* Sidebar Toggle - mereu vizibil */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="btn-hover-lift flex-shrink-0"
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="w-5 h-5" />
                    ) : (
                      <PanelRightOpen className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="chat">💬 Chat Strategist</TabsTrigger>
                </TabsList>
              </Tabs>

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

          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="container mx-auto max-w-5xl space-y-4">
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
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <ChatMessage
                        key={`${msg.timestamp.getTime()}-${idx}`}
                        role={msg.role}
                        content={msg.content}
                      />
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
              </div>

              {/* Input Area */}
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={sendMessage}
                isLoading={isLoading}
                placeholder="Descrie provocarea ta de business aici..."
                showFileUpload={false}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Panel - Facts (Desktop: fixed sidebar, Mobile: Sheet overlay) */}
        {!isMobile && sidebarOpen && (
          <div className="w-96 border-l bg-card flex-shrink-0 overflow-hidden">
            <StrategicFactsPanel
              userId={user?.id}
              conversationId={conversationId}
            />
          </div>
        )}

        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-[85vw] max-w-96 p-0">
              <StrategicFactsPanel
                userId={user?.id}
                conversationId={conversationId}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflicts={selectedConflict?.conflicts || []}
        validationNotes={selectedConflict?.validation_notes}
      />

      {/* War Room Simulator */}
      <WarRoomSimulator
        open={warRoomOpen}
        onOpenChange={setWarRoomOpen}
        conversationId={conversationId}
        userId={user.id}
        onSimulationResult={(result) => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result,
            timestamp: new Date(),
            showFeedback: false,
          }]);
        }}
      />

      {/* Conversation History Sheet (ADDITIVE - new feature) */}
      <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
        <SheetContent side="left" className="w-[85vw] max-w-md p-0">
          <ConversationHistory
            onSelectConversation={handleSelectConversation}
            currentConversationId={conversationId}
          />
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  );
}