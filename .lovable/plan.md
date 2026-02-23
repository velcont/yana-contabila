

# Arhitectură de Auto-Îmbunătățire Recursivă Controlată

## Context existent

YANA are deja 7 subsisteme de auto-îmbunătățire care funcționează independent:
- `self-reflect` -- evaluează calitatea răspunsurilor
- `extract-learnings` -- extrage pattern-uri și preferințe
- `auto-optimizer` -- A/B testing și decizii de îmbunătățire
- `pattern-analyzer` -- detectare cereri comune și segmente
- `cross-learner` -- agregare pattern-uri cross-user
- `update-self-model` -- actualizare zilnică self-model
- `consciousness-engine` -- context pre-răspuns

Problema: aceste subsisteme nu comunica intre ele si nu au un mecanism de orchestrare care sa le coordoneze ciclic.

## Ce se adauga

### 1. Tabel nou: `yana_optimization_cycles`

Stocheaza fiecare ciclu de optimizare cu metrici, bottleneck-uri detectate, actiuni luate si rezultate.

```text
id (uuid)
cycle_number (integer, auto-increment)
started_at (timestamp)
completed_at (timestamp)
phase (text): collect_metrics | identify_bottlenecks | generate_actions | apply_actions | meta_evaluate
metrics_snapshot (jsonb): scoruri, timpi, costuri, cache hit rate
bottlenecks_detected (jsonb[]): lista de bottleneck-uri cu severitate
actions_taken (jsonb[]): ce optimizari s-au aplicat
meta_score (numeric): cat de eficient a fost ciclul anterior
meta_adjustments (jsonb): ajustari la parametrii proprii
status (text): running | completed | failed
```

### 2. Edge Function nou: `recursive-optimizer`

Orchestratorul central care ruleaza periodic (cron zilnic) si executa 5 faze:

**Faza 1 -- Colectare metrici**
- Scorul mediu din `ai_reflection_logs` (ultimele 7 zile)
- Cost mediu per mesaj din `ai_usage`
- Cache hit rate din `ai_response_cache`
- Knowledge gaps nerezolvate din `yana_knowledge_gaps`
- Timp mediu de procesare din reflection logs
- Satisfactie utilizatori din `yana_learning_log`

**Faza 2 -- Identificare bottleneck-uri**
- Scor mediu sub 6/10 = bottleneck calitate
- Cost mediu peste 50 bani/mesaj = bottleneck cost
- Cache hit rate sub 20% = bottleneck cache
- Knowledge gaps critice > 5 = bottleneck cunostinte
- Timp raspuns > 5s = bottleneck latenta
- Satisfactie sub 0.5 = bottleneck UX

**Faza 3 -- Generare actiuni**
Pentru fiecare bottleneck, genereaza actiuni concrete:
- Calitate scazuta: triggereaza `cross-learner` + marcheaza pattern-uri de evitat
- Cost ridicat: ajusteaza cache expiry, sugereaza model downgrade pentru intrebari simple
- Cache miss: extinde normalizarea cache keys
- Knowledge gaps: creeaza decizii in `yana_improvement_decisions`
- Latenta: identifica endpoint-urile lente, sugereaza optimizari

**Faza 4 -- Aplicare actiuni (cu control)**
- Actiunile cu confidence > 0.9 se aplica automat (ex: cache tuning)
- Actiunile cu confidence < 0.9 se salveaza ca `pending` in `yana_improvement_decisions`
- Niciodata nu se modifica prompt-uri automat -- doar se propun

**Faza 5 -- Meta-evaluare**
- Compara metricile ciclului curent cu ciclul anterior
- Calculeaza un `meta_score`: cat de eficiente au fost actiunile din ciclul trecut
- Daca meta_score < 0.3 (actiunile nu au ajutat): ajusteaza pragurile de detectie
- Daca meta_score > 0.7 (actiunile au functionat): mentine strategia curenta
- Salveaza ajustarile in `meta_adjustments`

### 3. Tabel nou: `yana_optimizer_config`

Configuratie dinamica pe care meta-optimizatorul o poate ajusta singur:

```text
id (uuid)
config_key (text, unique): ex "quality_threshold", "cost_threshold", "cache_min_hit_rate"
config_value (numeric)
default_value (numeric)
min_value (numeric)
max_value (numeric)
last_adjusted_by_cycle (integer)
adjustment_history (jsonb[])
```

Valori initiale:
- `quality_threshold`: 6.0 (scor minim acceptabil)
- `cost_threshold_cents`: 50 (cost maxim per mesaj in bani)
- `cache_min_hit_rate`: 0.20 (20% minim cache hits)
- `latency_threshold_ms`: 5000 (5 secunde maxim)
- `satisfaction_threshold`: 0.50 (50% satisfactie minima)
- `auto_apply_confidence`: 0.90 (pragul pentru aplicare automata)

### 4. Cron Job

Se configureaza in `supabase/config.toml` sa ruleze `recursive-optimizer` zilnic la 03:00 AM.

### 5. Vizualizare in Admin Dashboard

Se adauga un tab nou "Optimizare Recursiva" in panoul admin cu:
- Grafic al meta_score-ului pe ultimele 30 cicluri
- Lista bottleneck-urilor curente cu severitate
- Actiuni pending care necesita aprobare
- Configuratia curenta a pragurilor (editabila)

## Fisiere modificate/create

1. **NOU**: `supabase/functions/recursive-optimizer/index.ts` -- orchestratorul (circa 400 linii)
2. **NOU**: `src/components/admin/RecursiveOptimizerDashboard.tsx` -- vizualizare admin
3. **MODIFICAT**: `src/pages/Admin.tsx` -- adaugare tab nou
4. **MODIFICAT**: `supabase/config.toml` -- cron job
5. **Migratie SQL**: 2 tabele noi + seed configuratie

## Reguli de siguranta

- Optimizatorul nu modifica niciodata prompt-uri direct
- Toate actiunile majore necesita aprobare admin
- Meta-optimizarea ajusteaza doar praguri numerice, in limite predefinite (min/max)
- Fiecare ciclu este complet trasat in baza de date pentru audit
- Se poate dezactiva instant din config

