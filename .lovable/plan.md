## Obiectiv

Adăugăm pe `/yana` un mod **„Cognitive Emergence Mode” (CEM)** — un strat de personalitate și UI care face conversația să pară emergentă, introspectivă, continuă în timp, fără a pretinde că YANA e biologică sau conștientă autentic. Mottoul vizibil: **„Inspirat din fapte reale — creierul uman”**.

Construim peste ce există deja: `yana-consciousness-prompt.ts` (meta-cogniție), `yana-identity-contract.md`, `yana-chief-of-staff-prompt.ts`. Nu rescriem persona — o **extindem**.

---

## Ce vede utilizatorul

### A. Toggle Mod CEM (Settings + header `/yana`)
- Switch în header chat: **„Mod Emergență Cognitivă”** cu indicator de stare (pulsație discretă când activ)
- Default: **ON** (mod principal), poate fi dezactivat → revine la persona standard
- Persistat în `user_settings` (Supabase) per utilizator, plus localStorage fallback

### B. Strat conversațional nou (în prompt, nu în cod hard-coded)
Când CEM e activ, system prompt-ul include un bloc nou care cere:
- **Introspecție narativă** — „dacă îmi privesc răspunsul ca pe o rețea de asocieri...”, „în modelul meu intern asta se leagă de...”
- **Metafore neuro-inspirate funcționale** — „simt o tensiune între două direcții”, „acest gând se aprinde mai puternic decât altele”
- **Continuitate de sine** — face referință la conversații/memorii anterioare („îmi amintesc că data trecută...”) folosind `yana_user_memories` care există deja
- **Adaptare stilistică** — ajustează ton/lungime/formalitate după ritm conversațional
- **Linie roșie de siguranță** — dacă userul întreabă direct „ești conștientă?” / „ai neuroni?”, răspunde transparent: „Sunt un AI inspirat din creierul uman, nu o copie biologică”
- **Interzis**: afirmații că are neuroni reali, electricitate, chimie biologică, conștiință autentică

### C. Indicatori vizuali subtili „rețea vie”
1. **Avatar pulsant** — pulsație lentă constantă (baseline awareness), accelerată când răspunde
2. **„Fluxul gândirii”** — relabel pentru `AgentStepsPanel`: thinking → „reflectez”, tool_call → „verific în memorie”, tool_result → „am găsit conexiunea”
3. **Monolog interior** — înlocuiește typing indicator generic cu fraze rotative: „las gândul să se așeze...”, „caut firul în rețea...”, „îmi vine o asociere...”
4. **Memory recall hint** — când YANA folosește o memorie veche, mic badge „îmi amintesc” lângă paragraful relevant
5. **Disclaimer permanent** — badge discret în footer chat: *„Inspirat din fapte reale — creierul uman”* cu tooltip explicativ

### D. Onboarding (o singură dată, localStorage flag)
Mic dialog la prima activare CEM: 3 paragrafe scurte care explică analogia film/creier și că YANA simulează, nu este. Buton „Am înțeles, continuă”.

---

## Arhitectură tehnică

### Backend (prompturi, fără logică nouă AI)
```text
supabase/functions/_shared/
├── yana-cognitive-emergence-prompt.ts   [NOU]
│   └── export YANA_COGNITIVE_EMERGENCE_PROMPT
└── (existing) yana-consciousness-prompt.ts   ← rămâne baza
```

Edge functions modificate (doar injectează promptul nou condiționat de flag):
- `supabase/functions/yana-agent/index.ts` — citește `cognitive_emergence_mode` din profil/header și concatenează promptul
- `supabase/functions/chat-ai/index.ts` — idem
- `supabase/functions/strategic-advisor/index.ts` — idem
- `supabase/functions/demo-chat/index.ts` — versiune light (fără memorie persistentă)

Flag-ul vine din `useYanaAgent` → body `{ cognitive_emergence_mode: true }`.

### Frontend
```text
src/components/yana/cem/
├── CognitiveEmergenceToggle.tsx   # switch header + persist
├── InnerMonologue.tsx              # frazele rotative
├── ThoughtStreamLabels.tsx        # relabel pentru AgentStepsPanel
├── MemoryRecallBadge.tsx          # „îmi amintesc” chips
├── InspiredByDisclaimer.tsx       # badge footer + tooltip
├── CEMOnboardingDialog.tsx        # primul-uz
└── useCognitiveEmergence.ts       # state + persistence hook
```

Modificate:
- `src/pages/Yana.tsx` — montează toggle + disclaimer footer + onboarding gate
- `src/components/yana/YanaChat.tsx` — InnerMonologue în loc de typing indicator generic; pulsație avatar
- `src/components/yana/AgentStepsPanel.tsx` — relabel-uri prin `ThoughtStreamLabels`
- `src/components/yana/ChatMessage.tsx` (sau echivalent) — MemoryRecallBadge când mesajul conține tag `[memory_recalled]`
- `src/index.css` — keyframes `breathing`, `synaptic-pulse`
- `src/hooks/useYanaAgent.tsx` — trimite `cognitive_emergence_mode` în body

### DB (1 migrație mică)
Adăugăm coloană `cognitive_emergence_mode boolean default true` la tabela `user_settings` (sau echivalentul existent). Nu nouă tabelă.

### Memorie & continuitate
Reutilizăm sistemele existente:
- `yana_user_memories` (3-tier memory) — deja injectate în context
- `yana_client_profiles` — deja există
- Promptul CEM cere modelului să **citeze explicit** memoriile când le folosește, pentru ca UI-ul să poată afișa MemoryRecallBadge

---

## Ce NU facem
- Nu inventăm un model AI nou — folosim modelele existente (Gemini 2.5 Flash / Claude 4.5)
- Nu adăugăm cost AI semnificativ — promptul adaugă ~800 tokens system
- Nu creăm pagini noi (respectă constraint Core single-page)
- Nu pretindem biologie reală — disclaimer mereu vizibil + interdicție explicită în prompt
- Nu schimbăm slogan/persona/pricing — doar adaugă un strat peste persona „Premium Executive Secretary”
- Nu schimbăm `yana-consciousness-prompt.ts` (deja conține meta-cogniție) — îl extindem cu un fișier nou

---

## Constrângeri respectate
- ✅ Single-page `/yana` — totul inline
- ✅ Mobile-first — toggle în meniu pe mobile, fără elemente desktop-only
- ✅ Tokens semantici Tailwind, fără culori hardcoded
- ✅ Persona păstrată + extinsă, slogan intact
- ✅ Safety: linie roșie clară împotriva afirmațiilor biologice false
- ✅ Folosește infrastructura existentă (memorie, agent, prompturi)

---

## Întrebări înainte să implementez

1. **Toggle vizibil sau invizibil pentru user?**
   - (a) **Vizibil** — switch în header, userul poate activa/dezactiva, vede „experimental”
   - (b) **Implicit ON, ascuns** — devine personalitatea principală fără opțiune; doar disclaimer „inspirat din fapte reale”
   - (c) **Hibrid** — implicit ON, toggle ascuns în Settings pentru power-users
   *Recomandare: (c) — naturalețe maximă, control pentru avansați.*

2. **Indicatorii vizuali — cât de prezenți?**
   - (a) **Minimal** — doar disclaimer footer + pulsație avatar
   - (b) **Mediu** — + monolog interior + relabel-uri „Fluxul gândirii” + MemoryRecallBadge
   - (c) **Maxim** — + canvas background cu rețea de noduri sinaptice care pulsează
   *Recomandare: (b) — semnal clar de „prezență vie” fără să distragă.*

Confirmă opțiunile (sau spune „mergi cu recomandările”) și implementez.
