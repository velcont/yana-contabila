import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ReflectionLog {
  id: string;
  conversation_id: string;
  user_id: string;
  question: string;
  answer_preview: string;
  self_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  what_went_well: string[];
  what_could_improve: string[];
  missing_context: string | null;
  suggested_sources: string[];
  model_used: string;
  tokens_used: number;
  processing_time_ms: number;
  created_at: string;
}

interface DashboardStats {
  totalReflections: number;
  avgScore: number;
  highConfidencePercent: number;
  topIssue: string | null;
  lowScoreCount: number;
}

export function AIDecisionsDashboard() {
  const [reflections, setReflections] = useState<ReflectionLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');

  useEffect(() => {
    loadReflections();
  }, []);

  const loadReflections = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('ai_reflection_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const typedData = (data || []) as ReflectionLog[];
      setReflections(typedData);

      // Calculate stats
      if (typedData.length > 0) {
        const avgScore = typedData.reduce((sum, r) => sum + r.self_score, 0) / typedData.length;
        const highConfidence = typedData.filter(r => r.confidence_level === 'high').length;
        const lowScoreCount = typedData.filter(r => r.self_score <= 5).length;

        // Find most common improvement suggestion
        const issueCount: Record<string, number> = {};
        typedData.forEach(r => {
          r.what_could_improve?.forEach(issue => {
            issueCount[issue] = (issueCount[issue] || 0) + 1;
          });
        });
        const topIssue = Object.entries(issueCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        setStats({
          totalReflections: typedData.length,
          avgScore: Math.round(avgScore * 10) / 10,
          highConfidencePercent: Math.round((highConfidence / typedData.length) * 100),
          topIssue,
          lowScoreCount,
        });
      }
    } catch (error) {
      console.error('Error loading reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReflections = reflections.filter(r => {
    if (scoreFilter !== 'all') {
      if (scoreFilter === 'low' && r.self_score > 5) return false;
      if (scoreFilter === 'medium' && (r.self_score <= 5 || r.self_score > 7)) return false;
      if (scoreFilter === 'high' && r.self_score <= 7) return false;
    }
    if (confidenceFilter !== 'all' && r.confidence_level !== confidenceFilter) {
      return false;
    }
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="default" className="bg-green-500">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="destructive">Low</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reflecții</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              {stats?.totalReflections || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scor Mediu</CardDescription>
            <CardTitle className={`text-3xl flex items-center gap-2 ${getScoreColor(stats?.avgScore || 0)}`}>
              {(stats?.avgScore || 0) >= 7 ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
              {stats?.avgScore || 0}/10
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Încredere Ridicată</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              {stats?.highConfidencePercent || 0}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scoruri Slabe (≤5)</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              {stats?.lowScoreCount || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Top Issue Alert */}
      {stats?.topIssue && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Problemă Frecventă Detectată
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {stats.topIssue}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Filters and Refresh */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Scor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate scorurile</SelectItem>
                <SelectItem value="high">Ridicat (8-10)</SelectItem>
                <SelectItem value="medium">Mediu (6-7)</SelectItem>
                <SelectItem value="low">Scăzut (1-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Încredere" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={loadReflections} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Reflections List */}
      <Card>
        <CardHeader>
          <CardTitle>Jurnal Auto-Evaluări AI</CardTitle>
          <CardDescription>
            {filteredReflections.length} înregistrări afișate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredReflections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există încă reflecții AI.</p>
                  <p className="text-sm">Acestea vor apărea automat după conversațiile cu YANA.</p>
                </div>
              ) : (
                filteredReflections.map((reflection) => (
                  <Collapsible
                    key={reflection.id}
                    open={expandedId === reflection.id}
                    onOpenChange={(open) => setExpandedId(open ? reflection.id : null)}
                  >
                    <Card className="border">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedId === reflection.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Badge variant={getScoreBadgeVariant(reflection.self_score)}>
                                {reflection.self_score}/10
                              </Badge>
                              {getConfidenceBadge(reflection.confidence_level)}
                              <span className="text-sm truncate max-w-[300px] lg:max-w-[500px]">
                                {reflection.question}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {format(new Date(reflection.created_at), 'dd MMM, HH:mm', { locale: ro })}
                            </span>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {/* Answer Preview */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Răspuns (preview):</p>
                            <p className="text-sm bg-muted p-2 rounded">
                              {reflection.answer_preview}...
                            </p>
                          </div>

                          {/* What went well */}
                          {reflection.what_went_well?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Ce a mers bine:
                              </p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {reflection.what_went_well.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* What could improve */}
                          {reflection.what_could_improve?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                De îmbunătățit:
                              </p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {reflection.what_could_improve.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Missing context */}
                          {reflection.missing_context && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Context lipsă:</p>
                              <p className="text-sm italic">{reflection.missing_context}</p>
                            </div>
                          )}

                          {/* Suggested sources */}
                          {reflection.suggested_sources?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Surse recomandate:</p>
                              <div className="flex flex-wrap gap-1">
                                {reflection.suggested_sources.map((source, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span>Model: {reflection.model_used}</span>
                            <span>Tokens: {reflection.tokens_used}</span>
                            <span>Timp: {reflection.processing_time_ms}ms</span>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIDecisionsDashboard;
