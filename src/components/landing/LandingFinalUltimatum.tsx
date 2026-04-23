import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

export const LandingFinalUltimatum = () => {
  const navigate = useNavigate();

  const handleCTA = () => {
    analytics.landingCtaClick('primary', 'final_ultimatum');
    navigate('/auth?redirect=/yana');
  };

  return (
    <section className="rounded-2xl bg-foreground text-background p-6 sm:p-8 space-y-6 text-center">
      <h2 className="text-xl sm:text-2xl font-bold">
        Două opțiuni:
      </h2>

      <div className="space-y-4 max-w-sm mx-auto text-left">
        <div className="flex items-start gap-3">
          <span className="text-2xl font-bold text-muted-foreground/50">1.</span>
          <p className="text-sm sm:text-base leading-relaxed pt-1">
            Plătești 5 abonamente, deschizi 5 tab-uri, faci copy-paste.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl font-bold text-primary">2.</span>
          <p className="text-sm sm:text-base leading-relaxed pt-1 font-medium">
            Vorbești cu YANA. Ea face restul.
          </p>
        </div>
      </div>

      <Button
        size="lg"
        className="text-base py-6 px-10 min-h-[52px]"
        onClick={handleCTA}
      >
        Alege opțiunea 2
      </Button>
    </section>
  );
};
