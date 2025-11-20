import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID necesar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // URL-ul de redirect către callback-ul nostru
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Scopes necesare pentru citire evenimente din calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    // Construim URL-ul de autorizare Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline'); // Pentru refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Forțează refresh token
    authUrl.searchParams.set('state', userId); // Păstrăm userId în state

    console.log('✅ OAuth URL generat pentru userId:', userId);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Eroare în google-calendar-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
