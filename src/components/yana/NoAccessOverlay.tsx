import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { AccessType } from '@/contexts/SubscriptionContext';

interface NoAccessOverlayProps {
  accessType: AccessType | null;
}

export function NoAccessOverlay({ accessType }: NoAccessOverlayProps) {
  const isTrialExpired = accessType === 'trial_expired';
  
  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {isTrialExpired 
            ? 'Perioada de testare s-a încheiat' 
            : 'Abonamentul tău a expirat'
          }
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {isTrialExpired 
            ? 'Ai explorat YANA în perioada de trial. Pentru a continua să beneficiezi de consilierul tău strategic AI, alege un plan care ți se potrivește.'
            : 'Pentru a continua să folosești YANA, te rugăm să îți reînnoiești abonamentul sau să alegi un plan nou.'
          }
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/pricing">
              <Sparkles className="h-4 w-4" />
              Alege un plan
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/subscription">
              Află mai multe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
