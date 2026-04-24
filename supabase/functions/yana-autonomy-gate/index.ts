/**
 * YANA AUTONOMY GATE
 * Decides if an action should auto-execute, require confirmation, or be rejected.
 * Called by yana-agent before any side-effect tool call.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GateRequest {
  user_id: string;
  action_type: string;       // e.g. "send_email", "create_invoice", "make_payment"
  action_category: string;   // "financial" | "communication" | "planning" | "research"
  amount_cents?: number;
  context?: Record<string, unknown>;
}

interface GateResponse {
  decision: "auto_execute" | "require_confirmation" | "rejected";
  risk_score: number;
  reason: string;
  pending_id?: string;
}

function calculateRiskScore(req: GateRequest): number {
  let score = 20;
  const amount = req.amount_cents ?? 0;
  if (amount > 0) score += Math.min(40, Math.floor(amount / 1000));
  if (req.action_type.includes("payment") || req.action_type.includes("delete")) score += 30;
  if (req.action_type.includes("legal") || req.action_type.includes("contract")) score += 25;
  if (req.action_type.includes("send_email_external")) score += 15;
  return Math.min(100, score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as GateRequest;
    if (!body.user_id || !body.action_type || !body.action_category) {
      return new Response(JSON.stringify({ error: "missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase.rpc("get_or_create_autonomy_settings", { p_user_id: body.user_id });
    const s = settings as {
      autonomy_level: number;
      max_auto_spend_cents: number;
      categories: Record<string, number>;
      require_confirm_for: string[];
    };

    const riskScore = calculateRiskScore(body);
    const categoryAutonomy = s.categories[body.action_category] ?? s.autonomy_level;
    const amount = body.amount_cents ?? 0;

    let decision: GateResponse["decision"] = "auto_execute";
    let reason = "Sub pragul de risc, autonomy level permite execuția.";

    // Hard rules
    if (s.require_confirm_for.some(p => body.action_type.includes(p))) {
      decision = "require_confirmation";
      reason = `Tipul de acțiune "${body.action_type}" necesită confirmare obligatorie.`;
    } else if (amount > s.max_auto_spend_cents) {
      decision = "require_confirmation";
      reason = `Suma ${(amount/100).toFixed(2)} RON depășește bugetul auto-cheltuibil de ${(s.max_auto_spend_cents/100).toFixed(2)} RON.`;
    } else if (riskScore > categoryAutonomy) {
      decision = "require_confirmation";
      reason = `Risc ${riskScore} > toleranță ${categoryAutonomy} pentru categoria ${body.action_category}.`;
    }

    // Log + create pending if needed
    const { data: logged } = await supabase.from("yana_risk_decisions").insert({
      user_id: body.user_id,
      action_type: body.action_type,
      action_category: body.action_category,
      amount_cents: amount,
      risk_score: riskScore,
      auto_executed: decision === "auto_execute",
      user_decision: decision === "auto_execute" ? "approved" : "pending",
      context: body.context || {},
      decided_at: decision === "auto_execute" ? new Date().toISOString() : null,
    }).select("id").single();

    return new Response(JSON.stringify({
      decision,
      risk_score: riskScore,
      reason,
      pending_id: decision === "require_confirmation" ? logged?.id : undefined,
    } satisfies GateResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[autonomy-gate]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});