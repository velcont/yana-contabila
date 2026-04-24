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
import { parseExcelWithXLSX } from "../_shared/balance-parser.ts";

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

// Google Calendar tool - real OAuth-based calendar of the user
TOOLS.push({
  type: "function",
  function: {
    name: "gcal_manage",
    description: "Gestionează calendarul real Google al utilizatorului (dacă e conectat în Setări → Integrări). Folosește pentru: a vedea programul ('list_events'), a crea ('create_event'), modifica ('update_event') sau șterge ('delete_event') evenimente. Spre deosebire de create_calendar_event (care e doar intern), aceasta scrie direct în Google Calendar și e vizibilă pe telefon.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list_events", "create_event", "update_event", "delete_event", "status"], description: "Acțiunea dorită" },
        time_min: { type: "string", description: "ISO datetime - început interval (pentru list_events). Default: acum." },
        time_max: { type: "string", description: "ISO datetime - sfârșit interval (pentru list_events). Default: +7 zile." },
        max_results: { type: "number", description: "Max evenimente returnate (default 50)" },
        summary: { type: "string", description: "Titlu eveniment (create/update)" },
        description: { type: "string", description: "Descriere eveniment" },
        location: { type: "string", description: "Locație" },
        start: { type: "string", description: "ISO datetime sau YYYY-MM-DD dacă all_day=true" },
        end: { type: "string", description: "ISO datetime sau YYYY-MM-DD dacă all_day=true" },
        all_day: { type: "boolean", description: "true dacă e eveniment de toată ziua" },
        attendees: { type: "array", items: { type: "string" }, description: "Lista emailuri participanți" },
        event_id: { type: "string", description: "ID Google al evenimentului (update/delete)" },
      },
      required: ["action"],
    },
  },
});

// Email sending tool - via Resend (sends from configured Velcont domain)
TOOLS.push({
  type: "function",
  function: {
    name: "send_email",
    description: "Trimite un email REAL în numele utilizatorului. Dacă userul are configurat contul IMAP/SMTP în /email-settings, trimite din acel cont; altfel poate folosi fallback-ul configurat al platformei. Folosește pentru: răspunsuri la clienți, notificări, rapoarte, oferte. Confirmă DOAR DUPĂ ce ai conținutul clar și destinatarul corect. NU trimite emailuri spam sau bulk — un singur destinatar per apel.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Adresa destinatarului (email valid)" },
        subject: { type: "string", description: "Subiectul emailului (max 200 caractere)" },
        body: { type: "string", description: "Conținutul emailului în text simplu sau HTML simplu (paragrafe separate prin newlines). Semnează cu numele user-ului dacă îl știi." },
        cc: { type: "array", items: { type: "string" }, description: "Adrese CC (opțional)" },
        reply_to: { type: "string", description: "Reply-To address (opțional, default = adresa user-ului dacă există)" },
      },
      required: ["to", "subject", "body"],
    },
  },
});

TOOLS.push({
  type: "function",
  function: {
    name: "email_manage",
    description: "Citește inbox-ul REAL al utilizatorului din contul configurat în /email-settings. Poate verifica statusul conexiunii, lista foldere, lista emailurile recente, căuta în inbox și deschide un email anume.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["status", "list_folders", "list_messages", "get_message"], description: "Acțiunea dorită" },
        folder: { type: "string", description: "Folder IMAP, default INBOX" },
        limit: { type: "number", description: "Număr maxim de emailuri returnate (default 10, max 20)" },
        search: { type: "string", description: "Cuvânt cheie pentru subiect/body/from" },
        uid: { type: "number", description: "UID-ul emailului pentru get_message" },
      },
      required: ["action"],
    },
  },
});

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
  {
    type: "function",
    function: {
      name: "crm_intelligence",
      description: "CRM avansat: lead scoring AI, timeline activități, șabloane email, bulk update, îmbogățire contacte, forecast revenue, rapoarte (conversion rate / cycle time), detecție duplicate, conversie multi-currency, activity feed cross-workspace, import card de vizită prin OCR (Gemini Vision). Folosește când userul cere: 'scor lead', 'șablon email', 'duplicate', 'forecast', 'raport vânzări', 'curs valutar', 'feed activitate', 'îmbogățește contact', 'update X contacte la o dată', sau încarcă o poză cu o carte de vizită.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "score_lead", "score_all_leads", "top_leads",
              "contact_timeline",
              "list_templates", "create_template", "use_template", "delete_template",
              "bulk_update_contacts", "bulk_tag_contacts",
              "enrich_contact",
              "forecast_revenue",
              "report_metrics",
              "find_duplicates", "merge_duplicates",
              "convert_currency", "list_currency_rates",
              "activity_feed",
              "import_business_card"
            ],
            description: "Acțiunea CRM avansată"
          },
          contact_id: { type: "string" },
          company_id: { type: "string" },
          contact_ids: { type: "array", items: { type: "string" }, description: "IDs pentru bulk operations" },
          updates: { type: "object", description: "Câmpuri de actualizat la bulk_update (ex: {tags: ['VIP'], job_title: 'CEO'})" },
          tags: { type: "array", items: { type: "string" } },
          template_id: { type: "string" },
          template_name: { type: "string" },
          template_subject: { type: "string" },
          template_body: { type: "string" },
          template_category: { type: "string" },
          variables: { type: "object", description: "Pentru use_template: {nume: 'Ion', companie: 'X SRL'}" },
          keep_id: { type: "string", description: "Pentru merge: ID contact păstrat (restul șterse)" },
          merge_ids: { type: "array", items: { type: "string" }, description: "IDs de unit (vor fi șterse după merge)" },
          amount: { type: "number" },
          from_currency: { type: "string" },
          to_currency: { type: "string", description: "Default RON" },
          limit: { type: "number", description: "Default 20" },
          days: { type: "number", description: "Pentru activity_feed: ultimele N zile (default 7)" },
          image_base64: { type: "string", description: "Pentru import_business_card: imaginea cărții de vizită (base64 sau data URL). OCR cu Gemini Vision, extrage nume/email/telefon/firmă și creează contact." },
          auto_create: { type: "boolean", description: "Pentru import_business_card: dacă true (default), creează direct contactul; dacă false, doar întoarce datele extrase." }
        },
        required: ["action"]
      }
    }
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
  // ============= CRM TOOLS (chat-first CRM) =============
  {
    type: "function",
    function: {
      name: "crm_manage_companies",
      description: "Gestionează firmele/clienții din CRM: list, search, create, update. Folosește când userul spune 'adaugă firma X', 'caută clientul Y', 'actualizează SC ABC SRL', 'arată-mi firmele'.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "search", "create", "update", "get"], description: "Acțiunea" },
          company_id: { type: "string" },
          query: { type: "string", description: "Pentru search: text liber (nume, CUI)" },
          name: { type: "string" },
          cui: { type: "string" },
          industry: { type: "string" },
          website: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          city: { type: "string" },
          annual_revenue: { type: "number" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_manage_contacts",
      description: "Gestionează contactele/persoanele din CRM (legate de firme). Folosește pentru 'adaugă contactul Ion Popescu', 'caută contactul X', 'cine e CFO la firma Y'.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "search", "create", "update", "get"], description: "Acțiunea" },
          contact_id: { type: "string" },
          company_id: { type: "string", description: "ID firmă asociată (opțional)" },
          query: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          job_title: { type: "string" },
          notes: { type: "string" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_manage_deals",
      description: "Gestionează oportunitățile de vânzare (deals): listare, creare, mutare între etape, marcare câștigat/pierdut. Folosește pentru 'creează deal de 50.000 RON cu firma X', 'mută deal-ul Y în Negociere', 'arată pipeline-ul'.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "pipeline", "create", "update", "move_stage", "win", "lose"], description: "Acțiunea" },
          deal_id: { type: "string" },
          company_id: { type: "string" },
          contact_id: { type: "string" },
          stage_name: { type: "string", description: "Nume etapă (ex: 'Negociere', 'Lead nou'). Folosit la create/move_stage." },
          title: { type: "string" },
          description: { type: "string" },
          value: { type: "number" },
          currency: { type: "string", description: "Default RON" },
          expected_close_date: { type: "string", description: "YYYY-MM-DD" },
          lost_reason: { type: "string" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_log_activity",
      description: "Înregistrează o activitate (apel, email, întâlnire, notă) în timeline-ul unui contact/firmă/deal. Folosește pentru 'am vorbit cu X', 'notează că am trimis ofertă', 'meeting setat pentru mâine la 10'.",
      parameters: {
        type: "object",
        properties: {
          activity_type: { type: "string", enum: ["call", "email", "meeting", "note", "task", "whatsapp", "sms", "other"] },
          subject: { type: "string", description: "Titlu scurt al activității" },
          description: { type: "string" },
          contact_id: { type: "string" },
          company_id: { type: "string" },
          deal_id: { type: "string" },
          scheduled_at: { type: "string", description: "ISO timestamp pentru viitor" },
          completed: { type: "boolean", description: "True dacă activitatea s-a întâmplat deja" },
          duration_minutes: { type: "number" },
        },
        required: ["activity_type", "subject"],
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
  supabase: ReturnType<typeof createClient>,
  userAuthHeader: string,
): Promise<unknown> {
  console.log(`[Agent Tool] ${name}`, args);

  // AUTONOMY GATE — block side-effect tools when risk exceeds user tolerance
  const sideEffect = classifySideEffect(name);
  if (sideEffect) {
    try {
      const gateResp = await fetch(`${supabaseUrl}/functions/v1/yana-autonomy-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          user_id: userId,
          action_type: name,
          action_category: sideEffect.category,
          amount_cents: sideEffect.estimateAmount(args),
          context: { tool: name, args_preview: JSON.stringify(args).slice(0, 400) },
        }),
      });
      if (gateResp.ok) {
        const gate = await gateResp.json() as { decision: string; reason: string; risk_score: number; pending_id?: string };
        if (gate.decision !== "auto_execute") {
          console.log(`[Agent Gate] ${name} → ${gate.decision}: ${gate.reason}`);
          return {
            blocked_by_autonomy_gate: true,
            decision: gate.decision,
            reason: gate.reason,
            risk_score: gate.risk_score,
            pending_id: gate.pending_id,
            message: `Acțiunea "${name}" necesită confirmarea ta în Control Center (/yana/control). Motiv: ${gate.reason}`,
          };
        }
      }
    } catch (e) {
      console.warn("[Agent Gate] error, allowing action:", (e as Error).message);
    }
  }

  const startedAt = Date.now();
  const result = await executeToolInner(name, args, userId, supabase, userAuthHeader);

  // Fire-and-forget verification for side-effect tools
  if (sideEffect) {
    fetch(`${supabaseUrl}/functions/v1/yana-action-verifier`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({
        user_id: userId,
        action_id: crypto.randomUUID(),
        action_name: name,
        agent_name: "yana-agent",
        result: { ...(typeof result === "object" && result ? result : { value: result }), latency_ms: Date.now() - startedAt },
      }),
    }).catch(() => { /* best effort */ });
  }

  return result;
}

// ---- Side-effect classification for the autonomy gate ----
interface SideEffectInfo {
  category: "financial" | "communication" | "planning" | "research" | "data_write";
  estimateAmount: (args: Record<string, unknown>) => number;
}
const SIDE_EFFECT_TOOLS: Record<string, SideEffectInfo> = {
  send_email: { category: "communication", estimateAmount: () => 0 },
  send_email_external: { category: "communication", estimateAmount: () => 0 },
  create_invoice: { category: "financial", estimateAmount: (a) => Math.round(Number(a.total_cents ?? a.amount_cents ?? (Number(a.amount ?? 0) * 100)) || 0) },
  make_payment: { category: "financial", estimateAmount: (a) => Math.round(Number(a.amount_cents ?? (Number(a.amount ?? 0) * 100)) || 0) },
  create_task: { category: "planning", estimateAmount: () => 0 },
  create_calendar_event: { category: "planning", estimateAmount: () => 0 },
  delete_record: { category: "data_write", estimateAmount: () => 0 },
};
function classifySideEffect(name: string): SideEffectInfo | null {
  if (SIDE_EFFECT_TOOLS[name]) return SIDE_EFFECT_TOOLS[name];
  const n = name.toLowerCase();
  if (n.startsWith("send_") || n.includes("email")) return { category: "communication", estimateAmount: () => 0 };
  if (n.includes("invoice") || n.includes("payment") || n.includes("efactura")) return { category: "financial", estimateAmount: () => 0 };
  if (n.startsWith("create_") || n.startsWith("update_") || n.startsWith("delete_")) return { category: "data_write", estimateAmount: () => 0 };
  return null;
}

async function executeToolInner(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  userAuthHeader: string,
): Promise<unknown> {

  const invokeEmailClient = async (payload: Record<string, unknown>) => {
    const resp = await fetch(`${supabaseUrl}/functions/v1/email-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": userAuthHeader,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.error) {
      return { error: data?.error || `email-client ${resp.status}` };
    }
    return data;
  };

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

    case "gcal_manage": {
      try {
        const { gcalFetch, getServiceClient } = await import("../_shared/google-calendar.ts");
        const action = args.action as string;

        if (action === "status") {
          const svc = getServiceClient();
          const { data: tok } = await svc
            .from("user_google_calendar_tokens")
            .select("calendar_email, last_sync_at, is_active")
            .eq("user_id", userId)
            .maybeSingle();
          return { connected: !!tok?.is_active, ...tok };
        }

        if (action === "list_events") {
          const timeMin = (args.time_min as string) || new Date().toISOString();
          const timeMax = (args.time_max as string) || new Date(Date.now() + 7 * 86400000).toISOString();
          const params = new URLSearchParams({
            timeMin, timeMax, singleEvents: "true", orderBy: "startTime",
            maxResults: String(args.max_results || 50),
          });
          const data = await gcalFetch(userId, `/calendars/primary/events?${params.toString()}`);
          // Returnez doar câmpurile esențiale pentru a economisi tokens
          const events = (data.items || []).map((e: any) => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            location: e.location,
            description: e.description,
            attendees: (e.attendees || []).map((a: any) => a.email),
            meet_link: e.conferenceData?.entryPoints?.find((x: any) => x.entryPointType === "video")?.uri,
            html_link: e.htmlLink,
          }));
          return { count: events.length, events };
        }

        if (action === "create_event") {
          const allDay = !!args.all_day;
          const event: any = {
            summary: args.summary,
            description: args.description,
            location: args.location,
            start: allDay ? { date: args.start } : { dateTime: args.start, timeZone: "Europe/Bucharest" },
            end: allDay ? { date: args.end } : { dateTime: args.end, timeZone: "Europe/Bucharest" },
          };
          const attendees = args.attendees as string[] | undefined;
          if (attendees?.length) event.attendees = attendees.map((e) => ({ email: e }));
          const created = await gcalFetch(userId, `/calendars/primary/events`, {
            method: "POST", body: JSON.stringify(event),
          });
          return { success: true, event_id: created.id, html_link: created.htmlLink, message: `Eveniment creat: "${args.summary}"` };
        }

        if (action === "update_event") {
          if (!args.event_id) return { error: "event_id obligatoriu" };
          const allDay = !!args.all_day;
          const patch: any = {};
          if (args.summary) patch.summary = args.summary;
          if (args.description) patch.description = args.description;
          if (args.location) patch.location = args.location;
          if (args.start) patch.start = allDay ? { date: args.start } : { dateTime: args.start, timeZone: "Europe/Bucharest" };
          if (args.end) patch.end = allDay ? { date: args.end } : { dateTime: args.end, timeZone: "Europe/Bucharest" };
          const updated = await gcalFetch(userId, `/calendars/primary/events/${args.event_id}`, {
            method: "PATCH", body: JSON.stringify(patch),
          });
          return { success: true, event_id: updated.id, message: "Eveniment actualizat" };
        }

        if (action === "delete_event") {
          if (!args.event_id) return { error: "event_id obligatoriu" };
          await gcalFetch(userId, `/calendars/primary/events/${args.event_id}`, { method: "DELETE" });
          return { success: true, message: "Eveniment șters" };
        }

        return { error: `Acțiune necunoscută: ${action}` };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("nu este conectat")) {
          return { error: "Google Calendar nu este conectat. Spune-i utilizatorului să meargă la Setări → Integrări și să apese 'Conectează Google Calendar'." };
        }
        return { error: msg };
      }
    }

    case "email_manage": {
      const action = String(args.action || "");
      if (action === "status") {
        const { data, error } = await supabase
          .from("user_email_accounts")
          .select("id, email_address, display_name, last_test_status, last_test_at, is_default")
          .eq("user_id", userId)
          .eq("is_default", true)
          .maybeSingle();
        if (error) return { error: error.message };
        if (!data) return { connected: false, message: "Nu există niciun cont email configurat în /email-settings." };
        return { connected: true, account: data };
      }

      if (action === "list_folders") {
        return await invokeEmailClient({ action: "list_folders" });
      }

      if (action === "list_messages") {
        return await invokeEmailClient({
          action: "list_messages",
          folder: (args.folder as string) || "INBOX",
          limit: Math.min(Number(args.limit || 10), 20),
          search: args.search || undefined,
        });
      }

      if (action === "get_message") {
        if (!args.uid) return { error: "uid obligatoriu" };
        return await invokeEmailClient({
          action: "get_message",
          folder: (args.folder as string) || "INBOX",
          uid: Number(args.uid),
        });
      }

      return { error: `Acțiune email necunoscută: ${action}` };
    }

    case "send_email": {
      try {
        const to = String(args.to || "").trim();
        const subject = String(args.subject || "").trim().slice(0, 200);
        const body = String(args.body || "").trim();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Adresa destinatarului nu este validă" };
        if (!subject) return { error: "Subiectul este obligatoriu" };
        if (!body) return { error: "Conținutul emailului este obligatoriu" };

        const localSend = await invokeEmailClient({
          action: "send_message",
          to: [to],
          cc: Array.isArray(args.cc) ? args.cc : undefined,
          subject,
          body_text: body,
        });
        if (!(localSend as { error?: string }).error) {
          return {
            success: true,
            provider: "imap_smtp",
            message_id: (localSend as { messageId?: string }).messageId,
            message: `Email trimis către ${to} din contul configurat al utilizatorului`,
          };
        }

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Yana <yana@velcont.com>";
        if (!RESEND_API_KEY) {
          return { error: (localSend as { error?: string }).error || "Trimiterea de email nu este configurată." };
        }

        // Get user email for reply_to default
        const { data: { user: userInfo } } = await supabase.auth.admin.getUserById(userId);
        const replyTo = (args.reply_to as string) || userInfo?.email || undefined;

        // Convert plain text body to HTML (preserve paragraphs)
        const htmlBody = body.includes("<") && body.includes(">")
          ? body
          : body.split(/\n\n+/).map(p => `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">${p.replace(/\n/g, "<br>")}</p>`).join("");

        const payload: Record<string, unknown> = {
          from: RESEND_FROM_EMAIL,
          to: [to],
          subject,
          html: `<div style="max-width:600px">${htmlBody}</div>`,
          text: body,
        };
        if (Array.isArray(args.cc) && args.cc.length) payload.cc = args.cc;
        if (replyTo) payload.reply_to = replyTo;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          return { error: `Resend a refuzat: ${resp.status} ${JSON.stringify(data)}` };
        }

        // Log in email_logs
        await supabase.from("email_logs").insert({
          email_type: "yana_agent",
          recipient_email: to,
          subject,
          status: "sent",
          metadata: { user_id: userId, message_id: data.id, reply_to: replyTo },
        }).then(() => {}).catch(() => {});

        return { success: true, message_id: data.id, message: `Email trimis către ${to}` };
      } catch (e) {
        return { error: (e as Error).message };
      }
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

    // ============= CRM EXECUTORS =============
    case "crm_manage_companies": {
      const action = args.action as string;
      if (action === "list") {
        const { data, error } = await supabase.from("crm_companies").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
        if (error) return { error: error.message };
        return { companies: data || [] };
      }
      if (action === "search") {
        const q = (args.query as string) || "";
        const { data, error } = await supabase.from("crm_companies").select("*").eq("user_id", userId).or(`name.ilike.%${q}%,cui.ilike.%${q}%,email.ilike.%${q}%`).limit(20);
        if (error) return { error: error.message };
        return { companies: data || [] };
      }
      if (action === "get") {
        if (!args.company_id) return { error: "company_id obligatoriu" };
        const { data, error } = await supabase.from("crm_companies").select("*").eq("id", args.company_id).eq("user_id", userId).maybeSingle();
        if (error) return { error: error.message };
        return { company: data };
      }
      if (action === "create") {
        if (!args.name) return { error: "name obligatoriu" };
        const { data, error } = await supabase.from("crm_companies").insert({
          user_id: userId,
          name: args.name,
          cui: args.cui || null,
          industry: args.industry || null,
          website: args.website || null,
          phone: args.phone || null,
          email: args.email || null,
          city: args.city || null,
          annual_revenue: args.annual_revenue || null,
          notes: args.notes || null,
          tags: args.tags || [],
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "update") {
        if (!args.company_id) return { error: "company_id obligatoriu" };
        const update: Record<string, unknown> = {};
        for (const k of ["name", "cui", "industry", "website", "phone", "email", "city", "annual_revenue", "notes", "tags"]) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        const { data, error } = await supabase.from("crm_companies").update(update).eq("id", args.company_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      return { error: "action invalid" };
    }

    case "crm_manage_contacts": {
      const action = args.action as string;
      if (action === "list") {
        const { data, error } = await supabase.from("crm_contacts").select("*, crm_companies(name)").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
        if (error) return { error: error.message };
        return { contacts: data || [] };
      }
      if (action === "search") {
        const q = (args.query as string) || "";
        const { data, error } = await supabase.from("crm_contacts").select("*, crm_companies(name)").eq("user_id", userId).or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`).limit(20);
        if (error) return { error: error.message };
        return { contacts: data || [] };
      }
      if (action === "get") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const { data, error } = await supabase.from("crm_contacts").select("*, crm_companies(name)").eq("id", args.contact_id).eq("user_id", userId).maybeSingle();
        if (error) return { error: error.message };
        return { contact: data };
      }
      if (action === "create") {
        if (!args.first_name) return { error: "first_name obligatoriu" };
        const { data, error } = await supabase.from("crm_contacts").insert({
          user_id: userId,
          company_id: args.company_id || null,
          first_name: args.first_name,
          last_name: args.last_name || null,
          email: args.email || null,
          phone: args.phone || null,
          job_title: args.job_title || null,
          notes: args.notes || null,
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "update") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const update: Record<string, unknown> = {};
        for (const k of ["company_id", "first_name", "last_name", "email", "phone", "job_title", "notes"]) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        const { data, error } = await supabase.from("crm_contacts").update(update).eq("id", args.contact_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      return { error: "action invalid" };
    }

    case "crm_manage_deals": {
      const action = args.action as string;
      // Asigură pipeline default
      const { data: pipelineId } = await supabase.rpc("ensure_default_crm_pipeline", { p_user_id: userId });
      if (!pipelineId) return { error: "Nu am putut crea pipeline-ul default" };

      if (action === "list") {
        const { data, error } = await supabase.from("crm_deals").select("*, crm_companies(name), crm_pipeline_stages(name, color)").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
        if (error) return { error: error.message };
        return { deals: data || [] };
      }
      if (action === "pipeline") {
        const { data: stages } = await supabase.from("crm_pipeline_stages").select("*").eq("pipeline_id", pipelineId).eq("user_id", userId).order("display_order");
        const { data: deals } = await supabase.from("crm_deals").select("*, crm_companies(name)").eq("user_id", userId).eq("pipeline_id", pipelineId).eq("status", "open").order("value", { ascending: false });
        return { stages: stages || [], deals: deals || [] };
      }
      if (action === "create") {
        if (!args.title) return { error: "title obligatoriu" };
        // Determină stage
        let stageId: string | null = null;
        const stageName = (args.stage_name as string) || "Lead nou";
        const { data: stage } = await supabase.from("crm_pipeline_stages").select("id").eq("pipeline_id", pipelineId).eq("user_id", userId).ilike("name", stageName).maybeSingle();
        if (stage) stageId = stage.id;
        if (!stageId) {
          const { data: firstStage } = await supabase.from("crm_pipeline_stages").select("id").eq("pipeline_id", pipelineId).eq("user_id", userId).order("display_order").limit(1).maybeSingle();
          stageId = firstStage?.id || null;
        }
        if (!stageId) return { error: "Nu există etape în pipeline" };

        const { data, error } = await supabase.from("crm_deals").insert({
          user_id: userId,
          pipeline_id: pipelineId,
          stage_id: stageId,
          company_id: args.company_id || null,
          contact_id: args.contact_id || null,
          title: args.title,
          description: args.description || null,
          value: args.value || 0,
          currency: args.currency || "RON",
          expected_close_date: args.expected_close_date || null,
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "move_stage") {
        if (!args.deal_id || !args.stage_name) return { error: "deal_id și stage_name obligatorii" };
        const { data: stage } = await supabase.from("crm_pipeline_stages").select("id, is_won, is_lost").eq("pipeline_id", pipelineId).eq("user_id", userId).ilike("name", args.stage_name as string).maybeSingle();
        if (!stage) return { error: `Etapa "${args.stage_name}" nu există` };
        const update: Record<string, unknown> = { stage_id: stage.id };
        if (stage.is_won) { update.status = "won"; update.actual_close_date = new Date().toISOString().split("T")[0]; }
        if (stage.is_lost) { update.status = "lost"; update.actual_close_date = new Date().toISOString().split("T")[0]; }
        const { data, error } = await supabase.from("crm_deals").update(update).eq("id", args.deal_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      if (action === "win") {
        if (!args.deal_id) return { error: "deal_id obligatoriu" };
        const { data: wonStage } = await supabase.from("crm_pipeline_stages").select("id").eq("pipeline_id", pipelineId).eq("user_id", userId).eq("is_won", true).maybeSingle();
        const { data, error } = await supabase.from("crm_deals").update({ status: "won", stage_id: wonStage?.id, actual_close_date: new Date().toISOString().split("T")[0] }).eq("id", args.deal_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { won: data };
      }
      if (action === "lose") {
        if (!args.deal_id) return { error: "deal_id obligatoriu" };
        const { data: lostStage } = await supabase.from("crm_pipeline_stages").select("id").eq("pipeline_id", pipelineId).eq("user_id", userId).eq("is_lost", true).maybeSingle();
        const { data, error } = await supabase.from("crm_deals").update({ status: "lost", stage_id: lostStage?.id, lost_reason: args.lost_reason || null, actual_close_date: new Date().toISOString().split("T")[0] }).eq("id", args.deal_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { lost: data };
      }
      if (action === "update") {
        if (!args.deal_id) return { error: "deal_id obligatoriu" };
        const update: Record<string, unknown> = {};
        for (const k of ["title", "description", "value", "currency", "expected_close_date", "company_id", "contact_id"]) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        const { data, error } = await supabase.from("crm_deals").update(update).eq("id", args.deal_id).eq("user_id", userId).select().single();
        if (error) return { error: error.message };
        return { updated: data };
      }
      return { error: "action invalid" };
    }

    case "crm_log_activity": {
      if (!args.activity_type || !args.subject) return { error: "activity_type și subject obligatorii" };
      const completed = args.completed !== false; // default true (a se întâmplat deja)
      const { data, error } = await supabase.from("crm_activities").insert({
        user_id: userId,
        activity_type: args.activity_type,
        subject: args.subject,
        description: args.description || null,
        contact_id: args.contact_id || null,
        company_id: args.company_id || null,
        deal_id: args.deal_id || null,
        scheduled_at: args.scheduled_at || null,
        completed_at: completed ? new Date().toISOString() : null,
        status: completed ? "completed" : "pending",
        duration_minutes: args.duration_minutes || null,
      }).select().single();
      if (error) return { error: error.message };
      return { logged: data };
    }

    case "crm_intelligence": {
      const action = args.action as string;

      // ===== LEAD SCORING =====
      const computeScore = (c: Record<string, unknown>): { score: number; reasons: string[] } => {
        let score = 0;
        const reasons: string[] = [];
        if (c.email) { score += 15; reasons.push("+15 email"); }
        if (c.phone) { score += 10; reasons.push("+10 telefon"); }
        if (c.job_title) {
          const t = String(c.job_title).toLowerCase();
          if (/(ceo|director|owner|fondator|founder|manager general|administrator)/.test(t)) {
            score += 25; reasons.push("+25 decision maker");
          } else if (/(cfo|cto|coo|vp|head)/.test(t)) {
            score += 20; reasons.push("+20 C-level");
          } else { score += 5; reasons.push("+5 job title"); }
        }
        if (c.linkedin_url) { score += 10; reasons.push("+10 LinkedIn"); }
        if (c.company_id) { score += 15; reasons.push("+15 firmă asociată"); }
        if (c.last_activity_at) {
          const days = (Date.now() - new Date(c.last_activity_at as string).getTime()) / 86400000;
          if (days < 7) { score += 20; reasons.push("+20 activitate recentă (<7z)"); }
          else if (days < 30) { score += 10; reasons.push("+10 activitate recentă (<30z)"); }
        }
        const tags = (c.tags as string[]) || [];
        if (tags.includes("VIP") || tags.includes("hot")) { score += 15; reasons.push("+15 tag VIP/hot"); }
        return { score: Math.min(100, score), reasons };
      };

      if (action === "score_lead") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const { data: c, error } = await supabase.from("crm_contacts").select("*").eq("id", args.contact_id).eq("user_id", userId).maybeSingle();
        if (error || !c) return { error: error?.message || "Contact negăsit" };
        const { score, reasons } = computeScore(c);
        await supabase.from("crm_contacts").update({ lead_score: score, lead_score_reasons: reasons }).eq("id", args.contact_id);
        return { contact_id: args.contact_id, score, reasons };
      }

      if (action === "score_all_leads") {
        const { data: contacts } = await supabase.from("crm_contacts").select("*").eq("user_id", userId);
        if (!contacts) return { scored: 0 };
        let scored = 0;
        for (const c of contacts) {
          const { score, reasons } = computeScore(c);
          await supabase.from("crm_contacts").update({ lead_score: score, lead_score_reasons: reasons }).eq("id", c.id);
          scored++;
        }
        return { scored, message: `${scored} contacte scorate` };
      }

      if (action === "top_leads") {
        const limit = (args.limit as number) || 20;
        const { data, error } = await supabase.from("crm_contacts")
          .select("id, first_name, last_name, email, job_title, lead_score, lead_score_reasons, crm_companies(name)")
          .eq("user_id", userId).order("lead_score", { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { top_leads: data };
      }

      // ===== ACTIVITY TIMELINE =====
      if (action === "contact_timeline") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const { data, error } = await supabase.from("crm_activities")
          .select("*").eq("user_id", userId).eq("contact_id", args.contact_id)
          .order("created_at", { ascending: false }).limit(50);
        if (error) return { error: error.message };
        return { timeline: data, count: data?.length || 0 };
      }

      // ===== EMAIL TEMPLATES =====
      if (action === "list_templates") {
        const { data, error } = await supabase.from("crm_email_templates").select("*").eq("user_id", userId).order("use_count", { ascending: false });
        if (error) return { error: error.message };
        return { templates: data };
      }
      if (action === "create_template") {
        if (!args.template_name || !args.template_subject || !args.template_body) return { error: "name, subject, body obligatorii" };
        const vars = String(args.template_body + " " + args.template_subject).match(/\{\{(\w+)\}\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
        const { data, error } = await supabase.from("crm_email_templates").insert({
          user_id: userId,
          name: args.template_name,
          subject: args.template_subject,
          body: args.template_body,
          category: args.template_category || "general",
          variables: [...new Set(vars)],
        }).select().single();
        if (error) return { error: error.message };
        return { created: data };
      }
      if (action === "use_template") {
        if (!args.template_id) return { error: "template_id obligatoriu" };
        const { data: tpl, error } = await supabase.from("crm_email_templates").select("*").eq("id", args.template_id).eq("user_id", userId).maybeSingle();
        if (error || !tpl) return { error: error?.message || "Template negăsit" };
        let subject = tpl.subject as string;
        let body = tpl.body as string;
        const vars = (args.variables as Record<string, string>) || {};
        for (const [k, v] of Object.entries(vars)) {
          const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
          subject = subject.replace(re, String(v));
          body = body.replace(re, String(v));
        }
        await supabase.from("crm_email_templates").update({ use_count: (tpl.use_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", args.template_id);
        return { subject, body, template_name: tpl.name };
      }
      if (action === "delete_template") {
        if (!args.template_id) return { error: "template_id obligatoriu" };
        const { error } = await supabase.from("crm_email_templates").delete().eq("id", args.template_id).eq("user_id", userId);
        if (error) return { error: error.message };
        return { deleted: true };
      }

      // ===== BULK ACTIONS =====
      if (action === "bulk_update_contacts") {
        const ids = (args.contact_ids as string[]) || [];
        if (!ids.length || !args.updates) return { error: "contact_ids și updates obligatorii" };
        const { data, error } = await supabase.from("crm_contacts").update(args.updates as Record<string, unknown>).in("id", ids).eq("user_id", userId).select("id");
        if (error) return { error: error.message };
        return { updated: data?.length || 0 };
      }
      if (action === "bulk_tag_contacts") {
        const ids = (args.contact_ids as string[]) || [];
        const newTags = (args.tags as string[]) || [];
        if (!ids.length || !newTags.length) return { error: "contact_ids și tags obligatorii" };
        const { data: existing } = await supabase.from("crm_contacts").select("id, tags").in("id", ids).eq("user_id", userId);
        let count = 0;
        for (const c of existing || []) {
          const merged = [...new Set([...((c.tags as string[]) || []), ...newTags])];
          await supabase.from("crm_contacts").update({ tags: merged }).eq("id", c.id);
          count++;
        }
        return { tagged: count };
      }

      // ===== CONTACT ENRICHMENT =====
      if (action === "enrich_contact") {
        if (!args.contact_id) return { error: "contact_id obligatoriu" };
        const { data: c } = await supabase.from("crm_contacts").select("*, crm_companies(name, website, cui)").eq("id", args.contact_id).eq("user_id", userId).maybeSingle();
        if (!c) return { error: "Contact negăsit" };
        const enrichment: Record<string, unknown> = {};
        const updates: Record<string, unknown> = {};
        // Heuristic: extract company from email domain
        if (c.email && !c.company_id) {
          const domain = String(c.email).split("@")[1];
          if (domain && !/(gmail|yahoo|hotmail|outlook|icloud)\./.test(domain)) {
            enrichment.suggested_company_domain = domain;
            enrichment.suggested_website = `https://${domain}`;
          }
        }
        // Infer LinkedIn URL from name
        if (c.first_name && !c.linkedin_url) {
          const slug = `${c.first_name}-${c.last_name || ""}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          enrichment.suggested_linkedin = `https://www.linkedin.com/in/${slug}/`;
        }
        // Detect role seniority from title
        if (c.job_title) {
          const t = String(c.job_title).toLowerCase();
          enrichment.seniority = /(ceo|owner|fondator|director general|administrator)/.test(t) ? "C-level"
            : /(manager|lead|head)/.test(t) ? "Senior"
            : "Standard";
        }
        updates.enrichment_data = enrichment;
        updates.enriched_at = new Date().toISOString();
        await supabase.from("crm_contacts").update(updates).eq("id", args.contact_id);
        return { contact_id: args.contact_id, enrichment };
      }

      // ===== FORECAST =====
      if (action === "forecast_revenue") {
        const { data, error } = await supabase.rpc("crm_forecast_revenue", { p_user_id: userId });
        if (error) return { error: error.message };
        const total_weighted = (data || []).reduce((s: number, r: { weighted_value: number }) => s + Number(r.weighted_value || 0), 0);
        const total_pipeline = (data || []).reduce((s: number, r: { total_value: number }) => s + Number(r.total_value || 0), 0);
        return { stages: data, total_pipeline, forecast_weighted: Math.round(total_weighted) };
      }

      // ===== REPORTS =====
      if (action === "report_metrics") {
        const { data, error } = await supabase.rpc("crm_report_metrics", { p_user_id: userId });
        if (error) return { error: error.message };
        return { metrics: data };
      }

      // ===== DUPLICATES =====
      if (action === "find_duplicates") {
        const { data, error } = await supabase.rpc("detect_contact_duplicates", { p_user_id: userId });
        if (error) return { error: error.message };
        // Persist groups
        for (const g of data || []) {
          await supabase.from("crm_duplicate_groups").upsert({
            user_id: userId,
            match_type: g.match_type,
            match_key: g.match_key,
            contact_ids: g.contact_ids,
            resolved: false,
          }, { onConflict: "id" });
        }
        return { duplicate_groups: data, count: data?.length || 0 };
      }
      if (action === "merge_duplicates") {
        if (!args.keep_id || !(args.merge_ids as string[])?.length) return { error: "keep_id și merge_ids obligatorii" };
        const mergeIds = (args.merge_ids as string[]).filter(id => id !== args.keep_id);
        // Re-link activities and deals to keep_id
        await supabase.from("crm_activities").update({ contact_id: args.keep_id }).in("contact_id", mergeIds).eq("user_id", userId);
        await supabase.from("crm_deals").update({ contact_id: args.keep_id }).in("contact_id", mergeIds).eq("user_id", userId);
        const { error } = await supabase.from("crm_contacts").delete().in("id", mergeIds).eq("user_id", userId);
        if (error) return { error: error.message };
        await supabase.from("crm_duplicate_groups").update({ resolved: true, resolved_at: new Date().toISOString() }).contains("contact_ids", [args.keep_id]).eq("user_id", userId);
        return { merged: mergeIds.length, kept: args.keep_id };
      }

      // ===== CURRENCY =====
      if (action === "list_currency_rates") {
        const { data } = await supabase.from("crm_currency_rates").select("*");
        return { rates: data };
      }
      if (action === "convert_currency") {
        const amount = args.amount as number;
        const from = (args.from_currency as string) || "RON";
        const to = (args.to_currency as string) || "RON";
        if (typeof amount !== "number") return { error: "amount obligatoriu" };
        const { data: rates } = await supabase.from("crm_currency_rates").select("*").in("currency", [from, to]);
        const fromRate = rates?.find(r => r.currency === from)?.rate_to_ron || 1;
        const toRate = rates?.find(r => r.currency === to)?.rate_to_ron || 1;
        const ron = amount * Number(fromRate);
        const converted = ron / Number(toRate);
        return { amount, from, to, converted: Math.round(converted * 100) / 100, rate: fromRate / toRate };
      }

      // ===== ACTIVITY FEED =====
      if (action === "activity_feed") {
        const days = (args.days as number) || 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase.from("crm_activities")
          .select("*, crm_contacts(first_name, last_name), crm_companies(name), crm_deals(title)")
          .eq("user_id", userId).gte("created_at", since)
          .order("created_at", { ascending: false }).limit(100);
        if (error) return { error: error.message };
        return { feed: data, count: data?.length || 0, since };
      }

      return { error: `Acțiune necunoscută: ${action}` };
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

const SYSTEM_PROMPT_FULL = SYSTEM_PROMPT + YANA_CHIEF_OF_STAFF_PROMPT;

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

  const { message, conversation_history = [], fileData } = await req.json();
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
        // 📎 Parse uploaded file (xlsx/xls/csv/txt) and attach as context
        let fileContextBlock = "";
        if (fileData && fileData.fileName && fileData.fileContent) {
          try {
            const name = String(fileData.fileName || "").toLowerCase();
            const ext = name.split(".").pop() || "";
            let extracted = "";
            if (ext === "xlsx" || ext === "xls") {
              extracted = await parseExcelWithXLSX(fileData.fileContent);
            } else if (ext === "csv" || ext === "txt" || ext === "md" || ext === "json") {
              // fileContent is base64 (data URL or raw); decode to UTF-8
              const raw = String(fileData.fileContent).includes(",")
                ? String(fileData.fileContent).split(",")[1]
                : String(fileData.fileContent);
              try {
                const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
                extracted = new TextDecoder("utf-8").decode(bytes);
              } catch {
                extracted = raw;
              }
            } else {
              extracted = `[Fișier ${fileData.fileName} (${fileData.fileType || ext}) — format binar; nu pot extrage text aici. Rezumă pe baza numelui sau cere conversie.]`;
            }
            // Truncate to keep prompt size sane
            const MAX = 60000;
            if (extracted.length > MAX) {
              extracted = extracted.slice(0, MAX) + `\n\n[...trunchiat la ${MAX} caractere din ${extracted.length}]`;
            }
            fileContextBlock = `\n\n📎 FIȘIER ATAȘAT: ${fileData.fileName}\n--- CONȚINUT EXTRAS ---\n${extracted}\n--- SFÂRȘIT FIȘIER ---\n`;
            send("thinking", { text: `Am citit fișierul ${fileData.fileName} (${extracted.length} caractere extrase).` });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            fileContextBlock = `\n\n📎 [Nu am putut parsa fișierul ${fileData.fileName}: ${msg}]\n`;
            send("thinking", { text: `Eroare la citirea fișierului: ${msg}` });
          }
        }

        const messages: Array<Record<string, unknown>> = [
          { role: "system", content: SYSTEM_PROMPT_FULL },
          ...conversation_history.slice(-10).map((m: { role: string; content: string }) => ({
            role: m.role, content: m.content,
          })),
          { role: "user", content: fileContextBlock ? `${message}${fileContextBlock}` : message },
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
                result = await executeTool(fnName, parsedArgs, user.id, supabase, authHeader);
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