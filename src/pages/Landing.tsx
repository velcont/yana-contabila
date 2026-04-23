import { useEffect, useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { DemoChat } from '@/components/demo/DemoChat';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import { BusinessDiagnostic } from '@/components/demo/BusinessDiagnostic';
import { LandingStickyMobileCTA } from '@/components/landing/LandingStickyMobileCTA';
import { LandingCFOCRMHero } from '@/components/landing/LandingCFOCRMHero';
import { Users } from 'lucide-react';

// Lazy-load below-fold sections to improve LCP on mobile
const LandingPainPoints = lazy(() => import('@/components/landing/LandingPainPoints').then(m => ({ default: m.LandingPainPoints })));
const LandingBenefits = lazy(() => import('@/components/landing/LandingBenefits').then(m => ({ default: m.LandingBenefits })));
const LandingHowItWorks = lazy(() => import('@/components/landing/LandingHowItWorks').then(m => ({ default: m.LandingHowItWorks })));
const LandingPricing = lazy(() => import('@/components/landing/LandingPricing').then(m => ({ default: m.LandingPricing })));
const LandingSocialProof = lazy(() => import('@/components/landing/LandingSocialProof').then(m => ({ default: m.LandingSocialProof })));
const LandingAIProviders = lazy(() => import('@/components/landing/LandingAIProviders').then(m => ({ default: m.LandingAIProviders })));
const LandingOfficeAnnouncement = lazy(() => import('@/components/landing/LandingOfficeAnnouncement').then(m => ({ default: m.LandingOfficeAnnouncement })));
const LandingFinalUltimatum = lazy(() => import('@/components/landing/LandingFinalUltimatum').then(m => ({ default: m.LandingFinalUltimatum })));
const LandingChatDemo = lazy(() => import('@/components/landing/LandingChatDemo').then(m => ({ default: m.LandingChatDemo })));

const SectionFallback = () => <div className="h-32 animate-pulse bg-muted/20 rounded-lg" />;

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
    script.text = JSON.stringify([
      {
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
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "YANA by Velcont",
        "url": "https://yana-contabila.lovable.app",
        "email": "office@velcont.com",
        "description": "AI pentru antreprenori - analiză financiară și strategie business"
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Ce este YANA?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "YANA este un AI de business care analizează balanțe contabile, oferă sfaturi strategice și memorează tot istoricul conversațiilor tale."
            }
          },
          {
            "@type": "Question",
            "name": "Cât costă YANA?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "YANA costă 49 RON/lună cu 30 de zile gratuit, fără card. Include conversații nelimitate și 5 AI-uri premium."
            }
          },
          {
            "@type": "Question",
            "name": "Este YANA GDPR compliant?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Da, YANA este 100% GDPR compliant, cu date criptate și servere în Uniunea Europeană."
            }
          }
        ]
      }
    ]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handlePrimaryCTA = () => {
    analytics.landingCtaClick('primary', 'hero');
    navigate('/auth?redirect=/yana');
  };

  const handleLoginCTA = () => {
    analytics.landingCtaClick('login', 'hero');
    navigate('/auth?mode=login');
  };

  return (
    <>
      <DemoChat isOpen={showDemo} onClose={() => setShowDemo(false)} onOpenDiagnostic={() => { setShowDemo(false); setShowDiagnostic(true); }} />
      <BusinessDiagnostic isOpen={showDiagnostic} onClose={() => setShowDiagnostic(false)} onOpenDemo={() => { setShowDiagnostic(false); setShowDemo(true); }} />
      <ExitIntentPopup onOpenDemo={() => setShowDemo(true)} />
      <LandingStickyMobileCTA />
      
      {/* ===== TOP HEADER — login shortcut ===== */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-xl mx-auto px-5 py-2.5 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">YANA</span>
          <button
            onClick={handleLoginCTA}
            className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
          >
            Am deja cont →
          </button>
        </div>
      </header>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 px-5 py-6 sm:p-4">
        <div className="max-w-xl mx-auto space-y-10 sm:space-y-14">
        
          {/* ===== HERO — CFO + CRM într-un singur chat ===== */}
          <LandingCFOCRMHero />

          {/* Inline social proof */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground -mt-4">
            <Users className="w-4 h-4 text-primary" />
            <span><strong className="text-foreground">177+</strong> antreprenori folosesc YANA</span>
          </div>

          {/* ===== Below-fold lazy-loaded sections ===== */}
          <Suspense fallback={<SectionFallback />}>
            <LandingChatDemo />
            <LandingPainPoints />
            <LandingSocialProof />
            <LandingBenefits />
            <LandingOfficeAnnouncement />
            <LandingHowItWorks />
            <LandingAIProviders />
            <LandingPricing />
            <LandingFinalUltimatum />
          </Suspense>

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
          <div className="pt-8 border-t border-border/40 space-y-3 pb-20 md:pb-8">
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
