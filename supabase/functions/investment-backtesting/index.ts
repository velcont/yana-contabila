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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { 
      ticker, 
      strategy, // "dca" | "lump_sum" | "compare"
      total_investment, 
      period_months = 12,
      dca_frequency = "monthly", // "weekly" | "monthly"
      currency = "USD"
    } = body;

    if (!ticker || !total_investment) {
      return new Response(JSON.stringify({ error: "Missing required: ticker, total_investment" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use Perplexity to get historical price data and simulate
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${perplexityKey}`
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{
          role: "user",
          content: `For ${ticker} stock, provide the monthly closing prices for the last ${period_months} months (most recent first). Format as JSON array: [{"month": "2026-03", "price": 185.50}, ...]. Only the JSON array, nothing else. If exact data unavailable, provide best estimates based on known prices.`
        }],
        max_tokens: 1000,
        temperature: 0
      })
    });

    if (!perplexityResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch historical data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const perplexityData = await perplexityResponse.json();
    const priceText = perplexityData.choices?.[0]?.message?.content?.trim() || "";
    
    // Extract JSON array from response
    let historicalPrices: { month: string; price: number }[] = [];
    try {
      const jsonMatch = priceText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        historicalPrices = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("Failed to parse price data:", e);
    }

    if (historicalPrices.length < 2) {
      return new Response(JSON.stringify({ 
        error: "Insufficient historical data",
        raw_response: priceText.substring(0, 200)
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sort oldest first
    historicalPrices.sort((a, b) => a.month.localeCompare(b.month));

    const currentPrice = historicalPrices[historicalPrices.length - 1].price;
    const startPrice = historicalPrices[0].price;

    // === LUMP SUM simulation ===
    const lumpSumShares = total_investment / startPrice;
    const lumpSumFinalValue = lumpSumShares * currentPrice;
    const lumpSumReturn = lumpSumFinalValue - total_investment;
    const lumpSumReturnPct = ((lumpSumFinalValue / total_investment) - 1) * 100;

    // === DCA simulation ===
    const numPurchases = historicalPrices.length;
    const dcaAmount = total_investment / numPurchases;
    let dcaTotalShares = 0;
    const dcaPurchases: { month: string; price: number; shares: number; invested: number }[] = [];

    for (const entry of historicalPrices) {
      const shares = dcaAmount / entry.price;
      dcaTotalShares += shares;
      dcaPurchases.push({
        month: entry.month,
        price: entry.price,
        shares: parseFloat(shares.toFixed(6)),
        invested: dcaAmount
      });
    }

    const dcaAvgPrice = total_investment / dcaTotalShares;
    const dcaFinalValue = dcaTotalShares * currentPrice;
    const dcaReturn = dcaFinalValue - total_investment;
    const dcaReturnPct = ((dcaFinalValue / total_investment) - 1) * 100;

    // === Build response ===
    const result = {
      success: true,
      ticker: ticker.toUpperCase(),
      period: `${historicalPrices[0].month} → ${historicalPrices[historicalPrices.length - 1].month}`,
      total_investment,
      currency,
      price_change: {
        start: startPrice,
        end: currentPrice,
        change_pct: parseFloat((((currentPrice / startPrice) - 1) * 100).toFixed(2))
      },
      lump_sum: {
        strategy: "Lump Sum (investiție integrală la început)",
        shares_bought: parseFloat(lumpSumShares.toFixed(6)),
        buy_price: startPrice,
        final_value: parseFloat(lumpSumFinalValue.toFixed(2)),
        profit_loss: parseFloat(lumpSumReturn.toFixed(2)),
        return_pct: parseFloat(lumpSumReturnPct.toFixed(2))
      },
      dca: {
        strategy: `DCA (${dcaFrequencyLabel(dca_frequency)}, ${numPurchases} cumpărări × ${dcaAmount.toFixed(2)} ${currency})`,
        total_shares: parseFloat(dcaTotalShares.toFixed(6)),
        avg_buy_price: parseFloat(dcaAvgPrice.toFixed(2)),
        final_value: parseFloat(dcaFinalValue.toFixed(2)),
        profit_loss: parseFloat(dcaReturn.toFixed(2)),
        return_pct: parseFloat(dcaReturnPct.toFixed(2)),
        purchases_summary: dcaPurchases.length > 6 
          ? [...dcaPurchases.slice(0, 3), { month: "...", price: 0, shares: 0, invested: 0 }, ...dcaPurchases.slice(-3)]
          : dcaPurchases
      },
      comparison: {
        winner: lumpSumReturn > dcaReturn ? "Lump Sum" : "DCA",
        difference: parseFloat(Math.abs(lumpSumReturn - dcaReturn).toFixed(2)),
        difference_pct: parseFloat(Math.abs(lumpSumReturnPct - dcaReturnPct).toFixed(2)),
        verdict: lumpSumReturn > dcaReturn 
          ? `Lump Sum a câștigat cu ${Math.abs(lumpSumReturn - dcaReturn).toFixed(2)} ${currency} mai mult (${Math.abs(lumpSumReturnPct - dcaReturnPct).toFixed(2)}%)`
          : `DCA a câștigat cu ${Math.abs(lumpSumReturn - dcaReturn).toFixed(2)} ${currency} mai mult (${Math.abs(lumpSumReturnPct - dcaReturnPct).toFixed(2)}%)`
      },
      insight: generateInsight(ticker, lumpSumReturnPct, dcaReturnPct, historicalPrices),
      sources: perplexityData.citations || []
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Backtesting error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function dcaFrequencyLabel(freq: string): string {
  switch (freq) {
    case "weekly": return "săptămânal";
    case "monthly": return "lunar";
    default: return "lunar";
  }
}

function generateInsight(ticker: string, lumpPct: number, dcaPct: number, prices: any[]): string {
  const volatility = calculateVolatility(prices.map(p => p.price));
  
  if (volatility > 30) {
    return `${ticker} a avut volatilitate ridicată (${volatility.toFixed(0)}%). În piețe volatile, DCA tinde să performeze mai bine deoarece mediază costul de achiziție. ${dcaPct > lumpPct ? 'Confirm acest lucru în simulare.' : 'Totuși, trendul ascendent puternic a favorizat Lump Sum.'}`;
  } else if (lumpPct > 0 && dcaPct > 0) {
    return `Ambele strategii au generat profit. ${lumpPct > dcaPct ? 'Lump Sum a câștigat datorită trendului ascendent constant.' : 'DCA a câștigat datorită punctelor de intrare mai bune în perioadele de scădere.'}`;
  } else {
    return `Perioada analizată a fost dificilă pentru ${ticker}. ${dcaPct > lumpPct ? 'DCA a limitat pierderile prin diversificarea temporală.' : 'Ambele strategii au suferit din cauza scăderii prețului.'}`;
  }
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1] * 100);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(12); // Annualized
}
