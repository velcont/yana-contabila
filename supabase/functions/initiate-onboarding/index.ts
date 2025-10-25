import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingRequest {
  accountant_id: string;
  client_company_id: string;
  client_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountant_id, client_company_id, client_email }: OnboardingRequest = await req.json();

    console.log("Initiating onboarding for:", { accountant_id, client_company_id, client_email });

    // 1. Find the default onboarding process for this accountant
    const { data: process, error: processError } = await supabase
      .from("onboarding_processes")
      .select("*")
      .eq("accountant_id", accountant_id)
      .eq("is_default", true)
      .single();

    if (processError) {
      console.error("Error fetching onboarding process:", processError);
      // If no default process exists, just return success without creating steps
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No default onboarding process configured",
          process_id: null 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Found default process:", process.id);

    // 2. Create progress entries for each step
    const progressEntries = process.steps.map((step: any) => ({
      process_id: process.id,
      client_company_id: client_company_id,
      step_number: step.step_number,
      completed: false,
    }));

    const { error: progressError } = await supabase
      .from("onboarding_steps_progress")
      .insert(progressEntries);

    if (progressError) {
      console.error("Error creating progress entries:", progressError);
      throw progressError;
    }

    console.log("Created progress entries for", progressEntries.length, "steps");

    // 3. Send welcome email with onboarding link
    const appUrl = Deno.env.get("APP_URL") || "https://yana-crm.lovable.app";
    const onboardingLink = `${appUrl}/client-onboarding/${process.id}`;

    try {
      const emailResponse = await resend.emails.send({
        from: "YanaCRM <onboarding@resend.dev>",
        to: [client_email],
        subject: "Bun venit în YanaCRM! Completează procesul de onboarding",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { 
                  display: inline-block; 
                  background-color: #4F46E5; 
                  color: white; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  margin: 20px 0;
                }
                .steps { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .step { margin: 10px 0; padding-left: 25px; position: relative; }
                .step:before { 
                  content: "✓"; 
                  position: absolute; 
                  left: 0; 
                  color: #4F46E5; 
                  font-weight: bold; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Bun venit în YanaCRM!</h1>
                </div>
                <div class="content">
                  <p>Salut!</p>
                  <p>Contabilul tău te-a adăugat în platformă YanaCRM. Pentru a finaliza configurarea contului, te rugăm să completezi procesul de onboarding.</p>
                  
                  <div class="steps">
                    <h3>Ce urmează:</h3>
                    ${process.steps.map((step: any) => 
                      `<div class="step">${step.title}</div>`
                    ).join('')}
                  </div>

                  <p style="text-align: center;">
                    <a href="${onboardingLink}" class="button">Începe Onboarding-ul</a>
                  </p>

                  <p style="color: #666; font-size: 14px;">
                    Dacă butonul de mai sus nu funcționează, copiază și lipește acest link în browser:<br>
                    <a href="${onboardingLink}">${onboardingLink}</a>
                  </p>

                  <p>Ai nevoie de ajutor? Contactează-ne oricând!</p>
                  
                  <p>Cu stimă,<br>Echipa YanaCRM</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log("Welcome email sent successfully:", emailResponse);
    } catch (emailError: any) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the entire process if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        process_id: process.id,
        steps_created: progressEntries.length,
        message: "Onboarding initiated successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in initiate-onboarding function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
