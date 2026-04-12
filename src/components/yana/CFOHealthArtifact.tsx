import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, TrendingUp, Shield, Wallet } from 'lucide-react';
import type { HealthScore } from '@/utils/cfoHealthScoring';

function ScoreBar({ label, score, details }: { label: string; score: number; details: string }) {
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-destructive';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={`font-bold ${color}`}>{score}/100</span>
      </div>
      <Progress value={score} className="h-2" />
      <p className="text-[10px] text-muted-foreground">{details}</p>
    </div>
  );
}

export function CFOHealthArtifact({ data }: { data: HealthScore }) {
  return (
    <Card className="w-full max-w-2xl border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            Diagnostic Financiar CFO
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-lg font-bold px-3 py-1 ${
                data.grade === 'A' || data.grade === 'B'
                  ? 'bg-green-500/15 text-green-600 border-green-500/30'
                  : data.grade === 'C'
                  ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
                  : 'bg-red-500/15 text-red-600 border-red-500/30'
              }`}
              variant="outline"
            >
              {data.grade} — {data.overall}%
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{data.category}</p>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="space-y-3">
          <ScoreBar label="💰 Profitabilitate" score={data.breakdown.profitability.score} details={data.breakdown.profitability.details} />
          <ScoreBar label="💧 Lichiditate" score={data.breakdown.liquidity.score} details={data.breakdown.liquidity.details} />
          <ScoreBar label="⚡ Eficiență" score={data.breakdown.efficiency.score} details={data.breakdown.efficiency.details} />
          <ScoreBar label="🏗️ Leverage" score={data.breakdown.leverage.score} details={data.breakdown.leverage.details} />
          <ScoreBar label="💸 Cash Flow" score={data.breakdown.cashflow.score} details={data.breakdown.cashflow.details} />
        </div>

        {data.cashRunway !== null && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs">
              <strong>Cash Runway:</strong> ~{data.cashRunway} luni de operare la ritmul curent
            </span>
          </div>
        )}

        {data.alerts.length > 0 && (
          <div className="space-y-1.5">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${
                a.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                a.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                'bg-blue-500/5 border-blue-500/20'
              }`}>
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Recomandări
            </p>
            {data.recommendations.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded border bg-primary/5">
                <Shield className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                <div className="text-xs">
                  <p className="font-medium">{r.action}</p>
                  <p className="text-muted-foreground">Impact: {r.impact} · {r.timeframe}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
