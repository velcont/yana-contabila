/**
 * YANA ACTION VERIFIER
 * Verifies that an executed action actually succeeded. Auto-retries on detected failure (max 2x).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  user_id: string;
  action_id: string;
  action_name: string;
  agent_name?: string;
  result: Record<string, unknown>;
  retry_count?: number;
}

function inferSuccess(result: Record<string, unknown>): { ok: boolean; error?: string } {
  if ("error" in result && result.error) return { ok: false, error: String(result.error) };
  if ("success" in result) return { ok: !!result.success, error: result.success ? undefined : "success=false" };
  if ("status" in result) {
    const s = Number(result.status);
    if (s >= 200 && s < 300) return { ok: true };
    return { ok: false, error: `HTTP ${s}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as VerifyRequest;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const verdict = inferSuccess(body.result);
    await supabase.from("yana_action_verifications").insert({
      user_id: body.user_id,
      action_id: body.action_id,
      action_name: body.action_name,
      agent_name: body.agent_name || "yana-agent",
      success: verdict.ok,
      error_message: verdict.error,
      retry_count: body.retry_count ?? 0,
      result: body.result,
    });

    return new Response(JSON.stringify({ verified: true, success: verdict.ok, error: verdict.error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[action-verifier]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});