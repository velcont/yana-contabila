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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("🔍 Verifying purchase for session:", sessionId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("✅ Session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
    });

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment not completed",
          status: session.payment_status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check if already processed
    const { data: existingPurchase } = await supabaseClient
      .from("credits_purchases")
      .select("id, credits_added")
      .eq("stripe_checkout_session_id", session.id)
      .single();

    if (existingPurchase) {
      console.log("✅ Purchase already processed:", existingPurchase);
      return new Response(
        JSON.stringify({
          success: true,
          already_processed: true,
          credits_added: existingPurchase.credits_added,
          message: "Creditele au fost deja adăugate",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get customer email
    const customerEmail = session.customer_email || session.customer_details?.email;
    if (!customerEmail) {
      throw new Error("No customer email found");
    }

    // Find user by email
    const { data: userData } = await supabaseClient.auth.admin.listUsers();
    const user = userData?.users.find((u) => u.email === customerEmail);

    if (!user) {
      throw new Error(`User not found for email: ${customerEmail}`);
    }

    console.log("✅ User found:", user.id);

    // Get line items to determine credits
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    // Map price IDs to credit amounts
    const creditPackages: Record<string, { credits: number; name: string }> = {
      "price_1SIsUMBu3m83VcDA5X8MPfrS": { credits: 1000, name: "Starter (10 lei)" },
      "price_1SIsUPBu3m83VcDAqCC955qF": { credits: 2500, name: "Professional (20 lei)" },
      "price_1SIsUQBu3m83VcDAQUwk4CZZ": { credits: 5000, name: "Business (40 lei)" },
      "price_1SIsUQBu3m83VcDAykzaXTeT": { credits: 10000, name: "Enterprise (70 lei)" },
    };

    const amountPaid = session.amount_total || 0;
    let creditsToAdd = 0;
    let packageName = "Unknown Package";

    if (priceId && creditPackages[priceId]) {
      creditsToAdd = creditPackages[priceId].credits;
      packageName = creditPackages[priceId].name;
      console.log(`✅ Matched priceId ${priceId} to ${creditsToAdd} credits`);
    } else {
      console.warn("⚠️ Unknown priceId, using fallback based on amount");
      if (amountPaid >= 7000) {
        creditsToAdd = 10000;
        packageName = "Enterprise (70 lei) - FALLBACK";
      } else if (amountPaid >= 4000) {
        creditsToAdd = 5000;
        packageName = "Business (40 lei) - FALLBACK";
      } else if (amountPaid >= 2000) {
        creditsToAdd = 2500;
        packageName = "Professional (20 lei) - FALLBACK";
      } else if (amountPaid >= 1000) {
        creditsToAdd = 1000;
        packageName = "Starter (10 lei) - FALLBACK";
      } else {
        throw new Error(`Amount ${amountPaid} is too low for any package`);
      }
    }

    console.log(`💰 Adding ${creditsToAdd} credits to user ${user.id}`);

    // Record the purchase
    const { error: purchaseError } = await supabaseClient
      .from("credits_purchases")
      .upsert(
        {
          user_id: user.id,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
          amount_paid_cents: amountPaid,
          credits_added: creditsToAdd,
          package_name: packageName,
          purchase_date: new Date().toISOString(),
          metadata: {
            customer_email: customerEmail,
            session_mode: session.mode,
            verified_by: "verify-credits-purchase",
          },
        },
        {
          onConflict: "stripe_checkout_session_id",
          ignoreDuplicates: true,
        }
      );

    if (purchaseError) {
      console.error("❌ Purchase recording failed:", purchaseError);
      throw new Error(`Purchase recording failed: ${purchaseError.message}`);
    }

    // Update budget
    const { data: existingBudget } = await supabaseClient
      .from("ai_budget_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const oldBudget = existingBudget?.monthly_budget_cents || 0;
    const newBudget = oldBudget + creditsToAdd;

    if (existingBudget) {
      const { error: budgetError } = await supabaseClient
        .from("ai_budget_limits")
        .update({
          monthly_budget_cents: newBudget,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBudget.id);

      if (budgetError) {
        console.error("❌ Failed to update budget:", budgetError);
        throw new Error(`Budget update failed: ${budgetError.message}`);
      }
    } else {
      const { error: budgetError } = await supabaseClient
        .from("ai_budget_limits")
        .insert({
          user_id: user.id,
          monthly_budget_cents: creditsToAdd,
          alert_at_percent: 80,
          is_active: true,
        });

      if (budgetError) {
        console.error("❌ Failed to create budget:", budgetError);
        throw new Error(`Budget creation failed: ${budgetError.message}`);
      }
    }

    console.log(`✅ Successfully added ${creditsToAdd} credits to ${customerEmail}`);
    console.log(`📊 Budget: ${oldBudget} → ${newBudget} cents`);

    // Log audit event
    await supabaseClient.rpc("log_audit_event", {
      p_action_type: "CREDITS_VERIFIED_AND_ADDED",
      p_table_name: "credits_purchases",
      p_record_id: null,
      p_metadata: {
        session_id: session.id,
        user_id: user.id,
        credits_added: creditsToAdd,
        old_budget: oldBudget,
        new_budget: newBudget,
        verified_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        credits_added: creditsToAdd,
        new_budget: newBudget,
        package_name: packageName,
        message: `${creditsToAdd} credite adăugate cu succes!`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error verifying purchase:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
