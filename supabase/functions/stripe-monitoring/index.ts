import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-MONITORING] ${step}${detailsStr}`);
};

import Stripe from "https://esm.sh/stripe@18.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
  timeout: 15000,
  maxNetworkRetries: 2,
});

/**
 * 🔒 FIX #10: Stripe API Usage & Cost Monitoring + Invoice Discrepancy Detection
 * 
 * This edge function:
 * 1. Tracks all Stripe API calls made by YANA
 * 2. Monitors API request volume and costs
 * 3. 🆕 Compares Stripe invoices with subscription_payments to detect missing records
 * 4. Creates admin alerts for discrepancies
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Monitoring request received");

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
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin authenticated", { adminId: user.id });

    // ============================================
    // 🆕 SECTION 1: Check for missing invoices
    // ============================================
    logStep("Checking for missing invoices in database...");
    
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    // Get all paid invoices from Stripe (last 30 days)
    const stripeInvoices = await stripe.invoices.list({
      status: 'paid',
      created: { gte: thirtyDaysAgo },
      limit: 100
    });
    
    logStep(`Found ${stripeInvoices.data.length} paid invoices in Stripe`);
    
    // Get all recorded payments from our database
    const { data: dbPayments, error: dbError } = await supabaseClient
      .from('subscription_payments')
      .select('stripe_invoice_id')
      .gte('payment_date', new Date(thirtyDaysAgo * 1000).toISOString());
    
    if (dbError) {
      logStep("Error fetching DB payments", { error: dbError });
    }
    
    const dbInvoiceIds = new Set(dbPayments?.map(p => p.stripe_invoice_id) || []);
    
    // Find missing invoices (in Stripe but not in DB)
    const missingInvoices = stripeInvoices.data.filter(
      (inv: Stripe.Invoice) => inv.subscription && !dbInvoiceIds.has(inv.id)
    );
    
    logStep(`Found ${missingInvoices.length} missing invoices`);
    
    // Create alerts for each missing invoice
    const invoiceAlerts = [];
    for (const invoice of missingInvoices) {
      const alertData = {
        alert_type: 'MISSING_INVOICE_PAYMENT',
        severity: 'critical',
        title: `Missing Payment Record: ${invoice.customer_email || 'Unknown'}`,
        description: `Invoice ${invoice.id} was paid on Stripe but NOT recorded in subscription_payments.`,
        details: {
          invoice_id: invoice.id,
          customer_email: invoice.customer_email,
          customer_id: invoice.customer,
          subscription_id: invoice.subscription,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          billing_reason: invoice.billing_reason,
          created: new Date(invoice.created * 1000).toISOString(),
          invoice_url: invoice.hosted_invoice_url
        }
      };
      
      // Check if alert already exists to avoid duplicates
      const { data: existingAlert } = await supabaseClient
        .from('admin_alerts')
        .select('id')
        .eq('alert_type', 'MISSING_INVOICE_PAYMENT')
        .contains('details', { invoice_id: invoice.id })
        .single();
      
      if (!existingAlert) {
        await supabaseClient.from('admin_alerts').insert(alertData);
        invoiceAlerts.push({
          invoice_id: invoice.id,
          email: invoice.customer_email,
          amount: invoice.amount_paid
        });
        logStep(`Created alert for missing invoice: ${invoice.id}`);
      }
    }

    // ============================================
    // SECTION 2: API Usage Statistics
    // ============================================
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: stripeApiCalls, error: logsError } = await supabaseClient
      .from('audit_logs')
      .select('action_type, created_at, metadata')
      .or('action_type.like.%STRIPE%,action_type.like.%CHECKOUT%,action_type.like.%SUBSCRIPTION%')
      .gte('created_at', thirtyDaysAgoISO)
      .order('created_at', { ascending: false });

    if (logsError) {
      logStep("Error fetching logs", { error: logsError });
    }

    // Aggregate statistics
    const stats = {
      totalCalls: stripeApiCalls?.length || 0,
      callsByType: {} as Record<string, number>,
      callsByDay: {} as Record<string, number>,
      estimatedCost: 0,
      averageCallsPerDay: 0,
      missingInvoicesCount: missingInvoices.length,
      stripeInvoicesCount: stripeInvoices.data.length,
      dbPaymentsCount: dbPayments?.length || 0
    };

    stripeApiCalls?.forEach(log => {
      stats.callsByType[log.action_type] = (stats.callsByType[log.action_type] || 0) + 1;
      const day = log.created_at.split('T')[0];
      stats.callsByDay[day] = (stats.callsByDay[day] || 0) + 1;
    });

    stats.averageCallsPerDay = stats.totalCalls / 30;
    stats.estimatedCost = Math.max(0, (stats.totalCalls - 100000) * 0.0001);

    // Check for usage alerts
    const alerts = [];
    
    if (stats.averageCallsPerDay > 1000) {
      alerts.push({
        severity: 'high',
        title: 'High Stripe API Usage',
        description: `Averaging ${Math.round(stats.averageCallsPerDay)} calls/day. Consider optimization.`,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (stats.callsByDay[today] && stats.callsByDay[today] > 500) {
      alerts.push({
        severity: 'medium',
        title: 'High Stripe API Usage Today',
        description: `${stats.callsByDay[today]} calls today. Monitor for unusual activity.`,
      });
    }

    // Create usage alerts
    for (const alert of alerts) {
      await supabaseClient.from('admin_alerts').insert({
        alert_type: 'STRIPE_API_USAGE',
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        details: { stats, timestamp: new Date().toISOString() }
      });
    }

    logStep("Monitoring completed", { 
      stats, 
      alertsCreated: alerts.length,
      missingInvoicesAlerted: invoiceAlerts.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        alerts,
        missingInvoices: invoiceAlerts,
        recommendations: [
          missingInvoices.length > 0 
            ? `⚠️ ${missingInvoices.length} invoice(s) missing from database. Run sync-stripe-payments to fix.`
            : null,
          stats.averageCallsPerDay > 500 
            ? "Consider caching Stripe data to reduce API calls" 
            : null,
          stats.totalCalls > 50000 
            ? "Review API call patterns for optimization opportunities" 
            : null,
        ].filter(Boolean)
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
