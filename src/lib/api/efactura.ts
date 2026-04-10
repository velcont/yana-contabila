/**
 * e-Factura ANAF API client
 * 
 * Frontend wrapper for the efactura-anaf edge function.
 * Based on: https://github.com/florin-szilagyi/efactura-anaf-ts-sdk (MIT License)
 */

import { supabase } from '@/integrations/supabase/client';

export interface EfacturaParty {
  registrationName: string;
  companyId: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    postalZone: string;
    county?: string;
    countryCode?: string;
  };
  email?: string;
  telephone?: string;
}

export interface EfacturaLine {
  description: string;
  quantity: number;
  unitPrice: number;
  unitCode?: string;
  taxPercent?: number;
}

export interface GenerateInvoiceXmlParams {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency?: string;
  note?: string;
  supplier: EfacturaParty;
  customer: EfacturaParty;
  lines: EfacturaLine[];
  isSupplierVatPayer?: boolean;
  paymentIban?: string;
}

export interface AnafCompanyData {
  denumire: string;
  cui: string;
  adresa: string;
  nrRegCom: string;
  telefon: string;
  stare_inregistrare: string;
  platpilorTVA: boolean;
  dataInregistrareTVA: string | null;
  statusInactivi: boolean;
  eFactura: boolean;
}

/** Generate UBL 2.1 XML invoice compliant with ANAF CIUS-RO */
export async function generateEfacturaXml(params: GenerateInvoiceXmlParams) {
  const { data, error } = await supabase.functions.invoke('efactura-anaf', {
    body: { action: 'generate_xml', ...params },
  });

  if (error) throw new Error(error.message);
  return data as { success: boolean; xml: string; metadata: Record<string, unknown> };
}

/** Lookup company data from ANAF by CUI */
export async function lookupCompanyANAF(cui: string) {
  const { data, error } = await supabase.functions.invoke('efactura-anaf', {
    body: { action: 'company_lookup', cui },
  });

  if (error) throw new Error(error.message);
  return data as { success: boolean; company: AnafCompanyData | null };
}
