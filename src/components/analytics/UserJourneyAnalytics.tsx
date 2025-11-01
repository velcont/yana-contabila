import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowRight, Users, CheckCircle, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FunnelStage {
  stage: string;
  users: number;
  percentage: number;
  dropoffRate: number;
}

interface CohortData {
  cohort: string;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

export const UserJourneyAnalytics = () => {
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJourneyData();
  }, []);

  const loadJourneyData = async () => {
    try {
      setIsLoading(true);

      // Get all users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get users who completed onboarding (first login)
      const { data: loginUsers } = await supabase
        .from('analytics_events')
        .select('user_id')
        .eq('event_name', 'user_login');

      const uniqueLoginUsers = new Set(loginUsers?.map(e => e.user_id)).size;

      // Get users who created first analysis
      const { data: firstAnalysisUsers } = await supabase
        .from('analytics_events')
        .select('user_id')
        .eq('event_name', 'first_analysis');

      const uniqueFirstAnalysisUsers = new Set(firstAnalysisUsers?.map(e => e.user_id)).size;

      // Get active users (used platform in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUsers } = await supabase
        .from('analytics_events')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueActiveUsers = new Set(activeUsers?.map(e => e.user_id)).size;

      // Calculate funnel
      const funnel: FunnelStage[] = [
        {
          stage: 'Sign Up',
          users: totalUsers || 0,
          percentage: 100,
          dropoffRate: 0
        },
        {
          stage: 'First Login',
          users: uniqueLoginUsers,
          percentage: totalUsers ? (uniqueLoginUsers / totalUsers) * 100 : 0,
          dropoffRate: totalUsers ? ((totalUsers - uniqueLoginUsers) / totalUsers) * 100 : 0
        },
        {
          stage: 'First Analysis',
          users: uniqueFirstAnalysisUsers,
          percentage: totalUsers ? (uniqueFirstAnalysisUsers / totalUsers) * 100 : 0,
          dropoffRate: uniqueLoginUsers ? ((uniqueLoginUsers - uniqueFirstAnalysisUsers) / uniqueLoginUsers) * 100 : 0
        },
        {
          stage: 'Active User',
          users: uniqueActiveUsers,
          percentage: totalUsers ? (uniqueActiveUsers / totalUsers) * 100 : 0,
          dropoffRate: uniqueFirstAnalysisUsers ? ((uniqueFirstAnalysisUsers - uniqueActiveUsers) / uniqueFirstAnalysisUsers) * 100 : 0
        }
      ];

      setFunnelData(funnel);

      // Calculate cohort retention (simplified - last 4 weeks)
      const cohorts: CohortData[] = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));

        const { data: cohortUsers } = await supabase
          .from('profiles')
          .select('id, created_at')
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString());

        const cohortSize = cohortUsers?.length || 0;

        // Calculate retention for each week
        const retentionPromises = [0, 1, 2, 3, 4].map(async (weekOffset) => {
          const retentionStart = new Date(weekStart);
          retentionStart.setDate(retentionStart.getDate() + (weekOffset * 7));
          const retentionEnd = new Date(retentionStart);
          retentionEnd.setDate(retentionEnd.getDate() + 7);

          const { data: activeInWeek } = await supabase
            .from('analytics_events')
            .select('user_id')
            .in('user_id', cohortUsers?.map(u => u.id) || [])
            .gte('created_at', retentionStart.toISOString())
            .lt('created_at', retentionEnd.toISOString());

          const uniqueActive = new Set(activeInWeek?.map(e => e.user_id)).size;
          return cohortSize > 0 ? (uniqueActive / cohortSize) * 100 : 0;
        });

        const [week0, week1, week2, week3, week4] = await Promise.all(retentionPromises);

        cohorts.push({
          cohort: `Săptămâna ${4 - i}`,
          week0,
          week1,
          week2,
          week3,
          week4
        });
      }

      setCohortData(cohorts.reverse());
    } catch (error) {
      console.error('Error loading journey data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 75) return 'hsl(var(--primary))';
    if (percentage >= 50) return 'hsl(var(--secondary))';
    if (percentage >= 25) return 'hsl(var(--accent))';
    return 'hsl(var(--muted))';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">User Journey Analytics</h2>
        <p className="text-muted-foreground">Analiza parcursului utilizatorilor și retenție</p>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Funnel de Conversie
          </CardTitle>
          <CardDescription>Parcursul utilizatorilor de la sign-up la utilizare activă</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual Funnel */}
            <div className="space-y-2">
              {funnelData.map((stage, index) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.stage}</span>
                      {index > 0 && stage.dropoffRate > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {stage.dropoffRate.toFixed(1)}% drop-off
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{stage.users} utilizatori</span>
                      <span className="font-semibold">{stage.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-12 bg-muted rounded-lg overflow-hidden relative">
                    <div
                      className="h-full flex items-center justify-center text-white font-semibold transition-all"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: getBarColor(stage.percentage)
                      }}
                    >
                      {stage.percentage > 20 && `${stage.users} users`}
                    </div>
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Conversion Rate */}
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold">Overall Conversion Rate:</span>
              <span className="text-2xl font-bold text-primary">
                {funnelData.length > 0 ? funnelData[funnelData.length - 1].percentage.toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
          <CardDescription>Retenția utilizatorilor pe cohorte săptămânale</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cohort</th>
                  <th className="text-center p-2">Week 0</th>
                  <th className="text-center p-2">Week 1</th>
                  <th className="text-center p-2">Week 2</th>
                  <th className="text-center p-2">Week 3</th>
                  <th className="text-center p-2">Week 4</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr key={cohort.cohort} className="border-b">
                    <td className="p-2 font-medium">{cohort.cohort}</td>
                    <td className="p-2 text-center">
                      <Badge variant="default">{cohort.week0.toFixed(0)}%</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="secondary">{cohort.week1.toFixed(0)}%</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="secondary">{cohort.week2.toFixed(0)}%</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="secondary">{cohort.week3.toFixed(0)}%</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant="secondary">{cohort.week4.toFixed(0)}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="week0" fill="hsl(var(--primary))" name="Week 0" />
                <Bar dataKey="week1" fill="hsl(var(--secondary))" name="Week 1" />
                <Bar dataKey="week2" fill="hsl(var(--accent))" name="Week 2" />
                <Bar dataKey="week3" fill="hsl(var(--muted))" name="Week 3" />
                <Bar dataKey="week4" fill="hsl(var(--muted-foreground))" name="Week 4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
