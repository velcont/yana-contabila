/**
 * YANA AGENT — Multi-step autonomous AI agent
 * 
 * Capabilities:
 * - Tool calling autonom (Lovable AI Gateway)
 * - Multi-step reasoning (max 5 iterații)
 * - Acțiuni reale: tasks, calendar events, notes, balance lookup, web research
 * - Streaming SSE evenimente: thinking → tool_call → tool_result → final
 * 
 * Acțiuni executate AUTONOM (fără confirmare) — conform preferinței user.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SSE_HEADERS = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
};

// ============= TOOL DEFINITIONS =============
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_companies",
      description: "Caută companii din baza de date a utilizatorului (firme proprii sau clienți contabili). Returnează nume, CUI, regim TVA, status.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Cuvânt cheie pentru filtrare după nume sau CUI (opțional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_latest_balance",
      description: "Obține ultima balanță contabilă încărcată (analiză) — returnează indicatori financiari cheie: CA, profit, EBITDA, DSO, cash, etc.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "Numele companiei (opțional, dacă lipsește returnează cea mai recentă)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Creează o sarcină (to-do) pentru utilizator. Folosește când userul cere să-i amintești ceva sau să programezi o acțiune.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titlul sarcinii (max 200 caractere)" },
          description: { type: "string", description: "Descriere detaliată (opțional)" },
          due_date: { type: "string", description: "Dată scadență ISO (YYYY-MM-DD), opțional" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioritate" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Creează un eveniment în calendar. Folosește pentru întâlniri, deadline-uri fiscale, reminders.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          event_date: { type: "string", description: "Data evenimentului ISO (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Ora început HH:MM (opțional)" },
          description: { type: "string", description: "Detalii (opțional)" },
          event_type: { type: "string", description: "Tip: meeting, deadline, reminder", default: "reminder" },
        },
        required: ["title", "event_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_note",
      description: "Salvează o notă persistentă în memoria userului (ex: preferințe, decizii, observații importante).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Conținutul notei" },
          topic: { type: "string", description: "Subiect/categorie (ex: 'fiscal', 'strategie', 'personal')" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_research",
      description: "Caută informații actualizate online (legislație fiscală, știri, prețuri, date publice). Folosește pentru întrebări care necesită date recente sau verificate.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Întrebarea de cercetare (în română, specifică)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_context",
      description: "Obține contextul complet al utilizatorului: profil, abonament, ultimele conversații, acțiuni recente. Folosește la început pentru a personaliza răspunsul.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// Inject dynamically generated agents as callable tools (run_dynamic_agent + spawn_agent)
TOOLS.push(
  {
    type: "function",
    function: {
      name: "run_dynamic_agent",
      description: "Execută un sub-agent specializat creat anterior de YANA. Folosește când există deja un agent potrivit pentru sarcină.",
      parameters: {
        type: "object",
        properties: {
          agent_slug: { type: "string", description: "Identificator (slug) al agentului existent" },
          input: { type: "string", description: "Inputul/cererea pentru agent" },
        },
        required: ["agent_slug", "input"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn_agent",
      description: "Creează AUTONOM un nou sub-agent specializat când detectezi un task recurent sau o slăbiciune ce necesită un agent dedicat. Agentul devine imediat activ și disponibil.",
      parameters: {
        type: "object",
        properties: {
          display_name: { type: "string", description: "Nume scurt al agentului (ex: 'Monitor ANAF')" },
          description: { type: "string", description: "La ce e bun, în 1-2 fraze" },
          agent_type: { type: "string", enum: ["sub_agent", "meta_improvement"], description: "sub_agent = task concret; meta_improvement = analizează YANA însăși" },
          system_prompt: { type: "string", description: "Promptul de sistem al noului agent (1-3 paragrafe, în română)" },
          allowed_tools: {
            type: "array",
            items: { type: "string", enum: ["search_companies", "get_latest_balance", "create_task", "create_calendar_event", "save_note", "web_research", "get_user_context"] },
            description: "Whitelist de unelte pe care le poate folosi noul agent",
          },
          schedule: { type: "string", enum: ["on_demand", "hourly", "daily", "weekly"], description: "Cum rulează" },
          creation_reason: { type: "string", description: "Motivul auto-creării (ex: 'detectat 5 cereri similare despre TVA')" },
        },
        required: ["display_name", "description", "agent_type", "system_prompt", "allowed_tools", "schedule"],
      },
    },
  },
);

// ============= LIVE CONNECTOR: auto-discover active agents as first-class tools =============

/**
 * Loads all active agents from yana_generated_agents and exposes each as a
 * dedicated tool named `agent_<slug>`. The model sees them directly and can
 * call them by name without needing to know the generic run_dynamic_agent.
 */
async function loadDynamicAgentTools(
  supabase: ReturnType<typeof createClient>,
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase
      .from("yana_generated_agents")
      .select("agent_slug, display_name, description")
      .eq("is_active", true)
      .limit(40);
    if (error || !data) return [];
    return data.map((a: { agent_slug: string; display_name: string; description: string }) => ({
      type: "function",
      function: {
        name: `agent_${a.agent_slug}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
        description: `[Agent specializat: ${a.display_name}] ${a.description}. Cheamă-l direct când cererea utilizatorului se potrivește scopului său.`,
        parameters: {
          type: "object",
          properties: {
            input: { type: "string", description: "Cererea/contextul transmis agentului specializat" },
          },
          required: ["input"],
        },
      },
      _slug: a.agent_slug, // internal hint, stripped before sending
    }));
  } catch (e) {
    console.warn("[live-connector] failed to load dynamic agents:", e);
    return [];
  }
}

// Map from generated tool-name back to agent slug (rebuilt each request)
function buildAgentToolSlugMap(dynamicTools: Array<Record<string, unknown>>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of dynamicTools) {
    const fn = (t.function as { name: string })?.name;
    const slug = (t as { _slug?: string })._slug;
    if (fn && slug) map[fn] = slug;
  }
  return map;
}

// ============= TOOL EXECUTORS =============

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<unknown> {
  console.log(`[Agent Tool] ${name}`, args);

  switch (name) {
    case "search_companies": {
      const q = (args.query as string) || "";
      let query = supabase
        .from("companies")
        .select("id, company_name, cui, vat_regime, tax_regime, client_status, is_own_company")
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
      if (!data || data.length === 0) return { message: "Nicio balanță încărcată încă." };
      return data[0];
    }

    case "create_task": {
      const { data, error } = await supabase
        .from("accountant_tasks")
        .insert({
          assigned_by: userId,
          assigned_to: userId,
          title: args.title,
          description: args.description || null,
          due_date: args.due_date || null,
          priority: args.priority || "medium",
          status: "todo",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return { success: true, task_id: data.id, message: `Sarcină creată: "${args.title}"` };
    }

    case "create_calendar_event": {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          user_id: userId,
          title: args.title,
          event_date: args.event_date,
          start_time: args.start_time || null,
          description: args.description || null,
          event_type: args.event_type || "reminder",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return { success: true, event_id: data.id, message: `Eveniment programat: "${args.title}" pe ${args.event_date}` };
    }

    case "save_note": {
      const { error } = await supabase.from("yana_learning_log").insert({
        user_id: userId,
        learning_type: "user_note",
        topic: (args.topic as string) || "general",
        content: args.content,
        source: "yana-agent",
      });
      if (error) return { error: error.message };
      return { success: true, message: "Notă salvată în memorie." };
    }

    case "web_research": {
      // Folosește edge function existentă deep-research
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/deep-research`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: args.query, maxIterations: 1 }),
        });
        if (!resp.ok) return { error: `Research failed: ${resp.status}` };
        const result = await resp.json();
        return { summary: result.summary || result.answer || "Fără rezultate", sources: result.sources?.slice(0, 3) };
      } catch (e) {
        return { error: (e as Error).message };
      }
    }

    case "get_user_context": {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, subscription_status, subscription_type")
        .eq("id", userId)
        .single();
      const { count: companiesCount } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},managed_by_accountant_id.eq.${userId}`);
      const { count: analysesCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return {
        profile,
        companies_count: companiesCount || 0,
        analyses_count: analysesCount || 0,
      };
    }

    case "spawn_agent": {
      const slug = String(args.display_name || "agent")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 50) + "-" + Date.now().toString(36);
      const { data, error } = await supabase
        .from("yana_generated_agents")
        .insert({
          agent_slug: slug,
          display_name: args.display_name,
          description: args.description,
          agent_type: args.agent_type,
          system_prompt: args.system_prompt,
          allowed_tools: args.allowed_tools || [],
          schedule: args.schedule || "on_demand",
          created_by: "yana",
          creation_reason: args.creation_reason || null,
          is_active: true,
        })
        .select("id, agent_slug, display_name")
        .single();
      if (error) return { error: error.message };
      return { success: true, agent_slug: data.agent_slug, message: `Agent nou creat: "${data.display_name}" (${data.agent_slug}). E activ și apelabil prin run_dynamic_agent.` };
    }

    case "run_dynamic_agent": {
      const slug = args.agent_slug as string;
      const input = args.input as string;
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/yana-dynamic-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "x-yana-user-id": userId,
          },
          body: JSON.stringify({ agent_slug: slug, input, trigger_source: "parent_agent" }),
        });
        if (!resp.ok) return { error: `Dynamic agent failed: ${resp.status}` };
        return await resp.json();
      } catch (e) {
        return { error: (e as Error).message };
      }
    }

    default:
      return { error: `Tool necunoscut: ${name}` };
  }
}

// ============= MAIN AGENT LOOP =============

const SYSTEM_PROMPT = `Ești YANA, un AI agent autonom pentru business și contabilitate românească.

CAPABILITĂȚI:
- Ai acces la unelte (tools) pentru a căuta date, executa acțiuni reale (tasks, calendar, note), cerceta online.
- Folosești unelte ÎNAINTE să răspunzi când e nevoie de date reale sau acțiuni.
- Poți lanța mai multe unelte în pași succesivi (ex: caută companie → ia balanța → analizează).

REGULI:
1. Folosește 'get_user_context' DOAR la prima interacțiune sau când userul cere ceva personalizat.
2. Pentru întrebări despre legislație fiscală actuală sau date externe, folosește 'web_research'.
3. Când userul cere să-i amintești ceva → 'create_task' sau 'create_calendar_event' (autonom, fără să întrebi).
4. Răspunde în română, ton de companion executiv calm și competent.
5. Maxim 5 pași de tool calling per răspuns.
6. La final, dă un răspuns clar și acționabil — nu lista pașii executați (userul îi vede separat).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { message, conversation_history = [] } = await req.json();
  if (!message) {
    return new Response(JSON.stringify({ error: "Missing message" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const messages: Array<Record<string, unknown>> = [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversation_history.slice(-10).map((m: { role: string; content: string }) => ({
            role: m.role, content: m.content,
          })),
          { role: "user", content: message },
        ];

        send("thinking", { text: "Analizez cererea..." });

        // LIVE CONNECTOR: discover active YANA-generated agents and expose them as tools
        const dynamicAgentTools = await loadDynamicAgentTools(supabase);
        const agentToolSlugMap = buildAgentToolSlugMap(dynamicAgentTools);
        const cleanDynamicTools = dynamicAgentTools.map((t) => {
          const { _slug: _omit, ...rest } = t as Record<string, unknown>;
          return rest;
        });
        const allTools = [...TOOLS, ...cleanDynamicTools];
        if (cleanDynamicTools.length > 0) {
          send("thinking", { text: `${cleanDynamicTools.length} agenți specializați disponibili.` });
        }

        const MAX_STEPS = 5;
        let finalText = "";

        for (let step = 0; step < MAX_STEPS; step++) {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              tools: allTools,
              tool_choice: "auto",
            }),
          });

          if (!aiResp.ok) {
            const errText = await aiResp.text();
            if (aiResp.status === 429) {
              send("error", { message: "Rate limit. Reîncearcă în câteva secunde." });
            } else if (aiResp.status === 402) {
              send("error", { message: "Credite epuizate. Adaugă credite la Settings." });
            } else {
              send("error", { message: `AI error: ${aiResp.status}` });
            }
            console.error(`[Agent] AI error ${aiResp.status}:`, errText);
            break;
          }

          const aiData = await aiResp.json();
          const choice = aiData.choices?.[0];
          const toolCalls = choice?.message?.tool_calls;

          if (!toolCalls || toolCalls.length === 0) {
            // Final answer
            finalText = choice?.message?.content || "Nu am putut genera un răspuns.";
            break;
          }

          // Append assistant tool_calls message
          messages.push(choice.message);

          // Execute tools in parallel
          send("thinking", { text: `Pasul ${step + 1}: execut ${toolCalls.length} unealtă${toolCalls.length > 1 ? "e" : ""}...` });

          const toolResults = await Promise.all(
            toolCalls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
              const fnName = tc.function.name;
              let parsedArgs: Record<string, unknown> = {};
              try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }

              send("tool_call", { id: tc.id, name: fnName, args: parsedArgs });

              // LIVE CONNECTOR ROUTER: if it's a dynamic agent tool, delegate to yana-dynamic-agent
              let result: unknown;
              if (agentToolSlugMap[fnName]) {
                const slug = agentToolSlugMap[fnName];
                try {
                  const dynResp = await fetch(`${supabaseUrl}/functions/v1/yana-dynamic-agent`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                      "x-yana-user-id": user.id,
                    },
                    body: JSON.stringify({
                      agent_slug: slug,
                      input: parsedArgs.input || JSON.stringify(parsedArgs),
                      trigger_source: "live_connector",
                      user_id: user.id,
                    }),
                  });
                  result = dynResp.ok
                    ? await dynResp.json()
                    : { error: `dynamic-agent ${dynResp.status}`, detail: (await dynResp.text()).slice(0, 300) };
                } catch (e) {
                  result = { error: (e as Error).message };
                }
              } else {
                result = await executeTool(fnName, parsedArgs, user.id, supabase);
              }

              send("tool_result", { id: tc.id, name: fnName, result });

              return {
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result).slice(0, 4000),
              };
            })
          );

          messages.push(...toolResults);

          if (step === MAX_STEPS - 1) {
            // Last iteration — force final without tools
            const finalResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [...messages, { role: "user", content: "Dă răspunsul final acum, fără alte tool calls." }],
              }),
            });
            if (finalResp.ok) {
              const fd = await finalResp.json();
              finalText = fd.choices?.[0]?.message?.content || "Răspuns indisponibil.";
            }
          }
        }

        send("final", { text: finalText });
        send("done", {});
      } catch (err) {
        console.error("[Agent] Fatal:", err);
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
});