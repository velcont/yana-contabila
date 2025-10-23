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
  soldFurnizori?: number;
  soldClienti?: number;
  soldBanca?: number;
  soldCasa?: number;
}

export const parseAnalysisText = (text: string): FinancialIndicators => {
  const indicators: FinancialIndicators = {};

  const scope = (() => {
    const structured = text.match(/===\s*INDICATORI\s+FINANCIARI\s*===[\s\S]*?(?=\n\n|$)/i);
    return structured ? structured[0] : text;
  })();

  const toNumberRo = (raw?: string): number | undefined => {
    if (!raw) return undefined;
    
    // Dacă e deja număr, returnează direct
    if (typeof raw === 'number') return raw;
    
    // Convertește în string și curăță
    let str = String(raw).trim();
    
    // Găsește ultimul separator (punct sau virgulă)
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    
    // Determină care e ultimul separator
    const lastSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
    
    if (lastSeparatorIndex === -1) {
      // NU are separator → număr întreg
      str = str.replace(/[^0-9-]/g, '');
      if (!str) return undefined;
      const n = parseFloat(str);
      return Number.isFinite(n) ? n : undefined;
    }
    
    // ARE separator → împarte în parte întreagă + zecimale
    let integerPart = str.substring(0, lastSeparatorIndex);
    let decimalPart = str.substring(lastSeparatorIndex + 1);
    
    // Curăță partea întreagă: șterge TOȚI separatorii
    integerPart = integerPart.replace(/[.,]/g, '');
    integerPart = integerPart.replace(/[^0-9-]/g, '');
    
    // Curăță zecimalele
    decimalPart = decimalPart.replace(/[^0-9]/g, '');
    
    // Construiește numărul în format standard
    const standardFormat = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    if (!standardFormat) return undefined;
    
    const n = parseFloat(standardFormat);
    return Number.isFinite(n) ? n : undefined;
  };

  const get = (re: RegExp, src: string = scope): number | undefined => {
    const m = src.match(re);
    return m ? toNumberRo(m[1]) : undefined;
  };

  // Valori principale (acceptă diverse sinonime și prezența RON/lei)
  indicators.revenue = get(/(?:Cifr[ăa]\s*(?:de\s+)?Afaceri|Venituri|\bCA\b)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i)
    ?? get(/Cifra\s+de\s+afaceri[^\d]*([0-9.,\s\-]+)/i, text);

  indicators.expenses = get(/(?:Cheltuieli(?:\s+totale)?|Total\s*cheltuieli)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i)
    ?? get(/Cheltuieli[^\d]*([0-9.,\s\-]+)/i, text);

  indicators.profit = get(/(?:Profit(?:\s+net)?|Rezultat(?:\s+(?:net|exercitiu|exercițiu))?)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i)
    ?? get(/Profit[^\d]*([0-9.,\s\-]+)/i, text);

  indicators.ebitda = get(/EBITDA\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i);

  indicators.dso = get(/(?:DSO|Days\s*Sales\s*Outstanding)\s*[:=\-]?\s*([0-9.,\-]+)\s*(?:zile|days)?/i);
  indicators.dpo = get(/(?:DPO|Days\s*Payable\s*Outstanding)\s*[:=\-]?\s*([0-9.,\-]+)\s*(?:zile|days)?/i);
  indicators.cashConversionCycle = get(/(?:CCC|Cash\s*Conversion\s*Cycle)\s*[:=\-]?\s*([0-9.,\-]+)\s*(?:zile|days)?/i);

  // Solduri bilanț
  indicators.soldBanca = get(/(?:Sold\s*(?:Banc[ăa]|Banca)|Banc[ăa])\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i);
  indicators.soldClienti = get(/(?:Sold\s*Clien[tț]i|Clien[tț]i)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i);
  indicators.soldFurnizori = get(/(?:Sold\s*Furnizori|Furnizori)\s*[:=\-]?\s*(?:RON|lei)?\s*([0-9.,\s\-]+)/i);

  // Fallback simplu: dacă EBITDA lipsește dar avem CA și Cheltuieli
  if (indicators.ebitda === undefined && indicators.revenue !== undefined && indicators.expenses !== undefined) {
    indicators.ebitda = (indicators.revenue ?? 0) - (indicators.expenses ?? 0);
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