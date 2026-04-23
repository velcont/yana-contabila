// Shared helpers for Google Calendar OAuth + API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_CAL_API = "https://www.googleapis.com/calendar/v3";
export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getRedirectUri(): string {
  const projectRef = Deno.env.get("VITE_SUPABASE_PROJECT_ID") ?? "ygfsuoloxzjpiulogrjz";
  return `https://${projectRef}.supabase.co/functions/v1/google-calendar-oauth-callback`;
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

export async function getUserClient(authHeader: string | null) {
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await client.auth.getUser();
  return user ? { client, user } : null;
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed [${res.status}]: ${text}`);
  }
  return await res.json() as { access_token: string; expires_in: number; token_type: string };
}

export async function getValidAccessToken(userId: string): Promise<{ accessToken: string; calendarEmail: string | null }> {
  const svc = getServiceClient();
  const { data: tokenRow, error } = await svc
    .from("user_google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`DB error: ${error.message}`);
  if (!tokenRow) throw new Error("Google Calendar nu este conectat pentru acest utilizator");

  const expiry = new Date(tokenRow.expiry_at).getTime();
  const now = Date.now();

  // refresh dacă expiră în <2 minute
  if (expiry - now < 120000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    const newExpiry = new Date(now + refreshed.expires_in * 1000).toISOString();
    await svc
      .from("user_google_calendar_tokens")
      .update({
        access_token: refreshed.access_token,
        expiry_at: newExpiry,
      })
      .eq("user_id", userId);
    return { accessToken: refreshed.access_token, calendarEmail: tokenRow.calendar_email };
  }

  return { accessToken: tokenRow.access_token, calendarEmail: tokenRow.calendar_email };
}

export async function gcalFetch(userId: string, path: string, init?: RequestInit) {
  const { accessToken } = await getValidAccessToken(userId);
  const res = await fetch(`${GOOGLE_CAL_API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`Google Calendar API ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}