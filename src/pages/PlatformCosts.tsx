import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Users,
  ExternalLink,
  Calculator,
  Zap
} from 'lucide-react';
import AdminCreditsMonitor from '@/components/AdminCreditsMonitor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DailyConsumption {
  date: string;
  cost_cents: number;
  requests: number;
}

interface ModelBreakdown {
  model: string;
  requests: number;
  tokens: number;
  cost_cents: number;
}

interface PlatformStats {
  totalAICosts: number;
  totalUsers: number;
  activeUsers: number;
  estimatedInfrastructure: number;
  currentMonthCost: number;
  avgDailyCost: number;
  autonomyDays: number;
  todayCost: number;
  todayRequests: number;
}

const PlatformCosts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyConsumption[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([]);
  const [recommendedTopUp, setRecommendedTopUp] = useState<number>(500);
  
  // Simulate platform credits (în producție, aceasta ar veni din Lovable API sau manual entry)
  const [platformCredits] = useState(25000); // 250 RON în cents

  useEffect(() => {
    if (isAdmin && !authLoading && !roleLoading) {
      loadPlatformStats();
    }
  }, [isAdmin, authLoading, roleLoading]);

  const loadPlatformStats = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().slice(0, 10);

      // Get AI costs for current month
      const { data: aiUsage, error: aiError } = await supabase
        .from('ai_usage')
        .select('estimated_cost_cents, total_tokens, model, endpoint, created_at')
        .eq('month_year', currentMonth);

      if (aiError) throw aiError;

      const totalAICents = aiUsage?.reduce((sum, record) => sum + (record.estimated_cost_cents || 0), 0) || 0;
      const totalAICosts = totalAICents / 100;

      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData } = await supabase
        .from('analytics_events')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('user_id', 'is', null);

      const uniqueActiveUsers = new Set(activeUsersData?.map(e => e.user_id)).size;

      // Calculate infrastructure costs
      const baseInfrastructure = 50;
      const perUserCost = 2;
      const estimatedInfrastructure = baseInfrastructure + (uniqueActiveUsers * perUserCost);

      // Calculate daily costs for chart (last 30 days)
      const dailyCosts: { [key: string]: { cost: number; requests: number } } = {};
      aiUsage?.forEach(record => {
        const date = record.created_at.slice(0, 10);
        if (!dailyCosts[date]) {
          dailyCosts[date] = { cost: 0, requests: 0 };
        }
        dailyCosts[date].cost += record.estimated_cost_cents || 0;
        dailyCosts[date].requests += 1;
      });

      const dailyArray: DailyConsumption[] = Object.entries(dailyCosts)
        .map(([date, data]) => ({
          date,
          cost_cents: data.cost,
          requests: data.requests
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      setDailyData(dailyArray);

      // Calculate model breakdown
      const modelStats: { [key: string]: { requests: number; tokens: number; cost: number } } = {};
      aiUsage?.forEach(record => {
        const model = record.model || 'unknown';
        if (!modelStats[model]) {
          modelStats[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        modelStats[model].requests += 1;
        modelStats[model].tokens += record.total_tokens || 0;
        modelStats[model].cost += record.estimated_cost_cents || 0;
      });

      const modelArray: ModelBreakdown[] = Object.entries(modelStats)
        .map(([model, data]) => ({
          model,
          requests: data.requests,
          tokens: data.tokens,
          cost_cents: data.cost
        }))
        .sort((a, b) => b.cost_cents - a.cost_cents);

      setModelBreakdown(modelArray);

      // Calculate today's cost
      const todayCost = dailyArray.find(d => d.date === today)?.cost_cents || 0;
      const todayRequests = dailyArray.find(d => d.date === today)?.requests || 0;

      // Calculate average daily cost
      const avgDailyCost = dailyArray.length > 0
        ? dailyArray.reduce((sum, d) => sum + d.cost_cents, 0) / dailyArray.length
        : 0;

      // Calculate autonomy (how many days credits will last)
      const autonomyDays = avgDailyCost > 0 ? Math.floor(platformCredits / avgDailyCost) : 999;

      // Calculate recommended top-up
      const safetyMargin = 1.2; // 20% safety margin
      const desiredAutonomy = 30; // 30 days
      const recommended = Math.ceil((avgDailyCost * desiredAutonomy * safetyMargin) / 100) * 100;
      setRecommendedTopUp(recommended);

      setStats({
        totalAICosts,
        totalUsers: totalUsers || 0,
        activeUsers: uniqueActiveUsers,
        estimatedInfrastructure,
        currentMonthCost: totalAICosts + estimatedInfrastructure,
        avgDailyCost: avgDailyCost / 100,
        autonomyDays,
        todayCost: todayCost / 100,
        todayRequests
      });
    } catch (error: any) {
      console.error('Error loading platform stats:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca statisticile platformei',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Acces Restricționat</CardTitle>
            </div>
            <CardDescription>
              Această pagină este disponibilă doar pentru administratori.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const creditsRemaining = platformCredits / 100;
  const isLowCredits = stats.autonomyDays < 15;
  const isCriticalCredits = stats.autonomyDays < 7;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">💸 Monitorizare Costuri Platformă</h1>
        <p className="text-muted-foreground mt-2">
          Dashboard centralizat pentru toate costurile și credite AI
        </p>
      </div>

      {/* Critical Status Banner */}
      {(isLowCredits || isCriticalCredits) && (
        <Alert variant={isCriticalCredits ? "destructive" : "default"} className="border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <span className="font-semibold">
              {isCriticalCredits ? '🔴 CRITIC: ' : '⚠️ ATENȚIE: '}
              Credite rămase: {creditsRemaining.toFixed(2)} RON | Autonomie: {stats.autonomyDays} zile
            </span>
            <Button 
              variant={isCriticalCredits ? "default" : "outline"}
              onClick={() => window.open('https://lovable.dev/settings/workspace/usage', '_blank')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Încarcă Credite Acum
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credite Rămase</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isCriticalCredits ? 'text-red-600' : isLowCredits ? 'text-orange-600' : ''}`}>
              {creditsRemaining.toFixed(2)} RON
            </div>
            <p className="text-xs text-muted-foreground">
              Autonomie: {stats.autonomyDays} zile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consum Luna Curentă</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAICosts.toFixed(2)} RON</div>
            <p className="text-xs text-muted-foreground">Doar Lovable AI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Mediu Per Zi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDailyCost.toFixed(2)} RON</div>
            <p className="text-xs text-muted-foreground">
              Astăzi: {stats.todayCost.toFixed(2)} RON ({stats.todayRequests} requests)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizatori Activi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Din {stats.totalUsers} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="consumption" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consumption">📊 Consum Zilnic</TabsTrigger>
          <TabsTrigger value="models">🤖 Breakdown Modele</TabsTrigger>
          <TabsTrigger value="calculator">💡 Calculator</TabsTrigger>
          <TabsTrigger value="users">👥 Utilizatori</TabsTrigger>
        </TabsList>

        <TabsContent value="consumption" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📈 Grafic Consum Zilnic (Ultimele 30 zile)</CardTitle>
              <CardDescription>
                Evoluția costurilor AI și număr cereri pe zi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ro-RO')}
                    formatter={(value: any, name: string) => {
                      if (name === 'cost_cents') return `${(value / 100).toFixed(2)} RON`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cost_cents" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Cost (cents)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="requests" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Breakdown Modele AI</CardTitle>
              <CardDescription>
                Cost și utilizare per model AI (luna curentă)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelBreakdown.map((model) => (
                  <div key={model.model} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <p className="font-medium">{model.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {model.requests.toLocaleString()} requests | {(model.tokens / 1000).toFixed(1)}K tokens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{(model.cost_cents / 100).toFixed(2)} RON</p>
                      <Badge variant="secondary">
                        {((model.cost_cents / (stats.totalAICosts * 100)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                💡 Calculator: Cât Să Încarc?
              </CardTitle>
              <CardDescription>
                Recomandări automate bazate pe consum real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Mediu Zilnic</p>
                    <p className="text-2xl font-bold">{stats.avgDailyCost.toFixed(2)} RON</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Autonomie Curentă</p>
                    <p className="text-2xl font-bold">{stats.autonomyDays} zile</p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                    <div>
                      <p className="font-semibold">🔍 Recomandare: Încarcă {recommendedTopUp} RON</p>
                      <p className="text-sm text-muted-foreground">
                        → Va acoperi ~{Math.floor((recommendedTopUp / stats.avgDailyCost))} zile + marjă siguranță 20%
                      </p>
                    </div>
                    <Button 
                      onClick={() => window.open('https://lovable.dev/settings/workspace/usage', '_blank')}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Încarcă {recommendedTopUp} RON
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open('https://lovable.dev/settings/workspace/usage', '_blank')}
                    >
                      Încarcă 250 RON
                      <span className="ml-2 text-xs text-muted-foreground">
                        (~{Math.floor(250 / stats.avgDailyCost)} zile)
                      </span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open('https://lovable.dev/settings/workspace/usage', '_blank')}
                    >
                      Încarcă 1000 RON
                      <span className="ml-2 text-xs text-muted-foreground">
                        (~{Math.floor(1000 / stats.avgDailyCost)} zile)
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>💡 Tip:</strong> Recomandăm să menții întotdeauna un buffer de minim 15 zile pentru a evita întreruperile de serviciu.
                </AlertDescription>
              </Alert>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Link Direct: Lovable Workspace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vezi consumul exact și încarcă credite direct în Lovable Workspace
                  </p>
                  <Button 
                    onClick={() => window.open('https://lovable.dev/settings/workspace/usage', '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Deschide Lovable Workspace Usage
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <AdminCreditsMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformCosts;
