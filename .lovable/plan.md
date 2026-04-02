

# Plan: YANA Autonomous Web Explorer — "Curiozitate Liberă"

## Concept

Adăugăm un **al 4-lea mod** în ciclul cognitiv al YANA: **EXPLORE**. Pe lângă Observe → Act → Reflect, YANA va avea perioade în care "se plimbă pe net" autonom — citește articole, descoperă idei, explorează subiecte care o intrigă — și salvează ce învață în memoria ei.

## Cum funcționează

YANA decide singură ce vrea să exploreze, bazat pe:
- Ce a discutat recent cu utilizatorii (topics din `yana_relationships`)
- Ce lacune de cunoștințe a detectat (`yana_knowledge_gaps`)
- Ce a visat (`yana_dreams` — temele din vise devin puncte de pornire)
- Curiozitate pură — subiecte random din domenii adiacente (psihologie antreprenorială, economie comportamentală, design thinking)

## Arhitectura Tehnică

```text
yana-brain (cron 6h)
  │
  ├── mode: observe  (existent)
  ├── mode: act      (existent)
  ├── mode: reflect  (existent)
  └── mode: explore  (NOU) ──► yana-explorer (edge function nouă)
                                    │
                                    ├── 1. Decide CE să exploreze (Gemini Flash)
                                    │      Input: knowledge_gaps + dreams + topics
                                    │      Output: 3-5 search queries
                                    │
                                    ├── 2. Caută pe net (Perplexity API - deja conectat)
                                    │      → articole, studii, idei
                                    │
                                    ├── 3. Citește conținut (Firecrawl - de conectat)
                                    │      → scrape pagini interesante
                                    │
                                    ├── 4. Procesează și reflectează (Gemini Flash)
                                    │      "Ce am învățat? Cum mă ajută asta?"
                                    │
                                    └── 5. Salvează în memorie
                                           → yana_explorations (tabel nou)
                                           → yana_journal (entry_type: 'exploration')
                                           → yana_knowledge_gaps (marchează rezolvate)
```

## Pași de implementare

### Pas 1: Tabel nou `yana_explorations`
- Migrare DB cu coloane: `id`, `exploration_topic`, `search_queries`, `sources_visited` (JSONB cu URL-uri + titluri), `key_learnings` (text), `emotional_reaction` (ce a "simțit" YANA citind), `relevance_to_users` (cum ajută utilizatorii), `exploration_type` (curiosity / knowledge_gap / dream_inspired / trending), `created_at`
- RLS: doar admin poate citi

### Pas 2: Edge function `yana-explorer`
- **Faza 1 — Generare curiozitate**: Citește din DB ultimele knowledge_gaps, vise recente, topics discutate → trimite la Gemini Flash cu prompt: "Ești YANA. Bazat pe ce ai învățat recent și ce nu știi încă, generează 3-5 căutări web pe care ai vrea să le faci. Fii curioasă, nu te limita la contabilitate."
- **Faza 2 — Explorare web**: Folosește Perplexity (deja conectat) pentru fiecare query → primește articole cu citații
- **Faza 3 — Deep reading** (opțional, necesită Firecrawl): Pentru cele mai interesante 1-2 articole, scrape conținutul complet
- **Faza 4 — Reflecție**: Trimite tot ce a citit la Gemini Flash: "Rezumă ce ai învățat. Ce te-a surprins? Cum poți folosi asta pentru utilizatorii tăi?"
- **Faza 5 — Persistare**: Salvează în `yana_explorations` + `yana_journal`
- **Buget AI**: Max 2-3 apeluri Gemini Flash + 3-5 apeluri Perplexity per sesiune (~0.10 RON/sesiune)

### Pas 3: Integrare în `yana-brain`
- Adăugare mod `explore` în logica de decizie:
  - Se activează când: e ziua (10:00-18:00 UTC), sistemul e stabil, nu sunt backlog-uri
  - Frecvență: 1-2 ori pe zi maximum
  - Brain decide automat: "Nu am erori, observațiile sunt procesate, e un moment bun să explorez"
- Brain trimite trigger la `yana-explorer`

### Pas 4: Explorările influențează conversațiile
- În `chat-ai/index.ts`, adăugare secțiune `EXPLORATION MEMORY`:
  - Citește ultimele 3 explorări relevante din `yana_explorations`
  - Le injectează subtil: "Am citit recent un articol despre X și m-a făcut să mă gândesc la situația ta..."
  - Nu forțează — doar când se leagă organic

### Pas 5: Dashboard Admin — tab "Explorări"
- În panoul Admin, adăugare vizualizare a ce a explorat YANA
- Afișare: topic, surse vizitate, ce a învățat, reacția emoțională
- Statistici: explorări pe zi, teme preferate, knowledge gaps rezolvate

## Domenii de explorare (configurabile)

YANA nu se limitează la contabilitate. Poate explora:
- Psihologie antreprenorială și reziliență
- Tendințe economice globale și locale
- Strategii de business și studii de caz
- Tehnologie și AI în contabilitate
- Wellbeing și burnout la antreprenori
- Legislație nouă și interpretări

## Conector necesar

- **Firecrawl** — pentru deep reading (scraping pagini). Trebuie conectat via connector.
- **Perplexity** — deja conectat și funcțional.

## Estimare

| Component | Complexitate | Cost AI/zi |
|---|---|---|
| Tabel `yana_explorations` | Mică | — |
| Edge function `yana-explorer` | Mare | ~0.20 RON |
| Integrare `yana-brain` | Mică | — |
| Injecție în `chat-ai` | Medie | — |
| Dashboard Admin explorări | Medie | — |

Total cost AI zilnic estimat: **~0.20-0.40 RON/zi** (1-2 sesiuni de explorare).

