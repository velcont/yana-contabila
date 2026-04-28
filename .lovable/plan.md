
# Plan: Landing fix (bounce 91% → target <70%) + continuare CRM

Atacăm în ordine: **întâi landing-ul** (impact direct pe trafic), **apoi cele 3 module CRM** (SLA, email tracking, lookup tables).

---

## Partea 1 — Landing quick wins (mobile-first, ~30-45 min)

### Diagnostic concret
- 87% trafic e **mobil** (655 din 751)
- 91% intră pe `/` și pleacă imediat (doar 3 ajung pe `/yana`)
- Sursă principală: **YouTube (55)**, Facebook (13), Instagram (5) — vin din social, atenție 2-3 secunde
- Hero-ul actual cere efort: 3 exemple de citit + 3 bullets + CTA. Pe mobil = scroll mort

### Obiective
1. **Scurtez hero-ul** la o singură promisiune + un singur CTA dominant
2. **Adaug interacțiune instantă** — nu doar text de citit, ci ceva pe care vizitatorul îl atinge în 2 secunde
3. **Bounce-killer**: dacă vizitatorul scrollează măcar puțin, vede deja "wow moment"

### Modificări concrete

**1. `LandingCFOCRMHero.tsx` — refactor**
- Scot cele 3 `ChatExample` statice (text mort, ocupă spațiu, nu convertesc)
- Scot cele 3 `Feature` bullets (chat-first / CFO / CRM) — redundante cu titlul
- H1 mai punchy, focus pe **beneficiu**, nu pe ce e produsul:
  - Nou: "Cifrele tale, **explicate ca de un CFO.** Clienții tăi, **gestionați prin chat.**"
- Adaug **3 chips clickabile** (în loc de exemple statice) care deschid direct demo-ul cu întrebarea pre-completată:
  - "Câți bani îmi rămân după impozite?"
  - "Cum stă pipeline-ul meu?"
  - "Analizează-mi balanța"
- Mai jos hero: counter live ("177+ antreprenori, 12 azi") — deja există parțial

**2. Hook nou: deschidere demo cu prompt pre-completat**
- `LandingCFOCRMHero` primește `onTryPrompt: (prompt: string) => void` din `Landing.tsx`
- `Landing.tsx` deschide `DemoChat` cu prompt-ul deja scris în input — utilizatorul doar apasă Send
- Asta convertește mult mai bine decât "Click pe CTA → Auth → /yana"

**3. `LandingChatDemo.tsx` — animat în loc de static**
- Acum e un bloc static de text care se citește în 30s. Pe mobil = nimeni nu îl citește.
- Îl fac **auto-typing** (mesajele apar progresiv, ca un chat real care se întâmplă acum)
- Folosesc `useEffect` cu `setInterval`, fără librării noi
- Loop-uiește la final pentru a menține atenția

**4. `LandingStickyMobileCTA.tsx` — îmbunătățire mică**
- Acum apare doar după 50px scroll. Îl fac vizibil de la 200px (după hero), ca să nu sufoce hero-ul
- Adaug un text mic sub buton: "30 zile gratuit · fără card"
- Buton cu **icon mesaj** ca să sugereze conversație

**5. Reordonare secțiuni** (`Landing.tsx`)
- Mut `LandingChatDemo` (animat) **imediat după hero** (deja e acolo, ok)
- Mut `LandingSocialProof` **imediat după chat demo** (acum e după PainPoints) — social proof devreme = trust devreme
- `LandingPainPoints` rămâne pentru cei care scrollează mai jos

### Tracking
- Adaug `analytics.landingCtaClick('chip', 'hero_<prompt>')` pe fiecare chip
- Adaug `analytics.landingCtaClick('demo_typed', 'auto_demo')` când chat demo termină de typit
- Așa pot măsura în 3-4 zile dacă chip-urile convertesc mai bine decât CTA-ul standard

### Ce NU schimb (acum)
- Stack-ul SEO/JSON-LD (e ok)
- Pricing, AIProviders, Pain Points (sunt below-fold, nu afectează bounce)
- ExitIntentPopup (deja există)
- Diagnosticul în 5 pași (rămâne accesibil din ExitIntent și sticky)

### Risc & rollback
- Toate schimbările sunt în 4 fișiere existente, fără DB. Rollback ușor printr-un revert
- Nu sparg nimic din restul aplicației (componente self-contained)

---

## Partea 2 — Continuare CRM (3 module)

După ce landing-ul e live, trec direct la cele 3 module aprobate anterior. Le livrez în ordinea recomandată (cea mai mică complexitate prima):

### Etapa A — Lookup tables (cel mai sigur, ~150 LOC)
1. Migration: tabele `crm_lead_sources`, `crm_territories`, `crm_lost_reasons` cu RLS per user
2. Funcție `ensure_default_crm_lookups(user_id)` care seedează valori implicite
3. FK columns: `lead_source_id`, `territory_id` pe `crm_deals` și `crm_contacts`; `lost_reason_id` pe `crm_deals`
4. UI: dropdown în formularul de deal (`CRM.tsx` / componenta de edit deal)
5. Hook `useCrmLookups()` pentru fetch o singură dată

### Etapa B — SLA tracking (~250 LOC)
1. Migration: `crm_sla_policies` (per pipeline stage: max ore până la first response, max zile până la close)
2. Pe `crm_deals` adaug: `first_response_at`, `response_due_at`, `sla_breached`, `sla_warning_at`
3. Trigger SQL care calculează `response_due_at` la INSERT bazat pe stage-ul curent
4. UI: badge vizual pe card-ul de deal în Kanban (verde/galben/roșu)
5. Edge function cron `crm-sla-checker` (rulează la 15 min): marchează `sla_breached=true`
6. Decizie utilizator deja luată: **alertă vizuală în UI**, dar opțional pot adăuga și mesaj proactiv din partea YANA în chat (pe baza memoriei `proactive-initiative-tone-standard`)

### Etapa C — Email tracking (~300 LOC, cel mai complex)
1. Migration: `crm_email_events` (open, click, bounce) + `crm_email_sends` (id mesaj, deal_id, contact_id)
2. Edge function `crm-email-tracker` — endpoint public care primește `?id=xxx&event=open`, returnează 1x1 PNG
3. Edge function `crm-send-email` — wrapper Resend care:
   - Substituie variabile (`{{contact.first_name}}`, `{{deal.value}}`)
   - Injectează tracking pixel + rewrites linkuri prin `crm-email-tracker?event=click`
   - Logă `crm_email_sends`
4. UI: pe deal-ul deschis, secțiune "Email activity" cu istoric open/click
5. Memoria existentă `email-placeholder-prevention-rules` — adaug validare strictă că nu rămân `[...]` brackets în template-uri

### Comunicare cu utilizatorul după fiecare etapă
- După fiecare etapă opresc și raportez ce e live
- Așa nu se acumulează bug-uri care se mască reciproc

---

## Detalii tehnice

**Fișiere modificate (Partea 1):**
- `src/components/landing/LandingCFOCRMHero.tsx` — refactor hero
- `src/components/landing/LandingChatDemo.tsx` — auto-typing
- `src/components/landing/LandingStickyMobileCTA.tsx` — threshold + subtext
- `src/pages/Landing.tsx` — reordonare secțiuni + handler prompt pre-completat
- `src/components/demo/DemoChat.tsx` — accept prop `initialPrompt` (verific dacă există deja)

**Fișiere noi (Partea 2):**
- 3 migrations SQL
- 3 hooks React (`useCrmLookups`, `useCrmSla`, `useCrmEmailEvents`)
- 3 edge functions (`crm-sla-checker`, `crm-email-tracker`, `crm-send-email`)
- Update componente existente CRM pentru afișare badge SLA și dropdown lookups

**Fără breaking changes**: toate FK-urile noi sunt nullable, toate tabelele noi sunt aditive.

---

## Așteptări realiste

- Landing fix nu rezolvă bounce-ul instant — e un test. Dau drumul, monitorizez 3-5 zile, ajustez
- Target realist: **bounce 91% → 70-75%** în prima săptămână (industria SaaS B2B = 60-75%)
- Dacă nu se mișcă în 5 zile, semnalul real e că **traficul YouTube nu e calificat** și trebuie schimbat mesajul în videoclipuri, nu pe site
