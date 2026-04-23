import { GOOGLE_TOKEN_URL, getRedirectUri, getServiceClient } from "../_shared/google-calendar.ts";

function htmlResponse(title: string, body: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
    .card{max-width:480px;background:#171717;border:1px solid #262626;border-radius:12px;padding:32px}
    h1{margin:0 0 12px;font-size:20px}p{margin:8px 0;color:#a3a3a3;line-height:1.5}
    a{color:#60a5fa;text-decoration:none}</style></head>
    <body><div class="card">${body}</div>
    <script>setTimeout(()=>{try{window.close()}catch(e){};window.location.href="/settings?gcal=connected"},2500)</script>
    </body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errParam = url.searchParams.get("error");

    if (errParam) {
      return htmlResponse("Eroare", `<h1>❌ Autorizare refuzată</h1><p>${errParam}</p><p>Poți închide această fereastră.</p>`, 400);
    }
    if (!code || !state) {
      return htmlResponse("Eroare", `<h1>❌ Lipsesc parametri</h1><p>Code sau state nu au fost primiți de la Google.</p>`, 400);
    }

    let userId: string;
    let returnTo: string;
    try {
      const decoded = atob(state);
      const [uid, ret] = decoded.split("|");
      userId = uid;
      returnTo = ret || "/settings";
    } catch {
      return htmlResponse("Eroare", `<h1>❌ State invalid</h1>`, 400);
    }

    const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;

    // Schimb code pentru tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error("Token exchange failed:", t);
      return htmlResponse("Eroare", `<h1>❌ Schimbul de token a eșuat</h1><p>${t}</p>`, 400);
    }

    const tokens = await tokenRes.json() as {
      access_token: string; refresh_token?: string; expires_in: number; scope: string; token_type: string;
    };

    if (!tokens.refresh_token) {
      return htmlResponse("Atenție",
        `<h1>⚠️ Lipsește refresh_token</h1>
        <p>Google nu a returnat refresh_token. Mergi la <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>, revocă accesul aplicației, apoi încearcă din nou.</p>`, 400);
    }

    // Aflu emailul calendarului
    let calendarEmail: string | null = null;
    try {
      const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (ui.ok) {
        const j = await ui.json();
        calendarEmail = j.email || null;
      }
    } catch (_) { /* ignore */ }

    const expiryAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const svc = getServiceClient();

    const { error: upsertErr } = await svc
      .from("user_google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || "Bearer",
        expiry_at: expiryAt,
        scopes: tokens.scope ? tokens.scope.split(" ") : null,
        calendar_email: calendarEmail,
        is_active: true,
      }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("Upsert tokens failed:", upsertErr);
      return htmlResponse("Eroare", `<h1>❌ Salvarea tokenului a eșuat</h1><p>${upsertErr.message}</p>`, 500);
    }

    return htmlResponse("Conectat",
      `<h1>✅ Google Calendar conectat</h1>
      <p><strong>${calendarEmail || "Cont"}</strong> este acum legat de YANA.</p>
      <p>Te redirecționăm înapoi în aplicație...</p>`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("callback error:", msg);
    return htmlResponse("Eroare", `<h1>❌ Eroare</h1><p>${msg}</p>`, 500);
  }
});