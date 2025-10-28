import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StickyTrialBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground px-4 py-3 shadow-lg">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Gift className="h-5 w-5 flex-shrink-0 animate-bounce" />
            <p className="text-sm md:text-base font-medium truncate">
              <span className="hidden sm:inline">🎉 </span>
              <strong>Testează gratuit 30 de zile</strong>
              <span className="hidden md:inline"> → Fără card de credit → Acces instant</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="font-semibold whitespace-nowrap"
              onClick={() => navigate('/auth')}
            >
              Începe Acum
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
