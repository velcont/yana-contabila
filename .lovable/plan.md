

# Plan: Implementare funcționalități din Research Report în YANA

Bazat pe raportul tehnic generat și pe infrastructura existentă a YANA, iată ce putem implementa concret, prioritizat pe impact și fezabilitate.

---

## Ce există deja vs. ce lipsește

YANA are deja: ai-router, memory system (3 tiers), web scraping (Perplexity + Firecrawl), email (Resend), cron jobs (pg_cron), action engine, supplier audit, prospector/outreach, weekly alerts, monthly reports, cash runway calculation, resilience analysis.

**Lipsesc**: CEO Morning Briefing, Next Best Action, Cash Flow Forecast 30 zile, Weekly Value Report, Competitor Monitor, Grant Scanner, Action Confirmation Flow.

---

## Faza 1 — Quick Wins (implementabile acum)

### 1. CEO Morning Briefing Email (edge function + cron)
- Creează `send-morning-briefing/index.ts` — rulează zilnic la 07:00 UTC
- Agregă: ultima balanță (cash disponibil, profit), termene fiscale din următoarele 7 zile, ultimele 3 știri fiscale, acțiuni nerezolvate din `yana_action_items`
- Trimite email formatat via Resend la toți utilizatorii activi
- **Impact**: Utilizatorii deschid YANA în fiecare dimineață

### 2. Next Best Action — Recomandare în chat
- Adaugă logică în `ai-router` pentru a detecta intent-ul "ce ar trebui să fac?" / "recomandă-mi"
- Edge function `generate-next-action` analizează: termene fiscale, acțiuni restante, cash runway, observații recente
- Răspunde cu o recomandare concretă și acționabilă
- Adaugă chip "Ce ar trebui să fac azi?" în SuggestionChips

### 3. Cash Flow Forecast 30 zile
- Folosește `calculateCashFlowForecast` existent din `financialAnalysis.ts`
- Adaugă detectare intent în ai-router: "cum o să stau cu banii" / "forecast cash"
- Generează chart inline în chat cu proiecția pe 30/60/90 zile
- Adaugă chip "Previziune Cash Flow" în SuggestionChips

### 4. Weekly Value Report Email
- Creează `send-weekly-value-report/index.ts` — rulează vineri la 16:00 UTC
- Agregă din DB: nr. conversații, nr. analize, nr. documente generate, acțiuni completate
- Email: "Săptămâna aceasta YANA te-a ajutat cu X analize, Y decizii"
- **Impact**: Dovedește valoarea → retenție

### 5. Competitor Monitor MVP
- Creează `monitor-competitors/index.ts` — cron săptămânal
- Tabelă nouă `competitor_watches` (user_id, competitor_url, last_snapshot)
- Firecrawl scrape + diff între snapshot-uri
- Email cu schimbările detectate
- Detectare intent în chat: "monitorizează competitor X"

### 6. Grant Scanner MVP
- Creează `scan-grants/index.ts` — cron săptămânal
- Perplexity search: "fonduri europene nerambursabile [industrie] România 2026"
- Stochează rezultatele, trimite email digest
- Detectare intent în chat: "ce fonduri europene sunt disponibile?"
- Adaugă chip "Fonduri Europene" în SuggestionChips

### 7. Action Confirmation Flow
- Înainte ca YANA să execute o acțiune (trimitere email, generare document), afișează preview în chat cu butoane "Confirmă / Editează / Anulează"
- Componenta `ActionConfirmationCard` în artifacts renderer
- Stare `pending_confirmation` în `yana_action_items`

---

## Faza 2 — Îmbunătățiri de arhitectură

### 8. Temporal Memory (inspirat de Zep)
- Adaugă coloana `valid_from` / `valid_until` la `yana_semantic_memory`
- Când un fact se schimbă, marchează versiunea veche ca expirată
- YANA știe: "în martie aveai 50K cash, acum ai 30K"

### 9. Graph Memory (inspirat de Mem0)
- Tabelă nouă `memory_relationships` (subject, predicate, object, confidence)
- Extrage relații din conversații: "Client X → datorează → 5000 RON"
- Injectează relațiile relevante în context

### 10. WhatsApp Notifications via Twilio
- Conectează Twilio connector
- Trimite alerte critice (termene fiscale, cash flow scăzut) pe WhatsApp
- Nu bridge complet — doar notificări unidirecționale

---

## Migrări de bază de date necesare

1. `competitor_watches` — pentru monitorizare competitori
2. `grant_opportunities` — pentru scanner fonduri
3. Coloane `valid_from`/`valid_until` pe `yana_semantic_memory`
4. Tabelă `memory_relationships` pentru graph memory
5. Coloana `confirmation_status` pe `yana_action_items`

---

## Ordine de implementare propusă

1. CEO Morning Briefing (cel mai mare impact pe retenție zilnică)
2. Weekly Value Report (dovedește ROI)
3. Next Best Action + Cash Flow Forecast (valoare imediată în chat)
4. SuggestionChips noi (discoverability)
5. Grant Scanner + Competitor Monitor (intelligence features)
6. Action Confirmation Flow (trust & control)
7. Temporal + Graph Memory (fundație pentru faza 3)
8. WhatsApp Notifications (canal nou)

---

## Ce NU implementăm acum
- WhatsApp Bridge complet (necesită server persistent, risc ToS)
- Browser-Use (necesită Playwright infrastructure — prea heavy)
- Multi-Agent War Council (complex, prematur fără daily usage mai mare)
- Business OS complet (viziune pe termen lung)
- OCR Invoice Tracker (necesită PaddleOCR infrastructure)

