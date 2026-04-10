/**
 * AI Document Data Extraction Engine
 * Adapted from: github.com/aidalinfo/extract-kit (MIT)
 * Uses Lovable AI Gateway for extraction instead of external APIs
 */

import { z } from 'zod';

// ─── Schemas (Zod-validated, inspired by extract-kit) ────────────────────────

export const InvoiceLineItemSchema = z.object({
  description: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  discount_percent: z.number().nullable().optional(),
  vat_rate: z.number().nullable().optional(),
  vat_amount: z.number().nullable().optional(),
  line_total: z.number().nullable().optional(),
});

export const ExtractedInvoiceSchema = z.object({
  // Document info
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  invoice_type: z.enum(['factura', 'factura_proforma', 'aviz', 'chitanta', 'bon_fiscal', 'unknown']).optional(),
  
  // Seller
  seller_name: z.string().nullable().optional(),
  seller_cui: z.string().nullable().optional(),
  seller_reg_com: z.string().nullable().optional(),
  seller_address: z.string().nullable().optional(),
  seller_iban: z.string().nullable().optional(),
  seller_bank: z.string().nullable().optional(),
  
  // Buyer
  buyer_name: z.string().nullable().optional(),
  buyer_cui: z.string().nullable().optional(),
  buyer_reg_com: z.string().nullable().optional(),
  buyer_address: z.string().nullable().optional(),
  
  // Items
  line_items: z.array(InvoiceLineItemSchema).optional(),
  
  // Totals
  subtotal: z.number().nullable().optional(),
  vat_total: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  currency: z.string().default('RON'),
  
  // Payment
  payment_method: z.string().nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid', 'partial', 'unknown']).optional(),
  
  // Metadata
  confidence_score: z.number().min(0).max(1).optional(),
  extraction_notes: z.array(z.string()).optional(),
});

export const ExtractedReceiptSchema = z.object({
  merchant_name: z.string().nullable().optional(),
  merchant_cui: z.string().nullable().optional(),
  receipt_number: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  items: z.array(z.object({
    name: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    vat_rate: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
  })).optional(),
  subtotal: z.number().nullable().optional(),
  vat_total: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  currency: z.string().default('RON'),
  confidence_score: z.number().min(0).max(1).optional(),
});

export const ExtractedTableSchema = z.object({
  tables: z.array(z.object({
    table_name: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string().nullable())),
    page_number: z.number().optional(),
  })),
  total_tables_found: z.number(),
  extraction_notes: z.array(z.string()).optional(),
});

export const ExtractedBalanceSheetSchema = z.object({
  company_name: z.string().nullable().optional(),
  cui: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  
  // Active
  total_assets: z.number().nullable().optional(),
  fixed_assets: z.number().nullable().optional(),
  current_assets: z.number().nullable().optional(),
  cash_and_equivalents: z.number().nullable().optional(),
  receivables: z.number().nullable().optional(),
  inventory: z.number().nullable().optional(),
  
  // Pasive  
  total_liabilities: z.number().nullable().optional(),
  equity: z.number().nullable().optional(),
  long_term_debt: z.number().nullable().optional(),
  short_term_debt: z.number().nullable().optional(),
  payables: z.number().nullable().optional(),
  
  // P&L
  revenue: z.number().nullable().optional(),
  cost_of_goods: z.number().nullable().optional(),
  operating_expenses: z.number().nullable().optional(),
  operating_profit: z.number().nullable().optional(),
  net_profit: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  
  confidence_score: z.number().min(0).max(1).optional(),
  extraction_notes: z.array(z.string()).optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;
export type ExtractedTable = z.infer<typeof ExtractedTableSchema>;
export type ExtractedBalanceSheet = z.infer<typeof ExtractedBalanceSheetSchema>;

export type ExtractionType = 'invoice' | 'receipt' | 'table' | 'balance_sheet' | 'auto';

export interface ExtractionResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  processingTimeMs: number;
  extractionType: ExtractionType;
  validationErrors?: string[];
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

const EXTRACTION_PROMPTS: Record<string, string> = {
  invoice: `Ești un expert în extragerea datelor din facturi românești. 
Extrage TOATE informațiile din textul următor și returnează un JSON valid cu structura:
{
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "invoice_type": "factura|factura_proforma|aviz|chitanta|bon_fiscal|unknown",
  "seller_name": "...", "seller_cui": "...", "seller_reg_com": "...", "seller_address": "...", "seller_iban": "...", "seller_bank": "...",
  "buyer_name": "...", "buyer_cui": "...", "buyer_reg_com": "...", "buyer_address": "...",
  "line_items": [{"description": "...", "quantity": N, "unit": "buc", "unit_price": N, "vat_rate": N, "vat_amount": N, "line_total": N}],
  "subtotal": N, "vat_total": N, "total_amount": N, "currency": "RON",
  "payment_method": "...", "payment_status": "paid|unpaid|partial|unknown",
  "confidence_score": 0.0-1.0,
  "extraction_notes": ["..."]
}
Returnează DOAR JSON-ul, fără text adițional. Dacă nu poți extrage un câmp, pune null.`,

  receipt: `Ești un expert în extragerea datelor din bonuri fiscale și chitanțe românești.
Extrage informațiile și returnează JSON valid:
{
  "merchant_name": "...", "merchant_cui": "...", "receipt_number": "...",
  "date": "YYYY-MM-DD",
  "items": [{"name": "...", "quantity": N, "price": N, "vat_rate": N, "total": N}],
  "subtotal": N, "vat_total": N, "total": N,
  "payment_method": "numerar|card|transfer",
  "currency": "RON", "confidence_score": 0.0-1.0
}
Returnează DOAR JSON-ul.`,

  balance_sheet: `Ești un expert contabil român. Extrage datele financiare din bilanțul contabil:
{
  "company_name": "...", "cui": "...", "period": "...", "year": N,
  "total_assets": N, "fixed_assets": N, "current_assets": N, "cash_and_equivalents": N,
  "receivables": N, "inventory": N,
  "total_liabilities": N, "equity": N, "long_term_debt": N, "short_term_debt": N, "payables": N,
  "revenue": N, "cost_of_goods": N, "operating_expenses": N, "operating_profit": N,
  "net_profit": N, "ebitda": N,
  "confidence_score": 0.0-1.0,
  "extraction_notes": ["..."]
}
Returnează DOAR JSON-ul. Valorile financiare în RON, fără separatori de mii.`,

  table: `Extrage TOATE tabelele din documentul următor. Returnează JSON:
{
  "tables": [
    {"table_name": "...", "headers": ["col1", "col2"], "rows": [["val1", "val2"]], "page_number": 1}
  ],
  "total_tables_found": N,
  "extraction_notes": ["..."]
}
Returnează DOAR JSON-ul.`,

  auto: `Analizează documentul următor și determină tipul (factură, chitanță, bilanț, tabel).
Apoi extrage toate datele relevante. Returnează JSON cu câmpul "detected_type" și datele corespunzătoare.`,
};

// ─── Core Extraction Functions ───────────────────────────────────────────────

/**
 * Extract structured data from document text using AI
 */
export async function extractFromText<T>(
  text: string,
  type: ExtractionType,
  options?: { customPrompt?: string }
): Promise<ExtractionResult<T>> {
  const startTime = performance.now();
  
  try {
    const prompt = options?.customPrompt ?? EXTRACTION_PROMPTS[type] ?? EXTRACTION_PROMPTS.auto;
    
    const response = await fetch(
      `https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/chat-ai`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${prompt}\n\n--- DOCUMENT ---\n${text.substring(0, 15000)}`,
          model: 'google/gemini-2.5-flash',
          systemPrompt: 'Ești un extractor de date din documente. Răspunde DOAR cu JSON valid.',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const result = await response.json();
    const aiText = result.answer || result.response || '';
    
    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Nu s-a putut extrage JSON din răspunsul AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate with appropriate schema
    const schema = getSchemaForType(type);
    if (schema) {
      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        return {
          success: true,
          data: parsed as T,
          processingTimeMs: performance.now() - startTime,
          extractionType: type,
          validationErrors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        success: true,
        data: validation.data as T,
        processingTimeMs: performance.now() - startTime,
        extractionType: type,
      };
    }

    return {
      success: true,
      data: parsed as T,
      processingTimeMs: performance.now() - startTime,
      extractionType: type,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Eroare necunoscută',
      processingTimeMs: performance.now() - startTime,
      extractionType: type,
    };
  }
}

/**
 * Extract invoice data from text
 */
export async function extractInvoice(text: string): Promise<ExtractionResult<ExtractedInvoice>> {
  return extractFromText<ExtractedInvoice>(text, 'invoice');
}

/**
 * Extract receipt data from text
 */
export async function extractReceipt(text: string): Promise<ExtractionResult<ExtractedReceipt>> {
  return extractFromText<ExtractedReceipt>(text, 'receipt');
}

/**
 * Extract balance sheet data from text
 */
export async function extractBalanceSheet(text: string): Promise<ExtractionResult<ExtractedBalanceSheet>> {
  return extractFromText<ExtractedBalanceSheet>(text, 'balance_sheet');
}

/**
 * Extract tables from text
 */
export async function extractTables(text: string): Promise<ExtractionResult<ExtractedTable>> {
  return extractFromText<ExtractedTable>(text, 'table');
}

/**
 * Auto-detect document type and extract
 */
export async function autoExtract(text: string): Promise<ExtractionResult<unknown>> {
  // Simple keyword-based detection
  const textLower = text.toLowerCase();
  
  if (textLower.includes('factură') || textLower.includes('factura') || textLower.includes('invoice')) {
    return extractInvoice(text);
  }
  if (textLower.includes('bon fiscal') || textLower.includes('chitanță') || textLower.includes('receipt')) {
    return extractReceipt(text);
  }
  if (textLower.includes('bilanț') || textLower.includes('situații financiare') || textLower.includes('balance sheet')) {
    return extractBalanceSheet(text);
  }
  
  // Default to table extraction
  return extractTables(text);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSchemaForType(type: ExtractionType) {
  switch (type) {
    case 'invoice': return ExtractedInvoiceSchema;
    case 'receipt': return ExtractedReceiptSchema;
    case 'table': return ExtractedTableSchema;
    case 'balance_sheet': return ExtractedBalanceSheetSchema;
    default: return null;
  }
}

/**
 * Validate extracted data against known Romanian patterns
 */
export function validateRomanianCUI(cui: string): boolean {
  const cleaned = cui.replace(/\D/g, '');
  if (cleaned.length < 2 || cleaned.length > 10) return false;
  
  // Control digit validation
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cleaned.split('').map(Number);
  const controlDigit = digits.pop()!;
  
  while (digits.length < weights.length) {
    digits.unshift(0);
  }
  
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += digits[i] * weights[i];
  }
  
  const remainder = (sum * 10) % 11;
  const expected = remainder === 10 ? 0 : remainder;
  
  return expected === controlDigit;
}

/**
 * Validate IBAN format (Romanian)
 */
export function validateRomanianIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(cleaned);
}

/**
 * Format extraction result as human-readable summary
 */
export function formatExtractionSummary(result: ExtractionResult<unknown>): string {
  if (!result.success) {
    return `❌ Extragere eșuată: ${result.error}`;
  }

  const lines: string[] = [];
  lines.push(`✅ Extragere ${result.extractionType} completă (${Math.round(result.processingTimeMs)}ms)`);
  
  if (result.validationErrors?.length) {
    lines.push(`⚠️ ${result.validationErrors.length} avertismente de validare`);
  }

  const data = result.data as Record<string, unknown>;
  if (data) {
    const fields = Object.keys(data).filter(k => data[k] != null);
    lines.push(`📊 ${fields.length} câmpuri extrase`);
    
    if ('confidence_score' in data) {
      const confidence = data.confidence_score as number;
      lines.push(`🎯 Încredere: ${Math.round(confidence * 100)}%`);
    }
  }

  return lines.join('\n');
}
