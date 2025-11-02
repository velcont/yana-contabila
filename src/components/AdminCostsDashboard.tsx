import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CostBreakdown {
  totalAICosts: number;
  totalUsers: number;
  activeUsers: number;
  estimatedInfrastructure: number;
  estimatedTotal: number;
}

export const AdminCostsDashboard = () => {
  const [costs, setCosts] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      setLoading(true);

      // Get current month AI costs
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: aiUsage, error: aiError } = await supabase
        .from('ai_usage')
        .select('estimated_cost_cents')
        .eq('month_year', currentMonth);

      if (aiError) throw aiError;

      const totalAICents = aiUsage?.reduce((sum, record) => sum + (record.estimated_cost_cents || 0), 0) || 0;
      const totalAICosts = totalAICents / 100; // Convert to RON

      // Get user counts
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get active users (logged in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData, error: activeError } = await supabase
        .from('analytics_events')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('user_id', 'is', null);

      if (activeError) throw activeError;

      const uniqueActiveUsers = new Set(activeUsersData?.map(e => e.user_id)).size;

      // Estimate infrastructure costs based on active users
      const baseInfrastructure = 50; // Base Lovable Cloud cost in RON
      const perUserCost = 2; // Estimated per active user
      const estimatedInfrastructure = baseInfrastructure + (uniqueActiveUsers * perUserCost);

      const estimatedTotal = totalAICosts + estimatedInfrastructure;

      setCosts({
        totalAICosts,
        totalUsers: totalUsers || 0,
        activeUsers: uniqueActiveUsers,
        estimatedInfrastructure,
        estimatedTotal,
      });
    } catch (error: any) {
      console.error('Error fetching costs:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca costurile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-muted" />
            <CardContent className="h-16 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  if (!costs) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
            <CardTitle className="text-sm font-medium">Cost Total Lunar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.estimatedTotal.toFixed(2)} RON</div>
            <p className="text-xs text-muted-foreground">Luna curentă</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
            <CardTitle className="text-sm font-medium">Costuri AI</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.totalAICosts.toFixed(2)} RON</div>
            <p className="text-xs text-muted-foreground">Lovable AI usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
            <CardTitle className="text-sm font-medium">Infrastructură</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.estimatedInfrastructure.toFixed(2)} RON</div>
            <p className="text-xs text-muted-foreground">Cloud + Storage + Functions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
            <CardTitle className="text-sm font-medium">Utilizatori Activi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Din {costs.totalUsers} total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalii Costuri</CardTitle>
          <CardDescription>Breakdown complet al costurilor lunare</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Lovable Cloud (bază)</span>
              <span className="text-sm">50 RON</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per utilizator activ ({costs.activeUsers} × 2 RON)</span>
              <span className="text-sm">{(costs.activeUsers * 2).toFixed(2)} RON</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Lovable AI (usage efectiv)</span>
              <span className="text-sm">{costs.totalAICosts.toFixed(2)} RON</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between items-center font-bold">
              <span>Total Estimat</span>
              <span>{costs.estimatedTotal.toFixed(2)} RON</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Note:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Costurile sunt estimate pe baza utilizării curente</li>
              <li>• Lovable Cloud include: database, auth, storage, edge functions</li>
              <li>• Lovable AI se plătește doar pentru usage efectiv</li>
              <li>• Stripe, Resend, SmartBill au tier-uri gratuite generoase</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
