import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Clock, TrendingUp, Zap } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

const SLOW_THRESHOLD_MS = 5000; // 5 secunde
const AUTO_REFRESH_INTERVAL = 60000; // 60 secunde

interface RefreshEvent {
  id: string;
  created_at: string;
  user_id: string | null;
  event_data: {
    from_version: string | null;
    to_version: string;
    trigger: 'version_mismatch' | 'banner_click' | 'banner_timeout' | 'manual';
    duration_ms: number;
    user_agent?: string;
  };
}

interface Stats {
  total: number;
  avgDuration: number;
  slowCount: number;
  slowPercent: number;
}

export const VersionRefreshMonitor = () => {
  const [events, setEvents] = useState<RefreshEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, avgDuration: 0, slowCount: 0, slowPercent: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('analytics_events')
        .select('id, event_data, created_at, user_id')
        .eq('event_name', 'version_refresh')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching version refresh events:', error);
        return;
      }

      const typedEvents = (data || []) as RefreshEvent[];
      setEvents(typedEvents);

      // Calculate stats
      if (typedEvents.length > 0) {
        const durations = typedEvents
          .map(e => e.event_data?.duration_ms || 0)
          .filter(d => d > 0);
        
        const avgDuration = durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0;
        
        const slowCount = durations.filter(d => d > SLOW_THRESHOLD_MS).length;
        const slowPercent = durations.length > 0 
          ? (slowCount / durations.length) * 100 
          : 0;

        setStats({
          total: typedEvents.length,
          avgDuration,
          slowCount,
          slowPercent
        });
      } else {
        setStats({ total: 0, avgDuration: 0, slowCount: 0, slowPercent: 0 });
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      version_mismatch: 'Auto (mismatch)',
      banner_click: 'Click banner',
      banner_timeout: 'Timeout banner',
      manual: 'Manual'
    };
    return labels[trigger] || trigger;
  };

  const hasSlowRefreshes = stats.slowCount > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ⏱️ Monitoring Version Refresh
            </CardTitle>
            <CardDescription>
              Performanța refresh-urilor de versiune în ultimele 24h
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Durată medie</span>
                </div>
                <p className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</p>
              </CardContent>
            </Card>
            
            <Card className={`${hasSlowRefreshes ? 'bg-destructive/10 border-destructive/50' : 'bg-muted/50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Lente (&gt;5s)</span>
                </div>
                <p className={`text-2xl font-bold ${hasSlowRefreshes ? 'text-destructive' : ''}`}>
                  {stats.slowCount}
                </p>
              </CardContent>
            </Card>
            
            <Card className={`${hasSlowRefreshes ? 'bg-destructive/10 border-destructive/50' : 'bg-muted/50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">% Lente</span>
                </div>
                <p className={`text-2xl font-bold ${hasSlowRefreshes ? 'text-destructive' : ''}`}>
                  {stats.slowPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alert for slow refreshes */}
          {hasSlowRefreshes && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>⚠️ ALERTĂ: Refresh-uri lente detectate</AlertTitle>
              <AlertDescription>
                {stats.slowCount} refresh-uri au durat mai mult de 5 secunde ({stats.slowPercent.toFixed(1)}% din total).
                Verifică performanța rețelei și cache-ului utilizatorilor afectați.
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Events Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Ora</TableHead>
                  <TableHead>Durată</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Versiune</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.slice(0, 10).map((event) => {
                  const duration = event.event_data?.duration_ms || 0;
                  const isSlow = duration > SLOW_THRESHOLD_MS;
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {format(new Date(event.created_at), "dd MMM HH:mm:ss", { locale: ro })}
                      </TableCell>
                      <TableCell className={isSlow ? 'text-destructive font-bold' : ''}>
                        {formatDuration(duration)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getTriggerLabel(event.event_data?.trigger || 'unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.event_data?.from_version || '?'} → {event.event_data?.to_version || '?'}
                      </TableCell>
                      <TableCell>
                        {isSlow ? (
                          <Badge variant="destructive">⚠️ LENT</Badge>
                        ) : (
                          <Badge variant="default">✓ OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Niciun refresh de versiune în ultimele 24h
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-right">
            Ultima actualizare: {format(lastRefresh, "HH:mm:ss", { locale: ro })} • Auto-refresh la 60s
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VersionRefreshMonitor;
