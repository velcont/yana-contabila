import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pagină HTML de confirmare dezabonare
function getSuccessPage(): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dezabonare YANA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      color: #0f766e;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      text-align: left;
      font-size: 14px;
      color: #92400e;
    }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    a:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Te-ai dezabonat cu succes</h1>
    <p>
      Nu vei mai primi emailuri proactive de la YANA. 
      <br>Poți reactiva notificările oricând din setările contului.
    </p>
    <div class="note">
      <strong>Notă:</strong> Vei primi în continuare emailuri importante legate de cont, securitate și facturare.
    </div>
    <a href="https://yanacontabila.ro/settings">Mergi la setări</a>
  </div>
</body>
</html>
  `.trim();
}

function getErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eroare - YANA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fef2f2;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #dc2626; font-size: 24px; margin-bottom: 16px; }
    p { color: #64748b; font-size: 16px; line-height: 1.6; }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      background: #0d9488;
      color: white;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>A apărut o eroare</h1>
    <p>${message}</p>
    <a href="https://yanacontabila.ro">Înapoi la YANA</a>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const token = url.searchParams.get("token"); // initiative_id ca token simplu de validare

    console.log(`[unsubscribe-yana-emails] Processing unsubscribe for user ${userId}`);

    if (!userId) {
      return new Response(getErrorPage("Link invalid - lipsește ID-ul utilizatorului."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validare: verifică dacă token-ul (initiative_id) există și aparține user-ului
    if (token) {
      const { data: initiative } = await supabase
        .from('yana_initiatives')
        .select('user_id')
        .eq('id', token)
        .single();

      if (!initiative || initiative.user_id !== userId) {
        console.log(`[unsubscribe-yana-emails] Invalid token for user ${userId}`);
        return new Response(getErrorPage("Link de dezabonare invalid sau expirat."), {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        });
      }
    }

    // Actualizează profilul
    const { error } = await supabase
      .from('profiles')
      .update({ yana_emails_enabled: false })
      .eq('id', userId);

    if (error) {
      console.error(`[unsubscribe-yana-emails] Error updating profile:`, error);
      return new Response(getErrorPage("Nu am putut procesa cererea. Încearcă din nou."), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }

    // Log în email_logs
    await supabase
      .from('email_logs')
      .insert({
        email_type: 'yana_unsubscribe',
        recipient_email: userId, // salvăm user_id în loc de email
        subject: 'Unsubscribe processed',
        status: 'sent',
        metadata: { user_id: userId, token },
      });

    console.log(`[unsubscribe-yana-emails] ✅ User ${userId} unsubscribed successfully`);

    return new Response(getSuccessPage(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[unsubscribe-yana-emails] Error:", error);
    return new Response(getErrorPage("A apărut o eroare neașteptată."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }
});
