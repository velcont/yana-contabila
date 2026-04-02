/**
 * Agent Trace Helper — Observability Layer (AgentStack inspired)
 * Logs structured traces for every agent call to yana_agent_traces.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TraceInput {
  traceId: string;
  agentName: string;
  inputSummary?: string;
  parentTraceId?: string;
}

export interface TraceResult {
  outputSummary?: string;
  tokensUsed?: number;
  costCents?: number;
}

export async function logAgentTrace(
  trace: TraceInput,
  startTime: number,
  result: TraceResult
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const durationMs = Date.now() - startTime;

    await supabase.from("yana_agent_traces").insert({
      trace_id: trace.traceId,
      agent_name: trace.agentName,
      input_summary: (trace.inputSummary || "").slice(0, 500),
      output_summary: (result.outputSummary || "").slice(0, 500),
      duration_ms: durationMs,
      tokens_used: result.tokensUsed || 0,
      cost_cents: result.costCents || 0,
      parent_trace_id: trace.parentTraceId || null,
    });
  } catch (err) {
    console.warn(`[AgentTrace] Failed to log trace for ${trace.agentName}:`, err);
  }
}
