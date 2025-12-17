import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-xl mx-auto text-center space-y-8">
        
        {/* Headline simplu */}
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          Află de ce contul tău e gol — 
          <span className="text-primary"> chiar dacă ai profit pe hârtie</span>
        </h1>

        {/* CTA Principal - MARE */}
        <Button 
          size="lg" 
          className="w-full md:w-auto text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 shadow-2xl hover:shadow-primary/25 transition-all"
          onClick={() => navigate('/auth')}
        >
          <Upload className="mr-3 h-6 w-6" />
          Încarcă Balanța → Analiză Gratuită
        </Button>

        {/* Trust Signals minimale */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Fără card de credit</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Rezultat în 60 secunde</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>100% Gratuit</span>
          </div>
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
