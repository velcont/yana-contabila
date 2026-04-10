import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Edge Function: e-Factura ANAF Integration
 * 
 * Adapted from: https://github.com/florin-szilagyi/efactura-anaf-ts-sdk (MIT License)
 * 
 * Provides:
 * - UBL 2.1 XML invoice generation (CIUS-RO compliant)
 * - ANAF company lookup by CUI
 * - Invoice validation
 * 
 * Note: Full ANAF OAuth upload requires ANAF SPV credentials (client_id, client_secret, refresh_token).
 * This function provides XML generation and company lookup without requiring OAuth.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// CONSTANTS (from efactura-anaf-ts-sdk/src/constants.ts)
// ============================================================================

const UBL_CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1';
const INVOICE_TYPE_CODE = '380';
const DEFAULT_CURRENCY = 'RON';
const DEFAULT_COUNTRY_CODE = 'RO';
const DEFAULT_UNIT_CODE = 'EA';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  postalZone: z.string().min(1),
  county: z.string().optional(),
  countryCode: z.string().default('RO'),
});

const PartySchema = z.object({
  registrationName: z.string().min(1),
  companyId: z.string().min(1),
  vatNumber: z.string().optional(),
  address: AddressSchema,
  email: z.string().email().optional(),
  telephone: z.string().optional(),
});

const InvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  unitCode: z.string().default('EA'),
  taxPercent: z.number().min(0).max(100).default(19),
});

const GenerateInvoiceSchema = z.object({
  action: z.literal('generate_xml'),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  currency: z.string().default('RON'),
  note: z.string().optional(),
  supplier: PartySchema,
  customer: PartySchema,
  lines: z.array(InvoiceLineSchema).min(1),
  isSupplierVatPayer: z.boolean().default(true),
  paymentIban: z.string().optional(),
});

const CompanyLookupSchema = z.object({
  action: z.literal('company_lookup'),
  cui: z.string().min(1).max(20),
});

const RequestSchema = z.discriminatedUnion('action', [
  GenerateInvoiceSchema,
  CompanyLookupSchema,
]);

// ============================================================================
// UBL XML BUILDER (adapted from efactura-anaf-ts-sdk/src/ubl/InvoiceBuilder.ts)
// ============================================================================

interface TaxGroup {
  categoryId: string;
  percent: number;
  taxableAmount: number;
  taxAmount: number;
  exemptionReasonCode?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function buildPartyXml(tagName: string, party: z.infer<typeof PartySchema>): string {
  const addr = party.address;
  let xml = `<${tagName}><cac:Party>`;

  // PartyName
  xml += `<cac:PartyName><cbc:Name>${escapeXml(party.registrationName)}</cbc:Name></cac:PartyName>`;

  // PostalAddress
  xml += `<cac:PostalAddress>`;
  xml += `<cbc:StreetName>${escapeXml(addr.street)}</cbc:StreetName>`;
  xml += `<cbc:CityName>${escapeXml(addr.city)}</cbc:CityName>`;
  xml += `<cbc:PostalZone>${escapeXml(addr.postalZone)}</cbc:PostalZone>`;
  if (addr.county) xml += `<cbc:CountrySubentity>${escapeXml(addr.county)}</cbc:CountrySubentity>`;
  xml += `<cac:Country><cbc:IdentificationCode>${addr.countryCode || DEFAULT_COUNTRY_CODE}</cbc:IdentificationCode></cac:Country>`;
  xml += `</cac:PostalAddress>`;

  // PartyTaxScheme
  if (party.vatNumber) {
    xml += `<cac:PartyTaxScheme>`;
    xml += `<cbc:CompanyID>${escapeXml(party.vatNumber)}</cbc:CompanyID>`;
    xml += `<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>`;
    xml += `</cac:PartyTaxScheme>`;
  }

  // PartyLegalEntity
  xml += `<cac:PartyLegalEntity>`;
  xml += `<cbc:RegistrationName>${escapeXml(party.registrationName)}</cbc:RegistrationName>`;
  xml += `<cbc:CompanyID>${escapeXml(party.companyId)}</cbc:CompanyID>`;
  xml += `</cac:PartyLegalEntity>`;

  // Contact
  if (party.email || party.telephone) {
    xml += `<cac:Contact>`;
    if (party.telephone) xml += `<cbc:Telephone>${escapeXml(party.telephone)}</cbc:Telephone>`;
    if (party.email) xml += `<cbc:ElectronicMail>${escapeXml(party.email)}</cbc:ElectronicMail>`;
    xml += `</cac:Contact>`;
  }

  xml += `</cac:Party></${tagName}>`;
  return xml;
}

function groupLinesByTax(lines: z.infer<typeof InvoiceLineSchema>[], isVatPayer: boolean): TaxGroup[] {
  const groups = new Map<string, TaxGroup>();

  for (const line of lines) {
    const taxPercent = line.taxPercent || 0;
    const lineAmount = parseFloat((line.quantity * line.unitPrice).toFixed(2));
    const taxAmount = parseFloat((lineAmount * (taxPercent / 100)).toFixed(2));

    let categoryId: string;
    let exemptionReasonCode: string | undefined;

    if (!isVatPayer) {
      categoryId = 'O';
      exemptionReasonCode = 'VATEX-EU-O';
    } else if (taxPercent > 0) {
      categoryId = 'S';
    } else {
      categoryId = 'Z';
    }

    const key = `${categoryId}-${taxPercent}`;
    const existing = groups.get(key);

    if (existing) {
      existing.taxableAmount = parseFloat((existing.taxableAmount + lineAmount).toFixed(2));
      existing.taxAmount = parseFloat((existing.taxAmount + taxAmount).toFixed(2));
    } else {
      groups.set(key, { categoryId, percent: taxPercent, taxableAmount: lineAmount, taxAmount, exemptionReasonCode });
    }
  }

  return Array.from(groups.values());
}

function buildInvoiceXml(data: z.infer<typeof GenerateInvoiceSchema>): string {
  const currency = data.currency || DEFAULT_CURRENCY;
  const isVatPayer = data.isSupplierVatPayer;
  const issueDate = formatDate(data.issueDate);
  const dueDate = data.dueDate ? formatDate(data.dueDate) : issueDate;

  const taxGroups = groupLinesByTax(data.lines, isVatPayer);
  const totalTaxable = taxGroups.reduce((s, g) => s + g.taxableAmount, 0);
  const totalTax = taxGroups.reduce((s, g) => s + g.taxAmount, 0);
  const grandTotal = parseFloat((totalTaxable + totalTax).toFixed(2));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" `;
  xml += `xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" `;
  xml += `xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`;

  xml += `<cbc:CustomizationID>${UBL_CUSTOMIZATION_ID}</cbc:CustomizationID>`;
  xml += `<cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>`;
  xml += `<cbc:IssueDate>${issueDate}</cbc:IssueDate>`;
  xml += `<cbc:DueDate>${dueDate}</cbc:DueDate>`;
  xml += `<cbc:InvoiceTypeCode>${INVOICE_TYPE_CODE}</cbc:InvoiceTypeCode>`;
  if (data.note) xml += `<cbc:Note>${escapeXml(data.note)}</cbc:Note>`;
  xml += `<cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>`;

  // Parties
  xml += buildPartyXml('cac:AccountingSupplierParty', data.supplier);
  xml += buildPartyXml('cac:AccountingCustomerParty', data.customer);

  // Payment
  if (data.paymentIban) {
    xml += `<cac:PaymentMeans>`;
    xml += `<cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>`;
    xml += `<cac:PayeeFinancialAccount><cbc:ID>${escapeXml(data.paymentIban)}</cbc:ID></cac:PayeeFinancialAccount>`;
    xml += `</cac:PaymentMeans>`;
  }

  // Tax Total
  xml += `<cac:TaxTotal><cbc:TaxAmount currencyID="${currency}">${totalTax.toFixed(2)}</cbc:TaxAmount>`;
  for (const group of taxGroups) {
    xml += `<cac:TaxSubtotal>`;
    xml += `<cbc:TaxableAmount currencyID="${currency}">${group.taxableAmount.toFixed(2)}</cbc:TaxableAmount>`;
    xml += `<cbc:TaxAmount currencyID="${currency}">${group.taxAmount.toFixed(2)}</cbc:TaxAmount>`;
    xml += `<cac:TaxCategory><cbc:ID>${group.categoryId}</cbc:ID>`;
    xml += `<cbc:Percent>${group.percent}</cbc:Percent>`;
    if (group.exemptionReasonCode) {
      xml += `<cbc:TaxExemptionReasonCode>${group.exemptionReasonCode}</cbc:TaxExemptionReasonCode>`;
    }
    xml += `<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>`;
    xml += `</cac:TaxSubtotal>`;
  }
  xml += `</cac:TaxTotal>`;

  // Legal Monetary Total
  xml += `<cac:LegalMonetaryTotal>`;
  xml += `<cbc:LineExtensionAmount currencyID="${currency}">${totalTaxable.toFixed(2)}</cbc:LineExtensionAmount>`;
  xml += `<cbc:TaxExclusiveAmount currencyID="${currency}">${totalTaxable.toFixed(2)}</cbc:TaxExclusiveAmount>`;
  xml += `<cbc:TaxInclusiveAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>`;
  xml += `<cbc:PayableAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:PayableAmount>`;
  xml += `</cac:LegalMonetaryTotal>`;

  // Invoice Lines
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];
    const lineAmount = parseFloat((line.quantity * line.unitPrice).toFixed(2));
    const taxPercent = line.taxPercent || 0;
    let catId = !isVatPayer ? 'O' : (taxPercent > 0 ? 'S' : 'Z');

    xml += `<cac:InvoiceLine>`;
    xml += `<cbc:ID>${i + 1}</cbc:ID>`;
    xml += `<cbc:InvoicedQuantity unitCode="${line.unitCode || DEFAULT_UNIT_CODE}">${line.quantity}</cbc:InvoicedQuantity>`;
    xml += `<cbc:LineExtensionAmount currencyID="${currency}">${lineAmount.toFixed(2)}</cbc:LineExtensionAmount>`;
    xml += `<cac:Item><cbc:Name>${escapeXml(line.description)}</cbc:Name>`;
    xml += `<cac:ClassifiedTaxCategory><cbc:ID>${catId}</cbc:ID>`;
    xml += `<cbc:Percent>${taxPercent}</cbc:Percent>`;
    xml += `<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>`;
    xml += `</cac:Item>`;
    xml += `<cac:Price><cbc:PriceAmount currencyID="${currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>`;
    xml += `</cac:InvoiceLine>`;
  }

  xml += `</Invoice>`;
  return xml;
}

// ============================================================================
// ANAF COMPANY LOOKUP (from efactura-anaf-ts-sdk/src/AnafDetailsClient.ts)
// ============================================================================

async function lookupCompanyByCUI(cui: string) {
  const cleanCui = cui.replace(/^RO/i, '').trim();
  const today = new Date().toISOString().split('T')[0];

  const response = await fetch('https://webservicesp.anaf.ro/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ cui: parseInt(cleanCui), data: today }]),
  });

  if (!response.ok) {
    throw new Error(`ANAF API returned ${response.status}`);
  }

  const data = await response.json();
  const found = data?.found?.[0];

  if (!found) {
    return null;
  }

  return {
    denumire: found.date_generale?.denumire || '',
    cui: found.date_generale?.cui?.toString() || cleanCui,
    adresa: found.date_generale?.adresa || '',
    nrRegCom: found.date_generale?.nrRegCom || '',
    telefon: found.date_generale?.telefon || '',
    stare_inregistrare: found.date_generale?.stare_inregistrare || '',
    platpilorTVA: found.inregistrare_scop_Tva?.scpTVA || false,
    dataInregistrareTVA: found.inregistrare_scop_Tva?.data_inregistrare_scpTVA || null,
    statusInactivi: found.stare_inactiv?.statusInactivi || false,
    eFactura: found.date_generale?.statusRO_e_Factura || false,
  };
}

// ============================================================================
// HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = parsed.data;

    if (body.action === 'generate_xml') {
      const xml = buildInvoiceXml(body);
      return new Response(JSON.stringify({
        success: true,
        xml,
        metadata: {
          invoiceNumber: body.invoiceNumber,
          currency: body.currency,
          linesCount: body.lines.length,
          totalNet: body.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0).toFixed(2),
          standard: 'UBL 2.1 CIUS-RO',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'company_lookup') {
      const company = await lookupCompanyByCUI(body.cui);
      return new Response(JSON.stringify({
        success: true,
        company,
        source: 'ANAF WebServiceSP',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('efactura-anaf error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
