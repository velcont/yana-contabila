import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

interface ExitIntentPopupProps {
  onOpenDemo: () => void;
}

export const ExitIntentPopup = ({ onOpenDemo }: ExitIntentPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse moves toward top of viewport (closing tab/back)
    if (e.clientY <= 5 && !isVisible) {
      const alreadyShown = sessionStorage.getItem('exit_intent_shown');
      if (!alreadyShown) {
        setIsVisible(true);
        sessionStorage.setItem('exit_intent_shown', 'true');
        analytics.buttonClick('exit_intent_shown', 'landing');
      }
    }
  }, [isVisible]);

  useEffect(() => {
    // Delay adding listener so it doesn't trigger immediately
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseLeave]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <MessageCircle className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground">
          Stai puțin...
        </h2>
        <p className="text-muted-foreground">
          Ai <strong className="text-primary">5 conversații gratuite</strong> cu Yana. 
          Fără cont, fără card. Spune-i ce te frământă.
        </p>

        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full text-base py-5"
            onClick={() => {
              analytics.landingCtaClick('demo', 'exit_intent');
              setIsVisible(false);
              onOpenDemo();
            }}
          >
            Încearcă gratuit acum
          </Button>
          <button
            onClick={() => {
              analytics.landingCtaClick('primary', 'exit_intent');
              navigate('/auth?redirect=/yana');
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Sau creează un cont (30 zile gratuit)
          </button>
        </div>
      </div>
    </div>
  );
};
