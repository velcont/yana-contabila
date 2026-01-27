import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-xl mx-auto text-center space-y-8">
        
        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Yana nu e un chatbot.
          </h1>
          <p className="text-3xl md:text-5xl font-bold text-primary">
            Este un AI pentru business.
          </p>
        </div>

        {/* Micro-copy */}
        <div className="text-lg md:text-xl text-muted-foreground space-y-1">
          <p>Îți analizează cifrele.</p>
          <p>Te ascultă.</p>
          <p>Te ajută să decizi.</p>
        </div>

        {/* CTA Principal */}
        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full text-lg px-8 py-6 shadow-2xl hover:shadow-primary/25 transition-all"
            onClick={() => navigate('/auth?redirect=/yana')}
          >
            Încearcă Yana gratuit
          </Button>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Doar email și parolă. 30 secunde.</p>
            <p>Primești 30 de zile să testezi tot.</p>
          </div>
        </div>

        {/* AI Models Section */}
        <div className="border border-border/50 rounded-xl p-6 bg-muted/30 space-y-3">
          <p className="text-sm font-medium text-foreground">
            6 AI-uri premium. Un singur abonament.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <span className="text-xs text-muted-foreground">Gemini Pro</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">Gemini Flash</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">Claude Sonnet</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">Claude Haiku</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">GPT-4o</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-xs text-muted-foreground">Grok</span>
          </div>
          
          <p className="text-xs text-primary font-medium">
            Toate incluse în 49 RON/lună
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
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

        {/* Footer Legal */}
        <div className="pt-8 border-t border-border/40 space-y-3">
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
  );
};

export default Landing;
