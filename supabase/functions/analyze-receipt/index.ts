import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Edge Function: AI Receipt/Invoice Analyzer
 * 
 * Adapted from: https://github.com/vas3k/TaxHacker (MIT License)
 * 
 * Uses Lovable AI Gateway (Gemini) to extract structured data from receipts/invoices.
 * No external API key needed - uses built-in AI models.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// ZOD SCHEMA (adapted from TaxHacker ai/schema.ts)
// ============================================================================

const AnalyzeRequestSchema = z.object({
  documentText: z.string().min(10, 'Document text must be at least 10 characters'),
  documentType: z.enum(['receipt', 'invoice', 'bank_statement', 'contract', 'other']).default('invoice'),
  extractFields: z.array(z.string()).optional(),
  language: z.enum(['ro', 'en']).default('ro'),
});

// ============================================================================
// EXTRACTION SCHEMA (adapted from TaxHacker ai/schema.ts - fieldsToJsonSchema)
// ============================================================================

function buildExtractionSchema(documentType: string, customFields?: string[]) {
  const baseFields: Record<string, { type: string; description: string }> = {
    vendor_name: { type: 'string', description: 'Numele furnizorului/vânzătorului' },
    vendor_cui: { type: 'string', description: 'CUI/CIF-ul furnizorului (cod unic de identificare)' },
    vendor_address: { type: 'string', description: 'Adresa furnizorului' },
    document_number: { type: 'string', description: 'Numărul facturii/chitanței/documentului' },
    document_date: { type: 'string', description: 'Data emiterii documentului (format YYYY-MM-DD)' },
    due_date: { type: 'string', description: 'Data scadenței (format YYYY-MM-DD), dacă există' },
    currency: { type: 'string', description: 'Moneda (RON, EUR, USD)' },
    subtotal: { type: 'number', description: 'Totalul fără TVA' },
    vat_amount: { type: 'number', description: 'Suma TVA' },
    vat_rate: { type: 'number', description: 'Rata TVA (ex: 19, 9, 5)' },
    total_amount: { type: 'number', description: 'Totalul cu TVA inclus' },
    payment_method: { type: 'string', description: 'Metoda de plată (numerar, card, transfer bancar)' },
    category: { type: 'string', description: 'Categoria cheltuielii: materiale, servicii, utilități, transport, salarii, chirii, echipamente, altele' },
    is_deductible: { type: 'boolean', description: 'Este cheltuiala deductibilă fiscal?' },
    deductibility_notes: { type: 'string', description: 'Note despre deductibilitate și limite' },
  };

  if (documentType === 'bank_statement') {
    baseFields.account_number = { type: 'string', description: 'Numărul contului bancar' };
    baseFields.bank_name = { type: 'string', description: 'Numele băncii' };
    baseFields.statement_period = { type: 'string', description: 'Perioada extrasului' };
    baseFields.opening_balance = { type: 'number', description: 'Soldul de deschidere' };
    baseFields.closing_balance = { type: 'number', description: 'Soldul de închidere' };
  }

  // Filter to custom fields if specified
  let activeFields = baseFields;
  if (customFields?.length) {
    activeFields = {};
    for (const field of customFields) {
      if (baseFields[field]) activeFields[field] = baseFields[field];
    }
  }

  return {
    type: 'object',
    properties: {
      ...activeFields,
      items: {
        type: 'array',
        description: 'Produsele/serviciile individuale din document',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Numele produsului/serviciului' },
            quantity: { type: 'number', description: 'Cantitatea' },
            unit_price: { type: 'number', description: 'Prețul unitar' },
            vat_rate: { type: 'number', description: 'Rata TVA' },
            total: { type: 'number', description: 'Totalul liniei' },
            accounting_account: { type: 'string', description: 'Contul contabil sugerat (ex: 6022, 6028, 628)' },
          },
        },
      },
      accounting_suggestion: {
        type: 'object',
        description: 'Sugestie de înregistrare contabilă',
        properties: {
          debit_account: { type: 'string', description: 'Contul de debit (ex: 6022 Cheltuieli cu combustibilul)' },
          credit_account: { type: 'string', description: 'Contul de credit (ex: 401 Furnizori)' },
          vat_account: { type: 'string', description: 'Contul de TVA (ex: 4426 TVA deductibilă)' },
          explanation: { type: 'string', description: 'Explicația înregistrării contabile' },
        },
      },
    },
  };
}

// ============================================================================
// PROMPT BUILDER (adapted from TaxHacker ai/prompt.ts - buildLLMPrompt)
// ============================================================================

function buildAnalysisPrompt(documentType: string, language: string): string {
  const typeNames: Record<string, string> = {
    receipt: 'chitanță',
    invoice: 'factură',
    bank_statement: 'extras de cont',
    contract: 'contract',
    other: 'document financiar',
  };

  const docName = typeNames[documentType] || 'document';

  return `Ești un expert contabil român cu certificare CECCAR. Analizează următoarea ${docName} și extrage toate informațiile structurate.

REGULI IMPORTANTE:
1. Extrage EXACT valorile din document - nu aproxima și nu calcula
2. Pentru CUI/CIF, caută formatul RO + cifre sau doar cifre (ex: RO12345678, 12345678)
3. Data trebuie convertită la format YYYY-MM-DD
4. Moneda implicită este RON dacă nu e specificată altfel
5. Categorisează cheltuiala conform planului de conturi românesc
6. Sugerează conturile contabile conform OMFP 1802/2014
7. Evaluează deductibilitatea conform Codului Fiscal actualizat 2024-2025
8. Pentru TVA, verifică dacă rata este 19%, 9% sau 5%
9. Dacă un câmp nu poate fi extras, returnează null
10. Identifică TOATE produsele/serviciile individuale în array-ul "items"

CONTEXT FISCAL ROMÂNESC:
- TVA standard: 19%
- TVA redusă: 9% (alimente, medicamente, turism)
- TVA super-redusă: 5% (cărți, locuințe sociale)
- Cheltuieli de protocol: deductibile 2% din profit brut
- Cheltuieli deplasare: diurnă internă max 57.5 RON/zi
- Cheltuieli auto: deductibile 50% sau 100% (cu foaie de parcurs)

Returnează DOAR JSON valid conform schemei furnizate.`;
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

    const userId = claimsData.claims.sub;

    // Parse & validate input
    const rawBody = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentText, documentType, extractFields, language } = parsed.data;

    // Build prompt and schema
    const systemPrompt = buildAnalysisPrompt(documentType, language);
    const extractionSchema = buildExtractionSchema(documentType, extractFields);

    // Call Lovable AI Gateway (Gemini Flash for speed)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analizează acest document și extrage datele conform schemei:\n\nSCHEMA JSON:\n${JSON.stringify(extractionSchema, null, 2)}\n\nDOCUMENT:\n${documentText}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const extractedText = aiResult.choices?.[0]?.message?.content || '{}';

    let extractedData: Record<string, unknown>;
    try {
      extractedData = JSON.parse(extractedText);
    } catch {
      extractedData = { raw_response: extractedText, parse_error: true };
    }

    // Track usage
    const tokensUsed = aiResult.usage?.total_tokens || 0;

    return new Response(JSON.stringify({
      success: true,
      data: extractedData,
      metadata: {
        documentType,
        tokensUsed,
        model: 'gemini-2.5-flash',
        language,
        fieldsExtracted: Object.keys(extractedData).length,
      },
      attribution: {
        basedOn: 'TaxHacker by vas3k',
        license: 'MIT',
        source: 'https://github.com/vas3k/TaxHacker',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('analyze-receipt error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
