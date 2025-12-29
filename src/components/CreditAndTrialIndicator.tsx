import { useEffect, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Sparkles, PartyPopper, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AIUsage {
  total_cost_cents: number;
  budget_cents: number;
  usage_percent: number;
}

export const CreditAndTrialIndicator = () => {
  const { trialDaysRemaining, accessType, loading } = useSubscription();
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [hasFreeAccess, setHasFreeAccess] = useState(false);
  const [hasEverUsedCredits, setHasEverUsedCredits] = useState(false);

  useEffect(() => {
    const fetchAIUsage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has free access
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_free_access')
          .eq('id', user.id)
          .single();
        
        setHasFreeAccess(profile?.has_free_access === true);

        // Check if user has ever used AI credits (any usage in ai_usage table)
        const { count } = await supabase
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setHasEverUsedCredits((count || 0) > 0);

        const currentMonth = new Date().toISOString().slice(0, 7);

        const { data: monthlyUsage } = await supabase.rpc('get_monthly_ai_usage', {
          p_user_id: user.id,
          p_month_year: currentMonth
        });

        if (monthlyUsage && monthlyUsage.length > 0) {
          setAiUsage(monthlyUsage[0]);
        }
      } catch (error) {
        console.error('Error fetching AI usage:', error);
      } finally {
        setLoadingUsage(false);
      }
    };

    fetchAIUsage();
    const interval = setInterval(fetchAIUsage, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading || loadingUsage) {
    return null;
  }

  // Pentru utilizatori noi care nu au consumat niciodată credite - NU afișa indicatorul
  if (!hasEverUsedCredits) {
    return null;
  }

  const remainingCredits = aiUsage ? (aiUsage.budget_cents - aiUsage.total_cost_cents) / 100 : 0;
  const usagePercent = aiUsage?.usage_percent || 0;
  // Utilizatorii cu acces gratuit NU au credite AI disponibile pentru funcții premium
  const hasCredits = !hasFreeAccess && remainingCredits > 0;

  // Mesaj elegant pentru upgrade când nu mai sunt credite
  if (!hasCredits) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              Yana a identificat primele oportunități!
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {hasFreeAccess 
              ? 'Pentru a continua analiza, explora scenarii sau încărca date noi, alege un plan care ți se potrivește.'
              : 'Pentru a continua conversația, a explora noi scenarii sau a obține strategii personalizate, alege un plan.'}
          </p>
          
          <Link 
            to="/pricing" 
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors"
          >
            Alege planul potrivit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    );
  }

  // Estimare sesiuni rămase (simplificat, fără RON)
  const estimatedSessions = remainingCredits > 0 
    ? Math.max(1, Math.floor(remainingCredits / 2)) 
    : 0; // ~2 RON per sesiune medie, minim 1 dacă există credite

  return (
    <Card className="p-3 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sesiuni disponibile</span>
          </div>
          <Badge variant={estimatedSessions <= 1 ? "destructive" : "secondary"} className="text-xs">
            {estimatedSessions <= 1 
              ? "Ultima sesiune" 
              : `~${estimatedSessions} sesiuni`}
          </Badge>
        </div>

        {accessType === 'trial' && trialDaysRemaining !== null && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-primary/10">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Perioadă gratuită:</span>
            </div>
            <Badge 
              variant={trialDaysRemaining <= 7 ? "destructive" : "default"}
              className="text-xs"
            >
              {trialDaysRemaining} {trialDaysRemaining === 1 ? 'zi' : 'zile'}
            </Badge>
          </div>
        )}

        <Link 
          to="/my-ai-costs" 
          className="text-xs text-primary hover:underline text-center mt-1"
        >
          Vezi detalii complete →
        </Link>
      </div>
    </Card>
  );
};
