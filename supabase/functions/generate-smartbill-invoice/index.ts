import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SMARTBILL-INVOICE] ${step}${detailsStr}`);
};

interface SmartBillClient {
  tip: "PF" | "PJ"; // PF = Persoană Fizică, PJ = Persoană Juridică
  nume: string;
  email: string;
  cif?: string; // For legal entities (PJ)
  cnp?: string; // For individuals (PF) - CNP or "-"
  localitate: string; // City
  judet: string; // County/State
  adresa: string; // Address
  tara: string; // Country
}

interface SmartBillProduct {
  nume: string;
  cod: string;
  um: string;
  cantitate: number;
  pret: number;
  valoareTVA: number;
  procent_tva: number;
}

interface SmartBillInvoice {
  cif: string;
  client: SmartBillClient;
  emitereFactura: string;
  scadentaFactura: string;
  serieFactura: string;
  numarFactura?: number;
  produse: SmartBillProduct[];
  observatii?: string;
  moneda: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error('Session ID is required');
    
    logStep("Processing session", { sessionId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Retrieve checkout session with customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items', 'customer_details'],
    });
    
    logStep("Stripe session retrieved", { 
      customerId: session.customer,
      amount: session.amount_total,
      currency: session.currency 
    });

    // Check if invoice already exists
    const { data: existingInvoice } = await supabaseClient
      .from('smartbill_invoices')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingInvoice) {
      logStep("Invoice already exists", { invoiceId: existingInvoice.id });
      return new Response(
        JSON.stringify({ 
          message: 'Invoice already generated',
          invoice: existingInvoice 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get customer information from session
    const customerEmail = session.customer_details?.email || user.email;
    const customerName = session.customer_details?.name || user.user_metadata?.full_name || 'Client';
    
    // Get billing address from session
    const billingAddress = session.customer_details?.address;
    const city = billingAddress?.city || 'Bucuresti';
    const state = billingAddress?.state || 'Bucuresti';
    const addressLine = billingAddress?.line1 || '-';
    const postalCode = billingAddress?.postal_code || '';
    const country = billingAddress?.country || 'RO';
    
    // Get tax ID collection (for determining if it's a company or individual)
    const taxIds = session.customer_details?.tax_ids || [];
    const hasTaxId = taxIds.length > 0;
    const taxId = hasTaxId ? taxIds[0].value : null;
    
    // Determine if client is company (PJ) or individual (PF)
    // Romanian companies have CIF/CUI (tax code starting with RO or just numbers)
    const isCompany = hasTaxId && taxId && (
      taxId.toUpperCase().startsWith('RO') || 
      /^\d{2,10}$/.test(taxId)
    );
    
    logStep('Customer type determined', { 
      isCompany, 
      hasTaxId, 
      taxId,
      name: customerName,
      city,
      state 
    });
    
    // Prepare SmartBill invoice data
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate amount in RON (Stripe stores in cents)
    const amountInRON = (session.amount_total || 0) / 100;

    // Get company CIF from environment
    const companyCIF = Deno.env.get('SMARTBILL_COMPANY_CIF') || 'RO48607440';

    // Build client object based on type (PF = Individual, PJ = Legal Entity)
    let clientData: SmartBillClient;
    
    if (isCompany) {
      // Legal entity (Persoană Juridică) - requires CIF, company name, full address
      const companyTaxId = taxId?.toUpperCase().startsWith('RO') ? taxId : `RO${taxId}`;
      clientData = {
        tip: "PJ",
        nume: customerName,
        cif: companyTaxId,
        email: customerEmail,
        localitate: city,
        judet: state,
        adresa: `${addressLine}${postalCode ? ', ' + postalCode : ''}`,
        tara: country === 'RO' ? 'Romania' : country
      };
      logStep('Legal entity client data prepared', clientData);
    } else {
      // Individual (Persoană Fizică) - requires name, CNP (or "-"), city, county, address
      clientData = {
        tip: "PF",
        nume: customerName,
        cnp: "-", // For individuals without CNP, use "-" as per SmartBill API docs
        email: customerEmail,
        localitate: city,
        judet: state,
        adresa: `${addressLine}${postalCode ? ', ' + postalCode : ''}`,
        tara: country === 'RO' ? 'Romania' : country
      };
      logStep('Individual client data prepared', clientData);
    }

    const smartbillInvoice: SmartBillInvoice = {
      cif: companyCIF,
      client: clientData,
      emitereFactura: today,
      scadentaFactura: today,
      serieFactura: "conta",
      produse: [
        {
          nume: "Abonament Entrepreneur lunar",
          cod: "SUBSCRIPTION-ENTREPRENEUR",
          um: "buc",
          cantitate: 1,
          pret: amountInRON,
          valoareTVA: 0, // 0 for services without VAT
          procent_tva: 0,
        }
      ],
      observatii: `Plata efectuata prin Stripe - Session: ${sessionId}`,
      moneda: "RON"
    };

    logStep("Sending invoice to SmartBill", { customer: customerName });

    // Get SmartBill credentials from environment
    const smartbillEmail = Deno.env.get('SMARTBILL_EMAIL') || '';
    const smartbillToken = Deno.env.get('SMARTBILL_API_KEY') || '';
    
    if (!smartbillToken) {
      throw new Error('SmartBill API key not configured');
    }

    // Call SmartBill API
    const smartbillResponse = await fetch('https://ws.smartbill.ro/SBORO/api/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${smartbillEmail}:${smartbillToken}`),
      },
      body: JSON.stringify(smartbillInvoice),
    });

    const smartbillData = await smartbillResponse.json();
    
    if (!smartbillResponse.ok) {
      logStep("SmartBill API error", { status: smartbillResponse.status, error: smartbillData });
      
      // Save failed invoice
      await supabaseClient.from('smartbill_invoices').insert({
        user_id: user.id,
        stripe_session_id: sessionId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
        customer_name: customerName,
        customer_email: customerEmail,
        amount: amountInRON,
        currency: 'RON',
        status: 'failed',
        error_message: JSON.stringify(smartbillData),
        invoice_series: 'conta',
      });

      throw new Error(`SmartBill API error: ${JSON.stringify(smartbillData)}`);
    }

    logStep("SmartBill invoice created", { invoice: smartbillData });

    // Save successful invoice to database
    const { data: savedInvoice, error: insertError } = await supabaseClient
      .from('smartbill_invoices')
      .insert({
        user_id: user.id,
        stripe_session_id: sessionId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
        invoice_number: smartbillData.number || '',
        invoice_series: 'conta',
        invoice_url: smartbillData.url || '',
        smartbill_response: smartbillData,
        customer_name: customerName,
        customer_email: customerEmail,
        amount: amountInRON,
        currency: 'RON',
        status: 'success',
      })
      .select()
      .single();

    if (insertError) {
      logStep("Database insert error", { error: insertError });
      throw insertError;
    }

    logStep("Invoice saved to database", { invoiceId: savedInvoice.id });

    return new Response(
      JSON.stringify({ 
        success: true,
        invoice: savedInvoice,
        smartbillData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});