// Utilitar pentru extragerea indicatorilor numerici din textul analizei

export interface FinancialIndicators {
  dso?: number;
  dpo?: number;
  cashConversionCycle?: number;
  ebitda?: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtRatio?: number;
}

export const parseAnalysisText = (text: string): FinancialIndicators => {
  const indicators: FinancialIndicators = {};

  // DSO (Days Sales Outstanding)
  const dsoMatch = text.match(/DSO[:\s]+(\d+(?:\.\d+)?)/i);
  if (dsoMatch) indicators.dso = parseFloat(dsoMatch[1]);

  // DPO (Days Payable Outstanding)
  const dpoMatch = text.match(/DPO[:\s]+(\d+(?:\.\d+)?)/i);
  if (dpoMatch) indicators.dpo = parseFloat(dpoMatch[1]);

  // Cash Conversion Cycle
  const cccMatch = text.match(/Cash\s+Conversion\s+Cycle[:\s]+(\d+(?:\.\d+)?)/i);
  if (cccMatch) indicators.cashConversionCycle = parseFloat(cccMatch[1]);

  // EBITDA
  const ebitdaMatch = text.match(/EBITDA[:\s]+(?:RON\s*)?([+-]?\d+(?:[.,]\d+)?)/i);
  if (ebitdaMatch) {
    indicators.ebitda = parseFloat(ebitdaMatch[1].replace(',', ''));
  }

  // Venituri (Revenue)
  const revenueMatch = text.match(/(?:Venituri|Revenue)[:\s]+(?:RON\s*)?(\d+(?:[.,]\d+)?)/i);
  if (revenueMatch) {
    indicators.revenue = parseFloat(revenueMatch[1].replace(',', ''));
  }

  // Cheltuieli (Expenses)
  const expensesMatch = text.match(/(?:Cheltuieli|Expenses)[:\s]+(?:RON\s*)?(\d+(?:[.,]\d+)?)/i);
  if (expensesMatch) {
    indicators.expenses = parseFloat(expensesMatch[1].replace(',', ''));
  }

  // Profit
  const profitMatch = text.match(/(?:Profit|Net\s+Income)[:\s]+(?:RON\s*)?([+-]?\d+(?:[.,]\d+)?)/i);
  if (profitMatch) {
    indicators.profit = parseFloat(profitMatch[1].replace(',', ''));
  }

  // Current Ratio
  const currentRatioMatch = text.match(/Current\s+Ratio[:\s]+(\d+(?:\.\d+)?)/i);
  if (currentRatioMatch) indicators.currentRatio = parseFloat(currentRatioMatch[1]);

  // Quick Ratio
  const quickRatioMatch = text.match(/Quick\s+Ratio[:\s]+(\d+(?:\.\d+)?)/i);
  if (quickRatioMatch) indicators.quickRatio = parseFloat(quickRatioMatch[1]);

  // Debt Ratio
  const debtRatioMatch = text.match(/Debt\s+Ratio[:\s]+(\d+(?:\.\d+)?)/i);
  if (debtRatioMatch) indicators.debtRatio = parseFloat(debtRatioMatch[1]);

  return indicators;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};