import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔍 Caut mesaje programate...");

    // Găsește toate emailurile programate care trebuie trimise ACUM
    const { data: scheduledEmails, error: fetchError } = await supabaseClient
      .from("scheduled_emails")
      .select("*")
      .eq("status", "scheduled")
      .lte("send_at", new Date().toISOString())
      .order("send_at", { ascending: true });

    if (fetchError) throw fetchError;

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log("✅ Nu există mesaje programate pentru acum");
      return new Response(
        JSON.stringify({ message: "No scheduled emails to send", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Am găsit ${scheduledEmails.length} mesaje de trimis`);

    let successCount = 0;
    let failedCount = 0;

    for (const email of scheduledEmails) {
      try {
        // Marchează ca "processing" pentru a evita duplicate
        await supabaseClient
          .from("scheduled_emails")
          .update({ status: "processing" })
          .eq("id", email.id);

        // Ia lista de companii
        const { data: companies, error: companiesError } = await supabaseClient
          .from("companies")
          .select("id, company_name, contact_email")
          .in("id", email.company_ids)
          .not("contact_email", "is", null);

        if (companiesError) throw companiesError;

        if (!companies || companies.length === 0) {
          throw new Error("Nu există companii valide pentru acest email");
        }

        console.log(`📬 Trimit către ${companies.length} destinatari...`);

        let sentEmails = 0;
        let failedEmails = 0;

        for (const company of companies) {
          try {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Bună ziua, ${company.company_name}!</h2>
                <div style="color: #555; line-height: 1.6;">
                  ${email.body.replace(/\n/g, '<br>')}
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #999; font-size: 12px;">
                  Email programat trimis de cabinetul dumneavoastră de contabilitate
                </p>
              </div>
            `;

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: Deno.env.get("RESEND_FROM_EMAIL") || "YANA Contabilă <onboarding@resend.dev>",
                to: [company.contact_email],
                subject: email.subject,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json();
              throw new Error(`Resend error: ${JSON.stringify(errorData)}`);
            }

            sentEmails++;
            console.log(`✅ Trimis către ${company.contact_email}`);

            // Loghează în email_logs
            await supabaseClient.from("email_logs").insert({
              email_type: "scheduled_broadcast",
              recipient_email: company.contact_email,
              subject: email.subject,
              status: "sent",
              metadata: { scheduled_email_id: email.id, company_id: company.id }
            });

          } catch (err) {
            failedEmails++;
            console.error(`❌ Eroare la ${company.contact_email}:`, err);

            // Loghează eroarea
            await supabaseClient.from("email_logs").insert({
              email_type: "scheduled_broadcast",
              recipient_email: company.contact_email,
              subject: email.subject,
              status: "failed",
              metadata: { 
                scheduled_email_id: email.id, 
                company_id: company.id,
                error: err instanceof Error ? err.message : String(err)
              }
            });
          }
        }

        // Actualizează statusul în DB
        await supabaseClient
          .from("scheduled_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_count: sentEmails,
            failed_count: failedEmails,
          })
          .eq("id", email.id);

        successCount++;
      } catch (error) {
        console.error(`❌ Eroare la procesare email ${email.id}:`, error);
        
        // Marchează ca failed
        await supabaseClient
          .from("scheduled_emails")
          .update({ status: "failed" })
          .eq("id", email.id);

        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${successCount + failedCount} scheduled emails`,
        processed: successCount + failedCount,
        success: successCount,
        failed: failedCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Eroare în process-scheduled-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
