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
  name: string;
  vatCode?: string;
  regCom?: string;
  address?: string;
  city?: string;
  country?: string;
  email?: string;
  type?: 'pf' | 'pj';
}

interface SmartBillProduct {
  name: string;
  code: string;
  measuringUnit: string;
  quantity: number;
  price: number;
  isTaxIncluded: boolean;
  taxPercentage: number;
  saveToDb: boolean;
}

interface SmartBillInvoice {
  companyVatCode: string;
  client: SmartBillClient;
  invoiceSeries: string;
  issueDate: string;
  isDraft: boolean;
  currency: string;
  products: SmartBillProduct[];
  language: string;
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

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRoles) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin authenticated", { adminId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    logStep("Processing session", { sessionId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get session details
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      customerId: session.customer,
      amount: session.amount_total,
      currency: session.currency 
    });

    // Check if invoice already exists
    const { data: existingInvoice } = await supabaseClient
      .from('smartbill_invoices')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'success')
      .maybeSingle();

    if (existingInvoice) {
      logStep("Invoice already exists", { invoiceId: existingInvoice.id });
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Factura a fost deja generată pentru această sesiune"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get customer details
    const customer = await stripe.customers.retrieve(session.customer as string);
    const customerEmail = (customer as any).email;
    const customerName = (customer as any).name || customerEmail;

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

    // Get billing details
    const billingDetails = (customer as any).address;
    const taxId = (customer as any).tax_ids?.data?.[0]?.value;

    // Determine if PJ (legal entity) or PF (individual)
    const isPJ = taxId && (taxId.startsWith('RO') || taxId.length >= 8);
    
    const smartBillClient: SmartBillClient = {
      name: customerName,
      email: customerEmail,
      type: isPJ ? 'pj' : 'pf',
      country: billingDetails?.country || 'Romania',
      city: billingDetails?.city || '',
      address: billingDetails?.line1 || '',
    };

    if (isPJ && taxId) {
      smartBillClient.vatCode = taxId;
    }

    logStep("SmartBill client prepared", { clientType: smartBillClient.type });

    // Prepare SmartBill invoice
    const amount = (session.amount_total || 0) / 100;
    const companyCIF = Deno.env.get("SMARTBILL_COMPANY_CIF") || "";

    const invoiceData: SmartBillInvoice = {
      companyVatCode: companyCIF,
      client: smartBillClient,
      invoiceSeries: "conta",
      issueDate: new Date().toISOString().split('T')[0],
      isDraft: false,
      currency: "RON",
      language: "RO",
      products: [
        {
          name: "Abonament Yana Contabila",
          code: "YANA-SUB",
          measuringUnit: "buc",
          quantity: 1,
          price: amount,
          isTaxIncluded: true,
          taxPercentage: 19,
          saveToDb: false,
        },
      ],
    };

    logStep("Sending to SmartBill", { amount });

    // Call SmartBill API
    const smartBillResponse = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${btoa(
          `${Deno.env.get("SMARTBILL_EMAIL")}:${Deno.env.get("SMARTBILL_API_KEY")}`
        )}`,
      },
      body: JSON.stringify(invoiceData),
    });

    const responseText = await smartBillResponse.text();
    logStep("SmartBill response received", { 
      status: smartBillResponse.status,
      contentType: smartBillResponse.headers.get('content-type')
    });

    if (!smartBillResponse.ok) {
      logStep("SmartBill error", { status: smartBillResponse.status, response: responseText });
      
      // Save failed attempt
      await supabaseClient.from('smartbill_invoices').insert({
        user_id: targetUser.id,
        stripe_session_id: sessionId,
        stripe_customer_id: session.customer as string,
        customer_email: customerEmail,
        customer_name: customerName,
        amount: amount,
        currency: 'RON',
        invoice_series: 'conta',
        status: 'failed',
        error_message: `SmartBill returnează HTML în loc de JSON. Status: ${smartBillResponse.status}. Verifică credențialele SmartBill și CIF-ul companiei.`,
      });

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
    const { error: insertError } = await supabaseClient
      .from('smartbill_invoices')
      .insert({
        user_id: targetUser.id,
        stripe_session_id: sessionId,
        stripe_customer_id: session.customer as string,
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
      });

    if (insertError) {
      logStep("Error saving to database", { error: insertError });
      throw insertError;
    }

    // Update user subscription
    await supabaseClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_type: 'accounting_firm',
        stripe_customer_id: session.customer as string,
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_ends_at: null,
      })
      .eq('id', targetUser.id);

    logStep("Subscription updated for user");

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
