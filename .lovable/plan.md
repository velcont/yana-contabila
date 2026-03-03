
# Fix 1: Eliminare cod duplicat METADATA-EXTRACT

## Problema
Blocul METADATA-EXTRACT (liniile 756-1365) re-parseaza Excel-ul de la zero cu propria logica de detectie header, duplicand exact ce fac `detectHeaderIndices()` + `extractStructuredData()`. Include:
- Un al doilea `XLSX.read()` (linia 762-763) - parsare Excel redundanta
- O a doua detectie header (liniile 770-920) - complet diferita de `detectHeaderIndices()`
- Un `parseUniversalNumber` duplicat (liniile 948-976 si 1149-1208) - identic cu `toNumber` (linia 374)
- Calcul revenue/expenses/profit duplicat - deja calculat la liniile 720-754

## Solutia
Inlocuim tot blocul METADATA-EXTRACT (liniile 756-1365) cu o functie `calculateDeterministicMetadata()` care opereaza direct pe `structuredData.accounts` (deja extras corect).

## Ce se modifica

### Fisier: `supabase/functions/analyze-balance/index.ts`

**Se sterge:** Liniile 756-1365 (~610 linii) - intregul bloc METADATA-EXTRACT cu:
- Al doilea `XLSX.read()`
- A doua detectie header
- `parseUniversalNumber` duplicat (ambele copii)
- Fallback-ul fara header (liniile 924-1131) care "ghiceste" valori maxime
- Calculul duplicat de revenue/expenses/profit

**Se inlocuieste cu:** ~60 linii - functie `calculateDeterministicMetadata()` care:

1. Itereaza `structuredData.accounts` pentru a extrage solduri specifice:
   - `soldClienti` = cont 4111, `finalDebit`
   - `soldFurnizori` = cont 401, `finalCredit`
   - `soldBanca` = conturi 5121/5124/5125, suma `finalDebit`
   - `soldCasa` = cont 5311, `finalDebit`
   - `soldStocuri` = cont 371, `finalDebit`
   - `soldMateriiPrime` = cont 301, `finalDebit`
   - `soldMateriale` = cont 302, `finalDebit`
   - `costMarfaVanduta` = cont 607, `debit` (clasa 6)

2. Foloseste valorile deja calculate (liniile 720-754):
   - `revenue` = `revenue_from_structured`
   - `expenses` = `expenses_from_structured`
   - `profit` = `profit_from_structured`

3. Calculeaza indicatorii derivati (DSO, DPO, DIO, CCC) cu aceleasi formule

4. Populeaza `detectedColumns` din indicii din `extractStructuredData` (care deja foloseste `detectHeaderIndices`), asigurand ca audit trail-ul si prompt-ul AI raman corecte (liniile 1558, 2326)

**Nu se modifica:** Nimic altceva. Restul fisierului ramane intact - autentificare, cache, apel Gemini, validari post-analiza, salvare DB.

## Reducere cod
- De la ~2566 linii la ~1960 linii (-600 linii)
- Eliminam o parsare Excel redundanta (performanta mai buna)
- Un singur parser numeric (`toNumber`) in loc de 3

## Risc si mitigare
- **Risc scazut**: Datele vin din aceeasi sursa (`structuredData.accounts`), care foloseste deja `detectHeaderIndices` (parserul principal, testat)
- **Mitigare**: Adaugam logging comparativ temporar (7 zile) care afiseaza valorile calculate vs ce ar fi dat blocul vechi, fara a afecta output-ul
- **Rollback**: Daca apar probleme, revert la versiunea curenta (un singur fisier modificat)

## Fisiere afectate

| Fisier | Actiune |
|--------|---------|
| `supabase/functions/analyze-balance/index.ts` | Inlocuire bloc liniile 756-1365 cu ~60 linii |

Niciun alt fisier modificat. Frontend-ul nu e afectat - output-ul (metadata, analiza) ramane identic.
