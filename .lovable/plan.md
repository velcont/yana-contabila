

# Plan: Creier Autonom YANA — Trei Sisteme Unificate

## Ce există deja (fragmentat)

YANA are deja ~10 funcții de învățare care rulează independent:
- `extract-learnings` — detectează preferințe, corecții, satisfacție
- `self-reflect` — evaluează calitatea răspunsurilor (scor 1-10)
- `pattern-analyzer` — detectează cereri comune, segmente
- `cross-learner` — agregă experimente cross-user
- `recursive-optimizer` — optimizare zilnică (cron 03:00)
- `consciousness-engine` — pre-procesare emoțională
- `dream-generator` / `silence-thoughts` — simulare "somn"
- `surprise-detector` / `experiment-tracker` — detectare contradicții

**Problema**: Aceste sisteme nu comunică între ele. Nu există un "creier" care decide CE să facă, CÂND să observe vs. să acționeze, și nu există ciclul complet observare → acțiune → reflecție → somn.

## Arhitectura Propusă: 3 Sisteme + Controler

```text
┌─────────────────────────────────────────────┐
│           METACOGNITIVE CONTROLLER          │
│  (decide: observă / acționează / reflectă) │
│         supabase/functions/yana-brain       │
└──────┬──────────┬──────────────┬────────────┘
       │          │              │
   ┌───▼───┐  ┌──▼────┐  ┌─────▼──────┐
   │OBSERV.│  │ACȚIUNE│  │ REFLECȚIE   │
   │Sistem │  │Sistem │  │ (Somn)     │
   │  #1   │  │  #2   │  │ Sistem #3  │
   └───────┘  └───────┘  └────────────┘
```

### Sistem 1: OBSERVATOR (Învățare Pasivă)
**Ce face**: Observă TOATE conversațiile tuturor utilizatorilor fără a interveni. Extrage pattern-uri, greșeli, feedback, corecții.

- **Nou**: `yana-observer` edge function
- Rulează asincron după FIECARE conversație (via ai-router)
- Observă cross-user: ce întreabă utilizatorii, unde YANA greșește, ce corecții primește
- Salvează observații în tabel nou `yana_observations` cu câmpuri: `observation_type` (error_detected, pattern_found, correction_received, positive_feedback, knowledge_gap), `raw_data`, `learning_potential` (0-1), `processed` (bool)
- NU modifică nimic — doar observă și notează

### Sistem 2: ACTOR (Învățare Activă)
**Ce face**: Aplică lecțiile învățate. Experimentează cu răspunsuri, testează ipoteze, "strică și repară" ca un copil.

- **Nou**: `yana-actor` edge function  
- Folosește observațiile neprocesate din `yana_observations`
- Creează experimente automate în `ai_experiments` (A/B test pe formulări, tonuri)
- Generează `learned_corrections` din pattern-uri de erori repetate
- Actualizează `yana_effective_responses` când descoperă formulări superioare
- Aplică automat fix-uri cu confidence >= 0.9 (via `yana_improvement_decisions`)

### Sistem 3: REFLECTOR / SOMN (Consolidare Nocturnă)
**Ce face**: "Noaptea", procesează tot ce s-a întâmplat. Consolidează memoria, elimină zgomotul, identifică meta-pattern-uri.

- **Upgrade**: Extinde `recursive-optimizer` (cron 03:00 AM)
- Procesează toate observațiile din ziua respectivă
- Calculează: ce tipuri de greșeli se repetă, ce domenii au gaps, ce utilizatori sunt la risc
- Generează "vise" (dream-generator) bazate pe lecțiile zilei
- Actualizează pragurile din `yana_optimizer_config` bazat pe performanța reală
- Marchează observațiile ca `processed = true`

### Controler: YANA-BRAIN (Meta-Cogniție)
**Ce face**: Decide automat când să observe, când să acționeze, când să reflecteze. Evaluează propria performanță.

- **Nou**: `yana-brain` edge function (cron la fiecare 6 ore)
- Verifică starea celor 3 sisteme
- Decide modul curent bazat pe metrici:
  - Multe erori recente → activează OBSERVATORUL mai agresiv
  - Observații neprocesate > 50 → activează ACTORUL
  - Sfârșit de zi → activează REFLECTORUL
- Monitorizează scorul global de performanță (din `ai_reflection_logs`)
- Comută automat între moduri fără intervenție umană
- Salvează deciziile în tabel nou `yana_brain_decisions`

## Tabel Nou: `yana_observations`

```sql
CREATE TABLE yana_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_type TEXT NOT NULL, -- error_detected, pattern_found, correction_received, positive_feedback, knowledge_gap, user_struggle
  source_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_conversation_id TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  learning_potential NUMERIC DEFAULT 0.5, -- 0-1
  processed BOOLEAN DEFAULT false,
  processed_by TEXT, -- 'actor', 'reflector'
  processed_at TIMESTAMPTZ,
  action_taken TEXT, -- ce s-a făcut cu observația
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tabel Nou: `yana_brain_decisions`

```sql
CREATE TABLE yana_brain_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL, -- mode_switch, threshold_adjust, alert
  from_mode TEXT, -- observe, act, reflect
  to_mode TEXT,
  reasoning JSONB NOT NULL DEFAULT '{}',
  metrics_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Integrare în AI-Router

Adaugă `yana-observer` ca task asincron în `EdgeRuntime.waitUntil()` (lângă celelalte 7 task-uri existente). Observer-ul primește datele conversației și le clasifică automat.

## Fluxul Complet Automat

1. **Utilizator trimite mesaj** → AI-Router procesează → răspuns
2. **Post-răspuns** (async): Observer-ul clasifică conversația, detectează erori/feedback/pattern-uri → salvează în `yana_observations`
3. **La fiecare 6 ore**: Brain-ul evaluează metrici, decide modul activ
4. **Când Brain decide "act"**: Actor-ul procesează observațiile, creează experimente, aplică corecții
5. **La 03:00 AM**: Reflectorul consolidează memoria zilei, generează vise, resetează contoarele

## Fișiere Afectate

| Fișier | Acțiune |
|--------|---------|
| `supabase/functions/yana-observer/index.ts` | NOU — Sistem 1 |
| `supabase/functions/yana-actor/index.ts` | NOU — Sistem 2 |
| `supabase/functions/yana-brain/index.ts` | NOU — Controler |
| `supabase/functions/recursive-optimizer/index.ts` | UPGRADE — integrare Sistem 3 |
| `supabase/functions/ai-router/index.ts` | EDIT — adaugă observer task |
| `src/components/admin/AgenticDashboard.tsx` | EDIT — vizualizare Brain |
| Migrare SQL | NOU — 2 tabele + RLS |

## Principiu de Design

Costurile AI sunt controlate: Observer-ul și Actor-ul folosesc regex/heuristici locale (fără apeluri AI). Doar Reflectorul (1x/zi) și Brain-ul (4x/zi) fac apeluri AI minimale. Sistemul funcționează autonom, fără date manuale.

