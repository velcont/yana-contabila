import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Body is optional. In Admin we may pass { email }.
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    logStep("Request body parsed", { 
      hasBody: !!body, 
      requestedEmail: body?.email || 'none',
      bodyKeys: Object.keys(body || {})
    });

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

    const requestedEmail = typeof body?.email === 'string' ? body.email.trim() : '';
    let targetEmail = user.email;
    let targetUserId = user.id;

    // Allow syncing another user's subscription only for admins.
    if (requestedEmail && requestedEmail !== user.email) {
      const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError || !isAdmin) {
        logStep("Unauthorized email override attempt", { requester: user.email, requestedEmail });
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Nu ai permisiuni pentru a sincroniza alt utilizator.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const { data: targetProfile, error: targetProfileError } = await supabaseClient
        .from('profiles')
        .select('id, email, subscription_status, subscription_ends_at, subscription_type, has_free_access, trial_ends_at')
        .eq('email', requestedEmail)
        .maybeSingle();

      if (targetProfileError) {
        logStep("Error fetching target profile", { requestedEmail, error: targetProfileError });
        throw new Error(`Failed to fetch profile for ${requestedEmail}: ${targetProfileError.message}`);
      }

      if (!targetProfile) {
        logStep("No profile found for requested email", { requestedEmail });
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Nu s-a găsit un profil pentru email-ul dat.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      targetEmail = targetProfile.email;
      targetUserId = targetProfile.id;
      logStep("Admin sync requested", { requestedEmail: targetEmail, targetUserId });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Find customer by email
    logStep("Searching Stripe for email", { targetEmail, isAdminOverride: targetEmail !== user.email });
    const customers = await stripe.customers.list({ email: targetEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found", { targetEmail });
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nu s-a găsit un customer Stripe pentru acest email.',
          subscription_status: 'inactive',
          subscription_type: null,
          subscription_ends_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
          message: 'Nu s-a găsit o subscripție activă pentru acest customer.',
          subscription_status: 'inactive',
          subscription_type: null,
          subscription_ends_at: null,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const subscription = subscriptions.data[0];

    // Stripe can (rarely) return unexpected types; guard against invalid date conversions.
    const periodEndSeconds = Number((subscription as any)?.current_period_end);
    if (!Number.isFinite(periodEndSeconds) || periodEndSeconds <= 0) {
      logStep("Invalid subscription current_period_end", {
        subscriptionId: subscription?.id,
        current_period_end: (subscription as any)?.current_period_end,
        type: typeof (subscription as any)?.current_period_end,
      });

      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Stripe a returnat o dată invalidă pentru perioada subscripției. Te rog încearcă din nou sau contactează suport.',
          subscription_status: 'inactive',
          subscription_type: null,
          subscription_ends_at: null,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription?.id ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const subscriptionEnd = new Date(periodEndSeconds * 1000).toISOString();
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

    // 🔒 BUG FIX #1: Check if user has manual subscription - DON'T overwrite
    const { data: currentProfile, error: currentProfileError } = await supabaseClient
      .from('profiles')
      .select('subscription_status, subscription_ends_at, subscription_type, has_free_access, trial_ends_at')
      .eq('id', targetUserId)
      .maybeSingle();

    if (currentProfileError) {
      logStep("Error reading current profile", { targetUserId, error: currentProfileError });
      throw new Error(`Failed to load current profile: ${currentProfileError.message}`);
    }

    if (!currentProfile) {
      logStep("No profile found for target user id", { targetUserId, targetEmail });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nu s-a găsit profilul utilizatorului în baza de date.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // If user has ACTIVE manual subscription (not expired), create alert instead of overwriting
    if (currentProfile?.subscription_status === 'active' && 
        currentProfile.subscription_ends_at && 
        new Date(currentProfile.subscription_ends_at) > new Date()) {
      
      logStep("⚠️ User has active manual subscription - creating admin alert", {
        currentStatus: currentProfile.subscription_status,
        currentEnds: currentProfile.subscription_ends_at,
        stripeEnds: subscriptionEnd
      });

      // Create admin alert for manual review
      await supabaseClient.from('admin_alerts').insert({
        alert_type: 'SUBSCRIPTION_CONFLICT',
        severity: 'high',
        title: `Subscription Conflict for ${targetEmail}`,
        description: `User has active manual subscription but also has Stripe subscription. Manual review required.`,
        details: {
          userId: targetUserId,
          userEmail: targetEmail,
          currentSubscription: {
            status: currentProfile.subscription_status,
            type: currentProfile.subscription_type,
            endsAt: currentProfile.subscription_ends_at
          },
          stripeSubscription: {
            subscriptionId: subscription.id,
            customerId: customerId,
            type: subscriptionType,
            endsAt: subscriptionEnd
          },
          timestamp: new Date().toISOString()
        }
      });

      logStep("Admin alert created - manual subscription preserved");

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Conflict detectat: ai deja un abonament activ manual. Administratorul va revizui situația.',
          conflict: true,
          data: {
            currentSubscription: currentProfile,
            stripeSubscription: {
              subscription_id: subscription.id,
              subscription_type: subscriptionType,
              subscription_end: subscriptionEnd
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // No conflict - proceed with normal update
    // 🔒 BUG FIX #6: Only clear trial_ends_at if user is NOT in an active trial
    interface ProfileUpdate {
      subscription_status: string;
      subscription_type: string;
      stripe_customer_id: string;
      stripe_subscription_id: string;
      subscription_ends_at: string;
      trial_ends_at?: null;
    }

    const updateData: ProfileUpdate = {
      subscription_status: 'active',
      subscription_type: subscriptionType,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_ends_at: subscriptionEnd,
    };

    // Only clear trial_ends_at if trial is expired or not active
    if (currentProfile?.trial_ends_at) {
      const trialEndDate = new Date(currentProfile.trial_ends_at);
      const now = new Date();
      
      // If trial is expired, clear it
      if (trialEndDate < now) {
        updateData.trial_ends_at = null;
        logStep("Trial expired - clearing trial_ends_at", { trial_ends_at: currentProfile.trial_ends_at });
      } else {
        // Trial is still active - keep it
        logStep("Trial still active - preserving trial_ends_at", { 
          trial_ends_at: currentProfile.trial_ends_at,
          days_remaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        });
      }
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId);

    if (updateError) {
      logStep("Error updating profile", { error: updateError });
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    logStep("Profile updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscripția a fost sincronizată cu succes!',
        subscription_status: 'active',
        subscription_type: subscriptionType,
        subscription_ends_at: subscriptionEnd,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
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

    // Keep status 200 to avoid frontend FunctionsHttpError crashes; surface error via payload.
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        message: 'Eroare la sincronizarea subscripției. Încearcă din nou.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
