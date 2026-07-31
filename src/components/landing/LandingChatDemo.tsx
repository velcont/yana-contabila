import { useEffect, useRef, useState } from 'react';
import { Building2, MessageSquare, TrendingUp } from 'lucide-react';
import { analytics } from '@/utils/analytics';

type Turn = {
  role: 'user' | 'yana';
  text: string;
  icon?: typeof Building2;
};

const SCRIPT: Turn[] = [
  { role: 'user', text: 'Adaugă SC Alpha SRL ca lead, deal 50.000 RON pentru consultanță.' },
  { role: 'yana', icon: Building2, text: 'Gata. Am adăugat Alpha SRL și un deal de 50.000 RON în stadiul "Lead nou". Vrei să programez și un follow-up săptămâna viitoare?' },
  { role: 'user', text: 'Cum stă pipeline-ul luna asta?' },
  { role: 'yana', icon: TrendingUp, text: 'Ai 7 deal-uri active, total 320.000 RON. 3 în Negociere (180k), 2 în Calificat (90k), 2 Lead-uri noi (50k).' },
  { role: 'user', text: 'Mută Alpha în Negociere și loghează apelul de azi.' },
  { role: 'yana', icon: MessageSquare, text: 'Mutat în Negociere, apel notat. Probabilitate actualizată la 80%.' },
];

/**
 * Demo animat — mesajele apar progresiv, ca un chat real care se desfășoară.
 * Loop-uiește la final pentru a menține atenția pe mobil.
 */
export const LandingChatDemo = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [yanaTyping, setYanaTyping] = useState(false);
  const trackedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Start animation only when section enters viewport (mobile perf + perceived intent)
  useEffect(() => {
    if (!containerRef.current || hasStarted) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    if (visibleCount >= SCRIPT.length) {
      // Track completion once, then loop after a pause
      if (!trackedRef.current) {
        trackedRef.current = true;
        analytics.landingCtaClick('demo', 'auto_demo_completed');
      }
      const restart = setTimeout(() => {
        setVisibleCount(0);
        setYanaTyping(false);
      }, 3500);
      return () => clearTimeout(restart);
    }

    const next = SCRIPT[visibleCount];
    // User messages appear faster; Yana shows a typing indicator first
    if (next.role === 'user') {
      const t = setTimeout(() => setVisibleCount((c) => c + 1), 900);
      return () => clearTimeout(t);
    }

    // Yana: typing -> message
    setYanaTyping(true);
    const typingDelay = setTimeout(() => {
      setYanaTyping(false);
      setVisibleCount((c) => c + 1);
    }, 1400);
    return () => clearTimeout(typingDelay);
  }, [visibleCount, hasStarted]);

  const visible = SCRIPT.slice(0, visibleCount);

  return (
    <section className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Așa arată CRM-ul tău în chat
        </h2>
        <p className="text-sm text-muted-foreground">Fără click-uri. Fără formulare. Doar conversație.</p>
      </div>

      <div
        ref={containerRef}
        className="rounded-2xl border border-border/40 bg-card overflow-hidden min-h-[340px]"
      >
        {visible.map((turn, i) =>
          turn.role === 'user' ? (
            <UserMsg key={i} text={turn.text} />
          ) : (
            <YanaMsg key={i} text={turn.text} icon={turn.icon!} />
          )
        )}
        {yanaTyping && <TypingIndicator />}
        {!hasStarted && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            scroll pentru a vedea YANA în acțiune…
          </div>
        )}
      </div>
    </section>
  );
};

const UserMsg = ({ text }: { text: string }) => (
  <div className="px-4 py-3 border-b border-border/30 bg-muted/30 animate-in fade-in slide-in-from-right-2 duration-300">
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold flex-shrink-0">Tu</div>
      <p className="text-sm text-foreground leading-relaxed pt-1">{text}</p>
    </div>
  </div>
);

const YanaMsg = ({ text, icon: Icon }: { text: string; icon: typeof Building2 }) => (
  <div className="px-4 py-3 border-b border-border/30 last:border-b-0 animate-in fade-in slide-in-from-left-2 duration-300">
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">Y</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
        <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
          <Icon className="w-3 h-3" />
          <span>acțiune CRM executată</span>
        </div>
      </div>
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="px-4 py-3 border-b border-border/30 last:border-b-0">
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">Y</div>
      <div className="flex-1 pt-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);