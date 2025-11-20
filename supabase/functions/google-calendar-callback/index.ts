import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // userId
    const error = url.searchParams.get('error');

    // User a refuzat autorizarea
    if (error) {
      console.error('❌ User a refuzat autorizarea:', error);
      return new Response(
        `<html><body><h2>Autorizare anulată</h2><p>Poți închide această fereastră.</p></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      throw new Error('Parametri lipsă în callback');
    }

    const userId = state;
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    console.log('📩 Schimbăm authorization code pentru tokens...');

    // Exchange authorization code pentru tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Eroare la schimbarea tokenului:', errorData);
      throw new Error('Nu am putut obține token-urile de la Google');
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      throw new Error('Token-uri incomplete primite de la Google');
    }

    console.log('✅ Token-uri primite cu succes');

    // Calculăm token_expiry
    const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

    // Salvăm în DB folosind service role key
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: dbError } = await supabase
      .from('calendar_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('❌ Eroare la salvare în DB:', dbError);
      throw dbError;
    }

    console.log('✅ Token-uri salvate în DB pentru userId:', userId);

    // Returnăm pagină HTML de succes care închide fereastra
    return new Response(
      `<html>
        <body>
          <h2>✅ Google Calendar conectat cu succes!</h2>
          <p>Poți închide această fereastră.</p>
          <script>
            window.opener?.postMessage({ type: 'google-calendar-connected' }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('❌ Eroare în google-calendar-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
    return new Response(
      `<html><body><h2>❌ Eroare</h2><p>${errorMessage}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
