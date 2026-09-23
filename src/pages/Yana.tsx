import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAICredits } from '@/hooks/useAICredits';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Loader2, Menu, X, Settings, LogOut, Briefcase, Mail, MessageCircle, Moon, ShieldCheck, Phone, Building2, MoreHorizontal } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { YanaChat } from '@/components/yana/YanaChat';
import { ConversationSidebar } from '@/components/yana/ConversationSidebar';
import { YanaAmbientPresence } from '@/components/yana/YanaAmbientPresence';
import { NoAccessOverlay } from '@/components/yana/NoAccessOverlay';
import { MiniCreditsIndicator } from '@/components/yana/MiniCreditsIndicator';
import { CognitiveEmergenceToggle } from '@/components/yana/cem/CognitiveEmergenceToggle';
import { CEMOnboardingDialog } from '@/components/yana/cem/CEMOnboardingDialog';
import { InspiredByDisclaimer } from '@/components/yana/cem/InspiredByDisclaimer';
import { useCognitiveEmergence } from '@/components/yana/cem/useCognitiveEmergence';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/utils/analytics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Yana() {
  const { user, loading, signOut } = useAuth();
  const { accessType, loading: subscriptionLoading } = useSubscription();
  const { hasCredits, isLoading: creditsLoading } = useAICredits();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [resetKey, setResetKey] = useState(0);
  const hasTrackedPageView = useRef(false);
  const initialLoadDone = useRef(false);
  const cem = useCognitiveEmergence();
  
  // Blocare acces pentru utilizatori fără acces valid (trial expirat sau abonament expirat/inexistent)
  // DAR permite accesul dacă au credite AI cumpărate
  const hasNoValidAccess = !subscriptionLoading && !creditsLoading && 
    (accessType === null || accessType === 'trial_expired') && 
    !hasCredits;
  // Persistență conversație activă - păstrează ultima conversație deschisă între sesiuni
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const saved = localStorage.getItem('yana_last_conversation_id');
    return saved || null;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem('yana_active_project_id');
    return saved || null;
  });

  const handleSelectProject = (id: string | null) => {
    setActiveProjectId(id);
    if (id) localStorage.setItem('yana_active_project_id', id);
    else localStorage.removeItem('yana_active_project_id');
    // Clear active conversation when switching projects
    setActiveConversationId(null);
    setResetKey(k => k + 1);
    localStorage.removeItem('yana_last_conversation_id');
  };
  
  // Track Yana page view once when loaded
  useEffect(() => {
    if (!loading && !subscriptionLoading && !creditsLoading && user && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.yanaPageView(accessType, hasCredits);
      
      // Track conversation type
      const conversationType = activeConversationId ? 'continued' : 'new';
      analytics.yanaConversationStarted(conversationType);
    }
  }, [loading, subscriptionLoading, creditsLoading, user, accessType, hasCredits, activeConversationId]);
  
  // Handler pentru selectare conversație cu persistență
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    localStorage.setItem('yana_last_conversation_id', id);
  };
  
  // Handler pentru conversație nouă - șterge persistența
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setResetKey(k => k + 1);
    localStorage.removeItem('yana_last_conversation_id');
    analytics.yanaConversationStarted('new');
    if (isMobile) setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Eroare la deconectare",
        description: "Nu am putut să te deconectez. Încearcă din nou.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // On mobile, close sidebar by default
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Mark initial load as done once all states resolve
  if (!loading && !subscriptionLoading && !creditsLoading) {
    initialLoadDone.current = true;
  }

  if ((loading || subscriptionLoading || creditsLoading) && !initialLoadDone.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-bold text-xl">Y</span>
        </div>
        <p className="text-sm text-muted-foreground animate-fade-in">Yana se pregătește...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/yana" replace />;
  }

  return (
    <div className="flex h-dvh min-h-screen relative bg-background/40">
      {/* Futuristic ambient backdrop — Conștiință Ambientală */}
      <YanaAmbientPresence state="idle" />
      {/* Access Overlay - blochează utilizatorii fără acces valid */}
      {hasNoValidAccess && <NoAccessOverlay accessType={accessType} />}
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
          'bg-card/70 backdrop-blur-xl border-r border-border/60',
          'lg:relative lg:translate-x-0 lg:w-72',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: isMobile ? 'clamp(240px, 85vw, 288px)' : undefined }}
      >
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
        />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header - Reorganizat pentru mobil */}
        <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-11 w-11 sm:h-10 sm:w-10 lg:hidden touch-action-manipulation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">Y</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-semibold text-foreground text-sm leading-tight">Yana</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Nu e un chatbot. E un AI pentru business.</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5">
            <MiniCreditsIndicator />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-9 sm:w-9 touch-action-manipulation" title="Mai multe">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/crm" className="flex items-center gap-2 cursor-pointer">
                    <Briefcase className="h-4 w-4" /> CRM
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/firme-noi" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" /> Firme noi
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/samanta" className="flex items-center gap-2 cursor-pointer">
                    <Phone className="h-4 w-4" /> Samanta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/whatsapp" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/inbox" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" /> Inbox
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/yana/dreams" className="flex items-center gap-2 cursor-pointer">
                    <Moon className="h-4 w-4" /> Vise YANA
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/yana/control" className="flex items-center gap-2 cursor-pointer">
                    <ShieldCheck className="h-4 w-4" /> Control Center
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CognitiveEmergenceToggle enabled={cem.enabled} onToggle={cem.toggle} />
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 touch-action-manipulation" title="Setări cont">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-action-manipulation" 
                  title="Deconectare"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmare deconectare</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sigur vrei să te deconectezi din contul tău YANA?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anulează</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOut}>Deconectează-mă</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        {/* Chat Component */}
        <YanaChat
          conversationId={activeConversationId}
          onConversationCreated={setActiveConversationId}
          resetKey={resetKey}
          projectId={activeProjectId}
          cognitiveEmergenceMode={cem.enabled}
        />

        {/* Footer disclaimer "inspirat din fapte reale" */}
        {cem.enabled && (
          <div className="flex justify-center pb-1 pt-0.5 bg-card/30">
            <InspiredByDisclaimer />
          </div>
        )}
      </main>

      {/* Onboarding one-time pentru CEM */}
      <CEMOnboardingDialog open={cem.needsOnboarding} onClose={cem.dismissOnboarding} />
    </div>
  );
}