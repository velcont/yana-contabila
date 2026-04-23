import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

const features = [
  'CRM conversațional (firme, contacte, deal-uri, pipeline)',
  'CFO virtual — analiză balanță & predicții',
  'Conversații nelimitate cu YANA',
  '5 AI-uri premium (GPT-5, Claude, Gemini, Perplexity, Grok)',
  'War Room — simulări strategice',
  'Memorie completă — nu uită nimic',
  'Alerte proactive înainte de criză',
];

export const LandingPricing = () => {
  const navigate = useNavigate();

  const handleCTA = () => {
    analytics.landingCtaClick('primary', 'pricing_section');
    navigate('/auth?redirect=/yana');
  };

  return (
    <section className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          CFO + CRM. Un singur preț.
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Pipedrive + contabil + Excel = ~600 RON/lună.<br />
          YANA = <strong className="text-foreground">49 RON/lună</strong>. Tot.
        </p>
      </div>

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
          Oprește pierderile — gratuit 30 zile
        </Button>
      </div>
    </section>
  );
};
