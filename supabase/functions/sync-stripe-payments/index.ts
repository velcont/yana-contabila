import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Starting Stripe payments sync...");

    // Fetch all paid invoices from Stripe (last 100)
    const invoices = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      expand: ['data.subscription', 'data.customer']
    });

    console.log(`Found ${invoices.data.length} paid invoices in Stripe`);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const invoice of invoices.data) {
      // Only process subscription invoices
      if (!invoice.subscription) {
        skipped++;
        continue;
      }

      try {
        // Check if already exists
        const { data: existing } = await supabaseClient
          .from('subscription_payments')
          .select('id')
          .eq('stripe_invoice_id', invoice.id)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Get customer email
        const customer = invoice.customer as Stripe.Customer;
        const customerEmail = customer?.email || invoice.customer_email;

        if (!customerEmail) {
          errors.push(`Invoice ${invoice.id}: no customer email`);
          continue;
        }

        // Find user by email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, email')
          .eq('email', customerEmail)
          .single();

        if (!profile) {
          errors.push(`Invoice ${invoice.id}: user not found for ${customerEmail}`);
          continue;
        }

        // Get subscription details
        const subscription = invoice.subscription as Stripe.Subscription;
        const priceId = subscription?.items?.data?.[0]?.price?.id;

        // Determine subscription type based on amount
        let subscriptionType = 'entrepreneur';
        if (invoice.amount_paid >= 19900) {
          subscriptionType = 'accounting_firm';
        }

        // Insert payment record
        const { error: insertError } = await supabaseClient
          .from('subscription_payments')
          .insert({
            user_id: profile.id,
            stripe_subscription_id: typeof invoice.subscription === 'string' 
              ? invoice.subscription 
              : invoice.subscription?.id,
            stripe_invoice_id: invoice.id,
            amount_paid_cents: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            subscription_type: subscriptionType,
            period_start: new Date((invoice.period_start || invoice.created) * 1000).toISOString(),
            period_end: new Date((invoice.period_end || invoice.created + 30*24*60*60) * 1000).toISOString(),
            payment_date: new Date(invoice.created * 1000).toISOString(),
            status: 'paid',
            invoice_generated: false,
            metadata: {
              synced_at: new Date().toISOString(),
              customer_email: customerEmail,
              price_id: priceId
            }
          });

        if (insertError) {
          errors.push(`Invoice ${invoice.id}: ${insertError.message}`);
        } else {
          synced++;
          console.log(`Synced invoice ${invoice.id} for ${customerEmail}`);
        }
      } catch (err: any) {
        errors.push(`Invoice ${invoice.id}: ${err.message}`);
      }
    }

    console.log(`Sync complete: ${synced} synced, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        skipped,
        errors: errors.slice(0, 10), // Return first 10 errors
        total_errors: errors.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
