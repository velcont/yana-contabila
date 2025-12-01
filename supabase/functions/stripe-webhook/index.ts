import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
  timeout: 10000, // 🔒 BUG FIX #9: 10 second timeout for all Stripe API calls
  maxNetworkRetries: 2,
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

    // 🔒 SECURITY FIX #6: Prevent replay attacks
    const eventAge = Math.floor(Date.now() / 1000) - event.created;
    if (eventAge > 300) { // 5 minutes
      console.error(`⚠️ Webhook event too old: ${eventAge} seconds`);
      return new Response(JSON.stringify({ 
        error: "Webhook event too old - possible replay attack" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      });
    }

    console.log("Webhook event type:", event.type, "age:", eventAge, "seconds");

    // Handle subscription invoice payments
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Skip if not a subscription invoice
      if (!invoice.subscription) {
        console.log("Invoice not associated with subscription, skipping");
        return new Response(JSON.stringify({ received: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        });
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 🔒 SECURITY FIX 1: Check if invoice already processed to prevent duplicates
      const { data: existingPayment } = await supabaseClient
        .from('subscription_payments')
        .select('id')
        .eq('stripe_invoice_id', invoice.id)
        .single();

      if (existingPayment) {
        console.log(`⚠️ Invoice ${invoice.id} already processed, skipping to prevent duplicate`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        });
      }

      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );

      // Find user by customer email
      const customerEmail = invoice.customer_email;
      if (!customerEmail) {
        console.error("No customer email found in invoice");
        return new Response("No email", { status: 400 });
      }

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id, email, subscription_type')
        .eq('email', customerEmail)
        .single();

      if (profile) {
        // 🔒 BUG FIX #3: Use UPSERT with ON CONFLICT to prevent race condition duplicates
        const { error: paymentError } = await supabaseClient.from('subscription_payments').upsert({
          user_id: profile.id,
          stripe_subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount_paid_cents: invoice.amount_paid,
          currency: invoice.currency?.toUpperCase() || 'RON',
          subscription_type: profile.subscription_type || 'entrepreneur',
          period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          payment_date: new Date(invoice.created * 1000).toISOString(),
          status: 'paid',
          metadata: {
            invoice_number: invoice.number,
            hosted_invoice_url: invoice.hosted_invoice_url
          }
        }, {
          onConflict: 'stripe_invoice_id',
          ignoreDuplicates: true
        });

        if (paymentError) {
          console.error("❌ Failed to record subscription payment:", paymentError);
          throw new Error(`Payment recording failed: ${paymentError.message}`);
        }

        // Log audit event
        await supabaseClient.from('audit_logs').insert({
          user_id: profile.id,
          user_email: profile.email,
          action_type: 'SUBSCRIPTION_PAYMENT_RECEIVED',
          table_name: 'subscription_payments',
          metadata: {
            amount_cents: invoice.amount_paid,
            subscription_id: subscription.id,
            invoice_id: invoice.id,
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString()
          }
        });

        console.log(`✅ Recorded subscription payment for user ${profile.id}`);
      }

      // 🔒 BUG FIX #12: Audit log pentru plată subscription
      if (profile) {
        await supabaseClient.rpc('log_audit_event', {
          p_action_type: 'STRIPE_SUBSCRIPTION_PAYMENT',
          p_table_name: 'subscription_payments',
          p_record_id: null,
          p_metadata: {
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscription.id,
            amount_paid_cents: invoice.amount_paid,
            user_id: profile.id,
            user_email: profile.email,
            event_id: event.id
          }
        }).then(({ error }) => {
          if (error) console.error("⚠️ Audit log failed:", error);
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 🔒 SECURITY FIX 2: Check if checkout session already processed to prevent duplicates
      const { data: existingPurchase } = await supabaseClient
        .from('credits_purchases')
        .select('id, credits_added, purchase_date')
        .eq('stripe_checkout_session_id', session.id)
        .single();

      if (existingPurchase) {
        console.log(`⚠️ Checkout session ${session.id} already processed on ${existingPurchase.purchase_date}, skipping to prevent duplicate credits`);
        return new Response(JSON.stringify({ 
          received: true, 
          duplicate: true,
          credits_already_added: existingPurchase.credits_added 
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        });
      }

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
      
      // Map price IDs to credit amounts and package names
      const creditPackages: Record<string, { credits: number; name: string }> = {
        "price_1SIsUMBu3m83VcDA5X8MPfrS": { credits: 1000, name: "Starter (10 lei)" },
        "price_1SIsUPBu3m83VcDAqCC955qF": { credits: 2500, name: "Professional (20 lei)" },
        "price_1SIsUQBu3m83VcDAQUwk4CZZ": { credits: 5000, name: "Business (40 lei)" },
        "price_1SIsUQBu3m83VcDAykzaXTeT": { credits: 10000, name: "Enterprise (70 lei)" },
      };

      const amountPaid = session.amount_total || 0;
      
      // Use priceId to determine credits (primary method)
      let creditsToAdd = 0;
      let packageName = 'Unknown Package';
      
      if (priceId && creditPackages[priceId]) {
        creditsToAdd = creditPackages[priceId].credits;
        packageName = creditPackages[priceId].name;
        console.log(`✅ Matched priceId ${priceId} to ${creditsToAdd} credits`);
      } else {
        // 🔒 SECURITY FIX 3: Unknown priceId - create alert and use safe fallback
        console.error(`🔴 CRITICAL: Unknown priceId ${priceId} for session ${session.id}, amount ${amountPaid}`);
        
        // Create admin alert for manual review
        await supabaseClient.from('admin_alerts').insert({
          alert_type: 'UNKNOWN_PRICE_ID',
          severity: 'critical',
          title: `Unknown Price ID in Payment: ${priceId}`,
          description: `A payment was made with an unrecognized price ID. Manual review required.`,
          details: {
            priceId,
            sessionId: session.id,
            amountPaid,
            customerEmail: session.customer_email || session.customer_details?.email,
            timestamp: new Date().toISOString()
          }
        });
        
        // Use fallback with clear logging
        console.warn(`⚠️ Using FALLBACK logic based on amount: ${amountPaid} cents`);
        if (amountPaid >= 7000) {
          creditsToAdd = 10000;
          packageName = 'Enterprise (70 lei) - FALLBACK';
        } else if (amountPaid >= 4000) {
          creditsToAdd = 5000;
          packageName = 'Business (40 lei) - FALLBACK';
        } else if (amountPaid >= 2000) {
          creditsToAdd = 2500;
          packageName = 'Professional (20 lei) - FALLBACK';
        } else if (amountPaid >= 1000) {
          creditsToAdd = 1000;
          packageName = 'Starter (10 lei) - FALLBACK';
        } else {
          // Amount too low - create alert
          console.error(`🔴 Amount ${amountPaid} is too low for any package`);
          await supabaseClient.from('admin_alerts').insert({
            alert_type: 'INVALID_PAYMENT_AMOUNT',
            severity: 'critical',
            title: `Payment Amount Too Low: ${amountPaid} cents`,
            description: `Payment received but amount doesn't match any package. No credits added.`,
            details: {
              priceId,
              sessionId: session.id,
              amountPaid,
              customerEmail: session.customer_email || session.customer_details?.email
            }
          });
          
          return new Response(JSON.stringify({ 
            received: true, 
            error: 'Invalid payment amount',
            requires_manual_review: true 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      // 🔒 BUG FIX #5: First record purchase, then update budget (atomic order)
      // This prevents budget being updated if purchase recording fails
      
      // Step 1: Record the purchase first (using UPSERT to prevent duplicates)
      const { error: purchaseError } = await supabaseClient.from('credits_purchases').upsert({
        user_id: user.id,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_checkout_session_id: session.id,
        amount_paid_cents: amountPaid,
        credits_added: creditsToAdd,
        package_name: packageName,
        purchase_date: new Date().toISOString(),
        metadata: {
          customer_email: customerEmail,
          session_mode: session.mode
        }
      }, {
        onConflict: 'stripe_checkout_session_id',
        ignoreDuplicates: true
      });

      if (purchaseError) {
        console.error("❌ Purchase recording failed:", purchaseError);
        
        // Create critical alert
        await supabaseClient.from('admin_alerts').insert({
          alert_type: 'PURCHASE_RECORDING_FAILED',
          severity: 'critical',
          title: `Failed to Record Purchase for ${customerEmail}`,
          description: `Purchase recording failed. No budget was updated (atomic safety).`,
          details: {
            sessionId: session.id,
            userId: user.id,
            customerEmail,
            amountPaid,
            creditsToAdd,
            error: purchaseError.message
          }
        });
        
        throw new Error(`Purchase recording failed: ${purchaseError.message}`);
      }

      // Step 2: Only after successful purchase recording, update budget
      const { data: existingBudget } = await supabaseClient
        .from("ai_budget_limits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      const oldBudget = existingBudget?.monthly_budget_cents || 0;
      const newBudget = oldBudget + creditsToAdd;

      if (existingBudget) {
        // Add to existing budget
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
        // Create new budget
        const { error: budgetError } = await supabaseClient
          .from("ai_budget_limits")
          .insert({
            user_id: user.id,
            monthly_budget_cents: creditsToAdd,
            alert_at_percent: 80,
            is_active: true,
          })
          .select()
          .single();

        if (budgetError) {
          console.error("❌ Failed to create budget:", budgetError);
          throw new Error(`Budget creation failed: ${budgetError.message}`);
        }
      }

      console.log(`✅ Successfully added ${creditsToAdd} credits to ${customerEmail}`);

      // 🔒 BUG FIX #12: Enhanced audit log pentru achiziție credite
      await supabaseClient.rpc('log_audit_event', {
        p_action_type: 'STRIPE_CREDITS_PURCHASE',
        p_table_name: 'credits_purchases',
        p_record_id: null,
        p_metadata: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          amount_paid_cents: amountPaid,
          credits_added: creditsToAdd,
          package_name: packageName,
          old_budget_cents: oldBudget,
          new_budget_cents: newBudget,
          user_email: customerEmail,
          event_id: event.id
        }
      }).then(({ error }) => {
        if (error) console.error("⚠️ Audit log failed:", error);
      });

      // 🔒 BUG FIX #8: Email with comprehensive error handling and admin alerts
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
        
        if (!resendApiKey) {
          console.warn("⚠️ RESEND_API_KEY not configured - creating admin alert");
          
          await supabaseClient.from('admin_alerts').insert({
            alert_type: 'EMAIL_NOT_CONFIGURED',
            severity: 'medium',
            title: `Email Not Configured - Credits Purchase by ${customerEmail}`,
            description: `User purchased ${creditsToAdd} credits but email cannot be sent (RESEND_API_KEY missing).`,
            details: {
              userId: user.id,
              customerEmail,
              creditsAdded: creditsToAdd,
              amountPaid
            }
          });
        } else {
          const emailResponse = await fetch("https://api.resend.com/emails", {
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
                  <li><strong>Credite adăugate:</strong> ${creditsToAdd / 100} lei</li>
                  <li><strong>Sumă plătită:</strong> ${(session.amount_total || 0) / 100} ${session.currency?.toUpperCase()}</li>
                  <li><strong>Pachet:</strong> ${packageName}</li>
                </ul>
                <p>Poți folosi creditele imediat!</p>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Resend API error: ${errorText}`);
          }
          
          console.log("✅ Confirmation email sent to:", customerEmail);
        }
      } catch (emailError) {
        console.error("❌ Email send failed:", emailError);
        
        // Create admin alert for failed email (DON'T block purchase)
        await supabaseClient.from('admin_alerts').insert({
          alert_type: 'EMAIL_SEND_FAILED',
          severity: 'medium',
          title: `Email Failed - Credits Purchase by ${customerEmail}`,
          description: `Credits added successfully but email notification failed.`,
          details: {
            userId: user.id,
            customerEmail,
            creditsAdded: creditsToAdd,
            amountPaid,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }
        });
        
        console.log("⚠️ Purchase completed despite email failure");
      }

      // Log success with audit trail
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        user_email: customerEmail,
        action_type: 'CREDITS_PURCHASE_COMPLETED',
        table_name: 'credits_purchases',
        metadata: {
          session_id: session.id,
          payment_intent_id: session.payment_intent,
          amount_paid_cents: amountPaid,
          credits_added: creditsToAdd,
          package_name: packageName,
          old_budget: oldBudget,
          new_budget: newBudget,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ Successfully processed payment for user ${user.id}: ${creditsToAdd} credits added`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    
    // 🔒 BUG FIX #12: Audit log pentru erori webhook critice
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await supabaseClient.rpc('log_audit_event', {
        p_action_type: 'STRIPE_WEBHOOK_ERROR',
        p_table_name: 'stripe_webhooks',
        p_record_id: null,
        p_metadata: {
          error_message: (error as Error).message,
          error_stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error("⚠️ Failed to log webhook error to audit:", auditError);
    }
    
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
