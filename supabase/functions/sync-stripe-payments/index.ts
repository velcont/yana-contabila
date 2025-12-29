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

    // Fetch subscriptions and their paid invoices (more reliable than scanning all invoices)
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    });

    console.log(`Found ${subscriptions.data.length} subscriptions in Stripe`);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sub of subscriptions.data) {
      try {
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = !customer || (customer as any).deleted ? null : (customer as any).email;

        if (!customerEmail) {
          skipped++;
          continue;
        }

        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, email, subscription_type')
          .eq('email', customerEmail)
          .maybeSingle();

        if (!profile) {
          skipped++;
          continue;
        }

        // Fetch paid invoices for this subscription (latest first)
        const subInvoices = await stripe.invoices.list({
          subscription: sub.id,
          status: 'paid',
          limit: 24,
        } as any);

        for (const invoice of subInvoices.data) {
          try {
            const { data: existing } = await supabaseClient
              .from('subscription_payments')
              .select('id')
              .eq('stripe_invoice_id', invoice.id)
              .maybeSingle();

            if (existing) {
              skipped++;
              continue;
            }

            const amountPaid = invoice.amount_paid ?? 0;

            // Prefer profile subscription_type (already normalized in app)
            const subscriptionType = (profile as any).subscription_type || (amountPaid >= 19900 ? 'accounting_firm' : 'entrepreneur');

            const periodStart = (invoice.period_start || invoice.created) * 1000;
            const periodEnd = (invoice.period_end || invoice.created + 30 * 24 * 60 * 60) * 1000;

            const { error: insertError } = await supabaseClient
              .from('subscription_payments')
              .insert({
                user_id: profile.id,
                stripe_subscription_id: sub.id,
                stripe_invoice_id: invoice.id,
                amount_paid_cents: amountPaid,
                currency: (invoice.currency || 'ron').toUpperCase(),
                subscription_type: subscriptionType,
                period_start: new Date(periodStart).toISOString(),
                period_end: new Date(periodEnd).toISOString(),
                payment_date: new Date(invoice.created * 1000).toISOString(),
                status: 'paid',
                invoice_generated: false,
                metadata: {
                  synced_at: new Date().toISOString(),
                  customer_email: customerEmail,
                },
              });

            if (insertError) {
              errors.push(`Invoice ${invoice.id}: ${insertError.message}`);
            } else {
              synced++;
              console.log(`Synced ${invoice.id} for ${customerEmail}`);
            }
          } catch (err: any) {
            errors.push(`Invoice ${invoice.id}: ${err.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Subscription ${sub.id}: ${err.message}`);
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
