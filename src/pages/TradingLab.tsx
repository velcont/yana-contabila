import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, Activity,
  Brain, Gauge, AlertTriangle, LineChart, CandlestickChart, Zap,
  Shield, Target, RefreshCw
} from 'lucide-react';
import {
  fullAnalysis,
  generateSignals,
  compareStrategies,
  buildSentimentReport,
  combineTechAndSentiment,
  type CandleData,
  type SignalDirection,
} from '@/utils/trading';

function generateSampleCandles(symbol: string, days = 100): CandleData[] {
  const candles: CandleData[] = [];
  let price = symbol === 'AAPL' ? 185 : symbol === 'TSLA' ? 245 : symbol === 'MSFT' ? 415 : symbol === 'NVDA' ? 880 : 100;
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * price * 0.03;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.015;
    const low = Math.min(open, close) - Math.random() * price * 0.015;
    const volume = Math.floor(50000000 + Math.random() * 100000000);
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    candles.push({ open, high, low, close, volume, date: d.toISOString().split('T')[0] });
    price = close;
  }
  return candles;
}

const POPULAR_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'];

function SignalBadge({ direction, confidence }: { direction: SignalDirection; confidence: number }) {
  const config = {
    buy: { icon: TrendingUp, className: 'bg-green-500/15 text-green-600 border-green-500/30' },
    sell: { icon: TrendingDown, className: 'bg-red-500/15 text-red-600 border-red-500/30' },
    hold: { icon: Minus, className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  }[direction];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.className} gap-1 px-3 py-1.5 text-sm font-semibold`}>
      <Icon className="h-4 w-4" />
      {direction.toUpperCase()} ({confidence}%)
    </Badge>
  );
}

function IndicatorCard({ label, value, description, color }: {
  label: string; value: string | number; description?: string; color?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function TradingLab() {
  const { user, loading } = useAuth();
  const [symbol, setSymbol] = useState('AAPL');
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);

  const candles = useMemo(() => generateSampleCandles(symbol, 100), [symbol, refreshKey]);
  const analysis = useMemo(() => fullAnalysis(candles), [candles]);
  const signals = useMemo(() => generateSignals(candles), [candles]);
  const strategies = useMemo(() => compareStrategies(candles), [candles]);
  const sentiment = useMemo(() => buildSentimentReport(symbol, symbol, {
    reddit: { buzzScore: 72, bullishPct: 64, trend: 'rising' as const, metricValue: 1240 },
    news: { buzzScore: 55, bullishPct: 58, trend: 'stable' as const, metricValue: 34 },
    analyst: { buzzScore: 80, bullishPct: 71, trend: 'rising' as const, metricValue: 12 },
  }), [symbol]);
  const combined = useMemo(() => combineTechAndSentiment(
    signals.overallSignal, signals.overallConfidence, sentiment
  ), [signals, sentiment]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const prevClose = candles[candles.length - 2]?.close ?? lastClose;
  const dayChange = ((lastClose - prevClose) / prevClose) * 100;

  // Determine combined signal display
  const combinedSignal: SignalDirection = combined.alignment === 'confirmed'
    ? combined.technicalSignal
    : combined.alignment === 'divergent' ? 'hold' : combined.technicalSignal;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/yana">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <CandlestickChart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Trading Lab</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Symbol selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <Input
                  placeholder="Simbol (ex: AAPL)"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && setSymbol(inputSymbol)}
                  className="max-w-[200px]"
                />
                <Button onClick={() => setSymbol(inputSymbol)}>
                  <Activity className="h-4 w-4 mr-1" /> Analizează
                </Button>
                <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SYMBOLS.map(s => (
                  <Button key={s} variant={symbol === s ? 'default' : 'outline'} size="sm"
                    onClick={() => { setSymbol(s); setInputSymbol(s); }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{symbol}</p>
              <p className="text-3xl font-bold">${lastClose.toFixed(2)}</p>
              <p className={`text-sm font-medium ${dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Semnal General</p>
              <div className="mt-2 flex justify-center">
                <SignalBadge direction={signals.overallSignal} confidence={signals.overallConfidence} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Fear & Greed</p>
              <p className="text-3xl font-bold">{sentiment.fearGreedIndex}</p>
              <p className="text-xs text-muted-foreground">{sentiment.fearGreedLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Combinat Tech+Sentiment</p>
              <div className="mt-2 flex justify-center">
                <SignalBadge direction={combinedSignal} confidence={combined.combinedConfidence} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="indicators" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="indicators"><BarChart3 className="h-4 w-4 mr-1" />Indicatori</TabsTrigger>
            <TabsTrigger value="signals"><Zap className="h-4 w-4 mr-1" />Semnale</TabsTrigger>
            <TabsTrigger value="sentiment"><Brain className="h-4 w-4 mr-1" />Sentiment</TabsTrigger>
            <TabsTrigger value="backtest"><Target className="h-4 w-4 mr-1" />Backtest</TabsTrigger>
          </TabsList>

          {/* Indicators */}
          <TabsContent value="indicators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Indicatori Tehnici</CardTitle>
                <CardDescription>15+ indicatori calculați pe ultimele 100 de lumânări</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analysis.rsi14.length > 0 && (
                    <IndicatorCard
                      label="RSI (14)"
                      value={analysis.rsi14[analysis.rsi14.length - 1]}
                      description={analysis.rsi14[analysis.rsi14.length - 1] > 70 ? '⚠️ Supracumpărat' : analysis.rsi14[analysis.rsi14.length - 1] < 30 ? '⚠️ Supravândut' : '✅ Neutru'}
                      color={analysis.rsi14[analysis.rsi14.length - 1] > 70 ? 'text-destructive' : analysis.rsi14[analysis.rsi14.length - 1] < 30 ? 'text-green-600' : undefined}
                    />
                  )}
                  {analysis.sma20.length > 0 && <IndicatorCard label="SMA 20" value={analysis.sma20[analysis.sma20.length - 1]} description="Media mobilă simplă" />}
                  {analysis.sma50.length > 0 && <IndicatorCard label="SMA 50" value={analysis.sma50[analysis.sma50.length - 1]} description="Media mobilă pe 50 zile" />}
                  {analysis.ema12.length > 0 && <IndicatorCard label="EMA 12" value={analysis.ema12[analysis.ema12.length - 1]} description="Media mobilă exponențială" />}
                  {analysis.macd.length > 0 && (
                    <IndicatorCard
                      label="MACD"
                      value={analysis.macd[analysis.macd.length - 1].MACD}
                      description={`Signal: ${(analysis.macd[analysis.macd.length - 1].signal ?? 0).toFixed(2)}`}
                      color={analysis.macd[analysis.macd.length - 1].MACD > 0 ? 'text-green-600' : 'text-destructive'}
                    />
                  )}
                  {analysis.bollingerBands.length > 0 && (
                    <>
                      <IndicatorCard label="BB Upper" value={analysis.bollingerBands[analysis.bollingerBands.length - 1].upper} description="Bollinger Band superioară" />
                      <IndicatorCard label="BB Lower" value={analysis.bollingerBands[analysis.bollingerBands.length - 1].lower} description="Bollinger Band inferioară" />
                      <IndicatorCard label="BB %B" value={analysis.bollingerBands[analysis.bollingerBands.length - 1].pb} description="Poziția prețului în benzi" />
                    </>
                  )}
                  {analysis.atr14.length > 0 && <IndicatorCard label="ATR (14)" value={analysis.atr14[analysis.atr14.length - 1]} description="Volatilitate medie" />}
                  {analysis.adx14.length > 0 && (
                    <IndicatorCard
                      label="ADX"
                      value={analysis.adx14[analysis.adx14.length - 1]}
                      description={analysis.adx14[analysis.adx14.length - 1] > 25 ? '📈 Trend puternic' : '↔️ Fără trend'}
                    />
                  )}
                  {analysis.superTrend.length > 0 && (
                    <IndicatorCard
                      label="SuperTrend"
                      value={analysis.superTrend[analysis.superTrend.length - 1].supertrend}
                      description={analysis.superTrend[analysis.superTrend.length - 1].direction === 1 ? '🟢 Uptrend' : '🔴 Downtrend'}
                      color={analysis.superTrend[analysis.superTrend.length - 1].direction === 1 ? 'text-green-600' : 'text-destructive'}
                    />
                  )}
                  {analysis.obv.length > 0 && <IndicatorCard label="OBV" value={(analysis.obv[analysis.obv.length - 1] / 1e6).toFixed(1) + 'M'} description="On-Balance Volume" />}
                </div>

                {analysis.patterns.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CandlestickChart className="h-4 w-4" /> Pattern-uri Candlestick Detectate
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.patterns.map((p, i) => (
                        <Badge key={i} variant="outline" className={
                          p.type === 'bullish' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                          p.type === 'bearish' ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-muted'
                        }>
                          {p.name} ({p.type})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signals */}
          <TabsContent value="signals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Semnale de Trading</CardTitle>
                <CardDescription>Trend: {signals.trendDirection} | Volatilitate: {signals.volatility} | Momentum: {signals.momentum}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <IndicatorCard label="Suport" value={`$${signals.supportLevel.toFixed(2)}`} description="Nivel de suport" color="text-green-600" />
                  <IndicatorCard label="Rezistență" value={`$${signals.resistanceLevel.toFixed(2)}`} description="Nivel de rezistență" color="text-destructive" />
                  <IndicatorCard label="Risk/Reward" value={signals.riskRewardRatio.toFixed(2)} description="Raport risc/recompensă" />
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Semnale Individuale ({signals.signals.length})</h4>
                  {signals.signals.map((sig, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <SignalBadge direction={sig.direction} confidence={sig.confidence} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{sig.indicator}</p>
                        <p className="text-sm text-muted-foreground">{sig.reason}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{sig.strength}</Badge>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{signals.disclaimer}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sentiment */}
          <TabsContent value="sentiment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Analiză de Sentiment</CardTitle>
                <CardDescription>Sentiment: {sentiment.overallSentiment} | Scor: {sentiment.overallScore.toFixed(0)} | Surse: {sentiment.availableSources}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2"><Gauge className="h-4 w-4" /> Fear & Greed Index</span>
                    <span className="text-2xl font-bold">{sentiment.fearGreedIndex}</span>
                  </div>
                  <Progress value={sentiment.fearGreedIndex} className="h-3" />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>Frică extremă</span>
                    <span>{sentiment.fearGreedLabel}</span>
                    <span>Lăcomie extremă</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sentiment.sources.map((src, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">{src.label}</Badge>
                        <span className="text-sm font-bold">{src.buzzScore}/100</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Bullish: </span>
                        <span className="font-medium">{src.bullishPct ?? '-'}%</span>
                      </div>
                      <Progress value={src.confidence} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">Încredere: {src.confidence}%</p>
                    </div>
                  ))}
                </div>

                {sentiment.signals.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Semnale Sentiment</h4>
                    {sentiment.signals.map((s, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        s.type === 'bullish' ? 'bg-green-500/5 border-green-500/20' :
                        s.type === 'bearish' ? 'bg-red-500/5 border-red-500/20' :
                        s.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-muted'
                      }`}>
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Semnal Combinat (Tehnic + Sentiment)
                    </h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <SignalBadge direction={combinedSignal} confidence={combined.combinedConfidence} />
                      <p className="text-sm text-muted-foreground flex-1">{combined.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backtest */}
          <TabsContent value="backtest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Backtesting Strategii</CardTitle>
                <CardDescription>Comparație de strategii pe date simulate ({candles.length} lumânări)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-3">Strategie</th>
                        <th className="text-right py-2 px-3">Return</th>
                        <th className="text-right py-2 px-3">Max DD</th>
                        <th className="text-right py-2 px-3">Win Rate</th>
                        <th className="text-right py-2 px-3">Sharpe</th>
                        <th className="text-right py-2 px-3">Trades</th>
                        <th className="text-right py-2 pl-3">Profit Factor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategies.strategies.map((r, i) => (
                        <tr key={i} className={`border-b ${strategies.bestStrategy === r.strategy ? 'bg-primary/5' : ''}`}>
                          <td className="py-2 pr-3 font-medium">
                            {r.strategy}
                            {strategies.bestStrategy === r.strategy && <Badge className="ml-2 text-[10px]" variant="default">Best</Badge>}
                          </td>
                          <td className={`text-right py-2 px-3 font-semibold ${r.totalReturn >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(2)}%
                          </td>
                          <td className="text-right py-2 px-3 text-destructive">{r.maxDrawdown.toFixed(2)}%</td>
                          <td className="text-right py-2 px-3">{r.winRate.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3">{r.sharpeRatio.toFixed(2)}</td>
                          <td className="text-right py-2 px-3">{r.totalTrades}</td>
                          <td className="text-right py-2 pl-3">{r.profitFactor.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">📊 <strong>Recomandare:</strong> {strategies.recommendation}</p>
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>⚠️ Backtesting pe date simulate. Performanța trecută nu garantează rezultate viitoare.</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
