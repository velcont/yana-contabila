

# Strategie AI -- Integrat complet in chat-ul YANA (fara pagina separata)

## Ce se schimba

In loc de a naviga la `/ai-strategy`, totul se intampla in conversatia YANA:

1. Utilizatorul apasa butonul "Strategie AI" din Quick Actions (sau scrie "vreau o strategie AI pentru afacerea mea")
2. YANA raspunde cu un **formular inline** (artifact nou de tip `ai_strategy_form`) unde utilizatorul completeaza profilul afacerii
3. La submit, YANA trimite datele la edge function-ul `ai-strategy-advisor` (deja existent)
4. Raspunsul vine ca mesaj YANA cu **artifacts inline**: tabele cu oportunitati, costuri, ROI, roadmap
5. Butonul "Descarca PDF" apare tot ca artifact inline de tip `download`

## Componente noi/modificate

### 1. Artifact nou: `ai_strategy_form` (formular inline in chat)
**Fisier nou**: `src/components/yana/AIStrategyFormArtifact.tsx`

Un card interactiv afisat in chat care contine formularul de profil afacere:
- Industrie (dropdown)
- Numar angajati (input)
- CA anuala RON (input)
- Profit net RON (input)
- Departamente (checkboxuri)
- Descriere activitate (textarea)
- Buton "Analizeaza cu YANA"

La submit, trimite un mesaj special in chat cu datele serializate (ex: `[AI_STRATEGY_REQUEST]{...json...}`)

### 2. Artifact nou: `ai_strategy_results` (rezultate inline)
**Fisier nou**: `src/components/yana/AIStrategyResultsArtifact.tsx`

Un card expandabil care afiseaza:
- Tab-uri: Oportunitati | Costuri | ROI | Plan Implementare
- Tabel oportunitati cu impact vizual
- Tabel costuri lunare + one-time
- Previziuni ROI 6/12/24 luni
- Roadmap pe 3 faze
- Sectiune "Ajusteaza Ipotezele" (curs USD/RON, cost orar, % crestere)
- Buton "Descarca Raport PDF"

### 3. `src/components/yana/ArtifactRenderer.tsx` -- modificat
Adaugare 2 tipuri noi de artifact:
- `ai_strategy_form` -- randeaza AIStrategyFormArtifact
- `ai_strategy_results` -- randeaza AIStrategyResultsArtifact

### 4. `src/components/yana/YanaChat.tsx` -- modificat

**Quick Actions** (linia ~667-712): Adaugare buton "Strategie AI" cu icon `Brain`. La click, insereaza un mesaj assistant cu artifact `ai_strategy_form`.

**sendMessage**: Detecteaza mesaje speciale `[AI_STRATEGY_REQUEST]{...}`, extrage datele si apeleaza direct `supabase.functions.invoke('ai-strategy-advisor', { body: profileData })`. Raspunsul se transforma in mesaj assistant cu artifact `ai_strategy_results`.

### 5. `supabase/functions/ai-router/index.ts` -- modificat
Adaugare detectie intent pentru "strategie AI" / "transformare digitala" / "implementare AI" care ruteaza catre `ai-strategy-advisor`.

Alternativ, YanaChat poate apela direct edge function-ul fara ai-router (pattern mai simplu, similar cu cum se face deja pentru `analyze-balance`).

### 6. Pagina `/ai-strategy` -- pastrata ca fallback
Pagina AIStrategy.tsx existenta ramane functionala (nu se sterge), dar nu mai e promovata activ. Navigarea principala se face din chat.

## Fluxul utilizatorului

```text
[YANA Chat]
  |
  v
Buton "Strategie AI" in Quick Actions
  |
  v
YANA afiseaza formular inline (artifact ai_strategy_form)
  |
  v
Utilizatorul completeaza si apasa "Analizeaza"
  |
  v
Loading in chat (TypingIndicator)
  |
  v
YANA raspunde cu rezultatele complete (artifact ai_strategy_results)
  - Tabele oportunitati, costuri, ROI, roadmap
  - Ajustare ipoteze inline
  - Buton descarcare PDF
```

## Detalii tehnice

- Formularul inline foloseste state local (nu trimite mesaj text in conversatie, ci apeleaza direct edge function-ul)
- Rezultatele se salveaza ca artifact in mesajul assistant din `yana_messages`
- PDF-ul se genereaza client-side cu `generateAIStrategyPDF.ts` (deja existent)
- Datele statice din `src/config/aiStrategyData.ts` se reutilizeaza pentru benchmark-uri si preturi
- Componenta AIStrategyResultsArtifact importa logica din componentele existente (`AssumptionsEditor`, etc.) pentru consistenta

