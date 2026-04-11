/**
 * Trading Signals Engine for YANA
 * Adapted from: trading-signals + trading-strategies (MIT License)
 * Generates actionable buy/sell/hold signals from technical indicators
 */

import {
  type CandleData,
  type TechnicalAnalysisResult,
  fullAnalysis,
} from './technicalIndicators';

// ============ TYPES ============

export type SignalStrength = 'strong' | 'moderate' | 'weak';
export type SignalDirection = 'buy' | 'sell' | 'hold';

export interface TradingSignal {
  indicator: string;
  direction: SignalDirection;
  strength: SignalStrength;
  reason: string;        // Romanian description
  confidence: number;    // 0-100
}

export interface SignalSummary {
  overallSignal: SignalDirection;
  overallConfidence: number;
  signals: TradingSignal[];
  trendDirection: 'uptrend' | 'downtrend' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
  momentum: 'bullish' | 'bearish' | 'neutral';
  supportLevel: number;
  resistanceLevel: number;
  riskRewardRatio: number;
  disclaimer: string;
}

export interface BacktestResult {
  strategy: string;
  totalReturn: number;          // %
  annualizedReturn: number;     // %
  maxDrawdown: number;          // %
  winRate: number;              // %
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  type: 'long' | 'short';
}

// ============ SIGNAL GENERATION ============

function lastN<T>(arr: T[], n: number): T | undefined {
  return arr.length >= n ? arr[arr.length - n] : undefined;
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function generateRSISignal(rsiValues: number[]): TradingSignal | null {
  const current = last(rsiValues);
  if (current === undefined) return null;
  
  if (current < 30) {
    return {
      indicator: 'RSI',
      direction: 'buy',
      strength: current < 20 ? 'strong' : 'moderate',
      reason: `RSI la ${current} — zonă de supravânzare (sub 30). Potențial de revenire.`,
      confidence: current < 20 ? 85 : 70,
    };
  }
  if (current > 70) {
    return {
      indicator: 'RSI',
      direction: 'sell',
      strength: current > 80 ? 'strong' : 'moderate',
      reason: `RSI la ${current} — zonă de supracumpărare (peste 70). Risc de corecție.`,
      confidence: current > 80 ? 85 : 70,
    };
  }
  
  // RSI divergence near boundaries
  const prev = lastN(rsiValues, 5);
  if (prev !== undefined && current > 50 && prev < 50) {
    return {
      indicator: 'RSI',
      direction: 'buy',
      strength: 'weak',
      reason: `RSI a trecut peste 50 (${current}) — moment pozitiv.`,
      confidence: 55,
    };
  }
  
  return null;
}

function generateMACDSignal(macdValues: { MACD: number; signal?: number; histogram?: number }[]): TradingSignal | null {
  const current = last(macdValues);
  const previous = lastN(macdValues, 2);
  if (!current || !previous || current.signal === undefined || previous.signal === undefined) return null;
  
  // Bullish crossover
  if (previous.MACD <= previous.signal && current.MACD > current.signal) {
    return {
      indicator: 'MACD',
      direction: 'buy',
      strength: current.MACD < 0 ? 'strong' : 'moderate',
      reason: 'MACD a încrucișat linia de semnal în sus — semnal de cumpărare.',
      confidence: current.MACD < 0 ? 80 : 65,
    };
  }
  
  // Bearish crossover
  if (previous.MACD >= previous.signal && current.MACD < current.signal) {
    return {
      indicator: 'MACD',
      direction: 'sell',
      strength: current.MACD > 0 ? 'strong' : 'moderate',
      reason: 'MACD a încrucișat linia de semnal în jos — semnal de vânzare.',
      confidence: current.MACD > 0 ? 80 : 65,
    };
  }
  
  // Histogram momentum
  if (current.histogram !== undefined && previous.histogram !== undefined) {
    if (current.histogram > 0 && current.histogram > previous.histogram) {
      return {
        indicator: 'MACD Histogram',
        direction: 'buy',
        strength: 'weak',
        reason: 'Histograma MACD crește — moment bullish.',
        confidence: 50,
      };
    }
  }
  
  return null;
}

function generateBollingerSignal(
  bb: { upper: number; lower: number; middle: number; pb: number; width: number }[],
  closes: number[],
): TradingSignal | null {
  const current = last(bb);
  const price = last(closes);
  if (!current || price === undefined) return null;
  
  if (current.pb < 0) {
    return {
      indicator: 'Bollinger Bands',
      direction: 'buy',
      strength: 'strong',
      reason: `Prețul a spart banda inferioară Bollinger — potențial de revenire la medie (${current.middle.toFixed(2)}).`,
      confidence: 75,
    };
  }
  if (current.pb > 1) {
    return {
      indicator: 'Bollinger Bands',
      direction: 'sell',
      strength: 'moderate',
      reason: `Prețul a depășit banda superioară Bollinger — risc de retragere la medie.`,
      confidence: 65,
    };
  }
  
  // Squeeze (low volatility = potential breakout)
  if (current.width < 0.05) {
    return {
      indicator: 'Bollinger Squeeze',
      direction: 'hold',
      strength: 'moderate',
      reason: 'Benzile Bollinger s-au strâns — pregătire pentru un breakout. Așteaptă direcția.',
      confidence: 60,
    };
  }
  
  return null;
}

function generateStochasticSignal(stoch: { k: number; d?: number }[]): TradingSignal | null {
  const current = last(stoch);
  const prev = lastN(stoch, 2);
  if (!current || current.d === undefined) return null;
  
  if (current.k < 20 && current.d !== undefined && current.k > current.d) {
    return {
      indicator: 'Stochastic',
      direction: 'buy',
      strength: 'moderate',
      reason: `Stochastic în zona de supravânzare (%K=${current.k.toFixed(1)}) cu crossover bullish.`,
      confidence: 70,
    };
  }
  if (current.k > 80 && current.d !== undefined && current.k < current.d) {
    return {
      indicator: 'Stochastic',
      direction: 'sell',
      strength: 'moderate',
      reason: `Stochastic în zona de supracumpărare (%K=${current.k.toFixed(1)}) cu crossover bearish.`,
      confidence: 70,
    };
  }
  
  return null;
}

function generateSuperTrendSignal(
  st: { supertrend: number; direction: number }[],
): TradingSignal | null {
  const current = last(st);
  const prev = lastN(st, 2);
  if (!current || !prev) return null;
  
  if (prev.direction === -1 && current.direction === 1) {
    return {
      indicator: 'SuperTrend',
      direction: 'buy',
      strength: 'strong',
      reason: 'SuperTrend a schimbat direcția de la bearish la bullish — semnal puternic de cumpărare.',
      confidence: 80,
    };
  }
  if (prev.direction === 1 && current.direction === -1) {
    return {
      indicator: 'SuperTrend',
      direction: 'sell',
      strength: 'strong',
      reason: 'SuperTrend a schimbat direcția de la bullish la bearish — semnal puternic de vânzare.',
      confidence: 80,
    };
  }
  
  return null;
}

function generateSMASignal(
  sma20: number[], sma50: number[], closes: number[],
): TradingSignal | null {
  const s20 = last(sma20);
  const s50 = last(sma50);
  const s20prev = lastN(sma20, 2);
  const s50prev = lastN(sma50, 2);
  
  if (s20 === undefined || s50 === undefined || s20prev === undefined || s50prev === undefined) return null;
  
  // Golden Cross
  if (s20prev <= s50prev && s20 > s50) {
    return {
      indicator: 'Golden Cross (SMA 20/50)',
      direction: 'buy',
      strength: 'strong',
      reason: 'SMA 20 a trecut peste SMA 50 — Golden Cross, semnal bullish pe termen mediu.',
      confidence: 75,
    };
  }
  
  // Death Cross
  if (s20prev >= s50prev && s20 < s50) {
    return {
      indicator: 'Death Cross (SMA 20/50)',
      direction: 'sell',
      strength: 'strong',
      reason: 'SMA 20 a coborât sub SMA 50 — Death Cross, semnal bearish pe termen mediu.',
      confidence: 75,
    };
  }
  
  return null;
}

function generateADXSignal(adxValues: number[]): TradingSignal | null {
  const current = last(adxValues);
  if (current === undefined) return null;
  
  if (current > 40) {
    return {
      indicator: 'ADX',
      direction: 'hold',
      strength: 'moderate',
      reason: `ADX la ${current} — trend puternic confirmat. Urmează trendul curent.`,
      confidence: 70,
    };
  }
  if (current < 20) {
    return {
      indicator: 'ADX',
      direction: 'hold',
      strength: 'weak',
      reason: `ADX la ${current} — piață fără trend clar. Evită pozițiile trend-following.`,
      confidence: 55,
    };
  }
  
  return null;
}

// ============ SUPPORT / RESISTANCE ============

function findSupportResistance(candles: CandleData[]): { support: number; resistance: number } {
  if (candles.length < 5) {
    const price = candles[candles.length - 1]?.close ?? 0;
    return { support: price * 0.95, resistance: price * 1.05 };
  }
  
  const recent = candles.slice(-20);
  const lows = recent.map(c => c.low);
  const highs = recent.map(c => c.high);
  
  lows.sort((a, b) => a - b);
  highs.sort((a, b) => b - a);
  
  // Use bottom 20% of lows as support, top 20% of highs as resistance
  const n = Math.max(1, Math.floor(recent.length * 0.2));
  const support = lows.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const resistance = highs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  
  return { support, resistance };
}

// ============ MAIN SIGNAL GENERATOR ============

const DISCLAIMER_RO = '⚠️ AVERTISMENT: Acestea sunt semnale tehnice generate automat, NU recomandări de investiții. Investițiile implică risc de pierdere a capitalului. Consultă un consilier financiar autorizat înainte de a lua decizii. Performanța trecută nu garantează rezultate viitoare.';

export function generateSignals(candles: CandleData[]): SignalSummary {
  const analysis = fullAnalysis(candles);
  const closes = candles.map(c => c.close);
  const signals: TradingSignal[] = [];
  
  // Generate individual signals
  const generators = [
    () => generateRSISignal(analysis.rsi14),
    () => generateMACDSignal(analysis.macd),
    () => generateBollingerSignal(analysis.bollingerBands, closes),
    () => generateStochasticSignal(analysis.stochastic),
    () => generateSuperTrendSignal(analysis.superTrend),
    () => generateSMASignal(analysis.sma20, analysis.sma50, closes),
    () => generateADXSignal(analysis.adx14),
  ];
  
  for (const gen of generators) {
    const signal = gen();
    if (signal) signals.push(signal);
  }
  
  // Add candlestick pattern signals
  const recentPatterns = analysis.patterns.filter(p => p.index >= candles.length - 3);
  for (const pattern of recentPatterns) {
    signals.push({
      indicator: `Pattern: ${pattern.name}`,
      direction: pattern.type === 'bullish' ? 'buy' : pattern.type === 'bearish' ? 'sell' : 'hold',
      strength: pattern.reliability === 'high' ? 'strong' : pattern.reliability === 'medium' ? 'moderate' : 'weak',
      reason: `Patern candlestick "${pattern.name}" detectat — semnal ${pattern.type === 'bullish' ? 'bullish' : pattern.type === 'bearish' ? 'bearish' : 'neutru'}.`,
      confidence: pattern.reliability === 'high' ? 75 : pattern.reliability === 'medium' ? 60 : 45,
    });
  }
  
  // Calculate overall signal
  let buyScore = 0, sellScore = 0, holdScore = 0;
  for (const s of signals) {
    const weight = s.strength === 'strong' ? 3 : s.strength === 'moderate' ? 2 : 1;
    if (s.direction === 'buy') buyScore += weight * s.confidence;
    else if (s.direction === 'sell') sellScore += weight * s.confidence;
    else holdScore += weight * s.confidence;
  }
  
  const total = buyScore + sellScore + holdScore || 1;
  let overallSignal: SignalDirection;
  let overallConfidence: number;
  
  if (buyScore > sellScore && buyScore > holdScore) {
    overallSignal = 'buy';
    overallConfidence = Math.round((buyScore / total) * 100);
  } else if (sellScore > buyScore && sellScore > holdScore) {
    overallSignal = 'sell';
    overallConfidence = Math.round((sellScore / total) * 100);
  } else {
    overallSignal = 'hold';
    overallConfidence = Math.round((holdScore / total) * 100);
  }
  
  // Determine trend
  const st = last(analysis.superTrend);
  const lastRsi = last(analysis.rsi14);
  const trendDirection = st?.direction === 1 ? 'uptrend' : st?.direction === -1 ? 'downtrend' : 'sideways';
  
  // Determine volatility
  const lastATR = last(analysis.atr14);
  const lastClose = last(closes) ?? 1;
  const atrPct = lastATR ? (lastATR / lastClose) * 100 : 0;
  const volatility = atrPct > 3 ? 'high' : atrPct > 1.5 ? 'medium' : 'low';
  
  // Determine momentum
  const momentum = lastRsi !== undefined
    ? (lastRsi > 60 ? 'bullish' : lastRsi < 40 ? 'bearish' : 'neutral')
    : 'neutral';
  
  // Support / Resistance
  const { support, resistance } = findSupportResistance(candles);
  const riskRewardRatio = lastClose > 0
    ? (resistance - lastClose) / Math.max(lastClose - support, 0.01)
    : 1;
  
  return {
    overallSignal,
    overallConfidence,
    signals,
    trendDirection,
    volatility,
    momentum,
    supportLevel: +support.toFixed(2),
    resistanceLevel: +resistance.toFixed(2),
    riskRewardRatio: +riskRewardRatio.toFixed(2),
    disclaimer: DISCLAIMER_RO,
  };
}

// ============ BACKTESTING ============

export function backtestSMAStrategy(
  candles: CandleData[],
  fastPeriod = 20,
  slowPeriod = 50,
): BacktestResult {
  const closes = candles.map(c => c.close);
  const fast = smaForBacktest(closes, fastPeriod);
  const slow = smaForBacktest(closes, slowPeriod);
  
  const trades: BacktestTrade[] = [];
  let inPosition = false;
  let entryPrice = 0;
  let entryDate = '';
  
  const startIdx = slowPeriod;
  
  for (let i = startIdx; i < closes.length; i++) {
    const fv = fast[i], sv = slow[i];
    const fpv = fast[i - 1], spv = slow[i - 1];
    if (fv === undefined || sv === undefined || fpv === undefined || spv === undefined) continue;
    
    if (!inPosition && fpv <= spv && fv > sv) {
      inPosition = true;
      entryPrice = closes[i];
      entryDate = candles[i].date || `Day ${i}`;
    } else if (inPosition && fpv >= spv && fv < sv) {
      inPosition = false;
      const exitPrice = closes[i];
      trades.push({
        entryDate,
        exitDate: candles[i].date || `Day ${i}`,
        entryPrice,
        exitPrice,
        returnPct: +((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
        type: 'long',
      });
    }
  }
  
  // Close open position
  if (inPosition && closes.length > 0) {
    const exitPrice = closes[closes.length - 1];
    trades.push({
      entryDate,
      exitDate: candles[candles.length - 1].date || 'End',
      entryPrice,
      exitPrice,
      returnPct: +((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
      type: 'long',
    });
  }
  
  return calculateBacktestMetrics(`SMA ${fastPeriod}/${slowPeriod} Crossover`, trades, candles.length);
}

export function backtestRSIStrategy(
  candles: CandleData[],
  buyThreshold = 30,
  sellThreshold = 70,
  period = 14,
): BacktestResult {
  const closes = candles.map(c => c.close);
  const { rsi: rsiCalc } = await_import();
  const rsiValues = rsiCalc(closes, period);
  
  const trades: BacktestTrade[] = [];
  let inPosition = false;
  let entryPrice = 0;
  let entryDate = '';
  
  const offset = closes.length - rsiValues.length;
  
  for (let i = 0; i < rsiValues.length; i++) {
    const idx = i + offset;
    if (!inPosition && rsiValues[i] < buyThreshold) {
      inPosition = true;
      entryPrice = closes[idx];
      entryDate = candles[idx].date || `Day ${idx}`;
    } else if (inPosition && rsiValues[i] > sellThreshold) {
      inPosition = false;
      trades.push({
        entryDate,
        exitDate: candles[idx].date || `Day ${idx}`,
        entryPrice,
        exitPrice: closes[idx],
        returnPct: +((closes[idx] - entryPrice) / entryPrice * 100).toFixed(2),
        type: 'long',
      });
    }
  }
  
  if (inPosition) {
    const exitPrice = closes[closes.length - 1];
    trades.push({
      entryDate,
      exitDate: candles[candles.length - 1].date || 'End',
      entryPrice,
      exitPrice,
      returnPct: +((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
      type: 'long',
    });
  }
  
  return calculateBacktestMetrics(`RSI ${period} (${buyThreshold}/${sellThreshold})`, trades, candles.length);
}

// Helper to avoid circular import
function await_import() {
  // RSI is in the same module tree
  const rsiCalc = (values: number[], period: number) => {
    if (period <= 0 || values.length <= period) return [];
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? Math.abs(diff) : 0);
    }
    let avgGain = gains.slice(0, period).reduce((s, g) => s + g, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((s, l) => s + l, 0) / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(+(100 - 100 / (1 + rs)).toFixed(2));
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(+(100 - 100 / (1 + rs)).toFixed(2));
    }
    return result;
  };
  return { rsi: rsiCalc };
}

function smaForBacktest(values: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = new Array(values.length).fill(undefined);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result[i] = sum / period;
  }
  return result;
}

function calculateBacktestMetrics(
  strategy: string, trades: BacktestTrade[], totalBars: number,
): BacktestResult {
  if (trades.length === 0) {
    return {
      strategy, totalReturn: 0, annualizedReturn: 0, maxDrawdown: 0,
      winRate: 0, totalTrades: 0, profitFactor: 0, sharpeRatio: 0, trades: [],
    };
  }
  
  const wins = trades.filter(t => t.returnPct > 0);
  const losses = trades.filter(t => t.returnPct <= 0);
  const totalReturn = trades.reduce((s, t) => s * (1 + t.returnPct / 100), 1) - 1;
  const annualized = totalBars > 0 ? ((1 + totalReturn) ** (252 / totalBars) - 1) * 100 : 0;
  
  const grossProfit = wins.reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0));
  
  // Max drawdown
  let peak = 1, maxDD = 0, equity = 1;
  for (const t of trades) {
    equity *= (1 + t.returnPct / 100);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  
  // Sharpe (simplified)
  const returns = trades.map(t => t.returnPct);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length,
  );
  const sharpe = stdReturn === 0 ? 0 : (avgReturn / stdReturn) * Math.sqrt(252 / (totalBars / trades.length));
  
  return {
    strategy,
    totalReturn: +(totalReturn * 100).toFixed(2),
    annualizedReturn: +annualized.toFixed(2),
    maxDrawdown: +(maxDD * 100).toFixed(2),
    winRate: +(wins.length / trades.length * 100).toFixed(1),
    totalTrades: trades.length,
    profitFactor: grossLoss === 0 ? grossProfit : +(grossProfit / grossLoss).toFixed(2),
    sharpeRatio: +sharpe.toFixed(2),
    trades,
  };
}

// ============ STRATEGY COMPARISON ============

export interface StrategyComparison {
  strategies: BacktestResult[];
  bestStrategy: string;
  recommendation: string;
}

export function compareStrategies(candles: CandleData[]): StrategyComparison {
  const sma2050 = backtestSMAStrategy(candles, 20, 50);
  const sma1030 = backtestSMAStrategy(candles, 10, 30);
  const rsiDefault = backtestRSIStrategy(candles, 30, 70);
  const rsiAggressive = backtestRSIStrategy(candles, 25, 75);
  
  const strategies = [sma2050, sma1030, rsiDefault, rsiAggressive];
  
  // Score: return * 0.4 + sharpe * 0.3 + (1 - maxDD/100) * 0.3
  const scored = strategies.map(s => ({
    ...s,
    score: s.totalReturn * 0.4 + s.sharpeRatio * 30 + (1 - s.maxDrawdown / 100) * 30,
  }));
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  
  return {
    strategies,
    bestStrategy: best.strategy,
    recommendation: `Strategia "${best.strategy}" a avut cel mai bun scor ajustat la risc: randament ${best.totalReturn}%, Sharpe ${best.sharpeRatio}, drawdown maxim ${best.maxDrawdown}%. ${DISCLAIMER_RO}`,
  };
}
