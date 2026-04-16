import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

export const LandingStickyMobileCTA = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 safe-area-pb">
      <Button
        size="lg"
        className="w-full text-base py-5 min-h-[52px] shadow-lg"
        onClick={() => {
          analytics.landingCtaClick('primary', 'sticky_mobile');
          navigate('/auth?redirect=/yana');
        }}
      >
        Încearcă gratuit — 30 zile
      </Button>
    </div>
  );
};
