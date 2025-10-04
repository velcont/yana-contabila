import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatternStats {
  question_pattern: string;
  question_category: string;
  frequency: number;
  avg_response_time: number;
}

interface CategoryStats {
  category: string;
  count: number;
}

interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Analytics() {
  const [patterns, setPatterns] = useState<PatternStats[]>([]);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [feedback, setFeedback] = useState<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    positiveRate: 0
  });
  const [totalConversations, setTotalConversations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingRole && !isAdmin) {
      toast({
        title: 'Acces Restricționat',
        description: 'Nu ai permisiuni de admin pentru a accesa această pagină.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [isAdmin, isLoadingRole, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    try {
      // Încarcă pattern-uri
      const { data: patternsData } = await supabase
        .from('chat_patterns')
        .select('*')
        .order('frequency', { ascending: false })
        .limit(10);

      if (patternsData) {
        setPatterns(patternsData);

        // Calculează categorii din pattern-uri
        const categoryMap = new Map<string, number>();
        patternsData.forEach(pattern => {
          const current = categoryMap.get(pattern.question_category) || 0;
          categoryMap.set(pattern.question_category, current + pattern.frequency);
        });

        const categoriesArray = Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count
        })).sort((a, b) => b.count - a.count);

        setCategories(categoriesArray);
      }

      // Încarcă feedback statistics
      const { data: feedbackData } = await supabase
        .from('chat_feedback')
        .select('rating');

      if (feedbackData) {
        const positive = feedbackData.filter(f => f.rating > 0).length;
        const negative = feedbackData.filter(f => f.rating < 0).length;
        const total = feedbackData.length;
        
        setFeedback({
          total,
          positive,
          negative,
          positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0
        });
      }

      // Contorizează conversații unice
      const { data: conversationsData } = await supabase
        .from('conversation_history')
        .select('conversation_id');

      if (conversationsData) {
        const uniqueConversations = new Set(conversationsData.map(c => c.conversation_id));
        setTotalConversations(uniqueConversations.size);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca statisticile.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingRole || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Se încarcă statisticile...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Pregătire date pentru grafic frecvență
  const topPatternsData = patterns.slice(0, 8).map(p => ({
    name: p.question_pattern.length > 30 ? p.question_pattern.substring(0, 30) + '...' : p.question_pattern,
    frecvență: p.frequency,
    'timp mediu (ms)': Math.round(p.avg_response_time)
  }));

  // Pregătire date pentru pie chart categorii
  const categoriesData = categories.map(c => ({
    name: c.category,
    value: c.count
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Dashboard Analytics AI
          </h1>
          <p className="text-muted-foreground mt-2">
            Statistici despre comportamentul utilizatorilor și performanța AI-ului
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="h-4 w-4 mr-2" />
          Admin View
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversații
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              Conversații unice cu AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pattern-uri Învățate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">
              Tipuri de întrebări detectate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Feedback Pozitiv
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{feedback.positiveRate}%</div>
            <p className="text-xs text-muted-foreground">
              {feedback.positive} din {feedback.total} rating-uri
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Feedback Negativ
            </CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {feedback.total > 0 ? Math.round((feedback.negative / feedback.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {feedback.negative} din {feedback.total} rating-uri
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafice principale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Întrebări */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Întrebări Frecvente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPatternsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="frecvență" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categorii Populare */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Distribuție pe Categorii
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${(Number(entry.percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabel detaliat pattern-uri */}
      <Card>
        <CardHeader>
          <CardTitle>Toate Pattern-urile Învățate</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">
                        {pattern.question_pattern}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {pattern.question_category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Întrebat {pattern.frequency}x
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Răspuns în ~{Math.round(pattern.avg_response_time / 1000)}s
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {pattern.frequency}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        întrebări
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}