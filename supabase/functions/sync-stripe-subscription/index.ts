import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nu s-a găsit un customer Stripe pentru acest email.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nu s-a găsit o subscripție activă pentru acest customer.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const priceId = subscription.items.data[0].price.id;
    
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      priceId,
      periodEnd: subscriptionEnd
    });

    // Determine subscription type based on price
    let subscriptionType = 'entrepreneur';
    if (priceId === 'price_1SLWzFBu3m83VcDAgP1veppc') {
      subscriptionType = 'accounting_firm';
    } else if (priceId === 'price_1SLWzEBu3m83VcDAfHVcQupt') {
      subscriptionType = 'entrepreneur';
    } else if (priceId === 'price_1SHJt7Bu3m83VcDAJryrpFfB') {
      subscriptionType = 'accounting_firm';
    }
    
    logStep("Subscription type determined", { subscriptionType });

    // Update profile with subscription info
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_type: subscriptionType,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_ends_at: subscriptionEnd,
        trial_ends_at: null, // Clear trial
      })
      .eq('id', user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError });
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    logStep("Profile updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscripția a fost sincronizată cu succes!',
        data: {
          subscribed: true,
          subscription_type: subscriptionType,
          subscription_status: 'active',
          subscription_end: subscriptionEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
