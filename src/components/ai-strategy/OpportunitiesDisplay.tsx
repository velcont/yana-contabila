import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, Clock, ArrowRight } from 'lucide-react';
import type { AIOpportunity } from '@/config/aiStrategyData';

interface OpportunitiesDisplayProps {
  opportunities: AIOpportunity[];
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const priorityLabels: Record<string, string> = {
  high: 'Prioritate ridicată',
  medium: 'Prioritate medie',
  low: 'Prioritate scăzută',
};

export function OpportunitiesDisplay({ opportunities }: OpportunitiesDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Oportunități AI Identificate</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        YANA a identificat {opportunities.length} zone concrete unde AI poate transforma afacerea ta.
      </p>

      <div className="grid gap-4">
        {opportunities.map((opp, i) => (
          <Card key={i} className="border-l-4 border-l-primary/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{opp.title}</CardTitle>
                <Badge variant="outline" className={priorityColors[opp.priority] || ''}>
                  {priorityLabels[opp.priority] || opp.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{opp.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Impact:</span>
                  <Progress value={opp.impact * 10} className="w-20 h-2" />
                  <span className="font-medium">{opp.impact}/10</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{opp.timeSavingsHoursMonth}h/lună economie</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Tools:</span>
                {opp.recommendedTools.map((tool, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                Departament: {opp.department}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
