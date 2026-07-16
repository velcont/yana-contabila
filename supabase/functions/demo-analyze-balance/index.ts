import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { parseExcelWithXLSX } from "../_shared/balance-parser.ts";
import {
  extractStructuredData,
  calculateRevenueExpenses,
  calculateDeterministicMetadata,
} from "../_shared/balance-structured-extraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_DEMO_ANALYSES = 3;
const RATE_LIMIT_WINDOW_HOURS = 24;

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 10) ?? "salt";
  const data = encoder.encode(`demo-balance:${ip}:${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ipHash = await hashIP(getClientIP(req));

    // Rate limit: max 3 balance analyses / 24h per IP
    const { data: rateData } = await supabase
      .from("demo_rate_limits")
      .select("*")
      .eq("ip_hash", `bal:${ipHash}`)
      .maybeSingle();

    const now = new Date();
    if (rateData) {
      const firstRequest = new Date(rateData.first_request_at);
      const hoursDiff = (now.getTime() - firstRequest.getTime()) / 3_600_000;
      if (hoursDiff < RATE_LIMIT_WINDOW_HOURS && rateData.request_count >= MAX_DEMO_ANALYSES) {
        return new Response(
          JSON.stringify({
            error: "Ai folosit toate cele 3 analize demo. Creează cont gratuit pentru analize nelimitate.",
            limitReached: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const body = await req.json();
    const { excelBase64, fileName } = body ?? {};

    if (!excelBase64 || !fileName) {
      return new Response(
        JSON.stringify({ error: "Lipsesc fișierul sau numele fișierului." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Strip data-URL prefix if present
    let pureBase64 = String(excelBase64);
    if (pureBase64.includes(";base64,")) {
      pureBase64 = pureBase64.split(";base64,")[1];
    }

    // Parse & extract structured accounts
    await parseExcelWithXLSX(pureBase64); // sanity parse (throws on bad file)
    const structured = extractStructuredData(pureBase64);
    const { revenue, expenses, profit } = calculateRevenueExpenses(structured.accounts);
    const metadata = calculateDeterministicMetadata(structured.accounts, revenue, expenses, profit);

    if (!structured.accounts.length) {
      return new Response(
        JSON.stringify({ error: "Nu am putut extrage conturi din fișier. Verifică că e o balanță contabilă validă." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cash runway estimate (months): (cash) / (monthly expenses avg)
    const cash = (metadata.soldBanca || 0) + (metadata.soldCasa || 0);
    const monthlyExpenses = expenses > 0 ? expenses / 12 : 0;
    const cashRunwayMonths = monthlyExpenses > 0 ? Math.round((cash / monthlyExpenses) * 10) / 10 : null;

    // Simple health score 0-100
    let score = 50;
    if (profit > 0) score += 20;
    else if (profit < 0) score -= 15;
    if (cashRunwayMonths !== null && cashRunwayMonths > 3) score += 10;
    if (cashRunwayMonths !== null && cashRunwayMonths < 1) score -= 15;
    if (metadata.soldClienti && metadata.soldFurnizori && metadata.soldClienti > metadata.soldFurnizori) score += 5;
    if (metadata.dso && metadata.dso > 90) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // Top risks (heuristic)
    const risks: string[] = [];
    if (profit < 0) risks.push("Pierdere netă pe perioadă");
    if (cashRunwayMonths !== null && cashRunwayMonths < 2) risks.push(`Cash runway sub 2 luni (${cashRunwayMonths} luni)`);
    if (metadata.dso && metadata.dso > 90) risks.push(`Încasări întârziate: DSO ${metadata.dso} zile`);
    if (metadata.soldFurnizori && metadata.soldClienti && metadata.soldFurnizori > metadata.soldClienti * 1.5) {
      risks.push("Datorii către furnizori peste creanțe cu 50%+");
    }
    if (!risks.length) risks.push("Fără riscuri majore detectate în date");

    // Increment rate limit
    if (rateData) {
      const firstRequest = new Date(rateData.first_request_at);
      const hoursDiff = (now.getTime() - firstRequest.getTime()) / 3_600_000;
      if (hoursDiff < RATE_LIMIT_WINDOW_HOURS) {
        await supabase
          .from("demo_rate_limits")
          .update({ request_count: (rateData.request_count || 0) + 1, last_request_at: now.toISOString() })
          .eq("ip_hash", `bal:${ipHash}`);
      } else {
        await supabase
          .from("demo_rate_limits")
          .update({ request_count: 1, first_request_at: now.toISOString(), last_request_at: now.toISOString() })
          .eq("ip_hash", `bal:${ipHash}`);
      }
    } else {
      await supabase.from("demo_rate_limits").insert({
        ip_hash: `bal:${ipHash}`,
        request_count: 1,
        first_request_at: now.toISOString(),
        last_request_at: now.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: structured.company || null,
        cui: structured.cui || null,
        accountsCount: structured.accounts.length,
        metrics: {
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
          profit: Math.round(profit),
          cash: Math.round(cash),
          cashRunwayMonths,
          dso: metadata.dso ?? null,
          dpo: metadata.dpo ?? null,
          soldClienti: metadata.soldClienti ?? null,
          soldFurnizori: metadata.soldFurnizori ?? null,
        },
        healthScore: score,
        risks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[demo-analyze-balance] error:", err);
    return new Response(
      JSON.stringify({ error: "Nu am putut analiza fișierul. Încearcă un .xlsx de balanță contabilă." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});