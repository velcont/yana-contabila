
Obiectivul tău este corect: „Total Venituri (clasa 7)” trebuie să vină din coloana **Total sume – Creditoare** (≈ 183.010,18), nu din „Rulaje perioadă – Credit” (≈ 23.281,87).

Din ce ai lipit acum, se văd două lucruri simultan:
1) În zona de alertă de validare, sistemul deja afișează corect **183.010,18 RON** (deci parserul de coloane pentru clasa 7 pare reparat).
2) În alte pasaje din text, AI-ul încă „se agață” de valori de tip 23k (sau produce calcule paralele), pentru că el primește întregul text exportat din Excel și poate interpreta greșit ce înseamnă „anual / perioadă / total sume”.

Cauza principală rămasă: chiar dacă noi extragem determinist coloanele corecte în cod, **modelul AI nu primește explicit aceste valori determinate** ca „sursă de adevăr”, ci își face calculele citind „balanceText” (care conține și coloane de rulaje perioadă). De aici apar inconsecvențe în raport (ex: Snapshot Strategic cu 166k, validare cu 183k etc.).

Mai există și o problemă tehnică secundară: în `analyze-balance/index.ts` cacheKey-ul NU include `PARSER_VERSION`, deci „invalidare cache pe versiune” nu este complet implementată (în practică, forțarea re-procesării la upload te salvează, dar cerința ta rămâne neacoperită 100%).

────────────────────────────────────────────────────────────

Schimbările pe care le voi implementa (în ordine):

1) Fixare definitivă a sursei pentru „Total clasa 7 / Total clasa 6” în output (anti-confuzie)
   - Construiesc un „Deterministic Facts Block” din valorile deja calculate în cod:
     - Total Venituri clasa 7 (din structuredData: totalSumeCreditCol)
     - Total Cheltuieli clasa 6 (din structuredData: totalSumeDebitCol)
     - Sold cont 121 (din finalDebit/finalCredit)
     - Indicii de coloană detectați (TS_C, TS_D, SF_C, SF_D) + versiune parser
   - Injectez acest block în promptul trimis către AI (în mesajul user sau ca append la system prompt), cu o regulă explicită:
     „Dacă primești DATE DETERMINISTE, le folosești obligatoriu și ignori orice altă valoare contradictorie din textul balanței.”

   Impact: AI nu mai are voie să aleagă 23k ca „Total Venituri” și nu mai generează calcule paralele pe „rulaje perioadă”.

2) Clarificare prompt (Single Source of Truth) ca să nu mai inducă ambiguitate „rulaje anuale”
   - În `supabase/functions/_shared/full-analysis-prompt.ts`, corectez formulările care pot împinge AI-ul spre „rulaje perioadă”.
   - Exemple de clarificări:
     - La „Calculare Cifră de Afaceri”: voi spune explicit „Total sume Creditoare (nu Rulaje perioadă)”.
     - La verificarea 2.3 și Profit vs Cash: voi forța referința la „Total Sume” pentru clasele 6/7.
   - Mențin principiul „unica sursă de adevăr” (nu introduc prompt alternativ), doar elimin ambiguități din promptul unic.

3) Validare NEconcordanță (păstrează alertă, dar nu mai pare bug de coloană)
   - În `supabase/functions/analyze-balance/index.ts`, în secțiunea unde se construiește mesajul „⚠️ NECONCORDANȚĂ REZULTAT FINANCIAR”, voi:
     - Atașa explicit „Sursa: Total sume (TS)” ca să fie clar că nu e din rulaje perioadă.
     - Adăuga o explicație neutră, fără speculații, conform regulilor: 
       „Diferența necesită verificare; posibile cauze: rezultat reportat (117), închideri parțiale, conturi de regularizare etc.”
     - Opțional (dacă există date suficiente în balanță), voi calcula și afișa un mini-reconciliere deterministă (ex: dacă găsim 1171 sau sold inițial 121), ca să arate clar de unde poate proveni diferența.

   Notă: Nu voi „ascunde” alerta prin toleranțe mari implicit; integritatea datelor rămâne critică. Doar o voi face mai corectă semantic și mai ușor de înțeles (nu „încă citești greșit coloana”).

4) Cache: versiune în cheie (conform deciziei tale)
   - În `supabase/functions/analyze-balance/index.ts`, modific `cacheKey` să includă `PARSER_VERSION`, de exemplu:
     - `balance_v${PARSER_VERSION}_...`
   - Astfel, orice fix de parser invalidează automat cache-ul istoric.
   - Păstrez și ștergerea cache-ului când `forceReprocess=true`.

5) Verificare end-to-end cu fișierul tău CESPUY
   - Re-upload același `.xls`.
   - Confirm în output (în raport) că:
     - „Total Venituri (clasa 7)” = 183.010,18 (și nu apare ca „Total” valoarea 23.281,87 nicăieri)
     - În Snapshot Strategic, CA este consistentă cu totalul determinist (nu 166k dacă totalul determinist e 183k)
     - Alerta de neconcordanță (dacă rămâne) se referă explicit la Total Sume și are explicație neutră „necesită verificare”
   - Confirm în logs că indices sunt TS_C corect (ex: col H) și că block-ul determinist a fost inclus în prompt.

────────────────────────────────────────────────────────────

Fișiere vizate
- `supabase/functions/analyze-balance/index.ts`
  - Injectare „Deterministic Facts Block” în promptul trimis către AI
  - Cache key cu `PARSER_VERSION`
  - Îmbunătățire mesaj validare „NECONCORDANȚĂ” (claritate + sursă)
- `supabase/functions/_shared/full-analysis-prompt.ts`
  - Clarificări explicite: clasele 6-7 folosesc „Total sume”, nu „rulaje perioadă”
  - Eliminare ambiguitate „rulaje anuale” (formulare)

(Optionally) `supabase/functions/ai-router/index.ts`
- Doar verificare că `forceReprocess: true` se trimite pe upload; din ce știm, deja e implementat, dar voi valida consistența.

────────────────────────────────────────────────────────────

Riscuri / edge cases anticipate
- Exporturi care au doar o singură pereche Debit/Credit (balanțe simplificate): fallback-ul actual există, dar voi păstra și voi loga clar.
- Fișiere unde subheader-ul nu are „Debit/Credit” textual (ex: D/C): logica deja acceptă `d`/`c`; voi menține.
- Pentru prompt: trebuie formulat clar, altfel modelul poate ignora blocul determinist; voi pune regula explicită în primele linii ale mesajului către AI.

────────────────────────────────────────────────────────────

Criterii de „gata”
- Niciun loc din raport nu mai numește 23.281,87 drept „Total Venituri (clasa 7)”.
- CA/cheltuieli/profit din secțiunea „=== INDICATORI FINANCIARI ===” sunt consistente cu determinist_metadata.
- Cache invalidat automat la schimbare de parser (cheie conține versiunea).
