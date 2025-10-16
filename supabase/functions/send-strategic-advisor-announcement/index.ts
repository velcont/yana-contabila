import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const getEmailHtml = (userName: string, loginUrl: string, isEntrepreneur: boolean = true) => {
  if (isEntrepreneur) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Două Instrumente Esențiale pentru Afacerea Ta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0 48px;">
    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 40px 20px 20px; line-height: 1.3;">
      🎯 Două Instrumente Esențiale pentru Afacerea Ta
    </h1>
    
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Bună ${userName},
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      În platformă ai acces la <strong>DOUĂ funcționalități distincte</strong>, fiecare esențială pentru succesul afacerii tale:
    </p>

    <!-- SECTION 1: Analiza Balanței (10%) -->
    <div style="background-color: #f0f7ff; border: 2px solid #3b82f6; border-radius: 8px; margin: 24px 20px; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; font-weight: bold; margin: 0 0 12px;">
        📊 1. Analiza Balanței - AI Chatbot pentru Analiza Financiară
      </h2>
      <p style="color: #404040; font-size: 14px; line-height: 22px; margin: 8px 0;">
        <strong>Ce face:</strong> Analizează balanțele tale contabile și oferă insights financiare instantanee.
      </p>
      <p style="color: #404040; font-size: 14px; line-height: 22px; margin: 8px 0;">
        <strong>Când să folosești:</strong> Pentru analize lunare/trimestriale, întrebări despre situația financiară actuală.
      </p>
    </div>

    <!-- SECTION 2: Yana Strategică (90%) -->
    <div style="background-color: #fef3c7; border: 3px solid #f59e0b; border-radius: 8px; margin: 24px 20px; padding: 24px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">
      <h2 style="color: #1a1a1a; font-size: 22px; font-weight: bold; margin: 0 0 15px; text-transform: uppercase;">
        🚀 2. YANA STRATEGICĂ - Consultant Strategic Ultra-Agresiv
      </h2>
      <p style="color: #dc2626; font-size: 16px; line-height: 24px; margin: 8px 0; font-weight: 600;">
        ATENȚIE: Acesta este un instrument COMPLET DIFERIT de analiza balanței!
      </p>
      
      <h3 style="color: #1a1a1a; font-size: 18px; font-weight: bold; margin: 20px 0 12px;">
        💥 Ce face Yana Strategică diferit?
      </h3>
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

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 30px 20px 20px;">

    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 20px 20px 15px;">
      📊 Ce îți cere Yana Strategică?
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
      <a href="${loginUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 8px; color: #fff; font-size: 18px; font-weight: bold; text-decoration: none; display: inline-block; padding: 18px 40px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
        🚀 ACCESEAZĂ YANA STRATEGICĂ ACUM
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 30px 20px 20px;">

    <div style="color: #dc2626; font-size: 15px; line-height: 24px; margin: 16px 20px; padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      ⚠️ <strong>ATENȚIE:</strong> Yana Strategică nu este pentru toată lumea. Dacă vrei sfaturi generice și 
      motivaționale, nu este instrumentul potrivit. Dacă vrei strategii brutale care funcționează 
      - intră și dă-i cifrele tale.
    </div>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      <strong>Concurența ta deja știe cifrele despre business-ul tău.</strong><br>
      Tu le știi despre ei?
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 24px 20px;">
      Succes în război,<br>
      <strong>Echipa Yana</strong>
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
  } else {
    // Email for accountants
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yana Strategică - Noua funcționalitate</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0 48px;">
    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 40px 20px 20px; line-height: 1.3;">
      🎯 Noutate: Yana Strategică pentru Clienții Tăi
    </h1>
    
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Bună ${userName},
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Am adăugat o funcționalitate <strong>revoluționară</strong> în platformă - Yana Strategică, 
      un consultant strategic AI care ajută antreprenorii să dezvolte strategii concrete de business.
    </p>

    <div style="background-color: #f0f7ff; border: 2px solid #3b82f6; border-radius: 8px; margin: 24px 20px; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 0 0 15px;">
        💼 De ce e relevant pentru tine?
      </h2>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Valoare adăugată pentru clienți</strong> - Oferi mai mult decât contabilitate
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Clienți mai educați</strong> - Înțeleg mai bine deciziile financiare
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Retenție îmbunătățită</strong> - Clienții văd platforma ca instrument strategic
      </p>
      <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 0;">
        <strong>✅ Diferențiere</strong> - Te poziționezi ca partener strategic, nu doar furnizor
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 30px 20px 15px;">
      🎯 Ce face Yana Strategică?
    </h2>
    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Ajută antreprenorii să creeze strategii bazate pe date financiare concrete:
    </p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">📋 Strategii de război de preț</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">💰 Optimizare fiscală agresivă</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">📊 Planuri cu bugete și KPIs exacte</p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 40px;">⚠️ Analiză riscuri și oportunități</p>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <h2 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 30px 20px 15px;">
      💡 Cum să o promovezi clienților?
    </h2>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 20px;">
      <strong>1. Menționează-o în consultări:</strong> "Pe lângă serviciile noastre de contabilitate, 
      ai acces la Yana Strategică pentru dezvoltarea business-ului."
    </p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 20px;">
      <strong>2. Include în onboarding:</strong> Prezintă funcționalitatea când clienții noi intră în platformă.
    </p>
    <p style="color: #404040; font-size: 15px; line-height: 24px; margin: 8px 20px;">
      <strong>3. Newsletter lunar:</strong> Trimite studii de caz despre strategii create cu Yana.
    </p>

    <div style="text-align: center; margin: 32px 20px;">
      <a href="${loginUrl}" style="background-color: #3b82f6; border-radius: 6px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; padding: 16px 32px;">
        🚀 Explorează Yana Strategică
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 16px 20px;">
      Această funcționalitate te poziționează ca partener strategic pentru clienții tăi, 
      nu doar ca furnizor de servicii contabile.
    </p>

    <p style="color: #404040; font-size: 16px; line-height: 26px; margin: 24px 20px;">
      Succes,<br>
      <strong>Echipa Yana</strong>
    </p>

    <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

    <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 16px 20px;">
      Acest email a fost trimis către ${userName} ca partener contabil activ.
    </p>
  </div>
</body>
</html>
`;
  }
};

interface RequestBody {
  targetAudience?: 'entrepreneur' | 'accounting_firm';
  testEmail?: string;
  customSubject?: string;
  customBody?: string;
}

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

    const { testEmail, targetAudience, customSubject, customBody }: RequestBody = await req.json();

    // Validate targetAudience is always provided
    if (!targetAudience || !['entrepreneur', 'accounting_firm'].includes(targetAudience)) {
      return new Response(
        JSON.stringify({ error: "Trebuie să specifici targetAudience: 'entrepreneur' sau 'accounting_firm'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Target audience: ${targetAudience}, Test email: ${testEmail || 'none'}`);

    let recipients = [];

    if (testEmail) {
      // Send test email with specified targetAudience
      recipients = [{ email: testEmail, full_name: "Test User" }];
      console.log(`Sending test email to ${testEmail} as ${targetAudience}`);
    } else {
      // Get recipients based on target audience
      const { data: profiles, error } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("subscription_type", targetAudience)
        .eq("subscription_status", "active")
        .not("email", "is", null);

      if (error) {
        throw new Error(`Failed to fetch recipients: ${error.message}`);
      }

      recipients = profiles || [];
      console.log(`Found ${recipients.length} ${targetAudience} recipients`);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: `Nu există ${targetAudience === 'entrepreneur' ? 'antreprenori' : 'contabili'} cu abonament activ.` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://app.");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Determine email subject and content based on target audience
    const isEntrepreneur = targetAudience === 'entrepreneur';
    console.log(`Is entrepreneur: ${isEntrepreneur} (targetAudience: ${targetAudience})`);
    
    // Use custom subject if provided, otherwise use default
    const emailSubject = customSubject || (isEntrepreneur 
      ? "🎯 Două Instrumente Esențiale: Analiza Balanței + YANA STRATEGICĂ"
      : "🚀 Yana Strategică - Noua funcționalitate pentru clienții tăi antreprenori");
    
    console.log(`Email subject: ${emailSubject}`);

    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        // Use custom body if provided, otherwise use template
        let html: string;
        if (customBody) {
          // Replace variables in custom body
          html = customBody
            .replace(/\{userName\}/g, recipient.full_name || (isEntrepreneur ? "Antreprenor" : "Partener"))
            .replace(/\{loginUrl\}/g, appUrl || "https://your-app.com");
          console.log(`Using custom body for ${recipient.email}`);
        } else {
          // Use default template
          const userName = recipient.full_name || (isEntrepreneur ? "Antreprenor" : "Partener");
          console.log(`Generating ${isEntrepreneur ? 'entrepreneur' : 'accountant'} template for ${recipient.email} (${userName})`);
          html = getEmailHtml(
            userName,
            appUrl || "https://your-app.com",
            isEntrepreneur
          );
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Yana Platform <${fromEmail}>`,
            to: [recipient.email],
            subject: emailSubject,
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
        message: `Emails trimise către ${targetAudience === 'entrepreneur' ? 'antreprenori' : 'contabili'}: ${successCount} succes, ${errorCount} erori`,
        success: successCount,
        errors: errorCount,
        total: recipients.length,
        targetAudience: targetAudience || 'test',
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
