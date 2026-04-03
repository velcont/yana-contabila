import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Grid3X3, Loader2 } from 'lucide-react';

interface CohortRow {
  cohort: string;
  totalUsers: number;
  weeks: number[]; // retention % per week 0-4+
}

export function RetentionHeatmap() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRetention();
  }, []);

  const loadRetention = async () => {
    try {
      // Get all profiles with creation dates
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });

      if (!profiles || profiles.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get activity events
      const { data: events } = await supabase
        .from('analytics_events')
        .select('user_id, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1000);

      // Group profiles by signup month
      const cohortMap = new Map<string, { users: Set<string>; signupDate: Map<string, Date> }>();

      for (const p of profiles) {
        const month = p.created_at.slice(0, 7); // YYYY-MM
        if (!cohortMap.has(month)) {
          cohortMap.set(month, { users: new Set(), signupDate: new Map() });
        }
        cohortMap.get(month)!.users.add(p.id);
        cohortMap.get(month)!.signupDate.set(p.id, new Date(p.created_at));
      }

      // Build activity map: userId -> Set of week offsets from signup
      const activityByUser = new Map<string, Set<number>>();
      for (const e of events || []) {
        if (!e.user_id) continue;
        // Find this user's signup date
        for (const [, cohort] of cohortMap) {
          const signupDate = cohort.signupDate.get(e.user_id);
          if (signupDate) {
            const diffMs = new Date(e.created_at).getTime() - signupDate.getTime();
            const weekOffset = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
            if (weekOffset >= 0 && weekOffset <= 4) {
              if (!activityByUser.has(e.user_id)) activityByUser.set(e.user_id, new Set());
              activityByUser.get(e.user_id)!.add(weekOffset);
            }
          }
        }
      }

      // Calculate retention per cohort per week
      const rows: CohortRow[] = [];
      const sortedMonths = Array.from(cohortMap.keys()).sort().slice(-6); // Last 6 months

      for (const month of sortedMonths) {
        const cohort = cohortMap.get(month)!;
        const total = cohort.users.size;
        const weeks: number[] = [];

        for (let w = 0; w <= 4; w++) {
          let activeCount = 0;
          for (const userId of cohort.users) {
            if (activityByUser.get(userId)?.has(w)) activeCount++;
          }
          weeks.push(total > 0 ? Math.round((activeCount / total) * 100) : 0);
        }

        rows.push({ cohort: month, totalUsers: total, weeks });
      }

      setCohorts(rows);
    } catch (err) {
      console.error('Retention load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getColor = (pct: number) => {
    if (pct >= 60) return 'bg-green-600 text-white';
    if (pct >= 40) return 'bg-green-400 text-white';
    if (pct >= 20) return 'bg-yellow-400 text-black';
    if (pct > 0) return 'bg-orange-400 text-white';
    return 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Retention Heatmap (PostHog-style)
        </CardTitle>
        <CardDescription>Retenție pe cohorte lunare — câți utilizatori revin săptămânal</CardDescription>
      </CardHeader>
      <CardContent>
        {cohorts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nu sunt suficiente date pentru heatmap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground">Cohortă</th>
                  <th className="text-center p-2 text-muted-foreground">Utilizatori</th>
                  <th className="text-center p-2 text-muted-foreground">Săpt 0</th>
                  <th className="text-center p-2 text-muted-foreground">Săpt 1</th>
                  <th className="text-center p-2 text-muted-foreground">Săpt 2</th>
                  <th className="text-center p-2 text-muted-foreground">Săpt 3</th>
                  <th className="text-center p-2 text-muted-foreground">Săpt 4+</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map(row => (
                  <tr key={row.cohort}>
                    <td className="p-2 font-medium">{row.cohort}</td>
                    <td className="p-2 text-center">{row.totalUsers}</td>
                    {row.weeks.map((pct, i) => (
                      <td key={i} className="p-1">
                        <div className={`rounded px-2 py-1 text-center text-xs font-medium ${getColor(pct)}`}>
                          {pct}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
