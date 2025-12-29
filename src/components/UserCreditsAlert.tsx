import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserCreditsAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [usagePercent, setUsagePercent] = useState(0);
  const [hasEverUsedCredits, setHasEverUsedCredits] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has ever used credits
      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const hasUsed = (count || 0) > 0;
      setHasEverUsedCredits(hasUsed);

      // Nu afișa alerte pentru useri care nu au folosit niciodată credite
      if (!hasUsed) {
        setShowAlert(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_monthly_ai_usage', {
        p_user_id: user.id,
        p_month_year: new Date().toISOString().slice(0, 7)
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const usage = data[0];
        setUsagePercent(usage.usage_percent);

        // Show alert if usage is above 80%
        if (usage.usage_percent >= 80) {
          setShowAlert(true);

          // Show toast notification for critical levels - cu mesaj orientat pe valoare
          if (usage.usage_percent >= 95 && !sessionStorage.getItem('credits_alert_shown')) {
            toast({
              title: '🎯 Yana a identificat oportunități pentru tine!',
              description: 'Pentru a continua analiza și a explora noi scenarii, alege un plan care ți se potrivește.',
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

  if (!showAlert || !hasEverUsedCredits) return null;

  // Mesaje orientate pe valoare, nu pe tehnic
  const getMessage = () => {
    if (usagePercent >= 95) {
      return {
        title: '🎉 Yana a identificat primele oportunități!',
        description: 'Ai descoperit deja insight-uri valoroase. Pentru a continua conversația și a obține strategii complete, alege un plan.',
        buttonText: 'Continuă cu Yana Premium'
      };
    }
    if (usagePercent >= 90) {
      return {
        title: '💡 Progresezi excelent cu Yana!',
        description: 'Ai explorat multe scenarii. Pentru acces nelimitat la strategii și analize, upgrade-ează planul.',
        buttonText: 'Upgrade plan'
      };
    }
    return {
      title: '📊 Ești pe drumul cel bun!',
      description: 'Ai folosit o bună parte din sesiunile disponibile. Continuă progresul cu un plan extins.',
      buttonText: 'Vezi opțiuni'
    };
  };

  const { title, description, buttonText } = getMessage();

  return (
    <Alert className="mb-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span>{title}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowAlert(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-muted-foreground">{description}</p>
        <Button 
          size="sm" 
          onClick={() => navigate('/pricing')}
          className="gap-2"
        >
          {buttonText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
