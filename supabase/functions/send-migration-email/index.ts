import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://ygfsuoloxzjpiulogrjz.lovable.app";

serve(async (req: Request): Promise<Response> => {
  console.log("[send-migration-email] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body pentru test mode
    const body = await req.json().catch(() => ({}));
    const testMode = body.testMode === true;

    console.log(`[send-migration-email] Mode: ${testMode ? 'TEST' : 'PRODUCTION'}`);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-migration-email] No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("[send-migration-email] Invalid user:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      console.error("[send-migration-email] User is not admin");
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // În test mode, trimite doar la email-ul adminului
    let profiles;
    if (testMode) {
      console.log(`[send-migration-email] TEST MODE - sending only to: ${userData.user.email}`);
      profiles = [{ id: userData.user.id, email: userData.user.email, full_name: 'Test User' }];
    } else {
      // Fetch all user emails
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null);

      if (profilesError) {
        console.error("[send-migration-email] Error fetching profiles:", profilesError);
        throw profilesError;
      }
      profiles = allProfiles;
    }

    console.log(`[send-migration-email] Will send to ${profiles?.length || 0} user(s)`);

    // Calculate deadline (7 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const deadlineFormatted = deadline.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      if (!profile.email) continue;

      const userName = profile.full_name || "utilizator";
      const migrationLink = `${APP_URL}?update=force_v3`;

      const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Yana Strategic</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Actualizare Majoră v3.0</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Salut${userName !== "utilizator" ? ` <strong>${userName}</strong>` : ""},
      </p>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        Am lansat o nouă versiune majoră a platformei noastre, redenumită acum <strong>Yana Strategic</strong>. 
        Aceasta include o singură interfață mult mai simplă și un motor de analiză mai puternic.
      </p>
      
      <!-- Alert Box -->
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400E; font-weight: 600; font-size: 14px;">
          ⚠️ ACȚIUNE OBLIGATORIE
        </p>
        <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
          Pentru a beneficia de noua versiune, versiunile vechi vor fi dezactivate.
        </p>
      </div>
      
      <p style="font-size: 15px; color: #555; font-weight: 600; margin-bottom: 15px;">
        Te rugăm să urmezi acești pași:
      </p>
      
      <!-- Step 1 -->
      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
          <strong>1.</strong> Accesează contul tău folosind <strong>EXCLUSIV</strong> link-ul de mai jos:
        </p>
        <a href="${migrationLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); 
                  color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; font-size: 14px;">
          👉 CLICK AICI PENTRU NOUA VERSIUNE
        </a>
      </div>
      
      <!-- Step 2 -->
      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
          <strong>2.</strong> Dacă, după login, tot vezi interfața veche, folosește reîncărcarea forțată:
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <span style="background: #E5E7EB; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 13px;">
            💻 Windows/Linux: <strong>CTRL + SHIFT + R</strong>
          </span>
          <span style="background: #E5E7EB; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 13px;">
            🍎 Mac: <strong>CMD + SHIFT + R</strong>
          </span>
        </div>
      </div>
      
      <!-- Deadline Warning -->
      <div style="background: #FEE2E2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #991B1B; font-size: 14px;">
          ⏰ Începând cu <strong>${deadlineFormatted}</strong>, accesul prin versiunile vechi va fi blocat definitiv.
        </p>
      </div>
      
      <p style="font-size: 15px; color: #555; margin-top: 25px; line-height: 1.6;">
        Mulțumim pentru înțelegere,<br>
        <strong>Echipa Yana Strategic</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
        © 2025 Yana Strategic. Toate drepturile rezervate.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await resend.emails.send({
          from: `Yana Strategic <${fromEmail}>`,
          to: [profile.email],
          subject: "[ACȚIUNE NECESARĂ] Actualizare Majoră de Performanță și Securitate pentru Contul tău Yana",
          html: htmlContent,
        });

        // Log successful email
        await supabase.from("email_logs").insert({
          email: profile.email,
          email_type: "migration_v3",
          status: "sent",
          metadata: { version: "3.0", deadline: deadlineFormatted },
        });

        successCount++;
        console.log(`[send-migration-email] Sent to ${profile.email}`);
      } catch (emailError: unknown) {
        errorCount++;
        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${profile.email}: ${errMsg}`);
        console.error(`[send-migration-email] Failed for ${profile.email}:`, emailError);

        // Log failed email
        await supabase.from("email_logs").insert({
          email: profile.email,
          email_type: "migration_v3",
          status: "failed",
          metadata: { error: errMsg },
        });
      }

      // Rate limiting: 100ms delay between emails
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[send-migration-email] Complete: ${successCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined,
        deadline: deadlineFormatted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[send-migration-email] Error:", error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
