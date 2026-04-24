
# /yana → Sistem Cognitiv Autonom — Plan realist

Ai cerut un sistem masiv. Vestea bună: **80% există deja** în codebase (yana-agent, yana-brain, orchestrator, self-coder, action-engine, memory, multi-agent, dreams). Vestea proastă: stack-ul propus (Kafka, Kubernetes, FastAPI, Weaviate, Playwright, modele locale offline) **nu poate rula pe Lovable Cloud** — rămânem pe React + Deno Edge Functions + Postgres + pgvector, care acoperă funcțional aceleași nevoi.

Planul: **consolidăm ce avem, umplem golurile reale și adăugăm un Control Center vizibil în /yana** ca să simți autonomia, nu doar să existe în background.

## Ce există deja (nu reconstruim)

| Cerință | Implementare existentă |
|---|---|
| Orchestrator central | `yana-agent` + `yana-brain` |
| Multi-agent coordination | `yana-agents-orchestrator`, `multi-agent-manager` în yana-agent, `yana-dynamic-agent` |
| Self-tooling | `yana-self-coder` + `yana-agent-spawner` (50 agenți max) |
| Action layer | Action Engine, `email-client`, `google-calendar-manage`, `generate-*-document`, `efactura-anaf` |
| Memory deep | `yana_semantic_memory` (pgvector), `yana_relationships`, `yana_emotional_patterns` |
| Reasoning + reduce halucinații | `validate-knowledge`, `validate-strategic-facts`, ground-truth tier system |
| Proactive opportunities | `yana-explorer`, `surprise-detector`, `yana-prospector`, `eu-grants-scanner` |
| Personalitate adaptivă | `update-self-model`, `yana-consciousness-prompt`, claude-empathy-agent |
| Audit / transparență | `yana_agent_traces`, `audit_logs`, `ai_reflection_logs` |
| Initiative continuă | `yana-initiative-scheduler` (cronuri proactive) |

## Goluri reale pe care le închidem

### 1. Control Center în /yana (UI nou — `/yana/control`)
Un singur dashboard unde vezi și controlezi:
- **Autonomy Dial**: slider 0-100 (Manual → Asistat → Autonom → Total Autonom). Salvat în `yana_autonomy_settings`.
- **Risk threshold**: cap RON pentru acțiuni fără confirmare (default: 100 RON, plăți peste → confirm).
- **Live Activity Feed**: stream realtime din `yana_agent_traces` — vezi ce face Yana acum.
- **Active Goals**: obiective long-term din `yana_intentions` cu progress bar.
- **Pending Confirmations**: acțiuni care așteaptă aprobare (inbox stil).
- **Agents online**: lista agenților dinamici activi + buton kill.

### 2. Future Engine (simulare scenarii)
Edge function nouă `yana-future-engine`:
- Input: decizie sau întrebare strategică
- Generează 3 scenarii (optimist / realist / pesimist) cu Gemini 2.5 Pro
- Compară pe KPI-urile user-ului (cash flow, profit, risc)
- Salvează în `yana_simulations` + afișează în Control Center
- Yana explică scurt în chat de ce a ales varianta X

### 3. Goal Manager (obiective long-term)
Extindem `yana_intentions` cu:
- `parent_goal_id` (sub-task tree)
- `progress_pct`, `next_action_at`, `auto_execute` bool
- Funcție SQL `decompose_goal()` care sparge un goal mare în 3-7 task-uri
- Cron `yana-goal-tracker` (zilnic): verifică progres, ajustează strategie, alertează dacă bloc

### 4. Risk Tolerance Learning
Tabel nou `yana_risk_decisions`: log fiecare decizie + dacă user-ul a aprobat/respins/corectat.
Yana învață: peste timp, ridică/coboară pragul de auto-execuție per categorie (financiar / comunicare / planificare).

### 5. Action Verification Loop
Wrapper în yana-agent: după orice acțiune executată (email trimis, factură creată, event creat), un al doilea agent verifică rezultatul (status code, conținut, side effects) și dacă detectează eroare → retry sau rollback automat. Loghează în `yana_action_verifications`.

### 6. Decision Explainer
Tool nou `explain_decision` în yana-agent: pentru orice decizie trecută (din traces), generează un explainer scurt în limbaj uman + lanțul de raționament. Buton "De ce?" pe orice card din Control Center.

### 7. Mood/Context Adapter (deja parțial există)
Adăugăm detecție explicită de context (business / personal / urgent / relaxat) la începutul fiecărui mesaj și ajustăm `temperature` + ton în system prompt automat.

## Ce NU facem (și de ce)

| Cerință | De ce nu |
|---|---|
| Kafka / Kubernetes / Docker | Lovable Cloud nu permite infra custom — folosim cron + edge functions, suficient pentru scale-ul tău |
| Python FastAPI microservicii | Backend-ul e Deno edge functions; rescriere = 6 luni pierdute fără câștig real |
| Weaviate / Pinecone / Milvus | Avem pgvector în Postgres deja, identic funcțional |
| Playwright browser automation | Edge functions nu rulează headless browser; folosim API-uri direct (Gmail, Calendar, ANAF, Stripe — toate au API) |
| Modele LLM locale offline | Avem deja `yana-local-bridge` pentru Ollama opțional pe device-ul user-ului; offline real în browser = imposibil |
| Plăți autonome | Risc legal mare; rămân cu confirmare obligatorie indiferent de autonomy dial |

## Detalii tehnice

### Tabele noi
- `yana_autonomy_settings` (user_id, autonomy_level int, max_auto_spend_cents int, categories jsonb, updated_at)
- `yana_simulations` (id, user_id, question, scenarios jsonb, chosen_scenario, reasoning, created_at)
- `yana_risk_decisions` (id, user_id, action_type, amount_cents, auto_executed bool, user_override, created_at)
- `yana_action_verifications` (id, action_id, agent_name, success bool, error, retry_count, created_at)
- Extindere `yana_intentions`: parent_goal_id, progress_pct, next_action_at, auto_execute, sub_tasks jsonb

### Edge functions noi
- `yana-future-engine` — simulare scenarii
- `yana-goal-tracker` (cron daily) — progres obiective
- `yana-action-verifier` — verifică post-execuție
- `yana-autonomy-gate` — middleware care decide auto-execute vs cere confirmare

### UI
- `src/pages/YanaControl.tsx` (rută `/yana/control`) — Control Center
- Card nou în `/yana` header: "Control Center" → `/yana/control`
- `src/components/yana/AutonomyDial.tsx`, `LiveActivityFeed.tsx` (Supabase realtime pe `yana_agent_traces`), `PendingConfirmations.tsx`, `ActiveGoals.tsx`, `SimulationViewer.tsx`

### Integrare în yana-agent
- Înainte de orice tool call cu side-effect: cheamă `yana-autonomy-gate` → decide execute / queue-for-confirmation / reject
- După orice tool call: emite event către `yana-action-verifier` async
- Tool nou `simulate_future({question, horizon_days})`
- Tool nou `manage_goal({action: create|decompose|update|complete, ...})`

## Plan de execuție (în ordine)
1. Migration: tabele noi + extensii
2. `yana-autonomy-gate` + integrare în yana-agent
3. UI Control Center (`/yana/control`) cu Autonomy Dial + Live Feed + Pending Confirmations
4. `yana-future-engine` + tool `simulate_future` + Simulation Viewer în UI
5. Goal Manager (extensie intentions + cron tracker + UI Active Goals)
6. Action Verification Loop
7. Risk Learning + Decision Explainer

Estimare: ~7-10 mesaje de implementare. Vrei să începem cu pasul 1-3 (fundament: autonomie configurabilă + Control Center vizibil) sau cu altă prioritate?
