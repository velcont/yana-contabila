import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let user = null; // 🔒 BUG FIX #12: Declare user outside try block for error logging

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    user = data.user;

    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Utilizator neautentificat" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔒 UX FIX #7: Reduce rate limiting from 5 min to 2 min
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentCheckouts, error: checkoutError } = await supabaseClient
      .from('credits_purchases')
      .select('purchase_date, stripe_checkout_session_id')
      .eq('user_id', user.id)
      .gte('purchase_date', twoMinutesAgo)
      .order('purchase_date', { ascending: false })
      .limit(1);

    if (!checkoutError && recentCheckouts && recentCheckouts.length > 0) {
      console.log(`⚠️ User ${user.id} has recent checkout in last 2 minutes, preventing duplicate`);
      return new Response(
        JSON.stringify({ 
          error: "Ai o achiziție în curs de procesare. Te rugăm să aștepți 2 minute.",
          recent_checkout: true,
          retry_after_seconds: 120
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔒 BUG FIX #7: Validate priceId against whitelist
    const validPriceIds = [
      "price_1SIsUMBu3m83VcDA5X8MPfrS", // Starter (10 lei)
      "price_1SIsUPBu3m83VcDAqCC955qF", // Professional (20 lei)
      "price_1SIsUQBu3m83VcDAQUwk4CZZ", // Business (40 lei)
      "price_1SIsUQBu3m83VcDAykzaXTeT", // Enterprise (70 lei)
    ];

    // Zod validation schema for request body
    const RequestSchema = z.object({
      priceId: z.string().min(1, "Price ID is required").refine(
        (id) => validPriceIds.includes(id),
        { message: "Invalid price ID" }
      ),
    });

    const rawBody = await req.json();
    const validation = RequestSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error("❌ Invalid request body:", validation.error);
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validation.error.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { priceId } = validation.data;

    if (!validPriceIds.includes(priceId)) {
      console.error(`⚠️ Invalid priceId attempted: ${priceId} by user ${user.id}`);
      
      // Log suspicious activity
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action_type: 'INVALID_PRICE_ID_ATTEMPTED',
        table_name: 'credits_purchases',
        metadata: {
          attempted_price_id: priceId,
          timestamp: new Date().toISOString()
        }
      });

      return new Response(
        JSON.stringify({ 
          error: "Price ID invalid. Te rugăm să selectezi un pachet valid.",
          valid_packages: ["Starter", "Professional", "Business", "Enterprise"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
      timeout: 10000, // 🔒 BUG FIX #9: 10 second timeout for all Stripe API calls
      maxNetworkRetries: 2, // Retry failed requests twice
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/my-ai-costs?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/my-ai-costs?credits_cancel=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
      },
    });

    console.log("Checkout session created:", session.id);

    // 🔒 BUG FIX #12: Audit log pentru inițiere checkout credite
    await supabaseClient.rpc('log_audit_event', {
      p_action_type: 'STRIPE_CHECKOUT_INITIATED',
      p_table_name: 'checkout_sessions',
      p_record_id: null,
      p_metadata: {
        stripe_session_id: session.id,
        stripe_price_id: priceId,
        user_id: user.id,
        user_email: user.email,
        session_url: session.url
      }
    }).then(({ error }) => {
      if (error) console.error("⚠️ Audit log failed:", error);
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error creating checkout:", error);
    
    // 🔒 BUG FIX #12: Audit log pentru erori checkout
    try {
      await supabaseClient.rpc('log_audit_event', {
        p_action_type: 'STRIPE_CHECKOUT_ERROR',
        p_table_name: 'checkout_sessions',
        p_record_id: null,
        p_metadata: {
          error_message: (error as Error).message,
          error_stack: (error as Error).stack,
          user_id: user?.id || null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error("⚠️ Failed to log checkout error to audit:", auditError);
    }
    
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
