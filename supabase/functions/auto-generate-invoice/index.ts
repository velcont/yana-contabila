import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-INVOICE] ${step}${detailsStr}`);
};

interface SmartBillClient {
  name: string;
  vatCode?: string;
  regCom?: string;
  address: string;
  isTaxPayer: boolean;
  city: string;
  county?: string;
  country: string;
  email?: string;
  saveToDb?: boolean;
}

interface SmartBillProduct {
  name: string;
  code: string;
  measuringUnitName: string;
  currency: string;
  quantity: number;
  price: number;
  isService: boolean;
  saveToDb?: boolean;
}

interface SmartBillInvoice {
  companyVatCode: string;
  client: SmartBillClient;
  issueDate: string;
  dueDate: string;
  seriesName: string;
  products: SmartBillProduct[];
  mentions?: string;
  currency?: string;
}

const normalizeText = (text: string) => text
  .replace(/ș/g, 's').replace(/Ș/g, 'S')
  .replace(/ț/g, 't').replace(/Ț/g, 'T')
  .replace(/ă/g, 'a').replace(/Ă/g, 'A')
  .replace(/â/g, 'a').replace(/Â/g, 'A')
  .replace(/î/g, 'i').replace(/Î/g, 'I')
  .replace(/ş/g, 's').replace(/Ş/g, 'S')
  .replace(/ţ/g, 't').replace(/Ţ/g, 'T');

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // 🔒 SECURITY: Only allow internal calls via service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // Only accept service role key (internal server-to-server calls)
    if (token !== serviceRoleKey) {
      logStep("Unauthorized: not service role key");
      return new Response(JSON.stringify({ success: false, error: "Unauthorized: internal only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const {
      stripeInvoiceId,
      stripeSessionId,
      customerEmail,
      customerName,
      userId,
      amountCents,
      paymentType, // 'subscription' | 'credits'
      productName: inputProductName,
    } = await req.json();

    const effectivePaymentType = paymentType || 'subscription';
    const effectiveProductName = inputProductName || 
      (effectivePaymentType === 'subscription' ? 'Abonament Yana Contabila' : 'Credite AI Yana');

    logStep("Request data", { stripeInvoiceId, stripeSessionId, customerEmail, amountCents, effectivePaymentType });

    if (!customerEmail || !amountCents) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check SmartBill credentials
    const smartBillEmail = Deno.env.get("SMARTBILL_EMAIL");
    const smartBillApiKey = Deno.env.get("SMARTBILL_API_KEY");
    const companyCIF = Deno.env.get("SMARTBILL_COMPANY_CIF") || "";

    if (!smartBillEmail || !smartBillApiKey || !companyCIF) {
      logStep("SmartBill credentials missing");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "SmartBill credentials not configured" 
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if invoice already exists in DB (prevent duplicates)
    const lookupColumn = stripeInvoiceId ? 'stripe_invoice_id' : 'stripe_session_id';
    const lookupValue = stripeInvoiceId || stripeSessionId;

    if (lookupValue) {
      const { data: existingInvoice } = await supabaseClient
        .from('smartbill_invoices')
        .select('id, invoice_number, invoice_series')
        .eq(lookupColumn, lookupValue)
        .eq('status', 'success')
        .maybeSingle();

      if (existingInvoice) {
        logStep("Invoice already exists", { 
          series: existingInvoice.invoice_series, 
          number: existingInvoice.invoice_number 
        });
        return new Response(JSON.stringify({ 
          success: true, 
          alreadyExists: true,
          invoice: {
            series: existingInvoice.invoice_series,
            number: existingInvoice.invoice_number,
          }
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Get Stripe customer billing details for the invoice
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let stripeCustomerId: string | undefined;
    let billingName = customerName || customerEmail;

    // Try to find stripe customer by email
    try {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
          expand: ['tax_ids'],
        }) as Stripe.Customer & { tax_ids?: { data: Stripe.TaxId[] } };
        
        billingName = stripeCustomer.name || billingName;
        
        const billingDetails = stripeCustomer.address;
        const rawTaxId = stripeCustomer.tax_ids?.data?.[0]?.value;
        const taxId = rawTaxId ? rawTaxId.replace(/\s/g, '').toUpperCase() : undefined;
        const isPJ = !!taxId && (taxId.startsWith('RO') || /^\d{6,10}$/.test(taxId));

        const country = billingDetails?.country || 'RO';
        const city = billingDetails?.city || 'Bucuresti';
        const state = (billingDetails as any)?.state || city || 'Bucuresti';
        const addressLine = billingDetails?.line1 || '-';
        const postalCode = (billingDetails as any)?.postal_code || '';

        // Build SmartBill client with full billing data
        const clientData: SmartBillClient = isPJ ? {
          name: normalizeText(billingName),
          vatCode: taxId!.startsWith('RO') ? taxId! : `RO${taxId}`,
          address: normalizeText(`${addressLine}${postalCode ? ', ' + postalCode : ''}`),
          isTaxPayer: true,
          city: normalizeText(city),
          county: normalizeText(state),
          country: country === 'RO' ? 'Romania' : country,
          email: customerEmail,
          saveToDb: false,
        } : {
          name: normalizeText(billingName),
          address: normalizeText(`${addressLine}${postalCode ? ', ' + postalCode : ''}`),
          isTaxPayer: false,
          city: normalizeText(city),
          county: normalizeText(state),
          country: country === 'RO' ? 'Romania' : country,
          email: customerEmail,
          saveToDb: false,
        };

        return await generateAndSaveInvoice({
          supabaseClient,
          clientData,
          companyCIF,
          smartBillEmail,
          smartBillApiKey,
          amount: amountCents / 100,
          productName: effectiveProductName,
          productCode: effectivePaymentType === 'subscription' ? 'YANA-SUB' : 'YANA-AI',
          stripeInvoiceId,
          stripeSessionId,
          stripeCustomerId,
          customerEmail,
          customerName: billingName,
          userId,
          taxId,
          paymentType: effectivePaymentType,
        });
      }
    } catch (stripeErr) {
      logStep("Stripe customer lookup failed (non-fatal)", { error: String(stripeErr) });
    }

    // Fallback: minimal client data
    const fallbackClient: SmartBillClient = {
      name: normalizeText(billingName),
      address: '-',
      isTaxPayer: false,
      city: 'Bucuresti',
      country: 'Romania',
      email: customerEmail,
      saveToDb: false,
    };

    return await generateAndSaveInvoice({
      supabaseClient,
      clientData: fallbackClient,
      companyCIF,
      smartBillEmail,
      smartBillApiKey,
      amount: amountCents / 100,
      productName: effectiveProductName,
      productCode: effectivePaymentType === 'subscription' ? 'YANA-SUB' : 'YANA-AI',
      stripeInvoiceId,
      stripeSessionId,
      stripeCustomerId,
      customerEmail,
      customerName: billingName,
      userId,
      paymentType: effectivePaymentType,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function generateAndSaveInvoice(params: {
  supabaseClient: any;
  clientData: SmartBillClient;
  companyCIF: string;
  smartBillEmail: string;
  smartBillApiKey: string;
  amount: number;
  productName: string;
  productCode: string;
  stripeInvoiceId?: string;
  stripeSessionId?: string;
  stripeCustomerId?: string;
  customerEmail: string;
  customerName: string;
  userId?: string;
  taxId?: string;
  paymentType: string;
}): Promise<Response> {
  const {
    supabaseClient, clientData, companyCIF, smartBillEmail, smartBillApiKey,
    amount, productName, productCode, stripeInvoiceId, stripeSessionId,
    stripeCustomerId, customerEmail, customerName, userId, taxId, paymentType,
  } = params;

  const today = new Date().toISOString().split('T')[0];
  const lookupId = stripeInvoiceId || stripeSessionId || 'unknown';

  const smartbillInvoice: SmartBillInvoice = {
    companyVatCode: companyCIF,
    client: clientData,
    issueDate: today,
    dueDate: today,
    seriesName: "conta",
    products: [{
      name: productName,
      code: productCode,
      measuringUnitName: "buc",
      currency: "RON",
      quantity: 1,
      price: amount,
      isService: true,
      saveToDb: false,
    }],
    mentions: `Plata Stripe - ${paymentType}: ${lookupId}`,
  };

  logStep("Sending to SmartBill", { amount, customerEmail });

  // Retry logic
  let smartBillResponse: Response | undefined;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      smartBillResponse = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${btoa(`${smartBillEmail}:${smartBillApiKey}`)}`,
        },
        body: JSON.stringify(smartbillInvoice),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      break;
    } catch (fetchError) {
      retryCount++;
      logStep(`SmartBill attempt ${retryCount} failed`, { 
        error: fetchError instanceof Error ? fetchError.message : String(fetchError) 
      });

      if (retryCount >= maxRetries) {
        // Save failed attempt + alert
        await saveFailedInvoice(supabaseClient, {
          userId, stripeSessionId: stripeSessionId || lookupId, stripeInvoiceId,
          stripeCustomerId, customerEmail, customerName, amount, paymentType,
          errorMessage: `SmartBill API failed after ${maxRetries} retries`,
        });

        return new Response(JSON.stringify({ 
          success: false, 
          error: `SmartBill API failed after ${maxRetries} retries` 
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
    }
  }

  if (!smartBillResponse) {
    return new Response(JSON.stringify({ success: false, error: "No SmartBill response" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const responseText = await smartBillResponse.text();

  if (!smartBillResponse.ok) {
    logStep("SmartBill error response", { status: smartBillResponse.status, body: responseText.substring(0, 500) });

    await saveFailedInvoice(supabaseClient, {
      userId, stripeSessionId: stripeSessionId || lookupId, stripeInvoiceId,
      stripeCustomerId, customerEmail, customerName, amount, paymentType,
      errorMessage: `SmartBill HTTP ${smartBillResponse.status}: ${responseText.substring(0, 200)}`,
    });

    return new Response(JSON.stringify({ 
      success: false, 
      error: `SmartBill API error: ${smartBillResponse.status}` 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let smartBillData;
  try {
    smartBillData = JSON.parse(responseText);
  } catch {
    logStep("Failed to parse SmartBill response");
    await saveFailedInvoice(supabaseClient, {
      userId, stripeSessionId: stripeSessionId || lookupId, stripeInvoiceId,
      stripeCustomerId, customerEmail, customerName, amount, paymentType,
      errorMessage: "SmartBill returned invalid JSON",
    });
    return new Response(JSON.stringify({ success: false, error: "Invalid SmartBill response" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  logStep("Invoice created successfully", { series: smartBillData.series, number: smartBillData.number });

  // Save success to DB
  const successData: any = {
    stripe_session_id: stripeSessionId || lookupId,
    stripe_customer_id: stripeCustomerId,
    customer_email: customerEmail,
    customer_name: customerName,
    customer_cif: taxId,
    amount,
    currency: 'RON',
    invoice_series: smartBillData.series,
    invoice_number: smartBillData.number,
    invoice_url: smartBillData.url,
    status: 'success',
    smartbill_response: smartBillData,
  };

  if (userId) successData.user_id = userId;
  if (stripeInvoiceId) successData.stripe_invoice_id = stripeInvoiceId;

  const { error: insertError } = await supabaseClient
    .from('smartbill_invoices')
    .insert(successData);

  if (insertError) {
    logStep("DB insert error (invoice was created in SmartBill!)", { error: insertError });
  }

  // Mark subscription payment as invoiced if applicable
  if (paymentType === 'subscription' && stripeInvoiceId) {
    await supabaseClient
      .from('subscription_payments')
      .update({ invoice_generated: true })
      .eq('stripe_invoice_id', stripeInvoiceId);
  }

  logStep("Auto-invoice completed successfully");

  return new Response(JSON.stringify({
    success: true,
    invoice: {
      series: smartBillData.series,
      number: smartBillData.number,
      url: smartBillData.url,
    },
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function saveFailedInvoice(supabaseClient: any, data: {
  userId?: string;
  stripeSessionId: string;
  stripeInvoiceId?: string;
  stripeCustomerId?: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  paymentType: string;
  errorMessage: string;
}) {
  const failedData: any = {
    stripe_session_id: data.stripeSessionId,
    stripe_customer_id: data.stripeCustomerId,
    customer_email: data.customerEmail,
    customer_name: data.customerName,
    amount: data.amount,
    currency: 'RON',
    invoice_series: 'conta',
    status: 'failed',
    error_message: data.errorMessage,
  };

  if (data.userId) failedData.user_id = data.userId;
  if (data.stripeInvoiceId) failedData.stripe_invoice_id = data.stripeInvoiceId;

  await supabaseClient.from('smartbill_invoices').insert(failedData);

  // Create admin alert
  await supabaseClient.from('admin_alerts').insert({
    alert_type: 'AUTO_INVOICE_FAILED',
    severity: 'warning',
    title: `Auto-facturare eșuată: ${data.customerEmail}`,
    description: `Factura SmartBill nu s-a generat automat. Emiteți manual din panoul Admin.`,
    details: {
      stripe_invoice_id: data.stripeInvoiceId,
      stripe_session_id: data.stripeSessionId,
      email: data.customerEmail,
      amount: data.amount,
      payment_type: data.paymentType,
      error: data.errorMessage,
    }
  });
}
