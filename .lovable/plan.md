

# Plan: Profilul Client Persistent + Adaptare Limbaj + Feedback Loop

## Ce existe deja (nu duplicam)

YANA are deja infrastructura de baza: `yana_relationships` (scor relatie, memorie emotionala), `yana_learning_log` (logarea fiecarei interactiuni), `yana_user_context_evolution` (tip utilizator, stil preferat), `extract-learnings` (detecteaza preferinte simplu/detaliat/vizual). Problema: aceste date sunt colectate dar **nu sunt consolidate intr-un profil unic** si **nu sunt injectate complet in prompt**.

## Ce adaugam

### 1. Tabel nou: `yana_client_profiles` (profilul persistent "user.md")

Un document structurat per utilizator care consolideaza tot ce stie YANA despre client:

| Camp | Tip | Scop |
|------|-----|------|
| user_id | uuid (unic) | Legatura cu utilizatorul |
| business_domain | text | Domeniul firmei (turism, IT, retail etc.) |
| company_size | text | mic/mediu/mare - detectat din conversatii |
| language_complexity | text | 'simple' / 'moderate' / 'technical' - adaptat automat |
| communication_style | text | 'direct' / 'conversational' / 'detailed' |
| recurring_problems | jsonb | Lista de probleme care revin (TVA, cash flow etc.) |
| learned_corrections | jsonb | Corectii facute de utilizator (ce a corectat YANA) |
| anticipation_triggers | jsonb | Lucruri de amintit (termene, pattern-uri lunare) |
| preferred_topics | text[] | Subiecte frecvent discutate |
| personality_notes | text | Observatii libere (ex: "prefera umorul", "nu-i plac metaforele") |
| interaction_patterns | jsonb | Cand interactioneaza (ore, zile), frecventa |
| last_profile_update | timestamptz | Ultima actualizare automata |

RLS: Utilizatorul vede doar propriul profil. Service role poate scrie.

### 2. Edge Function: `update-client-profile` (consolidare automata)

Apelata ca background task din `ai-router` dupa fiecare conversatie (non-blocking, la fel ca `extract-learnings`). Logica:

- Citeste ultimele 20 intrari din `yana_learning_log` + `yana_user_context_evolution` + `yana_relationships`
- Consolideaza intr-un profil actualizat
- Detecteaza `language_complexity` din pattern-urile de preferinta (daca cere "mai simplu" = simple, daca foloseste termeni tehnici = technical)
- Extrage `recurring_problems` din categoriile frecvente
- Salveaza corectiile (`learned_corrections`) cand detecteaza pattern-uri de tip "nu, nu asta am intrebat" urmate de clarificare
- Detecteaza `business_domain` din contextul balantei si conversatiilor
- Actualizeaza `interaction_patterns` (ora medie, zile active)
- Apel AI minimal (gemini-2.5-flash-lite) pentru sintetizarea notelor de personalitate

### 3. Modificare `chat-ai/index.ts` - Injectare profil in prompt

Dupa sectiunea "Samantha Dynamics" (linia ~1915), adaugam o noua sectiune:

```
## PROFILUL CLIENTULUI (ce stie YANA despre acest utilizator)
- Domeniu: {business_domain}
- Complexitate limbaj: {language_complexity}
  -> Daca "simple": fraze scurte, fara jargon contabil, explica orice termen
  -> Daca "technical": poti folosi termeni de specialitate, mergi direct la esenta
  -> Daca "moderate": echilibru intre accesibil si precis
- Stil comunicare: {communication_style}
- Probleme recurente: {recurring_problems}
  -> Cand apare un subiect recurent, mentioneaza ca stii deja contextul
- Corectii anterioare: {learned_corrections}
  -> NU repeta greselile din aceasta lista!
- Pattern-uri: vine de obicei {interaction_patterns.usual_time}, intreaba frecvent despre {preferred_topics}
- Note personalitate: {personality_notes}
```

### 4. Modificare `extract-learnings/index.ts` - Tracking corectii

Adaugam detectia explicita a corectiilor utilizatorului (feedback loop):

- Pattern-uri noi: "nu e corect", "de fapt e", "gresit, trebuia", "nu asa", "corecteaza"
- Cand se detecteaza, salveaza in `yana_client_profiles.learned_corrections` cu: ce a spus YANA gresit, ce a corectat utilizatorul, data
- Limita: ultimele 20 corectii (cele mai vechi se sterg)

### 5. Modificare `ai-router/index.ts` - Trigger background task

Dupa apelurile existente la `extract-learnings` si `detect-hook-signals`, adaugam un apel non-blocking la `update-client-profile` (o data la 5 conversatii, nu la fiecare mesaj, pentru eficienta).

### 6. Anticipare si amintire

In `update-client-profile`, se calculeaza `anticipation_triggers`:
- Daca utilizatorul intreaba despre TVA in fiecare luna la aceeasi data -> YANA poate mentiona proactiv
- Daca are probleme recurente de cash flow -> YANA aminteste la urmatoarea conversatie
- Aceste trigger-uri sunt injectate in prompt ca "lucruri de mentionat daca e natural"

## Ce NU se schimba

- Tabelele existente (`yana_relationships`, `yana_learning_log`, `yana_user_context_evolution`) raman neschimbate
- `consciousness-engine` ramane neschimbat (deja incarca relationship data)
- Personalitatea YANA (consciousness prompt) ramane aceeasi
- Frontend-ul nu necesita modificari (totul e backend)

## Ordinea implementarii

1. Creare tabel `yana_client_profiles` cu RLS
2. Creare edge function `update-client-profile`
3. Modificare `extract-learnings` pentru tracking corectii
4. Modificare `chat-ai` pentru injectare profil in prompt
5. Modificare `ai-router` pentru trigger background

## Rezultat

- Primul mesaj: YANA raspunde generic
- Dupa 5 conversatii: YANA stie domeniul, prefera limbajul simplu/tehnic
- Dupa 15 conversatii: YANA anticipeaza intrebari, nu repeta greseli, adapteaza tonul
- Dupa 30 conversatii: clientul simte ca YANA "il cunoaste" - nu mai pleaca

