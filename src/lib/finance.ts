/**
 * 🔐 BIBLIOTECA CALCULE FINANCIARE PRECISE
 * 
 * Folosește decimal.js pentru a evita erorile de floating point în calcule financiare.
 * TOATE sumele de bani trebuie procesate prin aceste funcții.
 * 
 * Exemplu problemă floating point:
 * ❌ 1000.10 - 999.20 = 0.9000000000000341 (JavaScript native)
 * ✅ 1000.10 - 999.20 = 0.90 (cu decimal.js)
 */

import Decimal from 'decimal.js';

// Configurare globală pentru calcule monetare (2 zecimale, rotunjire bancară)
Decimal.set({ 
  precision: 20,           // Precizie internă mare
  rounding: Decimal.ROUND_HALF_EVEN  // Rotunjire bancară (IEEE 754)
});

/**
 * Convertește orice input la Decimal sigur
 * @param value - String, Number, sau null/undefined
 * @returns Decimal valid sau 0 dacă input invalid
 */
export function toDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }

  // Dacă e string, curăță spațiile
  const cleaned = typeof value === 'string' ? value.trim() : value;

  try {
    const decimal = new Decimal(cleaned);
    
    // Verifică dacă rezultatul e valid (nu NaN, nu Infinity)
    if (!decimal.isFinite()) {
      console.warn(`[finance] Invalid decimal value: ${value}, returning 0`);
      return new Decimal(0);
    }
    
    return decimal;
  } catch (error) {
    console.warn(`[finance] Failed to parse "${value}" as decimal, returning 0:`, error);
    return new Decimal(0);
  }
}

/**
 * Parse sigur pentru validare strictă (returnează null dacă invalid)
 * Folosește când vrei să știi EXPLICIT că valoarea e invalidă
 */
export function safeParseDecimal(value: string | number | null | undefined): Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const cleaned = typeof value === 'string' ? value.trim() : value;

  try {
    const decimal = new Decimal(cleaned);
    if (!decimal.isFinite()) {
      return null;
    }
    return decimal;
  } catch {
    return null;
  }
}

/**
 * Validare strictă: returnează număr sau null
 * Folosește pentru validări unde trebuie să detectezi input invalid
 */
export function safeParseFloat(value: any): number | null {
  const decimal = safeParseDecimal(value);
  return decimal ? decimal.toNumber() : null;
}

/**
 * Formatează sumă monetară cu 2 zecimale
 * @param value - Valoare numerică sau Decimal
 * @param currency - Simbol monedă (default: 'RON')
 * @returns String formatat: "1,234.56 RON"
 */
export function formatMoney(
  value: string | number | Decimal | null | undefined, 
  currency: string = 'RON'
): string {
  const decimal = value instanceof Decimal ? value : toDecimal(value);
  
  // Rotunjire la 2 zecimale
  const rounded = decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  
  // Formatare cu separatori
  const formatted = rounded.toNumber().toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${formatted} ${currency}`;
}

/**
 * Formatează sumă fără simbol monetar (pentru export Excel, etc.)
 */
export function formatMoneyPlain(value: string | number | Decimal | null | undefined): string {
  const decimal = value instanceof Decimal ? value : toDecimal(value);
  const rounded = decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  
  return rounded.toNumber().toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Calcul TVA precis
 * @param amount - Suma de bază
 * @param rate - Cota TVA (ex: 19 pentru 19%)
 * @returns TVA calculat cu 2 zecimale
 */
export function calculateTVA(
  amount: string | number | Decimal,
  rate: number = 19
): Decimal {
  const baseAmount = amount instanceof Decimal ? amount : toDecimal(amount);
  const rateDecimal = new Decimal(rate).dividedBy(100);
  
  const tva = baseAmount.times(rateDecimal);
  
  // Rotunjire la 2 zecimale (conform legislației fiscale)
  return tva.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Calcul sumă cu TVA inclusă
 */
export function addTVA(
  amount: string | number | Decimal,
  rate: number = 19
): Decimal {
  const baseAmount = amount instanceof Decimal ? amount : toDecimal(amount);
  const tva = calculateTVA(baseAmount, rate);
  
  return baseAmount.plus(tva).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Extrage bază impozabilă din sumă cu TVA
 */
export function extractBaseFromTVA(
  amountWithTVA: string | number | Decimal,
  rate: number = 19
): Decimal {
  const total = amountWithTVA instanceof Decimal ? amountWithTVA : toDecimal(amountWithTVA);
  const divisor = new Decimal(1).plus(new Decimal(rate).dividedBy(100));
  
  return total.dividedBy(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Calcul diferență (pentru balanțe contabile)
 */
export function subtract(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  const aDecimal = a instanceof Decimal ? a : toDecimal(a);
  const bDecimal = b instanceof Decimal ? b : toDecimal(b);
  
  return aDecimal.minus(bDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Calcul sumă
 */
export function add(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  const aDecimal = a instanceof Decimal ? a : toDecimal(a);
  const bDecimal = b instanceof Decimal ? b : toDecimal(b);
  
  return aDecimal.plus(bDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Calcul multiplicare
 */
export function multiply(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  const aDecimal = a instanceof Decimal ? a : toDecimal(a);
  const bDecimal = b instanceof Decimal ? b : toDecimal(b);
  
  return aDecimal.times(bDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Calcul împărțire (cu protecție diviziune la 0)
 */
export function divide(
  a: string | number | Decimal,
  b: string | number | Decimal
): Decimal {
  const aDecimal = a instanceof Decimal ? a : toDecimal(a);
  const bDecimal = b instanceof Decimal ? b : toDecimal(b);
  
  if (bDecimal.isZero()) {
    console.warn('[finance] Division by zero attempted, returning 0');
    return new Decimal(0);
  }
  
  return aDecimal.dividedBy(bDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Validare sumă negativă (pentru câmpuri unde nu e permisă)
 */
export function isNegative(value: string | number | Decimal): boolean {
  const decimal = value instanceof Decimal ? value : toDecimal(value);
  return decimal.isNegative();
}

/**
 * Validare sumă pozitivă (mai mare ca 0)
 */
export function isPositive(value: string | number | Decimal): boolean {
  const decimal = value instanceof Decimal ? value : toDecimal(value);
  return decimal.greaterThan(0);
}

/**
 * Comparație egalitate (cu toleranță pentru erori de rotunjire)
 */
export function areEqual(
  a: string | number | Decimal,
  b: string | number | Decimal,
  tolerance: number = 0.01
): boolean {
  const aDecimal = a instanceof Decimal ? a : toDecimal(a);
  const bDecimal = b instanceof Decimal ? b : toDecimal(b);
  
  const diff = aDecimal.minus(bDecimal).abs();
  return diff.lessThanOrEqualTo(tolerance);
}

/**
 * Sumă array de valori (pentru totalizare)
 */
export function sum(values: (string | number | Decimal)[]): Decimal {
  let total = new Decimal(0);
  
  for (const value of values) {
    const decimal = value instanceof Decimal ? value : toDecimal(value);
    total = total.plus(decimal);
  }
  
  return total.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Verifică dacă valoarea e validă numeric
 */
export function isValidNumber(value: any): boolean {
  return safeParseDecimal(value) !== null;
}

/**
 * Convertește Decimal la number pentru storage
 * Folosește doar pentru salvare în DB, nu pentru calcule
 */
export function toNumber(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();
}
