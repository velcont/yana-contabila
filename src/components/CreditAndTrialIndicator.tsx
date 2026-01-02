import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Sparkles, PartyPopper, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreditAndTrialIndicator = () => {
  const { trialDaysRemaining, accessType, loading } = useSubscription();
  const { 
    isLoading: loadingUsage, 
    hasEverUsedCredits, 
    remainingCredits, 
    estimatedSessions, 
    hasCredits, 
    hasFreeAccess 
  } = useAICredits();

  if (loading || loadingUsage) {
    return null;
  }

  // Pentru utilizatori noi care nu au consumat niciodată credite - NU afișa indicatorul
  if (!hasEverUsedCredits) {
    return null;
  }

  // Mesaj elegant pentru upgrade când nu mai sunt credite
  // Exclude utilizatorii în trial - ei au credite incluse
  if (!hasCredits && accessType !== 'trial') {
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
