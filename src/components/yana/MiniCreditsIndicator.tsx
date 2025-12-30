import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sparkles, AlertCircle } from 'lucide-react';
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

  // Determinare culoare bazată pe sesiuni rămase
  const getColorClass = () => {
    if (!hasCredits || hasFreeAccess) return 'text-destructive';
    if (estimatedSessions <= 2) return 'text-destructive';
    if (estimatedSessions <= 5) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-primary';
  };

  const getBgClass = () => {
    if (!hasCredits || hasFreeAccess) return 'bg-destructive/10 border-destructive/30';
    if (estimatedSessions <= 2) return 'bg-destructive/10 border-destructive/30';
    if (estimatedSessions <= 5) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-primary/10 border-primary/30';
  };

  const getTooltipContent = () => {
    if (!hasCredits || hasFreeAccess) {
      return 'Nu mai ai credite AI. Click pentru a cumpăra.';
    }
    if (accessType === 'trial' && trialDaysRemaining !== null) {
      return `~${estimatedSessions} sesiuni disponibile • ${trialDaysRemaining} zile trial`;
    }
    return `~${estimatedSessions} sesiuni AI disponibile`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={hasCredits ? '/my-ai-costs' : '/pricing'}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80',
              getBgClass(),
              getColorClass()
            )}
          >
            {hasCredits ? (
              <>
                <Sparkles className="h-3 w-3" />
                <span>{estimatedSessions}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>0</span>
              </>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
