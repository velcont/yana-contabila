import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Users, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface FeatureUsage {
  feature: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface DailyActivity {
  date: string;
  users: number;
  events: number;
}

export const AdminAnalyticsDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Get total users
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

      const activeUsers = new Set(activeUsersData?.map(e => e.user_id)).size;

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Get feature usage
      const { data: featureData } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const featureCounts = featureData?.reduce((acc, { event_name }) => {
        acc[event_name] = (acc[event_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalFeatureEvents = Object.values(featureCounts || {}).reduce((a, b) => a + b, 0);
      const topFeatures = Object.entries(featureCounts || {})
        .map(([feature, count]) => ({
          feature,
          count,
          percentage: (count / totalFeatureEvents) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get daily activity for last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: dailyData } = await supabase
        .from('analytics_events')
        .select('created_at, user_id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const dailyMap = dailyData?.reduce((acc, { created_at, user_id }) => {
        const date = new Date(created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, users: new Set(), events: 0 };
        }
        acc[date].users.add(user_id);
        acc[date].events += 1;
        return acc;
      }, {} as Record<string, { date: string; users: Set<string>; events: number }>);

      const dailyActivityData = Object.values(dailyMap || {}).map(({ date, users, events }) => ({
        date: new Date(date).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' }),
        users: users.size,
        events
      }));

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        newUsersThisMonth: newUsers || 0,
        totalRevenue: 0, // Placeholder - integrate with Stripe
        avgSessionDuration: 0, // Placeholder - calculate from events
        bounceRate: 0 // Placeholder - calculate from page views
      });

      setFeatureUsage(topFeatures);
      setDailyActivity(dailyActivityData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExportLoading(true);
      const { data, error } = await supabase.functions.invoke('analytics-export', {
        body: { format, stats, featureUsage, dailyActivity }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();

      toast.success(`Raport ${format.toUpperCase()} exportat cu succes`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Eroare la exportul raportului');
    } finally {
      setExportLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Overview complet al performanței platformei</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilizatori</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth} luna aceasta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizatori Activi</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Ultimele 30 zile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venit Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              Implementare Stripe în curând
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Active users / Total users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activitate Zilnică</TabsTrigger>
          <TabsTrigger value="features">Top Funcționalități</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activitate Utilizatori (Ultimele 14 Zile)</CardTitle>
              <CardDescription>Număr utilizatori activi și evenimente per zi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" name="Utilizatori" />
                  <Line type="monotone" dataKey="events" stroke="hsl(var(--secondary))" name="Evenimente" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Funcționalități</CardTitle>
                <CardDescription>Cele mai utilizate features (ultimele 30 zile)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuție Utilizare</CardTitle>
                <CardDescription>Procentaj din total evenimente</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={featureUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.feature}: ${entry.percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                    >
                      {featureUsage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
