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

    // 🔒 BUG FIX #10: Rate limiting - max 30 requests per minute per user
    const rateLimitKey = `check_subscription_${user.id}`;
    const rateLimitWindow = 60; // 1 minute in seconds
    const rateLimitMax = 30;

    const { data: rateLimitData } = await supabaseClient
      .from('api_rate_limits')
      .select('request_count, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', 'check-subscription')
      .gte('window_start', new Date(Date.now() - rateLimitWindow * 1000).toISOString())
      .maybeSingle();

    if (rateLimitData && rateLimitData.request_count >= rateLimitMax) {
      logStep("Rate limit exceeded", { userId: user.id, count: rateLimitData.request_count });
      return new Response(
        JSON.stringify({ 
          error: 'Prea multe cereri. Te rugăm să aștepți un minut.',
          rate_limited: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Update rate limit counter
    if (rateLimitData) {
      await supabaseClient
        .from('api_rate_limits')
        .update({ request_count: rateLimitData.request_count + 1 })
        .eq('user_id', user.id)
        .eq('endpoint', 'check-subscription');
    } else {
      await supabaseClient
        .from('api_rate_limits')
        .insert({
          user_id: user.id,
          endpoint: 'check-subscription',
          request_count: 1,
          window_start: new Date().toISOString()
        });
    }

    // Check profile for free access, trial period, and manual subscription (+ ensure profile exists and sync from user_metadata)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('has_free_access, trial_ends_at, subscription_type, account_type_selected, subscription_status, subscription_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    // Read intent from auth user metadata (set at signup)
    const meta = (user as any)?.user_metadata || {};
    const metaType = meta.subscription_type === 'accounting_firm' ? 'accounting_firm' : 'entrepreneur';
    const metaSelected = !!meta.account_type_selected;
    const metaTerms = !!meta.terms_accepted;

    // Ensure a profile row exists and reflect chosen account type when first seen
    if (!profile) {
      logStep('No profile found - creating one from user_metadata', { metaType, metaSelected });
      await supabaseClient.from('profiles').insert({
        id: user.id,
        email: user.email,
        subscription_type: metaType,
        account_type_selected: metaSelected,
        terms_accepted: metaTerms,
        subscription_status: 'inactive',
      });
    } else if (metaSelected && metaType === 'accounting_firm' && profile.subscription_type !== 'accounting_firm') {
      logStep('Syncing subscription_type from metadata to profile', { from: profile.subscription_type, to: metaType });
      await supabaseClient.from('profiles').update({
        subscription_type: metaType,
        account_type_selected: true,
      }).eq('id', user.id);
    }

    const effectiveType = (profile?.subscription_type as string) || metaType;

    // If user has free access, mark profile active and return
    if (profile?.has_free_access) {
      logStep("User has free access granted");

      // Persist status in profile so RLS policies allow operations
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_type: effectiveType,
          subscription_ends_at: null,
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          subscribed: true,
          subscription_type: effectiveType,
          subscription_status: 'active',
          subscription_end: null,
          access_type: 'free_access'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for manual subscription FIRST (set directly in DB without Stripe)
    if (profile?.subscription_status === 'active' && profile?.subscription_ends_at) {
      const subEndsAt = new Date(profile.subscription_ends_at);
      const now = new Date();
      
      if (subEndsAt > now) {
        logStep("Manual subscription active", { subscriptionEndsAt: profile.subscription_ends_at, subscriptionType: profile.subscription_type });
        
        return new Response(
          JSON.stringify({
            subscribed: true,
            subscription_type: profile.subscription_type || effectiveType,
            subscription_status: 'active',
            subscription_end: profile.subscription_ends_at,
            access_type: 'subscription'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        // Manual subscription expired
        logStep("Manual subscription expired", { subscriptionEndsAt: profile.subscription_ends_at });
        
        await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            subscription_ends_at: null,
          })
          .eq('id', user.id);
      }
    }

    // Check if user is still in trial period (ONLY if no manual subscription)
    if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
      logStep("User is in trial period", { trialEndsAt: profile.trial_ends_at });

      // Persist status in profile so RLS policies allow operations
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_type: effectiveType,
          subscription_ends_at: profile.trial_ends_at,
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          subscribed: true,
          subscription_type: effectiveType,
          subscription_status: 'active',
          subscription_end: profile.trial_ends_at,
          access_type: 'trial'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Trial expired - block access
    if (profile?.trial_ends_at && new Date(profile.trial_ends_at) <= new Date()) {
      logStep("Trial expired, blocking access", { trialEndsAt: profile.trial_ends_at });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'inactive',
          subscription_ends_at: null,
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_type: effectiveType,
          subscription_status: 'inactive',
          subscription_end: null,
          access_type: 'trial_expired',
          trial_expired: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
      timeout: 10000, // 🔒 BUG FIX #9: 10 second timeout
      maxNetworkRetries: 2,
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
          subscription_type: effectiveType,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_type: effectiveType,
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
    let subscriptionType = effectiveType;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      const priceId = subscription.items.data[0].price.id;
      logStep("Active subscription found", { subscriptionId: subscription.id, priceId });

      // Determine subscription type based on price
      if (priceId === 'price_1SLWzFBu3m83VcDAgP1veppc') {
        // Plan Contabil 199 RON
        subscriptionType = 'accounting_firm';
      } else if (priceId === 'price_1SLWzEBu3m83VcDAfHVcQupt') {
        // Plan Antreprenor 49 RON
        subscriptionType = 'entrepreneur';
      } else if (priceId === 'price_1SHJt7Bu3m83VcDAJryrpFfB') {
        // Old Plan Contabil (EUR)
        subscriptionType = 'accounting_firm';
      } else {
        // Default to entrepreneur
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

      // 🔒 BUG FIX #12: Audit log pentru verificare subscription reușită
      await supabaseClient.rpc('log_audit_event', {
        p_action_type: 'SUBSCRIPTION_CHECK_SUCCESS',
        p_table_name: 'profiles',
        p_record_id: user.id,
        p_metadata: {
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_status: 'active',
          subscription_type: subscriptionType,
          subscription_ends_at: subscriptionEnd
        }
      }).then(({ error }) => {
        if (error) console.error("⚠️ Audit log failed:", error);
      });
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
        access_type: hasActiveSub ? 'subscription' : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // 🔒 BUG FIX #12: Audit log pentru erori verificare subscription
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient.rpc('log_audit_event', {
        p_action_type: 'SUBSCRIPTION_CHECK_ERROR',
        p_table_name: 'profiles',
        p_record_id: null,
        p_metadata: {
          error_message: errorMessage,
          error_stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error("⚠️ Failed to log subscription check error:", auditError);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
