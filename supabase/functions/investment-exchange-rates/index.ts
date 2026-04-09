import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// BNR API for official exchange rates
const BNR_XML_URL = "https://www.bnr.ro/nbrfxrates.xml";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { currencies, amount, from, to } = body;

    // Fetch BNR rates
    let bnrRates: Record<string, number> = {};
    let bnrDate = "";

    try {
      const bnrResponse = await fetch(BNR_XML_URL, { signal: AbortSignal.timeout(8000) });
      if (bnrResponse.ok) {
        const xmlText = await bnrResponse.text();
        
        // Parse XML for rates
        const dateMatch = xmlText.match(/Cube date="([^"]+)"/);
        bnrDate = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];
        
        const rateRegex = /<Rate currency="(\w+)"(?:\s+multiplier="(\d+)")?>([0-9.]+)<\/Rate>/g;
        let match;
        while ((match = rateRegex.exec(xmlText)) !== null) {
          const currency = match[1];
          const multiplier = parseInt(match[2] || "1");
          const rate = parseFloat(match[3]) / multiplier;
          bnrRates[currency] = rate;
        }
        bnrRates["RON"] = 1;
      }
    } catch (e) {
      console.warn("BNR fetch failed:", e);
    }

    // Fallback rates if BNR fails
    if (Object.keys(bnrRates).length === 0) {
      bnrRates = {
        "RON": 1,
        "EUR": 4.9770,
        "USD": 4.5950,
        "GBP": 5.7800,
        "CHF": 5.0500,
        "HUF": 0.01235,
        "PLN": 1.1680,
        "CZK": 0.1975,
        "BGN": 2.5445,
        "TRY": 0.1265,
        "JPY": 0.0310,
        "CAD": 3.3900,
        "AUD": 3.0200,
        "SEK": 0.4450,
        "NOK": 0.4350,
        "DKK": 0.6680,
      };
      bnrDate = "fallback";
    }

    // If conversion requested
    if (amount && from && to) {
      const fromRate = bnrRates[from.toUpperCase()];
      const toRate = bnrRates[to.toUpperCase()];
      
      if (!fromRate || !toRate) {
        return new Response(JSON.stringify({ 
          error: `Currency not found: ${!fromRate ? from : to}`,
          available: Object.keys(bnrRates)
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Convert: amount in FROM → RON → TO
      const amountInRON = amount * fromRate;
      const result = amountInRON / toRate;

      return new Response(JSON.stringify({
        success: true,
        conversion: {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          amount,
          result: parseFloat(result.toFixed(4)),
          rate: parseFloat((fromRate / toRate).toFixed(6)),
          inverse_rate: parseFloat((toRate / fromRate).toFixed(6))
        },
        bnr_date: bnrDate,
        rates_used: {
          [`${from.toUpperCase()}/RON`]: fromRate,
          [`${to.toUpperCase()}/RON`]: toRate
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return all rates or filtered
    const requestedCurrencies = currencies && currencies.length > 0
      ? currencies.map((c: string) => c.toUpperCase())
      : Object.keys(bnrRates);

    const filteredRates: Record<string, any> = {};
    for (const curr of requestedCurrencies) {
      if (bnrRates[curr]) {
        filteredRates[curr] = {
          rate_to_ron: bnrRates[curr],
          rate_from_ron: parseFloat((1 / bnrRates[curr]).toFixed(6))
        };
      }
    }

    // Key investment rates
    const investmentRates = {
      "USD/RON": bnrRates["USD"] || 4.595,
      "EUR/RON": bnrRates["EUR"] || 4.977,
      "GBP/RON": bnrRates["GBP"] || 5.780,
      "EUR/USD": bnrRates["EUR"] && bnrRates["USD"] ? parseFloat((bnrRates["EUR"] / bnrRates["USD"]).toFixed(4)) : 1.083,
    };

    return new Response(JSON.stringify({
      success: true,
      bnr_date: bnrDate,
      source: bnrDate === "fallback" ? "Cursuri estimative (BNR indisponibil)" : "Banca Națională a României (BNR)",
      rates: filteredRates,
      investment_rates: investmentRates,
      currencies_available: Object.keys(bnrRates).length
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Exchange rates error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
