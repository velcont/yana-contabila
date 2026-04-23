import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { MessageSquare, TrendingUp, Users, Sparkles } from 'lucide-react';

/**
 * Hero CFO+CRM — repoziționare YANA ca primul CRM conversational AI din România,
 * combinat cu rolul de CFO virtual (analiza balanței).
 */
export const LandingCFOCRMHero = () => {
  const navigate = useNavigate();

  const handlePrimary = () => {
    analytics.landingCtaClick('primary', 'cfo_crm_hero');
    navigate('/auth?redirect=/yana');
  };

  return (
    <section className="space-y-6 pt-2 sm:pt-8 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Primul CRM conversațional AI din România</span>
      </div>

      {/* H1 */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
        CFO + CRM
        <span className="block text-primary mt-1">într-un singur chat.</span>
      </h1>

      <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
        Vorbești cu YANA. Ea îți analizează cifrele,
        gestionează clienții și pipeline-ul.{' '}
        <strong className="text-foreground">Niciun click în plus.</strong>
      </p>

      {/* Mini-demo de comenzi */}
      <div className="space-y-2 max-w-md mx-auto text-left">
        <ChatExample text='"Adaugă SC Alpha SRL ca lead, deal 50.000 RON pentru consultanță."' />
        <ChatExample text='"Cum stă pipeline-ul luna asta?"' />
        <ChatExample text='"Analizează balanța din decembrie."' />
      </div>

      {/* CTA */}
      <div className="space-y-2 pt-2">
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

      {/* Mini bullets */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-4">
        <Feature icon={MessageSquare} label="Chat-first" />
        <Feature icon={TrendingUp} label="CFO virtual" />
        <Feature icon={Users} label="CRM integrat" />
      </div>
    </section>
  );
};

const ChatExample = ({ text }: { text: string }) => (
  <div className="rounded-xl bg-muted/50 border border-border/40 px-4 py-2.5 text-sm text-foreground/80">
    <span className="text-primary mr-1">›</span>
    <span className="italic">{text}</span>
  </div>
);

const Feature = ({ icon: Icon, label }: { icon: typeof MessageSquare; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/40">
    <Icon className="w-5 h-5 text-primary" />
    <span className="text-xs font-medium text-foreground">{label}</span>
  </div>
);