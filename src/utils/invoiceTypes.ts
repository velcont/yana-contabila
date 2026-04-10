/**
 * Invoice Types for Romanian Invoicing
 * Adapted from: https://github.com/kprovorov/invoi (MIT License)
 * Extended with Romanian fiscal fields (CUI, Nr. Reg. Com., IBAN)
 */

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCode: string; // EA, BUC, KG, M, etc.
  vatRate: number; // 0, 5, 9, 19
}

export interface InvoiceParty {
  name: string;
  cui: string; // CUI/CIF
  registrationNumber: string; // Nr. Reg. Com. (J40/1234/2020)
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string; // IBAN
}

export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  invoiceSeries: string; // Serie factură (YNA, FCT, etc.)
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  currency: string;
  
  // Parties
  supplier: InvoiceParty;
  customer: InvoiceParty;
  
  // Line items
  lineItems: InvoiceLineItem[];
  
  // Options
  isVatPayer: boolean;
  note: string;
  
  // Delegation info (opțional - delegat)
  delegateName?: string;
  delegateId?: string; // CI seria/nr
  delegateVehicle?: string; // Nr. auto
}

export interface InvoiceTotals {
  subtotal: number;
  vatBreakdown: { rate: number; base: number; amount: number }[];
  totalVat: number;
  grandTotal: number;
}

// Romanian unit codes
export const RO_UNIT_CODES = [
  { code: 'BUC', label: 'Bucăți' },
  { code: 'KG', label: 'Kilograme' },
  { code: 'M', label: 'Metri' },
  { code: 'MP', label: 'Metri pătrați' },
  { code: 'MC', label: 'Metri cubi' },
  { code: 'L', label: 'Litri' },
  { code: 'ORE', label: 'Ore' },
  { code: 'ZI', label: 'Zile' },
  { code: 'SET', label: 'Seturi' },
  { code: 'EA', label: 'Unități' },
] as const;

// Romanian VAT rates
export const RO_VAT_RATES = [
  { rate: 19, label: 'TVA 19% (standard)' },
  { rate: 9, label: 'TVA 9% (redus)' },
  { rate: 5, label: 'TVA 5% (redus special)' },
  { rate: 0, label: 'TVA 0% (scutit/neimpozabil)' },
] as const;

export const RO_CURRENCIES = ['RON', 'EUR', 'USD', 'GBP', 'CHF', 'HUF'] as const;

export function newLineItem(): InvoiceLineItem {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    description: '',
    quantity: 1,
    unitPrice: 0,
    unitCode: 'BUC',
    vatRate: 19,
  };
}

export function newInvoiceParty(): InvoiceParty {
  return {
    name: '',
    cui: '',
    registrationNumber: '',
    address: '',
    city: '',
    county: '',
    postalCode: '',
    country: 'România',
    email: '',
    phone: '',
    bankName: '',
    bankAccount: '',
  };
}

export function defaultInvoiceData(): InvoiceData {
  return {
    invoiceNumber: '0001',
    invoiceSeries: 'YNA',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'RON',
    supplier: newInvoiceParty(),
    customer: newInvoiceParty(),
    lineItems: [newLineItem()],
    isVatPayer: true,
    note: '',
  };
}
