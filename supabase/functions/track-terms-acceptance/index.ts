import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Get client IP from different headers
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { userId, email, termsVersion } = await req.json();

    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    // Insert terms acceptance record
    const { error } = await supabaseClient
      .from('terms_acceptance')
      .insert({
        user_id: userId,
        email: email,
        ip_address: clientIp,
        user_agent: userAgent,
        terms_version: termsVersion || '1.0',
        accepted_at: new Date().toISOString()
      });

    if (error) throw error;

    console.log(`Terms acceptance tracked for user ${userId} from IP ${clientIp}`);

    return new Response(
      JSON.stringify({ success: true, message: "Terms acceptance tracked successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error tracking terms acceptance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
