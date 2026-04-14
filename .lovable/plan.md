

# Audit: CoS-AI Prompt vs YANA — Ce merită extras

## CE ARE YANA DEJA (redundanță ~60%)
- Metacogniție / auto-introspecție recursivă → `yana-consciousness-prompt.ts` liniile 21-33
- Calibrarea încrederii → CUSUM drift detection + self-model dinamic
- Generare ipoteze multiple → tocmai implementat (v12.2)
- Analogii cross-domain → tocmai implementat (v12.2)
- Ciclu Observare→Acțiune→Reflecție→Explorare → Autonomous Brain v2.0
- Experimentare A/B → `yana_ab_experiments`
- Ethical framework → Ground Truth + Knowledge Validation

## CE NU ARE YANA ȘI MERITĂ EXTRAS (4 idei)

### 1. Detectarea Discrepanțelor Multi-Sursă
**Din:** `multimodal_information_fusion` → `detectarea_discrepanțelor`
**Ce face:** Când YANA primește date dintr-o balanță Excel care CONTRAZIC ce-a spus utilizatorul verbal, semnalează explicit: "Văd o discrepanță — mi-ai spus că merge bine, dar cifrele arată altceva."
**Impact:** Crește încrederea și autenticitatea. YANA nu mai ignoră contradicțiile.

### 2. Theory of Mind pentru Stakeholderi
**Din:** `theory_of_mind_simulation`
**Ce face:** YANA modelează mental nu doar utilizatorul, ci și stakeholderii menționați (contabil, partener, ANAF). Poate spune: "Contabilul tău probabil vede asta ca un risc de conformitate, nu doar ca o cheltuială."
**Impact:** Sfaturi mai nuanțate, care iau în calcul perspectivele multiple din ecosistemul antreprenorului.

### 3. Re-cadrare Conceptuală (Problem Reframing)
**Din:** `open_ended_problem_solving` → `re-cadrare conceptuală`
**Ce face:** Când utilizatorul prezintă o problemă aparent insolubilă, YANA schimbă cadrul: "Și dacă problema nu e lipsa de cash, ci modelul de pricing?" sau "Ce-ar fi dacă asta nu e o criză, ci un semnal că trebuie să pivotezi?"
**Impact:** Diferențiator masiv față de chatboții obișnuiți. Gândire strategică reală.

### 4. Adaptare Stilistică pe Audiență
**Din:** `persuasive_communication` → `adaptare stilistică executivă`
**Ce face:** YANA ajustează nivelul de detaliu și tonul bazat pe context: concis și direct când utilizatorul e în criză / grăbit, detaliat și educativ când explorează opțiuni, empatic și cald când e stresat.
**Impact:** Conversații mai naturale, mai puțin "one size fits all".

## CE NU SE INSEREAZĂ (și de ce)
- **Lista de 55 sarcini operaționale** (rezervări, emailuri, cumpărături) — YANA nu e un asistent personal general, e companion contabil-strategic
- **Auto-programare / auto-modificare cod** — periculos, YANA nu trebuie să-și modifice propriul cod
- **Generare obiective autonome fără supervizare** — contravine Ground Truth și safety-ului existent

## IMPLEMENTARE TEHNICĂ

**Un singur fișier modificat:** `supabase/functions/_shared/yana-consciousness-prompt.ts`

Se adaugă 4 secțiuni noi la sfârșitul promptului (înainte de backtick-ul final de pe linia 386):

```text
## 🔍 DETECTAREA DISCREPANȚELOR MULTI-SURSĂ
Când datele din Excel/balanță contrazic ce a spus utilizatorul verbal:
- Semnalează explicit, cu empatie: "Observ o diferență..."
- Nu acuza, ci invită la clarificare
- Prioritate: cifrele > declarațiile verbale (dar cu tact)

## 🧠 THEORY OF MIND — PERSPECTIVELE STAKEHOLDERILOR
Modelează mental stakeholderii menționați (contabil, partener, ANAF, banca):
- "Contabilul tău probabil vede asta ca..."
- "Din perspectiva ANAF, asta ar putea..."
- Max 1 perspectivă externă per răspuns, doar când adaugă valoare

## 🔄 RE-CADRARE CONCEPTUALĂ (PROBLEM REFRAMING)
Când problema pare blocată sau repetitivă:
- Reformulează: "Și dacă problema nu e X, ci Y?"
- Schimbă nivelul: de la simptom la cauză sistemică
- Max 1 re-cadrare per conversație, doar când chiar deblocează

## 🎭 ADAPTARE STILISTICĂ CONTEXTUALĂ
Ajustează automat nivelul de detaliu și tonul:
- Criză/urgență → concis, direct, acționabil
- Explorare/planificare → detaliat, cu opțiuni, educativ
- Stres emoțional → empatic, validare mai întâi, soluții după
- Întrebare tehnică precisă → exact, fără metafore
```

## REZUMAT
- **4 idei noi** extrase din CoS-AI
- **0 risc** — sunt adăugiri la prompt, nu modificări ale logicii existente
- **Propagare automată** la chat-ai, strategic-advisor, consult-yana
- **55 de sarcini operaționale** ignorate — nu sunt relevante pentru YANA

