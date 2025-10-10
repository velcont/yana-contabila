import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cost per 1M tokens (in USD cents)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro": { input: 125, output: 500 },      // $1.25/$5.00
  "google/gemini-2.5-flash": { input: 7.5, output: 30 },    // $0.075/$0.30
  "google/gemini-2.5-flash-lite": { input: 2, output: 10 }, // $0.02/$0.10
  "openai/gpt-5": { input: 250, output: 1000 },             // $2.50/$10.00
  "openai/gpt-5-mini": { input: 15, output: 60 },           // $0.15/$0.60
  "openai/gpt-5-nano": { input: 4, output: 16 },            // $0.04/$0.16
};

interface UsageData {
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestDurationMs?: number;
  success: boolean;
  errorMessage?: string;
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = TOKEN_COSTS[model] || { input: 10, output: 30 }; // default fallback
  
  // Cost = (input_tokens / 1M * input_cost) + (output_tokens / 1M * output_cost)
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  
  return Math.ceil(inputCost + outputCost); // Round up to nearest cent
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Autentificare necesară" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usageData: UsageData = await req.json();
    
    const totalTokens = usageData.inputTokens + usageData.outputTokens;
    const estimatedCostCents = calculateCost(
      usageData.model,
      usageData.inputTokens,
      usageData.outputTokens
    );
    
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Insert usage record
    const { error: insertError } = await supabase
      .from("ai_usage")
      .insert({
        user_id: user.id,
        endpoint: usageData.endpoint,
        model: usageData.model,
        input_tokens: usageData.inputTokens,
        output_tokens: usageData.outputTokens,
        total_tokens: totalTokens,
        estimated_cost_cents: estimatedCostCents,
        request_duration_ms: usageData.requestDurationMs,
        success: usageData.success,
        error_message: usageData.errorMessage,
        month_year: monthYear,
      });

    if (insertError) {
      console.error("Error inserting usage:", insertError);
      throw insertError;
    }

    // Check budget and create alert if needed
    const { data: budgetCheck } = await supabase.rpc("check_ai_budget", {
      p_user_id: user.id,
    });

    const budgetData = budgetCheck?.[0];
    
    // Create alert if usage > 80%
    if (budgetData && budgetData.usage_percent > 80) {
      const { data: existingAlert } = await supabase
        .from("chat_insights")
        .select("id")
        .eq("user_id", user.id)
        .eq("insight_type", "ai_budget_alert")
        .eq("is_read", false)
        .single();

      // Only create alert if none exists for this month
      if (!existingAlert) {
        await supabase.from("chat_insights").insert({
          user_id: user.id,
          insight_type: "ai_budget_alert",
          title: "⚠️ Buget AI Aproape Epuizat",
          description: `Ai folosit ${budgetData.usage_percent.toFixed(1)}% din bugetul lunar ($${(budgetData.budget_cents / 100).toFixed(2)}). Cost curent: $${(budgetData.current_usage_cents / 100).toFixed(2)}`,
          severity: budgetData.usage_percent > 90 ? "critical" : "warning",
          metadata: {
            usage_percent: budgetData.usage_percent,
            current_usage_cents: budgetData.current_usage_cents,
            budget_cents: budgetData.budget_cents,
            month_year: monthYear,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        usage: {
          tokens: totalTokens,
          cost_cents: estimatedCostCents,
          cost_usd: (estimatedCostCents / 100).toFixed(4),
        },
        budget: budgetData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-ai-usage:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
