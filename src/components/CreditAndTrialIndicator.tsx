import { useEffect, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    const fetchAIUsage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

  const costInLei = aiUsage ? (aiUsage.total_cost_cents / 100).toFixed(2) : '0.00';
  const budgetInLei = aiUsage ? (aiUsage.budget_cents / 100).toFixed(2) : '10.00';
  const usagePercent = aiUsage?.usage_percent || 0;

  return (
    <Card className="p-3 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Costuri AI Luna Curentă</span>
          </div>
          <Badge variant={usagePercent > 80 ? "destructive" : "secondary"} className="text-xs">
            {usagePercent.toFixed(0)}%
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Cheltuieli:</span>
          </div>
          <span className="font-semibold">{costInLei} / {budgetInLei} lei</span>
        </div>

        {accessType === 'trial' && trialDaysRemaining !== null && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-primary/10">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Perioada gratuită:</span>
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
          to="/system-health" 
          className="text-xs text-primary hover:underline text-center mt-1"
        >
          Vezi detalii complete →
        </Link>
      </div>
    </Card>
  );
};
