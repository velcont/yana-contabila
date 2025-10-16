import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("No Stripe signature found");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    console.log("Webhook event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        console.error("No customer email found in session");
        return new Response("No email", { status: 400 });
      }

      // Find user by email
      const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
      const user = userData?.users.find(u => u.email === customerEmail);
      
      if (!user) {
        console.error("User not found for email:", customerEmail);
        return new Response("User not found", { status: 404 });
      }

      // Get line items to determine credits amount
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      
      // Map price IDs to credit amounts (in cents)
      const creditPackages: Record<string, number> = {
        "price_1SIsUMBu3m83VcDA5X8MPfrS": 1000,   // 10 lei = 1000 credits
        "price_1SIsUPBu3m83VcDAqCC955qF": 2500,   // 20 lei = 2500 credits  
        "price_1SIsUQBu3m83VcDAQUwk4CZZ": 5000,   // 40 lei = 5000 credits
        "price_1SIsUQBu3m83VcDAykzaXTeT": 10000,  // 70 lei = 10000 credits
      };

      const creditsToAdd = creditPackages[priceId || ""] || 1000;

      // Update or insert budget limit
      const { data: existingBudget } = await supabaseClient
        .from("ai_budget_limits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (existingBudget) {
        // Add to existing budget
        await supabaseClient
          .from("ai_budget_limits")
          .update({
            monthly_budget_cents: existingBudget.monthly_budget_cents + creditsToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBudget.id);
      } else {
        // Create new budget
        await supabaseClient
          .from("ai_budget_limits")
          .insert({
            user_id: user.id,
            monthly_budget_cents: creditsToAdd,
            alert_at_percent: 80,
            is_active: true,
          });
      }

      // Log the purchase
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        user_email: customerEmail,
        action_type: "CREDIT_PURCHASE",
        table_name: "ai_budget_limits",
        metadata: {
          stripe_session_id: session.id,
          credits_added: creditsToAdd,
          amount_paid: session.amount_total,
          currency: session.currency,
        },
      });

      // Send confirmation email via Resend API
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
        
        if (resendApiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [customerEmail],
              subject: "✅ Credite AI Adăugate cu Succes",
              html: `
                <h1>Bună!</h1>
                <p>Credite AI au fost adăugate în contul tău:</p>
                <ul>
                  <li><strong>Credite adăugate:</strong> ${creditsToAdd / 100} lei (${creditsToAdd} cenți)</li>
                  <li><strong>Sumă plătită:</strong> ${(session.amount_total || 0) / 100} ${session.currency?.toUpperCase()}</li>
                </ul>
                <p>Poți folosi creditele imediat pentru:</p>
                <ul>
                  <li>Analize de bilanț AI</li>
                  <li>Predicții financiare</li>
                  <li>Chat AI strategic</li>
                  <li>Consilier strategic AI</li>
                </ul>
                <p>Mulțumim pentru încredere!</p>
              `,
            }),
          });
          console.log("Confirmation email sent to:", customerEmail);
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the webhook if email fails
      }

      console.log(`✅ Added ${creditsToAdd} credits for user ${user.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
