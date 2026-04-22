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
import { YANA_CHIEF_OF_STAFF_PROMPT } from "../_shared/yana-chief-of-staff-prompt.ts";

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

// ============= LOCAL DEVICE TOOLS (Mac/PC bridge) =============
TOOLS.push(
  {
    type: "function",
    function: {
      name: "local_fs_read",
      description: "Citește un fișier de pe laptopul utilizatorului (prin agentul local conectat). Folosește pentru a inspecta cod, documente, configurări etc.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Calea absolută a fișierului pe laptop (ex: /Users/me/Documents/file.txt)" },
          max_bytes: { type: "number", description: "Limită opțională (default 200000)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "local_fs_write",
      description: "Scrie/înlocuiește conținutul unui fișier pe laptopul utilizatorului. Creează folderele intermediare dacă lipsesc.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Calea absolută" },
          content: { type: "string", description: "Conținutul nou complet" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "local_fs_list",
      description: "Listează conținutul unui folder de pe laptop.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Calea absolută a folderului" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "local_bash_exec",
      description: "Execută o comandă bash pe laptopul utilizatorului. Folosește cu grijă: poate modifica/șterge fișiere, instala pachete, etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Comanda completă (ex: 'ls -la ~/Desktop')" },
          cwd: { type: "string", description: "Director de lucru opțional" },
          timeout_ms: { type: "number", description: "Timeout în ms (default 30000)" },
        },
        required: ["command"],
      },
    },
  },
  // ============= CHIEF OF STAFF TOOLS =============
  {
    type: "function",
    function: {
      name: "ceo_morning_briefing",
      description: "Generează briefing-ul de dimineață pentru CEO: obiective active, task-uri cu scadență, contacte stagnante, sumar prioritizat. Folosește când userul cere 'briefing', 'gm', 'ce am azi', 'good morning'.",
      parameters: {
        type: "object",
        properties: {
          save: { type: "boolean", description: "Salvează briefing-ul în istoric (default true)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ceo_manage_goals",
      description: "Gestionează obiectivele trimestriale ale CEO-ului: listare, creare, actualizare progres, marcare ca atins.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "update", "achieve"], description: "Acțiunea de executat" },
          goal_id: { type: "string", description: "ID-ul obiectivului (necesar pentru update/achieve)" },
          title: { type: "string", description: "Titlul obiectivului (pentru create)" },
          description: { type: "string", description: "Descriere detaliată" },
          priority: { type: "number", description: "1=top, 2=mediu, 3=secundar" },
          progress_percent: { type: "number", description: "Progres 0-100 (pentru update)" },
          success_metrics: { type: "string", description: "Cum măsori succesul" },
          category: { type: "string", description: "Ex: Revenue, Product, Team, Personal" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ceo_manage_contacts",
      description: "Gestionează CRM-ul personal al CEO-ului: listare, creare, actualizare, identificare contacte stagnante (care n-au fost contactate de mult).",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "update", "stale", "log_interaction"], description: "Acțiunea" },
          contact_id: { type: "string" },
          full_name: { type: "string" },
          role: { type: "string" },
          company: { type: "string" },
          tier: { type: "number", description: "1=esențial, 2=important, 3=ocazional" },
          email: { type: "string" },
          phone: { type: "string" },
          relationship_context: { type: "string", description: "Context relațional: cum vă cunoașteți, ce e relevant" },
          recommended_cadence_days: { type: "number", description: "La câte zile recomanzi contact (ex: 14 pentru tier 1)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ceo_manage_tasks",
      description: "Gestionează task-urile executive: listare, creare, marcare ca terminate. Task-urile pot fi legate de obiective și contacte.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "complete", "update"], description: "Acțiunea" },
          task_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "number" },
          status: { type: "string", enum: ["todo", "in_progress", "waiting", "done", "cancelled"] },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          goal_id: { type: "string", description: "ID obiectiv asociat (opțional)" },
          contact_id: { type: "string", description: "ID contact asociat (opțional)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ceo_triage_inbox",
      description: "Triază inbox-ul de email în 3 tier-uri (1=răspunde acum, 2=azi, 3=fyi). Necesită Local Device conectat. Se folosește local_bash_exec pentru a citi mail-urile (Mac Mail, Apple Mail).",
      parameters: {
        type: "object",
        properties: {
          last_n: { type: "number", description: "Câte emailuri să triezi (default 20)" },
        },
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

/**
 * Sends a command to the user's local device by inserting into yana_local_commands.
 * The local agent (running on Mac) listens via Realtime, executes, and writes back result.
 * We poll for the result with a timeout.
 */
async function executeLocalCommand(
  userId: string,
  supabase: ReturnType<typeof createClient>,
  commandType: string,
  params: Record<string, unknown>,
  timeoutMs = 35000,
): Promise<unknown> {
  // Find active device for this user (most recent active)
  const { data: device, error: devErr } = await supabase
    .from("yana_local_devices")
    .select("id, status, last_seen_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (devErr) return { error: `DB error: ${devErr.message}` };
  if (!device) {
    return {
      error: "Niciun laptop conectat. Roagă utilizatorul să acceseze /yana → Settings → Conectare laptop și să instaleze agentul local.",
    };
  }

  // Stale check: if last_seen older than 60s, agent likely offline
  if (device.last_seen_at) {
    const ageMs = Date.now() - new Date(device.last_seen_at as string).getTime();
    if (ageMs > 60_000) {
      return { error: "Agentul local pare offline (heartbeat lipsă). Roagă utilizatorul să-l pornească: `npx yana-local-agent`" };
    }
  }

  // Insert command
  const { data: cmd, error: insErr } = await supabase
    .from("yana_local_commands")
    .insert({
      device_id: device.id,
      user_id: userId,
      command_type: commandType,
      command_params: params,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr) return { error: `Insert failed: ${insErr.message}` };

  // Poll for result
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 600));
    const { data: row } = await supabase
      .from("yana_local_commands")
      .select("status, result, error, duration_ms")
      .eq("id", cmd.id)
      .maybeSingle();
    if (row && (row.status === "completed" || row.status === "failed")) {
      if (row.status === "failed") return { error: row.error || "Local execution failed" };
      return { result: row.result, duration_ms: row.duration_ms };
    }
  }

  // Timeout — mark as such
  await supabase.from("yana_local_commands").update({ status: "timeout", error: "No response in 35s" }).eq("id", cmd.id);
  return { error: "Timeout: agentul local nu a răspuns în 35s." };
}

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

    case "local_fs_read":
      return await executeLocalCommand(userId, supabase, "fs_read", {
        path: args.path,
        max_bytes: args.max_bytes ?? 200000,
      });

    case "local_fs_write":
      return await executeLocalCommand(userId, supabase, "fs_write", {
        path: args.path,
        content: args.content,
      });

    case "local_fs_list":
      return await executeLocalCommand(userId, supabase, "fs_list", {
        path: args.path,
      });

    case "local_bash_exec":
      return await executeLocalCommand(
        userId,
        supabase,
        "bash_exec",
        {
          command: args.command,
          cwd: args.cwd,
          timeout_ms: args.timeout_ms ?? 30000,
        },
        ((args.timeout_ms as number) ?? 30000) + 5000,
      );

    // ============= CHIEF OF STAFF HANDLERS =============
    case "ceo_morning_briefing": {
      const today = new Date().toISOString().slice(0, 10);
      const [goals, tasks, stale] = await Promise.all([
        supabase.from("yana_ceo_goals").select("*").eq("user_id", userId).eq("status", "active").order("priority"),
        supabase.from("yana_ceo_tasks").select("*").eq("user_id", userId).in("status", ["todo", "in_progress"]).order("priority").order("due_date"),
        supabase.from("yana_ceo_contacts").select("id, full_name, role, company, last_interaction_at, recommended_cadence_days").eq("user_id", userId).eq("tier", 1).order("last_interaction_at", { ascending: true, nullsFirst: true }).limit(5),
      ]);
      const briefing = {
        date: today,
        active_goals: goals.data || [],
        urgent_tasks: (tasks.data || []).filter((t: { due_date?: string; priority: number }) => t.priority === 1 || (t.due_date && t.due_date <= today)),
        all_tasks_count: (tasks.data || []).length,
        stale_contacts: stale.data || [],
      };
      if (args.save !== false) {
        await supabase.from("yana_ceo_briefings").insert({
          user_id: userId,
          briefing_date: today,
          content_markdown: JSON.stringify(briefing, null, 2),
          goals_referenced: (goals.data || []).map((g: { id: string }) => g.id),
          tasks_referenced: ((tasks.data || []) as { id: string }[]).slice(0, 10).map((t) => t.id),
          contacts_referenced: (stale.data || []).map((c: { id: string }) => c.id),
        });
      }
      return briefing;
    }

    case "ceo_manage_goals": {
      const action = args.action as string;
      if (action === "list") {
        const { data, error } = await supabase.from("yana_ceo_goals").select("*").eq("user_id", userId).order("priority").order("created_at", { ascending: false });
        if (error) return { error: error.message };
        return { goals: data || [] };
      }
      if (action === "create") {
        if (!args.title) return { error: "title obligatoriu" };
        const { data, error } = await supabase.from("yana_ceo_goals").insert({
          user_id: userId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || 2,
          progress_percent: 0,
          success_metrics: args.success_metrics || null,
          category: args.category || null,
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "update" || action === "achieve") {
        if (!args.goal_id) return { error: "goal_id obligatoriu" };
        const update: Record<string, unknown> = {};
        if (action === "achieve") { update.status = "achieved"; update.progress_percent = 100; }
        if (args.progress_percent !== undefined) update.progress_percent = args.progress_percent;
        if (args.title) update.title = args.title;
        if (args.description) update.description = args.description;
        if (args.priority) update.priority = args.priority;
        const { data, error } = await supabase.from("yana_ceo_goals").update(update).eq("id", args.goal_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      return { error: "action invalid" };
    }

    case "ceo_manage_contacts": {
      const action = args.action as string;
      if (action === "list") {
        const { data, error } = await supabase.from("yana_ceo_contacts").select("*").eq("user_id", userId).order("tier").order("last_interaction_at", { ascending: false, nullsFirst: false });
        if (error) return { error: error.message };
        return { contacts: data || [] };
      }
      if (action === "stale") {
        const { data, error } = await supabase.from("yana_ceo_contacts").select("*").eq("user_id", userId).order("last_interaction_at", { ascending: true, nullsFirst: true }).limit(20);
        if (error) return { error: error.message };
        const now = Date.now();
        const stale = (data || []).filter((c: { last_interaction_at?: string; recommended_cadence_days?: number }) => {
          if (!c.last_interaction_at) return true;
          const days = (now - new Date(c.last_interaction_at).getTime()) / 86400000;
          return days > (c.recommended_cadence_days || 30);
        });
        return { stale_contacts: stale };
      }
      if (action === "create") {
        if (!args.full_name) return { error: "full_name obligatoriu" };
        const { data, error } = await supabase.from("yana_ceo_contacts").insert({
          user_id: userId,
          full_name: args.full_name,
          role: args.role || null,
          company: args.company || null,
          tier: args.tier || 3,
          email: args.email || null,
          phone: args.phone || null,
          relationship_context: args.relationship_context || null,
          recommended_cadence_days: args.recommended_cadence_days || 30,
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "update") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const update: Record<string, unknown> = {};
        for (const k of ["full_name", "role", "company", "tier", "email", "phone", "relationship_context", "recommended_cadence_days"]) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        const { data, error } = await supabase.from("yana_ceo_contacts").update(update).eq("id", args.contact_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      if (action === "log_interaction") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const { data, error } = await supabase.from("yana_ceo_contacts").update({ last_interaction_at: new Date().toISOString(), is_stale: false }).eq("id", args.contact_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { logged: data };
      }
      return { error: "action invalid" };
    }

    case "ceo_manage_tasks": {
      const action = args.action as string;
      if (action === "list") {
        const { data, error } = await supabase.from("yana_ceo_tasks").select("*").eq("user_id", userId).order("status").order("priority").order("due_date");
        if (error) return { error: error.message };
        return { tasks: data || [] };
      }
      if (action === "create") {
        if (!args.title) return { error: "title obligatoriu" };
        const { data, error } = await supabase.from("yana_ceo_tasks").insert({
          user_id: userId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || 2,
          due_date: args.due_date || null,
          goal_id: args.goal_id || null,
          contact_id: args.contact_id || null,
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "complete") {
        if (!args.task_id) return { error: "task_id obligatoriu" };
        const { data, error } = await supabase.from("yana_ceo_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", args.task_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { completed: data };
      }
      if (action === "update") {
        if (!args.task_id) return { error: "task_id obligatoriu" };
        const update: Record<string, unknown> = {};
        for (const k of ["title", "description", "priority", "status", "due_date", "goal_id", "contact_id"]) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        const { data, error } = await supabase.from("yana_ceo_tasks").update(update).eq("id", args.task_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      return { error: "action invalid" };
    }

    case "ceo_triage_inbox": {
      // Necesită Local Device — folosește bash_exec pentru Apple Mail
      const n = (args.last_n as number) || 20;
      const script = `osascript -e 'tell application "Mail" to set msgList to messages of inbox\nrepeat with i from 1 to ${n}\ntry\nset msg to item i of msgList\nlog ((subject of msg) & "|||" & (sender of msg) & "|||" & (date received of msg as string))\nend try\nend repeat'`;
      const result = await executeLocalCommand(userId, supabase, "bash_exec", { command: script, timeout_ms: 30000 }, 35000);
      return { triage_raw: result, instruction: "Parsează rezultatul în 3 tier-uri și propune drafturi pentru Tier 1." };
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