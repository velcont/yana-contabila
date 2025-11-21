import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Settings, LogOut, User, Building2, MessageSquare, Briefcase, TrendingUp, FileText, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { ChatAI } from "@/components/ChatAI";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PermanentTutorialReminder } from "@/components/PermanentTutorialReminder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Landing from "@/pages/Landing";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { AdminRoleSwitcher } from "@/components/AdminRoleSwitcher";
import { AccountTypeSelector } from "@/components/AccountTypeSelector";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { CreditAndTrialIndicator } from "@/components/CreditAndTrialIndicator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "@/components/NotificationSystem";
import { MarketplaceLayout } from "@/components/marketplace/MarketplaceLayout";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'analiza-balanta';
  
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [userSubscriptionType, setUserSubscriptionType] = useState<string | null>(null);
  const [runTutorial, setRunTutorial] = useState(false);
  const { toast } = useToast();
  const { user, signOut, loading } = useAuth();
  const { isAccountant } = useSubscription();
  const { setThemeOverride, themeOverride } = useTheme();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [shouldOpenChatAI, setShouldOpenChatAI] = useState(false);

  // Check if user needs to select account type
  useEffect(() => {
    const checkAccountType = async () => {
      if (user && !loading) {
        logger.log('🟢 [INDEX] Checking account type for user:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('account_type_selected, subscription_type, subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();

        logger.log('🟢 [INDEX] Profile data:', data, 'Error:', error);

        if (!error && data) {
          if (!data.account_type_selected) {
            setShowAccountTypeSelector(true);
            return;
          }

          if (data.subscription_type === 'accounting_firm') {
            logger.log('✅ User este contabil - afișare /app cu temă contabil');
            setUserSubscriptionType('accounting_firm');
            if (!themeOverride) setThemeOverride?.('accountant');
          } else {
            logger.log('✅ User este antreprenor - afișare /app cu temă antreprenor');
            setUserSubscriptionType('entrepreneur');
            if (!themeOverride) setThemeOverride?.('entrepreneur');
          }

          // Verifică expirarea perioadei de testare
          if (data.trial_ends_at && new Date(data.trial_ends_at) <= new Date() && data.subscription_status !== 'active') {
            toast({
              title: "Perioada de testare expirată",
              description: "Perioada ta gratuită de 30 zile s-a încheiat. Abonează-te pentru a continua.",
              variant: "destructive",
            });
            navigate('/subscription');
            return;
          }
          
          // Load first company as default pentru antreprenori
          if (data.subscription_type === 'entrepreneur') {
            const { data: companies } = await supabase
              .from('companies')
              .select('id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (companies && companies.length > 0) {
              setCurrentCompanyId(companies[0].id);
            }
          }
        }
      }
    };

    checkAccountType();
  }, [user, loading]);

  // 🎓 Pornește Reminder Tutorial Permanent (dacă nu e hidden pentru totdeauna ȘI ChatAI e deschis) - FIX #3
  useEffect(() => {
    if (user && !loading) {
      const permanentlyHidden = localStorage.getItem('yana-tutorial-permanently-hidden');
      
      if (permanentlyHidden !== 'true') {
        let retryCount = 0;
        const MAX_RETRIES = 10; // Maxim 10 reîncercări = 20 secunde
        
        // Verificăm dacă ChatAI e deschis (există elementul cu data-tour="file-upload")
        const checkAndStartTutorial = () => {
          const chatAIOpen = document.querySelector('[data-tour="file-upload"]');
          
          if (chatAIOpen) {
            logger.log('🎓 [INDEX] ChatAI deschis - pornire Tutorial');
            setRunTutorial(true);
          } else if (retryCount < MAX_RETRIES) {
            retryCount++;
            logger.log(`🎓 [INDEX] ChatAI închis - reîncercare ${retryCount}/${MAX_RETRIES}`);
            setTimeout(checkAndStartTutorial, 2000);
          } else {
            logger.log('🎓 [INDEX] Timeout - tutorialul nu pornește (ChatAI nu e deschis după 20s)');
          }
        };
        
        const timer = setTimeout(checkAndStartTutorial, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading]);

  // 🤖 Deschide automat ChatAI pentru TOȚI utilizatorii la FIECARE logare
  useEffect(() => {
    if (user && !loading) {
      logger.log('🤖 [INDEX] Auto-deschidere ChatAI la logare');
      setShouldOpenChatAI(true);
    }
  }, [user, loading]);

  const handleSignOut = async () => {
    await signOut();
    setThemeOverride(null);
    toast({
      title: "Deconectat",
      description: "Te-ai deconectat cu succes.",
    });
  };

  const handleTutorialComplete = () => {
    setRunTutorial(false);
    toast({
      title: "Tutorial închis",
      description: "Poți reporni tutorialul oricând din butonul 🎯 Tutorial Rapid",
    });
  };

  const handleCardClick = (view: string) => {
    if (view === 'strategic-advisor' || view === 'yanacrm') {
      navigate(`/${view}`);
    } else {
      setSearchParams({ view });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin mx-auto text-primary rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Dacă utilizatorul NU este autentificat, afișează Landing page
  if (!user) {
    logger.log('User is not authenticated, showing Landing page');
    return <Landing />;
  }

  logger.log('User is authenticated:', user.email);

  // Render content based on activeView
  const renderContent = () => {
    switch (activeView) {
      case 'analiza-balanta':
      case 'chat-ai':
        return <Dashboard />;
      case 'marketplace':
        return <MarketplaceLayout />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-semibold text-foreground">
                Yana
              </h1>
              {userSubscriptionType === 'accounting_firm' && (
                <CompanySwitcher 
                  currentCompanyId={currentCompanyId}
                  onCompanyChange={setCurrentCompanyId}
                  onAddCompany={() => navigate('/crm')}
                />
              )}
            </div>
            
            <div className="flex gap-2 items-center">
              {/* AI Credits indicator DOAR pentru antreprenori */}
              {userSubscriptionType === 'entrepreneur' && (
                <CreditAndTrialIndicator />
              )}
              
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setRunTutorial(true)}
              className="flex gap-2"
              title="Tutorial Rapid - 8 Pași Rapizi"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Tutorial Rapid</span>
            </Button>
              
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              
              <NotificationBell />
              <ThemeToggle />
              <SubscriptionBadge />
              
              {isAdmin && <AdminRoleSwitcher />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Setări Cont
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/subscription')}>
                    Abonament
                  </DropdownMenuItem>
                  {!isAccountant && (
                    <DropdownMenuItem onClick={() => navigate('/my-ai-costs')}>
                      Credite AI
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconectare
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 3 Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {userSubscriptionType === 'entrepreneur' ? (
              <>
                {/* Card 1: Analiză Balanței */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-blue-500/40"
                  onClick={() => handleCardClick('analiza-balanta')}
                  data-tour="card-analiza-balanta"
                >
                  <CardHeader className="space-y-4">
                    <TrendingUp className="h-10 w-10 text-blue-500" />
                    <CardTitle className="text-xl">Analiză Balanței</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Chat AI pentru întrebări despre balanță + Dashboard complet cu grafice, alerte, predicții și rapoarte
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Card 2: Strategic Advisor */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-blue-500/40"
                  onClick={() => handleCardClick('strategic-advisor')}
                  data-tour="card-strategic-advisor"
                >
                  <CardHeader className="space-y-4">
                    <Sparkles className="h-10 w-10 text-blue-500" />
                    <div className="space-y-2">
                      <CardTitle className="text-xl">Yana Strategică</CardTitle>
                      <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">💎 AI Premium</Badge>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      Consultanță strategică AI avansată pentru decizii de business complexe (necesită credite AI)
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Card 3: Marketplace */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-blue-500/40"
                  onClick={() => handleCardClick('marketplace')}
                  data-tour="card-marketplace"
                >
                  <CardHeader className="space-y-4">
                    <Briefcase className="h-10 w-10 text-blue-500" />
                    <CardTitle className="text-xl">Marketplace</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Găsește contabilul perfect pentru firma ta și primește oferte personalizate
                    </CardDescription>
                  </CardHeader>
                </Card>

              </>
            ) : (
              <>
                {/* Card 1: Chat AI (pentru contabili) */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-green-500/40"
                  onClick={() => handleCardClick('chat-ai')}
                  data-tour="card-chat-ai"
                >
                  <CardHeader className="space-y-4">
                    <MessageSquare className="h-10 w-10 text-green-500" />
                    <CardTitle className="text-xl">Chat AI</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Chat AI general + Dashboard complet cu grafice, multi-firmă, alerte și rapoarte pentru clienți
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Card 2: Yana CRM */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-green-500/40"
                  onClick={() => handleCardClick('yanacrm')}
                  data-tour="card-yanacrm"
                >
                  <CardHeader className="space-y-4">
                    <Building2 className="h-10 w-10 text-green-500" />
                    <CardTitle className="text-xl">Yana CRM</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      CRM complet pentru gestionarea clienților, workflows lunare și email marketing
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Card 3: Marketplace */}
                <Card 
                  className="group cursor-pointer transition-all hover:shadow-md bg-card border-border/40 hover:border-green-500/40"
                  onClick={() => handleCardClick('marketplace')}
                  data-tour="card-marketplace"
                >
                  <CardHeader className="space-y-4">
                    <Briefcase className="h-10 w-10 text-green-500" />
                    <CardTitle className="text-xl">Marketplace</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Găsește clienți noi și răspunde la anunțurile antreprenorilor
                    </CardDescription>
                  </CardHeader>
                </Card>
              </>
            )}
          </div>

          {/* Content Area */}
          <div className="mt-8">
            {renderContent()}
          </div>
          
          <Footer />
        </div>
      </div>
      
      {/* ChatAI disponibil global pentru analiza-balanta și chat-ai views */}
      {(activeView === 'analiza-balanta' || activeView === 'chat-ai') && (
        <ChatAI openOnLoad={shouldOpenChatAI} forceTutorialMode={runTutorial} />
      )}
      
      <AccountTypeSelector 
        open={showAccountTypeSelector} 
        onComplete={() => {
          setShowAccountTypeSelector(false);
        }}
      />
      
      <PermanentTutorialReminder 
        run={runTutorial} 
        onComplete={handleTutorialComplete}
      />
    </>
  );
};

export default Index;
