import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

export function TrialExpiredOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md mx-auto text-center space-y-6 p-8">
        <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Perioada de testare s-a încheiat
          </h2>
          <p className="text-muted-foreground">
            Cele 30 de zile gratuite au expirat. Pentru a continua să folosești Yana, alege un plan de abonament.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-left">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Yana Strategic - 49 RON/lună</p>
              <p className="text-sm text-muted-foreground mt-1">
                Include 20 credite AI, analiză financiară nelimitată, Consilier Strategic și multe altele.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/pricing" className="w-full">
            <Button className="w-full" size="lg">
              Alege un plan
            </Button>
          </Link>
          <Link to="/subscription" className="w-full">
            <Button variant="ghost" className="w-full">
              Află mai multe despre abonamente
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
