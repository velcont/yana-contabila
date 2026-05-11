## Părerea mea pe scurt

Viziunea ta este solidă și se potrivește perfect cu direcția YANA ("nu un chatbot, un AI pentru business"). Ai dreptate la 3 puncte critice care în /crm-ul actual sunt **subdezvoltate**:

1. **Layout copilot real** — acum chatul e doar un drawer lateral (`CRMChatPanel`) declanșat de un buton. Nu e "comanda centrală". Restul ecranului rămâne tab-uri clasice (Pipeline, Firme, Contacte, Scor, Forecast, Rapoarte, Templates, Duplicate, Alerte) — exact opusul filozofiei pe care o descrii.
2. **Generative UI în răspunsuri** — `CRMChatPanel` afișează doar text simplu (`whitespace-pre-wrap`). Nu există mini-tabele, KPI cards, timeline-uri sau butoane de acțiune sub mesajul AI.
3. **Approval flow + explainability** — acțiunile YANA se execută direct prin `yana-agent`, fără confirmare vizuală în chat și fără "pe ce date m-am bazat".

Restul (interogare NL, scoring, alerte proactive, forecast, business card OCR, dossier contact) **există deja** și funcționează — deci nu rescriem CRM-ul, doar îl reorganizăm vizual și îmbogățim stratul de chat.

## Plan de implementare

### Etapa 1 — Layout copilot (3 coloane)

Refactor `src/pages/CRM.tsx` într-un shell nou:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: YANA / CRM · [Card vizită] [Vorbește cu YANA full]  │
├──────────────┬──────────────────────────┬───────────────────┤
│ LEFT NAV     │ CHAT CENTRAL (primary)   │ CONTEXT PANEL     │
│ • Pipeline   │                          │ Client/deal curent│
│ • Contacte   │ Mesaje + generative UI   │ • KPI             │
│ • Firme      │ + slash-commands         │ • Timeline        │
│ • Alerte (n) │ + sugestii prompt        │ • Documente       │
│ • Forecast   │ + voice                  │ • Recomandări AI  │
│ • Rapoarte   │                          │ • Risk signals    │
└──────────────┴──────────────────────────┴───────────────────┘
```

- Pe desktop (≥1024px): 3 coloane (240px / 1fr / 360px).
- Pe mobil/tabletă: chat full-width, left nav devine sheet (hamburger), context panel devine bottom-sheet sau tab "Context".
- Tab-urile vechi (Companies/Contacts/Leads/Forecast/Reports/Templates/Duplicates) devin **vizualizări** declanșate fie din left-nav, fie inline în răspunsul YANA (ex.: "arată-mi pipeline" → pipeline kanban în chat).

### Etapa 2 — Generative UI în răspunsurile YANA

Extind `CRMChatPanel.tsx` (sau îl spargem în `CRMCopilot/` cu sub-componente):

- **Renderer pentru `MessageResponse`**: parsează blocuri marker în răspunsul `yana-agent`:
  - `[CRM_TABLE]{...}[/CRM_TABLE]` → tabel compact (top 10 leads, deals în risc)
  - `[CRM_KPI]{...}[/CRM_KPI]` → cards cu valoare + delta + sursă
  - `[CRM_TIMELINE]{...}[/CRM_TIMELINE]` → timeline activități
  - `[CRM_DRAFT_EMAIL]{...}[/CRM_DRAFT_EMAIL]` → card cu draft + butoane "Editează / Trimite / Salvează template"
  - `[CRM_ACTION_CARD]{...}[/CRM_ACTION_CARD]` → buton de confirmare pentru acțiuni mutante (creează task, schimbă stage, programează demo)
- **Action bar sub fiecare mesaj AI**: "Salvează în CRM", "Creează task", "Deschide fișa", "Copiază".
- **Surse / explainability**: footer mic "Bazat pe: 12 contacte · 3 deals · activitate ultimele 30 zile".

### Etapa 3 — Approval flow (human-in-the-loop)

Reutilizez convenția existentă (`ActionConfirmationCard` din memorie — `mem://features/action-confirmation-human-in-the-loop`):

- Toate intențiile mutante venite de la `yana-agent` (creează deal, mută stage, trimite email, șterge contact) se renderează ca `ActionCard` cu state: `pending` → `confirmed` → `executed`.
- Audit trail: scriu fiecare acțiune confirmată în `crm_activities` cu `activity_type='ai_action'`.

### Etapa 4 — Composer inteligent

Upgrade input-ul din `CRMChatPanel`:

- **Slash commands**: `/contact`, `/deal`, `/task`, `/email`, `/forecast`, `/dup` cu autocomplete.
- **@-mentions** pentru obiecte CRM: `@Alpha SRL`, `@Ion Popescu` — căutare live în `crm_companies` / `crm_contacts`, injectează `entity_id` în context.
- **Sugestii prompt** dinamice bazate pe alertele curente (deja calculate: `staleDeals`, `hotUncontacted`, `churnRisk`).

### Etapa 5 — Context panel reactiv

Componentă nouă `CRMContextPanel.tsx`:

- Se actualizează când YANA menționează un contact/deal (sau când userul îl selectează din left-nav).
- Afișează: header (nume, owner, stadiu, valoare), tabs mici (Activitate / Documente / Emailuri / Recomandări).
- Reutilizează `ContactDossierDialog` ca sursă de date — îl spargem în hook `useContactDossier(id)` ca să meargă și inline.

### Etapa 6 — Backend (minim)

Edge function `yana-agent` rămâne sursa de adevăr; nu o rescriem. Doar:

- Adăugăm un `context_hint: "crm_copilot"` care îi spune să formateze răspunsul cu marker-ele `[CRM_*]` când userul cere date structurate.
- Tool-uri noi (dacă lipsesc — verificăm înainte): `crm.searchContacts`, `crm.getDealTimeline`, `crm.draftEmail`, `crm.proposeAction` (ultima nu execută, doar întoarce un `ActionCard` JSON).

## Detalii tehnice

- Fișiere noi:
  - `src/pages/CRM.tsx` — refactor în layout 3 coloane
  - `src/components/crm/copilot/CRMLeftNav.tsx`
  - `src/components/crm/copilot/CRMChatStream.tsx` (înlocuiește/extinde `CRMChatPanel`)
  - `src/components/crm/copilot/CRMContextPanel.tsx`
  - `src/components/crm/copilot/blocks/` — `KpiBlock.tsx`, `TableBlock.tsx`, `TimelineBlock.tsx`, `DraftEmailBlock.tsx`, `ActionCardBlock.tsx`
  - `src/components/crm/copilot/SlashCommandMenu.tsx`
- Drawer-ul existent `CRMChatPanel` rămâne disponibil temporar pentru fallback mobil, apoi îl scoatem.
- Markdown rendering: reutilizăm `MarkdownRenderer` din `src/components/chat/`.
- Nimic nu se șterge din funcționalitatea curentă — tab-urile vechi devin "vizualizări" accesibile din left-nav, deci nu pierdem nimic din pipeline/forecast/rapoarte.

## Ce las pe **etapa 2** (după ce confirmi MVP-ul)

- Realtime collaboration (mai mulți useri pe același deal).
- Voice agent dedicat (Realtime API) — acum avem doar speech-to-text via `webkitSpeechRecognition`.
- Conectori ERP/facturare în context panel (ai SAGA + e-Factura deja, le-am putea afișa lângă deal).

## Întrebare înainte să încep

Vrei să încep cu **toată Etapa 1 + 2 (layout + generative UI blocks)** într-un singur pas, sau preferi să livrez incremental — întâi layoutul cu chatul existent mutat în centru, apoi blocks-urile?
