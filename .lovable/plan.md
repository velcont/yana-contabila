
# Transformare Digitala cu AI -- Strategy Advisor (cu 3 ajustari)

## Rezumat

Wizard multi-step pentru analiza afacerii si generare strategie AI cu costuri reale, previziuni ROI si PDF descarcabil. Include: edge function dedicata pe backend, salvare rapoarte in DB, si generare completa prin AI (nu doar oportunitati).

## Migratie SQL

### Tabel nou: `ai_strategy_reports`

```text
id (uuid, PK, default gen_random_uuid())
user_id (uuid, NOT NULL, referinta auth.users)
industry (text, NOT NULL)
employees_count (integer)
annual_revenue (numeric)
net_profit (numeric)
departments (text[])
business_description (text)
ai_analysis (jsonb) -- raspunsul complet AI: oportunitati, costuri estimate, roadmap
assumptions (jsonb) -- ipotezele ajustabile: curs USD/RON, cost orar, % crestere
calculated_roi (jsonb) -- ROI calculat la 6/12/24 luni
created_at (timestamptz, default now())
updated_at (timestamptz, default now())
```

RLS: utilizatorul vede/creeaza/sterge doar propriile rapoarte.

## Edge Function nou: `ai-strategy-advisor`

**Scop**: Primeste profilul afacerii, trimite la Gemini 2.5 Flash, returneaza analiza structurata via tool calling.

**Flux**:
1. Valideaza JWT (extragere token din Authorization header)
2. Primeste: industry, employees, revenue, profit, departments, description
3. Prompt specializat in romana: "Analizeaza aceasta afacere si genereaza..."
4. Tool calling cu schema structurata care returneaza:
   - `opportunities[]`: titlu, descriere, impact (1-10), prioritate, tools recomandate, economie_ore_luna
   - `cost_estimates[]`: per tool -- cost lunar RON, setup one-time, training ore
   - `roadmap[]`: faza (luna 1-2, 3-4, 5-6), actiuni, tool, cost, responsabil, rezultat
   - `industry_benchmarks`: crestere CA estimata %, salariu mediu industrie, benchmark-uri
5. Salveaza raspunsul in `ai_strategy_reports`
6. Returneaza datele structurate

**Securitate**: verify_jwt = false in config.toml, validare manuala in cod. Rate limit prin `check_rate_limit`.

## Fisiere noi Frontend

### 1. `src/pages/AIStrategy.tsx`
Pagina principala cu wizard 6 pasi:
- Step 1: Formular profil afacere (BusinessProfileForm)
- Step 2: Afisare oportunitati AI identificate (OpportunitiesDisplay)
- Step 3: Tabel costuri implementare (CostBreakdown)
- Step 4: Previziuni ROI la 6/12/24 luni (ROIProjections)
- Step 5: Plan implementare pe 3 faze (ImplementationRoadmap)
- Step 6: Ajustare ipoteze + descarcare PDF (AssumptionsEditor + buton PDF)

Wizard cu navigare inapoi/inainte, progress indicator, responsive.

### 2. `src/components/ai-strategy/BusinessProfileForm.tsx`
Formular cu validare:
- Industrie: dropdown (retail, transport, constructii, servicii profesionale, HoReCa, productie, sanatate, educatie, altele)
- Numar angajati: input numeric
- CA anuala (RON): input numeric
- Profit net (RON): input numeric
- Departamente: checkboxuri (vanzari, contabilitate, HR, marketing, productie, logistica, suport clienti)
- Descriere activitate: textarea max 500 caractere

### 3. `src/components/ai-strategy/OpportunitiesDisplay.tsx`
Card-uri cu zonele AI identificate: titlu, descriere, impact vizual (bara), prioritate, tools recomandate

### 4. `src/components/ai-strategy/CostBreakdown.tsx`
Tabel costuri lunare per tool si costuri one-time. Curs USD/RON = 4.97 (editabil, cu data referinta). Nr utilizatori per tool ajustabil.

### 5. `src/components/ai-strategy/ROIProjections.tsx`
Tabel previziuni 6/12/24 luni cu formule transparente vizibile. Economie timp convertita in RON, crestere CA, reducere costuri, ROI %, perioada recuperare.

### 6. `src/components/ai-strategy/ImplementationRoadmap.tsx`
Timeline vizual 3 faze cu actiuni, tool, cost, responsabil, rezultat per faza.

### 7. `src/components/ai-strategy/AssumptionsEditor.tsx`
Inputuri editabile: % crestere CA, cost orar munca, nr utilizatori per tool, curs USD/RON. Recalcul instant la modificare.

### 8. `src/config/aiStrategyData.ts`
Date statice: lista tools AI cu preturi USD (Claude Pro $20, ChatGPT Plus $20, Make.com $9-$99, Zapier $20-$69, Midjourney $10), salarii medii pe industrie in Romania, benchmark-uri crestere CA.

### 9. `src/utils/generateAIStrategyPDF.ts`
Generator PDF cu jsPDF (pattern existent din pdfExport.ts):
- Logo YANA + branding Velcont
- Sumar executiv
- Analiza oportunitati
- Tabele costuri si ROI
- Plan implementare
- Disclaimer estimari

## Fisiere modificate

### `src/App.tsx`
- Import lazy AIStrategy
- Ruta `/ai-strategy` ca PrivateRoute (fara restrictie abonament)

### `src/components/yana/ConversationSidebar.tsx`
- Link nou "Strategie AI" in footer sidebar, langa Settings si Preturi, cu icon Brain/Lightbulb

### `supabase/config.toml`
- Adaugare `[functions.ai-strategy-advisor]` cu `verify_jwt = false`

## Flux utilizator

1. Utilizatorul acceseaza `/ai-strategy` din sidebar YANA sau direct
2. Completeaza formularul (Step 1)
3. Click "Analizeaza" -- loading -- apel edge function `ai-strategy-advisor`
4. AI-ul returneaza analiza completa structurata (oportunitati + costuri + roadmap + benchmarks)
5. Steps 2-5 se populeaza automat din raspunsul AI
6. Step 6: utilizatorul ajusteaza ipoteze (recalcul instant client-side) si descarca PDF
7. Raportul ramane salvat in DB -- utilizatorul poate reveni la el

## Rapoarte salvate

In Step 1 se afiseaza si o lista "Rapoartele tale anterioare" daca exista in `ai_strategy_reports`. Click pe un raport il reincarca in wizard fara un nou apel AI.

## Consideratii tehnice

- Toate cifrele in RON, curs USD/RON = 4.97 (editabil)
- Formulele ROI transparente si vizibile
- Un singur apel AI per analiza (Gemini 2.5 Flash, cost estimat ~0.15 RON)
- Accesibil tuturor utilizatorilor autentificati
- Tonul AI: consultant strategic romanesc, concret, bazat pe cifre
- Tool calling pentru output structurat (nu JSON in prompt)
