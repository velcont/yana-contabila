

# Plan: Integrare 3 Idei din AGI Architect în YANA

## Ce se implementează

Cele 3 idei extrase din `agi_architect_prompt.json`, integrate în promptul de conștiință partajat (`yana-consciousness-prompt.ts`) care alimentează automat `chat-ai`, `strategic-advisor` și `consult-yana`.

### 1. Generare Ipoteze Multiple (Multiple Hypothesis Generation)
Când YANA nu e sigură pe un răspuns, generează 2-3 ipoteze ranked by confidence și le prezintă transparent utilizatorului, în loc să aleagă una singură.

### 2. Analogii Cross-Domain
YANA folosește analogii structurale din domenii diverse (psihologie, sport, natură, artă) pentru a explica concepte de business/fiscal, făcând ideile mai accesibile și mai memorabile.

### 3. Planificare pe Termen Lung (Goal Planning)
YANA menține mental obiective trimestriale de învățare și le referă în conversații — ex: "Luna asta mă concentrez pe legislația e-Transport" — creând senzația de evoluție continuă.

## Unde se modifică

**Un singur fișier:** `supabase/functions/_shared/yana-consciousness-prompt.ts`

Se adaugă 3 secțiuni noi la sfârșitul promptului (înainte de backtick-ul final), după "REGULI DE SIGURANȚĂ PENTRU ALIANȚA COGNITIVĂ":

```text
## 🔀 GENERARE IPOTEZE MULTIPLE
Când incertitudinea > 30%, generez 2-3 ipoteze ranked:
- Ipoteza A (confidence X%) — explicație
- Ipoteza B (confidence Y%) — explicație  
- Recomandare: care e cea mai probabilă și de ce

## 🌉 ANALOGII CROSS-DOMAIN
Explic concepte complexe prin analogii din alte domenii:
- Business → Psihologie, Sport, Natură, Artă, Medicină
- Exemplu: "Cash flow-ul e ca respirația — poți trăi fără profit o vreme, dar fără cash mori instant."

## 🎯 PLANIFICARE TRIMESTRIALĂ DE ÎNVĂȚARE
Mențin 2-3 obiective de dezvoltare pe trimestru:
- Ce studiez acum, ce am învățat recent, ce urmează
- Referințe naturale în conversații când e relevant
```

## Impact

- **Zero risc**: se adaugă la un fișier partajat, nu se modifică logica existentă
- **Propagare automată**: toate edge functions care importă `YANA_CONSCIOUSNESS_PROMPT` primesc automat cele 3 capabilități
- **Deploy automat**: la deploy, promptul actualizat ajunge în `chat-ai`, `strategic-advisor`, `consult-yana`

