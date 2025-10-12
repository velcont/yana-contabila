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
  const { subscriptionType, subscriptionStatus, isSubscribed, subscriptionEnd, checkSubscription } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: 'entrepreneur',
      name: 'Plan Antreprenor',
      description: 'Perfect pentru gestionarea propriei firme',
      price: '12',
      priceId: 'price_1SHJstBu3m83VcDAFw5saEVo',
      icon: Crown,
      features: [
        'Încărcare balanță',
        'Analiză AI automată',
        'Verificări contabile de bază',
        'Rapoarte PDF',
        'Chat AI',
        'Istoric analize',
      ],
    },
    {
      id: 'accounting_firm',
      name: 'Plan Firmă Contabilitate',
      description: 'Soluție completă pentru firme de contabilitate',
      price: '30',
      priceId: 'price_1SHJt7Bu3m83VcDAJryrpFfB',
      icon: Building2,
      popular: true,
      features: [
        'Toate funcționalitățile Plan Antreprenor',
        'Clienți nelimitați',
        'Dashboard multi-client',
        'Sistem invitații',
        'Branding personalizat',
        'Raportare automată',
        'Verificări contabile avansate',
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

        {isSubscribed && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Abonament Activ
              </CardTitle>
              <CardDescription>
                Plan curent: <strong>{subscriptionType === 'accounting_firm' ? 'Firmă Contabilitate' : 'Antreprenor'}</strong>
                {subscriptionEnd && (
                  <span className="block mt-1">
                    Valabil până la: {new Date(subscriptionEnd).toLocaleDateString('ro-RO')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading === 'manage'}
              >
                {loading === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gestionează Abonamentul
              </Button>
              <Button
                variant="outline"
                onClick={checkSubscription}
              >
                Verifică Status
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = isSubscribed && subscriptionType === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isCurrentPlan
                    ? 'border-primary shadow-lg bg-primary/5'
                    : plan.popular
                    ? 'border-accent shadow-md'
                    : ''
                }`}
              >
                {plan.popular && !isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent">
                    Popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Planul Tău
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/lună</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
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
          <p>Toate prețurile sunt în EUR. Poți anula abonamentul oricând.</p>
          <p className="mt-2">
            Pentru întrebări, contactează-ne la <a href="/contact" className="text-primary hover:underline">contact</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
