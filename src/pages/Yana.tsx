import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Loader2, Menu, X, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YanaChat } from '@/components/yana/YanaChat';
import { ConversationSidebar } from '@/components/yana/ConversationSidebar';
import { NoAccessOverlay } from '@/components/yana/NoAccessOverlay';
import { MiniCreditsIndicator } from '@/components/yana/MiniCreditsIndicator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
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
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Blocare acces pentru utilizatori fără acces valid (trial expirat sau abonament expirat/inexistent)
  const hasNoValidAccess = !subscriptionLoading && (accessType === null || accessType === 'trial_expired');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/yana" replace />;
  }

  return (
    <div className="flex h-dvh min-h-screen bg-background dark relative">
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
          onSelectConversation={setActiveConversationId}
          onNewConversation={() => setActiveConversationId(null)}
          onClose={() => setSidebarOpen(false)}
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
              <span className="font-semibold text-foreground hidden sm:inline">Yana</span>
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