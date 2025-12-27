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

        {/* CTA Principal - Strategic Advisor */}
        <div className="space-y-2">
          <Button 
            size="lg" 
            className="w-full text-lg px-8 py-6 shadow-2xl hover:shadow-primary/25 transition-all"
            onClick={() => navigate('/auth?redirect=/strategic-advisor')}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Vorbește cu Yana ACUM
          </Button>
          <p className="text-sm text-muted-foreground">
            Fără balanță necesară • Răspuns instant
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
