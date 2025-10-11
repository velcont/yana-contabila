import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Analysis {
  id: string;
  company_name: string | null;
  file_name: string;
  created_at: string;
  metadata: any;
}

interface RecentAnalysesWidgetProps {
  onViewAll: () => void;
}

export const RecentAnalysesWidget = ({ onViewAll }: RecentAnalysesWidgetProps) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentAnalyses();

    // Listen for new analyses
    const handler = () => loadRecentAnalyses();
    window.addEventListener('analysis:created', handler);
    return () => window.removeEventListener('analysis:created', handler);
  }, []);

  const loadRecentAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('analyses')
        .select('id, company_name, file_name, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error loading recent analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIndicatorValue = (analysis: Analysis) => {
    if (analysis.metadata?.ratiiFinanciare?.lichiditateCurenta) {
      return `LC: ${analysis.metadata.ratiiFinanciare.lichiditateCurenta}`;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-primary/20 animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary animate-pulse" />
            Analize Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="shadow-lg border-primary/20 animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Analize Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nicio analiză încă</p>
            <p className="text-xs mt-1">Încarcă prima balanță pentru a începe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-primary/20 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Analize Recente
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs hover-scale"
          >
            Vezi toate <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {analyses.map((analysis, index) => (
            <div
              key={analysis.id}
              className="group p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer hover-scale"
              onClick={onViewAll}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {analysis.company_name || 'Fără nume'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: ro })}
                    </p>
                  </div>
                  {getIndicatorValue(analysis) && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">
                        {getIndicatorValue(analysis)}
                      </span>
                    </div>
                  )}
                </div>
                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
