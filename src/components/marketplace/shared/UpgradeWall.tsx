import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeWallProps {
  title: string;
  description: string;
  planName: string;
  price: string;
  features: string[];
}

export const UpgradeWall = ({ title, description, planName, price, features }: UpgradeWallProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Lock className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-lg">{description}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-2xl font-bold">{planName}</span>
              <span className="text-4xl font-bold text-primary">{price}</span>
              <span className="text-muted-foreground">/lună</span>
            </div>
            
            <ul className="space-y-2 text-left max-w-md mx-auto">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/pricing')} className="gap-2">
              Upgrade acum
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>
              Înapoi la Dashboard
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Poți anula oricând. Fără costuri ascunse.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
