// Utilitar pentru extragerea indicatorilor numerici din textul analizei

export interface FinancialIndicators {
  dso?: number;
  dpo?: number;
  dio?: number; // ✅ ADĂUGAT - Days Inventory Outstanding
  cashConversionCycle?: number;
  ebitda?: number;
  revenue?: number;
  ca?: number; // Alias pentru revenue (cifră de afaceri)
  expenses?: number;
  profit?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtRatio?: number;
  soldFurnizori?: number;
  soldClienti?: number;
  soldBanca?: number;
  soldCasa?: number;
  soldStocuri?: number; // ✅ ADĂUGAT - Cont 371 Mărfuri
  soldMateriiPrime?: number; // ✅ ADĂUGAT - Cont 301
  soldMateriale?: number; // ✅ ADĂUGAT - Cont 302
  cheltuieli?: number; // Alias pentru expenses
}

export const parseAnalysisText = (text: string): FinancialIndicators => {
  const indicators: FinancialIndicators = {};

  // Funcție îmbunătățită pentru extragere numere românești
  const toNumberRo = (raw?: string): number | undefined => {
    if (!raw) return undefined;
    if (typeof raw === 'number') return raw;
    
    let str = String(raw).trim();
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    const lastSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
    
    if (lastSeparatorIndex === -1) {
      str = str.replace(/[^0-9-]/g, '');
      if (!str) return undefined;
      const n = parseFloat(str);
      return Number.isFinite(n) ? n : undefined;
    }
    
    let integerPart = str.substring(0, lastSeparatorIndex);
    let decimalPart = str.substring(lastSeparatorIndex + 1);
    
    integerPart = integerPart.replace(/[.,]/g, '').replace(/[^0-9-]/g, '');
    decimalPart = decimalPart.replace(/[^0-9]/g, '');
    
    const standardFormat = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    if (!standardFormat) return undefined;
    
    const n = parseFloat(standardFormat);
    return Number.isFinite(n) ? n : undefined;
  };

  const get = (re: RegExp): number | undefined => {
    const m = text.match(re);
    return m ? toNumberRo(m[1]) : undefined;
  };

  // ÎMBUNĂTĂȚIT: Extragere mai robustă cu multiple pattern-uri
  
  // 1. Cifra de Afaceri / Venituri
  indicators.revenue = get(/(?:Cifr[ăa]\s*(?:de\s+)?Afaceri|Venituri\s*totale?|Total\s*venituri|\bCA\b)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/Venituri[^\d]*([0-9.,\s]+)/i)
    ?? get(/CA[^\d]*([0-9.,\s]+)/i);

  // 2. Cheltuieli
  indicators.expenses = get(/(?:Cheltuieli(?:\s+totale)?|Total\s*cheltuieli)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/Cheltuieli[^\d]*([0-9.,\s]+)/i);
  
  // Alias pentru compatibilitate
  indicators.cheltuieli = indicators.expenses;

  // 3. Profit / Pierdere (acceptă valori negative)
  indicators.profit = get(/(?:Profit(?:\s+net)?|Rezultat(?:\s+(?:net|exerci[tț]iu))?|Pierdere)\s*[:=\-]?\s*(?:RON|lei)?\s*([-]?[0-9.,\s]+)/i)
    ?? get(/Profit[^\d]*([-]?[0-9.,\s]+)/i);

  // 4. EBITDA
  indicators.ebitda = get(/EBITDA\s*[:=\-]?\s*(?:RON|lei)?\s*([-]?[0-9.,\s]+)/i);

  // 5. DSO (Days Sales Outstanding)
  indicators.dso = get(/(?:DSO|Days\s*Sales\s*Outstanding|Zile\s*clien[tț]i)\s*[:=\-]?\s*([0-9.,]+)\s*(?:zile|days)?/i);

  // 6. DPO (Days Payable Outstanding)
  indicators.dpo = get(/(?:DPO|Days\s*Payable\s*Outstanding|Zile\s*furnizori)\s*[:=\-]?\s*([0-9.,]+)\s*(?:zile|days)?/i);

  // 7. CCC (Cash Conversion Cycle)
  indicators.cashConversionCycle = get(/(?:CCC|Cash\s*Conversion\s*Cycle|Ciclu\s*cash)\s*[:=\-]?\s*([0-9.,]+)\s*(?:zile|days)?/i);

  // 8. Sold Bancă
  indicators.soldBanca = get(/(?:Sold\s*(?:Banc[ăa]|conturi?\s*bancare)|Banc[ăa]|Conturi?\s*bancare)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/5121[^\d]*([0-9.,\s]+)/i); // Cont 5121

  // 9. Sold Casă
  indicators.soldCasa = get(/(?:Sold\s*Cas[ăa]|Cas[ăa]|Numerar)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/5311[^\d]*([0-9.,\s]+)/i); // Cont 5311

  // 10. Sold Clienți
  indicators.soldClienti = get(/(?:Sold\s*Clien[tț]i|Clien[tț]i|Crean[tț]e\s*clien[tț]i)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/411[^\d]*([0-9.,\s]+)/i); // Cont 411

  // 11. Sold Furnizori
  indicators.soldFurnizori = get(/(?:Sold\s*Furnizori|Furnizori|Datorii\s*furnizori)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/401[^\d]*([0-9.,\s]+)/i); // Cont 401

  // 12. Stocuri (Mărfuri)
  indicators.soldStocuri = get(/(?:Stocuri|M[ăa]rfuri|Cont\s*371)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/371[^\d]*([0-9.,\s]+)/i);

  // 13. Materii Prime
  indicators.soldMateriiPrime = get(/(?:Materii\s*prime|Cont\s*301)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/301[^\d]*([0-9.,\s]+)/i);

  // 14. Materiale
  indicators.soldMateriale = get(/(?:Materiale|Cont\s*302)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s]+)/i)
    ?? get(/302[^\d]*([0-9.,\s]+)/i);

  // 15. DIO (Days Inventory Outstanding)
  indicators.dio = get(/(?:DIO|Days\s*Inventory\s*Outstanding|Zile\s*stocuri|Rota[tț]ie\s*stocuri)\s*[:=\-]?\s*([0-9.,]+)\s*(?:zile|days)?/i);

  // Fallback EBITDA
  if (indicators.ebitda === undefined && indicators.revenue !== undefined && indicators.expenses !== undefined) {
    indicators.ebitda = (indicators.revenue ?? 0) - (indicators.expenses ?? 0);
  }

  // Mapping compatibilitate: ca = revenue, cheltuieli = expenses
  const ca = indicators.revenue || 0;
  const cheltuieli = indicators.expenses || 0;

  // Log pentru debugging
  console.log('📊 Parsed indicators:', {
    revenue: indicators.revenue,
    ca: ca,
    expenses: indicators.expenses,
    cheltuieli: cheltuieli,
    profit: indicators.profit,
    soldBanca: indicators.soldBanca,
    soldCasa: indicators.soldCasa,
    dso: indicators.dso,
    dpo: indicators.dpo
  });

  return {
    ...indicators,
    ca, // Adaugă câmpul ca pentru compatibilitate cu calculations.ts
    cheltuieli // Adaugă câmpul cheltuieli pentru compatibilitate
  };
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