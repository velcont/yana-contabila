import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare,
  RefreshCw,
  Lightbulb,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";

interface KnowledgeGap {
  id: string;
  question_pattern: string;
  example_questions: string[];
  frequency: number;
  category: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface EffectiveResponse {
  id: string;
  response_pattern: string;
  context_type: string;
  times_used: number;
  positive_reactions: number;
  negative_reactions: number;
  effectiveness_score: number;
  key_phrases: string[];
  approach_type: string;
  example_question: string;
}

interface TrendingTopic {
  id: string;
  topic: string;
  topic_category: string;
  mention_count: number;
  unique_users: number;
  is_trending: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

interface LearningStats {
  totalLearnings: number;
  knowledgeGapsCount: number;
  effectiveResponsesCount: number;
  trendingTopicsCount: number;
  avgEffectiveness: number;
}

export default function YanaLearningDashboard() {
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [effectiveResponses, setEffectiveResponses] = useState<EffectiveResponse[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch knowledge gaps
      const { data: gaps, error: gapsError } = await supabase
        .from('yana_knowledge_gaps')
        .select('*')
        .order('frequency', { ascending: false })
        .limit(20);

      if (gapsError) throw gapsError;
      setKnowledgeGaps((gaps as KnowledgeGap[]) || []);

      // Fetch effective responses
      const { data: responses, error: responsesError } = await supabase
        .from('yana_effective_responses')
        .select('*')
        .order('effectiveness_score', { ascending: false })
        .limit(20);

      if (responsesError) throw responsesError;
      setEffectiveResponses((responses as EffectiveResponse[]) || []);

      // Fetch trending topics
      const { data: topics, error: topicsError } = await supabase
        .from('yana_trending_topics')
        .select('*')
        .order('mention_count', { ascending: false })
        .limit(20);

      if (topicsError) throw topicsError;
      setTrendingTopics((topics as TrendingTopic[]) || []);

      // Calculate stats
      const avgEffectiveness = (responses as EffectiveResponse[])?.length > 0
        ? (responses as EffectiveResponse[]).reduce((acc, r) => acc + (r.effectiveness_score || 0), 0) / (responses as EffectiveResponse[]).length
        : 0;

      setStats({
        totalLearnings: ((gaps as KnowledgeGap[])?.length || 0) + ((responses as EffectiveResponse[])?.length || 0) + ((topics as TrendingTopic[])?.length || 0),
        knowledgeGapsCount: (gaps as KnowledgeGap[])?.filter(g => !g.resolved).length || 0,
        effectiveResponsesCount: (responses as EffectiveResponse[])?.length || 0,
        trendingTopicsCount: (topics as TrendingTopic[])?.filter(t => t.is_trending).length || 0,
        avgEffectiveness: avgEffectiveness,
      });

    } catch (error) {
      console.error('Error fetching learning data:', error);
      toast.error('Eroare la încărcarea datelor de învățare');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fiscal': return '💰';
      case 'strategic': return '🎯';
      case 'operational': return '⚙️';
      case 'emotional': return '💚';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            YANA Learning Dashboard
          </h2>
          <p className="text-muted-foreground">
            Sistemul de auto-învățare în timp real
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Reîncarcă
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Learnings</p>
                  <p className="text-2xl font-bold">{stats.totalLearnings}</p>
                </div>
                <Brain className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Knowledge Gaps</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.knowledgeGapsCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Răspunsuri Efective</p>
                  <p className="text-2xl font-bold text-green-500">{stats.effectiveResponsesCount}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Effectiveness</p>
                  <p className="text-2xl font-bold">{(stats.avgEffectiveness * 100).toFixed(0)}%</p>
                </div>
                <Target className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="gaps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Knowledge Gaps
          </TabsTrigger>
          <TabsTrigger value="effective" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Ce Funcționează
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending Topics
          </TabsTrigger>
        </TabsList>

        {/* Knowledge Gaps Tab */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Întrebări la care YANA nu știe să răspundă bine</CardTitle>
              <CardDescription>
                Detectate automat din feedback negativ sau semnale de confuzie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {knowledgeGaps.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nicio problemă detectată încă. YANA învață în timp real!
                    </p>
                  ) : (
                    knowledgeGaps.map((gap) => (
                      <Card key={gap.id} className={gap.resolved ? 'opacity-50' : ''}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{getCategoryIcon(gap.category)}</span>
                                <Badge variant={getSeverityColor(gap.severity)}>
                                  {gap.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {gap.frequency}x întrebat
                                </Badge>
                                {gap.resolved && (
                                  <Badge variant="default" className="bg-green-500">
                                    Rezolvat
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{gap.question_pattern}</p>
                              {gap.example_questions && gap.example_questions.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  Ex: "{gap.example_questions[0]}"
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Effective Responses Tab */}
        <TabsContent value="effective">
          <Card>
            <CardHeader>
              <CardTitle>Răspunsuri care au funcționat cel mai bine</CardTitle>
              <CardDescription>
                Pattern-uri și abordări cu feedback pozitiv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {effectiveResponses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      YANA încă colectează feedback. Datele vor apărea în curând!
                    </p>
                  ) : (
                    effectiveResponses.map((response) => (
                      <Card key={response.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{getCategoryIcon(response.context_type)}</span>
                                <Badge variant="secondary">
                                  {response.approach_type || 'general'}
                                </Badge>
                                <Badge variant="outline">
                                  {response.times_used}x folosit
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 mb-2">
                                <span className="text-sm text-muted-foreground">
                                  Eficiență:
                                </span>
                                <Progress 
                                  value={(response.effectiveness_score || 0) * 100} 
                                  className="w-24 h-2"
                                />
                                <span className="text-sm font-medium">
                                  {((response.effectiveness_score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-green-500">
                                  👍 {response.positive_reactions}
                                </span>
                                <span className="text-red-500">
                                  👎 {response.negative_reactions}
                                </span>
                              </div>

                              {response.key_phrases && response.key_phrases.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {response.key_phrases.map((phrase, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      "{phrase}"
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {response.example_question && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  Context: "{response.example_question}"
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trending Topics Tab */}
        <TabsContent value="trending">
          <Card>
            <CardHeader>
              <CardTitle>Subiecte în trend între utilizatori</CardTitle>
              <CardDescription>
                Ce întreabă utilizatorii cel mai des
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {trendingTopics.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Niciun trend detectat încă. YANA analizează pattern-urile!
                    </p>
                  ) : (
                    trendingTopics.map((topic) => (
                      <Card key={topic.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getCategoryIcon(topic.topic_category)}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium capitalize">{topic.topic}</p>
                                  {topic.is_trending && (
                                    <Badge className="bg-orange-500">
                                      🔥 Trending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {topic.mention_count} mențiuni • {topic.unique_users} utilizatori unici
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Prima dată: {format(new Date(topic.first_seen_at), 'd MMM', { locale: ro })}</p>
                              {topic.last_seen_at && (
                                <p>Ultima: {format(new Date(topic.last_seen_at), 'd MMM', { locale: ro })}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
