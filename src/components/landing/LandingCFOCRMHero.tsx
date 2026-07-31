import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { useEffect, useState } from 'react';

interface LandingCFOCRMHeroProps {
  /** Called when user taps a chip — opens DemoChat with the prompt pre-filled. */
  onTryPrompt?: (prompt: string) => void;
}

// Mini-demo în hero — vizitatorul vede în <2s exact ce face YANA
const DEMO_USER = 'Câți bani îmi rămân după taxe luna asta?';
const DEMO_YANA = 'Rămâi cu 14.200 RON net. Recomand să pui 2.000 deoparte pentru dividende.';

/**
 * Hero mobil — redesign pentru a reduce bounce rate (95% → target <60%).
 * - Headline = slogan oficial (clarifică INSTANT ce e YANA)
 * - Subline = CFO + CRM + Secretar într-un chat
 * - Demo chat static (fără să sară layout-ul) cu un exemplu concret de valoare
 * - UN SINGUR CTA dominant — "Oprește pierderile — 30 zile gratuit"
 */
export const LandingCFOCRMHero = ({ onTryPrompt }: LandingCFOCRMHeroProps) => {
  const navigate = useNavigate();
  const [showYana, setShowYana] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowYana(true), 700);
    return () => clearTimeout(t);
  }, []);

  const handlePrimary = () => {
    analytics.landingCtaClick('primary', 'cfo_crm_hero');
    navigate('/auth?redirect=/yana');
  };

  const handleDemoTap = () => {
    analytics.landingCtaClick('demo', 'hero_chat_preview');
    if (onTryPrompt) {
      onTryPrompt(DEMO_USER);
    } else {
      navigate('/auth?redirect=/yana');
    }
  };

  return (
    <section className="space-y-7 pt-2 sm:pt-6 text-center">
      {/* Headline — slogan oficial, citibil în 1s */}
      <div className="space-y-4">
        <h2 className="text-[28px] sm:text-4xl font-extrabold text-foreground leading-[1.15] tracking-tight">
          YANA nu este un chatbot.
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Este un AI pentru business.
          </span>
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
          CFO + CRM + Secretar Executiv.
          <br />
          Totul într-un singur chat.
        </p>
      </div>

      {/* Mock chat preview — exemplu concret de valoare, tap = demo */}
      <button
        onClick={handleDemoTap}
        className="w-full text-left bg-card/50 border border-border/50 rounded-2xl p-4 space-y-3 shadow-2xl active:scale-[0.99] transition-transform"
        aria-label="Încearcă demo"
      >
        <div className="flex items-end gap-2 max-w-[85%]">
          <p className="bg-muted/60 text-foreground rounded-2xl rounded-bl-none px-3 py-2 text-sm flex-1">
            {DEMO_USER}
          </p>
        </div>
        <div className="flex items-end gap-2 justify-end">
          <p className="bg-primary text-primary-foreground rounded-2xl rounded-br-none px-3 py-2 text-sm font-medium flex-1">
            {showYana ? DEMO_YANA : '…'}
          </p>
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 shadow-lg shadow-primary/30">
            Y
          </div>
        </div>
      </button>

      {/* UN SINGUR CTA dominant — fără competiție vizuală */}
      <div className="space-y-2">
        <Button
          size="lg"
          onClick={handlePrimary}
          className="w-full text-base font-bold py-6 min-h-[56px] shadow-xl shadow-primary/25"
        >
          Oprește pierderile — 30 zile gratuit
        </Button>
        <p className="text-xs text-muted-foreground font-medium">
          49 RON/lună după test • Fără card
        </p>
      </div>
    </section>
  );
};