import { supabase } from "@/integrations/supabase/client";

export interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  soldBanca: number;
  soldCasa: number;
  soldClienti: number;
  soldFurnizori: number;
  dso: number;
  dpo: number;
}

export interface RunwayData {
  months: number;
  days: number;
  status: 'critical' | 'warning' | 'healthy';
  criticalThreshold: number;
  dateZeroCash: Date | null;
  message: string;
}

export interface CashFlowData {
  forecast: { date: string; balance: number; threshold: number }[];
  trendLine: 'positive' | 'negative' | 'stable';
  projectedBalance90Days: number;
}

export interface SimulationResult {
  baseRunway: RunwayData;
  newRunway: RunwayData;
  runwayChange: number;
  runwayChangePercent: number;
  cashFlowImpact: number;
  breakEvenDate: Date | null;
  recommendation: string;
  severity: 'success' | 'warning' | 'critical';
}

export interface Alert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionable?: string[];
}

// 1. Extract latest financial data from user analyses (merge most recent non-null metrics)
export const getLatestFinancialData = async (userId: string): Promise<FinancialData | null> => {
  const { data, error } = await supabase
    .from('analyses')
    .select('metadata, created_at')
    .eq('user_id', userId)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6);
  
  if (error || !data?.length) {
    console.error('Error fetching financial data:', error);
    return null;
  }
  
  const merged: Record<string, number | undefined> = {};

  const setIfEmpty = (key: keyof FinancialData | 'profit', value: any) => {
    const num = value !== undefined && value !== null ? Number(value) : undefined;
    if (
      (!Object.prototype.hasOwnProperty.call(merged, key) || merged[key] === undefined || merged[key] === null || merged[key] === 0) &&
      typeof num === 'number' && !isNaN(num) && num !== 0
    ) {
      merged[key] = num;
    }
  };

  for (const row of data) {
    const m: any = row.metadata || {};

    // Synonyms mapping (ro/en) and fallbacks
    const revenue = m.revenue ?? m.ca ?? m.cifraAfaceri ?? m.venituri ?? m.totalVenituri;
    const expenses = m.expenses ?? m.cheltuieli ?? m.totalCheltuieli ?? m.costuri;
    const profit = m.profit ?? m.profitNet ?? (
      (revenue !== undefined && expenses !== undefined)
        ? (Number(revenue) - Number(expenses))
        : undefined
    );
    const soldBanca = m.soldBanca ?? m.cashBanca ?? m.banca ?? m.conturiBancare;
    const soldCasa = m.soldCasa ?? m.cashCasa ?? m.casa ?? m.numerar;
    const soldClienti = m.soldClienti ?? m.creante ?? m.clienti;
    const soldFurnizori = m.soldFurnizori ?? m.datorii ?? m.furnizori;
    const dso = m.dso ?? m.dso_zile ?? m.DSO;
    const dpo = m.dpo ?? m.dpo_zile ?? m.DPO;

    setIfEmpty('revenue', revenue);
    setIfEmpty('expenses', expenses);
    setIfEmpty('profit', profit);
    setIfEmpty('soldBanca', soldBanca);
    setIfEmpty('soldCasa', soldCasa);
    setIfEmpty('soldClienti', soldClienti);
    setIfEmpty('soldFurnizori', soldFurnizori);
    setIfEmpty('dso', dso);
    setIfEmpty('dpo', dpo);
  }

  const result: FinancialData = {
    revenue: Number(merged.revenue) || 0,
    expenses: Number(merged.expenses) || 0,
    profit: Number(
      merged.profit !== undefined
        ? merged.profit
        : (Number(merged.revenue || 0) - Number(merged.expenses || 0))
    ) || 0,
    soldBanca: Number(merged.soldBanca) || 0,
    soldCasa: Number(merged.soldCasa) || 0,
    soldClienti: Number(merged.soldClienti) || 0,
    soldFurnizori: Number(merged.soldFurnizori) || 0,
    dso: Number(merged.dso) || 0,
    dpo: Number(merged.dpo) || 0,
  };

  return result;
};

// 2. Calculate runway (months until cash runs out)
export const calculateRunway = (
  cashAvailable: number,
  monthlyRevenue: number,
  monthlyExpenses: number
): RunwayData => {
  const monthlyBurnRate = monthlyExpenses - monthlyRevenue;
  
  if (monthlyBurnRate <= 0) {
    return {
      months: Infinity,
      days: Infinity,
      status: 'healthy',
      criticalThreshold: cashAvailable * 0.2,
      dateZeroCash: null,
      message: '✅ Profitabil! Nu vei rămâne fără bani.'
    };
  }
  
  const runwayMonths = cashAvailable / monthlyBurnRate;
  const runwayDays = runwayMonths * 30;
  
  return {
    months: runwayMonths,
    days: runwayDays,
    status: runwayMonths < 3 ? 'critical' : runwayMonths < 6 ? 'warning' : 'healthy',
    criticalThreshold: cashAvailable * 0.2,
    dateZeroCash: new Date(Date.now() + runwayDays * 24 * 60 * 60 * 1000),
    message: runwayMonths < 3 
      ? `🔴 CRITIC: Doar ${runwayMonths.toFixed(1)} luni!`
      : runwayMonths < 6
      ? `⚠️ Atenție: ${runwayMonths.toFixed(1)} luni runway`
      : `✅ Sănătos: ${runwayMonths.toFixed(1)} luni runway`
  };
};

// 3. Calculate cash flow forecast for 90 days
export const calculateCashFlowForecast = (
  currentCash: number,
  monthlyRevenue: number,
  monthlyExpenses: number
): CashFlowData => {
  const dailyRevenue = monthlyRevenue / 30;
  const dailyExpenses = monthlyExpenses / 30;
  const dailyBurnRate = dailyRevenue - dailyExpenses;
  
  const forecast: { date: string; balance: number; threshold: number }[] = [];
  const criticalThreshold = currentCash * 0.2;
  
  for (let day = 0; day <= 90; day++) {
    const balance = currentCash + (dailyBurnRate * day);
    forecast.push({
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: Math.max(0, balance),
      threshold: criticalThreshold
    });
  }
  
  return {
    forecast,
    trendLine: dailyBurnRate > 0 ? 'positive' : dailyBurnRate < 0 ? 'negative' : 'stable',
    projectedBalance90Days: forecast[90].balance
  };
};

// 4. Simulate What-If scenarios
export const simulateWhatIf = (
  baseData: FinancialData,
  scenario: {
    newEmployees?: number;
    avgSalary?: number;
    salaryIncreasePercent?: number;
    revenueGrowthPercent?: number;
  }
): SimulationResult => {
  // Baseline calculations
  const currentCash = baseData.soldBanca + baseData.soldCasa;
  const baseMonthlyRevenue = baseData.revenue / 12;
  const baseMonthlyExpenses = baseData.expenses / 12;
  const baseRunway = calculateRunway(currentCash, baseMonthlyRevenue, baseMonthlyExpenses);
  
  // Apply scenario changes
  let newMonthlyExpenses = baseMonthlyExpenses;
  let newMonthlyRevenue = baseMonthlyRevenue;
  
  if (scenario.newEmployees && scenario.avgSalary) {
    newMonthlyExpenses += scenario.newEmployees * scenario.avgSalary;
  }
  
  if (scenario.salaryIncreasePercent) {
    newMonthlyExpenses *= (1 + scenario.salaryIncreasePercent / 100);
  }
  
  if (scenario.revenueGrowthPercent) {
    newMonthlyRevenue *= (1 + scenario.revenueGrowthPercent / 100);
  }
  
  const newRunway = calculateRunway(currentCash, newMonthlyRevenue, newMonthlyExpenses);
  
  // Calculate impact
  const runwayChange = newRunway.months - baseRunway.months;
  const runwayChangePercent = baseRunway.months !== Infinity 
    ? (runwayChange / baseRunway.months) * 100 
    : 0;
  
  let recommendation = '';
  let severity: 'success' | 'warning' | 'critical' = 'success';
  
  if (runwayChangePercent < -50) {
    severity = 'critical';
    recommendation = `🔴 NU RECOMAND! Runway scade cu ${Math.abs(runwayChangePercent).toFixed(0)}%. Risc MARE de faliment!`;
  } else if (runwayChangePercent < -20) {
    severity = 'warning';
    recommendation = `⚠️ ATENȚIE! Runway scade cu ${Math.abs(runwayChangePercent).toFixed(0)}%. Asigură-te că vânzările cresc!`;
  } else if (runwayChangePercent > 10) {
    severity = 'success';
    recommendation = `✅ Excelent! Runway crește cu ${runwayChangePercent.toFixed(0)}%. Scenariul este sustenabil!`;
  } else {
    recommendation = `📊 Impact minor: Runway schimbă cu ${runwayChangePercent.toFixed(0)}%.`;
  }
  
  return {
    baseRunway,
    newRunway,
    runwayChange,
    runwayChangePercent,
    cashFlowImpact: (newMonthlyRevenue - newMonthlyExpenses) - (baseMonthlyRevenue - baseMonthlyExpenses),
    breakEvenDate: newRunway.dateZeroCash,
    recommendation,
    severity
  };
};

// 5. Detect financial alerts
export const detectFinancialAlerts = (data: FinancialData): Alert[] => {
  const alerts: Alert[] = [];
  const currentCash = data.soldBanca + data.soldCasa;
  const runway = calculateRunway(currentCash, data.revenue / 12, data.expenses / 12);
  
  // Runway critical
  if (runway.months < 3 && runway.months !== Infinity) {
    alerts.push({
      type: 'runway_critical',
      severity: 'critical',
      title: '🔴 Runway CRITIC',
      message: `Doar ${runway.months.toFixed(1)} luni până la cash zero! Acțiune urgentă necesară.`,
      actionable: ['Reduce cheltuieli urgente', 'Crește vânzările imediat', 'Caută finanțare externă']
    });
  }
  
  // Cash limit exceeded
  if (data.soldCasa && data.soldCasa > 50000) {
    alerts.push({
      type: 'casa_limit',
      severity: 'critical',
      title: '⛔ NELEGAL: Plafon Casă Depășit',
      message: `Aveți ${data.soldCasa.toFixed(2)} lei în casă. Maximum legal: 50.000 lei. Risc amenzi ANAF!`,
      actionable: ['Depune urgent banii în bancă', 'Documentează operațiunile', 'Consultă contabilul']
    });
  }
  
  // High DSO
  if (data.dso && data.dso > 90) {
    alerts.push({
      type: 'dso_high',
      severity: 'warning',
      title: '⚠️ DSO Ridicat',
      message: `Clienții plătesc în ${data.dso} zile. Banii sunt blocați în creanțe!`,
      actionable: ['Negociază termene mai scurte', 'Oferă discount pentru plată anticipată', 'Implementează factoring']
    });
  }
  
  // Operating at loss
  if (data.expenses > data.revenue) {
    const pierdere = data.expenses - data.revenue;
    alerts.push({
      type: 'loss_detected',
      severity: 'critical',
      title: '🔴 Pierdere Garantată',
      message: `Cheltuieli (${data.expenses.toFixed(2)}) > Venituri (${data.revenue.toFixed(2)}). Pierdere: ${pierdere.toFixed(2)} lei!`,
      actionable: ['Reduce costuri imediat', 'Crește prețurile', 'Optimizează operațiunile']
    });
  }
  
  return alerts;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
