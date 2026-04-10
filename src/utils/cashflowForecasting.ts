/**
 * Cashflow Forecasting Engine
 * Adapted from: github.com/Etherlabs-dev/cashflow-forecasting-engine (MIT)
 * Localized for Romanian market (RON currency, Romanian labels)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DailyActual {
  date: string; // YYYY-MM-DD
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  net_cash: number;
  closing_balance: number;
}

export interface DailyForecast {
  date: string;
  base_inflows: number;
  base_outflows: number;
  base_net_cash: number;
  base_closing_balance: number;
  best_inflows: number;
  best_outflows: number;
  best_net_cash: number;
  best_closing_balance: number;
  worst_inflows: number;
  worst_outflows: number;
  worst_net_cash: number;
  worst_closing_balance: number;
}

export interface CashflowScenario {
  id: string;
  name: string;
  description: string;
  parameters: ScenarioParameters;
}

export interface ScenarioParameters {
  revenue_growth_percent: number;     // e.g. 10 = +10%
  expense_growth_percent: number;     // e.g. 5 = +5%
  one_time_inflow?: number;           // e.g. investiție
  one_time_outflow?: number;          // e.g. achiziție echipament
  one_time_date?: string;             // when the one-time event happens
  dso_change_days?: number;           // +/- days change in DSO
  dpo_change_days?: number;           // +/- days change in DPO
}

export interface WorkingCapitalSummary {
  ar_total: number;   // Creanțe clienți
  ap_total: number;   // Datorii furnizori
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_90_plus: number;
  ap_0_30: number;
  ap_31_60: number;
  ap_61_90: number;
  ap_90_plus: number;
  dso: number;
  dpo: number;
  cash_conversion_cycle: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CashflowAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
  date?: string;
  value?: number;
}

export interface CashflowChartPoint {
  date: string;
  actual?: number;
  base?: number;
  best?: number;
  worst?: number;
  scenario?: number;
  netCash?: number;
}

export interface ForecastKPIs {
  currentCash: number;
  runwayDaysBase: number | string;
  runwayDaysWorst: number | string;
  next30DayNetCash: number;
  burnRate: number;       // average daily burn
  avgDailyInflow: number;
  avgDailyOutflow: number;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

/**
 * Generate forecast from historical actuals
 */
export function generateForecast(
  actuals: DailyActual[],
  forecastDays: number = 90,
  scenario?: ScenarioParameters
): DailyForecast[] {
  if (actuals.length === 0) return [];

  // Calculate baseline parameters from last 30 days
  const recentActuals = actuals.slice(-30);
  const avgDailyInflow = recentActuals.reduce((s, a) => s + a.cash_in, 0) / recentActuals.length;
  const avgDailyOutflow = recentActuals.reduce((s, a) => s + a.cash_out, 0) / recentActuals.length;
  
  // Detect patterns (monthly cycles)
  const dayOfMonthPatterns: Record<number, { avgIn: number; avgOut: number }> = {};
  for (const a of actuals) {
    const dom = new Date(a.date).getDate();
    if (!dayOfMonthPatterns[dom]) dayOfMonthPatterns[dom] = { avgIn: 0, avgOut: 0 };
    dayOfMonthPatterns[dom].avgIn += a.cash_in;
    dayOfMonthPatterns[dom].avgOut += a.cash_out;
  }
  
  const monthsOfData = Math.max(1, Math.ceil(actuals.length / 30));
  for (const dom in dayOfMonthPatterns) {
    dayOfMonthPatterns[dom].avgIn /= monthsOfData;
    dayOfMonthPatterns[dom].avgOut /= monthsOfData;
  }

  const lastBalance = actuals[actuals.length - 1].closing_balance;
  const today = new Date();
  const forecasts: DailyForecast[] = [];

  // Scenario modifiers
  const revenueMultiplier = 1 + ((scenario?.revenue_growth_percent ?? 0) / 100);
  const expenseMultiplier = 1 + ((scenario?.expense_growth_percent ?? 0) / 100);

  let runningBase = lastBalance;
  let runningBest = lastBalance;
  let runningWorst = lastBalance;

  for (let i = 0; i < forecastDays; i++) {
    const date = addDays(today, i + 1);
    const dom = new Date(date).getDate();
    
    // Use day-of-month pattern if available, else average
    const pattern = dayOfMonthPatterns[dom];
    const dailyIn = (pattern?.avgIn ?? avgDailyInflow) * revenueMultiplier;
    const dailyOut = (pattern?.avgOut ?? avgDailyOutflow) * expenseMultiplier;
    
    // One-time events
    let oneTimeNet = 0;
    if (scenario?.one_time_date === date) {
      oneTimeNet = (scenario.one_time_inflow ?? 0) - (scenario.one_time_outflow ?? 0);
    }

    // Uncertainty expands over time
    const uncertainty = i * 0.005; // 0.5% per day

    const baseNet = dailyIn - dailyOut + oneTimeNet;
    const bestNet = dailyIn * (1 + uncertainty * 0.5) - dailyOut * (1 - uncertainty * 0.3) + oneTimeNet;
    const worstNet = dailyIn * (1 - uncertainty) - dailyOut * (1 + uncertainty * 0.5) + oneTimeNet;

    runningBase += baseNet;
    runningBest += bestNet;
    runningWorst += worstNet;

    forecasts.push({
      date,
      base_inflows: dailyIn + (oneTimeNet > 0 ? oneTimeNet : 0),
      base_outflows: dailyOut + (oneTimeNet < 0 ? Math.abs(oneTimeNet) : 0),
      base_net_cash: baseNet,
      base_closing_balance: runningBase,
      best_inflows: dailyIn * (1 + uncertainty * 0.5),
      best_outflows: dailyOut * (1 - uncertainty * 0.3),
      best_net_cash: bestNet,
      best_closing_balance: runningBest,
      worst_inflows: dailyIn * (1 - uncertainty),
      worst_outflows: dailyOut * (1 + uncertainty * 0.5),
      worst_net_cash: worstNet,
      worst_closing_balance: runningWorst,
    });
  }

  return forecasts;
}

/**
 * Calculate KPIs from actuals + forecasts
 */
export function calculateKPIs(
  actuals: DailyActual[],
  forecasts: DailyForecast[]
): ForecastKPIs {
  const currentCash = actuals.length > 0 ? actuals[actuals.length - 1].closing_balance : 0;
  
  const zeroBase = forecasts.find(f => f.base_closing_balance <= 0);
  const runwayBase = zeroBase
    ? Math.floor((new Date(zeroBase.date).getTime() - Date.now()) / (1000 * 3600 * 24))
    : '90+';

  const zeroWorst = forecasts.find(f => f.worst_closing_balance <= 0);
  const runwayWorst = zeroWorst
    ? Math.floor((new Date(zeroWorst.date).getTime() - Date.now()) / (1000 * 3600 * 24))
    : '90+';

  const next30 = forecasts.slice(0, 30).reduce((s, f) => s + f.base_net_cash, 0);

  const recent = actuals.slice(-30);
  const avgIn = recent.length > 0 ? recent.reduce((s, a) => s + a.cash_in, 0) / recent.length : 0;
  const avgOut = recent.length > 0 ? recent.reduce((s, a) => s + a.cash_out, 0) / recent.length : 0;

  return {
    currentCash,
    runwayDaysBase: runwayBase,
    runwayDaysWorst: runwayWorst,
    next30DayNetCash: next30,
    burnRate: avgOut - avgIn,
    avgDailyInflow: avgIn,
    avgDailyOutflow: avgOut,
  };
}

/**
 * Generate alerts from forecasts
 */
export function generateAlerts(
  actuals: DailyActual[],
  forecasts: DailyForecast[],
  thresholds?: { minCashBalance?: number; maxBurnRate?: number }
): CashflowAlert[] {
  const alerts: CashflowAlert[] = [];
  const minCash = thresholds?.minCashBalance ?? 10000;

  // Check runway
  const zeroBase = forecasts.find(f => f.base_closing_balance <= 0);
  if (zeroBase) {
    const days = Math.floor((new Date(zeroBase.date).getTime() - Date.now()) / (1000 * 3600 * 24));
    alerts.push({
      type: 'runway_exhausted',
      severity: days < 30 ? 'critical' : 'warning',
      message: `⛔ Cash-ul va ajunge la zero în ${days} zile (${zeroBase.date}) conform scenariului de bază.`,
      date: zeroBase.date,
      value: days,
    });
  }

  // Check worst case
  const zeroWorst = forecasts.find(f => f.worst_closing_balance <= 0);
  if (zeroWorst && !zeroBase) {
    const days = Math.floor((new Date(zeroWorst.date).getTime() - Date.now()) / (1000 * 3600 * 24));
    alerts.push({
      type: 'runway_worst_case',
      severity: 'warning',
      message: `⚠️ În scenariul pesimist, cash-ul se epuizează în ${days} zile.`,
      date: zeroWorst.date,
      value: days,
    });
  }

  // Check minimum cash threshold
  const belowMin = forecasts.find(f => f.base_closing_balance < minCash);
  if (belowMin) {
    alerts.push({
      type: 'below_minimum',
      severity: 'warning',
      message: `⚠️ Soldul va scădea sub ${formatRON(minCash)} pe ${belowMin.date}.`,
      date: belowMin.date,
      value: belowMin.base_closing_balance,
    });
  }

  // Check high burn rate
  const recent = actuals.slice(-7);
  if (recent.length >= 7) {
    const weeklyBurn = recent.reduce((s, a) => s + a.cash_out, 0);
    const weeklyIn = recent.reduce((s, a) => s + a.cash_in, 0);
    if (weeklyBurn > weeklyIn * 1.5) {
      alerts.push({
        type: 'high_burn_rate',
        severity: 'warning',
        message: `🔥 Rata de ardere (${formatRON(weeklyBurn / 7)}/zi) depășește semnificativ încasările.`,
        value: weeklyBurn / 7,
      });
    }
  }

  // Positive alerts
  const last30Forecast = forecasts.slice(0, 30);
  const positiveNet = last30Forecast.every(f => f.base_net_cash > 0);
  if (positiveNet) {
    alerts.push({
      type: 'positive_trend',
      severity: 'info',
      message: '✅ Cash flow-ul este pozitiv pentru următoarele 30 de zile.',
    });
  }

  return alerts;
}

/**
 * Calculate working capital summary from analysis data
 */
export function calculateWorkingCapital(params: {
  receivables: number;
  payables: number;
  revenue: number;
  costOfGoods: number;
  inventory?: number;
  arAging?: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
  apAging?: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
}): WorkingCapitalSummary {
  const dso = params.revenue > 0 ? (params.receivables / params.revenue) * 365 : 0;
  const dpo = params.costOfGoods > 0 ? (params.payables / params.costOfGoods) * 365 : 0;
  const dio = params.inventory && params.costOfGoods > 0 
    ? (params.inventory / params.costOfGoods) * 365 
    : 0;

  return {
    ar_total: params.receivables,
    ap_total: params.payables,
    ar_0_30: params.arAging?.['0-30'] ?? params.receivables * 0.6,
    ar_31_60: params.arAging?.['31-60'] ?? params.receivables * 0.25,
    ar_61_90: params.arAging?.['61-90'] ?? params.receivables * 0.1,
    ar_90_plus: params.arAging?.['90+'] ?? params.receivables * 0.05,
    ap_0_30: params.apAging?.['0-30'] ?? params.payables * 0.5,
    ap_31_60: params.apAging?.['31-60'] ?? params.payables * 0.3,
    ap_61_90: params.apAging?.['61-90'] ?? params.payables * 0.15,
    ap_90_plus: params.apAging?.['90+'] ?? params.payables * 0.05,
    dso: Math.round(dso),
    dpo: Math.round(dpo),
    cash_conversion_cycle: Math.round(dso + dio - dpo),
  };
}

/**
 * Build chart data from actuals + forecasts
 */
export function buildChartData(
  actuals: DailyActual[],
  forecasts: DailyForecast[],
  scenarioForecasts?: DailyForecast[]
): CashflowChartPoint[] {
  const actualPoints: CashflowChartPoint[] = actuals.map(a => ({
    date: a.date,
    actual: a.closing_balance,
    netCash: a.net_cash,
  }));

  const forecastPoints: CashflowChartPoint[] = forecasts.map((f, i) => ({
    date: f.date,
    base: f.base_closing_balance,
    best: f.best_closing_balance,
    worst: f.worst_closing_balance,
    scenario: scenarioForecasts?.[i]?.base_closing_balance,
  }));

  return [...actualPoints, ...forecastPoints];
}

/**
 * Pre-built scenario templates for Romanian businesses
 */
export const scenarioTemplates: CashflowScenario[] = [
  {
    id: 'optimist',
    name: 'Scenariu Optimist',
    description: 'Creștere venituri +15%, cheltuieli constante',
    parameters: {
      revenue_growth_percent: 15,
      expense_growth_percent: 0,
    },
  },
  {
    id: 'pesimist',
    name: 'Scenariu Pesimist',
    description: 'Scădere venituri -20%, creștere cheltuieli +10%',
    parameters: {
      revenue_growth_percent: -20,
      expense_growth_percent: 10,
    },
  },
  {
    id: 'angajare',
    name: 'Angajare Nouă',
    description: 'Cheltuieli salariale +30%, venituri +5%',
    parameters: {
      revenue_growth_percent: 5,
      expense_growth_percent: 30,
    },
  },
  {
    id: 'investitie',
    name: 'Investiție Echipament',
    description: 'Cheltuială one-time de 50.000 RON',
    parameters: {
      revenue_growth_percent: 0,
      expense_growth_percent: 0,
      one_time_outflow: 50000,
      one_time_date: addDays(new Date(), 30),
    },
  },
  {
    id: 'sezonalitate',
    name: 'Sezon Slab',
    description: 'Venituri -40% (perioadă de vară/iarnă)',
    parameters: {
      revenue_growth_percent: -40,
      expense_growth_percent: -5,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatRON(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Convert analysis metadata into DailyActual entries (simplified)
 * Used to bridge Yana's analysis data into cashflow format
 */
export function analysisToActuals(analysisData: {
  date: string;
  cash?: number;
  receivables?: number;
  payables?: number;
  revenue?: number;
  expenses?: number;
}[]): DailyActual[] {
  return analysisData.map((d, i) => {
    const cashIn = d.revenue ?? 0;
    const cashOut = d.expenses ?? 0;
    const opening = i === 0 ? (d.cash ?? 0) : (d.cash ?? 0) - (cashIn - cashOut);
    return {
      date: d.date,
      opening_balance: opening,
      cash_in: cashIn,
      cash_out: cashOut,
      net_cash: cashIn - cashOut,
      closing_balance: d.cash ?? opening + cashIn - cashOut,
    };
  });
}
