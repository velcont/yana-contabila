## Recap rapid

- **`R: text`** → corectare gramaticală + ton mai prietenos/natural (păstrează intenția, dar curăță ortografie, punctuație și-l face plăcut de citit).
- **`R+: text`** → reformulare completă (rescrie textul mai clar, mai profesional sau mai cald, după context).
- Răspuns instant, fără tool-calling, fără cost mare (gemini-2.5-flash).

---

## Recomandarea mea pentru upgrade-ul Yana ca agent

Din lista A–F, **cele mai utile pentru tine** sunt **A (Planning explicit)** și **B (Memorie missions de lungă durată)**. Iată de ce:

### De ce A + B (nu altele)

**A — Planning explicit înainte de execuție**
- Acum: îi ceri ceva complex → Yana sare direct la tool-uri, uneori greșește ordinea sau sare un pas.
- După A: vezi planul în UI ÎNAINTE să execute → poți spune "stop, schimbă pasul 3" sau "sari peste pasul 4". Control real, nu doar autopilot.
- E diferența între "asistent care încearcă" și "agent care gândește".
- **Efort: mic** (modificare în 1 fișier, ~1h).

**B — Memorie missions multi-zile**
- Acum: trebuie să-i amintești tu de fiecare task. Yana uită contextul între sesiuni.
- După B: îi spui o singură dată "urmărește prețul concurentului X timp de 7 zile și raportează-mi orice schimbare" → cron-ul existent (`yana-agents-orchestrator`) o trezește singură zilnic, verifică, raportează doar dacă e ceva nou.
- Asta transformă Yana din "chatbot reactiv" în "angajat care lucrează în background pentru tine".
- Use case-uri reale pentru tine: monitorizare termene fiscale, follow-up clienți restanțieri, urmărire facturi neplătite, briefing dimineață cu schimbările de peste noapte.
- **Efort: mediu** (1 tabelă nouă + extensie cron + 2 tool-uri noi `create_mission`, `list_missions`, `cancel_mission`).

### De ce NU C, D, E, F acum

- **C (self-critique)** — fancy, dar adaugă latență și cost la fiecare răspuns. Bun mai târziu, după ce A+B funcționează.
- **D (file system în storage)** — ai deja `/my-documents`, dar use case-ul real apare după ce ai missions (B) care produc fișiere.
- **E (browsing real)** — efort mare (1-2 zile), util doar pentru cazuri specifice. Perplexity-ul existent acoperă 90% din nevoi.
- **F (voice multi-turn)** — nice-to-have, nu schimbă fundamental ce poate Yana.

---

## Plan de implementare (1 sprint)

### Pas 1 — Comanda `R:` și `R+:` 
**Fișier:** `supabase/functions/yana-agent/index.ts`
- La începutul `Deno.serve` handler, după parse-ul mesajului, detectez regex `^(R\+?):\s*(.+)$/is`.
- Dacă matchează → bypass complet la loop. Apel direct la `gemini-2.5-flash` cu prompt:
  - `R:` → "Corectează gramatical, ortografic și punctuația textului. Fă-l ușor de citit, ton natural prietenos. Returnează DOAR textul corectat."
  - `R+:` → "Reformulează textul complet. Păstrează intenția, dar fă-l mai clar, mai profesional și mai cald. Returnează DOAR varianta reformulată."
- Stream rezultat ca SSE event `final` (fără modificări frontend, hook-ul existent îl prinde).

### Pas 2 — Planning explicit (Feature A)
**Fișier:** `supabase/functions/yana-agent/index.ts`
- Adaug tool nou `create_execution_plan(steps: string[])` pe care Yana e încurajată să-l apeleze prima dată la cereri complexe.
- Update SYSTEM_PROMPT: "La cereri cu 3+ acțiuni, întâi apelează `create_execution_plan` cu pașii numerotați, apoi execută."
- Adaug SSE event nou `plan` în stream → frontend îl afișează ca checklist live.
- Update `useYanaAgent.tsx` cu tipul `AgentStep` extins: `{ type: 'plan'; steps: string[] }`.
- Update componenta care randează stepurile (probabil în `src/components/yana/`) să afișeze checklist cu bife pe măsură ce tool-urile se execută.

### Pas 3 — Missions de lungă durată (Feature B)
**Migration nouă:**
```sql
create table yana_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text not null,           -- "Urmărește prețul X și anunță-mă la schimbare"
  schedule text not null,        -- 'daily', 'hourly', 'weekly'
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_result jsonb,
  status text not null default 'active', -- active | paused | done
  created_at timestamptz default now()
);
-- RLS: user vede doar missions proprii
```

**3 tool-uri noi în `yana-agent`:**
- `create_mission(title, goal, schedule)` — Yana o creează când îi ceri verbal.
- `list_my_missions()` — vezi ce urmărește.
- `cancel_mission(id)` — opresc o mission.

**Extensie cron `yana-agents-orchestrator`** (rulează deja la 30min):
- Citește missions cu `next_run_at <= now()` și `status = 'active'`.
- Pentru fiecare → apelează `yana-dynamic-agent` (sau direct un loop scurt) cu `goal` ca input.
- Comparăcu `last_result`. Dacă e ceva nou → creează notification + (opțional) email.
- Update `next_run_at` pe baza `schedule`.

**UI nou:** O secțiune mică "Missions active" în `/yana` sau `Settings → AI Learning`.

---

## Întrebare finală

Confirmă-mi două lucruri și pornesc:

1. **`R:` = corectare + ton prietenos, `R+:` = reformulare completă** — OK așa, sau vrei doar `R:` cu reformulare incluse (un singur mod, mai simplu)?
2. **Pornesc cu Pas 1 + Pas 2 (R: + Planning) acum** și las missions (Pas 3) pentru sprintul următor? Sau vrei toate trei într-un sprint mare?
