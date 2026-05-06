/**
 * SEND-BUSINESS-EMAIL — generic sender pentru emailuri business inițiate de Yana sau UI.
 *
 * Input: { to, subject, body, attachment?: { filename, content_base64, content_type } }
 * Auth: cere JWT user (verifică auth.uid()).
 * Trimite via Resend, loghează în outbound_emails.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken } from "../_shared/google-calendar.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") || "Yana AI <yana@yana-contabila.velcont.com>";

const BodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(50000),
  reply_to: z.string().email().optional(),
  attachment: z
    .object({
      filename: z.string().min(1).max(255),
      content_base64: z.string().min(1),
      content_type: z.string().optional(),
    })
    .optional(),
  triggered_via: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Validate body
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }
    const { to, subject, body, attachment, reply_to, triggered_via } = parsed.data;

    // ─── Preferință 1: trimite prin Gmail-ul userului dacă a conectat Google ───
    let gmailToken: { accessToken: string; calendarEmail: string | null } | null = null;
    try {
      gmailToken = await getValidAccessToken(userId);
    } catch {
      gmailToken = null; // userul nu are Google conectat
    }

    if (gmailToken) {
      // Gmail send — suportă și atașamente prin MIME multipart/mixed
      const fromEmail = gmailToken.calendarEmail || userEmail;
      if (!fromEmail) return json({ error: "Nu pot determina expeditorul" }, 400);

      const { data: logRow } = await supabase
        .from("outbound_emails")
        .insert({
          user_id: userId,
          recipient_email: to,
          subject,
          body,
          attachment_name: attachment?.filename ?? null,
          attachment_size_bytes: attachment
            ? Math.floor((attachment.content_base64.length * 3) / 4)
            : null,
          status: "pending",
          triggered_via: triggered_via || "yana_agent_gmail",
        })
        .select("id")
        .single();
      const logId = logRow?.id;

      const subjectEnc = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      const headersBase = [
        `From: ${fromEmail}`,
        `To: ${to}`,
        reply_to ? `Reply-To: ${reply_to}` : `Reply-To: ${fromEmail}`,
        `Subject: ${subjectEnc}`,
        "MIME-Version: 1.0",
      ];

      let rfc: string;
      if (attachment) {
        const boundary = `=_yana_${crypto.randomUUID().replace(/-/g, "")}`;
        const ctype = attachment.content_type || "application/octet-stream";
        // Split base64 in 76-char lines
        const b64 = attachment.content_base64.replace(/\r?\n/g, "");
        const wrapped = b64.match(/.{1,76}/g)?.join("\r\n") || b64;
        const filenameEnc = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(attachment.filename)))}?=`;
        rfc = [
          ...headersBase,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: 8bit",
          "",
          body,
          "",
          `--${boundary}`,
          `Content-Type: ${ctype}; name="${filenameEnc}"`,
          `Content-Disposition: attachment; filename="${filenameEnc}"`,
          "Content-Transfer-Encoding: base64",
          "",
          wrapped,
          "",
          `--${boundary}--`,
          "",
        ].join("\r\n");
      } else {
        rfc = [
          ...headersBase,
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: 8bit",
          "",
          body,
        ].join("\r\n");
      }

      const bytes = new TextEncoder().encode(rfc);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      const raw = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const gmailRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        },
      );
      const gmailJson = await gmailRes.json().catch(() => ({}));

      if (gmailRes.ok) {
        if (logId) {
          await supabase
            .from("outbound_emails")
            .update({
              status: "sent",
              provider_message_id: (gmailJson as { id?: string }).id ?? null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", logId);
        }
        return json({
          success: true,
          provider: "gmail",
          from: fromEmail,
          message_id: (gmailJson as { id?: string }).id,
          log_id: logId,
        });
      }

      console.warn("[send-business-email] Gmail failed, fallback to Resend:", gmailRes.status, gmailJson);
      if (logId) {
        await supabase
          .from("outbound_emails")
          .update({ status: "failed", error_message: `gmail:${gmailRes.status}` })
          .eq("id", logId);
      }
      // continuă cu Resend dacă există cheie
    }

    // ─── Fallback: Resend ───
    if (!RESEND_API_KEY) {
      return json({
        error: "Niciun expeditor disponibil",
        hint: "Conectează Google (Gmail) din Setări sau configurează RESEND_API_KEY",
      }, 412);
    }

    // Pre-log as pending
    const { data: logRow } = await supabase
      .from("outbound_emails")
      .insert({
        user_id: userId,
        recipient_email: to,
        subject,
        body,
        attachment_name: attachment?.filename ?? null,
        attachment_size_bytes: attachment
          ? Math.floor((attachment.content_base64.length * 3) / 4)
          : null,
        status: "pending",
        triggered_via: triggered_via || "yana_agent",
      })
      .select("id")
      .single();

    const logId = logRow?.id;

    // Build payload
    const payload: Record<string, unknown> = {
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      text: body,
      html: body
        .split("\n")
        .map((line) => `<p style="margin:0 0 10px;">${escapeHtml(line)}</p>`)
        .join(""),
      reply_to: reply_to || userEmail || undefined,
    };

    if (attachment) {
      payload.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content_base64,
          content_type: attachment.content_type,
        },
      ];
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

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
      return json({ error: "Provider error", details: resJson, status: res.status }, 502);
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
      log_id: logId,
    });
  } catch (e) {
    console.error("[send-business-email] error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}