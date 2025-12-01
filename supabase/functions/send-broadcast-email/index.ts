import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://esm.sh/zod@3.22.4";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  subject: string;
  message: string;
  companyIds?: string[];
  broadcastId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    // Extrage userId din JWT (auth.getUser() poate eșua în funcții)
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    function decodeJwtSub(token: string): string | null {
      try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(
          normalized.length + (4 - (normalized.length % 4 || 4)) % 4,
          "="
        );
        const decoded = atob(padded);
        const json = JSON.parse(decoded);
        return json.sub ?? null;
      } catch (_e) {
        return null;
      }
    }

    const userId = decodeJwtSub(jwt);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Nu ești autentificat" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifică dacă utilizatorul este contabil
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("subscription_type")
      .eq("id", userId)
      .maybeSingle();

    if (!profileData || profileData.subscription_type !== "accounting_firm") {
      return new Response(
        JSON.stringify({ error: "Doar contabilii pot trimite broadcast-uri" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Zod validation schema for request body
    const RequestSchema = z.object({
      subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
      message: z.string().min(1, "Message is required").max(5000, "Message must be less than 5000 characters"),
      companyIds: z.array(z.string().uuid()).optional(),
      broadcastId: z.string().uuid().optional(),
    });

    const rawBody = await req.json();
    const validation = RequestSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error("❌ Invalid request body:", validation.error);
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validation.error.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { subject, message, companyIds, broadcastId } = validation.data;

    // Ia companiile pentru acest contabil
    let companiesQuery = supabaseClient
      .from("companies")
      .select("id, company_name, contact_email")
      .eq("managed_by_accountant_id", userId)
      .not("contact_email", "is", null);

    // Dacă avem IDs specifice, filtrăm
    if (companyIds && companyIds.length > 0) {
      companiesQuery = companiesQuery.in("id", companyIds);
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      console.error("Eroare la obținere companii:", companiesError);
      return new Response(
        JSON.stringify({ error: "Eroare la obținere companii" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nu există companii pentru acest criteriu", sentCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Trimit email către ${companies.length} companii...`);

    let successCount = 0;
    const errors: string[] = [];

    // Trimite email către fiecare companie
    for (const company of companies) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Bună ziua, ${company.company_name}!</h2>
            <div style="color: #555; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">
              Acest email a fost trimis de cabinetul dumneavoastră de contabilitate.
            </p>
          </div>
        `;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get("RESEND_FROM_EMAIL") || "YANA Contabilă <onboarding@resend.dev>",
            to: [company.contact_email],
            subject: subject,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        const emailData = await emailResponse.json();
        console.log(`Email trimis către ${company.contact_email}:`, emailData);
        successCount++;

        // Loghează în email_logs
        await supabaseClient.from("email_logs").insert({
          email_type: "broadcast",
          recipient_email: company.contact_email,
          subject: subject,
          status: "sent",
          metadata: { broadcast_id: broadcastId, company_id: company.id }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Eroare la trimitere email către ${company.contact_email}:`, error);
        errors.push(`${company.contact_email}: ${errorMessage}`);
        
        // Loghează eroarea
        await supabaseClient.from("email_logs").insert({
          email_type: "broadcast",
          recipient_email: company.contact_email,
          subject: subject,
          status: "failed",
          metadata: { broadcast_id: broadcastId, company_id: company.id, error: errorMessage }
        });
      }
    }

    // Actualizează broadcast-ul cu numărul de emailuri trimise
    if (broadcastId) {
      await supabaseClient
        .from("email_broadcasts")
        .update({
          sent_to_count: successCount,
          status: "sent",
          sent_at: new Date().toISOString()
        })
        .eq("id", broadcastId);
    }

    return new Response(
      JSON.stringify({
        message: `Emailuri trimise cu succes către ${successCount} din ${companies.length} companii`,
        sentCount: successCount,
        totalCount: companies.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Eroare în send-broadcast-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
