import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  subject: string;
  message: string;
  filterCriteria?: {
    userType?: string;
  };
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

    // Verifică dacă utilizatorul este admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Nu ai permisiuni de admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, message, filterCriteria, broadcastId }: BroadcastRequest = await req.json();

    // Construiește query pentru utilizatori
    let query = supabaseClient.from("profiles").select("id, email, full_name, subscription_type");

    // Dacă avem filtre, le aplicăm direct pe profiles
    if (filterCriteria && filterCriteria.userType) {
      query = query.eq("subscription_type", filterCriteria.userType);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error("Eroare la obținere profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Eroare la obținere utilizatori" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nu există utilizatori înregistrați", sentCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Trimit email către ${profiles.length} utilizatori...`);

    let successCount = 0;
    const errors: string[] = [];

    // Trimite email către fiecare utilizator
    for (const profile of profiles) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Bună, ${profile.full_name || profile.email}!</h2>
            <div style="color: #555; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">
              Primești acest email pentru că ai un cont activ în aplicația noastră de analiză financiară.
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
            to: [profile.email],
            subject: subject,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        const emailData = await emailResponse.json();
        console.log(`Email trimis către ${profile.email}:`, emailData);
        successCount++;

        // Loghează în email_logs
        await supabaseClient.from("email_logs").insert({
          email_type: "broadcast",
          recipient_user_id: profile.id,
          recipient_email: profile.email,
          subject: subject,
          status: "sent",
          metadata: { broadcast_id: broadcastId }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Eroare la trimitere email către ${profile.email}:`, error);
        errors.push(`${profile.email}: ${errorMessage}`);
        
        // Loghează eroarea
        await supabaseClient.from("email_logs").insert({
          email_type: "broadcast",
          recipient_user_id: profile.id,
          recipient_email: profile.email,
          subject: subject,
          status: "failed",
          metadata: { broadcast_id: broadcastId, error: errorMessage }
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
        message: `Emailuri trimise cu succes către ${successCount} din ${profiles.length} utilizatori`,
        sentCount: successCount,
        totalCount: profiles.length,
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
