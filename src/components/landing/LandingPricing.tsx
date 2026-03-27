import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

const features = [
  'Conversații nelimitate cu Yana',
  'Analiză balanță contabilă',
  'War Room — simulări strategice',
  'Battle Plan — plan de acțiune',
  'Memorie completă — nu uită nimic',
  'Predicții financiare AI',
];

export const LandingPricing = () => {
  const navigate = useNavigate();

  const handleCTA = () => {
    analytics.landingCtaClick('pricing_cta', 'pricing_section');
    navigate('/auth?redirect=/yana');
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Un singur plan. Tot inclus.
      </h2>

      <div className="rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-bold text-foreground">49</span>
            <span className="text-lg text-muted-foreground">RON/lună</span>
          </div>
          <p className="text-sm text-primary font-medium">30 de zile gratuit • Fără card</p>
        </div>

        <div className="space-y-2.5">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full text-base py-6 min-h-[52px]"
          onClick={handleCTA}
        >
          Începe gratuit — 30 de zile
        </Button>
      </div>
    </section>
  );
};
