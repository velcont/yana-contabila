// wa-link-init — Cere OTP pe WhatsApp pentru numărul utilizatorului
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";
const TOKEN = (Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "")
  .trim()
  .replace(/[;\s]+$/g, "");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  let e164 = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  // 8-15 cifre după +
  if (!/^\+\d{8,15}$/.test(e164)) return null;
  return e164;
}

async function sendWhatsAppText(to: string, body: string) {
  const phone = to.replace(/^\+/, "");
  const resp = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body },
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`WA send failed [${resp.status}]: ${JSON.stringify(data)}`);
  }
  return data;
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
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body.phone || ""));
    if (!phone) return json({ error: "Număr invalid. Folosește format internațional, ex: +40712345678" }, 400);

  if (!PHONE_ID || !TOKEN) return json({ error: "WhatsApp nu este configurat (lipsesc secretele)" }, 500);

    // Check dacă numărul e deja verificat de alt user
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin
      .from("wa_user_links")
      .select("user_id, verified")
      .eq("phone_e164", phone)
      .eq("verified", true)
      .maybeSingle();
    if (existing && existing.user_id !== userId) {
      return json({ error: "Acest număr este deja conectat la alt cont." }, 409);
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await admin
      .from("wa_user_links")
      .upsert({
        user_id: userId,
        phone_e164: phone,
        otp_code: otp,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        verified: false,
      }, { onConflict: "user_id" });

    const message =
      `🔐 Cod verificare YANA: ${otp}\n\n` +
      `Introdu acest cod în aplicație pentru a-ți conecta WhatsApp-ul la Yana.\n` +
      `Codul expiră în 10 minute.`;

    try {
      await sendWhatsAppText(phone, message);
    } catch (e) {
      console.error("WA send error:", e);
      return json({ error: "Nu am putut trimite mesaj WhatsApp. Verifică numărul și încearcă din nou." }, 502);
    }

    return json({ ok: true, phone, expires_at: expiresAt });
  } catch (err) {
    console.error("wa-link-init error:", err);
    return json({ error: err instanceof Error ? err.message : "Eroare" }, 500);
  }
});
