

# Plan: YANA Contextual Intelligence + 5 Features Noi

## Rezumat

Implementăm 7 capabilități care transformă YANA dintr-un analizor de balanțe într-un **consultant holistic cu gândire integrativă**: Dashboard financiar live în chat, Comparator multi-perioadă, Calendar fiscal inteligent, Verificator ANAF CUI, Mini-cursuri fiscale, **injecție de știri/vreme/context economic în conversație**, și upgrade la prompt-ul de sistem pentru gândire strategică și situațională.

---

## Pas 1: Context Engine — Știri fiscale + Vreme + Context economic injectate în chat-ai

**Ce face:** Înainte de fiecare răspuns, chat-ai va prelua automat din DB ultimele 3-5 știri fiscale relevante și va face un apel la un API meteo gratuit (Open-Meteo, fără API key) pe baza locației utilizatorului. Aceste date se injectează în system prompt ca "context situațional".

**Fișiere:**
- `supabase/functions/chat-ai/index.ts` — Adăugare secțiune nouă `buildContextualIntelligence()`:
  - Citește din `fiscal_news` ultimele 5 știri (deja populate de `fetch-fiscal-news`)
  - Citește locația din `yana_client_profiles.business_domain` sau un câmp nou `city`
  - Apel fetch la `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current_weather=true` (gratis, fără key)
  - Construiește secțiune prompt: "Context extern: Vreme: 28°C, parțial noros. Știri: [titlu1], [titlu2]. Tendință piață: ..."
  - Injectează în `adaptedPrompt` ca secțiune `CONTEXTUAL INTELLIGENCE`

- `supabase/functions/fetch-fiscal-news/index.ts` — Extindere RSS feeds cu surse economice și politice:
  - Adăugare: `economedia.ro`, `profit.ro/rss`, `zf.ro/rss`, Google News `"politica economica" OR "buget" OR "inflatie"`
  - Extindere `FISCAL_KEYWORDS` cu: `inflație`, `BNR`, `curs valutar`, `buget`, `PIB`, `somaj`

- **Migrare DB**: Adăugare coloană `city` la `yana_client_profiles` (default: 'București')

**Prompt injection exemplu:**
```
=== INTELIGENȚĂ CONTEXTUALĂ ===
📅 Data: 1 aprilie 2026, marți
🌤️ Vreme în București: 14°C, cer senin
📰 Știri relevante (ultimele 24h):
- "BNR menține dobânda la 6.5%" (ZF, ieri)
- "Noi praguri TVA de la 1 iulie" (Economedia, azi)
- "Inflația scade la 4.2% în martie" (Profit.ro, 30 mar)
→ Folosește aceste informații NATURAL în răspunsuri când sunt pertinente.
→ Ex: "Apropo, ai văzut că BNR a menținut dobânda? Asta e bine pentru creditele firmei tale."
→ NU forța referințele — doar când se leagă organic de discuție.
=== END CONTEXTUAL ===
```

---

## Pas 2: Upgrade System Prompt — Gândire Integrativă, Strategică, Holistică

**Fișier:** `supabase/functions/chat-ai/index.ts` — Adăugare secțiune nouă în `SYSTEM_PROMPT`

```
🧠 GÂNDIRE INTEGRATIVĂ (REGULĂ FUNDAMENTALĂ):
Nu ești doar un calculator de cifre. Ești un CONSULTANT HOLISTIC care:

1. GÂNDIRE CONTEXTUALĂ: Ia în calcul contextul larg — clima economică,
   tendințe de piață, știri recente, sezonalitate — nu doar cifrele din balanță.

2. GÂNDIRE STRATEGICĂ: Nu te limita la prezent. Anticipează impactul
   deciziilor pe 3-6-12 luni. "Dacă continui acest trend, în septembrie..."

3. CONSULTANȚĂ HOLISTICĂ: Privește afacerea ÎN ANSAMBLU — nu doar financiar.
   Consideră echipa, piața, competiția, starea emoțională a antreprenorului.

4. JUDECATĂ PROFESIONALĂ: Aplică experiență și intuiție, nu doar reguli.
   "Din experiența mea cu firme similare din domeniul tău..."

5. INTELIGENȚĂ SITUAȚIONALĂ: Adaptează sfaturile în funcție de situația
   concretă. O firmă cu 2 angajați primește altceva decât una cu 50.
   O firmă în construcții primește altceva decât una IT.

EXEMPLU INTEGRAT:
User: "Cum stau financiar?"
❌ VECHI: "Ai profit de 15.000 RON, lichiditate 1.2"
✅ NOU: "Ai profit de 15.000 RON. E solid, dar cu inflația la 4.2% din
martie, profitul tău real e de fapt ~14.370 RON. Plus, dacă BNR menține
dobânda, creditele rămân stabile — moment bun pentru investiții.
Atenție la sezonalitate: în domeniul tău, T2 aduce de obicei +20% vânzări."
```

---

## Pas 3: Dashboard Financiar Live în Chat (Feature #1)

**Ce face:** Când utilizatorul cere "dashboard" sau "cum stau financiar", YANA generează automat un set de artefacte inline: KPI cards + grafice.

**Fișier:** `supabase/functions/chat-ai/index.ts` — Adăugare în `SYSTEM_PROMPT` secțiune `DASHBOARD MODE`:
- Detectare keywords: `dashboard`, `cum stau`, `tablou de bord`, `rezumat financiar`, `overview`
- Generare automată: 1 tabel KPI (CA, Profit, Lichiditate, DSO, DPO) + 1 bar_chart cheltuieli + 1 line_chart trend
- Format: multiple blocuri `artifact` într-un singur răspuns

---

## Pas 4: Comparator Multi-Perioadă în Chat (Feature #3)

**Ce face:** Utilizatorul întreabă "compară ianuarie cu martie" sau "evoluție pe 3 luni" și primește tabel comparativ + trend chart.

**Fișier:** `supabase/functions/chat-ai/index.ts` — Extindere prompt cu secțiune `COMPARE MODE`:
- Detectare: `compară`, `comparație`, `evoluție`, `vs`, `față de`, `luna trecută`
- YANA caută în DB analizele anterioare ale utilizatorului (din `analyses`)
- Generează artifact `table` cu coloane: Indicator | Luna 1 | Luna 2 | Variație %
- Plus `line_chart` cu trend

---

## Pas 5: Calendar Fiscal Inteligent (Feature #6)

**Ce face:** Edge function nouă `fiscal-calendar` care returnează termenele fiscale viitoare. YANA le menționează proactiv când se apropie deadlines.

**Fișiere:**
- `supabase/functions/fiscal-calendar/index.ts` — Calendar fiscal 2026 hardcodat (D300 TVA: 25 ale lunii, D112: 25, D100: 25 trimestrial, bilanț: 30 mai, etc.)
  - Input: luna curentă → Output: termenele din următoarele 14 zile
  - Funcție query-abilă din chat-ai

- `supabase/functions/chat-ai/index.ts` — Injecție automată:
  - La fiecare conversație, verifică termenele din următoarele 7 zile
  - Dacă există termene → injectează: "⏰ ATENȚIE: D300 TVA se depune pe 25 aprilie. Menționează NATURAL dacă e relevant."

---

## Pas 6: Verificator ANAF CUI (Feature #7)

**Ce face:** Utilizatorul scrie "verifică CUI 12345678" și YANA face lookup la API-ul ANAF public.

**Fișiere:**
- `supabase/functions/verify-anaf-cui/index.ts` — Edge function nouă:
  - Apel la `https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva` (POST, public, fără key)
  - Returnează: denumire, adresă, TVA activ/inactiv, split TVA, stare fiscală
  - Format răspuns structurat

- `supabase/functions/chat-ai/index.ts` — Detectare pattern CUI:
  - Regex: `(CUI|cui|cod fiscal|cf)\s*:?\s*(\d{6,10})` sau `RO?\d{6,10}`
  - Când detectat → apel intern la `verify-anaf-cui` → inject rezultat în conversație
  - YANA prezintă: "Am verificat CUI 12345678: SC EXEMPLU SRL, TVA activ, stare: ÎNREGISTRAT"

---

## Pas 7: Mini-Cursuri Fiscale (Feature #9)

**Ce face:** Utilizatorul scrie "învață-mă despre TVA" sau "curs despre e-Factura" și YANA livrează un mini-curs structurat.

**Fișier:** `supabase/functions/chat-ai/index.ts` — Adăugare în prompt:
- Detectare: `învață-mă`, `curs`, `explică-mi`, `ce e`, `cum funcționează` + termen fiscal
- YANA generează mini-curs structurat: 
  - Titlu + 3-5 secțiuni scurte
  - Fiecare secțiune: concept + exemplu practic + gotcha
  - Quiz final cu 2-3 întrebări
  - Ton: accesibil, fără jargon, cu analogii din viața reală
- Teme disponibile: TVA, e-Factura, Microîntreprinderi, CAS/CASS, Impozit pe profit, Dividende, SAF-T

---

## Estimare impact

| Component | Complexitate | Fișiere |
|---|---|---|
| Context Engine (știri+vreme) | Medie | chat-ai, fetch-fiscal-news, migrare DB |
| Prompt upgrade gândire integrativă | Mică | chat-ai |
| Dashboard live | Mică | chat-ai (prompt only) |
| Comparator | Medie | chat-ai |
| Calendar fiscal | Medie | fiscal-calendar (nou), chat-ai |
| Verificator ANAF | Medie | verify-anaf-cui (nou), chat-ai |
| Mini-cursuri | Mică | chat-ai (prompt only) |

