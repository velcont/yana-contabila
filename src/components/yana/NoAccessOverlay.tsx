import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart } from 'lucide-react';
import { AccessType } from '@/contexts/SubscriptionContext';

interface NoAccessOverlayProps {
  accessType: AccessType | null;
}

export function NoAccessOverlay({ accessType }: NoAccessOverlayProps) {
  const isTrialExpired = accessType === 'trial_expired';
  
  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Bine ai revenit!
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {isTrialExpired 
            ? 'Ai explorat YANA în perioada de probă. Când ești gata să continui, suntem aici pentru tine.'
            : 'Abonamentul tău a expirat. Când ești pregătit să continui, te așteptăm cu drag.'
          }
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/pricing">
              <Sparkles className="h-4 w-4" />
              Alege un plan
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/subscription">
              Află mai multe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
