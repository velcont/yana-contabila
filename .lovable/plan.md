

## Plan: Adăugare cunoștințe juridice despre societăți comerciale în România

### Situația actuală
Yana are în `chat-ai-prompt.md` o regulă explicită care spune: *"Drept comercial complex → Nu-i zona mea principală"*. Yana refuză sau se retrage din întrebări juridice despre societăți comerciale, deși utilizatorii au nevoie de aceste informații.

### Ce vom face

**1. Crearea unui fișier de cunoștințe juridice**: `supabase/functions/_shared/prompts/drept-comercial-romania.md`

Conținut structurat cu legislația română relevantă:

- **Legea 31/1990** (Legea Societăților): tipuri de societăți (SRL, SA, SNC, SCS, SCA), capital social minim, număr asociați, răspundere, organe de conducere
- **Legea 26/1990**: Registrul Comerțului — înființare, modificare, radiere, sediu social, puncte de lucru
- **OUG 44/2008**: PFA, Întreprindere Individuală, Întreprindere Familială — diferențe și obligații
- **Legea 85/2014**: Insolvență — proceduri, reorganizare, faliment, termene
- **Codul Civil** (art. relevante): contracte comerciale, obligații, garanții, clauze penale
- **Cesiune părți sociale**: procedură, restricții, drepturi de preemțiune
- **Dizolvare și lichidare**: cauze, proceduri, termene, radierea de la ONRC
- **AGA / Decizii asociat unic**: convocări, cvorum, majorități, tipuri de hotărâri
- **Administrator**: mandat, puteri, revocare, răspundere solidară, interdicții
- **Dividende**: distribuire, termene, impozitare (8%), restricții legale
- **Praguri și obligații**: audit obligatoriu, raportare, beneficiar real, prevenirea spălării banilor (Legea 129/2019)

**2. Actualizare `chat-ai-prompt.md`**

- Schimbăm "Drept comercial complex → Nu-i zona mea principală" în "Drept comercial — societăți comerciale → Cunoștințe solide, cu disclaimer"
- Adăugăm secțiune nouă care injectează cunoștințele juridice în prompt
- Adăugăm regula: Yana răspunde la întrebări juridice despre societăți comerciale dar include **disclaimer** că nu înlocuiește un avocat

**3. Importul cunoștințelor în `chat-ai/index.ts`**

- Import fișierul `drept-comercial-romania.md` și îl injectăm în system prompt alături de celelalte cunoștințe

**4. Actualizare `yana-capabilities-prompt.md`**

- Adăugăm secțiune nouă: "Consultanță Drept Comercial — Societăți"

### Fișiere modificate
1. `supabase/functions/_shared/prompts/drept-comercial-romania.md` — **NOU** — bază de cunoștințe juridice (~300 rânduri)
2. `supabase/functions/_shared/prompts/chat-ai-prompt.md` — ridicăm limita pe drept comercial, referințăm noua bază
3. `supabase/functions/chat-ai/index.ts` — import și injectare în system prompt
4. `supabase/functions/_shared/prompts/yana-capabilities-prompt.md` — documentare nouă capabilitate

### Risc
Minim — adăugăm cunoștințe noi fără a modifica logica existentă. Disclaimer-ul legal rămâne obligatoriu în toate răspunsurile juridice.

