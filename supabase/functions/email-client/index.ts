/**
 * email-client — IMAP/SMTP gateway for YANA email module
 * Actions:
 *  - test_connection           : verifies IMAP+SMTP credentials
 *  - list_folders              : returns IMAP mailbox list
 *  - list_messages             : list latest N messages from a folder (with search)
 *  - get_message               : fetch full message body + attachments meta
 *  - send_message              : send via SMTP (and append to Sent)
 *  - mark_read / mark_unread / delete_message / move_message
 *
 * Credentials are encrypted at rest with AES-GCM using EMAIL_ENCRYPTION_KEY.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// IMAP + SMTP via npm specifiers (Deno supports npm: imports natively)
import { ImapFlow } from 'npm:imapflow@1.0.165';
import nodemailer from 'npm:nodemailer@6.9.14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ENC_KEY_RAW = Deno.env.get('EMAIL_ENCRYPTION_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------- crypto helpers (AES-GCM, key derived from EMAIL_ENCRYPTION_KEY) ----------
async function getKey(): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ENC_KEY_RAW),
  );
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}
function b64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
async function encryptPassword(plain: string): Promise<{ ct: string; iv: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { ct: b64(ct), iv: b64(iv) };
}
async function decryptPassword(ct: string, iv: string): Promise<string> {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    key,
    fromB64(ct),
  );
  return new TextDecoder().decode(pt);
}

// ---------- auth ----------
async function getUser(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error('Unauthorized');
  return { supa, user: data.user };
}

async function loadAccount(supa: ReturnType<typeof createClient>, userId: string, accountId?: string) {
  let q = supa.from('user_email_accounts').select('*').eq('user_id', userId);
  if (accountId) q = q.eq('id', accountId);
  else q = q.eq('is_default', true);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No email account configured');
  const password = await decryptPassword(data.encrypted_password, data.encryption_iv);
  return { ...data, _password: password };
}

function buildImap(acct: any) {
  return new ImapFlow({
    host: acct.imap_host,
    port: acct.imap_port,
    secure: acct.imap_use_ssl,
    auth: { user: acct.username, pass: acct._password },
    logger: false,
    tls: { rejectUnauthorized: false }, // velcont: self-signed accepted
  });
}
function buildSmtp(acct: any) {
  return nodemailer.createTransport({
    host: acct.smtp_host,
    port: acct.smtp_port,
    secure: acct.smtp_use_ssl,
    auth: { user: acct.username, pass: acct._password },
    tls: { rejectUnauthorized: false },
  });
}

// ---------- handlers ----------
async function actionTest(payload: any) {
  // Encrypt before saving — but first verify by attempting login
  const tmp = {
    imap_host: payload.imap_host,
    imap_port: payload.imap_port,
    imap_use_ssl: payload.imap_use_ssl,
    smtp_host: payload.smtp_host,
    smtp_port: payload.smtp_port,
    smtp_use_ssl: payload.smtp_use_ssl,
    username: payload.username,
    _password: payload.password,
  };
  const imap = buildImap(tmp);
  await imap.connect();
  await imap.logout();
  const smtp = buildSmtp(tmp);
  await smtp.verify();
  return { ok: true };
}

async function actionListFolders(acct: any) {
  const imap = buildImap(acct);
  await imap.connect();
  try {
    const list = await imap.list();
    return list.map((f: any) => ({
      path: f.path,
      name: f.name,
      specialUse: f.specialUse ?? null,
      delimiter: f.delimiter,
    }));
  } finally {
    await imap.logout();
  }
}

async function actionListMessages(acct: any, folder = 'INBOX', limit = 30, search?: string) {
  const imap = buildImap(acct);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(folder);
    try {
      const status = await imap.status(folder, { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) return { folder, total: 0, messages: [] };

      let seqs: number[] = [];
      if (search && search.trim().length > 0) {
        const matches = await imap.search({ or: [{ subject: search }, { body: search }, { from: search }] });
        seqs = (matches as number[]).slice(-limit).reverse();
      } else {
        const start = Math.max(1, total - limit + 1);
        for (let i = total; i >= start; i--) seqs.push(i);
      }
      if (seqs.length === 0) return { folder, total, messages: [] };

      const messages: any[] = [];
      for await (const m of imap.fetch(seqs, {
        envelope: true,
        flags: true,
        size: true,
        uid: true,
        bodyStructure: true,
      })) {
        messages.push({
          uid: m.uid,
          seq: m.seq,
          flags: Array.from(m.flags ?? []),
          size: m.size,
          subject: m.envelope?.subject ?? '(fără subiect)',
          from: m.envelope?.from?.[0] ? { name: m.envelope.from[0].name, address: m.envelope.from[0].address } : null,
          to: (m.envelope?.to ?? []).map((a: any) => ({ name: a.name, address: a.address })),
          date: m.envelope?.date ?? null,
          unread: !(m.flags ?? new Set()).has('\\Seen'),
        });
      }
      return { folder, total, messages };
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout();
  }
}

async function actionGetMessage(acct: any, folder: string, uid: number) {
  const imap = buildImap(acct);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(folder);
    try {
      const msg = await imap.fetchOne(String(uid), { source: true, envelope: true, uid: true, flags: true }, { uid: true });
      if (!msg) throw new Error('Message not found');
      const raw = msg.source?.toString('utf-8') ?? '';
      // basic parse: split headers / body
      const sepIdx = raw.indexOf('\r\n\r\n');
      const body = sepIdx >= 0 ? raw.slice(sepIdx + 4) : raw;
      // Mark as read
      await imap.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
      return {
        uid: msg.uid,
        subject: msg.envelope?.subject,
        from: msg.envelope?.from?.[0] ?? null,
        to: msg.envelope?.to ?? [],
        cc: msg.envelope?.cc ?? [],
        date: msg.envelope?.date,
        body_raw: body.slice(0, 200_000), // cap 200KB
        flags: Array.from(msg.flags ?? []),
      };
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout();
  }
}

async function actionSend(acct: any, payload: any) {
  const smtp = buildSmtp(acct);
  const info = await smtp.sendMail({
    from: acct.display_name ? `"${acct.display_name}" <${acct.email_address}>` : acct.email_address,
    to: payload.to,
    cc: payload.cc,
    bcc: payload.bcc,
    subject: payload.subject,
    text: payload.body_text,
    html: payload.body_html,
    inReplyTo: payload.in_reply_to,
    references: payload.references,
  });

  // Try append to Sent folder
  try {
    const imap = buildImap(acct);
    await imap.connect();
    try {
      const list = await imap.list();
      const sent = list.find((f: any) =>
        (f.specialUse === '\\Sent') ||
        /sent|trimise|elemente trimise/i.test(f.path),
      );
      if (sent) {
        const raw = `From: ${acct.email_address}\r\nTo: ${[].concat(payload.to).join(', ')}\r\nSubject: ${payload.subject ?? ''}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/${payload.body_html ? 'html' : 'plain'}; charset=utf-8\r\n\r\n${payload.body_html ?? payload.body_text ?? ''}`;
        await imap.append(sent.path, raw, ['\\Seen']);
      }
    } finally { await imap.logout(); }
  } catch (_) { /* non-fatal */ }

  return { ok: true, messageId: info.messageId };
}

async function actionFlag(acct: any, folder: string, uid: number, flag: string, add: boolean) {
  const imap = buildImap(acct);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(folder);
    try {
      if (add) await imap.messageFlagsAdd({ uid }, [flag], { uid: true });
      else await imap.messageFlagsRemove({ uid }, [flag], { uid: true });
      return { ok: true };
    } finally { lock.release(); }
  } finally { await imap.logout(); }
}

async function actionDelete(acct: any, folder: string, uid: number) {
  const imap = buildImap(acct);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(folder);
    try {
      await imap.messageDelete({ uid }, { uid: true });
      return { ok: true };
    } finally { lock.release(); }
  } finally { await imap.logout(); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!ENC_KEY_RAW) return json({ error: 'EMAIL_ENCRYPTION_KEY not configured' }, 500);
    const { supa, user } = await getUser(req);
    const body = await req.json();
    const action = String(body.action ?? '');

    if (action === 'save_account') {
      // Test first, then encrypt and save
      await actionTest(body);
      const { ct, iv } = await encryptPassword(String(body.password));
      const row = {
        user_id: user.id,
        email_address: body.email_address,
        display_name: body.display_name ?? null,
        imap_host: body.imap_host,
        imap_port: body.imap_port,
        imap_use_ssl: body.imap_use_ssl,
        smtp_host: body.smtp_host,
        smtp_port: body.smtp_port,
        smtp_use_ssl: body.smtp_use_ssl,
        username: body.username,
        encrypted_password: ct,
        encryption_iv: iv,
        signature: body.signature ?? null,
        is_default: true,
        last_test_status: 'ok',
        last_test_at: new Date().toISOString(),
      };
      const { data, error } = await supa
        .from('user_email_accounts')
        .upsert(row, { onConflict: 'user_id,email_address' })
        .select('id, email_address')
        .single();
      if (error) throw error;
      return json({ ok: true, account: data });
    }

    if (action === 'test_existing') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      const r = await actionTest({ ...acct, password: acct._password });
      return json(r);
    }

    if (action === 'list_folders') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json({ folders: await actionListFolders(acct) });
    }
    if (action === 'list_messages') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionListMessages(acct, body.folder ?? 'INBOX', body.limit ?? 30, body.search));
    }
    if (action === 'get_message') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionGetMessage(acct, body.folder ?? 'INBOX', Number(body.uid)));
    }
    if (action === 'send_message') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionSend(acct, body));
    }
    if (action === 'mark_read') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionFlag(acct, body.folder ?? 'INBOX', Number(body.uid), '\\Seen', true));
    }
    if (action === 'mark_unread') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionFlag(acct, body.folder ?? 'INBOX', Number(body.uid), '\\Seen', false));
    }
    if (action === 'delete_message') {
      const acct = await loadAccount(supa, user.id, body.account_id);
      return json(await actionDelete(acct, body.folder ?? 'INBOX', Number(body.uid)));
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('email-client error:', msg);
    return json({ error: msg }, 500);
  }
});