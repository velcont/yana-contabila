import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, Sparkles, AlertTriangle, TrendingUp, Users, Lightbulb, RefreshCw, Heart, Zap } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface UserJourney {
  id: string;
  user_id: string;
  primary_goal: string | null;
  goal_confidence: number;
  uncertainty_level: number;
  knowledge_gaps: unknown;
  emotional_state: string;
  total_interactions: number;
  last_interaction_at: string;
  created_at: string;
}

interface Experiment {
  id: string;
  user_id: string;
  experiment_type: string;
  hypothesis: string | null;
  action_taken: string;
  outcome: string;
  user_reaction: string | null;
  emotional_resonance: number | null;
  learning: string | null;
  created_at: string;
}

interface Surprise {
  id: string;
  user_id: string;
  previous_belief: string;
  new_information: string;
  contradiction_type: string;
  surprise_intensity: number;
  resolution_status: string;
  created_at: string;
}

interface CrossInsight {
  id: string;
  pattern_type: string;
  pattern_description: string;
  occurrence_count: number;
  success_rate: number;
  recommended_response: string | null;
  emotional_approach: string | null;
  last_updated: string;
}

export function ConsciousnessDashboard() {
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [insights, setInsights] = useState<CrossInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [journeysRes, experimentsRes, surprisesRes, insightsRes] = await Promise.all([
        supabase
          .from('user_journey')
          .select('*')
          .order('last_interaction_at', { ascending: false })
          .limit(50),
        supabase
          .from('ai_experiments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('ai_surprises')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('cross_user_insights')
          .select('*')
          .order('success_rate', { ascending: false })
          .limit(20)
      ]);

      if (journeysRes.data) setJourneys(journeysRes.data);
      if (experimentsRes.data) setExperiments(experimentsRes.data);
      if (surprisesRes.data) setSurprises(surprisesRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error loading consciousness data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const triggerCrossLearner = async () => {
    try {
      const { error } = await supabase.functions.invoke('cross-learner');
      if (error) throw error;
      handleRefresh();
    } catch (error) {
      console.error('Error triggering cross-learner:', error);
    }
  };

  // Stats
  const totalJourneys = journeys.length;
  const activeJourneys = journeys.filter(j => {
    const daysSince = Math.ceil((Date.now() - new Date(j.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  }).length;
  
  const successfulExperiments = experiments.filter(e => e.outcome === 'success').length;
  const experimentSuccessRate = experiments.length > 0 
    ? Math.round((successfulExperiments / experiments.filter(e => e.outcome !== 'pending').length) * 100) 
    : 0;
  
  const pendingSurprises = surprises.filter(s => s.resolution_status === 'pending').length;
  const avgUncertainty = journeys.length > 0 
    ? Math.round(journeys.reduce((sum, j) => sum + j.uncertainty_level, 0) / journeys.length * 10) / 10
    : 0;

  const getEmotionColor = (state: string) => {
    const colors: Record<string, string> = {
      'neutral': 'bg-gray-500',
      'stressed': 'bg-red-500',
      'worried': 'bg-orange-500',
      'hopeful': 'bg-blue-500',
      'confident': 'bg-green-500',
      'excited': 'bg-purple-500'
    };
    return colors[state] || 'bg-gray-500';
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      'success': 'bg-green-500/20 text-green-700 border-green-500/30',
      'partial': 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      'failed': 'bg-red-500/20 text-red-700 border-red-500/30',
      'pending': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      'unexpected': 'bg-purple-500/20 text-purple-700 border-purple-500/30'
    };
    return colors[outcome] || 'bg-gray-500/20';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Conștiința YANA
          </h2>
          <p className="text-muted-foreground">
            Monitorizare proto-conștiință: emoții, curiozitate, învățare
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={triggerCrossLearner}>
            <Zap className="h-4 w-4 mr-2" />
            Run Cross-Learner
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilizatori Urmăriți
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJourneys}</div>
            <p className="text-xs text-muted-foreground">
              {activeJourneys} activi în ultimele 7 zile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Experimente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experiments.length}</div>
            <p className="text-xs text-muted-foreground">
              {experimentSuccessRate}% success rate
            </p>
            <Progress value={experimentSuccessRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Surprize Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSurprises}</div>
            <p className="text-xs text-muted-foreground">
              {surprises.length} total detectate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Incertitudine Medie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUncertainty}/10</div>
            <p className="text-xs text-muted-foreground">
              {insights.length} insights cross-users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="journeys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journeys">
            <Heart className="h-4 w-4 mr-2" />
            User Journeys
          </TabsTrigger>
          <TabsTrigger value="experiments">
            <Sparkles className="h-4 w-4 mr-2" />
            Experimente
          </TabsTrigger>
          <TabsTrigger value="surprises">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Surprize
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Cross-Insights
          </TabsTrigger>
        </TabsList>

        {/* User Journeys Tab */}
        <TabsContent value="journeys">
          <Card>
            <CardHeader>
              <CardTitle>User Journeys Activi</CardTitle>
              <CardDescription>
                Obiective, stări emoționale și lacune de cunoaștere per utilizator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {journeys.map((journey) => (
                    <Card key={journey.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">
                            {journey.user_id.substring(0, 8)}...
                          </p>
                          <p className="font-medium">
                            {journey.primary_goal || 'Obiectiv nedetectat încă'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getEmotionColor(journey.emotional_state)}>
                            {journey.emotional_state}
                          </Badge>
                          <Badge variant="secondary">
                            {journey.total_interactions} interacțiuni
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Încredere obiectiv:</p>
                          <Progress value={journey.goal_confidence * 100} className="h-2 mt-1" />
                          <p className="text-xs mt-1">{Math.round(journey.goal_confidence * 100)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Incertitudine:</p>
                          <Progress value={journey.uncertainty_level * 10} className="h-2 mt-1" />
                          <p className="text-xs mt-1">{journey.uncertainty_level}/10</p>
                        </div>
                      </div>

                      {journey.knowledge_gaps && Array.isArray(journey.knowledge_gaps) && journey.knowledge_gaps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Lacune cunoaștere:</p>
                          <div className="flex flex-wrap gap-1">
                            {(journey.knowledge_gaps as string[]).slice(0, 5).map((gap, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {gap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        Ultima interacțiune: {format(new Date(journey.last_interaction_at), 'dd MMM yyyy HH:mm', { locale: ro })}
                      </p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiments Tab */}
        <TabsContent value="experiments">
          <Card>
            <CardHeader>
              <CardTitle>Experimente YANA</CardTitle>
              <CardDescription>
                Ce a încercat YANA și ce a învățat din fiecare experiment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {experiments.map((exp) => (
                    <Card key={exp.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{exp.experiment_type}</Badge>
                        <Badge className={getOutcomeColor(exp.outcome)}>
                          {exp.outcome}
                        </Badge>
                      </div>
                      
                      <p className="font-medium text-sm mb-1">{exp.action_taken}</p>
                      
                      {exp.hypothesis && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Ipoteză:</span> {exp.hypothesis}
                        </p>
                      )}

                      {exp.learning && (
                        <p className="text-xs bg-muted p-2 rounded mt-2">
                          <span className="font-medium">📚 Învățătură:</span> {exp.learning}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(exp.created_at), 'dd MMM HH:mm', { locale: ro })}
                        </span>
                        {exp.emotional_resonance && (
                          <span>Rezonanță emoțională: {exp.emotional_resonance}/10</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surprises Tab */}
        <TabsContent value="surprises">
          <Card>
            <CardHeader>
              <CardTitle>Contradicții & Surprize Detectate</CardTitle>
              <CardDescription>
                Informații noi care au contrazis presupunerile YANA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {surprises.map((surprise) => (
                    <Card key={surprise.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{surprise.contradiction_type}</Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant={surprise.resolution_status === 'pending' ? 'destructive' : 'secondary'}>
                            {surprise.resolution_status}
                          </Badge>
                          <Badge variant="outline">
                            Intensitate: {surprise.surprise_intensity}/10
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                            ❌ Ce credeam:
                          </p>
                          <p className="text-xs">{surprise.previous_belief}</p>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                            ✅ Ce am aflat:
                          </p>
                          <p className="text-xs">{surprise.new_information}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">
                        {format(new Date(surprise.created_at), 'dd MMM yyyy HH:mm', { locale: ro })}
                      </p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Cross-User Insights</CardTitle>
              <CardDescription>
                Pattern-uri învățate din toate conversațiile (anonimizat)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{insight.pattern_type}</Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {insight.occurrence_count}x folosit
                          </Badge>
                          <Badge className={insight.success_rate > 0.7 ? 'bg-green-500' : insight.success_rate > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}>
                            {Math.round(insight.success_rate * 100)}% succes
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="font-medium text-sm mb-2">{insight.pattern_description}</p>
                      
                      {insight.recommended_response && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm mb-2">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                            💡 Răspuns recomandat:
                          </p>
                          <p className="text-xs">{insight.recommended_response}</p>
                        </div>
                      )}

                      {insight.emotional_approach && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Ton emoțional:</span> {insight.emotional_approach}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Actualizat: {format(new Date(insight.last_updated), 'dd MMM yyyy', { locale: ro })}
                      </p>
                    </Card>
                  ))}

                  {insights.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Încă nu există insights cross-users.</p>
                      <p className="text-sm">Rulează Cross-Learner pentru a genera insights din experimente.</p>
                    </div>
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

export default ConsciousnessDashboard;
