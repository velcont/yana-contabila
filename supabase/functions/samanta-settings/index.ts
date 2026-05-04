// Authenticated CRUD for samanta_settings + quick toggle
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = req.method === "POST" || req.method === "PATCH" ? await req.json().catch(() => ({})) : {};

    if (req.method === "GET") {
      const { data } = await admin
        .from("samanta_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return new Response(JSON.stringify({ settings: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert
    const allowed: Record<string, any> = {};
    const fields = [
      "active",
      "schedule",
      "voice_agent_id",
      "twilio_phone_number",
      "forward_to_user_phone",
      "escalation_keywords",
      "language",
      "greeting",
      "user_full_name",
      "company_name",
    ];
    for (const f of fields) {
      if (f in body) allowed[f] = body[f];
    }
    allowed.user_id = user.id;

    const { data, error } = await admin
      .from("samanta_settings")
      .upsert(allowed, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ settings: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[samanta-settings] error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});