/**
 * Calculator Taxe PFA România
 * 
 * Adapted from: https://github.com/taxepfa/taxepfa.github.io (MIT License)
 * Original author: Ionuț-Cristian Florescu
 * 
 * Calculates CAS (pension), CASS (health), and income tax for Romanian PFAs
 * Updated with 2025-2026 thresholds.
 */

// ============================================================================
// CONSTANTS (from taxepfa lib/config.ts - updated for 2025-2026)
// ============================================================================

const WEEKS_PER_YEAR = 52.1429;
const WEEKS_PER_MONTH = 4.34524;

/** CAS (pension) rate - 25% */
const PENSION_PERCENTAGE = 0.25;

/** CASS (health) rate - 10% */
const HEALTH_PERCENTAGE = 0.10;

/** Income tax rate - 10% */
const INCOME_TAX_PERCENTAGE = 0.10;

/** Minimum gross salary 2025 (RON) */
const DEFAULT_MINIMUM_WAGE = 4_050;

/** VAT registration threshold 2025 (RON) */
const DEFAULT_VAT_THRESHOLD = 300_000;

export type IncomeInterval = 'hourly' | 'daily' | 'monthly' | 'yearly';

export interface PFATaxInput {
  /** Gross income amount */
  income: number;
  /** Income currency (RON, EUR, USD, GBP) */
  incomeCurrency?: string;
  /** Income interval */
  incomeInterval?: IncomeInterval;
  /** Working hours per week */
  workingHoursPerWeek?: number;
  /** Working days per week */
  workingDaysPerWeek?: number;
  /** Vacation weeks per year */
  vacationWeeksPerYear?: number;
  /** Deductible expenses (yearly or monthly based on deductibleExpensesInterval) */
  deductibleExpenses?: number;
  /** Deductible expenses interval */
  deductibleExpensesInterval?: 'monthly' | 'yearly';
  /** Minimum gross salary (default: 4050 RON for 2025) */
  minimumWage?: number;
  /** VAT threshold (default: 300000 RON) */
  vatThreshold?: number;
  /** Exchange rates: { EUR: 4.97, USD: 4.56, ... } */
  exchangeRates?: Record<string, number>;
}

export interface PFATaxResult {
  /** Gross annual income in RON */
  grossIncomeRON: number;
  /** Whether income exceeds VAT threshold */
  exceedsVATThreshold: boolean;
  /** Net annual income in RON */
  netIncomeRON: number;
  /** Net income in original currency/interval */
  netIncome: number;
  /** Total taxes in RON */
  totalTaxRON: number;
  /** Effective total tax rate (%) */
  totalTaxPercent: number;
  /** CAS (pension) amount in RON */
  pensionTaxRON: number;
  /** Effective CAS rate (%) */
  pensionTaxPercent: number;
  /** CASS (health) amount in RON */
  healthTaxRON: number;
  /** Effective CASS rate (%) */
  healthTaxPercent: number;
  /** Income tax amount in RON */
  incomeTaxRON: number;
  /** Effective income tax rate (%) */
  incomeTaxPercent: number;
  /** Monthly net income in RON */
  monthlyNetRON: number;
  /** CAS threshold applied (12 or 24 minimum wages) */
  casThreshold: string;
  /** CASS threshold applied */
  cassThreshold: string;
}

// ============================================================================
// CALCULATOR (from taxepfa lib/taxes.ts - calculateTaxes)
// ============================================================================

export function calculatePFATaxes(input: PFATaxInput): PFATaxResult | null {
  const {
    incomeCurrency = 'RON',
    incomeInterval = 'monthly',
    workingHoursPerWeek = 40,
    workingDaysPerWeek = 5,
    vacationWeeksPerYear = 4,
    deductibleExpenses = 0,
    deductibleExpensesInterval = 'monthly',
    minimumWage = DEFAULT_MINIMUM_WAGE,
    vatThreshold = DEFAULT_VAT_THRESHOLD,
    exchangeRates,
  } = input;

  let income = input.income;

  // Check if exchange rates needed but not provided
  if (incomeCurrency !== 'RON' && !exchangeRates?.[incomeCurrency]) {
    return null;
  }

  // Convert income to annual RON
  if (incomeInterval === 'hourly') {
    income *= workingHoursPerWeek * (WEEKS_PER_YEAR - vacationWeeksPerYear);
  } else if (incomeInterval === 'daily') {
    income *= workingDaysPerWeek * (WEEKS_PER_YEAR - vacationWeeksPerYear);
  } else if (incomeInterval === 'monthly') {
    income *= 12 - vacationWeeksPerYear / WEEKS_PER_MONTH;
  }

  income = Math.max(income, 0);

  // Convert to RON
  if (incomeCurrency !== 'RON' && exchangeRates) {
    income *= exchangeRates[incomeCurrency];
  }

  const grossIncomeRON = income;

  // Deductible expenses to annual RON
  let expenses = deductibleExpenses;
  if (deductibleExpensesInterval === 'monthly') expenses *= 12;
  if (incomeCurrency !== 'RON' && exchangeRates) {
    // expenses assumed same currency as income
  }

  income -= expenses;

  // CAS (pension) - based on income vs minimum wage thresholds
  let pensionTaxRON = 0;
  let casThreshold = 'sub 12 salarii minime';
  if (income >= minimumWage * 24) {
    pensionTaxRON = minimumWage * 24 * PENSION_PERCENTAGE;
    casThreshold = '24 salarii minime';
  } else if (income >= minimumWage * 12) {
    pensionTaxRON = minimumWage * 12 * PENSION_PERCENTAGE;
    casThreshold = '12 salarii minime';
  }
  const pensionTaxPercent = grossIncomeRON === 0 ? 0 : (pensionTaxRON / grossIncomeRON) * 100;

  // CASS (health) - based on income vs minimum wage thresholds
  let healthTaxRON = 0;
  let cassThreshold = '6 salarii minime (minim)';
  if (income >= minimumWage * 60) {
    healthTaxRON = minimumWage * 60 * HEALTH_PERCENTAGE;
    cassThreshold = '60 salarii minime (maxim)';
  } else if (income >= minimumWage * 6) {
    healthTaxRON = income * HEALTH_PERCENTAGE;
    cassThreshold = 'venitul net';
  } else {
    healthTaxRON = minimumWage * 6 * HEALTH_PERCENTAGE;
  }
  const healthTaxPercent = grossIncomeRON === 0 ? 0 : (healthTaxRON / grossIncomeRON) * 100;

  // Income tax
  const taxableIncome = Math.max(income - pensionTaxRON - healthTaxRON, 0);
  const incomeTaxRON = taxableIncome * INCOME_TAX_PERCENTAGE;
  const incomeTaxPercent = grossIncomeRON === 0 ? 0 : (incomeTaxRON / grossIncomeRON) * 100;

  // Totals
  const totalTaxRON = pensionTaxRON + healthTaxRON + incomeTaxRON;
  const totalTaxPercent = grossIncomeRON === 0 ? 0 : (totalTaxRON / grossIncomeRON) * 100;
  const netIncomeRON = grossIncomeRON - totalTaxRON;

  // Convert net back to original currency/interval
  let netIncome = netIncomeRON;
  if (incomeCurrency !== 'RON' && exchangeRates) {
    netIncome /= exchangeRates[incomeCurrency];
  }
  if (incomeInterval === 'hourly') {
    netIncome /= workingHoursPerWeek * (WEEKS_PER_YEAR - vacationWeeksPerYear);
  } else if (incomeInterval === 'daily') {
    netIncome /= workingDaysPerWeek * (WEEKS_PER_YEAR - vacationWeeksPerYear);
  } else if (incomeInterval === 'monthly') {
    netIncome /= 12 - vacationWeeksPerYear / WEEKS_PER_MONTH;
  }

  return {
    grossIncomeRON: Math.round(grossIncomeRON),
    exceedsVATThreshold: grossIncomeRON > vatThreshold,
    netIncomeRON: Math.round(netIncomeRON),
    netIncome: Math.round(netIncome * 100) / 100,
    totalTaxRON: Math.round(totalTaxRON),
    totalTaxPercent: Math.round(totalTaxPercent * 100) / 100,
    pensionTaxRON: Math.round(pensionTaxRON),
    pensionTaxPercent: Math.round(pensionTaxPercent * 100) / 100,
    healthTaxRON: Math.round(healthTaxRON),
    healthTaxPercent: Math.round(healthTaxPercent * 100) / 100,
    incomeTaxRON: Math.round(incomeTaxRON),
    incomeTaxPercent: Math.round(incomeTaxPercent * 100) / 100,
    monthlyNetRON: Math.round(netIncomeRON / 12),
    casThreshold,
    cassThreshold,
  };
}

// ============================================================================
// QUICK HELPERS
// ============================================================================

/** Quick calculation for monthly RON income PFA */
export function quickPFATax(monthlyIncome: number): PFATaxResult | null {
  return calculatePFATaxes({
    income: monthlyIncome,
    incomeInterval: 'monthly',
  });
}

/** Format RON amount with thousands separator */
export function formatRON(amount: number): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(amount) + ' RON';
}

/** Format percentage */
export function formatPercent(percent: number): string {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(percent) + '%';
}
