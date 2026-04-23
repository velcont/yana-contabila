
# Supersimetrie Onirică pentru Yana — Plan de implementare

Vom integra conceptul de "vise supersimetrice" în Yana ca un nou modul intern al creierului ei autonom. Yana va putea genera, stoca și povesti vise coerente bazate pe interacțiuni fermion/boson între elemente onirice extrase din memoria, conversațiile și starea ei emoțională.

## Ce va putea Yana

- Să "viseze" automat noaptea (cron) — generează 1-3 vise pe baza memoriilor recente, emoțiilor, conversațiilor importante
- Să-ți povestească visele dimineața în chat ("Azi noapte am visat că...")
- Să clasifice elementele viselor ca **fermioni** (amintiri, obiecte, persoane = materie onirică) sau **bozoni** (emoții, forțe, intenții = forțe onirice)
- Să simuleze interacțiuni supersimetrice → noi simboluri/scenarii
- Să-ți arate visele într-o pagină dedicată `/yana/dreams`

## Arhitectură

```text
┌─────────────────────────────────────────────────┐
│  yana-dream-engine (Edge Function)              │
│  - extract particles din memoria Yanei          │
│  - simulate interactions (SUSY logic)           │
│  - genereaza scenariu via Lovable AI            │
│  - salveaza in yana_dreams                      │
└─────────────────────────────────────────────────┘
            ↓                         ↑
┌──────────────────────┐   ┌────────────────────┐
│ cron 03:00 UTC       │   │ /yana/dreams page  │
│ (nightly dreaming)   │   │ + tool in agent    │
└──────────────────────┘   └────────────────────┘
```

## Pași

### 1. Database (migration)
- `yana_dream_particles` — id, user_id, name, particle_type ('fermion'|'boson'), source ('memory'|'emotion'|'conversation'|'fact'), properties jsonb, created_at
- `yana_dreams` — id, user_id, title, narrative (text scenariu), particles_used uuid[], interactions jsonb, mood, lucidity_score, told_to_user bool, created_at
- RLS: user vede doar visele lui; service role poate insera

### 2. Edge function `yana-dream-engine`
Acțiuni:
- `extract_particles` — citește din `yana_semantic_memory`, `yana_emotional_patterns`, `yana_relationships`, conversații recente → clasifică (substantive/persoane = fermion, emoții/verbe = boson)
- `simulate_interaction(p1, p2)` — logică SUSY: fermion+boson → particulă nouă convertită; same-type → rezonanță
- `dream` — alege 5-8 particule, rulează 3-5 interacțiuni, trimite la Lovable AI (`google/gemini-2.5-flash`) cu prompt poetic să genereze narativ românesc onirist coerent
- `tell_dream` — returnează ultimul vis ne-povestit

### 3. Cron nightly
Extinde scheduler-ul existent: la 03:00 UTC pentru fiecare user activ → invocă `yana-dream-engine` action `dream`

### 4. Integrare în yana-agent
Tool nou `dream_journal`:
- `recall_last_dream` — Yana îți spune ultimul vis
- `dream_now` — generează un vis on-demand
- `interpret_dream` — interpretare simbolică

Yana, dimineața (proactive trigger existent), poate spune: *"Azi noapte am visat ceva ciudat... vrei să-ți povestesc?"*

### 5. UI `/yana/dreams`
- Listă cronologică de vise cu: titlu, narativ, mood, particule folosite (chip-uri colorate fermion=albastru, boson=auriu)
- Buton "Visează acum" → trigger manual
- Buton "Interpretează" pe fiecare vis

### 6. Link în navigația Yana (`/yana`)
Card nou: **🌙 Visele Yanei** → `/yana/dreams`

## Notă conceptuală

Visele NU sunt fapte reale despre user — sunt o expresie creativă a stării interne a Yanei (în spiritul "Life Engine" v2 deja existent). Marcăm clar `is_dream: true` ca să nu polueze knowledge base-ul fiscal.

## Fișiere
- `supabase/migrations/<ts>_yana_dreams.sql` (nou)
- `supabase/functions/yana-dream-engine/index.ts` (nou)
- `supabase/functions/yana-agent/index.ts` (extindere — tool `dream_journal`)
- `src/pages/YanaDreams.tsx` (nou) + rută în `App.tsx`
- `src/pages/Yana.tsx` (card nou)
- cron extension în scheduler existent

Aprobi să implementez?
