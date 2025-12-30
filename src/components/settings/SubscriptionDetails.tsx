import { useAICredits } from '@/hooks/useAICredits';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Calendar, 
  Sparkles, 
  TrendingUp,
  ArrowRight,
  RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

export function SubscriptionDetails() {
  const { 
    isLoading: creditsLoading, 
    remainingCredits, 
    usagePercent, 
    estimatedSessions, 
    hasCredits,
    hasFreeAccess,
    refetch 
  } = useAICredits();
  
  const { 
    subscriptionType, 
    subscriptionStatus, 
    subscriptionEnd, 
    accessType, 
    trialDaysRemaining,
    loading: subLoading 
  } = useSubscription();

  if (creditsLoading || subLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  const getPlanName = () => {
    if (hasFreeAccess) return 'Acces Gratuit';
    switch (subscriptionType) {
      case 'yana_strategic': return 'YANA Strategic';
      case 'entrepreneur': return 'Antreprenor';
      case 'accounting_firm': return 'Firmă Contabilitate';
      default: return 'Plan Standard';
    }
  };

  const getStatusBadge = () => {
    if (accessType === 'trial') {
      return (
        <Badge variant={trialDaysRemaining && trialDaysRemaining <= 7 ? 'destructive' : 'secondary'}>
          Trial • {trialDaysRemaining} zile rămase
        </Badge>
      );
    }
    if (subscriptionStatus === 'active') {
      return <Badge variant="default">Activ</Badge>;
    }
    return <Badge variant="outline">Inactiv</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Plan Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Planul tău
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refetch} title="Reîmprospătează">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{getPlanName()}</span>
            {getStatusBadge()}
          </div>
          
          {subscriptionEnd && subscriptionStatus === 'active' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Se reînnoiește pe {format(new Date(subscriptionEnd), 'd MMMM yyyy', { locale: ro })}
              </span>
            </div>
          )}

          {accessType === 'trial' && trialDaysRemaining !== null && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Perioada de trial:</span>
                <span className="font-medium">{trialDaysRemaining} zile rămase</span>
              </div>
              <Progress 
                value={((30 - trialDaysRemaining) / 30) * 100} 
                className="mt-2 h-2" 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Credits Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Credite AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasFreeAccess ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Contul gratuit nu include credite AI pentru funcții premium.
              </p>
              <Button asChild>
                <Link to="/pricing">
                  Alege un plan <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credite rămase</p>
                  <p className="text-2xl font-bold">{remainingCredits.toFixed(2)} RON</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Sesiuni estimate</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Sparkles className="h-5 w-5 text-primary" />
                    ~{estimatedSessions}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilizare buget</span>
                  <span className="font-medium">{Math.round(usagePercent)}%</span>
                </div>
                <Progress 
                  value={usagePercent} 
                  className={`h-2 ${usagePercent > 80 ? '[&>div]:bg-destructive' : usagePercent > 60 ? '[&>div]:bg-yellow-500' : ''}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/my-ai-costs">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Vezi detalii
                  </Link>
                </Button>
                {!hasCredits && (
                  <Button asChild className="flex-1">
                    <Link to="/pricing">
                      Cumpără credite <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/subscription">
                <CreditCard className="mr-2 h-4 w-4" />
                Gestionează abonamentul
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/pricing">
                <TrendingUp className="mr-2 h-4 w-4" />
                Schimbă planul
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
