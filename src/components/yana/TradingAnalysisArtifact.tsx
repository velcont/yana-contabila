import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, Minus, BarChart3,
  Brain, Gauge, AlertTriangle, CandlestickChart, Zap,
  Shield, Target
} from 'lucide-react';
import type { SignalDirection } from '@/utils/trading';

export interface TradingAnalysisData {
  symbol: string;
  price: number;
  dayChange: number;
  indicators: {
    rsi14?: number;
    sma20?: number;
    sma50?: number;
    ema12?: number;
    macdValue?: number;
    macdSignal?: number;
    bbUpper?: number;
    bbLower?: number;
    bbPB?: number;
    atr14?: number;
    adx14?: number;
    superTrend?: number;
    superTrendDir?: number;
    obv?: string;
  };
  patterns: Array<{ name: string; type: string }>;
  signals: {
    overall: SignalDirection;
    confidence: number;
    trend: string;
    volatility: string;
    momentum: string;
    support: number;
    resistance: number;
    riskReward: number;
    individual: Array<{
      indicator: string;
      direction: SignalDirection;
      strength: string;
      reason: string;
      confidence: number;
    }>;
    disclaimer: string;
  };
  sentiment: {
    overall: string;
    score: number;
    fearGreed: number;
    fearGreedLabel: string;
    sources: Array<{
      label: string;
      buzzScore: number;
      bullishPct: number | null;
      confidence: number;
    }>;
    signals: Array<{ type: string; title: string; description: string }>;
  };
  combined: {
    signal: SignalDirection;
    confidence: number;
    alignment: string;
    recommendation: string;
  };
  backtest: {
    strategies: Array<{
      strategy: string;
      totalReturn: number;
      maxDrawdown: number;
      winRate: number;
      sharpe: number;
      trades: number;
      profitFactor: number;
    }>;
    best: string;
    recommendation: string;
  };
}

function SmallBadge({ direction, confidence }: { direction: SignalDirection; confidence: number }) {
  const cfg = {
    buy: { icon: TrendingUp, cls: 'bg-green-500/15 text-green-600 border-green-500/30' },
    sell: { icon: TrendingDown, cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
    hold: { icon: Minus, cls: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  }[direction];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.cls} gap-1 px-2 py-1 text-xs font-semibold`}>
      <Icon className="h-3 w-3" /> {direction.toUpperCase()} {confidence}%
    </Badge>
  );
}

function Ind({ label, value, desc, color }: { label: string; value: string | number; desc?: string; color?: string }) {
  return (
    <div className="rounded-md border bg-card p-2 space-y-0.5">
      <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
      <p className={`text-sm font-bold ${color || 'text-foreground'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </p>
      {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function TradingAnalysisArtifact({ data }: { data: TradingAnalysisData }) {
  const [tab, setTab] = useState('indicators');
  const d = data;

  return (
    <Card className="w-full max-w-2xl border-primary/20">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CandlestickChart className="h-5 w-5 text-primary" />
            Analiză Tehnică — {d.symbol}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">${d.price.toFixed(2)}</span>
            <span className={`text-sm font-medium ${d.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {d.dayChange >= 0 ? '+' : ''}{d.dayChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <SmallBadge direction={d.signals.overall} confidence={d.signals.confidence} />
          <Badge variant="outline" className="text-xs">FG: {d.sentiment.fearGreed}</Badge>
          <SmallBadge direction={d.combined.signal} confidence={d.combined.confidence} />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full h-8">
            <TabsTrigger value="indicators" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />Indicatori</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs gap-1"><Zap className="h-3 w-3" />Semnale</TabsTrigger>
            <TabsTrigger value="sentiment" className="text-xs gap-1"><Brain className="h-3 w-3" />Sentiment</TabsTrigger>
            <TabsTrigger value="backtest" className="text-xs gap-1"><Target className="h-3 w-3" />Backtest</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {d.indicators.rsi14 != null && (
                <Ind label="RSI" value={d.indicators.rsi14}
                  desc={d.indicators.rsi14 > 70 ? '⚠️ Supracumpărat' : d.indicators.rsi14 < 30 ? '⚠️ Supravândut' : '✅ Neutru'}
                  color={d.indicators.rsi14 > 70 ? 'text-destructive' : d.indicators.rsi14 < 30 ? 'text-green-600' : undefined} />
              )}
              {d.indicators.sma20 != null && <Ind label="SMA 20" value={d.indicators.sma20} />}
              {d.indicators.sma50 != null && <Ind label="SMA 50" value={d.indicators.sma50} />}
              {d.indicators.ema12 != null && <Ind label="EMA 12" value={d.indicators.ema12} />}
              {d.indicators.macdValue != null && (
                <Ind label="MACD" value={d.indicators.macdValue}
                  desc={`Sig: ${(d.indicators.macdSignal ?? 0).toFixed(2)}`}
                  color={d.indicators.macdValue > 0 ? 'text-green-600' : 'text-destructive'} />
              )}
              {d.indicators.bbUpper != null && <Ind label="BB Upper" value={d.indicators.bbUpper} />}
              {d.indicators.bbLower != null && <Ind label="BB Lower" value={d.indicators.bbLower} />}
              {d.indicators.atr14 != null && <Ind label="ATR" value={d.indicators.atr14} desc="Volatilitate" />}
              {d.indicators.adx14 != null && (
                <Ind label="ADX" value={d.indicators.adx14}
                  desc={d.indicators.adx14 > 25 ? '📈 Trend puternic' : '↔️ Fără trend'} />
              )}
              {d.indicators.superTrend != null && (
                <Ind label="SuperTrend" value={d.indicators.superTrend}
                  desc={d.indicators.superTrendDir === 1 ? '🟢 Up' : '🔴 Down'}
                  color={d.indicators.superTrendDir === 1 ? 'text-green-600' : 'text-destructive'} />
              )}
              {d.indicators.obv != null && <Ind label="OBV" value={d.indicators.obv} />}
            </div>
            {d.patterns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.patterns.map((p, i) => (
                  <Badge key={i} variant="outline" className={`text-[10px] ${
                    p.type === 'bullish' ? 'bg-green-500/10 text-green-600' :
                    p.type === 'bearish' ? 'bg-red-500/10 text-red-600' : ''
                  }`}>{p.name}</Badge>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="signals" className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Ind label="Suport" value={`$${d.signals.support.toFixed(2)}`} color="text-green-600" />
              <Ind label="Rezistență" value={`$${d.signals.resistance.toFixed(2)}`} color="text-destructive" />
              <Ind label="R/R" value={d.signals.riskReward.toFixed(2)} />
            </div>
            <div className="text-xs text-muted-foreground">
              Trend: {d.signals.trend} · Vol: {d.signals.volatility} · Mom: {d.signals.momentum}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {d.signals.individual.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border bg-card">
                  <SmallBadge direction={s.direction} confidence={s.confidence} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{s.indicator}</p>
                    <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground flex gap-1 items-start">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-destructive" />
              {d.signals.disclaimer}
            </p>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-3 space-y-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold flex items-center gap-1"><Gauge className="h-3 w-3" /> Fear & Greed</span>
                <span className="text-lg font-bold">{d.sentiment.fearGreed}</span>
              </div>
              <Progress value={d.sentiment.fearGreed} className="h-2" />
              <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
                <span>Frică</span><span>{d.sentiment.fearGreedLabel}</span><span>Lăcomie</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {d.sentiment.sources.map((src, i) => (
                <div key={i} className="p-2 rounded border bg-card space-y-1">
                  <p className="text-[10px] font-medium">{src.label}</p>
                  <p className="text-xs font-bold">{src.bullishPct ?? '-'}% bull</p>
                  <Progress value={src.confidence} className="h-1" />
                </div>
              ))}
            </div>
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Shield className="h-3 w-3 text-primary" />
                <SmallBadge direction={d.combined.signal} confidence={d.combined.confidence} />
                <span className="text-[10px] text-muted-foreground">{d.combined.alignment}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{d.combined.recommendation}</p>
            </div>
          </TabsContent>

          <TabsContent value="backtest" className="mt-3 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1">Strategie</th>
                    <th className="text-right py-1">Return</th>
                    <th className="text-right py-1">DD</th>
                    <th className="text-right py-1">Win%</th>
                    <th className="text-right py-1">Sharpe</th>
                  </tr>
                </thead>
                <tbody>
                  {d.backtest.strategies.map((r, i) => (
                    <tr key={i} className={`border-b ${d.backtest.best === r.strategy ? 'bg-primary/5' : ''}`}>
                      <td className="py-1 font-medium">
                        {r.strategy} {d.backtest.best === r.strategy && <Badge className="text-[8px] ml-1" variant="default">★</Badge>}
                      </td>
                      <td className={`text-right py-1 font-semibold ${r.totalReturn >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(1)}%
                      </td>
                      <td className="text-right py-1 text-destructive">{r.maxDrawdown.toFixed(1)}%</td>
                      <td className="text-right py-1">{r.winRate.toFixed(0)}%</td>
                      <td className="text-right py-1">{r.sharpe.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">📊 {d.backtest.recommendation}</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
