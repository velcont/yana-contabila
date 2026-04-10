/**
 * Invoice Calculator
 * Adapted from: https://github.com/kprovorov/invoi (MIT License)
 * Handles Romanian VAT calculations with multiple rates
 */

import type { InvoiceData, InvoiceLineItem, InvoiceTotals } from './invoiceTypes';

/**
 * Calculate line item total (without VAT)
 */
export function calculateLineTotal(item: InvoiceLineItem): number {
  return parseFloat((item.quantity * item.unitPrice).toFixed(2));
}

/**
 * Calculate line item VAT amount
 */
export function calculateLineVat(item: InvoiceLineItem, isVatPayer: boolean): number {
  if (!isVatPayer) return 0;
  const lineTotal = calculateLineTotal(item);
  return parseFloat((lineTotal * (item.vatRate / 100)).toFixed(2));
}

/**
 * Calculate all invoice totals with VAT breakdown by rate
 */
export function calculateInvoiceTotals(data: InvoiceData): InvoiceTotals {
  const subtotal = data.lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);

  // Group by VAT rate
  const vatMap = new Map<number, { base: number; amount: number }>();

  for (const item of data.lineItems) {
    const lineTotal = calculateLineTotal(item);
    const rate = data.isVatPayer ? item.vatRate : 0;
    const vatAmount = data.isVatPayer
      ? parseFloat((lineTotal * (item.vatRate / 100)).toFixed(2))
      : 0;

    const existing = vatMap.get(rate) || { base: 0, amount: 0 };
    existing.base = parseFloat((existing.base + lineTotal).toFixed(2));
    existing.amount = parseFloat((existing.amount + vatAmount).toFixed(2));
    vatMap.set(rate, existing);
  }

  const vatBreakdown = Array.from(vatMap.entries())
    .map(([rate, { base, amount }]) => ({ rate, base, amount }))
    .sort((a, b) => b.rate - a.rate);

  const totalVat = vatBreakdown.reduce((sum, v) => sum + v.amount, 0);
  const grandTotal = parseFloat((subtotal + totalVat).toFixed(2));

  return { subtotal, vatBreakdown, totalVat, grandTotal };
}

/**
 * Format currency amount for display (Romanian style)
 */
export function formatCurrencyRO(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for Romanian invoice display
 */
export function formatDateRO(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Convert number to Romanian words (for total in litere)
 */
export function numberToWordsRO(num: number): string {
  if (num === 0) return 'zero';

  const units = ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
  const teens = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece',
    'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
  const tens = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci',
    'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      return tens[t] + (u > 0 ? ' și ' + units[u] : '');
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const rest = n % 100;
      const prefix = h === 1 ? 'o sută' : h === 2 ? 'două sute' : units[h] + ' sute';
      return prefix + (rest > 0 ? ' ' + convertGroup(rest) : '');
    }
    if (n < 1000000) {
      const th = Math.floor(n / 1000);
      const rest = n % 1000;
      let prefix: string;
      if (th === 1) prefix = 'o mie';
      else if (th === 2) prefix = 'două mii';
      else if (th < 20) prefix = convertGroup(th) + ' mii';
      else prefix = convertGroup(th) + ' de mii';
      return prefix + (rest > 0 ? ' ' + convertGroup(rest) : '');
    }
    return String(n);
  }

  let result = convertGroup(intPart) + ' LEI';
  if (decPart > 0) {
    result += ' și ' + decPart + ' BANI';
  }
  return result;
}
