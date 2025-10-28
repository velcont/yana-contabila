import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Crown, Building2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscriptionType, subscriptionStatus, isSubscribed, subscriptionEnd, checkSubscription, accessType } = useSubscription();
  
  // Only show "Active Subscription" card if user has a real Stripe subscription
  const hasStripeSubscription = accessType === 'subscription';
  const hasFreeAccess = accessType === 'free_access';
  const [loading, setLoading] = useState<string | null>(null);

  // If user already has subscription or free access, show subscription details page
  if (hasStripeSubscription || hasFreeAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la aplicație
          </Button>

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
                    <CardTitle className="text-primary">Abonament Activ</CardTitle>
                    <CardDescription className="text-base">
                      {subscriptionType === 'accounting_firm' 
                        ? 'Plan Firmă Contabilitate' 
                        : 'Plan Antreprenor'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Plan curent</p>
                    <p className="text-lg font-semibold text-foreground">
                      {subscriptionType === 'accounting_firm' 
                        ? 'Firmă Contabilitate' 
                        : 'Antreprenor'}
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
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Ai acces gratuit permanent la această aplicație
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const plans = [
    {
      id: 'entrepreneur',
      name: 'Plan Antreprenor',
      description: 'Perfect pentru afaceri mici și mijlocii',
      price: '49',
      priceId: 'price_1SLWzEBu3m83VcDAfHVcQupt',
      icon: Crown,
      features: [
        'Analiză AI nelimitată a balanței',
        'Chat AI conversațional',
        'Voice Interface (10 min/lună)',
        'Dashboard & Analytics live',
        'Predicții AI & Alerte proactive',
        'Export PDF nelimitat',
        '✨ Yana Strategică + 10 lei credit test',
        'Suport email prioritar',
      ],
    },
    {
      id: 'accounting_firm',
      name: 'Plan Contabil',
      description: 'Pentru firme de contabilitate cu clienți',
      price: '199',
      priceId: 'price_1SLWzFBu3m83VcDAgP1veppc',
      icon: Building2,
      popular: true,
      features: [
        'Toate din planul Antreprenor (fără Yana Strategică)',
        'CRM complet pentru clienți',
        'Management documente & facturi',
        'Calendar termene fiscale',
        'Task management & colaborare',
        'Email marketing integrat',
        'Branding personalizat',
        'Clienți nelimitați',
      ],
    },
  ];

  const handleSubscribe = async (priceId: string, planId: string) => {
    try {
      setLoading(planId);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
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

  const handleManageSubscription = async () => {
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
        title: 'Eroare',
        description: error.message || 'Nu s-a putut deschide portalul',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi la aplicație
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Alege planul potrivit pentru tine
          </h1>
          <p className="text-lg text-muted-foreground">
            Începe cu un abonament lunar, anulează oricând
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = hasStripeSubscription && subscriptionType === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:scale-[1.02] ${
                  isCurrentPlan
                    ? 'border-primary shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5'
                    : plan.popular
                    ? 'border-accent shadow-lg bg-gradient-to-br from-accent/10 to-accent/5'
                    : 'shadow-md hover:shadow-lg'
                }`}
              >
                {plan.popular && !isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold shadow-md">
                    Planul Tău
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold shadow-md">
                    Plan Activ
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      isCurrentPlan 
                        ? 'bg-gradient-to-br from-primary/20 to-accent/20' 
                        : 'bg-primary/10'
                    }`}>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    <span className="text-xl font-semibold text-foreground">RON</span>
                    <span className="text-muted-foreground ml-1">/lună</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full font-semibold ${
                      isCurrentPlan 
                        ? 'border-primary/50' 
                        : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md'
                    }`}
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || loading === plan.id}
                    onClick={() => handleSubscribe(plan.priceId, plan.id)}
                  >
                    {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCurrentPlan ? 'Plan Activ' : 'Abonează-te'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Toate prețurile sunt în RON. Poți anula abonamentul oricând.</p>
          <p className="mt-2">
            Pentru întrebări, contactează-ne la <a href="/contact" className="text-primary hover:underline font-medium">contact</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
