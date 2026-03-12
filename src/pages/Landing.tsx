import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { DemoChat } from '@/components/demo/DemoChat';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import { MessageCircle, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  // Track page view + scroll/time tracking
  useEffect(() => {
    analytics.pageView('landing');
  }, []);
  useLandingTracking();

  const handleDemoClick = () => {
    analytics.landingCtaClick('demo', 'hero');
    setShowDemo(true);
  };

  const handlePrimaryCTA = () => {
    analytics.landingCtaClick('primary', 'hero');
    navigate('/auth?redirect=/yana');
  };

  const handleLoginCTA = () => {
    analytics.landingCtaClick('login', 'hero');
    navigate('/auth');
  };

  return (
    <>
      <DemoChat isOpen={showDemo} onClose={() => setShowDemo(false)} />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-xl mx-auto text-center space-y-8">
        
        {/* Headline - Relational, not transactional */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Ai pe cineva cu care să vorbești.
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground">
            Despre business. Despre cifre. Despre ce te ține treaz noaptea.
          </p>
        </div>

        {/* Emotional hook */}
        <div className="text-lg md:text-xl text-foreground/80 space-y-2 py-2">
          <p className="italic">"Yana e singurul 'angajat' care nu judecă, nu obosește și nu uită ce i-ai spus."</p>
        </div>

        {/* CTA Principal - Relational language */}
        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full text-lg px-8 py-6 shadow-2xl hover:shadow-primary/25 transition-all"
            onClick={handlePrimaryCTA}
          >
            Vorbește cu Yana
          </Button>
          <p className="text-sm text-muted-foreground">
            Cont gratuit. 30 de zile să vedeți dacă vă înțelegeți.
          </p>
          
          {/* Demo Button - Fake Input Style */}
          <button
            onClick={handleDemoClick}
            className="w-full flex items-center gap-3 px-4 py-4 
                       bg-card border-2 border-primary/30 rounded-xl
                       hover:border-primary hover:shadow-lg
                       transition-all duration-300 group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="truncate">Scrie ce te frământă...</span>
                <span className="animate-pulse">|</span>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Click pentru a vorbi cu Yana
              </p>
            </div>
          </button>
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
            <span>🎁</span>
            <span>5 conversații gratuite. Fără cont.</span>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Ai deja cont?{' '}
            <button 
              onClick={handleLoginCTA} 
              className="text-primary hover:underline"
            >
              Autentifică-te
            </button>
          </p>
        </div>

        {/* Companion benefits - emotional, not technical */}
        <div className="border border-border/50 rounded-xl p-6 bg-muted/30 space-y-4">
          <p className="text-sm font-medium text-foreground">
            De ce antreprenorii revin zilnic la Yana:
          </p>
          
          <div className="space-y-2 text-left">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>Își amintește tot ce i-ai spus</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>Te întreabă cum a mers cu clientul X</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>Nu te judecă când repeți aceeași greșeală</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
            49 RON/lună • Fără limită de conversații
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            GDPR compliant
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            Date criptate
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            Servere în UE
          </div>
        </div>

        {/* Footer Legal */}
        <div className="pt-8 border-t border-border/40 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Termeni și condiții
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Confidențialitate
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
          <div className="text-xs text-muted-foreground/60 text-center">
            <a href="mailto:office@velcont.com" className="hover:text-primary transition-colors">
              office@velcont.com
            </a>
            <span className="mx-2">•</span>
            © {new Date().getFullYear()} YANA by Velcont
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default Landing;
