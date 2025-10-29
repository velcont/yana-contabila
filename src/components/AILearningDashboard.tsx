import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, MessageSquare, Star, Lightbulb, Target, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AILearningDashboardProps {
  companyId?: string;
}

interface Stats {
  totalConversations: number;
  helpfulConversations: number;
  learnedPatterns: number;
  avgRating: number;
  improvementRate: number;
  recentHelpfulRate: number;
}

export function AILearningDashboard({ companyId }: AILearningDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    helpfulConversations: 0,
    learnedPatterns: 0,
    avgRating: 0,
    improvementRate: 0,
    recentHelpfulRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [topPatterns, setTopPatterns] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
    loadTopPatterns();
  }, [companyId]);

  const loadStats = async () => {
    try {
      console.log('📊 Loading AI learning stats...');
      setLoading(true);

      // Obține user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Query pentru conversații (filtrare după company dacă există)
      let conversationsQuery = supabase
        .from('ai_conversations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (companyId) {
        conversationsQuery = conversationsQuery.eq('company_id', companyId);
      }

      const { count: totalCount } = await conversationsQuery;

      // Conversații helpful
      let helpfulQuery = supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('was_helpful', true);

      if (companyId) {
        helpfulQuery = helpfulQuery.eq('company_id', companyId);
      }

      const { count: helpfulCount } = await helpfulQuery;

      // Pattern-uri învățate
      let patternsQuery = supabase
        .from('ai_learned_patterns')
        .select('*', { count: 'exact', head: true });

      if (companyId) {
        patternsQuery = patternsQuery.eq('applies_to_company_id', companyId);
      }

      const { count: patternsCount } = await patternsQuery;

      // Rating mediu
      let ratingsQuery = supabase
        .from('ai_conversations')
        .select('rating')
        .eq('user_id', user.id)
        .not('rating', 'is', null);

      if (companyId) {
        ratingsQuery = ratingsQuery.eq('company_id', companyId);
      }

      const { data: ratings } = await ratingsQuery;

      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : 0;

      // Rata de îmbunătățire (% helpful în ultimele 30 zile)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      let recentQuery = supabase
        .from('ai_conversations')
        .select('was_helpful')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      if (companyId) {
        recentQuery = recentQuery.eq('company_id', companyId);
      }

      const { data: recentConversations } = await recentQuery;

      const recentHelpfulRate = recentConversations && recentConversations.length > 0
        ? (recentConversations.filter(c => c.was_helpful).length / recentConversations.length) * 100
        : 0;

      setStats({
        totalConversations: totalCount || 0,
        helpfulConversations: helpfulCount || 0,
        learnedPatterns: patternsCount || 0,
        avgRating: avgRating,
        improvementRate: recentHelpfulRate,
        recentHelpfulRate: recentHelpfulRate
      });

      console.log('✅ Stats loaded successfully');

    } catch (error) {
      console.error('❌ Error loading stats:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca statisticile de învățare AI.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTopPatterns = async () => {
    try {
      let query = supabase
        .from('ai_learned_patterns')
        .select('*')
        .order('confidence_score', { ascending: false })
        .order('times_validated', { ascending: false })
        .limit(5);

      if (companyId) {
        query = query.eq('applies_to_company_id', companyId);
      }

      const { data } = await query;
      setTopPatterns(data || []);
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const helpfulPercentage = stats.totalConversations > 0
    ? Math.round((stats.helpfulConversations / stats.totalConversations) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header cu explicație */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            🧠 Sistem de Învățare AI - YANA
          </CardTitle>
          <CardDescription>
            YANA învață din fiecare conversație pentru a-ți oferi răspunsuri din ce în ce mai personalizate și precise
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Metrici principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Conversații</p>
                <h3 className="text-3xl font-bold mt-2">{stats.totalConversations}</h3>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Răspunsuri Utile</p>
                <h3 className="text-3xl font-bold mt-2 flex items-center gap-2">
                  {stats.helpfulConversations}
                  <span className="text-sm text-muted-foreground">
                    ({helpfulPercentage}%)
                  </span>
                </h3>
                <Progress value={helpfulPercentage} className="mt-2 h-2" />
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pattern-uri Învățate</p>
                <h3 className="text-3xl font-bold mt-2">{stats.learnedPatterns}</h3>
                <p className="text-xs text-muted-foreground mt-1">Detectare automată</p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rating Mediu</p>
                <h3 className="text-3xl font-bold mt-2 flex items-center gap-1">
                  {stats.avgRating.toFixed(1)}
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.recentHelpfulRate.toFixed(0)}% ultimele 30 zile
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cum învață YANA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Cum Învață YANA
          </CardTitle>
          <CardDescription>
            Procesul de învățare automată în 3 pași simpli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                  1
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Salvare Conversații</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Fiecare conversație este salvată automat pentru învățare viitoare. Feedback-ul tău ajută AI-ul să înțeleagă ce răspunsuri sunt utile.
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full font-bold">
                  2
                </div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">Analiză Pattern-uri</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                AI detectează automat întrebări frecvente și pattern-uri în răspunsurile care au fost utile pentru tine.
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold">
                  3
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Personalizare</h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Răspunsurile devin din ce în ce mai personalizate pentru firma ta, bazate pe conversațiile anterioare.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Pattern-uri */}
      {topPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Pattern-uri Detectate
            </CardTitle>
            <CardDescription>
              Cele mai frecvente tipuri de întrebări identificate automat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPatterns.map((pattern, index) => (
                <div 
                  key={pattern.id} 
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-secondary"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{pattern.pattern_description}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Validat de {pattern.times_validated} ori
                      {pattern.example_questions?.[0] && (
                        <span className="ml-2">• Ex: "{pattern.example_questions[0].substring(0, 50)}..."</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={pattern.confidence_score * 100} 
                      className="w-20 h-2" 
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      {(pattern.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to action */}
      {stats.totalConversations === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Începe să folosești YANA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pune prima întrebare pentru ca AI-ul să înceapă să învețe preferințele tale
            </p>
            <p className="text-xs text-muted-foreground">
              💡 Cu fiecare conversație, YANA devine mai inteligent și mai personalizat pentru firma ta
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
