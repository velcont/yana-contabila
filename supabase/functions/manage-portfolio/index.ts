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

    const { action, positions, positionId } = await req.json();

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("user_portfolios")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ positions: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "add": {
        if (!positions || !Array.isArray(positions) || positions.length === 0) {
          return new Response(JSON.stringify({ error: "No positions provided" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const toInsert = positions.slice(0, 50).map((p: any) => ({
          user_id: userId,
          ticker: (p.ticker || "").toUpperCase().slice(0, 20),
          company_name: (p.company_name || "").slice(0, 200),
          platform: (p.platform || "").slice(0, 100),
          quantity: Number(p.quantity) || 0,
          avg_buy_price: Number(p.avg_buy_price) || 0,
          current_price: p.current_price ? Number(p.current_price) : null,
          currency: (p.currency || "USD").toUpperCase().slice(0, 5),
          asset_type: p.asset_type || "stock",
          sector: p.sector || null,
          notes: (p.notes || "").slice(0, 1000),
        }));

        const { data, error } = await supabase
          .from("user_portfolios")
          .insert(toInsert)
          .select();

        if (error) throw error;
        console.log(`[manage-portfolio] Added ${data.length} positions for user ${userId}`);
        return new Response(JSON.stringify({ added: data.length, positions: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "update": {
        if (!positionId) {
          return new Response(JSON.stringify({ error: "positionId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const updates: any = {};
        const pos = positions?.[0] || {};
        if (pos.quantity !== undefined) updates.quantity = Number(pos.quantity);
        if (pos.avg_buy_price !== undefined) updates.avg_buy_price = Number(pos.avg_buy_price);
        if (pos.current_price !== undefined) updates.current_price = Number(pos.current_price);
        if (pos.notes !== undefined) updates.notes = (pos.notes || "").slice(0, 1000);
        if (pos.platform !== undefined) updates.platform = pos.platform;

        const { data, error } = await supabase
          .from("user_portfolios")
          .update(updates)
          .eq("id", positionId)
          .eq("user_id", userId)
          .select();

        if (error) throw error;
        return new Response(JSON.stringify({ updated: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "close": {
        if (!positionId) {
          return new Response(JSON.stringify({ error: "positionId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const sellPrice = positions?.[0]?.sell_price;
        const { data, error } = await supabase
          .from("user_portfolios")
          .update({
            is_active: false,
            closed_at: new Date().toISOString(),
            sell_price: sellPrice ? Number(sellPrice) : null,
          })
          .eq("id", positionId)
          .eq("user_id", userId)
          .select();

        if (error) throw error;
        return new Response(JSON.stringify({ closed: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "summary": {
        const { data, error } = await supabase
          .from("user_portfolios")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (error) throw error;

        const totalValue = (data || []).reduce((sum: number, p: any) => {
          const price = p.current_price || p.avg_buy_price;
          return sum + (price * p.quantity);
        }, 0);

        const totalCost = (data || []).reduce((sum: number, p: any) => {
          return sum + (p.avg_buy_price * p.quantity);
        }, 0);

        const unrealizedPnL = totalValue - totalCost;
        const pnlPercent = totalCost > 0 ? (unrealizedPnL / totalCost * 100) : 0;

        // Group by sector
        const bySector: Record<string, number> = {};
        const byAssetType: Record<string, number> = {};
        const byPlatform: Record<string, number> = {};

        for (const p of (data || [])) {
          const val = (p.current_price || p.avg_buy_price) * p.quantity;
          const sector = p.sector || "Necunoscut";
          const type = p.asset_type || "stock";
          const platform = p.platform || "Necunoscut";

          bySector[sector] = (bySector[sector] || 0) + val;
          byAssetType[type] = (byAssetType[type] || 0) + val;
          byPlatform[platform] = (byPlatform[platform] || 0) + val;
        }

        return new Response(JSON.stringify({
          total_positions: (data || []).length,
          total_value: Number(totalValue.toFixed(2)),
          total_cost: Number(totalCost.toFixed(2)),
          unrealized_pnl: Number(unrealizedPnL.toFixed(2)),
          pnl_percent: Number(pnlPercent.toFixed(2)),
          by_sector: bySector,
          by_asset_type: byAssetType,
          by_platform: byPlatform,
          positions: data,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}. Use: list, add, update, close, summary` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

  } catch (error) {
    console.error("[manage-portfolio] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
