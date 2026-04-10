/**
 * AI Receipt/Invoice Analyzer API client
 * 
 * Frontend wrapper for the analyze-receipt edge function.
 * Based on: https://github.com/vas3k/TaxHacker (MIT License)
 */

import { supabase } from '@/integrations/supabase/client';

export type DocumentType = 'receipt' | 'invoice' | 'bank_statement' | 'contract' | 'other';

export interface AnalyzeReceiptParams {
  /** The text content of the document */
  documentText: string;
  /** Type of document */
  documentType?: DocumentType;
  /** Specific fields to extract (default: all) */
  extractFields?: string[];
  /** Language: ro or en */
  language?: 'ro' | 'en';
}

export interface AccountingSuggestion {
  debit_account: string;
  credit_account: string;
  vat_account?: string;
  explanation: string;
}

export interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
  accounting_account?: string;
}

export interface ExtractedReceiptData {
  vendor_name?: string;
  vendor_cui?: string;
  vendor_address?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  currency?: string;
  subtotal?: number;
  vat_amount?: number;
  vat_rate?: number;
  total_amount?: number;
  payment_method?: string;
  category?: string;
  is_deductible?: boolean;
  deductibility_notes?: string;
  items?: ExtractedItem[];
  accounting_suggestion?: AccountingSuggestion;
  [key: string]: unknown;
}

export interface AnalyzeResult {
  success: boolean;
  data: ExtractedReceiptData;
  metadata: {
    documentType: string;
    tokensUsed: number;
    model: string;
    language: string;
    fieldsExtracted: number;
  };
}

/** Analyze a receipt/invoice using AI and extract structured data */
export async function analyzeReceipt(params: AnalyzeReceiptParams): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke('analyze-receipt', {
    body: params,
  });

  if (error) throw new Error(error.message);
  return data as AnalyzeResult;
}
