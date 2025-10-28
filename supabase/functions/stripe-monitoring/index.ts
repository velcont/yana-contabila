import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-MONITORING] ${step}${detailsStr}`);
};

/**
 * 🔒 FIX #10: Stripe API Usage & Cost Monitoring
 * 
 * This edge function tracks all Stripe API calls made by YANA to:
 * 1. Monitor API request volume
 * 2. Estimate costs (Stripe charges per API call for high volume)
 * 3. Detect unusual patterns (potential abuse/bugs)
 * 4. Generate alerts when thresholds are exceeded
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Monitoring request received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error("Authentication failed");

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin authenticated", { adminId: user.id });

    // Get Stripe API usage from audit logs
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: stripeApiCalls, error: logsError } = await supabaseClient
      .from('audit_logs')
      .select('action_type, created_at, metadata')
      .or('action_type.like.%STRIPE%,action_type.like.%CHECKOUT%,action_type.like.%SUBSCRIPTION%')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    if (logsError) {
      logStep("Error fetching logs", { error: logsError });
      throw logsError;
    }

    // Aggregate statistics
    const stats = {
      totalCalls: stripeApiCalls?.length || 0,
      callsByType: {} as Record<string, number>,
      callsByDay: {} as Record<string, number>,
      estimatedCost: 0,
      averageCallsPerDay: 0,
    };

    stripeApiCalls?.forEach(log => {
      // Count by type
      stats.callsByType[log.action_type] = (stats.callsByType[log.action_type] || 0) + 1;
      
      // Count by day
      const day = log.created_at.split('T')[0];
      stats.callsByDay[day] = (stats.callsByDay[day] || 0) + 1;
    });

    // Estimate costs (Stripe API is free for most use cases, but monitor anyway)
    // Stripe charges for high-volume API usage (>1M requests/month)
    stats.averageCallsPerDay = stats.totalCalls / 30;
    stats.estimatedCost = Math.max(0, (stats.totalCalls - 100000) * 0.0001); // Rough estimate

    // Check for alerts
    const alerts = [];
    
    if (stats.averageCallsPerDay > 1000) {
      alerts.push({
        severity: 'high',
        title: 'High Stripe API Usage',
        description: `Averaging ${Math.round(stats.averageCallsPerDay)} calls/day. Consider optimization.`,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (stats.callsByDay[today] && stats.callsByDay[today] > 500) {
      alerts.push({
        severity: 'medium',
        title: 'High Stripe API Usage Today',
        description: `${stats.callsByDay[today]} calls today. Monitor for unusual activity.`,
      });
    }

    // Create admin alerts if necessary
    for (const alert of alerts) {
      await supabaseClient.from('admin_alerts').insert({
        alert_type: 'STRIPE_API_USAGE',
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        details: {
          stats,
          timestamp: new Date().toISOString()
        }
      });
    }

    logStep("Monitoring completed", { stats, alertsCreated: alerts.length });

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        alerts,
        recommendations: [
          stats.averageCallsPerDay > 500 
            ? "Consider caching Stripe data to reduce API calls" 
            : null,
          stats.totalCalls > 50000 
            ? "Review API call patterns for optimization opportunities" 
            : null,
        ].filter(Boolean)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
