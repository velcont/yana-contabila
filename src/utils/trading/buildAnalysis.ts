/**
 * Builds TradingAnalysisData from the trading utils for inline chat artifacts.
 * Called when Yana detects a trading-related query.
 */

import {
  fullAnalysis,
  generateSignals,
  compareStrategies,
  buildSentimentReport,
  combineTechAndSentiment,
  type CandleData,
} from '@/utils/trading';
import type { TradingAnalysisData } from '@/components/yana/TradingAnalysisArtifact';

/** Generate realistic sample candles for demo/testing */
export function generateSampleCandles(symbol: string, days = 100): CandleData[] {
  const candles: CandleData[] = [];
  const basePrices: Record<string, number> = {
    AAPL: 185, TSLA: 245, MSFT: 415, NVDA: 880, AMZN: 185, GOOGL: 170,
    META: 500, AMD: 160, INTC: 30, NFLX: 620, BRK: 410, JPM: 195,
  };
  let price = basePrices[symbol.toUpperCase()] ?? 100;
  
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * price * 0.03;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.015;
    const low = Math.min(open, close) - Math.random() * price * 0.015;
    const volume = Math.floor(50_000_000 + Math.random() * 100_000_000);
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    candles.push({ open, high, low, close, volume, date: d.toISOString().split('T')[0] });
    price = close;
  }
  return candles;
}

/** Build a complete TradingAnalysisData object for the artifact renderer */
export function buildTradingAnalysis(symbol: string): TradingAnalysisData {
  const sym = symbol.toUpperCase();
  const candles = generateSampleCandles(sym);
  const analysis = fullAnalysis(candles);
  const signals = generateSignals(candles);
  const strategies = compareStrategies(candles);

  const sentiment = buildSentimentReport(sym, sym, {
    reddit: { buzzScore: 65 + Math.round(Math.random() * 20), bullishPct: 55 + Math.round(Math.random() * 20), trend: 'rising', metricValue: 1200 },
    news: { buzzScore: 50 + Math.round(Math.random() * 20), bullishPct: 50 + Math.round(Math.random() * 20), trend: 'stable', metricValue: 30 },
    analyst: { buzzScore: 70 + Math.round(Math.random() * 15), bullishPct: 60 + Math.round(Math.random() * 20), trend: 'rising', metricValue: 10 },
  });

  const combined = combineTechAndSentiment(signals.overallSignal, signals.overallConfidence, sentiment);

  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const prevClose = candles[candles.length - 2]?.close ?? lastClose;
  const dayChange = ((lastClose - prevClose) / prevClose) * 100;

  const last = <T,>(arr: T[]): T | undefined => arr[arr.length - 1];

  const combinedSignal = combined.alignment === 'confirmed'
    ? combined.technicalSignal
    : combined.alignment === 'divergent' ? 'hold' as const : combined.technicalSignal;

  return {
    symbol: sym,
    price: lastClose,
    dayChange,
    indicators: {
      rsi14: last(analysis.rsi14),
      sma20: last(analysis.sma20),
      sma50: last(analysis.sma50),
      ema12: last(analysis.ema12),
      macdValue: last(analysis.macd)?.MACD,
      macdSignal: last(analysis.macd)?.signal ?? undefined,
      bbUpper: last(analysis.bollingerBands)?.upper,
      bbLower: last(analysis.bollingerBands)?.lower,
      bbPB: last(analysis.bollingerBands)?.pb,
      atr14: last(analysis.atr14),
      adx14: last(analysis.adx14),
      superTrend: last(analysis.superTrend)?.supertrend,
      superTrendDir: last(analysis.superTrend)?.direction,
      obv: analysis.obv.length > 0 ? (last(analysis.obv)! / 1e6).toFixed(1) + 'M' : undefined,
    },
    patterns: analysis.patterns.slice(-10).map(p => ({ name: p.name, type: p.type })),
    signals: {
      overall: signals.overallSignal,
      confidence: signals.overallConfidence,
      trend: signals.trendDirection,
      volatility: signals.volatility,
      momentum: signals.momentum,
      support: signals.supportLevel,
      resistance: signals.resistanceLevel,
      riskReward: signals.riskRewardRatio,
      individual: signals.signals.map(s => ({
        indicator: s.indicator,
        direction: s.direction,
        strength: s.strength,
        reason: s.reason,
        confidence: s.confidence,
      })),
      disclaimer: signals.disclaimer,
    },
    sentiment: {
      overall: sentiment.overallSentiment,
      score: sentiment.overallScore,
      fearGreed: sentiment.fearGreedIndex,
      fearGreedLabel: sentiment.fearGreedLabel,
      sources: sentiment.sources.map(s => ({
        label: s.label,
        buzzScore: s.buzzScore,
        bullishPct: s.bullishPct,
        confidence: s.confidence,
      })),
      signals: sentiment.signals.map(s => ({ type: s.type, title: s.title, description: s.description })),
    },
    combined: {
      signal: combinedSignal,
      confidence: combined.combinedConfidence,
      alignment: combined.alignment,
      recommendation: combined.recommendation,
    },
    backtest: {
      strategies: strategies.strategies.map(s => ({
        strategy: s.strategy,
        totalReturn: s.totalReturn,
        maxDrawdown: s.maxDrawdown,
        winRate: s.winRate,
        sharpe: s.sharpeRatio,
        trades: s.totalTrades,
        profitFactor: s.profitFactor,
      })),
      best: strategies.bestStrategy,
      recommendation: strategies.recommendation,
    },
  };
}

/** Check if a user message is about trading/technical analysis */
export function isTradingAnalysisQuery(message: string): string | null {
  const lower = message.toLowerCase();
  
  // Check for explicit analysis triggers
  const triggers = [
    'analiză tehnică', 'analiza tehnica', 'technical analysis',
    'indicatori tehnici', 'semnale trading', 'trading signals',
    'backtesting', 'backtest',
    'fear and greed', 'fear & greed',
    'rsi ', 'macd ', 'bollinger', 'supertrend',
    'analizează acțiunea', 'analizeaza actiunea',
    'analizează simbolul', 'analizeaza simbolul',
  ];
  
  const hasTrigger = triggers.some(t => lower.includes(t));
  if (!hasTrigger) return null;
  
  // Try to extract symbol
  const symbolMatch = message.match(/\b([A-Z]{2,5})\b/);
  if (symbolMatch) return symbolMatch[1];
  
  // Common stock names
  const nameMap: Record<string, string> = {
    apple: 'AAPL', tesla: 'TSLA', microsoft: 'MSFT', nvidia: 'NVDA',
    amazon: 'AMZN', google: 'GOOGL', meta: 'META', netflix: 'NFLX',
    amd: 'AMD', intel: 'INTC',
  };
  
  for (const [name, sym] of Object.entries(nameMap)) {
    if (lower.includes(name)) return sym;
  }
  
  return 'AAPL'; // default
}
