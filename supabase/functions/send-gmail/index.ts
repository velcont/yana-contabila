/**
 * SEND-GMAIL — trimite email prin contul Gmail al userului folosind OAuth token-ul lui.
 * Reutilizează scope-urile Google Calendar (extinse cu gmail.send).
 *
 * Input: { to, subject, body, cc?, bcc?, reply_to?, triggered_via? }
 * Auth: cere JWT user. Userul trebuie să aibă conectat Google (Calendar+Gmail).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken } from "../_shared/google-calendar.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64urlEncode(str: string): string {
  // UTF-8 safe base64url encoding
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc2822(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : "",
    opts.bcc ? `Bcc: ${opts.bcc}` : "",
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : "",
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.body,
  ].filter(Boolean);
  return headers.join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { to, subject, body: emailBody, cc, bcc, reply_to, triggered_via } = body || {};
    if (!to || !subject || !emailBody) {
      return json({ error: "to, subject, body sunt obligatorii" }, 400);
    }

    // Obține tokenul OAuth al userului (cu refresh automat)
    let accessToken: string;
    let fromEmail: string | null;
    try {
      const tok = await getValidAccessToken(userId);
      accessToken = tok.accessToken;
      fromEmail = tok.calendarEmail;
    } catch (e) {
      return json({
        error: "Google nu este conectat",
        details: e instanceof Error ? e.message : String(e),
        action_required: "connect_google",
      }, 412);
    }

    if (!fromEmail) {
      // fallback: ia emailul de pe profile sau auth
      fromEmail = userData.user.email || null;
    }
    if (!fromEmail) return json({ error: "Nu pot determina adresa expeditorului" }, 400);

    // Pre-log
    const { data: logRow } = await supabase
      .from("outbound_emails")
      .insert({
        user_id: userId,
        recipient_email: to,
        subject,
        body: emailBody,
        status: "pending",
        triggered_via: triggered_via || "yana_gmail",
      })
      .select("id")
      .single();
    const logId = logRow?.id;

    const rfc = buildRfc2822({
      from: fromEmail,
      to,
      subject,
      body: emailBody,
      cc,
      bcc,
      replyTo: reply_to,
    });
    const raw = b64urlEncode(rfc);

    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    const resJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (logId) {
        await supabase
          .from("outbound_emails")
          .update({
            status: "failed",
            error_message: JSON.stringify(resJson).slice(0, 500),
          })
          .eq("id", logId);
      }
      console.error("[send-gmail] Gmail API error:", res.status, resJson);
      return json({
        error: "Gmail API error",
        status: res.status,
        details: resJson,
        hint: res.status === 401 || res.status === 403
          ? "Reconectează Google din Setări — necesită scope nou gmail.send"
          : undefined,
      }, 502);
    }

    if (logId) {
      await supabase
        .from("outbound_emails")
        .update({
          status: "sent",
          provider_message_id: (resJson as { id?: string }).id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return json({
      success: true,
      message_id: (resJson as { id?: string }).id,
      thread_id: (resJson as { threadId?: string }).threadId,
      from: fromEmail,
      log_id: logId,
    });
  } catch (e) {
    console.error("[send-gmail] error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}