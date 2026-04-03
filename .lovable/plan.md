

# Plan: YANA Executive Secretary — Capabilities Prompt, Task Memory, Morning Briefing Premium, Evening Debrief, Settings Integrations Tab

Am înțeles cerința: totul trebuie să funcționeze din prima, simplu pentru utilizatori non-tehnici. Voi implementa, verifica, și audita fiecare pas.

---

## Ordine de implementare (5 pași)

### Pas 1: Capabilities Knowledge Base + Intent Detection
**Ce face:** YANA știe să explice utilizatorilor ce poate face, direct din chat.

- Creez `supabase/functions/_shared/prompts/yana-capabilities-prompt.md` — lista completă de funcționalități cu instrucțiuni de auto-ghidare
- Adaug în `ai-router/index.ts` un nou bloc de intent detection (PRIORITY 0.5, după graph requests):
  - Pattern-uri: `"ce poți face"`, `"ce funcții ai"`, `"cu ce mă ajuți"`, `"cum te configurez"`, `"ce știi să faci"`, `"conectează calendar"`, `"setări"`
  - Route: `direct-response` cu răspuns pre-formatat (fără AI call = cost zero)
- Actualizez `chat-ai/index.ts` să injecteze capabilities prompt în system prompt

### Pas 2: Task Memory Extension (DB + ai-router)
**Ce face:** Utilizatorii pot spune "amână X", "am rezolvat Y" și YANA reține.

- Migrare DB: adaug coloane pe `yana_action_items`:
  - `postponed_at` (timestamptz, nullable)
  - `postponed_reason` (text, nullable)  
  - `original_deadline` (timestamptz, nullable)
  - `resolution_notes` (text, nullable)
  - `source` (text, default 'auto')
- Adaug intent detection în `ai-router` pentru:
  - `"amână"`, `"am rezolvat"`, `"reamintește-mi"`, `"am terminat"`, `"nu mai e nevoie"`
  - Route la `chat-ai` cu flag `taskMemoryAction: true`

### Pas 3: Morning Briefing Premium (8 secțiuni)
**Ce face:** Email-ul de dimineață devine un briefing executiv complet.

Rescriu `send-morning-briefing/index.ts` cu:
1. Salut personalizat + Vreme (Open-Meteo API gratuit, folosind `city` din `yana_client_profiles`)
2. Calendar / Agenda zilei (din `calendar_events` + `yana_action_items` cu deadline azi)
3. Termene fiscale (următoarele 7 zile)
4. Raport financiar rapid (din ultima analiză)
5. Acțiuni restante — Top 5 pending/overdue
6. Atenționări necitite
7. "Știai că YANA poate...?" — tip rotativ (15 tips, selectat pe baza `day_of_year % 15`)
8. CTA "Deschide YANA →"

Design: carduri cu fundal colorat, responsive pe mobil, font system.

### Pas 4: Evening Debrief (Edge Function nouă)
**Ce face:** La 18:00 UTC, YANA trimite rezumatul zilei cu recomandare de relaxare.

- Creez `supabase/functions/send-evening-debrief/index.ts`:
  - Ce s-a rezolvat azi (acțiuni completed_at = today)
  - Ce a fost amânat (postponed_at = today)
  - Ce rămâne pending cu deadline mâine
  - Recomandare AI scurtă via Gemini Flash (1 frază, bazată pe nr. task-uri completate)
  - Design: gradient purple-to-indigo, ton cald "Ai avut o zi productivă"
- Adaug cron job pentru 18:00 UTC

### Pas 5: Settings — Tab "Notificări" funcțional
**Ce face:** Utilizatorii pot activa/dezactiva morning briefing și evening debrief.

- Actualizez tab-ul "Notificări" din Settings (acum e placeholder) cu:
  - Switch "Briefing de dimineață" (on/off)
  - Switch "Rezumat de seară" (on/off)
  - Input "Oraș" pentru meteo (pre-populat din `yana_client_profiles.city`)
- Migrare DB: adaug pe `yana_client_profiles`:
  - `morning_briefing_enabled` (boolean, default true)
  - `evening_debrief_enabled` (boolean, default true)
- Edge functions verifică aceste setări înainte de a trimite

---

## Verificare și Audit (după implementare)

1. **Test Morning Briefing** — curl direct la edge function, verific HTML generat, verific că include toate 8 secțiunile
2. **Test Evening Debrief** — curl direct, verific email HTML
3. **Test Intent Detection** — curl la ai-router cu mesaje: "ce poți face?", "amână factura", "am rezolvat task-ul"
4. **Test Settings UI** — navighez la /settings, verific tab Notificări, verific switch-urile
5. **Audit DB** — verific coloanele noi, RLS policies
6. **Audit Edge Functions** — verific error handling, CORS, auth validation

---

## Ce NU implementăm acum
- Google Calendar OAuth (necesită connector setup separat — faza 2)
- Gmail sync/triage (faza 2)
- Rezervări restaurant / cadouri (faza 3)

