import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Position {
  ticker: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  currency: string; // USD, EUR, RON
  buy_date?: string;
  sell_date?: string;
}

interface TaxParams {
  tax_year: number;
  positions: Position[];
  exchange_rate_usd_ron?: number; // default ~4.6
  exchange_rate_eur_ron?: number; // default ~4.97
  salarii_minime_brute?: number;  // default 6 (pragul CASS)
  salariu_minim_brut?: number;    // default 3700 RON (2025)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const params: TaxParams = await req.json();
    
    const taxYear = params.tax_year || new Date().getFullYear();
    const positions = params.positions || [];
    const usdRon = params.exchange_rate_usd_ron || 4.60;
    const eurRon = params.exchange_rate_eur_ron || 4.97;
    const salMinBrut = params.salariu_minim_brut || 3700;
    const nrSalariiPrag = params.salarii_minime_brute || 6;
    const pragCASS = salMinBrut * nrSalariiPrag; // ~22.200 RON

    console.log(`[tax-calc] Calculating tax for ${positions.length} positions, year ${taxYear}`);

    let totalGainsRON = 0;
    let totalLossesRON = 0;
    const positionDetails: any[] = [];

    for (const pos of positions) {
      const gainInCurrency = (pos.sell_price - pos.buy_price) * pos.quantity;
      
      // Convert to RON
      let exchangeRate = 1;
      if (pos.currency === 'USD') exchangeRate = usdRon;
      else if (pos.currency === 'EUR') exchangeRate = eurRon;

      const gainRON = gainInCurrency * exchangeRate;

      if (gainRON >= 0) {
        totalGainsRON += gainRON;
      } else {
        totalLossesRON += Math.abs(gainRON);
      }

      positionDetails.push({
        ticker: pos.ticker,
        quantity: pos.quantity,
        buy_price: pos.buy_price,
        sell_price: pos.sell_price,
        currency: pos.currency,
        gain_in_currency: Number(gainInCurrency.toFixed(2)),
        exchange_rate: exchangeRate,
        gain_ron: Number(gainRON.toFixed(2)),
        buy_date: pos.buy_date,
        sell_date: pos.sell_date,
      });
    }

    // Net taxable = gains - losses (compensare)
    const netTaxableRON = Math.max(0, totalGainsRON - totalLossesRON);
    
    // Impozit 10%
    const tax10Percent = netTaxableRON * 0.10;
    
    // CASS 10% dacă depășește pragul
    const cassApplicable = netTaxableRON > pragCASS;
    // CASS se calculează la venitul net, dar plafonat la 60 salarii minime brute
    const cassBase = cassApplicable ? Math.min(netTaxableRON, salMinBrut * 60) : 0;
    const cassAmount = cassBase * 0.10;

    const totalTax = tax10Percent + cassAmount;

    const result = {
      tax_year: taxYear,
      positions_count: positions.length,
      total_gains_ron: Number(totalGainsRON.toFixed(2)),
      total_losses_ron: Number(totalLossesRON.toFixed(2)),
      net_taxable_ron: Number(netTaxableRON.toFixed(2)),
      tax_10_percent: Number(tax10Percent.toFixed(2)),
      cass_applicable: cassApplicable,
      cass_threshold_ron: pragCASS,
      cass_base_ron: Number(cassBase.toFixed(2)),
      cass_amount: Number(cassAmount.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      exchange_rates: { USD_RON: usdRon, EUR_RON: eurRon },
      positions: positionDetails,
      deadline: `25 mai ${taxYear + 1}`,
      declaration: "Declarația Unică (D212)",
      notes: [
        "Impozitul de 10% se aplică pe câștigul net realizat (câștiguri - pierderi).",
        cassApplicable 
          ? `CASS de 10% se aplică deoarece câștigul net (${netTaxableRON.toFixed(0)} RON) depășește pragul de ${pragCASS} RON (${nrSalariiPrag} salarii minime brute).`
          : `CASS NU se aplică deoarece câștigul net (${netTaxableRON.toFixed(0)} RON) este sub pragul de ${pragCASS} RON.`,
        "Pierderile se pot reporta pe maximum 7 ani fiscali consecutivi.",
        `Termenul de depunere a D212 este 25 mai ${taxYear + 1}.`,
        "⚠️ Aceste calcule sunt orientative. Consultă un consilier fiscal pentru situația ta specifică.",
      ],
    };

    // Save calculation to DB
    await supabase.from("investment_tax_calculations").insert({
      user_id: userId,
      tax_year: taxYear,
      total_gains_ron: result.total_gains_ron,
      total_losses_ron: result.total_losses_ron,
      net_taxable_ron: result.net_taxable_ron,
      tax_10_percent: result.tax_10_percent,
      cass_applicable: result.cass_applicable,
      cass_amount: result.cass_amount,
      exchange_rate_used: usdRon,
      positions_data: positionDetails,
    });

    console.log(`[tax-calc] Result: gains=${result.total_gains_ron}, losses=${result.total_losses_ron}, tax=${result.total_tax}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[tax-calc] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
