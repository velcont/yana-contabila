import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || Deno.env.get("PERPLEXITY_API_KEY_1");
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { tickers, query } = await req.json();

    // Build search query
    let searchQuery: string;
    if (tickers && Array.isArray(tickers) && tickers.length > 0) {
      const tickerList = tickers.slice(0, 10).join(", ");
      searchQuery = `Latest financial news and market sentiment for stocks: ${tickerList}. Include price movements, analyst ratings, earnings reports, and any significant events. Focus on the last 7 days.`;
    } else if (query) {
      searchQuery = `${query} - financial market news and sentiment analysis. Focus on recent developments in the last 7 days.`;
    } else {
      searchQuery = "Latest stock market news today, major market movers, important financial events and analyst recommendations for European and US markets.";
    }

    console.log(`[investment-news] Searching for: ${searchQuery.substring(0, 100)}...`);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are a financial news analyst. Analyze the latest news and provide sentiment analysis. 
For each ticker/topic, provide:
1. A sentiment score: BULLISH, BEARISH, or NEUTRAL
2. Key news headlines (max 3 per ticker)
3. Brief explanation of sentiment drivers
4. Risk factors to watch

Format your response in a structured way. Use Romanian language for the analysis.
Always include sources/citations when available.`
          },
          { role: "user", content: searchQuery }
        ],
        search_recency_filter: "week",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[investment-news] Perplexity error: ${response.status} ${errText}`);
      return new Response(JSON.stringify({ error: "Failed to fetch news sentiment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Nu am găsit știri relevante.";
    const citations = data.citations || [];

    console.log(`[investment-news] Got response with ${citations.length} citations`);

    return new Response(JSON.stringify({
      sentiment_analysis: content,
      citations,
      tickers_analyzed: tickers || [],
      searched_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[investment-news] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
