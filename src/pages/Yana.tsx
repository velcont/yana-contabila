import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAICredits } from '@/hooks/useAICredits';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Loader2, Menu, X, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { YanaChat } from '@/components/yana/YanaChat';
import { ConversationSidebar } from '@/components/yana/ConversationSidebar';
import { NoAccessOverlay } from '@/components/yana/NoAccessOverlay';
import { MiniCreditsIndicator } from '@/components/yana/MiniCreditsIndicator';
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
    localStorage.removeItem('yana_last_conversation_id');
    analytics.yanaConversationStarted('new');
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

  if (loading || subscriptionLoading || creditsLoading) {
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
    <div className="flex h-dvh min-h-screen bg-background relative">
      {/* Access Overlay - blochează utilizatorii fără acces valid */}
      {hasNoValidAccess && <NoAccessOverlay accessType={accessType} />}
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
          'bg-card border-r border-border',
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
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? 'Ascunde istoric' : 'Afișează istoric'}
            </Button>
            <MiniCreditsIndicator />
            <ThemeToggle />
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-10 sm:w-10 touch-action-manipulation" title="Setări cont">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-11 w-11 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-action-manipulation" 
                  title="Deconectare"
                >
                  <LogOut className="h-5 w-5" />
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
        />
      </main>
    </div>
  );
}