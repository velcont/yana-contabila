import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Check profile for free access and trial period
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('has_free_access, trial_ends_at, subscription_type')
      .eq('id', user.id)
      .single();

    // If user has free access, return active immediately
    if (profile?.has_free_access) {
      logStep("User has free access granted");
      return new Response(
        JSON.stringify({
          subscribed: true,
          subscription_type: profile.subscription_type || 'entrepreneur',
          subscription_status: 'active',
          subscription_end: null,
          access_type: 'free_access'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user is still in trial period
    if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
      logStep("User is in trial period", { trialEndsAt: profile.trial_ends_at });
      return new Response(
        JSON.stringify({
          subscribed: true,
          subscription_type: profile.subscription_type || 'entrepreneur',
          subscription_status: 'active',
          subscription_end: profile.trial_ends_at,
          access_type: 'trial'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      
      // Update profile to inactive
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'inactive',
          subscription_type: 'entrepreneur',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_type: 'entrepreneur',
          subscription_status: 'inactive',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
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

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionType = 'entrepreneur';
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      const priceId = subscription.items.data[0].price.id;
      logStep("Active subscription found", { subscriptionId: subscription.id, priceId });

      // Determine subscription type based on price
      if (priceId === 'price_1SHJt7Bu3m83VcDAJryrpFfB') {
        subscriptionType = 'accounting_firm';
      } else {
        subscriptionType = 'entrepreneur';
      }
      
      logStep("Subscription type determined", { subscriptionType });

      // Update profile with subscription info
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_type: subscriptionType,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_ends_at: subscriptionEnd,
        })
        .eq('id', user.id);
    } else {
      logStep("No active subscription");
      
      // Update profile to inactive
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'inactive',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        subscription_type: subscriptionType,
        subscription_status: hasActiveSub ? 'active' : 'inactive',
        subscription_end: subscriptionEnd,
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
