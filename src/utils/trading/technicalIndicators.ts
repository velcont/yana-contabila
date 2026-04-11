/**
 * Technical Indicators Engine for YANA Trading Module
 * Adapted from: fast-technical-indicators (MIT License)
 * Zero dependencies — all calculations pure TypeScript
 */

// ============ TYPES ============

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  date?: string;
}

export interface MACDOutput {
  MACD: number;
  signal?: number;
  histogram?: number;
}

export interface BollingerBandsOutput {
  upper: number;
  middle: number;
  lower: number;
  pb: number;     // %B — where price sits relative to bands
  width: number;  // bandwidth
}

export interface StochasticOutput {
  k: number;
  d?: number;
}

export interface SuperTrendOutput {
  supertrend: number;
  direction: number; // 1 = uptrend, -1 = downtrend
}

// ============ MOVING AVERAGES ============

/** Simple Moving Average */
export function sma(values: number[], period: number): number[] {
  if (period <= 0 || period > values.length) return [];
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result.push(sum / period);
  }
  return result;
}

/** Exponential Moving Average */
export function ema(values: number[], period: number): number[] {
  if (period <= 0 || period > values.length) return [];
  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  
  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  result.push(prev);
  
  for (let i = period; i < values.length; i++) {
    prev = (values[i] - prev) * multiplier + prev;
    result.push(prev);
  }
  return result;
}

/** Weighted Moving Average */
export function wma(values: number[], period: number): number[] {
  if (period <= 0 || period > values.length) return [];
  const result: number[] = [];
  const divisor = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j] * (j + 1);
    }
    result.push(sum / divisor);
  }
  return result;
}

// ============ OSCILLATORS ============

/** Relative Strength Index */
export function rsi(values: number[], period = 14): number[] {
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
}

/** MACD — Moving Average Convergence Divergence */
export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDOutput[] {
  if (values.length < slowPeriod) return [];
  
  const fastMA = ema(values, fastPeriod);
  const slowMA = ema(values, slowPeriod);
  const offset = slowPeriod - fastPeriod;
  
  const macdLine: number[] = [];
  for (let i = 0; i < slowMA.length; i++) {
    macdLine.push(fastMA[i + offset] - slowMA[i]);
  }
  
  const signalLine = ema(macdLine, signalPeriod);
  const result: MACDOutput[] = [];
  
  for (let i = 0; i < macdLine.length; i++) {
    const sig = i >= signalPeriod - 1 ? signalLine[i - signalPeriod + 1] : undefined;
    result.push({
      MACD: macdLine[i],
      signal: sig,
      histogram: sig !== undefined ? macdLine[i] - sig : undefined,
    });
  }
  return result;
}

/** Stochastic Oscillator */
export function stochastic(
  high: number[], low: number[], close: number[],
  period = 14, signalPeriod = 3,
): StochasticOutput[] {
  if (close.length < period) return [];
  
  const kValues: number[] = [];
  for (let i = period - 1; i < close.length; i++) {
    const hh = Math.max(...high.slice(i - period + 1, i + 1));
    const ll = Math.min(...low.slice(i - period + 1, i + 1));
    kValues.push(hh === ll ? 50 : ((close[i] - ll) / (hh - ll)) * 100);
  }
  
  const dValues = sma(kValues, signalPeriod);
  return kValues.map((k, i) => ({
    k,
    d: i >= signalPeriod - 1 ? dValues[i - signalPeriod + 1] : undefined,
  }));
}

// ============ VOLATILITY ============

function trueRange(high: number, low: number, prevClose: number): number {
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/** Average True Range */
export function atr(high: number[], low: number[], close: number[], period = 14): number[] {
  if (close.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < close.length; i++) {
    trs.push(trueRange(high[i], low[i], close[i - 1]));
  }
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  let current = sum / period;
  const result = [current];
  
  for (let i = period; i < trs.length; i++) {
    current = ((current * (period - 1)) + trs[i]) / period;
    result.push(current);
  }
  return result;
}

/** Bollinger Bands */
export function bollingerBands(
  values: number[], period = 20, stdDev = 2,
): BollingerBandsOutput[] {
  if (values.length < period) return [];
  
  const smaValues = sma(values, period);
  const result: BollingerBandsOutput[] = [];
  
  for (let i = 0; i < smaValues.length; i++) {
    const slice = values.slice(i, i + period);
    const middle = smaValues[i];
    const variance = slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = middle + stdDev * sd;
    const lower = middle - stdDev * sd;
    
    result.push({
      upper, middle, lower,
      pb: (values[i + period - 1] - lower) / (upper - lower),
      width: (upper - lower) / middle,
    });
  }
  return result;
}

// ============ TREND ============

/** SuperTrend Indicator */
export function superTrend(
  high: number[], low: number[], close: number[],
  period = 10, multiplier = 3,
): SuperTrendOutput[] {
  const atrValues = atr(high, low, close, period);
  if (atrValues.length === 0) return [];
  
  const result: SuperTrendOutput[] = [];
  let prevUpper: number | undefined;
  let prevLower: number | undefined;
  let prevDir: number | undefined;
  
  for (let i = 0; i < atrValues.length; i++) {
    const idx = i + period;
    const hl2 = (high[idx] + low[idx]) / 2;
    const basicUp = hl2 + multiplier * atrValues[i];
    const basicLo = hl2 - multiplier * atrValues[i];
    
    let finalUp: number, finalLo: number;
    if (i === 0) {
      finalUp = basicUp; finalLo = basicLo;
    } else {
      const pc = close[idx - 1];
      finalUp = (basicUp < prevUpper! || pc > prevUpper!) ? basicUp : prevUpper!;
      finalLo = (basicLo > prevLower! || pc < prevLower!) ? basicLo : prevLower!;
    }
    
    let dir: number, st: number;
    if (prevDir === undefined) {
      dir = close[idx] <= finalLo ? -1 : 1;
      st = dir === 1 ? finalLo : finalUp;
    } else if (prevDir === 1 && close[idx] <= finalLo) {
      dir = -1; st = finalUp;
    } else if (prevDir === -1 && close[idx] >= finalUp) {
      dir = 1; st = finalLo;
    } else {
      dir = prevDir; st = dir === 1 ? finalLo : finalUp;
    }
    
    prevUpper = finalUp; prevLower = finalLo; prevDir = dir;
    result.push({ supertrend: st, direction: dir });
  }
  return result;
}

// ============ VOLUME ============

/** On-Balance Volume */
export function obv(close: number[], volume: number[]): number[] {
  if (close.length !== volume.length || close.length === 0) return [];
  const result = [volume[0]];
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) result.push(result[i - 1] + volume[i]);
    else if (close[i] < close[i - 1]) result.push(result[i - 1] - volume[i]);
    else result.push(result[i - 1]);
  }
  return result;
}

/** Volume Weighted Average Price */
export function vwap(high: number[], low: number[], close: number[], volume: number[]): number[] {
  const result: number[] = [];
  let cumVol = 0, cumTP = 0;
  for (let i = 0; i < close.length; i++) {
    const tp = (high[i] + low[i] + close[i]) / 3;
    cumTP += tp * volume[i];
    cumVol += volume[i];
    result.push(cumVol === 0 ? tp : cumTP / cumVol);
  }
  return result;
}

/** Money Flow Index */
export function mfi(
  high: number[], low: number[], close: number[], volume: number[], period = 14,
): number[] {
  if (close.length < period + 1) return [];
  
  const typicalPrices = close.map((_, i) => (high[i] + low[i] + close[i]) / 3);
  const result: number[] = [];
  
  for (let i = period; i < close.length; i++) {
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const mf = typicalPrices[j] * volume[j];
      if (typicalPrices[j] > typicalPrices[j - 1]) posFlow += mf;
      else negFlow += mf;
    }
    const ratio = negFlow === 0 ? 100 : posFlow / negFlow;
    result.push(+(100 - 100 / (1 + ratio)).toFixed(2));
  }
  return result;
}

// ============ DIRECTIONAL MOVEMENT ============

/** Average Directional Index */
export function adx(
  high: number[], low: number[], close: number[], period = 14,
): number[] {
  if (close.length < period * 2 + 1) return [];
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];
  
  for (let i = 1; i < close.length; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(trueRange(high[i], low[i], close[i - 1]));
  }
  
  // Wilder smoothing
  const smooth = (arr: number[]) => {
    let sum = arr.slice(0, period).reduce((s, v) => s + v, 0);
    const res = [sum];
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      res.push(sum);
    }
    return res;
  };
  
  const sTR = smooth(trs);
  const sPDM = smooth(plusDM);
  const sMDM = smooth(minusDM);
  
  const dx: number[] = [];
  for (let i = 0; i < sTR.length; i++) {
    const pdi = sTR[i] === 0 ? 0 : (sPDM[i] / sTR[i]) * 100;
    const mdi = sTR[i] === 0 ? 0 : (sMDM[i] / sTR[i]) * 100;
    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
  }
  
  if (dx.length < period) return [];
  let adxVal = dx.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const result = [+adxVal.toFixed(2)];
  
  for (let i = period; i < dx.length; i++) {
    adxVal = ((adxVal * (period - 1)) + dx[i]) / period;
    result.push(+adxVal.toFixed(2));
  }
  return result;
}

// ============ CANDLESTICK PATTERNS ============

export type CandlePattern = {
  index: number;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: 'low' | 'medium' | 'high';
};

/** Detect common candlestick patterns */
export function detectCandlePatterns(candles: CandleData[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;
    
    // Doji
    if (range > 0 && body / range < 0.1) {
      patterns.push({ index: i, name: 'Doji', type: 'neutral', reliability: 'medium' });
    }
    
    // Hammer (bullish reversal)
    if (lowerShadow > body * 2 && upperShadow < body * 0.3 && range > 0) {
      patterns.push({ index: i, name: 'Hammer', type: 'bullish', reliability: 'medium' });
    }
    
    // Shooting Star (bearish reversal)
    if (upperShadow > body * 2 && lowerShadow < body * 0.3 && range > 0) {
      patterns.push({ index: i, name: 'Shooting Star', type: 'bearish', reliability: 'medium' });
    }
    
    // Engulfing patterns (need previous candle)
    if (i > 0) {
      const prev = candles[i - 1];
      const prevBody = Math.abs(prev.close - prev.open);
      
      // Bullish Engulfing
      if (prev.close < prev.open && c.close > c.open &&
          c.open <= prev.close && c.close >= prev.open && body > prevBody) {
        patterns.push({ index: i, name: 'Bullish Engulfing', type: 'bullish', reliability: 'high' });
      }
      
      // Bearish Engulfing
      if (prev.close > prev.open && c.close < c.open &&
          c.open >= prev.close && c.close <= prev.open && body > prevBody) {
        patterns.push({ index: i, name: 'Bearish Engulfing', type: 'bearish', reliability: 'high' });
      }
    }
    
    // Three White Soldiers / Three Black Crows
    if (i >= 2) {
      const c2 = candles[i - 2], c1 = candles[i - 1];
      if (c2.close > c2.open && c1.close > c1.open && c.close > c.open &&
          c1.open > c2.open && c.open > c1.open &&
          c1.close > c2.close && c.close > c1.close) {
        patterns.push({ index: i, name: 'Three White Soldiers', type: 'bullish', reliability: 'high' });
      }
      if (c2.close < c2.open && c1.close < c1.open && c.close < c.open &&
          c1.open < c2.open && c.open < c1.open &&
          c1.close < c2.close && c.close < c1.close) {
        patterns.push({ index: i, name: 'Three Black Crows', type: 'bearish', reliability: 'high' });
      }
    }
    
    // Marubozu (strong momentum)
    if (range > 0 && body / range > 0.95) {
      patterns.push({
        index: i,
        name: c.close > c.open ? 'Bullish Marubozu' : 'Bearish Marubozu',
        type: c.close > c.open ? 'bullish' : 'bearish',
        reliability: 'medium',
      });
    }
  }
  
  return patterns;
}

// ============ CONVENIENCE: Full Analysis ============

export interface TechnicalAnalysisResult {
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  rsi14: number[];
  macd: MACDOutput[];
  bollingerBands: BollingerBandsOutput[];
  stochastic: StochasticOutput[];
  atr14: number[];
  adx14: number[];
  superTrend: SuperTrendOutput[];
  obv: number[];
  patterns: CandlePattern[];
}

/** Run full technical analysis on candle data */
export function fullAnalysis(candles: CandleData[]): TechnicalAnalysisResult {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume ?? 0);
  
  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    ema12: ema(closes, 12),
    ema26: ema(closes, 26),
    rsi14: rsi(closes, 14),
    macd: macd(closes),
    bollingerBands: bollingerBands(closes),
    stochastic: stochastic(highs, lows, closes),
    atr14: atr(highs, lows, closes),
    adx14: adx(highs, lows, closes),
    superTrend: superTrend(highs, lows, closes),
    obv: obv(closes, volumes),
    patterns: detectCandlePatterns(candles),
  };
}
