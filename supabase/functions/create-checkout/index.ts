import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔒 VALIDARE INPUT SCHEMA
const CreateCheckoutInputSchema = z.object({
  priceId: z.string()
    .min(1, "Price ID lipsește")
    .startsWith("price_", "Price ID trebuie să înceapă cu 'price_'")
    .max(100, "Price ID invalid (prea lung)")
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  
  let user = null;

  try {
    logStep("Function started");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const rawBody = await req.json();
    
    // 🔒 VALIDARE INPUT CU ZOD
    const validationResult = CreateCheckoutInputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      logStep("❌ Input invalid", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Date de intrare invalide", 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { priceId } = validationResult.data;
    logStep("Price ID received", { priceId });

    // 🔒 SECURITY: Only allow the official YANA subscription price (49 RON)
    const ALLOWED_YANA_PRICE = 'price_1Sd3AHBu3m83VcDAFa7QcuLM';
    if (priceId !== ALLOWED_YANA_PRICE) {
      logStep("❌ REJECTED: Invalid price ID attempted", { priceId, expected: ALLOWED_YANA_PRICE });
      return new Response(
        JSON.stringify({ error: 'Preț invalid pentru abonament YANA. Doar abonamentul de 49 RON este disponibil.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Create checkout session with billing address and tax ID collection
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      customer_update: customerId ? {
        address: 'auto',
        name: 'auto',
      } : undefined,
      success_url: `${req.headers.get('origin')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    // 🔒 AUDIT FIX #1: Log checkout initiation
    const { error: auditError } = await supabaseClient.rpc('log_audit_event', {
      p_action_type: 'SUBSCRIPTION_CHECKOUT_INITIATED',
      p_table_name: 'checkout_sessions',
      p_record_id: null,
      p_metadata: {
        stripe_session_id: session.id,
        stripe_price_id: priceId,
        user_id: user.id,
        user_email: user.email,
        session_url: session.url,
        timestamp: new Date().toISOString()
      }
    });
    
    if (auditError) logStep("⚠️ Audit log failed", { error: auditError });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // 🔒 AUDIT FIX #1: Log checkout errors
    const { error: auditError } = await supabaseClient.rpc('log_audit_event', {
      p_action_type: 'SUBSCRIPTION_CHECKOUT_ERROR',
      p_table_name: 'checkout_sessions',
      p_record_id: null,
      p_metadata: {
        error_message: errorMessage,
        user_id: user?.id || null,
        timestamp: new Date().toISOString()
      }
    });
    
    if (auditError) logStep("⚠️ Failed to log checkout error", { auditError });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
