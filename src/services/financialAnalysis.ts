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
  companyId?: string;
  companyName?: string;
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

// Helper: Parse Romanian number format ("1 234,56 RON" → 1234.56)
const parseRoNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  
  const str = String(value)
    .replace(/\s+/g, '')        // Remove spaces
    .replace(/RON/gi, '')       // Remove "RON"
    .replace(/lei/gi, '')       // Remove "lei"
    .replace(/,/g, '.')         // Romanian comma → decimal point
    .trim();
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper: Safely access nested object paths ("indicators.ca" → obj.indicators?.ca)
const getNested = (obj: any, path: string): any => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }
  return result;
};

// Helper: Pick first valid number from candidate keys (flat + nested paths)
const pickFirstNumber = (obj: any, candidates: string[]): number => {
  for (const key of candidates) {
    const value = getNested(obj, key);
    if (value !== undefined && value !== null) {
      const num = parseRoNumber(value);
      if (num !== 0) return num;
    }
  }
  return 0;
};

// Helper: Extract revenue from AI analysis text (fallback)
const extractRevenueFromAnalysisText = (analysisText: string): number => {
  const patterns = [
    /cifr[aă]\s+de\s+afaceri[:\s]+([0-9.,\s]+)\s*RON/i,
    /venituri[:\s]+([0-9.,\s]+)\s*RON/i,
    /CA[:\s]+([0-9.,\s]+)\s*RON/i,
    /total\s+venituri[:\s]+([0-9.,\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = analysisText.match(pattern);
    if (match) {
      const value = parseRoNumber(match[1]);
      if (value > 0) return value;
    }
  }
  return 0;
};

// Helper: Sum accounts in range for revenue/expenses (credit column)
const sumAccountsInRange = (balanceData: any, startAccount: number, endAccount: number, useCredit: boolean = true): number => {
  if (!balanceData || !Array.isArray(balanceData)) return 0;
  
  let total = 0;
  for (const row of balanceData) {
    const accountNumber = parseInt(row.cont || row.account || row.Cont || '0');
    if (accountNumber >= startAccount && accountNumber <= endAccount) {
      if (useCredit) {
        const credit = parseRoNumber(row.credit || row.Credit || row.Creditoare || 0);
        total += credit;
      } else {
        const debit = parseRoNumber(row.debit || row.Debit || row.Debitoare || 0);
        total += debit;
      }
    }
  }
  return total;
};

// Helper: Sum bank accounts (51xx) - debit final balance
const sumBankAccounts = (balanceData: any): number => {
  if (!balanceData || !Array.isArray(balanceData)) return 0;
  
  let total = 0;
  for (const row of balanceData) {
    const accountNumber = parseInt(row.cont || row.account || row.Cont || '0');
    // Sum all accounts starting with 51 (bank accounts)
    if (accountNumber >= 5100 && accountNumber <= 5199) {
      // Look for "Solduri finale Debitoare" column
      const finalDebit = parseRoNumber(
        row['Solduri finale Debitoare'] || 
        row['solduri_finale_debitoare'] ||
        row.sold_final_debit ||
        row.SolduriFinaleDebitoare ||
        0
      );
      total += finalDebit;
    }
  }
  return total;
};

// Helper: Sum cash accounts (53xx) - debit final balance  
const sumCashAccounts = (balanceData: any): number => {
  if (!balanceData || !Array.isArray(balanceData)) return 0;
  
  let total = 0;
  for (const row of balanceData) {
    const accountNumber = parseInt(row.cont || row.account || row.Cont || '0');
    // Sum all accounts starting with 53 (cash accounts)
    if (accountNumber >= 5300 && accountNumber <= 5399) {
      const finalDebit = parseRoNumber(
        row['Solduri finale Debitoare'] || 
        row['solduri_finale_debitoare'] ||
        row.sold_final_debit ||
        row.SolduriFinaleDebitoare ||
        0
      );
      total += finalDebit;
    }
  }
  return total;
};

// 1. Extract latest financial data from user analyses (merge most recent non-null metrics)
export const getLatestFinancialData = async (
  userId: string, 
  companyId?: string, 
  analysisId?: string
): Promise<FinancialData | null> => {
  console.log('🔍 getLatestFinancialData - START for userId:', userId);
  console.log('🔍 getLatestFinancialData - Filter by companyId:', companyId);
  console.log('🔍 getLatestFinancialData - Filter by analysisId:', analysisId);
  
  let query = supabase
    .from('analyses')
    .select('id, metadata, created_at, company_id, file_name')
    .eq('user_id', userId)
    .not('metadata', 'is', null);
  
  // Filter by specific analysis if provided
  if (analysisId) {
    query = query.eq('id', analysisId);
  }
  // Otherwise filter by company if provided
  else if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(6);
  
  console.log('🔍 getLatestFinancialData - Raw DB response:', { data, error });
  console.log('🔍 getLatestFinancialData - Number of analyses found:', data?.length || 0);
  
  if (error || !data?.length) {
    console.error('🔍 getLatestFinancialData - ERROR or NO DATA:', error);
    return null;
  }
  
  // Log each metadata object
  data.forEach((row, idx) => {
    console.log(`🔍 getLatestFinancialData - Analysis [${idx}] metadata:`, row.metadata);
    console.log(`🔍 getLatestFinancialData - Analysis [${idx}] metadata keys:`, Object.keys(row.metadata || {}));
    console.log(`🔍 getLatestFinancialData - Analysis [${idx}] company_id:`, row.company_id);
  });
  
  const merged: Record<string, number> = {
    revenue: 0,
    expenses: 0,
    profit: 0,
    soldBanca: 0,
    soldCasa: 0,
    soldClienti: 0,
    soldFurnizori: 0,
    dso: 0,
    dpo: 0
  };

  // Merge data from multiple analyses (prioritize non-zero values)
  for (const row of data) {
    const m: any = row.metadata || {};

    // Revenue (extended synonyms + nested paths)
    if (merged.revenue === 0) {
      merged.revenue = pickFirstNumber(m, [
        'revenue', 'ca', 'cifraAfaceri', 'venituri', 'totalVenituri',
        'indicators.ca', 'indicators.cifraAfaceri', 'indicators.venituri',
        'indicatori.ca', 'indicatori.cifraAfaceri', 'indicatori.venituri',
        'metrics.revenue', 'metrics.venituri', 'metrics.totalVenituri'
      ]);

      // FALLBACK 1: Extract from analysis_result text
      if (merged.revenue === 0 && m.analysis_result) {
        console.log('🔍 Fallback 1: Extrag revenue din analysis_result text');
        merged.revenue = extractRevenueFromAnalysisText(m.analysis_result);
        if (merged.revenue > 0) {
          console.log(`✅ Revenue găsit în text: ${merged.revenue}`);
        }
      }

      // FALLBACK 2: Sum accounts 7000-7999 from balance_data
      if (merged.revenue === 0 && m.balance_data) {
        console.log('🔍 Fallback 2: Sumez conturile 70xx din balance_data');
        merged.revenue = sumAccountsInRange(m.balance_data, 7000, 7999);
        if (merged.revenue > 0) {
          console.log(`✅ Revenue calculat din conturi: ${merged.revenue}`);
        }
      }
    }

    // Expenses
    if (merged.expenses === 0) {
      merged.expenses = pickFirstNumber(m, [
        'expenses', 'cheltuieli', 'totalCheltuieli', 'costuri',
        'indicators.cheltuieli', 'indicators.totalCheltuieli', 'indicators.costuri',
        'indicatori.cheltuieli', 'indicatori.totalCheltuieli', 'indicatori.costuri',
        'metrics.expenses', 'metrics.cheltuieli', 'metrics.totalCheltuieli'
      ]);
    }

    // Profit
    if (merged.profit === 0) {
      merged.profit = pickFirstNumber(m, [
        'profit', 'profitNet', 'profitBrut', 'rezultat',
        'indicators.profit', 'indicators.profitNet', 'indicators.rezultat',
        'indicatori.profit', 'indicatori.profitNet', 'indicatori.rezultat',
        'metrics.profit', 'metrics.profitNet'
      ]);
    }

    // Sold Banca
    if (merged.soldBanca === 0) {
      merged.soldBanca = pickFirstNumber(m, [
        'soldBanca', 'cashBanca', 'banca', 'conturiBancare',
        'indicators.soldBanca', 'indicators.banca', 'indicators.conturiBancare',
        'indicatori.soldBanca', 'indicatori.banca', 'indicatori.conturiBancare',
        'metrics.soldBanca', 'metrics.banca'
      ]);
      
      // FALLBACK: Sum ALL bank accounts (51xx) from balance_data
      if (merged.soldBanca === 0 && m.balance_data) {
        console.log('🔍 Fallback: Sumez TOATE conturile bancare (51xx) din balance_data');
        merged.soldBanca = sumBankAccounts(m.balance_data);
        if (merged.soldBanca > 0) {
          console.log(`✅ Sold bancă calculat din balance_data: ${merged.soldBanca}`);
        }
      }
    }

    // Sold Casa
    if (merged.soldCasa === 0) {
      merged.soldCasa = pickFirstNumber(m, [
        'soldCasa', 'cashCasa', 'casa', 'numerar',
        'indicators.soldCasa', 'indicators.casa', 'indicators.numerar',
        'indicatori.soldCasa', 'indicatori.casa', 'indicatori.numerar',
        'metrics.soldCasa', 'metrics.casa'
      ]);
      
      // FALLBACK: Sum ALL cash accounts (53xx) from balance_data
      if (merged.soldCasa === 0 && m.balance_data) {
        console.log('🔍 Fallback: Sumez TOATE conturile casă (53xx) din balance_data');
        merged.soldCasa = sumCashAccounts(m.balance_data);
        if (merged.soldCasa > 0) {
          console.log(`✅ Sold casă calculat din balance_data: ${merged.soldCasa}`);
        }
      }
    }

    // Sold Clienti (creanțe)
    if (merged.soldClienti === 0) {
      merged.soldClienti = pickFirstNumber(m, [
        'soldClienti', 'creante', 'clienti', 'receivables',
        'indicators.soldClienti', 'indicators.creante', 'indicators.clienti',
        'indicatori.soldClienti', 'indicatori.creante', 'indicatori.clienti',
        'metrics.soldClienti', 'metrics.creante'
      ]);
    }

    // Sold Furnizori (datorii)
    if (merged.soldFurnizori === 0) {
      merged.soldFurnizori = pickFirstNumber(m, [
        'soldFurnizori', 'datorii', 'furnizori', 'payables',
        'indicators.soldFurnizori', 'indicators.datorii', 'indicators.furnizori',
        'indicatori.soldFurnizori', 'indicatori.datorii', 'indicatori.furnizori',
        'metrics.soldFurnizori', 'metrics.datorii'
      ]);
    }

    // DSO (Days Sales Outstanding)
    if (merged.dso === 0) {
      merged.dso = pickFirstNumber(m, [
        'dso', 'dso_zile', 'DSO', 'daysSalesOutstanding',
        'indicators.dso', 'indicators.dso_zile',
        'indicatori.dso', 'indicatori.dso_zile',
        'metrics.dso'
      ]);
    }

    // DPO (Days Payable Outstanding)
    if (merged.dpo === 0) {
      merged.dpo = pickFirstNumber(m, [
        'dpo', 'dpo_zile', 'DPO', 'daysPayableOutstanding',
        'indicators.dpo', 'indicators.dpo_zile',
        'indicatori.dpo', 'indicatori.dpo_zile',
        'metrics.dpo'
      ]);
    }
  }

  // Recalculate profit from revenue - expenses (ALWAYS, to fix incorrect saved values)
  if (merged.revenue > 0 && merged.expenses > 0) {
    const calculatedProfit = merged.revenue - merged.expenses;
    
    // If saved profit differs significantly from calculated, use calculated
    if (Math.abs(merged.profit - calculatedProfit) > 1) {
      console.log(`⚠️ Profit salvat (${merged.profit}) diferă de cel calculat (${calculatedProfit}). Folosim calculatul.`);
      merged.profit = calculatedProfit;
    }
  }
  
  // Fallback to ebitda if profit is still 0
  if (merged.profit === 0 && merged.revenue > 0) {
    const ebitda = pickFirstNumber(data[0]?.metadata || {}, [
      'ebitda', 'EBITDA', 'indicators.ebitda', 'indicatori.ebitda'
    ]);
    if (ebitda !== 0) {
      console.log(`✅ Folosim EBITDA (${ebitda}) ca profit`);
      merged.profit = ebitda;
    }
  }

  console.log('✅ CFO - Parsed financial data:', merged);
  console.log('🔍 getLatestFinancialData - Final merged values:', {
    revenue: merged.revenue,
    expenses: merged.expenses,
    profit: merged.profit,
    soldBanca: merged.soldBanca,
    soldCasa: merged.soldCasa,
    soldClienti: merged.soldClienti,
    soldFurnizori: merged.soldFurnizori,
    dso: merged.dso,
    dpo: merged.dpo
  });

  // Get company info from the most recent analysis
  let foundCompanyId: string | undefined = undefined;
  let companyName: string | undefined = undefined;
  
  if (data[0]?.company_id) {
    foundCompanyId = data[0].company_id;
    
    // Fetch company name from companies table
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', foundCompanyId)
      .single();
    
    if (!companyError && companyData) {
      companyName = companyData.company_name;
      console.log('✅ CFO - Company info from DB:', { companyId: foundCompanyId, companyName });
    }
  } else {
    // FALLBACK: Extract company name from metadata or file_name
    const metadataObj = data[0]?.metadata as Record<string, any> | null;
    const fileName = data[0]?.file_name;
    
    // Try to get company name from metadata first
    companyName = metadataObj?.company_name || 
                 metadataObj?.companyName ||
                 metadataObj?.nume_companie;
    
    // If not in metadata, extract from file_name (remove CUI and .xls extension)
    if (!companyName && fileName) {
      companyName = fileName
        .replace(/\d{8,10}\.xls.*$/i, '') // Remove CUI (8-10 digits) and .xls extension
        .replace(/_/g, ' ')                // Replace underscores with spaces
        .trim();
    }
    
    // Use analysis ID as pseudo company ID
    foundCompanyId = analysisId || data[0]?.id;
    
    console.log('✅ CFO - Company info from FALLBACK:', { 
      companyId: foundCompanyId, 
      companyName: companyName || 'Companie Necunoscută',
      source: metadataObj?.company_name ? 'metadata' : 'file_name'
    });
    
    // Default if nothing found
    if (!companyName) {
      companyName = 'Companie Necunoscută';
    }
  }

  return {
    revenue: merged.revenue,
    expenses: merged.expenses,
    profit: merged.profit,
    soldBanca: merged.soldBanca,
    soldCasa: merged.soldCasa,
    soldClienti: merged.soldClienti,
    soldFurnizori: merged.soldFurnizori,
    dso: merged.dso,
    dpo: merged.dpo,
    companyId: foundCompanyId,
    companyName
  };
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
