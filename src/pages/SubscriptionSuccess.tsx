import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSubscription } = useSubscription();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Check subscription status after successful payment
    checkSubscription();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Plata Reușită!</CardTitle>
          <CardDescription>
            Abonamentul tău a fost activat cu succes
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-sm text-center">
              Acum ai acces la toate funcționalitățile planului tău. 
              Verifică-ți email-ul pentru detalii despre abonament.
            </p>
          </div>

          {sessionId && (
            <div className="text-xs text-muted-foreground text-center">
              <p>ID Sesiune: {sessionId}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/subscription')}
              className="flex-1"
            >
              Vezi Abonamentul
            </Button>
            <Button
              onClick={() => navigate('/app')}
              className="flex-1"
            >
              Mergi la Aplicație
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
