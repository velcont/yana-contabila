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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const healthChecks = [];

    // 1. Check Database Connection
    const dbStartTime = Date.now();
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const dbResponseTime = Date.now() - dbStartTime;
      
      healthChecks.push({
        check_type: 'database',
        status: dbError ? 'down' : (dbResponseTime > 1000 ? 'degraded' : 'healthy'),
        response_time_ms: dbResponseTime,
        error_message: dbError?.message || null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        check_type: 'database',
        status: 'down',
        response_time_ms: Date.now() - dbStartTime,
        error_message: errorMessage,
      });
    }

    // 2. Check Auth Service
    const authStartTime = Date.now();
    try {
      const { error: authError } = await supabase.auth.getSession();
      const authResponseTime = Date.now() - authStartTime;
      
      healthChecks.push({
        check_type: 'auth',
        status: authError ? 'down' : (authResponseTime > 500 ? 'degraded' : 'healthy'),
        response_time_ms: authResponseTime,
        error_message: authError?.message || null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        check_type: 'auth',
        status: 'down',
        response_time_ms: Date.now() - authStartTime,
        error_message: errorMessage,
      });
    }

    // 3. Check Storage Service
    const storageStartTime = Date.now();
    try {
      const { error: storageError } = await supabase
        .storage
        .from('balance-attachments')
        .list('', { limit: 1 });
      
      const storageResponseTime = Date.now() - storageStartTime;
      
      healthChecks.push({
        check_type: 'storage',
        status: storageError ? 'down' : (storageResponseTime > 1000 ? 'degraded' : 'healthy'),
        response_time_ms: storageResponseTime,
        error_message: storageError?.message || null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        check_type: 'storage',
        status: 'down',
        response_time_ms: Date.now() - storageStartTime,
        error_message: errorMessage,
      });
    }

    // 4. Check OpenAI API (if key exists)
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      const openaiStartTime = Date.now();
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
          },
        });
        
        const openaiResponseTime = Date.now() - openaiStartTime;
        
        healthChecks.push({
          check_type: 'openai_api',
          status: response.ok ? (openaiResponseTime > 2000 ? 'degraded' : 'healthy') : 'down',
          response_time_ms: openaiResponseTime,
          error_message: response.ok ? null : await response.text(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        healthChecks.push({
          check_type: 'openai_api',
          status: 'down',
          response_time_ms: Date.now() - openaiStartTime,
          error_message: errorMessage,
        });
      }
    }

    // Save health checks to database
    for (const check of healthChecks) {
      await supabase
        .from('system_health')
        .insert(check);
    }

    // Determine overall status
    const overallStatus = healthChecks.some(c => c.status === 'down') 
      ? 'down' 
      : healthChecks.some(c => c.status === 'degraded')
      ? 'degraded'
      : 'healthy';

    console.log('Health check completed:', { overallStatus, checks: healthChecks });

    return new Response(
      JSON.stringify({
        status: overallStatus,
        checks: healthChecks,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: overallStatus === 'down' ? 503 : 200,
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
