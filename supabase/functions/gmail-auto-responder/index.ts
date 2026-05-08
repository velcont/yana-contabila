/**
 * GMAIL-AUTO-RESPONDER — rulează la cron (sau manual prin "test_now").
 * - Pentru fiecare user cu enabled=true, citește UNREAD din INBOX
 * - Generează draft cu Lovable AI Gateway folosind system_prompt + signature
 * - Salvează ca DRAFT în Gmail (nu trimite niciodată automat în mod 'draft')
 * - Loghează totul în gmail_responder_log
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken } from "../_shared/google-calendar.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc2822(opts: { from: string; to: string; subject: string; body: string; inReplyTo?: string; references?: string }): string {
  const subj = opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : "",
    opts.references ? `References: ${opts.references}` : "",
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subj)))}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.body,
  ].filter(Boolean);
  return headers.join("\r\n");
}

function isBlacklisted(from: string, blacklist: string[]): boolean {
  const lower = from.toLowerCase();
  return blacklist.some((b) => b && lower.includes(b.toLowerCase()));
}

function isWhitelisted(from: string, whitelist: string[]): boolean {
  if (!whitelist?.length) return false;
  const lower = from.toLowerCase();
  return whitelist.some((w) => w && lower.includes(w.toLowerCase()));
}

async function generateReply(systemPrompt: string, signature: string, examples: { original_email: string; final_response: string }[], emailContext: { from: string; subject: string; body: string }): Promise<string> {
  const messages: any[] = [
    { role: "system", content: `${systemPrompt}\n\nSEMNĂTURĂ DE FOLOSIT LA FINAL:\n${signature || "—"}` },
  ];
  // few-shot: ultimele 3 exemple
  for (const ex of examples.slice(0, 3)) {
    messages.push({ role: "user", content: `Email primit:\n${ex.original_email}` });
    messages.push({ role: "assistant", content: ex.final_response });
  }
  messages.push({
    role: "user",
    content: `Email primit:\nDe la: ${emailContext.from}\nSubiect: ${emailContext.subject}\n\n${emailContext.body}\n\nScrie un draft de răspuns scurt și profesional în limba română. NU folosi placeholder-e între paranteze [].`,
  });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, max_tokens: 700, temperature: 0.5 }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function processUser(svc: any, userId: string, settings: any) {
  let accessToken: string;
  let fromEmail: string | null;
  try {
    const tok = await getValidAccessToken(userId);
    accessToken = tok.accessToken;
    fromEmail = tok.calendarEmail;
  } catch (e) {
    return { skipped: true, reason: "google_not_connected", error: String(e) };
  }
  if (!fromEmail) {
    const { data: u } = await svc.auth.admin.getUserById(userId);
    fromEmail = u?.user?.email ?? null;
  }
  if (!fromEmail) return { skipped: true, reason: "no_from_email" };

  // 1. List unread in INBOX (max 5 per run)
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread+in:inbox&maxResults=5",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    return { error: `gmail list ${listRes.status}: ${await listRes.text()}` };
  }
  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages ?? [];
  if (!messages.length) {
    await svc.from("gmail_responder_settings").update({ last_run_at: new Date().toISOString() }).eq("user_id", userId);
    return { processed: 0 };
  }

  // load examples once
  const { data: examples } = await svc
    .from("gmail_responder_examples")
    .select("original_email, final_response")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  let processed = 0;
  for (const m of messages) {
    // dedup
    const { data: existing } = await svc
      .from("gmail_responder_log")
      .select("id")
      .eq("user_id", userId)
      .eq("email_message_id", m.id)
      .maybeSingle();
    if (existing) continue;

    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!msgRes.ok) continue;
    const msg = await msgRes.json();
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
    const getH = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    const fromHdr = getH("From");
    const subject = getH("Subject") || "(fără subiect)";
    const messageIdHdr = getH("Message-ID");
    const referencesHdr = getH("References");
    const snippet: string = msg.snippet ?? "";

    // extract body (text/plain)
    let body = snippet;
    function findPart(part: any): string | null {
      if (!part) return null;
      if (part.mimeType === "text/plain" && part.body?.data) {
        const decoded = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        try { return decodeURIComponent(escape(decoded)); } catch { return decoded; }
      }
      if (part.parts) for (const p of part.parts) { const r = findPart(p); if (r) return r; }
      return null;
    }
    body = findPart(msg.payload) ?? snippet;

    // blacklist
    if (isBlacklisted(fromHdr, settings.blacklist || [])) {
      await svc.from("gmail_responder_log").insert({
        user_id: userId, email_message_id: m.id, thread_id: m.threadId,
        from_address: fromHdr, subject, snippet, status: "skipped_blacklist",
      });
      continue;
    }

    let generated = "";
    try {
      generated = await generateReply(settings.system_prompt, settings.signature, examples ?? [], { from: fromHdr, subject, body: body.slice(0, 4000) });
    } catch (e) {
      await svc.from("gmail_responder_log").insert({
        user_id: userId, email_message_id: m.id, thread_id: m.threadId,
        from_address: fromHdr, subject, snippet, status: "error", error_message: String(e),
      });
      continue;
    }

    if (/\[[^\]]+\]/.test(generated)) {
      await svc.from("gmail_responder_log").insert({
        user_id: userId, email_message_id: m.id, thread_id: m.threadId,
        from_address: fromHdr, subject, snippet, generated_draft: generated,
        status: "error", error_message: "draft conține placeholder-e [...]",
      });
      continue;
    }

    // extrage adresa pură din From: "Nume <email>"
    const toMatch = fromHdr.match(/<([^>]+)>/);
    const toAddr = toMatch ? toMatch[1] : fromHdr.trim();

    const rfc = buildRfc2822({
      from: fromEmail!, to: toAddr, subject, body: generated,
      inReplyTo: messageIdHdr || undefined,
      references: referencesHdr ? `${referencesHdr} ${messageIdHdr}`.trim() : (messageIdHdr || undefined),
    });
    const raw = b64urlEncode(rfc);

    // decide: trimite sau salvează ca draft
    const shouldAutoSend =
      settings.mode === "auto_all" ||
      (settings.mode === "auto_whitelist" && isWhitelisted(fromHdr, settings.whitelist || []));

    let endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
    let payload: any = { message: { raw, threadId: m.threadId } };
    if (shouldAutoSend) {
      endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
      payload = { raw, threadId: m.threadId };
    }

    const sendRes = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      await svc.from("gmail_responder_log").insert({
        user_id: userId, email_message_id: m.id, thread_id: m.threadId,
        from_address: fromHdr, subject, snippet, generated_draft: generated,
        status: "error", error_message: `gmail ${sendRes.status}: ${JSON.stringify(sendData).slice(0, 400)}`,
      });
      continue;
    }

    await svc.from("gmail_responder_log").insert({
      user_id: userId, email_message_id: m.id, thread_id: m.threadId,
      from_address: fromHdr, subject, snippet, generated_draft: generated,
      gmail_draft_id: sendData.id ?? null,
      status: shouldAutoSend ? "sent" : "drafted",
    });

    if (settings.mark_as_read) {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      });
    }
    processed++;
  }

  await svc.from("gmail_responder_settings").update({ last_run_at: new Date().toISOString() }).eq("user_id", userId);
  return { processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body.user_id;

    let query = svc.from("gmail_responder_settings").select("*").eq("enabled", true);
    if (targetUserId) query = svc.from("gmail_responder_settings").select("*").eq("user_id", targetUserId);
    const { data: users, error } = await query;
    if (error) throw error;

    const results: any[] = [];
    for (const u of users ?? []) {
      // throttle: skip dacă last_run_at < frequency_minutes
      if (!targetUserId && u.last_run_at) {
        const ageMin = (Date.now() - new Date(u.last_run_at).getTime()) / 60000;
        if (ageMin < u.frequency_minutes) { results.push({ user_id: u.user_id, skipped: "throttled" }); continue; }
      }
      try {
        const r = await processUser(svc, u.user_id, u);
        results.push({ user_id: u.user_id, ...r });
      } catch (e) {
        results.push({ user_id: u.user_id, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[gmail-auto-responder] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});