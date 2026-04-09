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
    const { report_type = "full" } = body; // "full" | "summary" | "tax" | "allocation"

    // Get all portfolio positions
    const { data: positions, error: posError } = await supabase
      .from("user_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("asset_type", "alert");

    if (posError) {
      return new Response(JSON.stringify({ error: posError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!positions || positions.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Nu ai poziții active în portofoliu. Trimite un screenshot de pe platforma ta de trading pentru a salva pozițiile." 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get closed positions for tax report
    const { data: closedPositions } = await supabase
      .from("user_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "closed")
      .neq("asset_type", "alert");

    // === Calculate portfolio metrics ===
    let totalInvested = 0;
    let totalCurrentValue = 0;
    const sectorAllocation: Record<string, number> = {};
    const platformAllocation: Record<string, number> = {};
    const assetTypeAllocation: Record<string, number> = {};
    const currencyExposure: Record<string, number> = {};
    const positionDetails: any[] = [];

    for (const pos of positions) {
      const invested = (pos.quantity || 0) * (pos.avg_buy_price || 0);
      const currentValue = (pos.quantity || 0) * (pos.current_price || pos.avg_buy_price || 0);
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? ((currentValue / invested) - 1) * 100 : 0;

      totalInvested += invested;
      totalCurrentValue += currentValue;

      const sector = pos.sector || "Necunoscut";
      const platform = pos.platform || "Necunoscut";
      const assetType = pos.asset_type || "stock";
      const currency = pos.currency || "USD";

      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + currentValue;
      platformAllocation[platform] = (platformAllocation[platform] || 0) + currentValue;
      assetTypeAllocation[assetType] = (assetTypeAllocation[assetType] || 0) + currentValue;
      currencyExposure[currency] = (currencyExposure[currency] || 0) + currentValue;

      positionDetails.push({
        ticker: pos.ticker,
        company: pos.company_name,
        quantity: pos.quantity,
        avg_price: pos.avg_buy_price,
        current_price: pos.current_price,
        invested,
        current_value: parseFloat(currentValue.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnl_pct: parseFloat(pnlPct.toFixed(2)),
        weight_pct: 0, // Will be calculated after
        sector,
        platform,
        asset_type: assetType
      });
    }

    // Calculate weights
    for (const detail of positionDetails) {
      detail.weight_pct = totalCurrentValue > 0 
        ? parseFloat(((detail.current_value / totalCurrentValue) * 100).toFixed(2)) 
        : 0;
    }

    // Sort by weight descending
    positionDetails.sort((a, b) => b.weight_pct - a.weight_pct);

    // Convert allocations to percentages
    const toPercentMap = (map: Record<string, number>) => {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(map)) {
        result[key] = totalCurrentValue > 0 ? parseFloat(((value / totalCurrentValue) * 100).toFixed(2)) : 0;
      }
      return result;
    };

    // === Risk analysis ===
    const topPosition = positionDetails[0];
    const concentrationRisk = topPosition ? topPosition.weight_pct > 20 : false;
    const sectorCount = Object.keys(sectorAllocation).length;
    const diversificationScore = Math.min(10, sectorCount * 2 + (positions.length > 5 ? 2 : 0) + (Object.keys(currencyExposure).length > 1 ? 1 : 0));

    // === Realized P&L for tax ===
    let realizedPnL = 0;
    const closedDetails: any[] = [];
    if (closedPositions) {
      for (const pos of closedPositions) {
        const pnl = ((pos.current_price || 0) - (pos.avg_buy_price || 0)) * (pos.quantity || 0);
        realizedPnL += pnl;
        closedDetails.push({
          ticker: pos.ticker,
          pnl: parseFloat(pnl.toFixed(2)),
          closed_at: pos.updated_at
        });
      }
    }

    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? ((totalCurrentValue / totalInvested) - 1) * 100 : 0;

    const report = {
      success: true,
      report_type,
      generated_at: new Date().toISOString(),
      summary: {
        total_positions: positions.length,
        total_invested: parseFloat(totalInvested.toFixed(2)),
        total_current_value: parseFloat(totalCurrentValue.toFixed(2)),
        total_pnl: parseFloat(totalPnL.toFixed(2)),
        total_pnl_pct: parseFloat(totalPnLPct.toFixed(2)),
        realized_pnl: parseFloat(realizedPnL.toFixed(2)),
        unrealized_pnl: parseFloat(totalPnL.toFixed(2)),
        best_performer: positionDetails.reduce((a, b) => a.pnl_pct > b.pnl_pct ? a : b, positionDetails[0]),
        worst_performer: positionDetails.reduce((a, b) => a.pnl_pct < b.pnl_pct ? a : b, positionDetails[0]),
      },
      allocation: {
        by_sector: toPercentMap(sectorAllocation),
        by_platform: toPercentMap(platformAllocation),
        by_asset_type: toPercentMap(assetTypeAllocation),
        by_currency: toPercentMap(currencyExposure)
      },
      risk: {
        diversification_score: diversificationScore,
        diversification_rating: diversificationScore >= 7 ? "Bun" : diversificationScore >= 4 ? "Moderat" : "Slab",
        concentration_risk: concentrationRisk,
        top_position: topPosition ? `${topPosition.ticker} (${topPosition.weight_pct}%)` : "N/A",
        sector_count: sectorCount,
        warnings: [
          ...(concentrationRisk ? [`⚠️ Concentrare ridicată: ${topPosition.ticker} reprezintă ${topPosition.weight_pct}% din portofoliu`] : []),
          ...(sectorCount < 3 ? ["⚠️ Diversificare sectorială slabă (sub 3 sectoare)"] : []),
          ...(Object.keys(currencyExposure).length === 1 ? ["💡 Expunere pe o singură monedă - consideră diversificarea valutară"] : [])
        ]
      },
      positions: report_type === "summary" ? positionDetails.slice(0, 5) : positionDetails,
      tax_summary: {
        realized_gains: parseFloat(Math.max(0, realizedPnL).toFixed(2)),
        realized_losses: parseFloat(Math.min(0, realizedPnL).toFixed(2)),
        estimated_tax_10pct: parseFloat((Math.max(0, realizedPnL) * 0.10).toFixed(2)),
        cass_threshold_2025: 22800,
        cass_applicable: realizedPnL > 22800,
        estimated_cass: realizedPnL > 22800 ? parseFloat((realizedPnL * 0.10).toFixed(2)) : 0,
        closed_positions: closedDetails.length
      }
    };

    return new Response(JSON.stringify(report), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Portfolio report error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
