import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, Brain, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { YanaHomeButton } from '@/components/YanaHomeButton';

// Yana Strategic - Single Plan
const YANA_STRATEGIC_PRICE_ID = 'price_1Sd3AHBu3m83VcDAFa7QcuLM';

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscriptionStatus, isSubscribed, subscriptionEnd, accessType } = useSubscription();
  
  const hasStripeSubscription = accessType === 'subscription';
  const hasFreeAccess = accessType === 'free_access';
  const [loading, setLoading] = useState<string | null>(null);
  const [showAbandonedAlert, setShowAbandonedAlert] = useState(false);

  // Detectează checkout abandonat
  useEffect(() => {
    const checkAbandonedCheckout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('created_at, metadata')
          .eq('action_type', 'SUBSCRIPTION_CHECKOUT_INITIATED')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (logs && logs.length > 0) {
          const lastCheckout = new Date(logs[0].created_at);
          const hoursSince = (Date.now() - lastCheckout.getTime()) / (1000 * 60 * 60);
          
          // Dacă a inițiat checkout în ultimele 24h și nu e abonat
          if (hoursSince < 24 && !hasStripeSubscription && !hasFreeAccess) {
            setShowAbandonedAlert(true);
          }
        }
      } catch (err) {
        // Silent fail
      }
    };
    
    if (!hasStripeSubscription && !hasFreeAccess) {
      checkAbandonedCheckout();
    }
  }, [hasStripeSubscription, hasFreeAccess]);

  // If user already has subscription or free access, show subscription details page
  if (hasStripeSubscription || hasFreeAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <YanaHomeButton />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Abonamentul Tău</h1>
              <p className="text-muted-foreground">
                Gestionează abonamentul și preferințele tale
              </p>
            </div>

            <Card className="border-primary shadow-lg bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-primary">
                      {hasFreeAccess ? '🎉 Acces Gratuit Permanent' : 'Yana Strategic - Activ'}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {hasFreeAccess 
                        ? 'Fără costuri, toate funcționalitățile disponibile'
                        : 'Acces complet la toate funcționalitățile Yana Strategic'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Plan curent</p>
                    <p className="text-lg font-semibold text-foreground">
                      {hasFreeAccess ? '🎁 Acces Gratuit' : 'Yana Strategic'}
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Valabil până</p>
                    <p className="text-lg font-semibold text-foreground">
                      {subscriptionEnd 
                        ? new Date(subscriptionEnd).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })
                        : 'Nelimitat'}
                    </p>
                  </div>
                </div>

                {hasStripeSubscription && (
                  <Button 
                    onClick={async () => {
                      try {
                        setLoading('manage');
                        const { data, error } = await supabase.functions.invoke('customer-portal');
                        if (error) throw error;
                        if (data?.url) {
                          window.open(data.url, '_blank');
                        }
                      } catch (error: any) {
                        console.error('Error opening customer portal:', error);
                        toast({
                          title: 'Eroare Portal Stripe',
                          description: error.message || 'Nu s-a putut deschide portalul. Contactează suportul.',
                          variant: 'destructive',
                        });
                      } finally {
                        setLoading(null);
                      }
                    }}
                    disabled={loading === 'manage'}
                    className="w-full"
                  >
                    {loading === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gestionează Abonament (Stripe Portal)
                  </Button>
                )}

                {hasFreeAccess && (
                  <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-green-700 dark:text-green-300">
                          🎉 Ai acces gratuit permanent!
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Nu este necesar niciun abonament plătit. Bucură-te de toate funcționalitățile aplicației!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const handleSubscribe = async () => {
    try {
      setLoading('subscribe');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: YANA_STRATEGIC_PRICE_ID },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut crea sesiunea de plată',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <YanaHomeButton />
        </div>

        {showAbandonedAlert && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Ai început o plată anterior, dar nu a fost finalizată. Dacă ai întâmpinat probleme, încearcă din nou sau contactează-ne.
            </AlertDescription>
          </Alert>
        )}
        </div>

        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Un singur plan. Totul inclus.
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Yana Strategic
          </h1>
          <p className="text-lg text-muted-foreground">
            CFO-ul tău AI, la cerere. Analiză strategică, nu doar cifre.
          </p>
        </div>

        {/* Single Plan Card */}
        <Card className="border-2 border-primary shadow-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
          <CardHeader className="text-center pt-8">
            <div className="h-16 w-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Yana Strategic</CardTitle>
            <CardDescription>Acces complet la toate funcționalitățile</CardDescription>
            <div className="flex items-baseline justify-center gap-2 mt-6">
              <span className="text-5xl font-bold text-primary">49</span>
              <span className="text-2xl font-semibold">RON</span>
              <span className="text-muted-foreground">/lună</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">TVA inclus</p>
          </CardHeader>

          <CardContent className="pt-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Generează Analiza Strategică Completă (40+ pagini)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Primește un plan de acțiune concret pe 90 de zile</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Identifică riscuri ascunse și oportunități de creștere</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Discută rezultatele direct cu motorul AI</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">War Room Simulator & Battle Plan Export</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Chat AI conversațional nelimitat</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Dashboard & Analytics live</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">Export PDF & Word nelimitat</span>
              </li>
            </ul>
          </CardContent>

          <CardFooter className="pb-8">
            <Button
              className="w-full font-semibold text-lg py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
              disabled={loading === 'subscribe'}
              onClick={handleSubscribe}
            >
              {loading === 'subscribe' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-5 w-5" />
              Activează Acum
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>30 de zile gratuit • Anulare oricând • Fără card inițial</p>
          <p className="mt-2">
            Pentru întrebări, contactează-ne la <a href="/contact" className="text-primary hover:underline font-medium">contact</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
