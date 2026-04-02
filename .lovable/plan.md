

# Plan: Agent Architecture Upgrade — Aplicarea LangChain, LangGraph, CrewAI, LlamaIndex, AgentStack și GenAI Agents în YANA

## Ce conțin cele 6 framework-uri

| Framework | Concept principal | Ce e relevant pentru YANA |
|---|---|---|
| **LangChain** | Chain-uri modulare, tool calling structurat, output parsers, memory types | **Structured tool calling** și **memory management** |
| **LangGraph** | State machines cu grafuri ciclice, conditional edges, checkpointing | **Graph-based orchestration** — cicluri decizionale cu state persistent |
| **CrewAI** | Multi-agent collaboration, roles, tasks, delegation | **Agent specialization** — fiecare sub-sistem ca agent cu rol clar |
| **LlamaIndex** | RAG pipelines, document indexing, query engines | **Retrieval-augmented generation** din documente și analize anterioare |
| **AgentStack** | Agent scaffolding, composable tools, observability | **Observability layer** — logging structurat al deciziilor agenților |
| **GenAI Agents** | Agent patterns (ReAct, Plan-and-Execute, Tool-Use) | **ReAct loop** — Reason → Act → Observe pentru YANA |

## Ce are deja YANA vs. ce lipsește

| Concept | YANA are | Ce lipsește |
|---|---|---|
| Orchestrare | `ai-router` — routing simplu if/else | **State graph** cu condiții și rollback |
| Memory | Conversational history liniară | **Tiered memory**: working / episodic / semantic |
| Multi-agent | Observer, Actor, Reflector, Explorer — izolați | **Delegation protocol** — agenții să comunice între ei |
| Tool calling | `extract-actions` — un singur tool | **Tool registry** — YANA să-și aleagă singură tool-ul |
| RAG | `find_similar_conversations` — keyword match | **Semantic retrieval** din toate sursele de cunoaștere |
| Planning | `yana-brain` — mode switching simplu | **Plan-and-Execute** — planuri multi-step cu verificare |

## Ce aplicăm concret

### Pas 1: Tiered Memory System (inspirat LangChain + LlamaIndex)

Upgrade la sistemul de memorie cu 3 niveluri:

**Tabel nou: `yana_semantic_memory`**
- `id`, `user_id`, `memory_type` (working / episodic / semantic), `content`, `embedding_key` (hash pentru dedup), `relevance_score`, `access_count`, `last_accessed_at`, `created_at`
- Working memory: context activ (se șterge la final de conversație)  
- Episodic memory: fapte din conversații specifice ("Clientul X are DSO de 90 zile")
- Semantic memory: cunoștințe generalizate ("Firmele cu DSO > 60 sunt de obicei în dificultate")

**Edge function: `memory-manager`** — procesare post-conversație:
- Extrage fapte din răspunsuri (episodic)
- Consolidează fapte repetate în cunoștințe (semantic)
- Promovare automată: dacă un fapt episodic apare de 3+ ori → devine semantic
- Injecție în `chat-ai`: cele mai relevante 5 memorii semantice + 3 episodice per user

### Pas 2: Agent Delegation Protocol (inspirat CrewAI)

Upgrade la `ai-router` cu un protocol de delegare:

**Conceptul**: În loc de if/else routing, ai-router-ul devine un **Coordinator Agent** care:
1. Primește mesajul
2. Evaluează ce agenți sunt necesari (poate fi >1)
3. Delegă secvențial sau paralel
4. Agregă rezultatele

**Implementare**: Adăugare secțiune `DELEGATION_RULES` în ai-router:
```
Dacă mesajul necesită: analiză financiară + sfat strategic
→ Delegă la: analyze-balance APOI strategic-advisor (secvențial)
→ Primul oferă context celui de-al doilea
```

**Tabel nou: `yana_delegation_log`**
- `id`, `conversation_id`, `coordinator_decision`, `agents_involved` (JSONB array), `delegation_type` (sequential/parallel), `execution_time_ms`, `success`, `created_at`

### Pas 3: ReAct Loop în Chat-AI (inspirat GenAI Agents + LangGraph)

Upgrade la `chat-ai` cu un ciclu Reason-Act-Observe:

Când YANA primește o întrebare complexă, în loc de un singur apel AI:
1. **Reason**: "Ce informații am? Ce-mi lipsește?" (un apel scurt la Gemini Flash Lite)
2. **Act**: Apelează tool-uri necesare (DB lookup, search, calcul)
3. **Observe**: Verifică dacă răspunsul e complet
4. **Repeat**: Dacă nu, reiterează (max 3 cicluri)

**Implementare**: Funcție `reactLoop()` internă în chat-ai:
- Max 3 iterații per întrebare
- La fiecare iterație, modelul poate cere: `NEED_DATA`, `NEED_CALCULATION`, `READY_TO_RESPOND`
- Cost suplimentar: ~1 apel extra Gemini Flash Lite (~0.01 RON) doar pentru întrebări complexe

### Pas 4: Plan-and-Execute pentru Yana Brain (inspirat LangGraph)

Upgrade la `yana-brain` cu capacitate de planificare multi-step:

Actualmente brain-ul decide UN singur mod. Noul brain poate crea **planuri**:
```
Plan: [observe → act → explore → reflect]
Step 1: observe (dacă > 10 observații noi)
Step 2: act (procesează observații)  
Step 3: explore (dacă stabil după act)
Step 4: reflect (consolidare finală)
```

**Tabel nou: `yana_execution_plans`**
- `id`, `plan_steps` (JSONB array cu ordine), `current_step`, `status` (running/completed/failed), `started_at`, `completed_at`
- Brain verifică dacă un plan e în execuție înainte de a crea altul
- Fiecare step are `precondition` (verificare înainte de execuție)

### Pas 5: Observability Layer (inspirat AgentStack)

**Tabel nou: `yana_agent_traces`**
- `id`, `trace_id` (UUID per request), `agent_name`, `input_summary`, `output_summary`, `duration_ms`, `tokens_used`, `cost_cents`, `parent_trace_id` (pentru nested calls), `created_at`
- Fiecare edge function loghează un trace
- Dashboard Admin: vizualizare trace-uri ca un "agent call tree"

**Upgrade ExplorationsDashboard**: Tab nou "Agent Traces" cu:
- Timeline vizuală a apelurilor între agenți
- Cost per agent per zi
- Rata de succes per agent

## Modificări DB (migrare)

```sql
-- Tiered memory system
CREATE TABLE yana_semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'episodic' 
    CHECK (memory_type IN ('working','episodic','semantic')),
  content TEXT NOT NULL,
  embedding_key TEXT,
  relevance_score NUMERIC DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  source_conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Delegation log
CREATE TABLE yana_delegation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  coordinator_decision JSONB DEFAULT '{}',
  agents_involved JSONB DEFAULT '[]',
  delegation_type TEXT DEFAULT 'sequential',
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Execution plans
CREATE TABLE yana_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_steps JSONB NOT NULL DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent traces
CREATE TABLE yana_agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  parent_trace_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin only for all
ALTER TABLE yana_semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana_delegation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana_agent_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON yana_semantic_memory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own memory" ON yana_semantic_memory
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin full access" ON yana_delegation_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access" ON yana_execution_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access" ON yana_agent_traces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## Fișiere modificate/create

| Fișier | Ce se schimbă |
|---|---|
| `memory-manager/index.ts` | **NOU** — extrage și consolidează memorii din conversații |
| `ai-router/index.ts` | +Delegation protocol, +multi-agent coordination |
| `chat-ai/index.ts` | +ReAct loop, +memory injection (semantic + episodic) |
| `yana-brain/index.ts` | +Plan-and-Execute cu multi-step plans |
| `self-reflect/index.ts` | +Agent trace logging |
| `yana-explorer/index.ts` | +Agent trace logging |
| `yana-observer/index.ts` | +Agent trace logging |
| `yana-actor/index.ts` | +Agent trace logging |
| `ExplorationsDashboard.tsx` | +Tab "Agent Traces" |
| Migrare DB | 4 tabele noi |

## Impact

| Aspect | Detaliu |
|---|---|
| Cost suplimentar AI | ~0.01-0.03 RON/conversație complexă (ReAct loop) |
| Cost memory-manager | ~0.005 RON/conversație (Gemini Flash Lite) |
| Tokeni prompt | +~200 (memory injection) |
| Complexitate | Mare — dar toate sunt upgrade-uri la funcții existente |
| Beneficiu | YANA trece de la "chatbot cu routing" la **sistem multi-agent cu memorie persistentă și planificare autonomă** |

