import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { DemoChat } from '@/components/demo/DemoChat';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import { Stethoscope } from 'lucide-react';
import { BusinessDiagnostic } from '@/components/demo/BusinessDiagnostic';
import { LandingPainPoints } from '@/components/landing/LandingPainPoints';
import { LandingBenefits } from '@/components/landing/LandingBenefits';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingSocialProof } from '@/components/landing/LandingSocialProof';
import { LandingAIProviders } from '@/components/landing/LandingAIProviders';
import { LandingOfficeAnnouncement } from '@/components/landing/LandingOfficeAnnouncement';

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
          <section className="text-center space-y-6 pt-8 sm:pt-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              AI-ul tău de business.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-md mx-auto">
              Analizează cifre, dă sfaturi și nu uită nimic.
            </p>

            <Button 
              size="lg" 
              className="w-full text-base sm:text-lg px-8 py-7 sm:py-6 shadow-2xl hover:shadow-primary/25 transition-all min-h-[56px]"
              onClick={handlePrimaryCTA}
            >
              Încearcă gratuit — 30 zile, fără card
            </Button>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={handleDiagnosticClick}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                Diagnostic rapid gratuit
              </button>
              <span className="text-muted-foreground/30">•</span>
              <button 
                onClick={handleLoginCTA} 
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                Am deja cont
              </button>
            </div>
          </section>

          {/* ===== DURERI REALE ===== */}
          <LandingPainPoints />

          {/* ===== SOCIAL PROOF (dovadă) ===== */}
          <LandingSocialProof />

          {/* ===== SOLUȚII (ce face Yana) ===== */}
          <LandingBenefits />

          {/* ===== NOU: SUITA OFFICE ===== */}
          <LandingOfficeAnnouncement />

          {/* ===== CUM FUNCȚIONEAZĂ ===== */}
          <LandingHowItWorks />

          {/* ===== DE CE FUNCȚIONEAZĂ (AI providers) ===== */}
          <LandingAIProviders />

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
