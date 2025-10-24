import { Crown, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const SubscriptionBadge = () => {
  const navigate = useNavigate();
  const { subscriptionType, subscriptionStatus, loading, subscriptionEnd, trialDaysRemaining, accessType } = useSubscription();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Show trial days ONLY when access_type is 'trial'
  if (accessType === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0) {
    const variant = trialDaysRemaining <= 7 ? 'destructive' : 'default';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size="sm"
              onClick={() => navigate('/subscription')}
              className="gap-2 font-semibold"
            >
              <Crown className="h-4 w-4" />
              {trialDaysRemaining} {trialDaysRemaining === 1 ? 'zi' : 'zile'} gratuite
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">Perioada de gratuitate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mai ai {trialDaysRemaining} {trialDaysRemaining === 1 ? 'zi' : 'zile'} din cele 30 zile gratuite
              </p>
              {trialDaysRemaining <= 7 && (
                <p className="text-xs text-amber-500 font-medium mt-1">
                  ⚠️ Se apropie de sfârșit!
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show active subscription badge for ALL active users (including free_access)
  if (subscriptionStatus === 'active' || accessType === 'free_access') {
    const isAccountant = subscriptionType === 'accounting_firm';
    const Icon = isAccountant ? Building2 : Crown;
    const daysLeft = subscriptionEnd ? Math.max(0, Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/subscription')}
              className="gap-2 whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              <Badge variant={isAccountant ? "default" : "secondary"} className="text-xs">
                {isAccountant ? 'Contabil' : 'Antreprenor'}
              </Badge>
              {accessType === 'trial' && trialDaysRemaining !== null && (
                <span className="text-xs">Trial: {trialDaysRemaining} {trialDaysRemaining === 1 ? 'zi' : 'zile'}</span>
              )}
              {accessType !== 'trial' && daysLeft !== null && (
                <span className="text-xs">Renovare în {daysLeft} {daysLeft === 1 ? 'zi' : 'zile'}</span>
              )}
              {accessType === 'free_access' && (
                <span className="text-xs text-green-600">Acces gratuit</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">
                Plan: {isAccountant ? 'Firmă Contabilitate' : 'Antreprenor'}
              </p>
              {subscriptionEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Valabil până: {new Date(subscriptionEnd).toLocaleDateString('ro-RO')}
                </p>
              )}
              {accessType === 'free_access' && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✅ Acces gratuit permanent
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Click pentru detalii
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If no subscription and no trial, show subscribe button
  if (subscriptionStatus === 'inactive') {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => navigate('/subscription')}
        className="gap-2"
      >
        <Crown className="h-4 w-4" />
        Abonează-te
      </Button>
    );
  }

  const isAccountant = subscriptionType === 'accounting_firm';
  const Icon = isAccountant ? Building2 : Crown;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/subscription')}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            <Badge variant={isAccountant ? "default" : "secondary"} className="text-xs">
              {isAccountant ? 'Contabil' : 'Antreprenor'}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">
              Plan: {isAccountant ? 'Firmă Contabilitate' : 'Antreprenor'}
            </p>
            {subscriptionEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Valabil până: {new Date(subscriptionEnd).toLocaleDateString('ro-RO')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Click pentru detalii
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
