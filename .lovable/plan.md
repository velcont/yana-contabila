

# Fix: Balanțele Saga nu sunt interpretate corect în YANA Chat

## Problema

Când un utilizator încarcă o balanță din software-ul **SAGA** prin YANA Chat (`/yana`), fișierul este procesat de parser-ul standard (`analyze-balance`) în loc de parser-ul specializat (`analyze-balance-saga`).

Detectarea formatului SAGA există doar în componenta veche `ChatAI.tsx`, dar **nu există în `ai-router`** -- funcția care decide ce parser să folosească pentru fișierele încărcate prin YANA.

**Efect**: Cifra de afaceri (CA) și alți indicatori financiari pot fi extrasi din coloanele greșite, deoarece formatul SAGA are 5 perechi de coloane Debit/Credit (Solduri inițiale, Sume precedente, Rulaje, Sume totale, Solduri finale) plus coloane separatoare goale, în timp ce parser-ul standard se așteaptă la 4 perechi fără separatoare.

## Soluția

Adăugarea detectării formatului SAGA direct în `ai-router`, astfel încât balanțele Saga să fie trimise automat la `analyze-balance-saga`.

## Modificări tehnice

### 1. `supabase/functions/ai-router/index.ts`

**a)** Adăugare funcție `detectSagaFromBase64()` care parsează Excel-ul și verifică pattern-urile SAGA (similar cu logica existentă din `src/utils/sagaDetector.ts`):
- Verifică "Balanta de verificare" în primele rânduri
- Verifică header pe multiple rânduri (sold + rulaj + debit/credit)
- Verifică "Total sume" / "Sume precedente" (specific SAGA)
- Verifică pagina care conține "SAGA C" (footer specific SAGA)
- Returnează `true` dacă scorul depășește pragul

**b)** Actualizare secțiunea de routing pentru `balance_excel` (linia ~645):

Înainte:
```
route: 'analyze-balance'
```

După:
```
// Detectare SAGA
const isSaga = detectSagaFromBase64(fileData.fileContent);
route: isSaga ? 'analyze-balance-saga' : 'analyze-balance'
```

**c)** Adăugare `'analyze-balance-saga'` în tipul `RouteDecision.route` (linia 25).

### 2. Verificare consistență `analyze-balance-saga/index.ts`

Verificare că structuredData returnat de parser-ul SAGA include toate câmpurile necesare pentru `balanceContext` (company, cui, accounts cu code, name, debit, credit, finalDebit, finalCredit, accountClass) -- format identic cu cel returnat de `analyze-balance`.

## Ce NU se schimbă

- Parser-ul SAGA existent (`analyze-balance-saga`) rămâne neschimbat
- Parser-ul standard (`analyze-balance`) rămâne neschimbat  
- Componenta `ChatAI.tsx` (care are deja detectare SAGA) rămâne neschimbată
- Frontend-ul YANA Chat nu necesită modificări

## Rezultat așteptat

După fix, când utilizatorul emokecsokasi (sau oricine altcineva) încarcă o balanță exportată din SAGA prin YANA Chat, sistemul o detectează automat și o procesează cu parser-ul dedicat. Cifra de afaceri, profitul și toți indicatorii sunt extrasi din coloanele corecte.
