import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, DollarSign, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserCreditsAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [usagePercent, setUsagePercent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_monthly_ai_usage', {
        p_user_id: user.id,
        p_month_year: new Date().toISOString().slice(0, 7)
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const usage = data[0];
        setUsagePercent(usage.usage_percent);
        setRemaining(usage.budget_cents - usage.total_cost_cents);

        // Show alert if usage is above 80%
        if (usage.usage_percent >= 80) {
          setShowAlert(true);

          // Show toast notification for critical levels
          if (usage.usage_percent >= 95 && !sessionStorage.getItem('credits_alert_shown')) {
            toast({
              title: '🚨 ATENȚIE: Credite AI aproape epuizate!',
              description: `Ai folosit ${usage.usage_percent.toFixed(1)}% din credite. Cumpără credite suplimentare pentru a continua.`,
              variant: 'destructive',
              duration: 10000
            });
            sessionStorage.setItem('credits_alert_shown', 'true');
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking credits:', error);
    }
  };

  useEffect(() => {
    checkCredits();

    // Check every 5 minutes
    const interval = setInterval(checkCredits, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showAlert) return null;

  const getAlertVariant = () => {
    if (usagePercent >= 95) return 'destructive';
    if (usagePercent >= 90) return 'default';
    return 'default';
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {usagePercent >= 95 ? '🚨 Credite AI CRITICE' : 
           usagePercent >= 90 ? '⚠️ Credite AI Scăzute' : 
           '📊 Utilizare Credite AI Ridicată'}
        </span>
        <span className="text-sm font-normal">
          {usagePercent.toFixed(1)}% folosit
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          {usagePercent >= 95 ? 
            'Creditele tale AI sunt aproape epuizate! Funcționalitățile premium vor fi oprite automat.' :
            usagePercent >= 90 ?
            'Creditele tale AI se apropie de limită. Recomandăm cumpărarea de credite suplimentare.' :
            'Ai folosit o mare parte din creditele AI. Monitorizează consumul pentru a evita întreruperi.'}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <TrendingDown className="h-4 w-4" />
          <span>Credite rămase: <strong>{(remaining / 100).toFixed(2)} RON</strong></span>
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            size="sm" 
            onClick={() => navigate('/my-ai-costs')}
            variant="default"
          >
            <DollarSign className="mr-1 h-4 w-4" />
            Cumpără Credite
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAlert(false)}
          >
            Am înțeles
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}