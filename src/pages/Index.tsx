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
import { useTheme as useNextTheme } from "next-themes";
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
  const { setTheme } = useNextTheme();
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
 
  // Forțează tema luminoasă pe /app pentru un look de tip Google AI Studio
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);
 
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
      {/* 🚨 BANNER VERIFICARE BUILD 🚨 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ff0000 0%, #ff6600 100%)', 
        color: '#ffffff', 
        padding: '20px',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
        border: '4px solid #ffff00',
        boxShadow: '0 10px 40px rgba(255,0,0,0.5)',
        position: 'relative',
        zIndex: 9999
      }}>
        ✅ BUILD NOU: {new Date().toLocaleString('ro-RO', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })} - LAYOUT GOOGLE AI STUDIO
      </div>
      
      {/* LAYOUT COMPLET NOU - GOOGLE AI STUDIO STYLE */}
      <div className="min-h-screen bg-white">
        {/* Header minimal tip Google */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo minimal */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-900">Yana AI</div>
                  <div className="text-xs text-gray-500">Financial Intelligence Platform</div>
                </div>
              </div>
              
              {/* Butoane header dreapta - stil Google */}
              <div className="flex items-center gap-3">
                {userSubscriptionType === 'entrepreneur' && <CreditAndTrialIndicator />}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setRunTutorial(true)}
                  className="text-gray-700 hover:bg-gray-100"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Tutorial
                </Button>
                
                <NotificationBell />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                      <User className="h-5 w-5 text-gray-700" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Setări
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
          </div>
        </header>

        {/* Hero Section - clean, minimal */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl font-normal text-gray-900 mb-4 tracking-tight">
              Asistentul tău financiar cu AI
            </h1>
            <p className="text-xl text-gray-600">
              Analizează, înțelege și optimizează-ți finanțele cu inteligență artificială avansată
            </p>
          </div>

          {/* Cards Grid - stil Google AI Studio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {userSubscriptionType === 'entrepreneur' ? (
              <>
                {/* Card 1 - Modern, minimal */}
                <div
                  onClick={() => handleCardClick('analiza-balanta')}
                  data-tour="card-analiza-balanta"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Analiză Balanță
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Chat AI inteligent pentru întrebări despre balanță + dashboard complet cu grafice live și predicții
                    </p>
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  onClick={() => handleCardClick('strategic-advisor')}
                  data-tour="card-strategic-advisor"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-purple-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-2xl font-semibold text-gray-900">
                        Yana Strategică
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        Premium
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Consultanță AI avansată pentru decizii strategice complexe de business
                    </p>
                  </div>
                </div>

                {/* Card 3 */}
                <div
                  onClick={() => handleCardClick('marketplace')}
                  data-tour="card-marketplace"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-green-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-green-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Briefcase className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Marketplace
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Găsește contabilul perfect și primește oferte personalizate pentru firma ta
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Pentru contabili */}
                <div
                  onClick={() => handleCardClick('chat-ai')}
                  data-tour="card-chat-ai"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Chat AI
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Chat AI general + Dashboard multi-firmă cu grafice și rapoarte pentru clienți
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('yanacrm')}
                  data-tour="card-yanacrm"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-orange-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-orange-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Yana CRM
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      CRM complet pentru gestionare clienți, workflows și email marketing
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('marketplace')}
                  data-tour="card-marketplace"
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-green-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-green-100 transition-colors" />
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Briefcase className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Marketplace
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Găsește clienți noi și răspunde la anunțurile antreprenorilor
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Content Area */}
          <div className="mt-12">
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
      
      <p className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-border/40">
        Build: 2025‑11‑21 13:45 – Layout Google AI Studio
      </p>
    </>
  );
};

export default Index;
