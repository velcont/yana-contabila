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
  const { subscriptionType, subscriptionStatus, loading, subscriptionEnd } = useSubscription();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

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
