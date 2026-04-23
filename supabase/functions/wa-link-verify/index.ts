// wa-link-verify — Validează codul OTP introdus de user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    if (!/^\d{6}$/.test(code)) return json({ error: "Cod invalid" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: link } = await admin
      .from("wa_user_links")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!link) return json({ error: "Nu ai inițiat verificarea. Introdu numărul mai întâi." }, 404);
    if (link.verified) return json({ ok: true, already_verified: true, phone: link.phone_e164 });
    if (!link.otp_code || !link.otp_expires_at) return json({ error: "Niciun cod activ. Cere unul nou." }, 400);
    if (new Date(link.otp_expires_at).getTime() < Date.now()) return json({ error: "Codul a expirat. Cere unul nou." }, 400);
    if (link.otp_attempts >= 5) return json({ error: "Prea multe încercări. Cere un cod nou." }, 429);

    if (link.otp_code !== code) {
      await admin.from("wa_user_links").update({ otp_attempts: (link.otp_attempts ?? 0) + 1 }).eq("user_id", userId);
      return json({ error: "Cod incorect" }, 400);
    }

    await admin.from("wa_user_links").update({
      verified: true,
      verified_at: new Date().toISOString(),
      otp_code: null,
      otp_expires_at: null,
    }).eq("user_id", userId);

    return json({ ok: true, phone: link.phone_e164 });
  } catch (err) {
    console.error("wa-link-verify error:", err);
    return json({ error: err instanceof Error ? err.message : "Eroare" }, 500);
  }
});
