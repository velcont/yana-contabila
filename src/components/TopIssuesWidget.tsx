import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, Clock, DollarSign, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  insight_type: string;
  metadata: any;
  created_at: string;
  user_id: string;
  analysis_id: string | null;
  is_read: boolean;
}

export const TopIssuesWidget = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTopIssues();
  }, []);

  const loadTopIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_insights')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setIssues((data || []).map(item => ({
        ...item,
        severity: item.severity as 'critical' | 'warning' | 'info'
      })));
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('chat_insights')
        .update({ is_read: true })
        .eq('id', id);
      
      setIssues(prev => prev.filter(issue => issue.id !== id));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'high_dso':
      case 'slow_inventory':
        return <Clock className="h-5 w-5" />;
      case 'negative_profit':
      case 'negative_ebitda':
      case 'expenses_exceed_revenue':
        return <TrendingDown className="h-5 w-5" />;
      case 'negative_cash_flow':
      case 'casa_limit_exceeded':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader>
          <CardTitle className="text-success flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Totul e în Regulă!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nu există probleme critice detectate în ultimele analize. 
            Continuă să încărci balanțe pentru monitorizare continuă.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Top 3 Probleme Critice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue, idx) => (
          <div
            key={issue.id}
            className="group relative p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                p-2 rounded-full 
                ${issue.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 
                  issue.severity === 'warning' ? 'bg-warning/10 text-warning' : 
                  'bg-primary/10 text-primary'}
              `}>
                {getIcon(issue.insight_type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight break-words overflow-wrap-anywhere">
                    {issue.title}
                  </h4>
                  <Badge 
                    variant={getSeverityColor(issue.severity) as any}
                    className="text-xs shrink-0"
                  >
                    {issue.severity === 'critical' ? 'Critic' : 
                     issue.severity === 'warning' ? 'Atenție' : 'Info'}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere">
                  {issue.description}
                </p>

                {/* Metadata display */}
                {issue.metadata && Object.keys(issue.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Object.entries(issue.metadata).slice(0, 3).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 bg-muted rounded-md font-mono break-words overflow-wrap-anywhere"
                      >
                        {key}: {typeof value === 'number' ? value.toLocaleString('ro-RO') : String(value)}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(issue.created_at).toLocaleDateString('ro-RO')}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(issue.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 text-xs"
                  >
                    Marchează rezolvat
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
