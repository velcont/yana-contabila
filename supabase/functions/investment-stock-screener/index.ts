import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const {
      criteria = {},
      sector,
      market = "US",
      limit = 10,
      strategy // "value" | "growth" | "dividend" | "momentum" | custom
    } = body;

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build screening query based on strategy or custom criteria
    let screeningPrompt = "";
    
    if (strategy) {
      switch (strategy) {
        case "value":
          screeningPrompt = `Find ${limit} undervalued stocks in the ${market} market${sector ? ` in the ${sector} sector` : ''}. Criteria: P/E ratio below 15, P/B ratio below 2, dividend yield above 2%, positive earnings growth. Focus on established companies with strong fundamentals.`;
          break;
        case "growth":
          screeningPrompt = `Find ${limit} high-growth stocks in the ${market} market${sector ? ` in the ${sector} sector` : ''}. Criteria: Revenue growth above 20% YoY, EPS growth above 15%, market cap above $5B. Focus on companies with strong momentum and innovation.`;
          break;
        case "dividend":
          screeningPrompt = `Find ${limit} best dividend stocks in the ${market} market${sector ? ` in the ${sector} sector` : ''}. Criteria: Dividend yield above 3%, dividend growth for at least 5 consecutive years, payout ratio below 75%, stable earnings. Include Dividend Aristocrats if applicable.`;
          break;
        case "momentum":
          screeningPrompt = `Find ${limit} stocks with the strongest momentum in the ${market} market${sector ? ` in the ${sector} sector` : ''}. Criteria: Price above 200-day moving average, RSI between 50-70, positive MACD, strong volume. Focus on current market leaders.`;
          break;
        default:
          screeningPrompt = `Find ${limit} recommended stocks in the ${market} market${sector ? ` in the ${sector} sector` : ''} for a balanced portfolio.`;
      }
    } else {
      // Custom criteria
      const parts: string[] = [];
      if (criteria.pe_max) parts.push(`P/E ratio below ${criteria.pe_max}`);
      if (criteria.pe_min) parts.push(`P/E ratio above ${criteria.pe_min}`);
      if (criteria.dividend_yield_min) parts.push(`dividend yield above ${criteria.dividend_yield_min}%`);
      if (criteria.market_cap_min) parts.push(`market cap above $${criteria.market_cap_min}B`);
      if (criteria.revenue_growth_min) parts.push(`revenue growth above ${criteria.revenue_growth_min}%`);
      if (criteria.debt_equity_max) parts.push(`debt-to-equity below ${criteria.debt_equity_max}`);
      if (criteria.beta_max) parts.push(`beta below ${criteria.beta_max}`);
      
      screeningPrompt = `Find ${limit} stocks in the ${market} market${sector ? ` in the ${sector} sector` : ''} matching: ${parts.join(', ') || 'general good fundamentals'}.`;
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${perplexityKey}`
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{
          role: "user",
          content: `${screeningPrompt}

For each stock, provide this data as a JSON array:
[{
  "ticker": "AAPL",
  "company": "Apple Inc",
  "sector": "Technology",
  "price": 185.50,
  "pe_ratio": 28.5,
  "pb_ratio": 42.1,
  "dividend_yield": 0.55,
  "market_cap_b": 2800,
  "revenue_growth_pct": 8.2,
  "eps_growth_pct": 12.5,
  "debt_equity": 1.8,
  "beta": 1.24,
  "52w_high": 199.62,
  "52w_low": 164.08,
  "recommendation": "Short analysis of why this stock fits"
}]

Return ONLY the JSON array. Use actual current data.`
        }],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Screening query failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    
    let stocks: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        stocks = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("Failed to parse screening results:", e);
    }

    const result = {
      success: true,
      strategy: strategy || "custom",
      market,
      sector: sector || "all",
      criteria_used: strategy ? `Strategy: ${strategy}` : criteria,
      stocks,
      count: stocks.length,
      screened_at: new Date().toISOString(),
      sources: data.citations || [],
      disclaimer: "Datele sunt orientative și pot avea întârziere. Verifică întotdeauna pe platforma ta de trading înainte de a lua decizii."
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Stock screener error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
