/**
 * CFO Financial Health Scoring — Inspired by MikeChongCan/cfo-stack
 * Adapted for Romanian market (RON, CAS/CASS, ANAF compliance)
 */

export interface FinancialMetrics {
  revenue: number;          // CA - Cifra de afaceri
  expenses: number;         // Cheltuieli totale
  netProfit: number;        // Profit net
  cashOnHand: number;       // Disponibil casă + bancă
  accountsReceivable: number; // Creanțe clienți
  accountsPayable: number;   // Datorii furnizori
  inventory: number;        // Stocuri
  totalAssets: number;      // Active totale
  totalLiabilities: number; // Datorii totale
  equity: number;           // Capitaluri proprii
  monthlyBurnRate?: number; // Cheltuieli lunare medii
  ebitda?: number;
}

export interface HealthScore {
  overall: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  category: string;
  breakdown: {
    profitability: { score: number; label: string; details: string };
    liquidity: { score: number; label: string; details: string };
    efficiency: { score: number; label: string; details: string };
    leverage: { score: number; label: string; details: string };
    cashflow: { score: number; label: string; details: string };
  };
  alerts: Alert[];
  recommendations: Recommendation[];
  cashRunway: number | null; // months
}

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

interface Recommendation {
  priority: number;
  action: string;
  impact: string;
  timeframe: string;
}

// Romanian-specific thresholds
const RO_THRESHOLDS = {
  CASA_PLAFON: 50000, // RON
  MICRO_REVENUE_LIMIT: 500000, // EUR equivalent
  CAS_RATE: 0.25,
  CASS_RATE: 0.10,
  INCOME_TAX_RATE: 0.10,
  DIVIDEND_TAX: 0.08,
  MIN_CURRENT_RATIO: 1.0,
  GOOD_CURRENT_RATIO: 2.0,
  MAX_DEBT_EQUITY: 2.0,
  TARGET_DSO: 45,
  TARGET_DPO: 45,
  TARGET_DIO: 60,
};

function scoreProfitability(m: FinancialMetrics): { score: number; label: string; details: string } {
  if (m.revenue === 0) return { score: 0, label: 'Fără venituri', details: 'Nu există cifră de afaceri' };

  const margin = (m.netProfit / m.revenue) * 100;
  const ebitdaMargin = m.ebitda ? (m.ebitda / m.revenue) * 100 : margin * 1.2;

  let score: number;
  if (margin >= 20) score = 100;
  else if (margin >= 10) score = 80;
  else if (margin >= 5) score = 60;
  else if (margin >= 0) score = 40;
  else if (margin >= -10) score = 20;
  else score = 0;

  return {
    score,
    label: margin >= 10 ? 'Excelent' : margin >= 5 ? 'Bun' : margin >= 0 ? 'Marginal' : 'Pierdere',
    details: `Marjă netă: ${margin.toFixed(1)}% | EBITDA: ${ebitdaMargin.toFixed(1)}%`,
  };
}

function scoreLiquidity(m: FinancialMetrics): { score: number; label: string; details: string } {
  const currentAssets = m.cashOnHand + m.accountsReceivable + m.inventory;
  const currentRatio = m.accountsPayable > 0 ? currentAssets / m.accountsPayable : 999;
  const quickRatio = m.accountsPayable > 0
    ? (m.cashOnHand + m.accountsReceivable) / m.accountsPayable
    : 999;

  let score: number;
  if (currentRatio >= 2) score = 100;
  else if (currentRatio >= 1.5) score = 80;
  else if (currentRatio >= 1.0) score = 60;
  else if (currentRatio >= 0.7) score = 30;
  else score = 10;

  return {
    score,
    label: currentRatio >= 1.5 ? 'Solid' : currentRatio >= 1 ? 'Acceptabil' : 'Critic',
    details: `Rata curentă: ${currentRatio.toFixed(2)} | Rata rapidă: ${quickRatio.toFixed(2)}`,
  };
}

function scoreEfficiency(m: FinancialMetrics): { score: number; label: string; details: string } {
  const dso = m.revenue > 0 ? (m.accountsReceivable / m.revenue) * 365 : 0;
  const dpo = m.expenses > 0 ? (m.accountsPayable / m.expenses) * 365 : 0;
  const dio = m.revenue > 0 && m.inventory > 0 ? (m.inventory / m.revenue) * 365 : 0;
  const ccc = dso + dio - dpo; // Cash Conversion Cycle

  let score: number;
  if (ccc <= 30) score = 100;
  else if (ccc <= 60) score = 80;
  else if (ccc <= 90) score = 60;
  else if (ccc <= 120) score = 40;
  else score = 20;

  return {
    score,
    label: ccc <= 60 ? 'Eficient' : ccc <= 90 ? 'Mediu' : 'Lent',
    details: `DSO: ${dso.toFixed(0)}z | DPO: ${dpo.toFixed(0)}z | DIO: ${dio.toFixed(0)}z | CCC: ${ccc.toFixed(0)}z`,
  };
}

function scoreLeverage(m: FinancialMetrics): { score: number; label: string; details: string } {
  const debtToEquity = m.equity > 0 ? m.totalLiabilities / m.equity : 999;
  const debtToAssets = m.totalAssets > 0 ? m.totalLiabilities / m.totalAssets : 1;

  let score: number;
  if (debtToEquity <= 0.5) score = 100;
  else if (debtToEquity <= 1.0) score = 80;
  else if (debtToEquity <= 2.0) score = 60;
  else if (debtToEquity <= 3.0) score = 30;
  else score = 10;

  return {
    score,
    label: debtToEquity <= 1 ? 'Conservator' : debtToEquity <= 2 ? 'Moderat' : 'Agresiv',
    details: `Datorii/Capitaluri: ${debtToEquity.toFixed(2)} | Datorii/Active: ${(debtToAssets * 100).toFixed(1)}%`,
  };
}

function scoreCashflow(m: FinancialMetrics): { score: number; label: string; details: string } {
  const operatingCF = m.netProfit + (m.accountsPayable - m.accountsReceivable);
  const cfToRevenue = m.revenue > 0 ? (operatingCF / m.revenue) * 100 : 0;

  let score: number;
  if (cfToRevenue >= 15) score = 100;
  else if (cfToRevenue >= 8) score = 80;
  else if (cfToRevenue >= 3) score = 60;
  else if (cfToRevenue >= 0) score = 40;
  else score = 15;

  return {
    score,
    label: cfToRevenue >= 8 ? 'Pozitiv' : cfToRevenue >= 0 ? 'Neutral' : 'Negativ',
    details: `CF operațional estimat: ${operatingCF.toLocaleString('ro-RO')} RON (${cfToRevenue.toFixed(1)}% din CA)`,
  };
}

function generateAlerts(m: FinancialMetrics): Alert[] {
  const alerts: Alert[] = [];

  if (m.cashOnHand > RO_THRESHOLDS.CASA_PLAFON) {
    alerts.push({
      severity: 'critical',
      title: '⛔ Plafon casă depășit',
      description: `Aveți ${m.cashOnHand.toLocaleString('ro-RO')} RON în casă. Plafonul legal: 50.000 RON. Riscați amendă.`,
    });
  }

  if (m.netProfit < 0) {
    alerts.push({
      severity: 'critical',
      title: '🔴 Pierdere netă',
      description: `Pierdere de ${Math.abs(m.netProfit).toLocaleString('ro-RO')} RON. Revizuiți structura costurilor.`,
    });
  }

  if (m.expenses > m.revenue && m.revenue > 0) {
    alerts.push({
      severity: 'critical',
      title: '🔴 Cheltuieli > Venituri',
      description: `Cheltuielile depășesc veniturile cu ${(m.expenses - m.revenue).toLocaleString('ro-RO')} RON.`,
    });
  }

  const currentRatio = m.accountsPayable > 0
    ? (m.cashOnHand + m.accountsReceivable) / m.accountsPayable
    : 999;
  if (currentRatio < 1) {
    alerts.push({
      severity: 'warning',
      title: '⚠️ Risc de lichiditate',
      description: `Rata rapidă: ${currentRatio.toFixed(2)}. Nu puteți acoperi datoriile curente din active lichide.`,
    });
  }

  const dso = m.revenue > 0 ? (m.accountsReceivable / m.revenue) * 365 : 0;
  if (dso > 90) {
    alerts.push({
      severity: 'warning',
      title: '⚠️ DSO ridicat',
      description: `Clienții vă plătesc în medie în ${dso.toFixed(0)} zile. Recomandare: sub 45 zile.`,
    });
  }

  return alerts;
}

function generateRecommendations(m: FinancialMetrics, breakdown: HealthScore['breakdown']): Recommendation[] {
  const recs: Recommendation[] = [];

  if (breakdown.profitability.score < 60) {
    recs.push({
      priority: 1,
      action: 'Revizuiți structura de costuri — identificați cheltuielile care nu generează valoare',
      impact: 'Creșterea marjei nete cu 3-5 puncte procentuale',
      timeframe: '1-3 luni',
    });
  }

  if (breakdown.liquidity.score < 60) {
    recs.push({
      priority: 1,
      action: 'Negociați termene de plată mai lungi cu furnizorii (45-60 zile)',
      impact: 'Îmbunătățirea cash-flow-ului lunar',
      timeframe: 'Imediat',
    });
  }

  if (breakdown.efficiency.score < 60) {
    recs.push({
      priority: 2,
      action: 'Implementați politică de urmărire a încasărilor — facturare la 30 de zile cu penalități',
      impact: 'Reducere DSO cu 15-30 zile',
      timeframe: '1-2 luni',
    });
  }

  if (breakdown.leverage.score < 60) {
    recs.push({
      priority: 2,
      action: 'Refinanțați datoriile pe termen scurt cu credite pe termen lung',
      impact: 'Reducerea presiunii lunare pe cash-flow',
      timeframe: '2-4 luni',
    });
  }

  if (m.inventory > 0 && m.revenue > 0) {
    const dio = (m.inventory / m.revenue) * 365;
    if (dio > 90) {
      recs.push({
        priority: 3,
        action: 'Lichidați stocurile cu mișcare lentă — reduceri sau vânzare în bloc',
        impact: 'Eliberare capital imobilizat',
        timeframe: '1-2 luni',
      });
    }
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

export function calculateHealthScore(metrics: FinancialMetrics): HealthScore {
  const profitability = scoreProfitability(metrics);
  const liquidity = scoreLiquidity(metrics);
  const efficiency = scoreEfficiency(metrics);
  const leverage = scoreLeverage(metrics);
  const cashflow = scoreCashflow(metrics);

  // Weighted average
  const overall = Math.round(
    profitability.score * 0.25 +
    liquidity.score * 0.25 +
    efficiency.score * 0.15 +
    leverage.score * 0.15 +
    cashflow.score * 0.20
  );

  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F';
  const category = {
    A: '🟢 Sănătate financiară excelentă',
    B: '🟢 Sănătate financiară bună',
    C: '🟡 Sănătate financiară acceptabilă — necesită atenție',
    D: '🟠 Sănătate financiară fragilă — acțiune necesară',
    F: '🔴 Sănătate financiară critică — intervenție urgentă',
  }[grade];

  const breakdown = { profitability, liquidity, efficiency, leverage, cashflow };
  const alerts = generateAlerts(metrics);
  const recommendations = generateRecommendations(metrics, breakdown);

  // Cash runway (months until cash runs out)
  const burnRate = metrics.monthlyBurnRate || (metrics.expenses / 12);
  const cashRunway = burnRate > 0 ? Math.round((metrics.cashOnHand / burnRate) * 10) / 10 : null;

  return { overall, grade, category, breakdown, alerts, recommendations, cashRunway };
}

/**
 * Quick diagnostic from balance sheet metadata (used by chat-ai artifacts)
 */
export function quickDiagnostic(metadata: Record<string, number>): HealthScore {
  return calculateHealthScore({
    revenue: metadata.ca || metadata.venituri || 0,
    expenses: metadata.cheltuieli || 0,
    netProfit: metadata.profit || (metadata.ca || 0) - (metadata.cheltuieli || 0),
    cashOnHand: (metadata.casa || 0) + (metadata.banca || 0),
    accountsReceivable: metadata.clienti || metadata.creante || 0,
    accountsPayable: metadata.furnizori || metadata.datorii_curente || 0,
    inventory: metadata.stocuri || 0,
    totalAssets: metadata.active_totale || metadata.total_activ || 0,
    totalLiabilities: metadata.datorii_totale || metadata.total_pasiv_datorii || 0,
    equity: metadata.capitaluri || metadata.capital_propriu || 0,
    ebitda: metadata.ebitda,
  });
}
