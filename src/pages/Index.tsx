import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Settings, LogOut, User, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { ChatAI } from "@/components/ChatAI";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { CreditAndTrialIndicator } from "@/components/CreditAndTrialIndicator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "@/components/NotificationSystem";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'analiza-balanta';
  
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [userSubscriptionType, setUserSubscriptionType] = useState<string | null>(null);
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

  const handleCardClick = (view: string) => {
    if (view === 'strategic-advisor') {
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Yana
              </h1>
            </div>
            
            <div className="flex gap-2 items-center">
              {/* AI Credits indicator */}
              <CreditAndTrialIndicator />
              
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
                  <DropdownMenuItem onClick={() => navigate('/my-ai-costs')}>
                    Credite AI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconectare
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 2 Card Layout - Simplified */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
            {/* Card 1: Analiză Balanței */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20"
              onClick={() => handleCardClick('analiza-balanta')}
              data-tour="card-analiza-balanta"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Analiză Balanței</CardTitle>
                <CardDescription>
                  Chat AI pentru întrebări despre balanță + Dashboard complet cu grafice, alerte, predicții și rapoarte
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 2: Strategic Advisor */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-gradient-to-br from-violet-500/10 to-violet-600/10 border-violet-500/20"
              onClick={() => handleCardClick('strategic-advisor')}
              data-tour="card-strategic-advisor"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Yana Strategică
                  <span className="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">💎 AI Premium</span>
                </CardTitle>
                <CardDescription>
                  Consultanță strategică AI avansată pentru decizii de business complexe (necesită credite AI)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Content Area */}
          <div className="mt-8">
            <Dashboard />
          </div>
          
          <Footer />
        </div>
      </div>
      
      {/* ChatAI disponibil global */}
      <ChatAI openOnLoad={shouldOpenChatAI} />
      
      <AccountTypeSelector 
        open={showAccountTypeSelector} 
        onComplete={() => {
          setShowAccountTypeSelector(false);
        }}
      />
    </>
  );
};

export default Index;