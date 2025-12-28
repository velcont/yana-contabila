import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-xl mx-auto text-center space-y-8">
        
        {/* Headline */}
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          Află de ce contul tău e gol — 
          <span className="text-primary"> chiar dacă ai profit pe hârtie</span>
        </h1>

        {/* Subheadline - clarificare CE e Yana */}
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Yana e partenerul tău strategic AI —<br />
          te ascultă, analizează cifrele și te ajută să iei decizii clare.
        </p>

        {/* Micro-poziționare emoțională */}
        <div className="text-sm md:text-base text-muted-foreground/80 space-y-1">
          <p>Unii vin să vorbească.</p>
          <p>Alții vin pentru strategie.</p>
          <p className="font-medium text-foreground">Yana știe diferența.</p>
        </div>

        {/* CTA Principal - Strategic Advisor */}
        <div className="space-y-2">
          <Button 
            size="lg" 
            className="w-full text-lg px-8 py-6 shadow-2xl hover:shadow-primary/25 transition-all"
            onClick={() => navigate('/auth?redirect=/strategic-advisor')}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Vorbește cu Yana
          </Button>
          <p className="text-sm text-muted-foreground">
            Poți începe doar cu ce ai în cap • Răspuns instant
          </p>
        </div>

        {/* Link secundar */}
        <p className="text-sm text-muted-foreground">
          Ai deja cont?{' '}
          <button 
            onClick={() => navigate('/auth')} 
            className="text-primary hover:underline"
          >
            Autentifică-te
          </button>
        </p>

      </div>
    </div>
  );
};

export default Landing;
