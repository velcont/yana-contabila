import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PREVIEW-INVOICE] ${step}${detailsStr}`);
};

interface InvoicePreview {
  // Client info
  client_name: string;
  client_email: string;
  client_type: 'PF' | 'PJ';
  client_cif?: string;
  client_address?: string;
  client_city?: string;
  client_country?: string;
  client_phone?: string;
  
  // Product info
  plan_name: string;
  plan_description: string;
  amount_cents: number;
  currency: string;
  period_start: string;
  period_end: string;
  
  // Invoice info
  invoice_series: string;
  invoice_date: string;
  
  // Stripe references
  stripe_customer_id: string;
  stripe_subscription_id: string;
  
  // Warnings
  warnings: string[];
  
  // Already invoiced check
  already_invoiced: boolean;
  existing_invoice?: {
    number: string;
    series: string;
    created_at: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // Verify admin role
    const { data: hasRole } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });
    
    const adminEmails = ['timoficiuc.g@gmail.com', 'office@velcont.com', 'alin@yana.ro'];
    if (!hasRole && !adminEmails.includes(user.email)) {
      throw new Error("Admin access required");
    }
    logStep("Admin access verified");

    // Get request body
    const { subscription_id, customer_id } = await req.json();
    if (!subscription_id || !customer_id) {
      throw new Error("Missing subscription_id or customer_id");
    }
    logStep("Request params", { subscription_id, customer_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch subscription details
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    logStep("Subscription retrieved", { status: subscription.status });

    // Fetch customer details with tax IDs
    const customer = await stripe.customers.retrieve(customer_id, {
      expand: ['tax_ids']
    }) as Stripe.Customer & { tax_ids?: { data: Stripe.TaxId[] } };
    logStep("Customer retrieved", { name: customer.name, email: customer.email });

    // Check if already invoiced in our database
    const { data: existingInvoice } = await supabaseClient
      .from('smartbill_invoices')
      .select('invoice_number, invoice_series, created_at')
      .eq('stripe_session_id', subscription_id)
      .eq('status', 'success')
      .maybeSingle();

    // Determine client type (PF vs PJ)
    let clientType: 'PF' | 'PJ' = 'PF';
    let clientCif: string | undefined;
    
    // Check tax IDs from Stripe
    if (customer.tax_ids?.data && customer.tax_ids.data.length > 0) {
      const taxId = customer.tax_ids.data[0];
      if (taxId.value) {
        const taxValue = taxId.value.replace(/\s/g, '').toUpperCase();
        // Romanian companies have CIF starting with RO
        if (taxValue.startsWith('RO') || /^\d{6,10}$/.test(taxValue)) {
          clientType = 'PJ';
          clientCif = taxValue;
        }
      }
    }

    // Also check billing address metadata for company hints
    const billingAddress = customer.address;
    
    // Get price info
    const priceItem = subscription.items.data[0];
    const priceId = priceItem?.price?.id || '';
    const amountCents = priceItem?.price?.unit_amount || 0;
    
    // Plan name mapping
    const PRICE_NAMES: Record<string, string> = {
      'price_1RKlEeH4bXqy1z1bfGsBlxXI': 'Antreprenor',
      'price_1RBxlLH4bXqy1z1bW1RlNamC': 'Antreprenor', 
      'price_1RKlF7H4bXqy1z1bKUhsEWaS': 'Cabinet Contabil',
      'price_1RCQjTH4bXqy1z1b3HsKFbZs': 'Cabinet Contabil',
      'price_1RiUl9H4bXqy1z1bcnmQELuz': 'Cabinet Contabil (Promo)',
    };
    const planName = PRICE_NAMES[priceId] || 'Abonament YANA';

    // Build warnings list
    const warnings: string[] = [];
    
    if (clientType === 'PJ' && !clientCif) {
      warnings.push('⚠️ Tip firmă detectat dar CIF lipsește în Stripe');
    }
    if (!customer.name) {
      warnings.push('⚠️ Numele clientului lipsește în Stripe');
    }
    if (!billingAddress?.line1) {
      warnings.push('⚠️ Adresa de facturare lipsește în Stripe');
    }
    if (!customer.email) {
      warnings.push('⚠️ Emailul clientului lipsește în Stripe');
    }

    // Format dates
    const formatDate = (timestamp: number) => {
      return new Date(timestamp * 1000).toISOString();
    };

    const preview: InvoicePreview = {
      // Client info
      client_name: customer.name || customer.email || 'N/A',
      client_email: customer.email || 'N/A',
      client_type: clientType,
      client_cif: clientCif,
      client_address: billingAddress?.line1 || undefined,
      client_city: billingAddress?.city || undefined,
      client_country: billingAddress?.country || undefined,
      client_phone: customer.phone || undefined,
      
      // Product info
      plan_name: planName,
      plan_description: `Abonament ${planName} - YANA Strategica`,
      amount_cents: amountCents,
      currency: 'RON',
      period_start: formatDate(subscription.current_period_start),
      period_end: formatDate(subscription.current_period_end),
      
      // Invoice info
      invoice_series: 'conta',
      invoice_date: new Date().toISOString().split('T')[0],
      
      // Stripe references
      stripe_customer_id: customer_id,
      stripe_subscription_id: subscription_id,
      
      // Warnings
      warnings,
      
      // Already invoiced check
      already_invoiced: !!existingInvoice,
      existing_invoice: existingInvoice ? {
        number: existingInvoice.invoice_number,
        series: existingInvoice.invoice_series,
        created_at: existingInvoice.created_at
      } : undefined
    };

    logStep("Preview generated successfully", { 
      client_type: clientType, 
      amount: amountCents / 100,
      warnings_count: warnings.length,
      already_invoiced: !!existingInvoice
    });

    return new Response(JSON.stringify({ success: true, preview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
