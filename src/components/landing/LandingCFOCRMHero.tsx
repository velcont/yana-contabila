import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { MessageSquare, Sparkles, ArrowRight } from 'lucide-react';

interface LandingCFOCRMHeroProps {
  /** Called when user taps a chip — opens DemoChat with the prompt pre-filled. */
  onTryPrompt?: (prompt: string) => void;
}

const CHIPS: Array<{ label: string; prompt: string }> = [
  { label: 'Câți bani îmi rămân după impozite?', prompt: 'Câți bani îmi rămân după impozite dacă scot 10.000 RON ca dividend?' },
  { label: 'Cum stă pipeline-ul meu?', prompt: 'Cum stă pipeline-ul meu de vânzări luna asta?' },
  { label: 'Analizează-mi balanța', prompt: 'Vreau să-mi analizezi balanța contabilă. Ce trebuie să fac?' },
];

/**
 * Hero — versiune optimizată pentru bounce rate.
 * - 1 promisiune clară (beneficiu, nu feature)
 * - 3 chips clickabile (interacțiune instantă)
 * - 1 CTA dominant
 */
export const LandingCFOCRMHero = ({ onTryPrompt }: LandingCFOCRMHeroProps) => {
  const navigate = useNavigate();

  const handlePrimary = () => {
    analytics.landingCtaClick('primary', 'cfo_crm_hero');
    navigate('/auth?redirect=/yana');
  };

  const handleChip = (chip: { label: string; prompt: string }) => {
    analytics.landingCtaClick('chip', `hero_${chip.label.slice(0, 30)}`);
    if (onTryPrompt) {
      onTryPrompt(chip.prompt);
    } else {
      navigate('/auth?redirect=/yana');
    }
  };

  return (
    <section className="space-y-5 pt-2 sm:pt-8 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Primul CRM conversațional AI din România</span>
      </div>

      {/* H1 — beneficiu, nu feature */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
        Cifrele tale,{' '}
        <span className="text-primary">explicate ca de un CFO.</span>
        <span className="block text-foreground/70 text-2xl sm:text-3xl md:text-4xl mt-2 font-semibold">
          Clienții tăi, gestionați prin chat.
        </span>
      </h1>

      <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
        Întreabă YANA orice. Răspunsul vine în 5 secunde.
      </p>

      {/* Chips interactive — utilizatorul atinge ceva în 2 secunde */}
      <div className="space-y-2 max-w-md mx-auto pt-1">
        <p className="text-xs text-muted-foreground/80 font-medium">Încearcă acum, fără cont:</p>
        <div className="space-y-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChip(chip)}
              className="w-full text-left rounded-xl bg-card border border-border/40 px-4 py-3 text-sm text-foreground hover:bg-muted/50 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group min-h-[48px]"
            >
              <span className="flex-1">{chip.label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* CTA secundar — pentru cei care vor cont direct */}
      <div className="space-y-2 pt-3">
        <Button
          size="lg"
          onClick={handlePrimary}
          className="w-full max-w-md text-base py-6 min-h-[56px] gap-2 shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
          Încearcă gratuit — 30 zile
        </Button>
        <p className="text-xs text-muted-foreground">Fără card. Fără setări complicate.</p>
      </div>
    </section>
  );
};