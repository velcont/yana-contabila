/**
 * YANA DYNAMIC AGENT — Universal runtime for YANA-generated agents.
 *
 * Loads agent spec from `yana_generated_agents` by slug and runs it with the
 * subset of tools allowed by the spec. Same multi-step loop as yana-agent.
 * Logs every execution into `yana_agent_executions`.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-yana-user-id",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Whitelist of tools dynamic agents may use (must match yana-agent definitions)
const TOOL_DEFS: Record<string, { description: string; parameters: Record<string, unknown> }> = {
  search_companies: {
    description: "Caută companii în DB userului.",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  get_latest_balance: {
    description: "Ultima balanță contabilă a userului.",
    parameters: { type: "object", properties: { company_name: { type: "string" } } },
  },
  create_task: {
    description: "Creează task pentru user.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_date: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["title"],
    },
  },
  create_calendar_event: {
    description: "Eveniment calendar.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        event_date: { type: "string" },
        start_time: { type: "string" },
        description: { type: "string" },
        event_type: { type: "string" },
      },
      required: ["title", "event_date"],
    },
  },
  save_note: {
    description: "Salvează notă persistentă.",
    parameters: {
      type: "object",
      properties: { content: { type: "string" }, topic: { type: "string" } },
      required: ["content"],
    },
  },
  web_research: {
    description: "Cercetare online (deep-research).",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  get_user_context: {
    description: "Profil + statistici user.",
    parameters: { type: "object", properties: {} },
  },
};

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<unknown> {
  switch (name) {
    case "search_companies": {
      const q = (args.query as string) || "";
      let query = supabase
        .from("companies")
        .select("id, company_name, cui, vat_regime, client_status, is_own_company")
        .or(`user_id.eq.${userId},managed_by_accountant_id.eq.${userId}`)
        .limit(20);
      if (q) query = query.or(`company_name.ilike.%${q}%,cui.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { companies: data || [] };
    }
    case "get_latest_balance": {
      const companyName = args.company_name as string | undefined;
      let query = supabase
        .from("analyses")
        .select("file_name, company_name, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (companyName) query = query.ilike("company_name", `%${companyName}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      if (!data || data.length === 0) return { message: "Nicio balanță." };
      return data[0];
    }
    case "create_task": {
      const { data, error } = await supabase.from("accountant_tasks").insert({
        assigned_by: userId,
        assigned_to: userId,
        title: args.title,
        description: args.description || null,
        due_date: args.due_date || null,
        priority: args.priority || "medium",
        status: "todo",
      }).select().single();
      if (error) return { error: error.message };
      return { success: true, task_id: data.id };
    }
    case "create_calendar_event": {
      const { data, error } = await supabase.from("calendar_events").insert({
        user_id: userId,
        title: args.title,
        event_date: args.event_date,
        start_time: args.start_time || null,
        description: args.description || null,
        event_type: args.event_type || "reminder",
      }).select().single();
      if (error) return { error: error.message };
      return { success: true, event_id: data.id };
    }
    case "save_note": {
      const { error } = await supabase.from("yana_learning_log").insert({
        user_id: userId,
        learning_type: "agent_note",
        topic: (args.topic as string) || "general",
        content: args.content,
        source: "yana-dynamic-agent",
      });
      if (error) return { error: error.message };
      return { success: true };
    }
    case "web_research": {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/deep-research`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ query: args.query, maxIterations: 1 }),
        });
        if (!resp.ok) return { error: `Research ${resp.status}` };
        const r = await resp.json();
        return { summary: r.summary || r.answer || "", sources: (r.sources || []).slice(0, 3) };
      } catch (e) { return { error: (e as Error).message }; }
    }
    case "get_user_context": {
      const { data: profile } = await supabase
        .from("profiles").select("full_name, email, subscription_status").eq("id", userId).single();
      return { profile };
    }
    default:
      return { error: `Tool not allowed or unknown: ${name}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { agent_slug, input, trigger_source = "manual", user_id: bodyUserId } = await req.json();
    if (!agent_slug || !input) {
      return new Response(JSON.stringify({ error: "Missing agent_slug or input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user (header from parent agent OR body OR auth)
    let userId = req.headers.get("x-yana-user-id") || bodyUserId || null;
    if (!userId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const sa = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await sa.auth.getUser();
        userId = user?.id || null;
      }
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "No user context" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load agent spec
    const { data: agent, error: agentErr } = await supabase
      .from("yana_generated_agents")
      .select("id, display_name, system_prompt, allowed_tools, is_active, execution_count, success_count")
      .eq("agent_slug", agent_slug)
      .single();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: `Agent not found: ${agent_slug}` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!agent.is_active) {
      return new Response(JSON.stringify({ error: "Agent inactive" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build tools from whitelist
    const tools = (agent.allowed_tools as string[])
      .filter((t) => TOOL_DEFS[t])
      .map((t) => ({ type: "function", function: { name: t, ...TOOL_DEFS[t] } }));

    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: agent.system_prompt + "\n\nRăspunde concis în română. Folosește unelte doar dacă e nevoie. Maxim 4 pași." },
      { role: "user", content: input },
    ];

    const steps: Array<Record<string, unknown>> = [];
    let finalText = "";
    const MAX_STEPS = 4;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const modelUsed = "google/gemini-2.5-flash";

    for (let step = 0; step < MAX_STEPS; step++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelUsed,
          messages,
          ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
        }),
      });
      if (!aiResp.ok) {
        finalText = `Eroare AI ${aiResp.status}`;
        break;
      }
      const aiData = await aiResp.json();
      totalInputTokens += aiData.usage?.prompt_tokens || 0;
      totalOutputTokens += aiData.usage?.completion_tokens || 0;
      const choice = aiData.choices?.[0];
      const toolCalls = choice?.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        finalText = choice?.message?.content || "";
        break;
      }
      messages.push(choice.message);
      for (const tc of toolCalls) {
        const fn = tc.function.name;
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
        const allowed = (agent.allowed_tools as string[]).includes(fn);
        const result = allowed
          ? await executeTool(fn, parsed, userId, supabase)
          : { error: `Tool ${fn} not allowed for this agent` };
        steps.push({ tool: fn, args: parsed, result });
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 4000) });
      }
    }

    const durationMs = Date.now() - startTime;

    // Log execution + update agent stats (best-effort)
    await supabase.from("yana_agent_executions").insert({
      agent_id: agent.id,
      user_id: userId,
      trigger_source,
      input_summary: String(input).slice(0, 500),
      output_summary: finalText.slice(0, 500),
      steps,
      success: !!finalText,
      duration_ms: durationMs,
    });
    await supabase.from("yana_generated_agents").update({
      execution_count: ((agent as unknown as { execution_count?: number }).execution_count || 0) + 1,
      success_count: ((agent as unknown as { success_count?: number }).success_count || 0) + (finalText ? 1 : 0),
      last_executed_at: new Date().toISOString(),
    }).eq("id", agent.id);

    return new Response(JSON.stringify({
      success: true,
      agent: agent.display_name,
      output: finalText,
      steps_count: steps.length,
      duration_ms: durationMs,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[dynamic-agent] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});