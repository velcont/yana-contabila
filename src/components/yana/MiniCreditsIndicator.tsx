import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function MiniCreditsIndicator() {
  const { isLoading, hasEverUsedCredits, estimatedSessions, hasCredits, hasFreeAccess } = useAICredits();
  const { loading: subLoading, trialDaysRemaining, accessType } = useSubscription();

  // Nu afișa pentru utilizatori noi care nu au consumat credite
  if (isLoading || subLoading || !hasEverUsedCredits) {
    return null;
  }

  // Utilizatorii trial au credite incluse - le tratăm ca și cum ar avea credite
  const effectiveHasCredits = hasCredits || accessType === 'trial';

  const getTooltipContent = () => {
    if (!effectiveHasCredits || hasFreeAccess) {
      return 'Poți adăuga credite oricând dorești.';
    }
    if (accessType === 'trial' && trialDaysRemaining !== null) {
      return `~${estimatedSessions} sesiuni disponibile • ${trialDaysRemaining} zile rămase`;
    }
    return `~${estimatedSessions} sesiuni AI disponibile`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={effectiveHasCredits ? '/my-ai-costs' : '/pricing'}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-500',
              'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>{effectiveHasCredits ? estimatedSessions : '–'}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
