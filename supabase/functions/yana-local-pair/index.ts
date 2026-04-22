/**
 * yana-local-pair — generează un pairing code pentru utilizator
 *
 * Flow:
 *  - User logat apasă "Conectează laptop" în UI
 *  - Această funcție creează un device în status=pending cu un cod 6-cifre
 *  - Userul rulează `npx yana-local-agent` pe Mac, introduce codul
 *  - Agentul apelează /yana-local-claim cu codul → primește device_token persistent
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user via JWT
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const deviceName = (body.device_name as string) || "My Laptop";

    const admin = createClient(supabaseUrl, supabaseService);

    const code = genCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { data, error } = await admin
      .from("yana_local_devices")
      .insert({
        user_id: userId,
        device_name: deviceName,
        pairing_code: code,
        pairing_code_expires_at: expires,
        status: "pending",
        allowed_paths: [],
      })
      .select("id, pairing_code, pairing_code_expires_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        device_id: data.id,
        pairing_code: data.pairing_code,
        expires_at: data.pairing_code_expires_at,
        bridge_url: `${supabaseUrl}/functions/v1/yana-local-bridge`,
        claim_url: `${supabaseUrl}/functions/v1/yana-local-claim`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});