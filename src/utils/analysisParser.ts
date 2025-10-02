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

  // Caută secțiunea cu indicatori financiari structurați
  const structuredSection = text.match(/===\s*INDICATORI\s+FINANCIARI\s*===[\s\S]*?(?=\n\n|$)/i);
  
  if (structuredSection) {
    const section = structuredSection[0];
    
    // DSO
    const dsoMatch = section.match(/DSO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dsoMatch) indicators.dso = parseFloat(dsoMatch[1]);

    // DPO
    const dpoMatch = section.match(/DPO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dpoMatch) indicators.dpo = parseFloat(dpoMatch[1]);

    // CCC (Cash Conversion Cycle)
    const cccMatch = section.match(/CCC[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (cccMatch) indicators.cashConversionCycle = parseFloat(cccMatch[1]);

    // EBITDA
    const ebitdaMatch = section.match(/EBITDA[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (ebitdaMatch) indicators.ebitda = parseFloat(ebitdaMatch[1]);

    // CA (Cifra de afaceri / Revenue)
    const caMatch = section.match(/CA[:\s]+(\d+(?:\.\d+)?)/i);
    if (caMatch) indicators.revenue = parseFloat(caMatch[1]);

    // Cheltuieli
    const expensesMatch = section.match(/Cheltuieli[:\s]+(\d+(?:\.\d+)?)/i);
    if (expensesMatch) indicators.expenses = parseFloat(expensesMatch[1]);

    // Profit
    const profitMatch = section.match(/Profit[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (profitMatch) indicators.profit = parseFloat(profitMatch[1]);
  }
  
  // Căutare în ultimele 15 linii ale textului pentru indicatori fără header
  // (pentru cazurile când AI-ul nu adaugă secțiunea structurată)
  const lines = text.trim().split('\n');
  const lastLines = lines.slice(-15).join('\n');
  
  // Doar dacă nu am găsit nimic în secțiunea structurată
  if (Object.keys(indicators).length === 0) {
    // DSO
    const dsoMatch = lastLines.match(/DSO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dsoMatch) indicators.dso = parseFloat(dsoMatch[1]);

    // DPO
    const dpoMatch = lastLines.match(/DPO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dpoMatch) indicators.dpo = parseFloat(dpoMatch[1]);

    // CCC (Cash Conversion Cycle)
    const cccMatch = lastLines.match(/CCC[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (cccMatch) indicators.cashConversionCycle = parseFloat(cccMatch[1]);

    // EBITDA - poate fi și text
    const ebitdaMatch = lastLines.match(/EBITDA[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (ebitdaMatch) indicators.ebitda = parseFloat(ebitdaMatch[1]);

    // CA (Cifra de afaceri / Revenue)
    const caMatch = lastLines.match(/CA[:\s]+(\d+(?:\.\d+)?)/i);
    if (caMatch) indicators.revenue = parseFloat(caMatch[1]);

    // Cheltuieli
    const expensesMatch = lastLines.match(/Cheltuieli[:\s]+(\d+(?:\.\d+)?)/i);
    if (expensesMatch) indicators.expenses = parseFloat(expensesMatch[1]);

    // Profit
    const profitMatch = lastLines.match(/Profit[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (profitMatch) indicators.profit = parseFloat(profitMatch[1]);
  }

  // Fallback final: caută valorile în întregul text (pentru analize vechi)
  if (Object.keys(indicators).length === 0) {
    // Cifra de afaceri
    const caMatch = text.match(/Cifra\s+de\s+afaceri\s+(?:anuală\s+)?(?:cumulată\s+)?[=:]\s*([0-9,.]+)\s*RON/i);
    if (caMatch) {
      indicators.revenue = parseFloat(caMatch[1].replace(/,/g, ''));
    }

    // Profit net
    const profitMatch = text.match(/Profit(?:\s+net)?[:\s]+([+-]?\d+(?:[.,]\d+)?)\s*RON/i);
    if (profitMatch) {
      indicators.profit = parseFloat(profitMatch[1].replace(/,/g, ''));
    }

    // EBITDA
    const ebitdaMatch = text.match(/EBITDA[:\s]+(?:RON\s*)?([+-]?\d+(?:[.,]\d+)?)/i);
    if (ebitdaMatch) {
      indicators.ebitda = parseFloat(ebitdaMatch[1].replace(/,/g, ''));
    }
  }

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