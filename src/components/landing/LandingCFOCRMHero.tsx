import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LandingCFOCRMHeroProps {
  /** Called when user taps a chip — opens DemoChat with the prompt pre-filled. */
  onTryPrompt?: (prompt: string) => void;
}

const HERO_CHIP = {
  label: 'Câți bani îmi rămân după impozite?',
  prompt: 'Câți bani îmi rămân după impozite dacă scot 10.000 RON ca dividend?',
};

// Mini-demo animat în hero — vede vizitatorul Facebook în <2s ce face YANA
const DEMO_USER = 'Câți bani îmi rămân după impozite?';
const DEMO_YANA = 'Din 10.000 RON dividend îți rămân 9.200 RON. Impozit 8% = 800 RON. Vrei să simulez și salariu?';

/**
 * Hero — optimizat agresiv pentru bounce rate (Facebook mobile traffic).
 * - H1 scurt (4 cuvinte) — citibil în 1s
 * - Demo chat animat ÎN hero (deasupra fold-ului) — wow în 2s
 * - 1 chip dominant — interacțiune instantă
 * - CTA cu beneficiu concret
 */
export const LandingCFOCRMHero = ({ onTryPrompt }: LandingCFOCRMHeroProps) => {
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showYana, setShowYana] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowUser(true), 400);
    const t2 = setTimeout(() => setTyping(true), 1200);
    const t3 = setTimeout(() => { setTyping(false); setShowYana(true); }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handlePrimary = () => {
    analytics.landingCtaClick('primary', 'cfo_crm_hero');
    navigate('/auth?redirect=/yana');
  };

  const handleChip = () => {
    analytics.landingCtaClick('demo', 'hero_chip_main');
    if (onTryPrompt) {
      onTryPrompt(HERO_CHIP.prompt);
    } else {
      navigate('/auth?redirect=/yana');
    }
  };

  return (
    <section className="space-y-4 pt-1 sm:pt-6 text-center">
      {/* H1 — 4 cuvinte. Visibil instant pe orice mobil. */}
      <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
        AI-ul care{' '}
        <span className="text-primary">înțelege business.</span>
      </h1>

      <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
        Întreabă orice. Primești răspuns în 5 secunde.
      </p>

      {/* Mini-demo chat animat — wow factor în primele 2s, fără scroll */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 max-w-md mx-auto text-left space-y-2.5 min-h-[180px] shadow-lg">
        {showUser && (
          <div className="flex items-start gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">Tu</div>
            <p className="text-sm bg-muted/40 rounded-lg px-3 py-2 flex-1">{DEMO_USER}</p>
          </div>
        )}
        {typing && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">Y</div>
            <div className="bg-primary/10 rounded-lg px-3 py-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {showYana && (
          <div className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">Y</div>
            <p className="text-sm bg-primary/10 text-foreground rounded-lg px-3 py-2 flex-1 leading-relaxed">{DEMO_YANA}</p>
          </div>
        )}
        {!showUser && (
          <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground/50">
            …
          </div>
        )}
      </div>

      {/* 1 chip dominant — răspuns la "vreau să încerc" */}
      <button
        onClick={handleChip}
        className="w-full max-w-md mx-auto flex items-center justify-between gap-3 rounded-xl bg-card border-2 border-primary/30 px-4 py-3.5 text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-all min-h-[52px] group"
      >
        <span className="flex-1 text-left">Încearcă tu — întreabă orice</span>
        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </button>

      {/* CTA principal — beneficiu concret, nu "30 zile" generic */}
      <div className="space-y-1.5 pt-1">
        <Button
          size="lg"
          onClick={handlePrimary}
          className="w-full max-w-md text-base py-6 min-h-[56px] gap-2 shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
          Cont gratuit — răspuns în 5 secunde
        </Button>
        <p className="text-xs text-muted-foreground">Fără card. 30 zile gratuit.</p>
      </div>
    </section>
  );
};