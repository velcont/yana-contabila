import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-INVOICE] ${step}${detailsStr}`);
};

interface SmartBillClient {
  tip: "PF" | "PJ";
  nume: string;
  email: string;
  cif?: string;
  cnp?: string;
  localitate: string;
  judet: string;
  adresa: string;
  tara: string;
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
  produse: SmartBillProduct[];
  observatii?: string;
  moneda: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error("Authentication failed");

    // 🔒 SECURITY FIX #2: Use RPC to check admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      logStep("Error checking admin role", { error: roleError });
      throw new Error(`Role check failed: ${roleError.message}`);
    }

    if (!isAdmin) {
      logStep("Unauthorized access attempt", { userId: user.id });
      
      // Log security event
      await supabaseClient.rpc('log_security_event', {
        event_type: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
        event_details: {
          user_id: user.id,
          user_email: user.email,
          attempted_function: 'admin-generate-invoice',
          timestamp: new Date().toISOString()
        }
      });
      
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin access verified", { adminId: user.id });

    const { sessionId, paymentType } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    // 🔒 SECURITY: Detectează ID-uri manuale/recovery care nu există în Stripe
    if (sessionId.includes('manual') || sessionId.includes('recovery') || sessionId.includes('_fix_')) {
      logStep("⚠️ REJECTED: Manual/recovery ID detected", { sessionId });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Acest ID de plată este manual și nu poate fi folosit pentru generare factură automată. Generați factura manual în SmartBill."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate Stripe ID format
    let isValidStripeId = false;
    
    if (paymentType === 'subscription') {
      // Accept both invoice IDs (in_) and subscription IDs (sub_)
      isValidStripeId = sessionId.startsWith('in_') || sessionId.startsWith('sub_');
    } else {
      // Credits: cs_test_ or cs_live_
      isValidStripeId = sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_');
    }
    
    if (!isValidStripeId) {
      logStep("⚠️ REJECTED: Invalid Stripe ID format", { sessionId, paymentType });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `ID Stripe invalid: ${paymentType === 'subscription' ? 'trebuie să înceapă cu "in_" sau "sub_"' : 'trebuie să înceapă cu "cs_test_" sau "cs_live_"'}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Prepare SmartBill CIF early (needed later)
    const companyCIF = Deno.env.get("SMARTBILL_COMPANY_CIF") || "";

    logStep("Processing session", { sessionId, paymentType });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerEmail: string;
    let customerName: string;
    let amount: number;
    let stripeCustomerId: string;
    let productName: string;

    // For subscription flows we may receive either invoice id (in_) or subscription id (sub_)
    let stripeInvoiceIdForDb = sessionId;

    if (paymentType === 'subscription') {
      // Handle subscription - can be invoice ID (in_) or subscription ID (sub_)
      let invoice: Stripe.Invoice;
      let stripeInvoiceId = sessionId;

      if (sessionId.startsWith('sub_')) {
        logStep("Fetching latest invoice for subscription", { subscriptionId: sessionId });

        const invoices = await stripe.invoices.list({
          subscription: sessionId,
          limit: 5,
        });

        // Prefer a paid invoice, fall back to the newest invoice if needed
        invoice =
          invoices.data.find((i) => i.status === 'paid') ||
          invoices.data[0];

        if (!invoice) {
          throw new Error('Nu există facturi pentru acest abonament.');
        }

        stripeInvoiceId = invoice.id;
        stripeInvoiceIdForDb = stripeInvoiceId;
        logStep("Found invoice for subscription", { invoiceId: stripeInvoiceId, status: invoice.status });
      } else {
        invoice = await stripe.invoices.retrieve(sessionId);
        stripeInvoiceIdForDb = invoice.id;
      }

      customerEmail = invoice.customer_email || '';
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      customerName = (customer as any).name || customerEmail;
      amount = invoice.amount_paid / 100;
      stripeCustomerId = invoice.customer as string;
      productName = "Abonament Yana Contabila";

      logStep("Invoice retrieved", {
        invoiceId: stripeInvoiceIdForDb,
        customerId: stripeCustomerId,
        amount,
        currency: invoice.currency,
      });
    } else {
      // Handle credits checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const customer = await stripe.customers.retrieve(session.customer as string);
      customerEmail = (customer as any).email;
      customerName = (customer as any).name || customerEmail;
      amount = (session.amount_total || 0) / 100;
      stripeCustomerId = session.customer as string;
      productName = "Credite AI Yana";

      logStep("Session retrieved", {
        customerId: session.customer,
        amount: session.amount_total,
        currency: session.currency,
      });
    }

    // Check if invoice already exists IN DATABASE
    const { data: existingInvoice } = await supabaseClient
      .from('smartbill_invoices')
      .select('id, invoice_number, invoice_series')
      .eq(paymentType === 'subscription' ? 'stripe_invoice_id' : 'stripe_session_id', paymentType === 'subscription' ? stripeInvoiceIdForDb : sessionId)
      .eq('status', 'success')
      .maybeSingle();

    if (existingInvoice) {
      logStep("Invoice already exists in DB", { 
        invoiceId: existingInvoice.id,
        invoiceSeries: existingInvoice.invoice_series,
        invoiceNumber: existingInvoice.invoice_number 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Factura ${existingInvoice.invoice_series}-${existingInvoice.invoice_number} a fost deja generată pentru această plată`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // 🔒 DUPLICATE PREVENTION FIX #4: Also check in SmartBill directly
    // This prevents duplicates if DB record was deleted
    try {
      logStep("Checking SmartBill for existing invoices");
      const smartBillCheckResponse = await fetch(`https://ws.smartbill.ro/SBORO/api/invoice/list?cif=${companyCIF}&customer=${customerEmail}&page=1&pageSize=10`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Basic ${btoa(
            `${Deno.env.get("SMARTBILL_EMAIL")}:${Deno.env.get("SMARTBILL_API_KEY")}`
          )}`,
        },
      });
      
      if (smartBillCheckResponse.ok) {
        const existingInvoices = await smartBillCheckResponse.json();
        if (existingInvoices && existingInvoices.list && existingInvoices.list.length > 0) {
          logStep("⚠️ Found existing invoices in SmartBill for customer", { 
            count: existingInvoices.list.length,
            customerEmail 
          });
          // Continue anyway but log warning
        }
      }
    } catch (smartBillCheckError) {
      logStep("⚠️ Could not check SmartBill for duplicates (non-fatal)", { 
        error: smartBillCheckError instanceof Error ? smartBillCheckError.message : String(smartBillCheckError) 
      });
      // Continue anyway - this is just a safety check
    }

    logStep("Customer details", { customerEmail, customerName });

    // Find user by email
    const { data: targetUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (!targetUser) {
      throw new Error(`User not found for email: ${customerEmail}`);
    }

    logStep("Target user found", { userId: targetUser.id });

    // Get billing details from Stripe customer (+ tax IDs)
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['tax_ids'],
    }) as Stripe.Customer & { tax_ids?: { data: Stripe.TaxId[] } };

    const billingDetails = stripeCustomer.address;
    const country = billingDetails?.country || 'RO';
    const city = billingDetails?.city || 'Bucuresti';
    const state = (billingDetails as any)?.state || city || 'Bucuresti';
    const addressLine = billingDetails?.line1 || '-';
    const postalCode = (billingDetails as any)?.postal_code || '';

    const rawTaxId = stripeCustomer.tax_ids?.data?.[0]?.value;
    const taxId = rawTaxId ? rawTaxId.replace(/\s/g, '').toUpperCase() : undefined;

    const isPJ = !!taxId && (taxId.startsWith('RO') || /^\d{6,10}$/.test(taxId));

    let clientData: SmartBillClient;

    if (isPJ) {
      const companyTaxId = taxId!.startsWith('RO') ? taxId! : `RO${taxId}`;
      clientData = {
        tip: 'PJ',
        nume: customerName,
        cif: companyTaxId,
        email: customerEmail,
        localitate: city,
        judet: state,
        adresa: `${addressLine}${postalCode ? ', ' + postalCode : ''}`,
        tara: country === 'RO' ? 'Romania' : country,
      };
    } else {
      clientData = {
        tip: 'PF',
        nume: customerName,
        cnp: '-',
        email: customerEmail,
        localitate: city,
        judet: state,
        adresa: `${addressLine}${postalCode ? ', ' + postalCode : ''}`,
        tara: country === 'RO' ? 'Romania' : country,
      };
    }

    logStep("SmartBill client prepared", { clientType: clientData.tip, hasTaxId: !!taxId });

    // Prepare SmartBill invoice (SmartBill Romania API format)
    const today = new Date().toISOString().split('T')[0];

    const smartbillInvoice: SmartBillInvoice = {
      cif: companyCIF,
      client: clientData,
      emitereFactura: today,
      scadentaFactura: today,
      serieFactura: "conta",
      produse: [
        {
          nume: productName,
          cod: paymentType === 'subscription' ? "YANA-SUB" : "YANA-AI",
          um: "buc",
          cantitate: 1,
          pret: amount,
          valoareTVA: 0,
          procent_tva: 0,
        },
      ],
      observatii: `Plata Stripe - ${paymentType}: ${paymentType === 'subscription' ? stripeInvoiceIdForDb : sessionId}`,
      moneda: "RON",
    };

    logStep("Sending to SmartBill", { amount });

    // 🔒 RESILIENCE FIX #3: Add retry logic with timeout
    let smartBillResponse: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
         smartBillResponse = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             "Accept": "application/json",
             "Authorization": `Basic ${btoa(
               `${Deno.env.get("SMARTBILL_EMAIL")}:${Deno.env.get("SMARTBILL_API_KEY")}`
             )}`,
           },
           body: JSON.stringify(smartbillInvoice),
           signal: controller.signal,
         });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (fetchError) {
        retryCount++;
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        logStep(`SmartBill attempt ${retryCount} failed`, { error: errorMsg });
        
        if (retryCount >= maxRetries) {
          // Create admin alert for manual intervention
          await supabaseClient.from('admin_alerts').insert({
            alert_type: 'SMARTBILL_API_FAILURE',
            severity: 'critical',
            title: `SmartBill API Failed After ${maxRetries} Retries`,
            description: `Failed to generate invoice for ${customerEmail}. Manual intervention required.`,
            details: {
              sessionId,
              paymentType,
              customerEmail,
              amount,
              error: errorMsg,
              timestamp: new Date().toISOString()
            }
          });
          
          throw new Error(`SmartBill API failed after ${maxRetries} attempts: ${errorMsg}`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
      }
    }
    
    if (!smartBillResponse) {
      throw new Error("Failed to get response from SmartBill after retries");
    }

    const responseText = await smartBillResponse.text();
    logStep("SmartBill response received", { 
      status: smartBillResponse.status,
      contentType: smartBillResponse.headers.get('content-type')
    });

    if (!smartBillResponse.ok) {
      logStep("SmartBill error", { status: smartBillResponse.status, response: responseText });
      
       // Save failed attempt
       const failedInvoiceData: any = {
         user_id: targetUser.id,
         stripe_customer_id: stripeCustomerId,
         customer_email: customerEmail,
         customer_name: customerName,
         amount: amount,
         currency: 'RON',
         invoice_series: 'conta',
         status: 'failed',
         error_message: `SmartBill returnează HTML în loc de JSON. Status: ${smartBillResponse.status}. Verifică credențialele SmartBill și seria de facturare.`,
       };

       if (paymentType === 'subscription') {
         failedInvoiceData.stripe_invoice_id = stripeInvoiceIdForDb;
       } else {
         failedInvoiceData.stripe_session_id = sessionId;
       }

       await supabaseClient.from('smartbill_invoices').insert(failedInvoiceData);

      throw new Error(`SmartBill API error: ${smartBillResponse.status}`);
    }

    let smartBillData;
    try {
      smartBillData = JSON.parse(responseText);
    } catch (e) {
      logStep("Failed to parse SmartBill response as JSON");
      throw new Error("SmartBill returned invalid JSON");
    }

    logStep("Invoice created successfully", { 
      series: smartBillData.series,
      number: smartBillData.number 
    });

     // Save to database
     const successInvoiceData: any = {
       user_id: targetUser.id,
       stripe_customer_id: stripeCustomerId,
       customer_email: customerEmail,
       customer_name: customerName,
       customer_cif: taxId,
       amount: amount,
       currency: 'RON',
       invoice_series: smartBillData.series,
       invoice_number: smartBillData.number,
       invoice_url: smartBillData.url,
       status: 'success',
       smartbill_response: smartBillData,
     };

     if (paymentType === 'subscription') {
       successInvoiceData.stripe_invoice_id = stripeInvoiceIdForDb;
     } else {
       successInvoiceData.stripe_session_id = sessionId;
     }

    const { error: insertError } = await supabaseClient
      .from('smartbill_invoices')
      .insert(successInvoiceData);

    if (insertError) {
      logStep("Error saving to database", { error: insertError });
      throw insertError;
    }

    // Update subscription payment status if applicable
    if (paymentType === 'subscription') {
      await supabaseClient
        .from('subscription_payments')
        .update({ invoice_generated: true })
        .eq('stripe_invoice_id', stripeInvoiceIdForDb);
      
      logStep("Subscription payment marked as invoiced");
    }

    logStep("Invoice saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Factura a fost generată cu succes și subscripția a fost activată!",
        invoice: {
          series: smartBillData.series,
          number: smartBillData.number,
          url: smartBillData.url,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
