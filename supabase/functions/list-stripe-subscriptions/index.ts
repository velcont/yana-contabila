import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-STRIPE-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

// Price ID to plan name mapping
const PRICE_NAMES: Record<string, { name: string; amount: number }> = {
  'price_1Sd3AHBu3m83VcDAFa7QcuLM': { name: 'Antreprenor', amount: 4900 },
  'price_1SDOnABu3m83VcDAxowuvmz8': { name: 'Cabinet Contabil', amount: 19900 },
  'price_1SDOmaBu3m83VcDA2uFPJvkZ': { name: 'Cabinet Contabil', amount: 19900 },
  'price_1SDOmpBu3m83VcDAsd4CWQDH': { name: 'Cabinet Contabil Premium', amount: 33000 },
  'price_1Qyy55Bu3m83VcDA8STZp26f': { name: 'Antreprenor', amount: 4900 },
  'price_1SLWzFBu3m83VcDAgP1veppc': { name: 'Cabinet Contabil', amount: 19900 },
  'price_1SLWzEBu3m83VcDAfHVcQupt': { name: 'Antreprenor', amount: 4900 },
  'price_1SHJt7Bu3m83VcDAJryrpFfB': { name: 'Cabinet Contabil (EUR)', amount: 4000 },
  'price_1RU6D4Bu3m83VcDALz87js50': { name: 'Test Plan', amount: 100 },
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

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error('Admin access required');
    }

    logStep("Admin verified", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
      timeout: 30000,
      maxNetworkRetries: 2,
    });

    // Fetch all subscriptions (all statuses)
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
    });

    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    interface EnrichedSubscription {
      id: string;
      customer_id: string;
      customer_email: string | null;
      customer_name: string | null;
      status: string;
      price_id: string;
      plan_name: string;
      amount_cents: number;
      currency: string;
      current_period_start: string;
      current_period_end: string;
      created_at: string;
      cancel_at_period_end: boolean;
    }

    // Build the response with enriched data
    const enrichedSubscriptions: EnrichedSubscription[] = subscriptions.data.map((sub: Stripe.Subscription) => {
      const customer = sub.customer as Stripe.Customer;
      const priceId = sub.items.data[0]?.price?.id || '';
      const priceInfo = PRICE_NAMES[priceId] || { name: 'Plan Necunoscut', amount: 0 };
      
      return {
        id: sub.id,
        customer_id: typeof sub.customer === 'string' ? sub.customer : customer.id,
        customer_email: customer?.email || null,
        customer_name: customer?.name || null,
        status: sub.status,
        price_id: priceId,
        plan_name: priceInfo.name,
        amount_cents: priceInfo.amount,
        currency: 'RON',
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        created_at: new Date(sub.created * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      };
    });

    // Sort by status (active first, then by date)
    enrichedSubscriptions.sort((a: EnrichedSubscription, b: EnrichedSubscription) => {
      const statusOrder: Record<string, number> = { 
        'active': 0, 
        'past_due': 1, 
        'trialing': 2, 
        'incomplete': 3, 
        'canceled': 4,
        'incomplete_expired': 5,
        'unpaid': 6
      };
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Calculate stats
    const stats = {
      total: enrichedSubscriptions.length,
      active: enrichedSubscriptions.filter((s: EnrichedSubscription) => s.status === 'active').length,
      past_due: enrichedSubscriptions.filter((s: EnrichedSubscription) => s.status === 'past_due').length,
      canceled: enrichedSubscriptions.filter((s: EnrichedSubscription) => s.status === 'canceled').length,
      total_mrr: enrichedSubscriptions
        .filter((s: EnrichedSubscription) => s.status === 'active')
        .reduce((sum: number, s: EnrichedSubscription) => sum + s.amount_cents, 0),
    };

    logStep("Returning subscriptions", { stats });

    return new Response(
      JSON.stringify({
        success: true,
        subscriptions: enrichedSubscriptions,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
