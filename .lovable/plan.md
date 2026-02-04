

# PLAN DE REMEDIERE - SINCRONIZARE COMPLETĂ PROMPT ANALIZĂ BALANȚĂ

## 🔴 PROBLEMA CRITICĂ IDENTIFICATĂ

Există **DOUĂ COPII DIFERITE** ale promptului care nu conțin secțiunile obligatorii din originalul furnizat:

| Locație | Status |
|---------|--------|
| `analyze-balance/index.ts` (linii 40-429) | ❌ SYSTEM_PROMPT inline - NU folosește fișierul partajat |
| `_shared/full-analysis-prompt.ts` | ⚠️ Incomplet - lipsesc secțiunile 6-9 |

---

## CE LIPSEȘTE FAȚĂ DE PROMPT-UL ORIGINAL

### 1. Precizarea "UNICĂ SURSĂ DE ADEVĂR" (LIPSEȘTE COMPLET)
```
ACEST PROMPT ESTE UNICA SURSĂ DE ADEVĂR PENTRU ANALIZA BALANȚEI CONTABILE
- Oriunde în aplicație se face analiza balanței
- Indiferent de interfață sau context
- Nu se acceptă variante simplificate, alternative sau override-uri
```

### 2. Secțiunea 6) ANOMALII & ALERTE (LIPSEȘTE)
```
- Solduri atipice: 474, 461, 462, 409, 419, 542, 581
- Sold casă > 50.000 RON
- Solduri anormale 4426/4427
- Conturi clasa 6/7 cu solduri finale
```

### 3. Secțiunea 7) VERIFICARE CA și PLAFOANE FISCALE (LIPSEȘTE)
```
Plafoane Microîntreprinderi:
- Până la 31.12.2025: 250.000 EUR
- De la 01.01.2026: 100.000 EUR
- Cote: 1% (până 60k EUR), 3% (60k-250k EUR)

Plafon TVA:
- Până la 31.08.2025: 300.000 RON
- De la 01.09.2025: 395.000 RON
```

### 4. Secțiunea 8) VERIFICARE ACTIV NET (LIPSEȘTE)
```
Analizează dacă activul net a scăzut sub jumătate din capitalul social
- Activ net curent: [___]
- 50% Capital social: [___]
- Implicații legale și măsuri necesare
```

### 5. Secțiunea 9) REZUMAT EXECUTIV (LIPSEȘTE)
```
Top Constatări (3 puncte)
Plan Prioritizat (max 12 puncte):
| Prioritate | Acțiune | Responsabil | Termen | Impact Estimat |
```

---

## SOLUȚIE TEHNICĂ

### Pas 1: Înlocuire completă `_shared/full-analysis-prompt.ts`

Voi înlocui ÎNTREGUL conținut cu prompt-ul original furnizat de tine, incluzând:

**Structura finală (exact conform originalului tău):**

```text
## PRECIZARE CRITICĂ - UNICĂ SURSĂ DE ADEVĂR
## REGULI FUNDAMENTALE DE INTERPRETARE
   1. REGULI DE CLASIFICARE ȘI ANALIZĂ (clase 1-5 vs 6-7)
   2. POZIȚIONARE NORMALĂ CONTURI CHEIE
   3. PRINCIPII DE INTERPRETARE OBIECTIVĂ
## PROCES DE ANALIZĂ - STRUCTURĂ RAPORT
   0) METADATE
   1) SNAPSHOT STRATEGIC (CA, Indicatori Cheie)
   2) ANALIZA CONTURILOR CHEIE (2.1-2.7)
   3) CONFORMITATE TVA & IMPOZITE
   4) PROFIT vs CASH (BRIDGE)
   5) INDICATORI-CHEIE (DSO, DPO, DIO, Marjă, Lichiditate)
   6) ANOMALII & ALERTE (474, 461, 462, 409, 419, 542, 581, casă > 50k)
   7) VERIFICARE CA - PLAFOANE FISCALE 2025-2026
   8) VERIFICARE ACTIV NET vs Capital Social
   9) REZUMAT EXECUTIV & PLAN DE ACȚIUNE (max 12 puncte)
## FORMAT RĂSPUNS
## INDICATORI FINANCIARI STRUCTURAȚI (pentru parsare automată)
```

### Pas 2: Modificare `analyze-balance/index.ts`

Înlocuire SYSTEM_PROMPT inline cu import din fișierul partajat:

```typescript
// ÎNAINTE (linii 40-429):
const SYSTEM_PROMPT = `Analizeaza balanta atasata...`;

// DUPĂ:
import { getFullAnalysisPrompt } from "../_shared/full-analysis-prompt.ts";
const SYSTEM_PROMPT = getFullAnalysisPrompt();
```

**Beneficii:**
- O singură sursă de adevăr pentru toate funcțiile
- Orice modificare ulterioară se face într-un singur loc
- Consistență perfectă între `analyze-balance` și `chat-ai`

### Pas 3: Deploy edge functions

Ambele funcții vor fi redeployate:
- `analyze-balance` - funcția principală de analiză
- `chat-ai` - deja importă din fișierul partajat

---

## DETALII TEHNICE

### Fișiere afectate:

| Fișier | Acțiune |
|--------|---------|
| `supabase/functions/_shared/full-analysis-prompt.ts` | ÎNLOCUIRE COMPLETĂ cu prompt-ul original |
| `supabase/functions/analyze-balance/index.ts` | ȘTERGERE SYSTEM_PROMPT inline, ADĂUGARE import |

### Secțiunile noi adăugate:

**Secțiunea 6 - Anomalii & Alerte:**
- Solduri atipice (474, 461, 462, 409, 419, 542, 581)
- Sold casă > 50.000 cu riscuri fiscale
- Solduri anormale 4426/4427
- Conturi 6/7 cu solduri finale

**Secțiunea 7 - Plafoane Fiscale:**
- Micro până la 31.12.2025: 250.000 EUR
- Micro de la 01.01.2026: 100.000 EUR
- TVA până la 31.08.2025: 300.000 RON
- TVA de la 01.09.2025: 395.000 RON

**Secțiunea 8 - Activ Net:**
- Verificare dacă activul net < 50% din capital social
- Implicații legale conform Legii 31/1990

**Secțiunea 9 - Rezumat Executiv:**
- Top 3 constatări critice
- Plan prioritizat cu max 12 puncte (Acțiune, Responsabil, Termen, Impact)

---

## ESTIMARE EFORT

| Task | Timp |
|------|------|
| Înlocuire completă `full-analysis-prompt.ts` | ~20 min |
| Modificare `analyze-balance/index.ts` (import) | ~5 min |
| Deploy edge functions | ~5 min |
| Testare cu balanța VELCONT | ~10 min |
| **TOTAL** | **~40 min** |

---

## REZULTAT AȘTEPTAT

După implementare, YANA va genera analize care:

1. ✅ Respectă **EXACT** structura din prompt-ul original (secțiunile 0-9)
2. ✅ Include secțiunea **ANOMALII & ALERTE** pentru conturile 474, 461, 462, 409, 419, 542, 581
3. ✅ Verifică **sold casă > 50.000** ca risc fiscal
4. ✅ Verifică **plafoanele fiscale 2025-2026** (micro 100k EUR, TVA 395k RON)
5. ✅ Include **REZUMAT EXECUTIV** cu max 12 puncte acționabile
6. ✅ Verifică **Activ Net vs 50% Capital Social**
7. ✅ Format **text narativ** (fără markdown excesiv)
8. ✅ Menține secțiunea **INDICATORI FINANCIARI** structurați la sfârșit (pentru parsare automată)

---

## PRECIZARE CRITICĂ

După implementare, acest prompt va fi **UNICA SURSĂ DE ADEVĂR** pentru:
- Upload balanță în analyze-balance
- Chat AI cu context balanță
- Orice altă funcționalitate de analiză balanță

**NU se vor mai accepta:**
- ❌ Variante simplificate
- ❌ Prompturi alternative
- ❌ Override-uri sau excepții
- ❌ Prompturi "optimizate"

