import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      console.error('🔴 [RESET-PASSWORD] No email provided');
      throw new Error('Email is required');
    }

    console.log('🔐 [RESET-PASSWORD] Processing reset request for:', email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Dynamically determine the redirect URL from request headers
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const baseUrl = origin ? new URL(origin).origin : 'https://yana-contabila.lovable.app';
    const redirectTo = `${baseUrl}/auth?reset=true`;

    console.log('🔐 [RESET-PASSWORD] Redirect URL:', redirectTo);
    console.log('🔐 [RESET-PASSWORD] Origin:', origin);
    console.log('🔐 [RESET-PASSWORD] Base URL:', baseUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error('🔴 [RESET-PASSWORD] Supabase error:', error.message);
      throw error;
    }

    console.log('✅ [RESET-PASSWORD] Password reset email sent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset email sent successfully',
        redirectUrl: redirectTo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('🔴 [RESET-PASSWORD] Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
