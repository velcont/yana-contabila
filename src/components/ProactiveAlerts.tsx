import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingDown, TrendingUp, Info, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  insight_type: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

export const ProactiveAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAlerts((data || []) as Alert[]);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chat_insights')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === id ? { ...a, is_read: true } : a
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const toggleEmailNotifications = async () => {
    // TODO: Salvează preferința în DB
    setEmailNotifications(!emailNotifications);
    toast({
      title: emailNotifications ? 'Notificări email dezactivate' : 'Notificări email activate',
      description: emailNotifications 
        ? 'Nu vei mai primi email-uri săptămânale cu alerte.' 
        : 'Vei primi email-uri săptămânale cu alerte importante.',
    });
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <TrendingDown className="h-5 w-5 text-warning" />;
      case 'info':
        return <Info className="h-5 w-5 text-primary" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
  };

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerte Proactive</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Alerte Proactive
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} noi
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Probleme detectate automat în analizele tale
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleEmailNotifications}
          className="gap-2"
        >
          {emailNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {emailNotifications ? 'Email ON' : 'Email OFF'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nu există alerte în acest moment. Situația financiară este stabilă! 🎉
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                alert.is_read 
                  ? 'bg-muted/30 border-border' 
                  : 'bg-card border-primary/40 shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(alert.severity)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <Badge variant={getBadgeVariant(alert.severity)}>
                    {alert.severity === 'critical' ? 'CRITIC' : 
                     alert.severity === 'warning' ? 'ATENȚIE' : 'INFO'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {!alert.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                      className="h-7 text-xs"
                    >
                      Marcare citit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};