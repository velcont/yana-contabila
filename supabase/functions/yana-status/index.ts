import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-samanta-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify secret header
    const secret = req.headers.get('x-samanta-secret');
    const expectedSecret = Deno.env.get('SAMANTA_SECRET');

    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      profilesTotal,
      profilesActive,
      analysesTotal,
      analysesToday,
      conversationsTotal,
      conversationsToday,
      activeSubscriptions,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
      supabase.from('analyses').select('id', { count: 'exact', head: true }),
      supabase.from('analyses').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('ai_conversations').select('id', { count: 'exact', head: true }),
      supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    ]);

    return new Response(JSON.stringify({
      utilizatori_total: profilesTotal.count ?? 0,
      utilizatori_activi_30zile: profilesActive.count ?? 0,
      analize_total: analysesTotal.count ?? 0,
      analize_azi: analysesToday.count ?? 0,
      conversatii_total: conversationsTotal.count ?? 0,
      conversatii_azi: conversationsToday.count ?? 0,
      abonamente_active: activeSubscriptions.count ?? 0,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('yana-status error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
