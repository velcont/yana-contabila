import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';
import { MessageSquare } from 'lucide-react';

export const LandingStickyMobileCTA = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Apare după ce utilizatorul a depășit hero-ul (~250px), nu de la primii 50px
    const onScroll = () => setVisible(window.scrollY > 250);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 safe-area-pb animate-in slide-in-from-bottom-2 duration-300">
      <Button
        size="lg"
        className="w-full text-base py-5 min-h-[52px] shadow-lg gap-2"
        onClick={() => {
          analytics.landingCtaClick('primary', 'sticky_mobile');
          navigate('/auth?redirect=/yana');
        }}
      >
        <MessageSquare className="w-4 h-4" />
        Vorbește cu YANA — gratuit
      </Button>
      <p className="text-[10px] text-center text-muted-foreground mt-1">30 zile gratuit · fără card</p>
    </div>
  );
};
