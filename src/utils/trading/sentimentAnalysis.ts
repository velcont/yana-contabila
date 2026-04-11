/**
 * Multi-Source Sentiment Analysis Engine for YANA Trading
 * Adapted from: OpenStock / Adanos sentiment system (AGPL-3.0)
 * Provides aggregated sentiment from multiple data sources
 */

// ============ TYPES ============

export type SentimentSource = 'reddit' | 'x' | 'news' | 'polymarket' | 'analyst';
export type SentimentTrend = 'rising' | 'falling' | 'stable';
export type SentimentBias = 'bullish' | 'bearish' | 'neutral' | 'mixed';

export interface SourceSentiment {
  source: SentimentSource;
  label: string;
  buzzScore: number;          // 0-100 — câtă atenție primește
  bullishPct: number | null;  // 0-100 — % bullish
  trend: SentimentTrend | null;
  metricLabel: string;
  metricValue: number;
  confidence: number;         // 0-100
}

export interface StockSentimentReport {
  symbol: string;
  companyName: string | null;
  overallSentiment: SentimentBias;
  overallScore: number;        // -100 (very bearish) to +100 (very bullish)
  averageBuzz: number;
  sourceAlignment: string;
  availableSources: number;
  sources: SourceSentiment[];
  fearGreedIndex: number;      // 0 (extreme fear) to 100 (extreme greed)
  fearGreedLabel: string;
  signals: SentimentSignal[];
  timestamp: string;
  disclaimer: string;
}

export interface SentimentSignal {
  type: 'bullish' | 'bearish' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number;
}

export interface MarketSentimentOverview {
  marketMood: SentimentBias;
  fearGreedIndex: number;
  fearGreedLabel: string;
  topBullish: { symbol: string; score: number }[];
  topBearish: { symbol: string; score: number }[];
  hotTopics: string[];
  timestamp: string;
}

// ============ SOURCE CONFIGURATION ============

const SOURCE_CONFIG: Record<SentimentSource, {
  label: string;
  weight: number;
  metricLabel: string;
}> = {
  reddit: { label: 'Reddit', weight: 0.2, metricLabel: 'Mențiuni' },
  x: { label: 'X.com (Twitter)', weight: 0.2, metricLabel: 'Mențiuni' },
  news: { label: 'Știri Financiare', weight: 0.3, metricLabel: 'Articole' },
  polymarket: { label: 'Polymarket', weight: 0.15, metricLabel: 'Tranzacții' },
  analyst: { label: 'Analiști', weight: 0.15, metricLabel: 'Rapoarte' },
};

// ============ SENTIMENT CALCULATION ============

function classifySentiment(score: number): SentimentBias {
  if (score > 30) return 'bullish';
  if (score < -30) return 'bearish';
  if (score > -10 && score < 10) return 'neutral';
  return 'mixed';
}

function calculateSourceAlignment(sources: SourceSentiment[]): string {
  const bullishValues = sources
    .map(s => s.bullishPct)
    .filter((v): v is number => v !== null);
  
  if (bullishValues.length === 0) return 'Fără date de sentiment';
  if (bullishValues.length === 1) return 'O singură sursă disponibilă';
  
  const min = Math.min(...bullishValues);
  const max = Math.max(...bullishValues);
  const spread = max - min;
  const avg = bullishValues.reduce((s, v) => s + v, 0) / bullishValues.length;
  
  if (spread <= 12 && avg >= 60) return '🟢 Aliniere bullish — toate sursele sunt optimiste';
  if (spread <= 12 && avg <= 40) return '🔴 Aliniere bearish — toate sursele sunt pesimiste';
  if (spread <= 12) return '🟡 Consens strâns — sursele sunt de acord';
  if (spread >= 25) return '⚠️ Divergență mare — opinii contradictorii';
  return '🔄 Sentiment mixt';
}

function calculateFearGreed(overallScore: number, buzzAvg: number): { index: number; label: string } {
  // Normalize: overallScore [-100,100] → [0,100], adjust by buzz
  const base = (overallScore + 100) / 2;
  const buzzFactor = buzzAvg > 70 ? 1.1 : buzzAvg < 30 ? 0.9 : 1;
  const index = Math.max(0, Math.min(100, Math.round(base * buzzFactor)));
  
  let label: string;
  if (index <= 15) label = 'Frică Extremă';
  else if (index <= 30) label = 'Frică';
  else if (index <= 45) label = 'Precauție';
  else if (index <= 55) label = 'Neutru';
  else if (index <= 70) label = 'Optimism';
  else if (index <= 85) label = 'Lăcomie';
  else label = 'Lăcomie Extremă';
  
  return { index, label };
}

// ============ SIGNAL GENERATION ============

function generateSentimentSignals(
  sources: SourceSentiment[],
  overallScore: number,
  fearGreed: number,
): SentimentSignal[] {
  const signals: SentimentSignal[] = [];
  
  // Extreme fear = contrarian buy signal
  if (fearGreed <= 20) {
    signals.push({
      type: 'bullish',
      title: 'Frică extremă pe piață',
      description: 'Indicele Fear & Greed este foarte scăzut. Istoric, momentele de frică extremă au fost oportunități de cumpărare (strategia contrarian).',
      confidence: 65,
    });
  }
  
  // Extreme greed = contrarian sell signal
  if (fearGreed >= 80) {
    signals.push({
      type: 'bearish',
      title: 'Lăcomie extremă pe piață',
      description: 'Indicele Fear & Greed este foarte ridicat. Atenție la posibile corecții — piața este prea optimistă.',
      confidence: 60,
    });
  }
  
  // Source divergence warning
  const bullishValues = sources.map(s => s.bullishPct).filter((v): v is number => v !== null);
  if (bullishValues.length >= 2) {
    const spread = Math.max(...bullishValues) - Math.min(...bullishValues);
    if (spread > 30) {
      signals.push({
        type: 'warning',
        title: 'Divergență între surse',
        description: `Sursele de sentiment diferă semnificativ (spread ${spread.toFixed(0)}%). Analizează fiecare sursă individual.`,
        confidence: 50,
      });
    }
  }
  
  // High buzz with strong sentiment
  const highBuzzSources = sources.filter(s => s.buzzScore > 70);
  if (highBuzzSources.length > 0 && Math.abs(overallScore) > 40) {
    const direction = overallScore > 0 ? 'bullish' : 'bearish';
    signals.push({
      type: direction === 'bullish' ? 'bullish' : 'bearish',
      title: `Buzz ridicat cu sentiment ${direction === 'bullish' ? 'pozitiv' : 'negativ'}`,
      description: `${highBuzzSources.map(s => s.label).join(', ')} — volum mare de discuții cu direcție clară ${direction}.`,
      confidence: 70,
    });
  }
  
  // News vs Social divergence
  const newsSentiment = sources.find(s => s.source === 'news');
  const socialSources = sources.filter(s => s.source === 'reddit' || s.source === 'x');
  if (newsSentiment?.bullishPct != null && socialSources.length > 0) {
    const socialAvg = socialSources
      .filter(s => s.bullishPct != null)
      .reduce((s, src) => s + src.bullishPct!, 0) / socialSources.length;
    
    if (Math.abs(newsSentiment.bullishPct - socialAvg) > 25) {
      signals.push({
        type: 'info',
        title: 'Divergență știri vs. social media',
        description: `Știrile indică ${newsSentiment.bullishPct > 50 ? 'optimism' : 'pesimism'} (${newsSentiment.bullishPct}% bullish), dar social media arată ${socialAvg > 50 ? 'optimism' : 'pesimism'} (${socialAvg.toFixed(0)}% bullish).`,
        confidence: 55,
      });
    }
  }
  
  return signals;
}

// ============ PUBLIC API ============

/**
 * Build a sentiment report from raw source data.
 * Use this when you have sentiment data from Perplexity or other sources.
 */
export function buildSentimentReport(
  symbol: string,
  companyName: string | null,
  rawSources: Partial<Record<SentimentSource, {
    buzzScore: number;
    bullishPct: number | null;
    trend: SentimentTrend | null;
    metricValue: number;
  }>>,
): StockSentimentReport {
  const sources: SourceSentiment[] = [];
  
  for (const [key, data] of Object.entries(rawSources)) {
    const source = key as SentimentSource;
    const config = SOURCE_CONFIG[source];
    if (!config || !data) continue;
    
    sources.push({
      source,
      label: config.label,
      buzzScore: data.buzzScore,
      bullishPct: data.bullishPct,
      trend: data.trend,
      metricLabel: config.metricLabel,
      metricValue: data.metricValue,
      confidence: Math.min(100, data.buzzScore + (data.metricValue > 10 ? 20 : 0)),
    });
  }
  
  // Calculate weighted overall score
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const s of sources) {
    if (s.bullishPct === null) continue;
    const config = SOURCE_CONFIG[s.source];
    const normalizedScore = (s.bullishPct - 50) * 2; // -100 to +100
    weightedSum += normalizedScore * config.weight * (s.confidence / 100);
    totalWeight += config.weight * (s.confidence / 100);
  }
  
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const averageBuzz = sources.length > 0
    ? sources.reduce((s, src) => s + src.buzzScore, 0) / sources.length
    : 0;
  
  const { index: fearGreedIndex, label: fearGreedLabel } = calculateFearGreed(overallScore, averageBuzz);
  
  return {
    symbol: symbol.toUpperCase(),
    companyName,
    overallSentiment: classifySentiment(overallScore),
    overallScore,
    averageBuzz: Math.round(averageBuzz),
    sourceAlignment: calculateSourceAlignment(sources),
    availableSources: sources.length,
    sources,
    fearGreedIndex,
    fearGreedLabel,
    signals: generateSentimentSignals(sources, overallScore, fearGreedIndex),
    timestamp: new Date().toISOString(),
    disclaimer: '⚠️ Analiza de sentiment nu constituie recomandare de investiții. Sentimentul pieței se poate schimba rapid. Deciziile de investiții trebuie luate pe bază de analiză fundamentală și tehnică completă.',
  };
}

/**
 * Parse AI/Perplexity response into structured sentiment data.
 * Useful when Yana gets sentiment info from search/Perplexity.
 */
export function parseSentimentFromText(
  symbol: string,
  text: string,
): StockSentimentReport {
  // Extract sentiment cues from text
  const bullishTerms = ['bullish', 'optimist', 'creștere', 'rally', 'buy', 'cumpăr', 'pozitiv', 'urc'];
  const bearishTerms = ['bearish', 'pesimist', 'scădere', 'sell', 'vând', 'negativ', 'corecție', 'risc'];
  
  const lower = text.toLowerCase();
  let bullishHits = 0, bearishHits = 0;
  
  for (const term of bullishTerms) {
    const matches = lower.split(term).length - 1;
    bullishHits += matches;
  }
  for (const term of bearishTerms) {
    const matches = lower.split(term).length - 1;
    bearishHits += matches;
  }
  
  const total = bullishHits + bearishHits || 1;
  const bullishPct = Math.round((bullishHits / total) * 100);
  
  // Estimate buzz from text length and exclamation marks
  const buzzScore = Math.min(100, Math.round(text.length / 50 + (text.split('!').length - 1) * 5));
  
  return buildSentimentReport(symbol, null, {
    news: {
      buzzScore,
      bullishPct,
      trend: bullishHits > bearishHits * 1.5 ? 'rising' : bearishHits > bullishHits * 1.5 ? 'falling' : 'stable',
      metricValue: total,
    },
  });
}

/**
 * Combine technical signals with sentiment for a holistic view.
 */
export interface TechSentimentCombined {
  technicalSignal: 'buy' | 'sell' | 'hold';
  sentimentBias: SentimentBias;
  alignment: 'confirmed' | 'divergent' | 'neutral';
  combinedConfidence: number;
  recommendation: string;
}

export function combineTechAndSentiment(
  technicalSignal: 'buy' | 'sell' | 'hold',
  technicalConfidence: number,
  sentimentReport: StockSentimentReport,
): TechSentimentCombined {
  const sentBias = sentimentReport.overallSentiment;
  
  const techBullish = technicalSignal === 'buy';
  const techBearish = technicalSignal === 'sell';
  const sentBullish = sentBias === 'bullish';
  const sentBearish = sentBias === 'bearish';
  
  let alignment: 'confirmed' | 'divergent' | 'neutral';
  let combinedConfidence: number;
  let recommendation: string;
  
  if ((techBullish && sentBullish) || (techBearish && sentBearish)) {
    alignment = 'confirmed';
    combinedConfidence = Math.min(95, Math.round(technicalConfidence * 0.6 + Math.abs(sentimentReport.overallScore) * 0.4));
    recommendation = techBullish
      ? `✅ Semnal CUMPĂRARE confirmat de sentiment — tehnicul și sentimentul pieței sunt aliniate bullish. Încredere: ${combinedConfidence}%.`
      : `🔴 Semnal VÂNZARE confirmat de sentiment — tehnicul și sentimentul pieței sunt aliniate bearish. Încredere: ${combinedConfidence}%.`;
  } else if ((techBullish && sentBearish) || (techBearish && sentBullish)) {
    alignment = 'divergent';
    combinedConfidence = Math.round(technicalConfidence * 0.5);
    recommendation = `⚠️ DIVERGENȚĂ: Tehnicul spune "${technicalSignal}" dar sentimentul este "${sentBias}". Prudență recomandată — așteaptă confirmare.`;
  } else {
    alignment = 'neutral';
    combinedConfidence = technicalConfidence;
    recommendation = `🔄 Sentiment neutru. Baza deciziei rămâne analiza tehnică: "${technicalSignal}" cu încredere ${technicalConfidence}%.`;
  }
  
  return {
    technicalSignal,
    sentimentBias: sentBias,
    alignment,
    combinedConfidence,
    recommendation: `${recommendation}\n\n${sentimentReport.disclaimer}`,
  };
}
