import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const GoogleCalendarConnect = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Verificăm dacă utilizatorul are deja calendar conectat
  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('calendar_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Eroare verificare conexiune calendar:', error);
      }

      setIsConnected(!!data);
    } catch (error) {
      console.error('Eroare verificare conexiune:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Listener pentru mesaje de la popup (când se închide OAuth)
    const messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'google-calendar-connected') {
        toast({
          title: '✅ Google Calendar conectat',
          description: 'Calendarul tău a fost conectat cu succes!',
        });
        checkConnection();
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  const handleConnect = async () => {
    if (!userId) {
      toast({
        title: 'Eroare',
        description: 'Trebuie să fii autentificat pentru a conecta calendarul',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Apelăm edge function pentru a obține URL-ul de autorizare
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { userId },
      });

      if (error) throw error;

      if (!data?.authUrl) {
        throw new Error('URL de autorizare lipsă');
      }

      // Deschidem popup pentru autorizare Google
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

    } catch (error) {
      console.error('Eroare conectare calendar:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut conecta Google Calendar. Încearcă din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('calendar_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: '✅ Deconectat',
        description: 'Google Calendar a fost deconectat cu succes',
      });
    } catch (error) {
      console.error('Eroare deconectare calendar:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut deconecta calendarul. Încearcă din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verificăm starea conexiunii...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Conectează calendarul pentru verificare automată plăți "Închidere Lună"
              </p>
            </div>
          </div>
          {isConnected ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          )}
        </div>

        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button variant="outline" size="sm" disabled>
                ✅ Conectat
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Deconectează'
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Conectează Google Calendar
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Calendarul tău este monitorizat zilnic pentru evenimente "Închidere Lună".
              Vei primi email automat dacă un client nu a plătit.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
