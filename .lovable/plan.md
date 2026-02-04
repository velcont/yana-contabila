

# PLAN DE CORECȚIE - PARSER COLOANE SMARTBILL/CESPUY

## PROBLEMA IDENTIFICATĂ

Din logurile funcției `analyze-balance` pentru balanța **CESPUY SRL**:

```
📊 [HEADER-DETECT-UNIFIED] REZULTAT: {
  headerRow: 5,
  soldFinalD: 8,   ← CORECT (Solduri finale Debitoare)
  soldFinalC: 7,   ← GREȘIT! (7 = Total sume Creditoare, NU SF Creditoare)
  totalSumeD: 6,   ← CORECT
  totalSumeC: 5    ← GREȘIT! (5 = Rulaje Creditoare)
}
```

### Structura reală a Excel-ului CESPUY:

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|-------|---|---|---|---|---|---|---|---|---|---|
| Header | Contul | Descrierea | Solduri inițiale an | (gol) | Rulaje perioada | (gol) | Total sume | (gol) | **Solduri finale** | (gol) |
| Subheader | | | Debitoare | Creditoare | Debitoare | Creditoare | Debitoare | Creditoare | **Debitoare** | **Creditoare** |

**Problema:** SmartBill pune **celule goale** între grupuri. Parserul caută "Solduri finale" și găsește coloana 8, dar apoi scanează subheader-ul pentru "credit" și găsește coloana 7 (care aparține grupului "Total sume", NU "Solduri finale").

### Impactul erorii:

1. **Venituri greșite:** Se citesc din coloana 5 (Rulaje Creditoare) în loc de coloana 7 (Total sume Creditoare)
   - Afișat: 23,281.87 RON
   - Corect: 183,010.18 RON

2. **Solduri finale inversate:** SF Creditor citit din coloana 7 în loc de 9
   - Afișat: 1,883,548.38 (Total sume Creditoare)
   - Corect: 111,404.72 RON

---

## SOLUȚIE TEHNICĂ

### Modificare `detectHeaderIndices()` în `analyze-balance/index.ts`

**Strategia:** După ce găsim începutul unui grup (ex: "Solduri finale" la coloana 8), căutăm Debit/Credit DOAR în intervalul [startCol, startCol+1], nu [startCol, startCol+4].

**Motivație:** Fiecare grup are exact 2 coloane (Debit + Credit), nu 4.

### Cod actual (linii 410-416):

```typescript
// Solduri finale - PROBLEMATIC
if (soldFinalStartCol >= 0) {
  for (let j = soldFinalStartCol; j < Math.min(soldFinalStartCol + 4, subHeader.length); j++) {
    const cell = String(subHeader[j]).toLowerCase().trim();
    if ((cell.includes('debit') || cell === 'd') && soldFinalDebitCol < 0) soldFinalDebitCol = j;
    if ((cell.includes('credit') || cell === 'c') && soldFinalCreditCol < 0) soldFinalCreditCol = j;
  }
}
```

### Cod corectat:

```typescript
// Solduri finale - CORECTAT
if (soldFinalStartCol >= 0) {
  // SmartBill are fix 2 coloane per grup: Debitoare, Creditoare
  // Căutăm DOAR în intervalul [startCol, startCol+2)
  for (let j = soldFinalStartCol; j < Math.min(soldFinalStartCol + 2, subHeader.length); j++) {
    const cell = String(subHeader[j]).toLowerCase().trim();
    if ((cell.includes('debit') || cell === 'd') && soldFinalDebitCol < 0) soldFinalDebitCol = j;
    if ((cell.includes('credit') || cell === 'c') && soldFinalCreditCol < 0) soldFinalCreditCol = j;
  }
}

// Total sume - CORECTAT similar
if (totalSumeStartCol >= 0) {
  for (let j = totalSumeStartCol; j < Math.min(totalSumeStartCol + 2, subHeader.length); j++) {
    const cell = String(subHeader[j]).toLowerCase().trim();
    if ((cell.includes('debit') || cell === 'd') && totalSumeDebitCol < 0) totalSumeDebitCol = j;
    if ((cell.includes('credit') || cell === 'c') && totalSumeCreditCol < 0) totalSumeCreditCol = j;
  }
}
```

### Logica îmbunătățită pentru detectarea grupurilor:

Trebuie să scanăm header-ul de la dreapta la stânga pentru a găsi corect grupurile, deoarece:
- "Solduri finale" este la dreapta (coloanele 8-9)
- "Total sume" este la stânga (coloanele 6-7)
- "Rulaje perioadă" este și mai la stânga (coloanele 4-5)

**Alternativă mai robustă:**

```typescript
// Detectăm poziția exactă a fiecărui grup prin scanare completă
for (let j = 0; j < mainHeader.length; j++) {
  const cell = String(mainHeader[j]).toLowerCase().trim();
  
  if (cell.includes('solduri finale') || cell.includes('sold final')) {
    soldFinalStartCol = j;
    // Debit și Credit sunt fix la j și j+1 în subheader
    soldFinalDebitCol = j;
    soldFinalCreditCol = j + 1;
  }
  
  if ((cell.includes('total') && cell.includes('sume')) || cell.includes('total sume')) {
    totalSumeStartCol = j;
    totalSumeDebitCol = j;
    totalSumeCreditCol = j + 1;
  }
}
```

---

## FIȘIERE AFECTATE

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/analyze-balance/index.ts` | Corecție funcție `detectHeaderIndices()` linii 410-425 |

---

## REZULTAT AȘTEPTAT DUPĂ CORECȚIE

```
📊 [HEADER-DETECT-UNIFIED] REZULTAT: {
  headerRow: 5,
  soldFinalD: 8,   ← CORECT
  soldFinalC: 9,   ← CORECTAT (era 7)
  totalSumeD: 6,   ← CORECT
  totalSumeC: 7    ← CORECTAT (era 5)
}
```

### Verificare cifre CESPUY:

| Indicator | Înainte (greșit) | După (corect) |
|-----------|------------------|---------------|
| Total Venituri (Clasa 7) | 23,281.87 | 183,010.18 |
| SF Debitor Total | 1,883,548.38 | 111,404.72 |
| SF Creditor Total | 111,404.72 | 111,404.72 |
| Echilibru SF | ❌ Dezechilibrat | ✅ Echilibrat |

---

## PAȘI IMPLEMENTARE

1. **Modificare logică detecție** - Schimbare interval căutare de la `+4` la `+2` pentru fiecare grup
2. **Validare ordinea coloanelor** - Verificare că Debit vine înainte de Credit în fiecare grup
3. **Deploy edge function** - `analyze-balance`
4. **Test balanță CESPUY** - Reîncărcare și verificare cifre corecte

---

## ESTIMARE EFORT

| Task | Timp |
|------|------|
| Modificare `detectHeaderIndices()` | ~10 min |
| Deploy edge function | ~5 min |
| Testare CESPUY | ~10 min |
| **TOTAL** | **~25 min** |

