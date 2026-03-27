import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { DemoChat } from '@/components/demo/DemoChat';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import { MessageCircle, Stethoscope } from 'lucide-react';
import { BusinessDiagnostic } from '@/components/demo/BusinessDiagnostic';
import { LandingBenefits } from '@/components/landing/LandingBenefits';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingSocialProof } from '@/components/landing/LandingSocialProof';

const Landing = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    analytics.pageView('landing');
    
    const ref = document.referrer.toLowerCase();
    if (ref.includes('youtube.com') || ref.includes('youtu.be')) {
      const alreadyShown = sessionStorage.getItem('yana_yt_demo_shown');
      if (!alreadyShown) {
        sessionStorage.setItem('yana_yt_demo_shown', '1');
        setTimeout(() => {
          setShowDemo(true);
          analytics.landingCtaClick('demo', 'youtube_auto');
        }, 1500);
      }
    }
  }, []);
  useLandingTracking();

  // JSON-LD structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "YANA",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Partenerul tău AI pentru business. Analizează cifrele, dă sfaturi strategice și nu uită nimic.",
      "url": "https://yana-contabila.lovable.app",
      "offers": {
        "@type": "Offer",
        "price": "49",
        "priceCurrency": "RON",
        "description": "Abonament lunar fără limită de conversații"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "177"
      }
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleDemoClick = () => {
    analytics.landingCtaClick('demo', 'hero');
    setShowDemo(true);
  };

  const handleDiagnosticClick = () => {
    analytics.landingCtaClick('secondary', 'hero');
    setShowDiagnostic(true);
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
      <DemoChat isOpen={showDemo} onClose={() => setShowDemo(false)} onOpenDiagnostic={() => { setShowDemo(false); setShowDiagnostic(true); }} />
      <BusinessDiagnostic isOpen={showDiagnostic} onClose={() => setShowDiagnostic(false)} onOpenDemo={() => { setShowDiagnostic(false); setShowDemo(true); }} />
      <ExitIntentPopup onOpenDemo={() => setShowDemo(true)} />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 px-5 py-8 sm:p-4">
        <div className="max-w-xl mx-auto space-y-12 sm:space-y-16">
        
          {/* ===== HERO ===== */}
          <section className="text-center space-y-6 sm:space-y-8 pt-4 sm:pt-12">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight">
                Ai pe cineva cu care să vorbești.
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground">
                Despre business. Despre cifre. Despre ce te ține treaz noaptea.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground/80 pt-1">
                Partener AI de business: analizează balanța, dă sfaturi strategice, nu uită nimic.
              </p>
            </div>

            <div className="text-base sm:text-lg md:text-xl text-foreground/80 space-y-2 py-2">
              <p className="italic">"Yana e singurul 'angajat' care nu judecă, nu obosește și nu uită ce i-ai spus."</p>
            </div>

            {/* CTA Principal */}
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full text-base sm:text-lg px-8 py-7 sm:py-6 shadow-2xl hover:shadow-primary/25 transition-all min-h-[56px]"
                onClick={handlePrimaryCTA}
              >
                Vorbește cu Yana — 30 zile gratuit
              </Button>
              <p className="text-sm text-muted-foreground">
                Cont gratuit. Fără card. 30 de zile să vedeți dacă vă înțelegeți.
              </p>
              
              {/* Diagnostic Button */}
              <button
                onClick={handleDiagnosticClick}
                className="w-full flex items-center gap-3 px-4 py-5 sm:py-4 
                           bg-card border-2 border-primary/30 rounded-xl
                           hover:border-primary hover:shadow-lg
                           active:scale-[0.98]
                           transition-all duration-300 group text-left min-h-[60px]"
              >
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-foreground font-medium">
                    <span className="truncate">Diagnostic Gratuit — 2 minute</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    5 întrebări → raport personalizat de la YANA
                  </p>
                </div>
              </button>

              {/* Demo Chat Button */}
              <button
                onClick={handleDemoClick}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>sau vorbește direct cu YANA (10 mesaje gratuite)</span>
              </button>

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
          </section>

          {/* ===== CE FACE YANA ===== */}
          <LandingBenefits />

          {/* ===== CUM FUNCȚIONEAZĂ ===== */}
          <LandingHowItWorks />

          {/* ===== SOCIAL PROOF ===== */}
          <LandingSocialProof />

          {/* ===== PRICING ===== */}
          <LandingPricing />

          {/* ===== TRUST BADGES ===== */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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

          {/* ===== FOOTER ===== */}
          <div className="pt-8 border-t border-border/40 space-y-3 pb-8">
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
