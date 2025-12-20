import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, FileSpreadsheet, CheckCircle, Video } from 'lucide-react';

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

        {/* Două CTA-uri */}
        <div className="space-y-4">
          {/* CTA Principal - Strategic Advisor */}
          <div className="space-y-1">
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

          {/* CTA Secundar - Balance Upload */}
          <div className="space-y-1">
            <Button 
              variant="outline"
              size="lg" 
              className="w-full text-base px-6 py-4"
              onClick={() => navigate('/auth')}
            >
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Am balanță — vreau raport complet
            </Button>
            <p className="text-sm text-muted-foreground">
              Ai nevoie de fișier .xls de la contabil
            </p>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Fără card de credit</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>100% Gratuit</span>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-sm text-muted-foreground">sau</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* CTA Consultație Zoom GRATUITĂ */}
        <div className="w-full p-6 bg-muted/50 rounded-xl border border-border/50 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Preferi să vorbim înainte?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Consultație GRATUITĂ de 20 minute pe Zoom<br />
              cu un contabil cu 30 ani experiență
            </p>
          </div>
          
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => window.open('https://api.leadconnectorhq.com/widget/booking/6Yc2NBVCuhxGYTl6ExPo', '_blank')}
          >
            📅 Rezervă-ți locul GRATUIT
          </Button>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>100% online (Zoom)</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Fără costuri ascunse</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Locuri limitate</span>
            </div>
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
