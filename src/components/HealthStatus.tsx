import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HealthCheck {
  check_type: string;
  status: string;
  response_time_ms: number;
  error_message: string | null;
  checked_at: string;
}

const HealthStatus = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Group by check_type and get latest for each
      const latestChecks = data.reduce((acc, check) => {
        if (!acc[check.check_type]) {
          acc[check.check_type] = check;
        }
        return acc;
      }, {} as Record<string, HealthCheck>);

      setHealthChecks(Object.values(latestChecks));
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const runHealthCheck = async () => {
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('health-check');
      await fetchHealthStatus();
    } catch (error) {
      console.error('Error running health check:', error);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchHealthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive',
    };
    
    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Se încarcă starea sistemului...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stare Sistem</CardTitle>
        <Button 
          onClick={runHealthCheck} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Verifică Acum
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nu există verificări recente. Apasă "Verifică Acum" pentru a rula un check.
            </p>
          ) : (
            healthChecks.map((check) => (
              <div 
                key={check.check_type}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium capitalize">
                      {check.check_type.replace('_', ' ')}
                    </p>
                    {check.error_message && (
                      <p className="text-xs text-muted-foreground">
                        {check.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {check.response_time_ms}ms
                  </span>
                  {getStatusBadge(check.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthStatus;
