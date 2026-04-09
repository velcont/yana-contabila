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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, ticker, target_price, direction, alert_id } = body;

    switch (action) {
      case "create": {
        if (!ticker || !target_price || !direction) {
          return new Response(JSON.stringify({ error: "Missing required fields: ticker, target_price, direction (above/below)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check current price via Perplexity
        const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
        let currentPrice: number | null = null;
        
        if (perplexityKey) {
          try {
            const priceResponse = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${perplexityKey}`
              },
              body: JSON.stringify({
                model: "sonar",
                messages: [{
                  role: "user",
                  content: `What is the current stock price of ${ticker} right now? Return ONLY the number, nothing else. Example: 182.52`
                }],
                max_tokens: 50,
                temperature: 0
              })
            });
            
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              const priceText = priceData.choices?.[0]?.message?.content?.trim();
              const parsed = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '');
              if (!isNaN(parsed)) currentPrice = parsed;
            }
          } catch (e) {
            console.warn("Price check failed:", e);
          }
        }

        // Store alert in user_portfolios metadata or a dedicated approach
        // For now we store alerts as JSON in a simple structure
        const alertData = {
          id: crypto.randomUUID(),
          ticker: ticker.toUpperCase(),
          target_price,
          direction, // "above" or "below"
          current_price_at_creation: currentPrice,
          created_at: new Date().toISOString(),
          status: "active",
          triggered: false
        };

        // Check if alert is already triggered
        if (currentPrice !== null) {
          if (direction === "above" && currentPrice >= target_price) {
            alertData.triggered = true;
            alertData.status = "triggered_immediately";
          } else if (direction === "below" && currentPrice <= target_price) {
            alertData.triggered = true;
            alertData.status = "triggered_immediately";
          }
        }

        // Store in user's portfolio notes or a dedicated table approach
        // Using upsert on a JSONB field in user metadata
        const { data: existing } = await supabase
          .from("user_portfolios")
          .select("notes")
          .eq("user_id", user.id)
          .eq("ticker", `ALERT_${alertData.id.substring(0, 8)}`)
          .maybeSingle();

        await supabase.from("user_portfolios").insert({
          user_id: user.id,
          ticker: `ALERT_${ticker.toUpperCase()}`,
          company_name: `Price Alert: ${ticker.toUpperCase()} ${direction} ${target_price}`,
          quantity: 0,
          avg_buy_price: target_price,
          current_price: currentPrice || 0,
          currency: "USD",
          asset_type: "alert",
          status: alertData.status === "triggered_immediately" ? "closed" : "active",
          notes: JSON.stringify(alertData)
        });

        const response: any = {
          success: true,
          alert: alertData,
          message: alertData.triggered 
            ? `⚡ Alertă ${ticker.toUpperCase()}: Prețul curent (${currentPrice}) ${direction === 'above' ? 'depășește deja' : 'este deja sub'} ${target_price}!`
            : `✅ Alertă creată: ${ticker.toUpperCase()} - Notificare când prețul ${direction === 'above' ? 'depășește' : 'scade sub'} ${target_price}. Preț curent: ${currentPrice || 'necunoscut'}.`
        };

        return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list": {
        const { data: alerts } = await supabase
          .from("user_portfolios")
          .select("*")
          .eq("user_id", user.id)
          .eq("asset_type", "alert")
          .eq("status", "active");

        const parsedAlerts = (alerts || []).map((a: any) => {
          try {
            const alertInfo = JSON.parse(a.notes || "{}");
            return {
              id: a.id,
              ticker: alertInfo.ticker || a.ticker,
              target_price: alertInfo.target_price || a.avg_buy_price,
              direction: alertInfo.direction || "above",
              current_price_at_creation: alertInfo.current_price_at_creation,
              created_at: a.created_at,
              status: a.status
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        return new Response(JSON.stringify({ 
          success: true, 
          alerts: parsedAlerts,
          count: parsedAlerts.length 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "check": {
        // Check all active alerts against current prices
        const { data: activeAlerts } = await supabase
          .from("user_portfolios")
          .select("*")
          .eq("user_id", user.id)
          .eq("asset_type", "alert")
          .eq("status", "active");

        if (!activeAlerts || activeAlerts.length === 0) {
          return new Response(JSON.stringify({ success: true, triggered: [], message: "Nu ai alerte active." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
        const triggered: any[] = [];
        
        if (perplexityKey) {
          const tickers = [...new Set(activeAlerts.map((a: any) => {
            try { return JSON.parse(a.notes || "{}").ticker; } catch { return null; }
          }).filter(Boolean))];

          if (tickers.length > 0) {
            try {
              const priceResponse = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${perplexityKey}`
                },
                body: JSON.stringify({
                  model: "sonar",
                  messages: [{
                    role: "user",
                    content: `Current stock prices for: ${tickers.join(', ')}. Return as JSON object like {"AAPL": 182.52, "TSLA": 245.30}. Only the JSON, nothing else.`
                  }],
                  max_tokens: 200,
                  temperature: 0
                })
              });

              if (priceResponse.ok) {
                const priceData = await priceResponse.json();
                const priceText = priceData.choices?.[0]?.message?.content?.trim();
                const jsonMatch = priceText?.match(/\{[^}]+\}/);
                if (jsonMatch) {
                  const prices = JSON.parse(jsonMatch[0]);
                  
                  for (const alert of activeAlerts) {
                    try {
                      const alertInfo = JSON.parse(alert.notes || "{}");
                      const currentPrice = prices[alertInfo.ticker];
                      if (currentPrice !== undefined) {
                        const isTriggered = 
                          (alertInfo.direction === "above" && currentPrice >= alertInfo.target_price) ||
                          (alertInfo.direction === "below" && currentPrice <= alertInfo.target_price);
                        
                        if (isTriggered) {
                          triggered.push({
                            ticker: alertInfo.ticker,
                            target_price: alertInfo.target_price,
                            current_price: currentPrice,
                            direction: alertInfo.direction
                          });
                          
                          await supabase.from("user_portfolios")
                            .update({ status: "closed", current_price: currentPrice })
                            .eq("id", alert.id);
                        }
                      }
                    } catch {}
                  }
                }
              }
            } catch (e) {
              console.warn("Price check failed:", e);
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          triggered,
          active_count: activeAlerts.length - triggered.length,
          message: triggered.length > 0 
            ? `🔔 ${triggered.length} alerte declanșate! ${triggered.map(t => `${t.ticker}: ${t.current_price} (target: ${t.target_price})`).join(', ')}`
            : `Toate cele ${activeAlerts.length} alerte sunt încă active.`
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete": {
        if (!alert_id) {
          return new Response(JSON.stringify({ error: "Missing alert_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        await supabase.from("user_portfolios")
          .update({ status: "closed" })
          .eq("id", alert_id)
          .eq("user_id", user.id);

        return new Response(JSON.stringify({ success: true, message: "Alertă dezactivată." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action. Use: create, list, check, delete" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("Price alerts error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
