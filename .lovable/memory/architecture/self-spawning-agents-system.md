---
name: Self-spawning agents system
description: Hibrid funcțional pentru auto-generare agenți specializați de către YANA (specs în DB + runtime universal + cron)
type: feature
---

YANA poate crea autonom agenți noi (sub_agent sau meta_improvement) prin tool-ul `spawn_agent` din `yana-agent`. Specs salvate în `yana_generated_agents`. Runtime universal: `yana-dynamic-agent` (încarcă spec după slug, rulează cu unelte din whitelist). Auto-creare proactivă: `yana-agent-spawner` (cron 6h) analizează `ai_reflection_logs` slabe + topicuri recurente din `yana_learning_log`. Execuții programate: `yana-agents-orchestrator` (cron 30m). Cap: max 50 agenți activi. Total autonom (no approval). Whitelist tools: search_companies, get_latest_balance, create_task, create_calendar_event, save_note, web_research, get_user_context. UI vizibilitate în Settings → AI Learning → tab "Agenți".

**Why hibrid not real auto-deploy**: Lovable Cloud nu permite deploy programatic de edge functions noi din runtime → "auto-deploy real" e tehnic imposibil. Hibrid (specs DB + runtime universal) livrează 100% din funcționalitatea autonomiei fără risc RCE.