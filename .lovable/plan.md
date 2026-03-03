

# Plan: Transformare YANA în Companion AI care merită 49 RON/lună

## Context

- **76 utilizatori free access** = clienții/colegii tăi → NU se ating, plătesc credite la Strategic Advisor dacă depășesc
- **0 plătitori** prin Stripe din 88 utilizatori cu trial expirat
- Problema: utilizatorii vin, pun întrebări contabile ad-hoc, primesc răspuns, pleacă. Nu se creează legătură

## Cele 4 implementări

---

### 1. Onboarding relațional (la prima conversație)

Când un utilizator nou deschide prima conversație și `yana_client_profiles` nu are date pentru el, YANA inițiază un dialog de cunoaștere:

- "Cu ce se ocupă firma ta?"
- "De cât timp ești antreprenor?"  
- "Ce te ține treaz noaptea legat de business?"
- "Ce obiectiv ai pentru anul ăsta?"

**Implementare:**
- Adăugăm coloană `onboarding_completed` (boolean, default false) în `yana_client_profiles`
- Modificăm `YanaChat.tsx`: la prima conversație (messages.length === 0), verificăm dacă profilul de client are `onboarding_completed = false` → afișăm un flow cu 4 întrebări în chat (nu modal, ci chiar în chat ca mesaje ale YANEI)
- La final, salvăm răspunsurile prin `update-client-profile` edge function și setăm `onboarding_completed = true`
- Din acest moment, fiecare apel la `ai-router`/`chat-ai` injectează profilul clientului în system prompt

**Fișiere:**
- Migrație SQL: adaugă `onboarding_completed` în `yana_client_profiles`
- `src/components/yana/YanaChat.tsx` — detectare & afișare flow onboarding
- `src/components/yana/OnboardingFlow.tsx` — component nou cu cele 4 întrebări
- `supabase/functions/ai-router/index.ts` — injectare profil client în contextul AI

---

### 2. Check-in proactiv săptămânal

Luni dimineața la 08:00, YANA trimite un email personalizat fiecărui utilizator activ (care a avut conversații în ultimele 30 zile):

- Referă ultimul subiect discutat
- Pune o întrebare specifică business-ului lor
- Include un link direct la conversație

**Implementare:**
- Edge function nouă: `weekly-companion-checkin/index.ts`
  1. Query utilizatori activi (ultimele 30 zile) din `ai_conversations`
  2. Pentru fiecare: citește ultimele 3 conversații + profilul din `yana_client_profiles`
  3. Generează mesaj personalizat cu Gemini Flash (ieftin)
  4. Trimite email prin Resend (batch API, max 100)
  5. Creează inițiativă în `yana_initiatives` pentru afișare în chat
- Cron job: luni la 08:00 via `pg_cron` + `pg_net`

**Fișiere:**
- `supabase/functions/weekly-companion-checkin/index.ts` — funcția principală
- SQL insert: cron job schedule

---

### 3. Paywall emoțional (NoAccessOverlay cu statistici relaționale)

Când trial-ul expiră, în loc de mesajul generic actual, YANA arată un rezumat al relației construite:

- "Am avut 18 conversații împreună"
- "Ultima oară am vorbit despre expansiunea firmei tale"
- "Sunt aici când ești gata. 49 lei/lună."
- Bonus: o conversație gratuită pe săptămână pentru a menține legătura (fără a pierde relația)

**Implementare:**
- Modificăm `NoAccessOverlay.tsx`: adăugăm query pe `ai_conversations` count + ultimul subiect
- Adăugăm logica "1 conversație gratuită/săptămână" în `check-subscription/index.ts`: verificăm dacă utilizatorul a trimis un mesaj în ultima săptămână; dacă nu, permitem acces cu `access_type: 'weekly_free'`
- Modificăm `Yana.tsx`: tratăm `access_type === 'weekly_free'` ca acces valid dar afișăm un banner subtil "Conversație gratuită de reconectare"

**Fișiere:**
- `src/components/yana/NoAccessOverlay.tsx` — redesign cu statistici
- `supabase/functions/check-subscription/index.ts` — logica weekly free conversation
- `src/pages/Yana.tsx` — tratare access_type 'weekly_free'

---

### 4. Funcții premium vizibile

War Room și Battle Plan sunt practic invizibile (1 mențiune fiecare în ultimele 90 zile). Le facem vizibile prin:

- Card proactiv în chat la a 3-a conversație: "Știai că poți simula scenarii de criză cu War Room?"
- Suggestion chips sub inputul de chat cu acțiuni rapide: "🎯 War Room", "📋 Battle Plan", "📊 Analizează balanța"
- Acestea trimit mesajul corespunzător direct la YANA

**Implementare:**
- Modificăm `YanaChat.tsx`: adăugăm suggestion chips vizibile sub textarea (înainte de prima conversație și după fiecare răspuns)
- La a 3-a conversație (verificăm count din `yana_conversations`), afișăm un card proactiv în chat despre War Room
- Chipurile: "🏠 War Room", "⚔️ Battle Plan", "📊 Analizează balanță", "🧠 Strategie AI"

**Fișiere:**
- `src/components/yana/YanaChat.tsx` — suggestion chips + card proactiv
- `src/components/yana/SuggestionChips.tsx` — component nou

---

## Secțiune tehnică — ordine implementare

1. **Migrație SQL**: `onboarding_completed` în `yana_client_profiles`
2. **OnboardingFlow** + modificare YanaChat (impact maxim pe primele impresii)
3. **SuggestionChips** (face funcțiile premium vizibile imediat)
4. **NoAccessOverlay relațional** + weekly free conversation în check-subscription
5. **weekly-companion-checkin** edge function + cron job (retenție pe termen lung)

