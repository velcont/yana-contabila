import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔒 SECURITY: Rate limiting by IP address
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: canProceed } = await supabase.rpc('check_rate_limit', {
    p_user_id: clientIp,
    p_endpoint: 'notify-payment-admin',
    p_max_requests: 20 // 20 payment notifications per minute
  });

  if (!canProceed) {
    logStep("Rate limit exceeded", { clientIp });
    return new Response(
      JSON.stringify({ error: 'Too many payment notification requests' }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    logStep("Function started");

    const { sessionId, paymentType } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    // 🔒 SECURITY: Detectează ID-uri manuale/recovery care nu există în Stripe
    if (sessionId.includes('manual') || sessionId.includes('recovery') || sessionId.includes('_fix_')) {
      logStep("⚠️ REJECTED: Manual/recovery ID detected", { sessionId });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Acest ID de plată este manual și nu poate fi folosit pentru trimitere automată de email. Te rugăm să trimiți emailul manual."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate Stripe ID format
    let isValidStripeId = false;
    
    if (paymentType === 'subscription') {
      isValidStripeId = sessionId.startsWith('in_');
    } else {
      // Credits: cs_test_ or cs_live_
      isValidStripeId = sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_');
    }
    
    if (!isValidStripeId) {
      logStep("⚠️ REJECTED: Invalid Stripe ID format", { sessionId, paymentType });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `ID Stripe invalid: ${paymentType === 'subscription' ? 'trebuie să înceapă cu "in_"' : 'trebuie să înceapă cu "cs_test_" sau "cs_live_"'}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Processing session", { sessionId, paymentType });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let emailDetails: any;
    let customer: any;

    if (paymentType === 'subscription') {
      // Handle subscription invoice
      const invoice = await stripe.invoices.retrieve(sessionId);
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      customer = await stripe.customers.retrieve(invoice.customer as string);
      
      emailDetails = {
        type: 'Abonament Recurent',
        amount: (invoice.amount_paid / 100).toFixed(2),
        currency: invoice.currency?.toUpperCase() || 'RON',
        customer_email: invoice.customer_email,
        customer_name: (customer as any).name || invoice.customer_email,
        period: `${new Date(subscription.current_period_start * 1000).toLocaleDateString('ro-RO')} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString('ro-RO')}`,
        invoice_url: invoice.hosted_invoice_url,
        reference: invoice.id
      };

      logStep("Invoice retrieved", { 
        customerId: customer.id,
        amount: emailDetails.amount,
        currency: emailDetails.currency
      });
    } else {
      // Handle credits checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer']
      });

      customer = session.customer as Stripe.Customer;
      const amount = (session.amount_total || 0) / 100;
      const currency = session.currency?.toUpperCase() || 'RON';

      emailDetails = {
        type: 'Credite AI',
        amount: amount.toFixed(2),
        currency: currency,
        customer_email: customer.email,
        customer_name: customer.name || customer.email,
        reference: session.id
      };

      logStep("Session retrieved", { 
        customerId: customer.id,
        amount,
        currency
      });
    }

    // Get billing details
    const billingDetails = (customer as any).address;
    const taxId = (customer as any).tax_ids?.data?.[0]?.value;
    const phone = (customer as any).phone;

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .section { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #4F46E5; }
            .label { font-weight: bold; color: #4F46E5; margin-right: 10px; }
            .value { color: #333; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 Plată Nouă Primită!</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Yana Contabilă - Notificare Automată</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2 style="margin-top: 0; color: #4F46E5;">💰 Detalii Plată</h2>
                <p><span class="label">Tip:</span> <span class="value">${emailDetails.type}</span></p>
                ${emailDetails.period ? `<p><span class="label">Perioadă:</span> <span class="value">${emailDetails.period}</span></p>` : ''}
                <p><span class="label">Sumă:</span> <span class="amount">${emailDetails.amount} ${emailDetails.currency}</span></p>
                <p><span class="label">Data:</span> <span class="value">${new Date().toLocaleString('ro-RO')}</span></p>
              </div>

              <div class="section">
                <h2 style="margin-top: 0; color: #4F46E5;">👤 Date Client</h2>
                <p><span class="label">Nume:</span> <span class="value">${emailDetails.customer_name || 'N/A'}</span></p>
                <p><span class="label">Email:</span> <span class="value">${emailDetails.customer_email || 'N/A'}</span></p>
                ${phone ? `<p><span class="label">Telefon:</span> <span class="value">${phone}</span></p>` : ''}
                ${taxId ? `<p><span class="label">CIF:</span> <span class="value highlight">${taxId}</span> <strong>(Persoană Juridică)</strong></p>` : '<p><span class="value">Persoană Fizică (fără CIF)</span></p>'}
              </div>

              ${billingDetails ? `
              <div class="section">
                <h2 style="margin-top: 0; color: #4F46E5;">📍 Adresă Facturare</h2>
                <p><span class="label">Țară:</span> <span class="value">${billingDetails.country || 'N/A'}</span></p>
                <p><span class="label">Oraș:</span> <span class="value">${billingDetails.city || 'N/A'}</span></p>
                <p><span class="label">Cod Poștal:</span> <span class="value">${billingDetails.postal_code || 'N/A'}</span></p>
                <p><span class="label">Adresă:</span> <span class="value">${billingDetails.line1 || 'N/A'}</span></p>
                ${billingDetails.line2 ? `<p><span class="value">${billingDetails.line2}</span></p>` : ''}
              </div>
              ` : ''}

              <div class="section">
                <h2 style="margin-top: 0; color: #4F46E5;">🔗 Referințe Stripe</h2>
                <p><span class="label">Referință:</span> <code>${emailDetails.reference}</code></p>
                <p><span class="label">Customer ID:</span> <code>${(customer as any).id}</code></p>
                ${emailDetails.invoice_url ? `<p><a href="${emailDetails.invoice_url}" style="color: #4F46E5;">Vezi factura Stripe</a></p>` : ''}
              </div>

              <div class="section" style="background: #fef3c7; border-left-color: #f59e0b;">
                <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Acțiune Necesară</h3>
                <p>Trebuie să emiți factura manual în SmartBill cu datele de mai sus.</p>
                <p><strong>Subscripția/Creditele au fost deja activate automat în aplicație.</strong></p>
              </div>
            </div>

            <div class="footer">
              <p>Acesta este un email automat generat de sistemul Yana Contabilă</p>
              <p>Pentru suport: office@velcont.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend with domain fallback
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const primaryFrom = "Yana Contabilă <notificari@yanacontabila.ro>";
    const fallbackFrom = "Yana Contabilă <onboarding@resend.dev>";

    let emailId: string | undefined;
    let usedFallback = false;

    const sendWithFrom = async (from: string) => {
      return await resend.emails.send({
        from,
        to: ["office@velcont.com"],
        subject: `💰 Plată Nouă: ${emailDetails.amount} ${emailDetails.currency} - ${emailDetails.customer_name || emailDetails.customer_email}`,
        html: emailHtml,
      });
    };

    let { data: emailData, error: emailError } = await sendWithFrom(primaryFrom);

    if (emailError) {
      logStep("Email error", { error: emailError });

      const isDomainNotVerified =
        (emailError as any)?.statusCode === 403 &&
        String((emailError as any)?.message || "")
          .toLowerCase()
          .includes("domain is not verified");

      if (isDomainNotVerified) {
        logStep("Retrying with fallback domain");
        const retry = await sendWithFrom(fallbackFrom);
        if (!retry.error) {
          emailId = retry.data?.id;
          usedFallback = true;
          logStep("Email sent successfully with fallback", { emailId });
        } else {
          logStep("Fallback email error", { error: retry.error });
          return new Response(
            JSON.stringify({
              success: false,
              message:
                "Eroare la trimiterea emailului (domeniu nevalidat). Te rugăm validează domeniul sau folosește adresa implicită Resend.",
              hint: "Verifică domeniul pe https://resend.com/domains sau folosește from: onboarding@resend.dev",
              error: retry.error,
              emailPreview: emailHtml,
            details: {
              sessionId,
              customerId: (customer as any).id,
              amount: emailDetails.amount,
              currency: emailDetails.currency,
            },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Eroare la trimiterea emailului",
            error: emailError,
            emailPreview: emailHtml,
            details: {
              sessionId,
              customerId: (customer as any).id,
              amount: emailDetails.amount,
              currency: emailDetails.currency,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }
    } else {
      emailId = emailData?.id;
      logStep("Email sent successfully", { emailId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email trimis cu succes către office@velcont.com${usedFallback ? " (folosind domeniul fallback)" : ""}`,
        emailId,
        usedFallback,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
