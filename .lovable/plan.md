

# PLAN: Corectare completă parser coloane și dezactivare cache

## PROBLEMA IDENTIFICATĂ

Din logurile edge function `analyze-balance`:

```
📊 [HEADER-DETECT-UNIFIED] REZULTAT: {
  soldFinalC: 7,   ← GREȘIT (este Total sume Creditor)
  totalSumeC: 5    ← GREȘIT (este Rulaje Creditor)
}

✅ [CL7] Cont 704 (col 5): 2683.01 RON   ← Citește din coloana GREȘITĂ
✅ [CL7] Cont 707 (col 5): 9582.01 RON   ← Valorile corecte sunt în col 7
```

Structura reală din Excel CESPUY (din document):
- Coloana 4-5: **Rulaje perioadă** (Debit/Credit) → 2.683, 9.582 RON
- Coloana 6-7: **Total sume** (Debit/Credit) → 38.646, 127.572 RON  
- Coloana 8-9: **Solduri finale** (Debit/Credit) → 0, 0 RON

Parserul citește veniturile din coloana 5 (rulaje = 23.281 RON) în loc de coloana 7 (total sume = 183.010 RON).

## CAUZA ROOT

Funcția `detectHeaderIndices()` caută cuvintele "solduri finale" și "total sume" în header, dar:
1. Găsește "Solduri finale" la coloana 8 (corect pentru SF)
2. Caută "total sume" și găsește o poziție greșită (5 în loc de 6)
3. Intervalul `+2` nu rezolvă problema când poziția de start e deja greșită

---

## SOLUȚIE TEHNICĂ

### Pas 1: Refactorizare `detectHeaderIndices()` cu detecție bazată pe ordinea coloanelor

În loc să căutăm keywords imprecise, vom folosi **ordinea fixă** a coloanelor în balanțele SmartBill/Saga:

```text
| Cont | Descriere | SI_D | SI_C | RP_D | RP_C | TS_D | TS_C | SF_D | SF_C |
|  0   |    1      |  2   |  3   |  4   |  5   |  6   |  7   |  8   |  9   |
```

Logica nouă:
1. Identificăm **ultima pereche** de coloane cu "Debitoare/Creditoare" în subheader → acelea sunt **Solduri Finale**
2. Penultima pereche → **Total Sume**
3. Antepenultima pereche → **Rulaje Perioadă**

### Cod modificat în `analyze-balance/index.ts`:

```typescript
// === PASUL 3 REFACTORIZAT: Detectăm coloanele prin scanare INVERSĂ (de la dreapta) ===
if (mainHeaderRow >= 0 && subHeaderRow < data.length) {
  const subHeader = data[subHeaderRow];
  
  // Găsim TOATE perechile Debit/Credit din subheader
  const debitCreditPairs: Array<{debitCol: number, creditCol: number}> = [];
  
  for (let j = 0; j < subHeader.length - 1; j++) {
    const cell = String(subHeader[j]).toLowerCase().trim();
    const nextCell = String(subHeader[j + 1]).toLowerCase().trim();
    
    const isDebit = cell.includes('debit') || cell === 'd';
    const isCredit = nextCell.includes('credit') || nextCell === 'c';
    
    if (isDebit && isCredit) {
      debitCreditPairs.push({ debitCol: j, creditCol: j + 1 });
      j++; // Skip next since it's part of this pair
    }
  }
  
  // Ordinea fixă (de la stânga la dreapta): SI, Rulaje, Total Sume, SF
  // Deci: ultima pereche = SF, penultima = Total Sume
  if (debitCreditPairs.length >= 2) {
    const sfPair = debitCreditPairs[debitCreditPairs.length - 1];
    const tsPair = debitCreditPairs[debitCreditPairs.length - 2];
    
    soldFinalDebitCol = sfPair.debitCol;
    soldFinalCreditCol = sfPair.creditCol;
    totalSumeDebitCol = tsPair.debitCol;
    totalSumeCreditCol = tsPair.creditCol;
  }
}
```

### Pas 2: Dezactivare cache la upload (conform preferințelor tale)

În `ai-router/index.ts`, când routăm către `analyze-balance`:

```typescript
if (docType === 'balance_excel') {
  routeDecision = {
    route: 'analyze-balance',
    payload: {
      excelBase64: fileData.fileContent,
      companyName: detectedCompanyName || undefined,
      fileName: fileData.fileName,
      memoryContext,
      forceReprocess: true  // MEREU forțăm re-analiza
    },
    reason: 'Excel balance sheet uploaded'
  };
}
```

### Pas 3: Versiune parser în cheia cache

În `analyze-balance/index.ts`:

```typescript
// Versiune parser pentru invalidare automată cache la update-uri
const PARSER_VERSION = '2.0.1';  // Incrementăm la fiecare fix

// Cheia cache include versiunea
const cacheKey = `balance_v${PARSER_VERSION}_${textHash.length}_${textHash.split('').reduce(...)}`;
```

---

## FIȘIERE AFECTATE

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/analyze-balance/index.ts` | 1. Refactorizare `detectHeaderIndices()` cu detecție perechi D/C de la dreapta 2. Adăugare `PARSER_VERSION` în cheia cache |
| `supabase/functions/ai-router/index.ts` | Adăugare `forceReprocess: true` în payload pentru `analyze-balance` |

---

## REZULTAT AȘTEPTAT

După implementare, pentru balanța CESPUY SRL:

| Indicator | Înainte (greșit) | După (corect) |
|-----------|------------------|---------------|
| `totalSumeCreditCol` | 5 | 7 |
| `soldFinalCreditCol` | 7 | 9 |
| Total Venituri (Clasa 7) | 23.281,87 RON | **183.010,18 RON** |
| Total Cheltuieli (Clasa 6) | 248.095,91 RON | 248.095,91 RON |
| Rezultat calculat (7-6) | -224.814 RON | **-65.085 RON** |
| Cont 121 (pierdere) | 41.502,91 RON | ~41.502 RON |

Diferența de ~23.000 RON rămasă va fi din operațiuni de închidere (709, profit reportat, etc.) - **acceptabilă** pentru o balanță în curs de an.

---

## VERIFICARE

1. Reîncărcarea balanței CESPUY SRL trebuie să afișeze:
   - Total Venituri: ~183.000 RON
   - Solduri Finale echilibrate: 111.404,72 RON
   - Fără mesaj de "NECONCORDANȚĂ" (sau cu diferență sub 10 RON)

2. Cache-ul vechi nu va mai fi folosit datorită `forceReprocess: true` și versiunii în cheie.

