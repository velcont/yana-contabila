import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const getEmailHtml = (userName: string, loginUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yana Strategică - Anunț</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0 48px;">
    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 40px 20px 20px; line-height: 1.3;">
      🎯 Noutate MAJORĂ: Yana Strategică
    </h1>
    
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Bună ${userName},
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Ți-am pregătit ceva <strong>revoluționar</strong> - un consultant strategic AI care 
      nu se joacă cu vorbe goale. Este timpul să treci de la planuri vagi la strategii concrete.
    </p>

    <div style="background-color: #f0f7ff; border: 2px solid #3b82f6; border-radius: 8px; margin: 24px 20px; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 0 0 15px;">
        💥 Ce face Yana Strategică diferit?
      </h2>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ ZERO bullshit</strong> - Cere date financiare concrete de la prima întrebare
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Strategii agresive</strong> - Război de preț, campanii FUD, război de talente
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Planuri executabile</strong> - Cu bugete exacte, termene clare și KPIs măsurabili
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Orientat pe CÂȘTIG</strong> - Nu pe mulțumirea ta, ci pe eliminarea concurenței
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 30px 20px 15px;">
      📊 Ce îți cere Yana?
    </h2>
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Pentru a-ți da strategii reale (nu sfaturi generice), are nevoie de:
    </p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• Cifra de afaceri ultimii 2-3 ani</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• Profit net și marje</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• Cash disponibil pentru războaie strategice</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• CAC și LTV pe canale</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• Top 3 concurenți și punctele lor slabe</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">• Bugetul pe care ești dispus să-l investești în dominare</p>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 30px 20px 15px;">
      🎯 Ce primești în schimb?
    </h2>
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Strategii concrete cu:
    </p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">📋 <strong>Pași exacti cu deadline-uri</strong> (Săptămâna 1, Luna 2, etc.)</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">💰 <strong>Bugete calculate</strong> din datele tale reale</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">📊 <strong>KPIs măsurabili</strong> (nu "îmbunătățește vânzările")</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">⚠️ <strong>Gestionare riscuri</strong> cu soluții concrete</p>

    <div style="text-align: center; margin: 32px 20px;">
      <a href="${loginUrl}" style="background-color: #3b82f6; border-radius: 6px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; padding: 16px 32px;">
        🚀 Încearcă Yana Strategică ACUM
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <div style="color: #dc2626; font-size: 15px; line-height: 24px; margin: 16px 20px; padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      ⚠️ <strong>ATENȚIE:</strong> Yana nu este pentru toată lumea. Dacă vrei sfaturi generice și 
      motivaționale, nu este instrumentul potrivit. Dacă vrei strategii brutale care funcționează 
      - intră și dă-i cifrele tale.
    </div>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Concurența ta deja știe cifrele despre business-ul tău.<br>
      Tu le știi despre ei?
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 24px 20px;">
      Succes în război,<br>
      <strong>Echipa Ta</strong>
    </p>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 16px 20px;">
      Acest email a fost trimis către ${userName} ca abonat activ.<br>
      Yana Strategică este disponibilă doar pentru antreprenori cu abonament activ.
    </p>
  </div>
</body>
</html>
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Doar adminii pot trimite anunțuri." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { testEmail } = await req.json();

    let recipients = [];

    if (testEmail) {
      // Send test email
      recipients = [{ email: testEmail, full_name: "Test User" }];
    } else {
      // Get all active entrepreneur subscribers
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("subscription_type", "entrepreneur")
        .eq("subscription_status", "active")
        .not("email", "is", null);

      recipients = profiles || [];
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nu există destinatari activi." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://app.");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        const html = getEmailHtml(
          recipient.full_name || "Antreprenor",
          appUrl || "https://your-app.com"
        );

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Yana Platform <${fromEmail}>`,
            to: [recipient.email],
            subject: "🚀 Yana Strategică - Consultantul tău de business ultra-agresiv",
            html: html,
          }),
        });

        if (response.ok) {
          successCount++;
          console.log(`Email sent successfully to ${recipient.email}`);
        } else {
          errorCount++;
          const error = await response.text();
          console.error(`Failed to send email to ${recipient.email}:`, error);
        }

        // Rate limiting: wait 100ms between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`Error sending email to ${recipient.email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Emails trimise: ${successCount} succes, ${errorCount} erori`,
        success: successCount,
        errors: errorCount,
        total: recipients.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-strategic-advisor-announcement:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
