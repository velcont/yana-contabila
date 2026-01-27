
# Plan: Actualizare YANA pentru Declarația Unică D212 2026

## Obiectiv
Pregătirea YANA să răspundă corect și complet la întrebări despre Declarația Unică 2026, astfel încât utilizatorii din comentariile video-ului tău să primească informații corecte și actualizate.

---

## Modificări Propuse

### 1. Adăugare keyword "d212" în ai-router

**Fișier:** `supabase/functions/ai-router/index.ts`  
**Locație:** Linia ~290, în blocul de detecție fiscală

Se adaugă `lowerMessage.includes('d212')` în lista de keywords care declanșează rutarea către `fiscal-chat`.

### 2. Adăugare secțiune completă D212 în fiscal-chat

**Fișier:** `supabase/functions/fiscal-chat/index.ts`  
**Locație:** După linia 138 (după termene critice), înainte de "REGULI DE CĂUTARE"

Se adaugă o secțiune nouă de aproximativ 80-100 linii care acoperă:

| Subiect | Detalii |
|---------|---------|
| **Deadline critic** | 25 MAI 2026, depunere online obligatorie |
| **Cine depune** | PFA, chirii, dividende, investiții, crypto, venituri din străinătate |
| **Structura D212** | Secțiunile I-V explicate clar |
| **CAS vs CASS pentru PFA** | 25% CAS pensie + 10% CASS sănătate |
| **Venituri din investiții** | Dividende RO/străinătate, acțiuni, ETF-uri, crypto |
| **Norme de venit vs Real** | Când e avantajos fiecare sistem |
| **Greșeli frecvente** | Top 5 erori de evitat |

### 3. Sincronizare prompt markdown

**Fișier:** `supabase/functions/_shared/prompts/fiscal-chat-prompt.md`

Se adaugă aceleași informații pentru consistență cu fișierul inline.

---

## Detalii Tehnice

### Modificare 1: ai-router/index.ts

```text
Linia ~290, adaug în blocul de detecție fiscală:
lowerMessage.includes('d212') ||
```

Aceasta asigură că utilizatorii care scriu "D212" sau "d212" sunt direcționați automat către modulul fiscal, nu către chat-ul general.

### Modificare 2: fiscal-chat/index.ts - Conținut adăugat

```text
## DECLARAȚIA UNICĂ D212 - GHID COMPLET 2026

### DEADLINE CRITIC
- **25 MAI 2026** - termen depunere ȘI plată
- Depunere ONLINE obligatorie prin SPV (nu pe hârtie!)
- Rectificativă: se poate depune până la prescripție (5 ani)

### CINE DEPUNE D212?
Persoane fizice cu venituri din 2025:
1. Activități independente (PFA, II, IF)
2. Drepturi de proprietate intelectuală
3. Chirii (cedarea folosinței bunurilor)
4. Investiții (dividende, dobânzi, câștiguri de capital)
5. Alte surse (crypto, NFT-uri)
6. Venituri din străinătate

### STRUCTURA D212

| Secțiune | Ce se completează |
|----------|------------------|
| I | Date identificare |
| II | Venituri estimate 2026 (CAS, CASS) |
| III | Venituri realizate 2025 (impozit) |
| IV | Destinația 3,5% (ONG/cult) |
| V | Anexe specifice pe tipuri venit |

### CONTRIBUȚII OBLIGATORII 2026

**Pentru PFA/II/IF:**
- CAS (pensie): 25% - obligatoriu dacă venit net > 24.300 lei/an
- CASS (sănătate): 10% - obligatoriu dacă venit net > 6 salarii minime
- SE CUMULEAZĂ (nu una sau alta!)

**Pentru dividende și investiții:**
- CASS 10% (conform tabelului existent)
- NU se plătește CAS

### VENITURI DIN INVESTIȚII - DETALII

**Dividende din România:**
- Impozit 16% reținut la sursă
- CASS se declară separat în D212

**Dividende din străinătate:**
- Se declară în D212 integral
- Credit fiscal pentru impozit plătit în țara sursă
- CASS pe venitul brut

**Câștiguri acțiuni/ETF-uri:**
- Impozit 10% pe câștig net (vânzare - achiziție - comisioane)
- NU se plătește CASS pe câștiguri de capital

**Crypto și active digitale:**
- Impozit 10% pe câștig net realizat
- NU există franciză - orice câștig se declară
- Dovadă achiziție: extrase exchange, istoric tranzacții

### NORME DE VENIT vs SISTEM REAL (PFA)

| Criteriu | Norme de venit | Sistem real |
|----------|---------------|-------------|
| Impozit | Fix, pe baza normei ANAF | 10% din venitul NET |
| Cheltuieli | NU se deduc | DA, se deduc |
| Contabilitate | Simplificată | Necesară |
| Avantaj | Venituri mari, cheltuieli mici | Cheltuieli mari |

### GREȘELI FRECVENTE DE EVITAT

1. Uitarea veniturilor din străinătate
2. Nedeclararea dividendelor (chiar dacă impozitul e reținut)
3. Confuzia CAS vs CASS pentru PFA
4. Estimări nerealiste pentru anul curent
5. Plata după 25 mai (penalități 0,01%/zi + dobânzi)
```

---

## Fișiere de Modificat

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/ai-router/index.ts` | Adaug keyword "d212" (1 linie) |
| `supabase/functions/fiscal-chat/index.ts` | Adaug secțiune D212 (~80 linii) |
| `supabase/functions/_shared/prompts/fiscal-chat-prompt.md` | Sincronizez informațiile D212 |

---

## Testare Post-Implementare

După implementare, vom testa cu întrebări tipice din comentarii YouTube:

1. "Cum completez D212 pentru dividende?"
2. "Am venituri din acțiuni pe Trading 212, ce declar?"
3. "Sunt PFA, plătesc CAS sau CASS?"
4. "Am primit dividende de la o firmă din SUA, ce fac?"
5. "Când e termenul pentru declarația unică?"
6. "Am crypto, trebuie să declar?"
7. "Ce e diferența între norma de venit și sistemul real?"

---

## Riscuri și Mitigări

| Risc | Nivel | Mitigare |
|------|-------|----------|
| Keyword "d212" nu se detectează | Scăzut | Test direct după deploy |
| Informații fiscale incorecte | Mediu | Bazat pe surse oficiale ANAF |
| Prompt prea lung | Scăzut | Adăugăm ~80 linii la un prompt de ~200 |

---

## Estimare Timp Implementare

| Task | Timp |
|------|------|
| Modificare ai-router (keyword d212) | 2 min |
| Actualizare fiscal-chat/index.ts | 10 min |
| Sincronizare fiscal-chat-prompt.md | 5 min |
| Deploy edge functions | 2 min |
| Testare cu întrebări reale | 10 min |
| **Total** | **~30 min** |

---

## Rezultat Final

YANA va putea răspunde cu încredere la orice întrebare despre Declarația Unică 2026:
- Structura formularului D212 cu secțiunile I-V
- Diferența CAS vs CASS pentru PFA
- Venituri din investiții (dividende, acțiuni, crypto)
- Termene și penalități
- Norme de venit vs sistem real

Utilizatorii din comentariile video-ului vor primi răspunsuri complete și corecte.
