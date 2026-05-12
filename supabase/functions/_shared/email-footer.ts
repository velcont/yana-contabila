// ============================================================
// Shared compliance footer for ALL YANA emails (anti-spam, GDPR/CAN-SPAM)
// Conține: identificare expeditor, adresa fizică, link unsubscribe,
// link manage preferences. Necesar pentru ca inbox providers (Gmail,
// Outlook, Yahoo) să nu marcheze ca spam.
// ============================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const APP_URL = 'https://yana-contabila.velcont.com';

export interface FooterOptions {
  userId: string;
  /** Optional: token (initiative_id) for one-click unsubscribe validation */
  unsubscribeToken?: string;
  /** Type of email — shown in footer so user knows ce primește */
  emailTypeLabel?: string;
}

/**
 * Generează un token deterministic HMAC-SHA256 pentru dezabonare,
 * folosit când nu există un initiative_id (ex: briefing zilnic).
 * Cheia este SUPABASE_SERVICE_ROLE_KEY (privată, accesibilă doar în edge functions).
 */
export async function signUnsubscribeToken(userId: string): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`unsub:${userId}`));
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `hmac:${hex}`;
}

/**
 * Generează footer HTML conform standardelor anti-spam:
 * - Numele și adresa expeditorului (fizică)
 * - Motiv pentru care primește emailul
 * - Link de dezabonare cu un singur click
 * - Link de management preferințe
 */
export async function renderEmailFooter(opts: FooterOptions): Promise<string> {
  const { userId, unsubscribeToken, emailTypeLabel } = opts;

  const token = unsubscribeToken || await signUnsubscribeToken(userId);
  const tokenParam = `&token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe-yana-emails?user_id=${userId}${tokenParam}`;
  const preferencesUrl = `${APP_URL}/settings?tab=notifications`;

  const reasonLine = emailTypeLabel
    ? `Primești acest email pentru că ai activat <strong>${emailTypeLabel}</strong> în contul tău YANA.`
    : `Primești acest email pentru că ești utilizator activ YANA.`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    <tr>
      <td style="font-family: -apple-system, 'Segoe UI', Tahoma, sans-serif; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
        <p style="margin: 0 0 8px;">${reasonLine}</p>

        <p style="margin: 0 0 8px;">
          <a href="${preferencesUrl}" style="color: #6366f1; text-decoration: underline; margin: 0 6px;">Gestionează preferințe email</a>
          •
          <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline; margin: 0 6px;">Dezabonare cu un singur click</a>
        </p>

        <p style="margin: 12px 0 4px; color: #9ca3af;">
          <strong style="color: #4b5563;">YANA</strong> — AI Business Companion
        </p>
        <p style="margin: 0 0 4px; color: #9ca3af;">
          Operator: Suciu Gyorfi Nicolae
        </p>
        <p style="margin: 0 0 4px; color: #9ca3af;">
          Sediu: România · Contact: <a href="mailto:office@velcont.com" style="color: #9ca3af; text-decoration: underline;">office@velcont.com</a>
        </p>
        <p style="margin: 0; color: #9ca3af;">
          © ${new Date().getFullYear()} YANA by Velcont · <a href="${APP_URL}/privacy" style="color: #9ca3af; text-decoration: underline;">Politică de confidențialitate</a> · <a href="${APP_URL}/terms" style="color: #9ca3af; text-decoration: underline;">Termeni</a>
        </p>
      </td>
    </tr>
  </table>`;
}
