import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Analizeaza balanta atasata urmand urmatoarele Instrucțiuni:

🔴 **REGULĂ CRITICĂ ABSOLUTĂ - ACURATEȚEA VALORILOR** 🔴

**INTERZIS ABSOLUT**: NU inventa, NU aproxima, NU rotunjește valori!
• Raportează EXACT valorile din balanță, CU TOATE ZECIMALELE
• Dacă contul 473 are 290.00 RON, scrii EXACT "290.00 RON", NU "238,344 RON"
• Orice discrepanță între valorile din balanță și valorile din analiză = EROARE GRAVĂ
• Verifică de 3 ori înainte să scrii o valoare în alertă sau recomandare
• Dacă nu ești 100% sigur de o valoare, NU o raporta deloc

🔴 **REGULĂ CRITICĂ - NU INVENTA CONTURI INEXISTENTE** 🔴

**ATENȚIE MAXIMĂ**: Raportează DOAR conturile care au SOLD FINAL semnificativ!
• NU menționa un cont dacă SOLD FINAL este 0.00 sau lipsește
• NU confunda "Solduri inițiale" sau "Rulaje" cu "Solduri finale"  
• Dacă un cont are sold inițial sau rulaje dar SOLD FINAL = 0, atunci contul NU EXISTĂ în perioada curentă
• Exemplu: Cont 419 cu sold inițial 100 RON dar sold final 0.00 → NU îl raporta în analiză!
• Analizează EXCLUSIV coloana "Solduri finale" pentru conturile din clasele 1-5
• Dacă un cont nu apare deloc în balanță → NU îl inventa!

🔴 **REGULĂ CRITICĂ - CONTUL 121 (Profit sau Pierdere)** 🔴

ATENȚIE MAXIMĂ LA INTERPRETAREA CONTULUI 121:
• Contul 121 se analizează EXCLUSIV pe coloana "SOLDURI FINALE"
• Sold final CREDITOR pe contul 121 = PROFIT (veniturile > cheltuielile)
• Sold final DEBITOR pe contul 121 = PIERDERE (cheltuielile > veniturile)

**EXEMPLU CONCRET:**
- Dacă contul 121 are "Solduri finale" → Debit: 5.052,09 și Credit: 0,00
  → Acest sold DEBITOR înseamnă PIERDERE de 5.052,09 RON
- Dacă contul 121 are "Solduri finale" → Debit: 0,00 și Credit: 5.052,09
  → Acest sold CREDITOR înseamnă PROFIT de 5.052,09 RON

NU confunda "Rulaje perioadă" cu "Solduri finale"!
NU inversa interpretarea! Sold DEBITOR pe 121 = PIERDERE, NU profit!

VALIDARE STRUCTURĂ BALANȚĂ:
Verifică dacă balanța conține următoarele coloane obligatorii:
1. Solduri inițiale an (Debit și Credit)
2. Rulaje perioadă (Debit și Credit) SAU Total sume (Debit și Credit)
3. Solduri finale (Debit și Credit)

ATENȚIE: Unele programe de contabilitate (ex: SmartBill) generează balanțe cu "Rulaje perioadă" (doar luna curentă), altele cu "Total sume" (cumulate de la începutul anului).
- Dacă vezi "Rulaje perioadă" → sunt doar din luna curentă
- Dacă vezi "Total sume" → sunt cumulate de la început de an
- Adaptează analiza în funcție de tipul coloanelor disponibile

IMPORTANT: Sistemul convertește automat toate formatele numerice (românești sau internaționale) în format standard. NU menționa niciodată probleme de formatare numerică în analiză - toate numerele sunt deja procesate corect.

Dacă structura de coloane nu este conformă (lipsesc coloane obligatorii), menționează explicit ce coloane lipsesc și cere utilizatorului să exporte balanța completă din programul de contabilitate.

La inceputul anlizei vei scrie urmatorul mesaj:

**Acesta este o analiză managerială efectuată cu ajutorul inteligenței artificiale.**

**Notă importantă:** Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale. Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie fiscală validată.

Apoi treci la analiza balanța atașate urmând următoarele reguli și instrucțiuni, prezentând toate informațiile exclusiv sub formă de text, fără a utiliza tabele:

🔴 **REGULĂ CRITICĂ - ANALIZĂ DIFERENȚIATĂ PE CLASE** 🔴

**CLASE 1-5 (Bilanț - Active/Pasive/Capital):**
• Analizează EXCLUSIV coloana "Solduri finale" (Debit și Credit)
• Fiecare cont trebuie să aibă DOAR sold debitor SAU sold creditor, NU ambele
• Dacă un cont are ambele solduri completate → ANOMALIE GRAVĂ (raportează-o în secțiunea "ANOMALII DETECTATE")
• Conturile cu sold final 0.00 pe ambele coloane = INEXISTENTE (nu le raporta)

**CLASE 6-7 (Profit & Pierdere - Cheltuieli/Venituri):**
• Analizează EXCLUSIV coloana "Rulaje perioadă" SAU "Total sume" (Debit și Credit)
• Pentru fiecare cont, rulajul DEBIT trebuie să fie EGAL cu rulajul CREDIT
• Dacă Rulaj Debit ≠ Rulaj Credit → ANOMALIE (raportează diferența exactă în "ANOMALII DETECTATE")
• Soldurile finale pentru conturile 6-7 trebuie să fie 0 (se închid lunar/anual)

**SECȚIUNE OBLIGATORIE ÎN ANALIZĂ - VALIDARE STRUCTURĂ BALANȚĂ:**

După secțiunea "INDICATORI FINANCIARI", adaugă obligatoriu:

=== VALIDARE STRUCTURĂ BALANȚĂ ===

**Conturi Clasa 1 (Imobilizări):**
- Raportează toate conturile cu sold final > 0
- Format: "Cont 212 - Echipamente: 50.000,00 RON (sold debitor)"

**Conturi Clasa 2 (Stocuri):**
- Raportează toate conturile cu sold final > 0
- Format: "Cont 371 - Mărfuri: 12.500,00 RON (sold debitor)"

**Conturi Clasa 3 (Cheltuieli în avans):**
- Raportează toate conturile cu sold final > 0

**Conturi Clasa 4 (Terți):**
- 🔴 **CRITICE**: 4111 (Clienți), 401 (Furnizori), 4423 (TVA de plată), 4424 (TVA de recuperat)
- Raportează TOATE conturile 4xxx cu sold > 0
- Format: "Cont 4111 - Clienți: 25.000,00 RON (sold debitor)"

**Conturi Clasa 5 (Trezorerie):**
- 🔴 **CRITICE**: 5121 (Banca), 5311 (Casa)
- Raportează TOATE conturile 5xxx cu sold > 0
- Format: "Cont 5121 - Conturi la bănci în lei: 15.000,00 RON (sold debitor)"

**Conturi Clasa 6 (Cheltuieli):**
- Raportează TOP 10 cele mai mari cheltuieli (după rulaj total)
- Format: "Cont 601 - Cheltuieli cu materiale: Rulaj 25.000,00 RON (debit = credit: ✓)"
- 🔴 Dacă rulaj debit ≠ credit → **ANOMALIE**: "Cont 628: Rulaj Debit 5.000 ≠ Credit 4.800 (diferență: 200 RON)"

**Conturi Clasa 7 (Venituri):**
- Raportează TOP 10 cele mai mari venituri (după rulaj total)
- Format: "Cont 707 - Venituri din vânzări: Rulaj 80.000,00 RON (debit = credit: ✓)"
- 🔴 Dacă rulaj debit ≠ credit → **ANOMALIE**: "Cont 758: Rulaj Debit 2.000 ≠ Credit 2.100 (diferență: 100 RON)"

**ANOMALII DETECTATE:**
- Listează TOATE anomaliile structurale găsite:
  • Solduri duble pe conturi 1-5 (ex: "Cont 411 are sold debitor ȘI creditor simultan")
  • Rulaje debalansate pe conturi 6-7 (ex: "Cont 628: Debit ≠ Credit")
  • Alte erori structurale în balanță

Reguli generale:
Specific pentru conturile din Balanta de verificare - sintetica atașată:
• Conturile TVA de plată (4423) trebuie să apară în solduri finale creditoare.
• Conturile TVA de recuperat (4424) apar în solduri finale debitoare.
• Contul Clienți (4111) are sold în solduri finale debitoare.
• Contul Furnizori (401) are sold în solduri finale creditoare.
• Contul Impozit pe profit (4411) este în sold final creditor.
• Contul Impozit pe venit (4418) în sold final creditor.
• Contul 5121 (conturi la bănci în lei) și 5311 (casa în lei) au solduri finale debitoare deoarece reprezintă disponibilități.
• Contul 5124 este pentru conturi la bănci în valută.
• Contul 5125 este pentru "Sume în curs de decontare" - NU este cont de bancă în valută, ci reprezintă sume temporare în tranzit (ex: încasări cu cardul în curs de procesare).
• Conturile de cheltuieli (clasa 6) și venituri (clasa 7) se analizează pe rulaje (total sume debitoare și creditoare), care trebuie să se egaleze.
• Conturile legate de salarii și contribuții (în clasa 4) au solduri finale creditoare.

Observație importantă privind anomaliile în balanța contabilă:
• Conturile din clasele 1 până la 5 trebuie să aibă solduri finale fie debitoare, fie creditoare, dar nu pot avea în același timp sold debitor și creditor.
• Conturile din clasele 6 (cheltuieli) și 7 (venituri) nu trebuie să aibă solduri după ce s-a închis balanța (de obicei la finalul perioadei contabile), ci se analizează doar rulajele (total sume debitoare și total sume creditoare), care trebuie să fie egale.
• Dacă aceste reguli nu sunt respectate, înseamnă că există anomalii în balanța contabilă, care indică erori contabile ce trebuie corectate.
Aceasta este o regulă fundamentală pentru asigurarea corectitudinii și echilibrului în evidența contabilă și pentru prevenirea problemelor ulterioare în raportarea financiară.

INSTRUCTIUNE GENERALA – PREVENIREA ASOCIERILOR EROANTE IN ANALIZA CONTABILA

Obiectiv:
Prevenirea presupunerilor nejustificate și a asocierilor eronate între conturi contabile sau între solduri și evenimente economice, în absența unor dovezi explicite din balanță sau documente justificative.
1. NU formula concluzii privind natura sau proveniența sumelor dintr-un cont contabil decât dacă informația este explicit menționată în balanță sau poate fi dedusă direct din documente justificative (note contabile, extrase, contracte etc).
2. NU asocia automat un cont cu o anumită situație economică doar pe baza uzanțelor contabile din practică.
Exemple:
• Contul 462 nu trebuie asociat automat cu împrumuturi de la asociați dacă lipsește contul 4551.
• Contul 7588 nu trebuie tratat ca subvenție fără documentație justificativă.
3. NU utiliza formulări speculative de tipul "probabil", "pare că", "poate indica" dacă nu există bază documentară.
Înlocuiește-le cu formulări neutre precum:
• "Necesită verificare"
• "Analiză suplimentară recomandată"
• "Nu se poate concluziona pe baza datelor disponibile"
4. Dacă informația lipsește sau este ambiguă, oprește analiza pe acel cont și marchează-l explicit cu avertisment:
"Pe baza datelor disponibile, nu se poate formula o concluzie corectă. Se recomandă verificarea documentelor justificative."
5. Aplicarea acestei instrucțiuni este obligatorie la analiza tuturor conturilor contabile, în toate rapoartele și perioadele, indiferent de experiența sau de presupuneri profesionale.

Scop:
Asigurarea obiectivității și corectitudinii analizelor, evitarea concluziilor eronate și protejarea utilizatorilor de riscuri interpretative.
Instrucțiunea se aplică obligatoriu la TOATE analizele contabile și fiscale, pentru TOATE conturile.

INSTRUCTIUNE OBLIGATORIE – INTERPRETAREA CORECTA A BALANTEI DE VERIFICARE

1. REGULĂ FUNDAMENTALĂ DE CLASIFICARE:
Conturile contabile se analizează în funcție de clasa lor astfel:

CLASELE 1–5 (active, pasive, capitaluri, creanțe și datorii):
• Se analizează EXCLUSIV pe baza coloanei "Solduri finale".
• NU se utilizează "Rulaje" sau "Total sume".
• Se preia doar una dintre următoarele:
◦ "Sold final DEBITOR" → dacă este activ
◦ "Sold final CREDITOR" → dacă este pasiv
• NU se acceptă ambele solduri (debitor + creditor) diferite de zero simultan.

CLASELE 6–7 (cheltuieli și venituri):
• Se analizează EXCLUSIV pe baza coloanelor "Total sume DEBITOARE" și "Total sume CREDITOARE".
• Aceste conturi trebuie să se închidă lunar → NU trebuie să aibă "Sold final".
• "Total sume Debitoare" trebuie să fie egal cu "Total sume Creditoare".
• Dacă nu sunt egale → ALERTĂ DE ANOMALIE CONTABILĂ.

2. VALIDARE OBLIGATORIE PE CONȚINUT:
• Dacă un cont din clasele 1–5 este analizat pe altceva decât "Sold final" → EROARE.
• Dacă un cont din clasele 6–7 este analizat pe "Sold final" → EROARE.
• Orice extragere automată care ignoră regula de mai sus → se invalidează.

3. EXEMPLE DE VERIFICARE:
• Cont 4111 – CLASA 4 → se verifică doar "Sold final Debitor".
• Cont 401 – CLASA 4 → se verifică doar "Sold final Creditor".
• Cont 121 – CLASA 1 → se verifică doar "Sold final" pentru profit/pierdere.
• Cont 607 – CLASA 6 → se verifică doar "Total sume Debitoare".
• Cont 707 – CLASA 7 → se verifică doar "Total sume Creditoare".

4. APLICARE AUTOMATA:
• În orice analiză automată (GPT, script Python, procesare Excel), această regulă se aplică ca filtru de validare.
• Orice abatere de la ea trebuie marcată explicit: "⚠️ NU SE POATE CONCLUZIONA – analiză incorectă a contului [XXX]".

5. SCOP:
Asigurarea acurateței și conformității contabile în interpretarea balanțelor, prevenirea erorilor de asociere și interpretare, și protejarea utilizatorului de concluzii eronate.

INSTRUCTIUNE OBLIGATORIE – ANALIZA CORECTĂ A CONTURILOR DIN CLASA 6 ȘI 7

Această regulă trebuie aplicată strict la toate analizele contabile care implică conturi de cheltuieli (clasa 6) și conturi de venituri (clasa 7), fără excepții.

REGULĂ:
Conturile din clasa 6 și 7 trebuie analizate exclusiv pe baza coloanelor:
• „Total sume Debitoare" (pentru clasa 6)
• „Total sume Creditoare" (pentru clasa 7)

NU se folosește coloana „Rulaje perioada" pentru aceste conturi în nicio analiză sau comparație.

VERIFICARE OBLIGATORIE:
• Total sume Debitoare clasa 6 = Total sume Creditoare clasa 7
• Dacă aceste valori nu sunt egale, atunci balanța conține o anomalie contabilă.

MOTIVARE:
Conturile din clasa 6 și 7 se închid la sfârșitul perioadei contabile. Din acest motiv, analiza se face întotdeauna pe „Total sume", care reflectă rulajul complet până la acel moment, și nu pe rulajul unei singure luni.

CONSECINȚĂ:
Orice extragere de date din coloana „Rulaje perioada" pentru clasele 6 și 7 este considerată o eroare de analiză.

Instrucțiuni Generale:
1. Optimizare și Acțiune: Fiecare secțiune de analiză trebuie să culmineze cu identificarea oportunităților de optimizare (fiscală, contabilă, de management) și propunerea de măsuri concrete, cu impact estimat.
2. Context Legislativ: Toate recomandările fiscale și contabile trebuie să fie fundamentate pe legislația românească în vigoare (Codul Fiscal, Legea Contabilității, etc.).
3. Comunicare: Generează un raport narativ, coerent, care explică semnificația indicatorilor și a anomaliilor, și care oferă soluții practice.

Proces de Analiză (Pași Sistematici):

0) Metadate și Context Inițial:
Client: [Nume firmă]
CUI: [ ] | J: [ ]
Perioadă analizată: [Luna/Anul]
Sursa datelor: Balanta de verificare - sintetica

1) Snapshot Strategic și Recomandări Preliminare (Dashboard CEO):
Calculează și apoi raportează Cifra de afaceri anuală astfel: se calculează prin însumarea soldurilor din coloana „Total sume creditoare" a conturilor din clasa 7 (conturile de venituri) pe întreaga perioadă a anului.
Mai exact, pentru calculul cifrei de afaceri, din balanța de verificare se aleg conturile de venituri din clasa 7, în special grupa 70 (cifra de afaceri netă), incluzând conturi precum 701, 702, 703, 704, 705, 706, 707, 708, după care se scad eventualele reduceri comerciale din contul 709 (dacă există).
Astfel, cifra de afaceri anuală = suma totală a rulajelor creditoare (total sume creditoare) pentru aceste conturi de venituri din clasa 7 pe anul respectiv, minus eventualele reduceri comerciale (cont 709).
Deci se ia în calcul rulajul anual (total sume creditoare) al acestor conturi, nu soldul final.
Astfel se obține cifra de afaceri cumulată pe anul întreg, nu doar pentru o perioadă lunară sau trimestrială. Cifra de afaceri anuală se calculează prin însumarea valorilor din coloana „Total sume creditoare" a conturilor din clasa 7 (conturile de venituri) pe tot anul, în special conturile din grupa 70 (701, 702, 703, 704, 705, 706, 707, 708), din care se scad eventualele reduceri comerciale din contul 709. Astfel, se folosesc rulajele anuale (total sume creditoare), nu soldurile finale, pentru a obține cifra de afaceri cumulată pe anul întreg.
Contul 121 „Profit sau pierdere" reflectă rezultatul exercițiului financiar, adică profitul sau pierderea anuală, nu doar cea lunară.
Calculează soldul final al contului 121 pentru un exercițiu financiar anual astfel:
• În partea de credit: totalul veniturilor realizate în anul respectiv.
• În partea de debit: totalul cheltuielilor efectuate în același an.
• Soldul final al contului 121 reprezintă rezultatul exercițiului financiar:
• Dacă soldul este creditor, înseamnă că veniturile au fost mai mari decât cheltuielile și societatea a realizat profit.
• Dacă soldul este debitor, societatea a înregistrat pierdere.

INDICATORI CHEIE CEO (Dashboard executiv):
• Cifra de afaceri (CA): [valoare] - Calculează evoluția lunară/anuală dacă sunt disponibile date
• Profitabilitate: 
  - Marja brută % = (Venituri - Cost marfă vândută) / Venituri × 100
  - Marja netă % = Profit net / Cifra de afaceri × 100
  - EBITDA estimat = Profit + Cheltuieli financiare + Amortizări
• Lichiditate: 
  - Cash disponibil = Cont 5121 (bănci) + Cont 5311 (casă)
  - Current Ratio = Active curente / Pasive curente
  - Quick Ratio = (Active curente - Stocuri) / Pasive curente
• Eficiență operațională: 
  - DSO (Days Sales Outstanding) = (Clienți / Cifra de afaceri) × 365 zile
  - DPO (Days Payable Outstanding) = (Furnizori / Cheltuieli totale) × 365 zile
  - DIO (Days Inventory Outstanding) = (Stocuri / Cost marfă) × 365 zile (dacă aplicabil)
  - Cash Conversion Cycle = DSO + DIO - DPO (cu cât este mai mic, cu atât mai bine)
  - Rotația stocurilor = Cost marfă vândută / Stoc mediu (dacă aplicabil)
• Sănătate financiară: 
  - Debt-to-Equity Ratio = Total datorii / Capital propriu
  - Working Capital = Active curente - Pasive curente
  - Rata de îndatorare % = Total datorii / Total active × 100
• Alerte critice: TVA restant, salarii/contribuții neachitate, stocuri cu mișcare lentă, datorii peste 90 zile
• Oportunități: Economii fiscale, optimizări de cash-flow, negocieri termene plată, reducere DSO

TVA de plată Contul 4423 în Solduri finale Creditoare
TVA de recuperat Contul 4424 în Solduri finale Debitoare
Clienți Contul 4111 în Solduri finale Debitoare : [ ] | DSO: [ ] zile
Furnizori Contul 401 în Solduri finale Creditoare: [ ] | DPO: [ ] zile
Impozitul pe profit Contul 4411 în Solduri finale Creditoare
Impozitul pe venit Contul 4418 în Solduri finale Creditoare
Mărfuri Contul 371 în Solduri finale Debitoare
Materii prime Contul 301 în Solduri finale Debitoare
Materiale de natura obiectelor de inventar Contul în Solduri finale Debitoare
Banii care sunt în bancă se regăsesc în următoarele conturi din grupa 512:
• Contul 5121 „Conturi la bănci în lei" - disponibilități în lei în conturi bancare
• Contul 5124 „Conturi la bănci în valută" - disponibilități în valută în conturi bancare
• Contul 5125 „Sume în curs de decontare" - sume temporare în tranzit (ex: încasări cu cardul aflate în curs de procesare de către banca procesatoare, care încă nu au ajuns în contul bancar al firmei)
Soldurile finale debitoare ale acestor conturi arată sumele disponibile sau în curs de decontare.
Banii care sunt efectiv în casă se găsesc în contul 5311, numit „Casa în lei". Soldul final al acestui cont, aflat pe partea de debit, indică suma de bani cash disponibilă în caserie. Acest cont nu poate avea sold creditor (adică nu poate apărea cu valoare negativă), deoarece nu există bani cu minus în casă.

Interpretare și Recomandări Preliminare CEO: Pe baza acestor indicatori cheie, oferă o evaluare executivă a performanței companiei, identifică riscuri critice și oportunități strategice de optimizare. Prezintă analiza ca un dashboard managerial actionabil.

2) Analiza Conturilor Cheie – Interpretare, Riscuri și Oportunități de Optimizare:
Pentru fiecare cont cheie, extrage datele relevante, efectuează calculele necesare și oferă o analiză detaliată, identificând riscuri și propunând măsuri de optimizare.

2.1) TVA – conformare – dacă nu apar în balanță conturile 4426, 4427, 4424, 4423, sari peste acest punct deoarece firma este neplătitoare de TVA și nu trebuie analizată:
• cont 4423 în sold debit : [valoare]
• cont 4424 în sold credit
• Impozit (micro cont 4418/profit cont 4411 în solduri debitoare)
• Riscuri: [ ]
• Măsuri: [ ]

2.2) 5121/5311 – Bănci & Casă:
Contul contabil ce arată câți bani sunt în bancă este 5121, acesta se găsește pe coloana Solduri finale Debit.
Contul contabil ce arată câți bani sunt în casă este 5311, acesta se găsește pe coloana Solduri finale Debit.
Analiză: Solduri, fluxuri de numerar, respectarea plafonului de casă (contul 5311 nu are voie să depășească suma de 50000).
Riscuri: Lichiditate insuficientă, risc de fraudă, nerespectarea legislației privind operațiunile de casă.
Recomandări de Optimizare: Managementul lichidității, optimizarea plasamentelor pe termen scurt, control intern.

2.3) 121/117 – Rezultat & Reportat:
Analiză: Verificarea corespondenței cu diferența Clasa 7 - Clasa 6. Analiza evoluției rezultatului.
Riscuri: Erori contabile, pierderi acumulate, impact asupra solvabilității.
Recomandări de Optimizare: Strategii de creștere a profitabilității, managementul costurilor, politici de dividend/reinvestire.

2.4) 607/371 – Cheltuieli cu Stocurile & Marjă – dacă în balanță nu apar conturile 371, 378, 607, 707, înseamnă că firma nu are stocuri, adică este o firmă de prestări servicii, deci acest punct nu se analizează, sari peste acest punct:
Analiză: Marja brută, rotația stocurilor (DIO). Identifică stocurile cu mișcare lentă sau fără mișcare.
Riscuri: Stocuri supraevaluate/subevaluate, deprecieri, costuri de depozitare, pierderi din vânzări.
Recomandări de Optimizare: Managementul stocurilor, optimizarea proceselor de achiziție și vânzare, strategii de preț.

2.5) 421/431/437 – Salarii & Contribuții în Solduri finale Creditoare – dacă aceste conturi nu apar în balanță, înseamnă că firma nu are angajați și nu trebuie analizate, sari peste acest punct:
Analiză: Verificarea conformității cu legislația muncii și fiscală, corelarea cu statele de salarii.
Riscuri: Amenzi, litigii de muncă, erori în calculul contribuțiilor.
Recomandări de Optimizare Fiscală/Management: Optimizarea costurilor salariale, beneficii extra-salariale, conformitate legislativă.

2.6) 6588/7588 – Alte cheltuieli/venituri de exploatare:
Analiză: Identifică natura și frecvența acestor operațiuni. Pot indica tranzacții atipice sau neregulate.
Riscuri: Nedeclararea corectă, tratament fiscal incorect.
Recomandări de Optimizare: Clasificare corectă, documentare adecvată, conformitate fiscală.

2.7) 4551 – Contul Asociatului (în Solduri finale Creditoare): Nu asocia automat soldurile din contul 462 (Creditori diverși) cu asociatul firmei sau cu contul 4551 (Cont curent al asociatului) decât dacă în balanță apare explicit contul 4551 SAU există o clarificare documentară că suma din 462 provine de la asociat.
Analiză: Suma datorată de firmă asociatului. Verifică justificarea și legalitatea sumelor.
Riscuri: Reclasificarea ca dividend, implicații fiscale, nerespectarea legislației.
Recomandări de Optimizare Fiscală: Regularizarea sumelor, documentare, evitarea riscurilor fiscale.

3) Conformitate TVA & Impozite – Analiză Detaliată și Măsuri de Optimizare Fiscală – dacă nu apar în balanță conturile 4426, 4427, 4424, 4423, sari peste acest punct deoarece firma este neplătitoare de TVA și nu trebuie analizată:
Cont 4423 (TVA de plată) în sold credit: [valoare] – Analiză cauze, riscuri fiscale, măsuri de corecție și optimizare.
Cont 4424 (TVA de recuperat) în sold debit: [valoare] – Analiză cauze, oportunități de recuperare/compensare, riscuri, măsuri de accelerare a rambursării.
Impozit (micro cont 4418 / profit cont 4411 în solduri creditoare): Analiză, riscuri fiscale, oportunități de optimizare a bazei de impozitare, planificare fiscală.
Riscuri Generale: Identifică riscuri fiscale suplimentare pe baza analizei.
Măsuri de Optimizare Fiscală: Propune măsuri concrete pentru minimizarea riscurilor și maximizarea beneficiilor fiscale.

4) Profit vs. Cash (Bridge) – Analiză Flux de Numerar și Recomandări de Management:
Extrage valorile numerice din coloana „Total Sume" pentru „Total clasa 7" și „Total clasa 6" denumite \`total_clasa 7\` și \`total_clasa 6\`.
Calculează diferența: \`diferenta = total_clasa 7 - total_clasa 6\`
Preia valoarea soldului debitor sau creditor pentru contul 121, numită \`sold_cont 121\`.
Verifică dacă: \`diferenta == sold_cont121\`.

Dacă textul Excel-ului este insuficient sau ilizibil, răspunde explicit: "Se acceptă DOAR fișiere Excel lizibile ale balanței de verificare. Reîncarcă un Excel exportat clar din programul de contabilitate."

5) INDICATORI FINANCIARI STRUCTURAȚI (OBLIGATORIU LA SFÂRȘIT):

🔴 ABSOLUT OBLIGATORIU 🔴

LA SFÂRȘITUL ANALIZEI, ADAUGĂ O SECȚIUNE CU TITLUL "=== INDICATORI FINANCIARI ===" și include următorii indicatori în format structurat (exact așa cum sunt specificați mai jos).

ATENȚIE: ACEASTA NU ESTE OPȚIONALĂ! Fără această secțiune, analiza este incompletă și va genera erori în sistem!

=== INDICATORI FINANCIARI ===
DSO: [valoare_numerică]
DPO: [valoare_numerică]
CCC: [valoare_numerică]
EBITDA: [valoare_numerică]
CA: [valoare_numerică]
Cheltuieli: [valoare_numerică]
Profit: [valoare_numerică]
Sold Furnizori: [valoare_numerică]
Sold Clienti: [valoare_numerică]
Sold Banca: [valoare_numerică]
Sold Casa: [valoare_numerică]

Unde:
- DSO (Days Sales Outstanding) = (Clienți / Cifra de afaceri) × 365
- DPO (Days Payable Outstanding) = (Furnizori / Cheltuieli) × 365
- CCC (Cash Conversion Cycle) = DSO - DPO
- EBITDA = calculat din date disponibile
- CA = Cifra de afaceri totală (total clasa 7)
- Cheltuieli = Total cheltuieli (total clasa 6)
- Profit = sold cont 121 (creditor = profit, debitor = pierdere cu semnul minus)

IMPORTANT: Această secțiune trebuie să apară OBLIGATORIU la sfârșitul fiecărei analize, cu valorile numerice clare (fără separatori de mii, doar punct pentru zecimale, fără RON).

Exemplu de format corect:
=== INDICATORI FINANCIARI ===
DSO: 45.5
DPO: 30.2
CCC: 15.3
EBITDA: 261909.27
CA: 1080733.22
Cheltuieli: 818823.95
Profit: 261909.27
Sold Furnizori: 150000.00
Sold Clienti: 200000.00
Sold Banca: 50000.00
Sold Casa: 5000.00

REPETĂM: ACEASTĂ SECȚIUNE ESTE OBLIGATORIE! NU UITA SĂ O ADAUGI LA SFÂRȘIT!`;

// Parse Excel file with proper number formatting
async function parseExcelWithXLSX(excelBase64: string): Promise<string> {
  try {
    // Convert base64 to Uint8Array
    const binaryString = atob(excelBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Read Excel file with proper number parsing
    const workbook = XLSX.read(bytes, { 
      type: 'array',
      cellDates: false,
      cellNF: false,  // Don't keep number formats - we want raw numbers
      cellText: false
    });
    
    let fullText = "";
    
    // Extract text from all sheets with proper number formatting
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON with RAW numeric values
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        raw: true, // Get raw numeric values, not formatted strings
        defval: '' 
      });
      
      // Convert JSON back to CSV with consistent number formatting
      let csvText = '';
      jsonData.forEach((row: any) => {
        const formattedRow = row.map((cell: any) => {
          // Format all numbers consistently with dot as decimal separator
          if (typeof cell === 'number') {
            // Format with 2 decimals for consistency
            return cell.toFixed(2);
          }
          // If it's a string that looks like a Romanian formatted number, convert it
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            
            // Pattern 1: Romanian format with dots as thousand separators and comma as decimal: 1.234.567,89
            if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmed)) {
              const cleaned = trimmed.replace(/\./g, '').replace(',', '.');
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed)) {
                return parsed.toFixed(2);
              }
            }
            
            // Pattern 2: Simple comma as decimal: 1234,56
            if (/^\d+(,\d+)$/.test(trimmed)) {
              const cleaned = trimmed.replace(',', '.');
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed)) {
                return parsed.toFixed(2);
              }
            }
            
            // Pattern 3: Already correct format: 1234.56
            if (/^\d+(\.\d+)?$/.test(trimmed)) {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) {
                return parsed.toFixed(2);
              }
            }
          }
          return cell;
        });
        csvText += formattedRow.join(',') + '\n';
      });
      
      fullText += `\n=== Sheet: ${sheetName} ===\n${csvText}\n`;
    });
    
    console.log("Excel parsed with preserved decimal formatting");
    return fullText.trim();
  } catch (error) {
    console.error("Error parsing Excel with xlsx:", error);
    throw new Error("Nu s-a putut extrage textul din Excel");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { excelBase64, fileName } = await req.json();
    
    // ✅ SECURITY FIX: Validate file presence
    if (!excelBase64) {
      return new Response(
        JSON.stringify({ error: "Lipsește fișierul Excel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FAZA 1: Validare denumire fișier - trebuie să conțină lună/an
    console.log("🔍 Validare denumire fișier:", fileName);
    const hasDatePattern = 
      /\d{2}[-\/]\d{2}[-\/]\d{4}/.test(fileName) || // 01-10-2025
      /\d{4}[-\/]\d{2}[-\/]\d{2}/.test(fileName) || // 2025-10-01
      /\d{2}[-\/]\d{4}/.test(fileName) ||           // 10-2025
      /\d{4}[-\/]\d{2}/.test(fileName) ||           // 2025-10
      /(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*\d{4}/i.test(fileName);

    if (!hasDatePattern) {
      console.warn("⚠️ Denumirea fișierului NU conține lună/an:", fileName);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_filename",
          message: "⚠️ Denumirea balanței trebuie să conțină luna și anul!\n\n" +
                   "✅ Exemple corecte:\n" +
                   "• Balanta octombrie 2025 - Compania Mea.xls\n" +
                   "• Balanta - COMPANIE [01-10-2025 31-10-2025] 12345678.xls\n" +
                   "• Balanta 10-2025.xls\n\n" +
                   "❌ Greșit:\n" +
                   "• Balanta.xls\n" +
                   "• export_balanta.xls\n\n" +
                   "👉 Redenumește fișierul și încearcă din nou!",
          fileName: fileName
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Denumire fișier validă (conține lună/an)");

    // ✅ SECURITY FIX: File size validation (zip bomb protection)
    // Base64 encoding increases size by ~33%, so 10MB limit = ~7.5MB original
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in base64
    if (excelBase64.length > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Fișierul este prea mare. Maximum 7.5MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? {
        global: {
          headers: { Authorization: authHeader },
        },
      } : undefined
    );

    // Save original file to storage
    console.log("Salvare fișier original în storage...");
    const timestamp = new Date().getTime();
    const sanitizedFileName = fileName?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'balanta.xlsx';
    const storagePath = `${timestamp}_${sanitizedFileName}`;
    
    try {
      // Convert base64 to bytes
      const fileBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
      
      const { error: uploadError } = await supabaseClient
        .storage
        .from('balance-attachments')
        .upload(storagePath, fileBytes, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false
        });

      if (uploadError) {
        console.error("Eroare salvare în storage:", uploadError);
        // Continue with analysis even if storage fails
      } else {
        console.log("Fișier salvat în storage:", storagePath);
      }
    } catch (storageError) {
      console.error("Eroare salvare fișier:", storageError);
      // Continue with analysis
    }

    console.log("Parsare Excel cu xlsx...");
    console.log("Nume fișier:", fileName);
    const balanceText = await parseExcelWithXLSX(excelBase64);
    console.log("Text extras (primele 500 caractere):", balanceText.slice(0, 500));
    console.log("Lungime totală text extras:", balanceText.length);

    // 📊 EXTRAGERE DATE STRUCTURATE PENTRU GENERARE WORD
    console.log("📊 [STRUCTURED-DATA] START: Extragere CUI, companie și conturi pentru Word...");
    const extractStructuredData = () => {
      try {
        const excelBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
        const workbook = XLSX.read(excelBytes, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
        
        let cui = '';
        let company = '';
        const accounts: any[] = [];
        
        // 1. Extrage CUI și companie din primele rânduri
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const firstCell = String(data[i][0] || '');
          
          // Caută CUI (8-10 cifre)
          const cuiMatch = firstCell.match(/CUI:?\s*(\d{8,10})/i) || firstCell.match(/(\d{8,10})/);
          if (cuiMatch && !cui) cui = cuiMatch[1];
          
          // Caută nume companie (înainte de | sau CUI)
          const companyMatch = firstCell.split('|')[0].split(/CUI|CIF/i)[0].trim();
          if (companyMatch && companyMatch.length > 3 && !company) company = companyMatch;
        }
        
        console.log(`📊 [STRUCTURED-DATA] CUI detectat: ${cui}, Companie: ${company}`);
        
        // 2. Găsește header-ul (suportă format pe 2 rânduri)
        let headerRow = -1;
        let mainHeaderRow = -1;
        let subHeaderRow = -1;
        let contCol = -1, denumireCol = -1;
        let soldFinalDCol = -1, soldFinalCCol = -1;
        let rulajDCol = -1, rulajCCol = -1;
        let totalSumeDCol = -1, totalSumeCCol = -1;
        
        // PASUL 1: Detectează header pe 2 rânduri (rând principal + sub-header)
        for (let i = 0; i < Math.min(15, data.length); i++) {
          const rowStr = data[i].join('|').toLowerCase();
          
          // Găsește rândul cu "Solduri finale" sau "Sold final"
          if ((rowStr.includes('solduri finale') || rowStr.includes('sold final')) && mainHeaderRow < 0) {
            mainHeaderRow = i;
            subHeaderRow = i + 1;
            headerRow = i; // Pentru compatibilitate cu cod existent
            console.log(`📊 [HEADER-DETECT] Header pe 2 rânduri: main=${mainHeaderRow}, sub=${subHeaderRow}`);
          }
          
          // Fallback: header simplu (toate pe un rând)
          if (headerRow < 0 && (rowStr.includes('sold') || (rowStr.includes('cont') && rowStr.includes('denumire')))) {
            headerRow = i;
            console.log(`📊 [HEADER-DETECT] Header simplu pe 1 rând: ${headerRow}`);
          }
        }
        
        // PASUL 2: Detectează coloana cont și denumire din primul rând de header
        if (headerRow >= 0) {
          const row = data[headerRow];
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase().trim();
            if ((cell.includes('cont') || cell.includes('simbol')) && contCol === -1) contCol = j;
            if ((cell.includes('denumire') || cell.includes('explicatii')) && denumireCol === -1) denumireCol = j;
          }
        }
        
        // PASUL 3: Detectează coloane solduri/rulaje
        if (mainHeaderRow >= 0 && subHeaderRow < data.length) {
          // Header pe 2 rânduri - caută "Solduri finale" în rând principal, apoi "Debitoare"/"Creditoare" în sub-header
          const mainHeader = data[mainHeaderRow];
          const subHeader = data[subHeaderRow];
          
          let soldFinalStartCol = -1;
          let rulajStartCol = -1;
          
          // Găsește unde încep secțiunile "Solduri finale" și "Rulaje perioada"
          for (let j = 0; j < mainHeader.length; j++) {
            const cell = String(mainHeader[j]).toLowerCase().trim();
            if ((cell.includes('solduri finale') || cell.includes('solduri finala') || cell.includes('sold final')) && soldFinalStartCol < 0) {
              soldFinalStartCol = j;
            }
            if (cell.includes('rulaj') && rulajStartCol < 0) {
              rulajStartCol = j;
            }
          }
          
          // Caută "Debitoare" / "Creditoare" în sub-header, în intervalul soldFinalStart...soldFinalStart+3
          if (soldFinalStartCol >= 0) {
            for (let j = soldFinalStartCol; j < Math.min(soldFinalStartCol + 4, subHeader.length); j++) {
              const cell = String(subHeader[j]).toLowerCase().trim();
              if ((cell.includes('debit') || cell === 'd') && soldFinalDCol < 0) soldFinalDCol = j;
              if ((cell.includes('credit') || cell === 'c') && soldFinalCCol < 0) soldFinalCCol = j;
            }
          }
          
          // Similar pentru rulaje
          if (rulajStartCol >= 0) {
            for (let j = rulajStartCol; j < Math.min(rulajStartCol + 4, subHeader.length); j++) {
              const cell = String(subHeader[j]).toLowerCase().trim();
              if ((cell.includes('debit') || cell === 'd') && rulajDCol < 0) rulajDCol = j;
              if ((cell.includes('credit') || cell === 'c') && rulajCCol < 0) rulajCCol = j;
            }
          }
          
          // Caută "Total sume" pentru clase 6-7
          let totalSumeStartCol = -1;
          
          for (let j = 0; j < mainHeader.length; j++) {
            const cell = String(mainHeader[j]).toLowerCase().trim();
            if ((cell.includes('total') && cell.includes('sume')) && totalSumeStartCol < 0) {
              totalSumeStartCol = j;
            }
          }
          
          if (totalSumeStartCol >= 0) {
            for (let j = totalSumeStartCol; j < Math.min(totalSumeStartCol + 4, subHeader.length); j++) {
              const cell = String(subHeader[j]).toLowerCase().trim();
              if ((cell.includes('debit') || cell === 'd') && totalSumeDCol < 0) totalSumeDCol = j;
              if ((cell.includes('credit') || cell === 'c') && totalSumeCCol < 0) totalSumeCCol = j;
            }
          }
          
          console.log(`📊 [HEADER-DETECT] Detectat din 2 rânduri: soldFinalStart=${soldFinalStartCol}, rulajStart=${rulajStartCol}, totalSumeStart=${totalSumeStartCol}`);
        }
        
        // PASUL 4: Fallback - header pe 1 rând (format vechi)
        if ((soldFinalDCol < 0 || soldFinalCCol < 0) && headerRow >= 0) {
          console.log(`📊 [HEADER-DETECT] Fallback - detectare din 1 rând`);
          const row = data[headerRow];
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase().trim();
            
            // Solduri finale
            if (cell.includes('sold') && cell.includes('final')) {
              if (cell.includes('debit') && soldFinalDCol < 0) soldFinalDCol = j;
              if (cell.includes('credit') && soldFinalCCol < 0) soldFinalCCol = j;
            }
            
            // Rulaje
            if (cell.includes('rulaj') && !cell.includes('sold')) {
              if (cell.includes('debit') && rulajDCol < 0) rulajDCol = j;
              if (cell.includes('credit') && rulajCCol < 0) rulajCCol = j;
            }
          }
        }
        
        // DEBUGGING FINAL
        console.log(`📊 [STRUCTURED-DATA] Header la rând ${headerRow}, coloane detectate:`, {
          cont: contCol,
          denumire: denumireCol,
          soldFinalDebit: soldFinalDCol,
          soldFinalCredit: soldFinalCCol,
          rulajDebit: rulajDCol,
          rulajCredit: rulajCCol,
          totalSumeDebit: totalSumeDCol,
          totalSumeCredit: totalSumeCCol
        });
        
        // 3. Parcurge rândurile de date
        if (headerRow >= 0 && contCol >= 0) {
          for (let i = headerRow + 1; i < data.length; i++) {
            const row = data[i];
            const contCode = String(row[contCol] || '').trim();
            
            // Skip dacă nu e cod de cont valid
            if (!contCode || !/^\d/.test(contCode) || contCode.length < 3) continue;
            
            const accountClass = parseInt(contCode[0]);
            const denumire = denumireCol >= 0 ? String(row[denumireCol] || '').trim() : '';
            
            let debit = 0, credit = 0;
            
            // Clase 1-5: folosește solduri finale
            if (accountClass >= 1 && accountClass <= 5) {
              if (soldFinalDCol >= 0) {
                // Elimină separatorul de mii (virgula) și parsează direct
                const rawVal = String(row[soldFinalDCol] || '0').trim();
                const val = rawVal.replace(/,/g, ''); // Elimină virgula (separator mii în format internațional)
                debit = parseFloat(val) || 0;
              }
              if (soldFinalCCol >= 0) {
                const rawVal = String(row[soldFinalCCol] || '0').trim();
                const val = rawVal.replace(/,/g, '');
                credit = parseFloat(val) || 0;
              }
            }
            // Clasa 6: Total sume debitoare (cheltuieli cumulate)
            else if (accountClass === 6) {
              if (totalSumeDCol >= 0) {
                const rawVal = String(row[totalSumeDCol] || '0').trim();
                const val = rawVal.replace(/,/g, '');
                debit = parseFloat(val) || 0;
              }
            }
            // Clasa 7: Total sume creditoare (venituri cumulate)
            else if (accountClass === 7) {
              if (totalSumeCCol >= 0) {
                const rawVal = String(row[totalSumeCCol] || '0').trim();
                const val = rawVal.replace(/,/g, '');
                credit = parseFloat(val) || 0;
              }
            }
            
            // Adaugă doar conturile cu sold > 0
            if (debit > 0 || credit > 0) {
              accounts.push({
                code: contCode,
                name: denumire,
                debit: Math.round(debit * 100) / 100, // 2 decimale
                credit: Math.round(credit * 100) / 100,
                accountClass
              });
            }
          }
        }
        
        console.log(`📊 [STRUCTURED-DATA] Extrase ${accounts.length} conturi cu sold > 0`);
        if (accounts.length > 0) {
          console.log('📊 [STRUCTURED-DATA] Primele 3 conturi:', accounts.slice(0, 3).map(acc => ({
            code: acc.code,
            name: acc.name,
            debit: acc.debit,
            credit: acc.credit,
            class: acc.accountClass
          })));
        }
        return { cui, company, accounts };
      } catch (error) {
        console.error('📊 [STRUCTURED-DATA] Eroare extragere:', error);
        return { cui: '', company: '', accounts: [] };
      }
    };

    const structuredData = extractStructuredData();
    console.log(`📊 [STRUCTURED-DATA] FINAL - CUI: ${structuredData.cui}, Companie: ${structuredData.company}, Conturi: ${structuredData.accounts.length}`);
    if (structuredData.accounts.length > 0) {
      console.log('📊 [STRUCTURED-DATA] Breakdown pe clase:', 
        [1,2,3,4,5,6,7].map(c => ({ 
          class: c, 
          count: structuredData.accounts.filter(a => a.accountClass === c).length 
        })).filter(x => x.count > 0)
      );
    }

    // CALCUL DETERMINIST AL INDICATORILOR DIN EXCEL
    console.log("📊 [METADATA-EXTRACT] START: Calcul determinist indicatori financiari din Excel...");
    const deterministic_metadata: Record<string, number> = {};
    
    try {
      // Parse Excel pentru a extrage date structurate
      const excelBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
      const workbook = XLSX.read(excelBytes, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
      
      console.log(`📊 [METADATA-EXTRACT] Excel has ${data.length} rows`);
      
      // Găsește indexurile coloanelor importante
      let headerRowIndex = -1;
      let soldFinalDebitCol = -1;
      let soldFinalCreditCol = -1;
      let totalSumeDebitCol = -1;
      let totalSumeCreditCol = -1;
      let contCol = -1;
      
      console.log("🔍 [METADATA-EXTRACT] Căutare header în primele 10 rânduri...");
      
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const rowStr = row.join('|').toLowerCase();
        console.log(`🔍 [METADATA-EXTRACT] Rândul ${i}: ${rowStr.substring(0, 100)}...`);
        
        // Detectare flexibilă: sold/finale/SF/sfd/rulaj
        if (rowStr.includes('sold') || rowStr.includes('sf ') || rowStr.includes('sfd') || 
            rowStr.includes('sfc') || rowStr.includes('rulaj') || rowStr.includes('finale')) {
          headerRowIndex = i;
          console.log(`✅ [METADATA-EXTRACT] GĂSIT header la rândul ${i}`);
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase().trim();
            
            // Cont/Simbol
            if (cell.includes('cont') || cell.includes('simbol')) {
              contCol = j;
              console.log(`✅ [METADATA-EXTRACT] Coloana CONT găsită la index ${j}: "${row[j]}"`);
            }
            
            // Sold Final Debitor
            if ((cell.includes('sold') && cell.includes('final') && cell.includes('debit')) ||
                (cell.includes('sf') && cell.includes('deb')) ||
                cell === 'sfd' ||
                (cell.includes('sold') && cell.includes('deb') && !cell.includes('credit'))) {
              soldFinalDebitCol = j;
              console.log(`✅ [METADATA-EXTRACT] Coloana SF DEBIT găsită la index ${j}: "${row[j]}"`);
            }
            
            // Sold Final Creditor
            if ((cell.includes('sold') && cell.includes('final') && cell.includes('credit')) ||
                (cell.includes('sf') && cell.includes('cred')) ||
                cell === 'sfc' ||
                (cell.includes('sold') && cell.includes('cred') && !cell.includes('debit'))) {
              soldFinalCreditCol = j;
              console.log(`✅ [METADATA-EXTRACT] Coloana SF CREDIT găsită la index ${j}: "${row[j]}"`);
            }
            
            // Rulaj/Total Debitor
            if ((cell.includes('total') && cell.includes('sume') && cell.includes('debit')) ||
                (cell.includes('rulaj') && (cell.includes('debit') || cell.includes(' d'))) ||
                (cell === 'debit' || cell === 'd')) {
              totalSumeDebitCol = j;
              console.log(`✅ [METADATA-EXTRACT] Coloana TOTAL DEBIT găsită la index ${j}: "${row[j]}"`);
            }
            
            // Rulaj/Total Creditor
            if ((cell.includes('total') && cell.includes('sume') && cell.includes('credit')) ||
                (cell.includes('rulaj') && (cell.includes('credit') || cell.includes(' c'))) ||
                (cell === 'credit' || cell === 'c')) {
              totalSumeCreditCol = j;
              console.log(`✅ [METADATA-EXTRACT] Coloana TOTAL CREDIT găsită la index ${j}: "${row[j]}"`);
            }
          }
          break;
        }
      }
      
      console.log(`📍 [METADATA-EXTRACT] REZUMAT: Header=${headerRowIndex}, Cont=${contCol}, SF D/C=${soldFinalDebitCol}/${soldFinalCreditCol}, Total D/C=${totalSumeDebitCol}/${totalSumeCreditCol}`);
      
      // FALLBACK: Dacă NU am găsit header-uri, încearcă extragere FĂRĂ header
      if (headerRowIndex === -1 || contCol === -1) {
        
        // Strategie alternativă: caută conturi cunoscute (4111, 401, 5121, 7xx, 6xx) direct în celule
        let soldClienti = 0, soldFurnizori = 0, soldBanca = 0, soldCasa = 0;
        let soldStocuri = 0, soldMateriiPrime = 0, soldMateriale = 0, costMarfaVanduta = 0;
        let totalVenituri = 0, totalCheltuieli = 0, reduceriComerciale = 0;
        
        console.log("🔧 [METADATA-EXTRACT-FALLBACK] Căutare conturi DIRECTE fără header...");
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          // Caută cont în prima coloană (cel mai probabil index 0 sau 1)
          for (let contIdx = 0; contIdx <= 1; contIdx++) {
            const cell = String(row[contIdx] || '').trim();
            const contMatch = cell.match(/^(\d{3,4})/);
            if (!contMatch) continue;
            
            const contCode = contMatch[1];
            console.log(`🔍 [METADATA-EXTRACT-FALLBACK] Găsit cont ${contCode} la rândul ${i}`);
            
            // ✅ PARSER UNIVERSAL pentru fallback
            const parseUniversalNumber = (val: any): number => {
              if (typeof val === 'number') return val;
              if (val === null || val === undefined || val === '') return 0;
              
              let str = String(val).trim();
              const lastDotIndex = str.lastIndexOf('.');
              const lastCommaIndex = str.lastIndexOf(',');
              const lastSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
              
              if (lastSeparatorIndex === -1) {
                str = str.replace(/[^\d-]/g, '');
                const num = parseFloat(str);
                return isNaN(num) ? 0 : num;
              }
              
              let integerPart = str.substring(0, lastSeparatorIndex);
              let decimalPart = str.substring(lastSeparatorIndex + 1);
              integerPart = integerPart.replace(/[.,]/g, '');
              integerPart = integerPart.replace(/[^\d-]/g, '');
              decimalPart = decimalPart.replace(/[^\d]/g, '');
              const standardFormat = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
              const num = parseFloat(standardFormat);
              
              if (isNaN(num)) return 0;
              if (Math.abs(num) > 100 && str !== String(num)) {
                console.log(`🔄 [PARSE-UNIVERSAL-FALLBACK] "${val}" → ${num}`);
              }
              return num;
            };
            
            // Extrage valori din TOATE coloanele cu valori numerice
            const extractNum = (colIdx: number): number => {
              if (colIdx >= row.length) return 0;
              const val = row[colIdx];
              if (val === null || val === undefined || val === '') return 0;
              
              // ✅ Folosește parserul universal
              return parseUniversalNumber(val);
            };
            
            // Pentru fiecare cont, extragem TOATE valorile numerice din rând
            const allNumbers = row.slice(1).map((cell, idx) => ({
              value: extractNum(idx + 1),
              colIndex: idx + 1
            })).filter(n => n.value > 0);
            
            console.log(`  [FALLBACK] Cont ${contCode} - valori găsite:`, allNumbers.map(n => `[${n.colIndex}]=${n.value}`).join(', '));
            
            // Pentru conturi clasa 1-5: ia soldurile finale (ultimele 2 valori non-zero)
            // Pentru conturi clasa 6-7: ia total sume (ultimele 2 valori non-zero)
            const lastTwo = allNumbers.slice(-2);
            const possibleSFDebit = lastTwo[0]?.value || 0;
            const possibleSFCredit = lastTwo[1]?.value || 0;
            const possibleTotalDebit = lastTwo[0]?.value || 0;
            const possibleTotalCredit = lastTwo[1]?.value || 0;
            
            // Mapare conturi cunoscute (clasa 1-5: folosim Sold Final)
            // ✅ ÎMBUNĂTĂȚIRE: Încearcă TOATE variantele de poziții pentru solduri finale
            if (contCode === '4111') {
              // Clienti - sold final debitor (ultimele 2 coloane, ia partea debit)
              const candidati = [possibleSFDebit, possibleSFCredit, ...allNumbers.map(n => n.value)];
              const maxClienti = Math.max(...candidati.filter(v => v > 0));
              if (maxClienti > 0) {
                soldClienti = maxClienti;
                console.log(`  ✅ [FALLBACK-IMPROVED] CLIENTI (4111): ${soldClienti}`);
              }
            }
            if (contCode === '401') {
              // Furnizori - sold final creditor (ultimele 2 coloane, ia partea credit)
              const candidati = [possibleSFCredit, possibleSFDebit, ...allNumbers.map(n => n.value)];
              const maxFurnizori = Math.max(...candidati.filter(v => v > 0));
              if (maxFurnizori > 0) {
                soldFurnizori = maxFurnizori;
                console.log(`  ✅ [FALLBACK-IMPROVED] FURNIZORI (401): ${soldFurnizori}`);
              }
            }
            if (contCode === '5121' || contCode === '5124' || contCode === '5125') {
              // Banca - sold final debitor
              const candidati = [possibleSFDebit, possibleSFCredit, ...allNumbers.map(n => n.value)];
              const maxBanca = Math.max(...candidati.filter(v => v > 0));
              if (maxBanca > 0) {
                soldBanca += maxBanca;
                console.log(`  ✅ [FALLBACK-IMPROVED] BANCA (${contCode}): ${maxBanca} (Total: ${soldBanca})`);
              }
            }
            if (contCode === '5311') {
              // Casa - sold final debitor
              const candidati = [possibleSFDebit, possibleSFCredit, ...allNumbers.map(n => n.value)];
              const maxCasa = Math.max(...candidati.filter(v => v > 0));
              if (maxCasa > 0) {
                soldCasa = maxCasa;
                console.log(`  ✅ [FALLBACK-IMPROVED] CASA (5311): ${soldCasa}`);
              }
            }
            
            // Venituri (clasa 7): ia valoarea maximă din rând (Total Credit)
            if (contCode.startsWith('7') && contCode !== '709') {
              const maxVal = Math.max(...allNumbers.map(n => n.value), 0);
              if (maxVal > 0) {
                totalVenituri += maxVal;
                console.log(`  ✅ [FALLBACK-IMPROVED] VENIT ${contCode}: +${maxVal} → Total: ${totalVenituri}`);
              }
            }
            if (contCode === '709') {
              const maxVal = Math.max(...allNumbers.map(n => n.value), 0);
              if (maxVal > 0) {
                reduceriComerciale = maxVal;
                console.log(`  ✅ [FALLBACK-IMPROVED] REDUCERI (709): ${reduceriComerciale}`);
              }
            }
            
            // Cheltuieli (clasa 6): ia valoarea maximă din rând (Total Debit)
            if (contCode.startsWith('6')) {
              const maxVal = Math.max(...allNumbers.map(n => n.value), 0);
              if (maxVal > 0) {
                totalCheltuieli += maxVal;
                console.log(`  ✅ [FALLBACK-IMPROVED] CHELTUIALĂ ${contCode}: +${maxVal} → Total: ${totalCheltuieli}`);
              }
            }
          }
        }
        
        // Calculează indicatori din fallback
        const revenue = Math.max(0, totalVenituri - reduceriComerciale);
        const expenses = totalCheltuieli;
        
        // Caută contul 121 pentru profit/pierdere CORECT
        const cont121 = structuredData.accounts.find((acc: any) => acc.code === '121');
        let profit = 0;
        
        if (cont121) {
          const debit = cont121.debit || 0;
          const credit = cont121.credit || 0;
          
          if (credit > debit) {
            // Sold CREDITOR = PROFIT
            profit = credit - debit;
            console.log(`✅ [PROFIT-EXTRACT] Cont 121 sold CREDITOR: +${profit} RON (PROFIT)`);
          } else if (debit > credit) {
            // Sold DEBITOR = PIERDERE (aplicăm MINUS!)
            profit = -(debit - credit);
            console.log(`✅ [PROFIT-EXTRACT] Cont 121 sold DEBITOR: ${profit} RON (PIERDERE)`);
          } else {
            profit = 0;
            console.log(`⚖️ [PROFIT-EXTRACT] Cont 121 echilibrat: 0 RON`);
          }
        } else {
          // FALLBACK: Dacă nu există cont 121, calculează din revenue - expenses
          profit = revenue - expenses;
          console.log(`⚠️ [PROFIT-EXTRACT] Cont 121 INEXISTENT - Calculat ca Revenue - Expenses: ${profit} RON`);
        }
        
        deterministic_metadata.revenue = revenue;
        deterministic_metadata.expenses = expenses;
        deterministic_metadata.profit = profit;
        deterministic_metadata.soldClienti = soldClienti;
        deterministic_metadata.soldFurnizori = soldFurnizori;
        deterministic_metadata.soldBanca = soldBanca;
        deterministic_metadata.soldCasa = soldCasa;
        deterministic_metadata.soldStocuri = soldStocuri;
        deterministic_metadata.soldMateriiPrime = soldMateriiPrime;
        deterministic_metadata.soldMateriale = soldMateriale;
        
        if (revenue > 0) deterministic_metadata.dso = Math.round((soldClienti / revenue) * 365);
        if (expenses > 0) deterministic_metadata.dpo = Math.round((soldFurnizori / expenses) * 365);
        
        // Calculează DIO (Days Inventory Outstanding)
        const totalStocuri = soldStocuri + soldMateriiPrime + soldMateriale;
        if (costMarfaVanduta > 0 && totalStocuri > 0) {
          deterministic_metadata.dio = Math.round((totalStocuri / costMarfaVanduta) * 365);
        }
        
        // Recalculează CCC cu DIO
        if (deterministic_metadata.dso && deterministic_metadata.dpo) {
          const dioValue = deterministic_metadata.dio || 0;
          deterministic_metadata.cashConversionCycle = deterministic_metadata.dso + dioValue - deterministic_metadata.dpo;
        }
        
        console.log("✅ [METADATA-EXTRACT-FALLBACK] METADATA FINALĂ (fără header):", deterministic_metadata);
        
      } else {
        // Proceeding with header-based extraction
        console.log("✅ [METADATA-EXTRACT] Header-uri GĂSITE - Extragere cu header...");

        /**
         * ✅ PARSER UNIVERSAL PENTRU NUMERE
         * 
         * LOGICA: Ultimul separator (punct sau virgulă) = separator zecimal
         * 
         * Exemple:
         *   "1.234,56"     → 1234.56  (ultimul separator = virgulă)
         *   "1,234.56"     → 1234.56  (ultimul separator = punct)
         *   "1.234.567,89" → 1234567.89
         *   "1234,56"      → 1234.56
         *   "1234.56"      → 1234.56
         *   "1234"         → 1234
         */
        const parseUniversalNumber = (val: any): number => {
          // Dacă e deja număr, returnează direct
          if (typeof val === 'number') return val;
          
          // Validare input
          if (val === null || val === undefined || val === '') return 0;
          
          // Convertește în string și curăță spații
          let str = String(val).trim();
          
          // Găsește ultimul separator (punct sau virgulă)
          const lastDotIndex = str.lastIndexOf('.');
          const lastCommaIndex = str.lastIndexOf(',');
          
          // Determină care e ultimul separator
          const lastSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
          
          if (lastSeparatorIndex === -1) {
            // ✅ NU are separator → număr întreg sau deja în format corect
            // Șterge orice caracter non-numeric (ex: spații, simboluri valută)
            str = str.replace(/[^\d-]/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          }
          
          // ✅ ARE separator → împarte în parte întreagă + zecimale
          
          // Partea întreagă: tot ce e înainte de ultimul separator
          let integerPart = str.substring(0, lastSeparatorIndex);
          
          // Zecimale: tot ce e după ultimul separator
          let decimalPart = str.substring(lastSeparatorIndex + 1);
          
          // Curăță partea întreagă: șterge TOȚI separatorii (puncte și virgule)
          integerPart = integerPart.replace(/[.,]/g, '');
          
          // Curăță partea întreagă: șterge orice caracter non-numeric
          integerPart = integerPart.replace(/[^\d-]/g, '');
          
          // Curăță zecimalele: șterge orice caracter non-numeric
          decimalPart = decimalPart.replace(/[^\d]/g, '');
          
          // Construiește numărul în format standard: "partea_intreaga.zecimale"
          const standardFormat = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
          
          // Parse final
          const num = parseFloat(standardFormat);
          
          if (isNaN(num)) {
            console.warn(`⚠️ [PARSE-UNIVERSAL] Nu s-a putut parsa: "${val}" → NaN`);
            return 0;
          }
          
          // ✅ Logging pentru debugging (doar pentru valori > 100 ca să nu spam-eze logs)
          if (Math.abs(num) > 100 && str !== String(num)) {
            console.log(`🔄 [PARSE-UNIVERSAL] "${val}" → ${num}`);
          }
          
          return num;
        };

        // ✅ Funcție helper pentru a extrage valoare numerică
        const getNumValue = (row: any[], colIndex: number): number => {
          if (colIndex === -1) return 0;
          const val = row[colIndex];
          if (val === null || val === undefined || val === '') return 0;
          
          // ✅ Folosește parserul universal
          return parseUniversalNumber(val);
        };
        
        // Extrage valori pentru calcule
        let soldClienti = 0; // 4111
        let soldFurnizori = 0; // 401
        let soldBanca = 0; // 5121, 5124, 5125
        let soldCasa = 0; // 5311
        let soldStocuri = 0; // 371
        let soldMateriiPrime = 0; // 301
        let soldMateriale = 0; // 302
        let costMarfaVanduta = 0; // 607 pentru calculul DIO
        let totalVenituri = 0; // clasa 7 (Total sume Credit)
        let totalCheltuieli = 0; // clasa 6 (Total sume Debit)
        let reduceriComerciale = 0; // 709
        
        // Parcurge toate rândurile de date
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          const cont = String(row[contCol] || '').trim();
          if (!cont || !/^\d{3,4}/.test(cont)) continue; // Skip dacă nu e cont valid
          
          const contCode = cont.match(/^(\d{3,4})/)?.[1] || '';
          
          // Sold Final Debitor/Creditor (pentru conturi clasa 1-5)
          const soldFinalDebit = getNumValue(row, soldFinalDebitCol);
          const soldFinalCredit = getNumValue(row, soldFinalCreditCol);
          
          // Total sume Debit/Credit (pentru conturi clasa 6-7)
          const totalSumeDebit = getNumValue(row, totalSumeDebitCol);
          const totalSumeCredit = getNumValue(row, totalSumeCreditCol);
          
          // Extrage solduri specifice
          if (contCode === '4111') soldClienti = soldFinalDebit;
          if (contCode === '401') soldFurnizori = soldFinalCredit;
          if (contCode === '5121' || contCode === '5124' || contCode === '5125') soldBanca += soldFinalDebit;
          if (contCode === '5311') soldCasa = soldFinalDebit;
          
          // Stocuri (conturi 301, 302, 371)
          if (contCode === '371') soldStocuri = soldFinalDebit;
          if (contCode === '301') soldMateriiPrime = soldFinalDebit;
          if (contCode === '302') soldMateriale = soldFinalDebit;
          
          // Cost marfă vândută (607) pentru calculul DIO
          if (contCode === '607') costMarfaVanduta = totalSumeDebit;
          
          // Venituri (clasa 7) - Total sume Credit
          if (contCode.startsWith('7') && contCode !== '709') {
            totalVenituri += totalSumeCredit;
          }
          // Reduceri comerciale (709) - scădem din venituri
          if (contCode === '709') {
            reduceriComerciale = totalSumeCredit;
          }
          // Cheltuieli (clasa 6) - Total sume Debit
          if (contCode.startsWith('6')) {
            totalCheltuieli += totalSumeDebit;
          }
        }
        
        // Calculează CA net
        const revenue = Math.max(0, totalVenituri - reduceriComerciale);
        const expenses = totalCheltuieli;
        
        // Caută contul 121 pentru profit/pierdere CORECT
        const cont121 = structuredData.accounts.find((acc: any) => acc.code === '121');
        let profit = 0;
        
        if (cont121) {
          const debit = cont121.debit || 0;
          const credit = cont121.credit || 0;
          
          if (credit > debit) {
            // Sold CREDITOR = PROFIT
            profit = credit - debit;
            console.log(`✅ [PROFIT-EXTRACT] Cont 121 sold CREDITOR: +${profit} RON (PROFIT)`);
          } else if (debit > credit) {
            // Sold DEBITOR = PIERDERE (aplicăm MINUS!)
            profit = -(debit - credit);
            console.log(`✅ [PROFIT-EXTRACT] Cont 121 sold DEBITOR: ${profit} RON (PIERDERE)`);
          } else {
            profit = 0;
            console.log(`⚖️ [PROFIT-EXTRACT] Cont 121 echilibrat: 0 RON`);
          }
        } else {
          // FALLBACK: Dacă nu există cont 121, calculează din revenue - expenses
          profit = revenue - expenses;
          console.log(`⚠️ [PROFIT-EXTRACT] Cont 121 INEXISTENT - Calculat ca Revenue - Expenses: ${profit} RON`);
        }
        
        // Calculează indicatori
        deterministic_metadata.revenue = revenue;
        deterministic_metadata.expenses = expenses;
        deterministic_metadata.profit = profit;
        deterministic_metadata.soldClienti = soldClienti;
        deterministic_metadata.soldFurnizori = soldFurnizori;
        deterministic_metadata.soldBanca = soldBanca;
        deterministic_metadata.soldCasa = soldCasa;
        deterministic_metadata.soldStocuri = soldStocuri;
        deterministic_metadata.soldMateriiPrime = soldMateriiPrime;
        deterministic_metadata.soldMateriale = soldMateriale;
        
        // DSO: (Sold Clienți / CA perioadă) * 365
        if (revenue > 0) {
          deterministic_metadata.dso = Math.round((soldClienti / revenue) * 365);
        }
        
        // DPO: (Sold Furnizori / Cheltuieli) * 365
        if (expenses > 0) {
          deterministic_metadata.dpo = Math.round((soldFurnizori / expenses) * 365);
        }
        
        // DIO: (Stocuri totale / Cost marfă vândută) * 365
        const totalStocuri = soldStocuri + soldMateriiPrime + soldMateriale;
        if (costMarfaVanduta > 0 && totalStocuri > 0) {
          deterministic_metadata.dio = Math.round((totalStocuri / costMarfaVanduta) * 365);
        }
        
        // Cash Conversion Cycle: DSO + DIO - DPO
        if (deterministic_metadata.dso && deterministic_metadata.dpo) {
          const dioValue = deterministic_metadata.dio || 0;
          deterministic_metadata.cashConversionCycle = deterministic_metadata.dso + dioValue - deterministic_metadata.dpo;
        }
        
        console.log("✅ [METADATA-EXTRACT] METADATA FINALĂ (cu header):", deterministic_metadata);
      }
    } catch (calcError) {
      console.error("❌ Eroare calcul determinist:", calcError);
      console.log("⚠️ Continuăm cu extragerea din text AI");
    }

    if (!balanceText || balanceText.length < 100) {
      return new Response(
        JSON.stringify({
          error: "Excel-ul nu conține suficient text lizibil. Exportă balanța completă (cu toate coloanele: Solduri inițiale, Rulaje/Total sume, Solduri finale) din programul de contabilitate."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validare structură și detecție format numeric incorect
    const hasRequiredColumns = 
      (balanceText.toLowerCase().includes('solduri') || balanceText.toLowerCase().includes('sold')) &&
      (balanceText.toLowerCase().includes('rulaje') || balanceText.toLowerCase().includes('total sume')) &&
      (balanceText.toLowerCase().includes('finale') || balanceText.toLowerCase().includes('final'));
    
    if (!hasRequiredColumns) {
      console.log("AVERTISMENT: Structură balanță incompletă - verificare coloane");
    }

    // Verificare pattern-uri problematice de formatare (ex: 1.234,56)
    const romanianNumberPattern = /\d{1,3}(\.\d{3})+,\d{2}/g;
    const hasRomanianFormatting = romanianNumberPattern.test(balanceText);
    
    if (hasRomanianFormatting) {
      console.log("AVERTISMENT: Detectat format românesc de numere - se aplică conversie automată");
    }
    
    // Verifică dacă avem date numerice valide după parsare
    const hasValidNumbers = /\d+\.\d{2}/.test(balanceText);
    
    if (!hasValidNumbers) {
      console.log("EROARE CRITICĂ: Nu s-au detectat numere valide în format standard după parsare");
      return new Response(
        JSON.stringify({
          error: "Format numeric incorect detectat. Te rog exportă balanța din nou, asigurându-te că numerele sunt în format corect (ex: 1234.56)."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY nu este configurată");
      return new Response(
        JSON.stringify({ error: "Configurare incorectă a serviciului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 5 analize/minut per user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
        p_user_id: user.id,
        p_endpoint: "analyze-balance",
        p_max_requests: 5
      });

      if (!canProceed) {
        return new Response(
          JSON.stringify({ error: "Prea multe cereri de analiză. Te rog așteaptă un minut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===================================
    // [VERIFICARE ACCES ABONAMENT] - Opțiunea B
    // Blocare completă analize după trial pentru non-subscribers
    // ===================================
    console.log('[ACCESS-CHECK] Verificare drepturi de acces...');
    
    let validatedCount = 0;
    let userProfile: any = null;
    
    if (user) {
      // Numără analizele cu validare consiliu
      const { count, error: countError } = await supabaseClient
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('council_validation', 'is', null);
      
      if (!countError) {
        validatedCount = count || 0;
      }
      
      // Preia profilul utilizatorului
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('subscription_status, subscription_type, trial_ends_at')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        userProfile = profile;
      }
    }
    
    // Verifică dacă utilizatorul are drept de analiză
    const hasFreeAnalysesLeft = validatedCount < 6;
    const isInTrial = userProfile?.trial_ends_at && new Date(userProfile.trial_ends_at) > new Date();
    const hasActiveSubscription = userProfile?.subscription_status === 'active' && 
                                   ['entrepreneur', 'accounting_firm'].includes(userProfile?.subscription_type);
    
    const canAnalyze = hasFreeAnalysesLeft || isInTrial || hasActiveSubscription;
    
    console.log('[ACCESS-CHECK] Stare acces:', {
      hasActiveSubscription,
      isInTrial,
      trialEndsAt: userProfile?.trial_ends_at,
      hasFreeAnalysesLeft,
      validatedCount,
      canAnalyze
    });
    
    // OPȚIUNEA B: Blocare totală dacă nu are acces
    if (user && !canAnalyze) {
      console.log('🚫 [ACCESS-DENIED] Utilizator fără abonament activ - analiză blocată');
      
      return new Response(
        JSON.stringify({
          error: 'subscription_required',
          message: 'Abonamentul tău a expirat',
          details: {
            freeAnalysesUsed: validatedCount,
            trialExpired: !isInTrial,
            needsSubscription: true,
            upgradeMessage: `🔒 **Abonamentul tău a expirat**\n\nAi utilizat cele 6 analize gratuite și perioada de probă de 30 de zile s-a încheiat.\n\n**Pentru a continua să analizezi balanțe, alege un plan:**\n\n💼 **Plan Antreprenor** - 49 RON/lună\n• Analize nelimitate cu validare Consiliu AI\n• Chat AI strategic pentru decizii financiare\n• Toate funcționalitățile platformei\n\n🏢 **Plan Contabil** - 199 RON/lună\n• Tot ce include Antreprenor\n• Management clienți (CRM)\n• Workflow-uri automatizate\n• White-label și branding personalizat\n\n➡️ [Upgrade acum pentru a continua](/subscription)`
          }
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ [ACCESS-CHECK] Utilizator autorizat pentru analiză');

    // Check cache pentru balanțe identice (hash pe primele 1000 caractere)
    const textHash = balanceText.slice(0, 1000);
    const cacheKey = `balance_${textHash.length}_${textHash.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)}`;
    
    if (user) {
      const { data: cachedAnalysis } = await supabaseClient
        .from("chat_cache")
        .select("answer_text")
        .eq("question_hash", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cachedAnalysis?.answer_text) {
        console.log("Folosesc analiză din cache");
        return new Response(
          JSON.stringify({ analysis: cachedAnalysis.answer_text }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Trimit cerere către Lovable AI...");
    
    // FIX #17: Timeout de 45 secunde pentru API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Analizeaza urmatoarea balanta de verificare:\n\n${balanceText}` }
          ],
          max_tokens: 2048,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("Timeout: API call a depășit 45 secunde");
        return new Response(
          JSON.stringify({ error: "Timpul de așteptare a expirat. Te rog încearcă din nou." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw fetchError;
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Eroare AI Gateway:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limită de utilizare depășită. Te rog încearcă din nou peste câteva minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Te rog adaugă credite în Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Eroare la serviciul de analiză AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content;

    if (!analysis) {
      console.error("Răspuns AI invalid:", aiData);
      return new Response(
        JSON.stringify({ error: "Răspuns invalid de la serviciul AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analiză generată cu succes!");
    
    // 🔍 VALIDARE CU CONSILIUL DE AI-URI
    // Dacă utilizatorul a ajuns aici, înseamnă că are dreptul la analiză ȘI validare consiliu
    let councilValidation = null;
    
    try {
      console.log(`📊 [AI-COUNCIL] User authenticated: ${!!user}`);
      console.log(`📊 [AI-COUNCIL] Validated analyses count: ${validatedCount}`);
      
      // Determină statusul pentru logging
      const statusMsg = validatedCount < 6 
        ? `analiză ${validatedCount + 1}/6 gratuită`
        : isInTrial 
          ? `în perioada de trial (până la ${new Date(userProfile?.trial_ends_at).toLocaleDateString('ro-RO')})`
          : `cu abonament ${userProfile?.subscription_type}`;
      
      console.log(`✅ [AI-COUNCIL] Validare inclusă - ${statusMsg}`);
      console.log("🔍 [AI-COUNCIL] Starting automatic validation...");
      
      const councilResponse = await supabaseClient.functions.invoke('validate-analysis-with-council', {
        body: {
          metadata: deterministic_metadata,
          analysisText: analysis,
          balanceText: balanceText.slice(0, 5000),
          userId: user?.id || 'anonymous'
        }
      });
      
      if (councilResponse.error) {
        console.error("❌ [AI-COUNCIL] Validation error:", councilResponse.error);
      } else {
        councilValidation = councilResponse.data;
        console.log(`✅ [AI-COUNCIL] Validation complete - Verdict: ${councilValidation?.consensus?.verdict}`);
      }
    } catch (councilError) {
      console.error('❌ [AI-COUNCIL] Validation failed:', councilError);
      // Continue fără validare dacă apare eroare
    }
    
    // Cache analiza pentru 6 ore
    if (user && analysis && analysis.length > 100) {
      await supabaseClient.from("chat_cache").insert({
        question_hash: cacheKey,
        question_text: balanceText.slice(0, 500),
        answer_text: analysis,
        expires_at: new Date(Date.now() + 21600000).toISOString() // 6 ore
      });
    }
    
    // Extrage date REALE din balanță pentru validare
    const extractAccountValue = (accountCode: string): { finalBalance: number | null, exists: boolean } => {
      // Caută contul în balanța parsată - trebuie să fie pe o singură linie
      const lineRegex = new RegExp(`^.*${accountCode}[^\\n]*$`, 'gim');
      const lines = balanceText.match(lineRegex);
      
      if (!lines || lines.length === 0) {
        return { finalBalance: null, exists: false };
      }
      
      // Ia ultima linie găsită (cea mai relevantă)
      const accountLine = lines[lines.length - 1];
      
      // Extrage toate valorile numerice din linia contului
      const numbers = accountLine.match(/\d+\.\d{2}/g);
      
      if (!numbers || numbers.length === 0) {
        return { finalBalance: null, exists: false };
      }
      
      // Pentru conturile din clasa 1-5, soldurile finale sunt ultimele 2 valori (debitor și creditor)
      // Ia valoarea mai mare (sold final poate fi debitor SAU creditor, nu ambele)
      const lastTwo = numbers.slice(-2).map(n => parseFloat(n));
      const finalBalance = Math.max(...lastTwo);
      
      // Consideră contul inexistent dacă soldul final este 0 sau foarte mic (< 0.10 RON)
      const exists = finalBalance > 0.10;
      
      return { finalBalance: exists ? finalBalance : null, exists };
    };

    // Funcție pentru extragerea TUTUROR conturilor din balanță
    const extractAllAccounts = (balanceText: string): {
      class1to5: Array<{accountCode: string; accountName: string; finalBalanceDebit: number; finalBalanceCredit: number; netBalance: number; balanceType: 'debit' | 'credit'}>,
      class6to7: Array<{accountCode: string; accountName: string; totalDebit: number; totalCredit: number; isBalanced: boolean}>,
      anomalies: string[]
    } => {
      const class1to5: Array<{accountCode: string; accountName: string; finalBalanceDebit: number; finalBalanceCredit: number; netBalance: number; balanceType: 'debit' | 'credit'}> = [];
      const class6to7: Array<{accountCode: string; accountName: string; totalDebit: number; totalCredit: number; isBalanced: boolean}> = [];
      const anomalies: string[] = [];
      
      // Regex pentru linii de cont - flexibil pentru diverse formate
      const lines = balanceText.split('\n');
      
      for (const line of lines) {
        // Skip header lines și linii goale
        if (!line.trim() || line.includes('Simbol') || line.includes('CLASE') || line.includes('===')) continue;
        
        // Extrage cod cont (3-4 cifre la început de linie) - regex flexibil pentru CSV
        const codeMatch = line.match(/^\s*(\d{3,4})[^\d]/);
        if (!codeMatch) continue;
        
        const accountCode = codeMatch[1];
        const accountClass = parseInt(accountCode.charAt(0));
        
        // Extrage nume cont (text între cod și prima valoare numerică) - suport pentru virgulă
        const nameMatch = line.match(/^\s*\d{3,4}[,|\s]+([^0-9,|]+)/);
        const accountName = nameMatch ? nameMatch[1].trim() : 'Cont necunoscut';
        
        // Extrage toate valorile numerice din linie
        const numbers = line.match(/\d+\.\d{2}/g)?.map(v => parseFloat(v)) || [];
        
        if (numbers.length === 0) continue;
        
        if (accountClass >= 1 && accountClass <= 5) {
          // Clase 1-5: Extrage solduri finale (ultimele 2 valori)
          if (numbers.length >= 2) {
            const finalDebit = numbers[numbers.length - 2] || 0;
            const finalCredit = numbers[numbers.length - 1] || 0;
            
            // Skip conturi fără sold
            if (finalDebit < 0.10 && finalCredit < 0.10) continue;
            
            // ANOMALIE: Sold dublu (ambele coloane completate)
            if (finalDebit > 0.10 && finalCredit > 0.10) {
              anomalies.push(
                `🔴 ANOMALIE CONT ${accountCode}: Sold final DEBIT (${finalDebit.toFixed(2)} RON) ` +
                `ȘI CREDIT (${finalCredit.toFixed(2)} RON) simultan! Conturile 1-5 trebuie să aibă DOAR un sold.`
              );
            }
            
            const netBalance = finalDebit - finalCredit;
            const balanceType: 'debit' | 'credit' = Math.abs(finalDebit) > Math.abs(finalCredit) ? 'debit' : 'credit';
            
            class1to5.push({
              accountCode,
              accountName,
              finalBalanceDebit: finalDebit,
              finalBalanceCredit: finalCredit,
              netBalance,
              balanceType
            });
          }
        } else if (accountClass === 6 || accountClass === 7) {
          // Clase 6-7: Extrage rulaje totale
          // Format tipic: [soldInitDebit, soldInitCredit, rulajDebit, rulajCredit, soldFinalDebit, soldFinalCredit]
          // sau: [soldInitDebit, soldInitCredit, totalDebit, totalCredit, soldFinalDebit, soldFinalCredit]
          
          if (numbers.length >= 4) {
            // Ia valorile din mijloc (rulajele sau total sume)
            const totalDebit = numbers.length === 6 ? numbers[2] : numbers[0];
            const totalCredit = numbers.length === 6 ? numbers[3] : numbers[1];
            
            // Skip conturi fără activitate
            if (totalDebit < 0.10 && totalCredit < 0.10) continue;
            
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.10;
            
            if (!isBalanced) {
              anomalies.push(
                `⚠️ DEBALANSARE CONT ${accountCode} (${accountName}): Rulaje DEBIT (${totalDebit.toFixed(2)} RON) ` +
                `≠ CREDIT (${totalCredit.toFixed(2)} RON). Diferență: ${Math.abs(totalDebit - totalCredit).toFixed(2)} RON`
              );
            }
            
            class6to7.push({
              accountCode,
              accountName,
              totalDebit,
              totalCredit,
              isBalanced
            });
          }
        }
      }
      
      console.log(`✅ Extrase ${class1to5.length} conturi din clasele 1-5`);
      console.log(`✅ Extrase ${class6to7.length} conturi din clasele 6-7`);
      console.log(`⚠️ Detectate ${anomalies.length} anomalii`);
      
      return { class1to5, class6to7, anomalies };
    };

    // Funcție pentru gruparea conturilor pe clase
    const groupAccountsByClass = (accounts: Array<{accountCode: string; accountName: string; finalBalanceDebit: number; finalBalanceCredit: number; netBalance: number; balanceType: 'debit' | 'credit'}>) => {
      return {
        class1: accounts.filter(a => a.accountCode.startsWith('1')),
        class2: accounts.filter(a => a.accountCode.startsWith('2')),
        class3: accounts.filter(a => a.accountCode.startsWith('3')),
        class4: accounts.filter(a => a.accountCode.startsWith('4')),
        class5: accounts.filter(a => a.accountCode.startsWith('5'))
      };
    };

    const groupExpenseRevenueAccounts = (accounts: Array<{accountCode: string; accountName: string; totalDebit: number; totalCredit: number; isBalanced: boolean}>) => {
      return {
        class6: accounts.filter(a => a.accountCode.startsWith('6')),
        class7: accounts.filter(a => a.accountCode.startsWith('7'))
      };
    };

    // Pornește cu metadata deterministă calculată din Excel
    const metadata: Record<string, number> = { ...deterministic_metadata };
    
    console.log("🔍 Cautare sectiune INDICATORI FINANCIARI in analiza...");
    
    // Încearcă mai multe variante de formatare pentru secțiunea indicatorilor
    let indicatorsMatch = analysis.match(/===\s*INDICATORI\s+FINANCIARI\s*===([\s\S]*?)(?=\n\n|===|$)/i);
    
    if (!indicatorsMatch) {
      // Încearcă varianta fără spații extra
      indicatorsMatch = analysis.match(/===INDICATORI FINANCIARI===([\s\S]*?)(?=\n\n|===|$)/i);
    }
    
    if (!indicatorsMatch) {
      // Încearcă varianta cu asterisc
      indicatorsMatch = analysis.match(/\*\*\*\s*INDICATORI\s+FINANCIARI\s*\*\*\*([\s\S]*?)(?=\n\n|\*\*\*|$)/i);
    }
    
    if (indicatorsMatch) {
      console.log("✅ Sectiune INDICATORI FINANCIARI gasita!");
      const indicators = indicatorsMatch[1];
      console.log("📊 Continut sectiune:", indicators.substring(0, 200));
      
      // Regex mai flexibile pentru extragerea valorilor (acceptă separatori de mii și spații)
      const dsoMatch = indicators.match(/DSO[:\s]+(\d+(?:[.,]\d+)?)/i);
      const dpoMatch = indicators.match(/DPO[:\s]+(\d+(?:[.,]\d+)?)/i);
      const cccMatch = indicators.match(/CCC[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const ebitdaMatch = indicators.match(/EBITDA[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const caMatch = indicators.match(/CA[:\s]+(\d+(?:[.,]\d+)?)/i);
      const cheltuieliMatch = indicators.match(/Cheltuieli[:\s]+(\d+(?:[.,]\d+)?)/i);
      const profitMatch = indicators.match(/Profit[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const furnizoriMatch = indicators.match(/Sold\s+Furnizori[:\s]+(\d+(?:[.,]\d+)?)/i);
      const clientiMatch = indicators.match(/Sold\s+Clienti[:\s]+(\d+(?:[.,]\d+)?)/i);
      const bancaMatch = indicators.match(/Sold\s+Banca[:\s]+(\d+(?:[.,]\d+)?)/i);
      const casaMatch = indicators.match(/Sold\s+Casa[:\s]+(\d+(?:[.,]\d+)?)/i);
      
      // Populează metadata (elimină separatorii de mii)
      const parseValue = (val: string) => parseFloat(val.replace(/,/g, ''));
      
      if (dsoMatch) metadata.dso = parseValue(dsoMatch[1]);
      if (dpoMatch) metadata.dpo = parseValue(dpoMatch[1]);
      if (cccMatch) metadata.cashConversionCycle = parseValue(cccMatch[1]);
      if (ebitdaMatch) metadata.ebitda = parseValue(ebitdaMatch[1]);
      if (caMatch) metadata.revenue = parseValue(caMatch[1]);
      if (cheltuieliMatch) metadata.expenses = parseValue(cheltuieliMatch[1]);
      if (profitMatch) metadata.profit = parseValue(profitMatch[1]);
      if (furnizoriMatch) metadata.soldFurnizori = parseValue(furnizoriMatch[1]);
      if (clientiMatch) metadata.soldClienti = parseValue(clientiMatch[1]);
      if (bancaMatch) metadata.soldBanca = parseValue(bancaMatch[1]);
      if (casaMatch) metadata.soldCasa = parseValue(casaMatch[1]);
      
      console.log("📈 Metadata extrase:", Object.keys(metadata).length, "indicatori");
    } else {
      console.warn("⚠️ Sectiune INDICATORI FINANCIARI NU a fost gasita in analiza!");
      console.log("🔍 Ultimele 500 caractere din analiza:", analysis.slice(-500));
      
      // FALLBACK: Încearcă să extragi valorile din întregul text al analizei
      console.log("🔄 Incerc extragere fallback din text complet...");
      
      const parseFromText = (regex: RegExp) => {
        const match = analysis.match(regex);
        return match ? parseFloat(match[1].replace(/[,\s]/g, '')) : undefined;
      };
      
      const dso = parseFromText(/DSO[:\s]+(\d+(?:[.,]\d+)?)/i);
      const dpo = parseFromText(/DPO[:\s]+(\d+(?:[.,]\d+)?)/i);
      const ccc = parseFromText(/CCC[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const ebitda = parseFromText(/EBITDA[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const revenue = parseFromText(/(?:CA|Cifra de afaceri)[:\s]+(\d+(?:[.,]\d+)?)/i);
      const expenses = parseFromText(/Cheltuieli[:\s]+(\d+(?:[.,]\d+)?)/i);
      const profit = parseFromText(/Profit[:\s]+(-?\d+(?:[.,]\d+)?)/i);
      const soldFurnizori = parseFromText(/Sold\s+Furnizori[:\s]+(\d+(?:[.,]\d+)?)/i);
      const soldClienti = parseFromText(/Sold\s+(?:Clienti|Clienți)[:\s]+(\d+(?:[.,]\d+)?)/i);
      const soldBanca = parseFromText(/Sold\s+Banca[:\s]+(\d+(?:[.,]\d+)?)/i);
      const soldCasa = parseFromText(/Sold\s+Casa[:\s]+(\d+(?:[.,]\d+)?)/i);
      
      // Atribuie doar valorile non-undefined
      if (dso !== undefined) metadata.dso = dso;
      if (dpo !== undefined) metadata.dpo = dpo;
      if (ccc !== undefined) metadata.cashConversionCycle = ccc;
      if (ebitda !== undefined) metadata.ebitda = ebitda;
      if (revenue !== undefined) metadata.revenue = revenue;
      if (expenses !== undefined) metadata.expenses = expenses;
      if (profit !== undefined) metadata.profit = profit;
      if (soldFurnizori !== undefined) metadata.soldFurnizori = soldFurnizori;
      if (soldClienti !== undefined) metadata.soldClienti = soldClienti;
      if (soldBanca !== undefined) metadata.soldBanca = soldBanca;
      if (soldCasa !== undefined) metadata.soldCasa = soldCasa;
      
      console.log("📊 Metadata fallback extrase:", Object.keys(metadata).length, "indicatori");
    }
    
    // Extrage structura completă a balanței
    console.log("🔍 Extragere structură completă balanță...");
    let { class1to5, class6to7, anomalies: structuralAnomalies } = extractAllAccounts(balanceText);

    // FAZA 2: Validare Plan Contabil General RO 2025 (LAYER SUPLIMENTAR)
    // Import validation function
    const { validateAccountCode } = await import('../_shared/planContabilGeneral.ts');
    
    console.log("🔍 [VALIDATION LAYER] Verificare Plan Contabil General...");
    const invalidAccountsWarnings: string[] = [];

    for (const acc of class1to5) {
      const validation = validateAccountCode(acc.accountCode);
      if (!validation.valid) {
        invalidAccountsWarnings.push(
          `⚠️ Cont ${acc.accountCode}: ${validation.error}`
        );
      }
    }

    // Adaugă warnings în structuralAnomalies (nu blochează analiza!)
    if (invalidAccountsWarnings.length > 0) {
      structuralAnomalies.push(
        `\n📋 **VERIFICARE PLAN CONTABIL:**\n` +
        invalidAccountsWarnings.slice(0, 5).join('\n') + // Maxim 5 pentru a nu polua
        (invalidAccountsWarnings.length > 5 ? `\n... și încă ${invalidAccountsWarnings.length - 5} conturi invalide` : '')
      );
    }

    // FALLBACK: Dacă extractAllAccounts nu găsește conturi, folosește structuredData
    if (class1to5.length === 0 && class6to7.length === 0 && structuredData.accounts.length > 0) {
      console.log("⚠️ [FALLBACK] extractAllAccounts nu a găsit conturi - folosesc structuredData.accounts");
      
      // Convertește structuredData.accounts în format AccountBalance/AccountActivity
      structuredData.accounts.forEach((acc: any) => {
        const accountClass = parseInt(acc.code.charAt(0));
        const finalDebit = acc.debit || 0;
        const finalCredit = acc.credit || 0;
        
        if (accountClass >= 1 && accountClass <= 5) {
          if (finalDebit > 0.10 || finalCredit > 0.10) {
            // Detectează anomalii: sold dublu
            if (finalDebit > 0.10 && finalCredit > 0.10) {
              structuralAnomalies.push(
                `🔴 ANOMALIE CONT ${acc.code}: Sold final DEBIT (${finalDebit.toFixed(2)} RON) ` +
                `ȘI CREDIT (${finalCredit.toFixed(2)} RON) simultan!`
              );
            }
            
            class1to5.push({
              accountCode: acc.code,
              accountName: acc.name || `Cont ${acc.code}`,
              finalBalanceDebit: finalDebit,
              finalBalanceCredit: finalCredit,
              netBalance: finalDebit - finalCredit,
              balanceType: finalDebit > finalCredit ? 'debit' : 'credit'
            });
          }
        } else if (accountClass === 6 || accountClass === 7) {
          // Pentru clase 6-7, folosim totalDebit/totalCredit dacă sunt disponibile
          const totalDebit = acc.totalDebit || finalDebit || 0;
          const totalCredit = acc.totalCredit || finalCredit || 0;
          
          if (totalDebit > 0.10 || totalCredit > 0.10) {
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.10;
            
            if (!isBalanced) {
              structuralAnomalies.push(
                `⚠️ DEBALANSARE CONT ${acc.code}: Rulaje DEBIT (${totalDebit.toFixed(2)} RON) ` +
                `≠ CREDIT (${totalCredit.toFixed(2)} RON)`
              );
            }
            
            class6to7.push({
              accountCode: acc.code,
              accountName: acc.name || `Cont ${acc.code}`,
              totalDebit,
              totalCredit,
              isBalanced
            });
          }
        }
      });
      
      console.log(`✅ [FALLBACK] Importate ${class1to5.length} conturi clase 1-5, ${class6to7.length} conturi clase 6-7`);
    }

    const groupedBalance = groupAccountsByClass(class1to5);
    const groupedActivity = groupExpenseRevenueAccounts(class6to7);

    // FAZA 0: Type assertion pentru a rezolva build errors
    // Prioritizează metadata deterministă peste cea extrasă din text
    // (păstrează doar valorile AI dacă nu există în deterministic)
    const finalMetadata: any = { 
      ...metadata, 
      ...deterministic_metadata,
      // Adaugă structura completă
      class1_FixedAssets: groupedBalance.class1,
      class2_CurrentAssets: groupedBalance.class2,
      class3_Inventory: groupedBalance.class3,
      class4_ThirdParties: groupedBalance.class4,
      class5_Treasury: groupedBalance.class5,
      class6_Expenses: groupedActivity.class6,
      class7_Revenue: groupedActivity.class7,
      anomalies: structuralAnomalies.length > 0 ? structuralAnomalies : undefined
    };
    console.log("✅ Metadata final (prioritate determinist + structură completă):", Object.keys(finalMetadata).length, "chei");
    console.log(`   - Calculat determinist: ${Object.keys(deterministic_metadata).length} indicatori`);
    console.log(`   - Extras din AI: ${Object.keys(metadata).length - Object.keys(deterministic_metadata).length} indicatori`);
    console.log(`   - Conturi clase 1-5: ${class1to5.length}`);
    console.log(`   - Conturi clase 6-7: ${class6to7.length}`);
    console.log(`   - Anomalii structurale: ${structuralAnomalies.length}`);
    
    // VALIDARE CRITICĂ: Verifică că valorile din alertele AI corespund cu balanța reală
    const analysisNumbers = analysis.match(/(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?)\s*RON/g) || [];
    const corrections: string[] = [];
    
    // Verifică alerte despre conturi specifice
    const accountAlertPattern = /contul?\s+(\d{3,4})[^0-9]*?(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?)\s*RON/gi;
    let alertMatch;
    while ((alertMatch = accountAlertPattern.exec(analysis)) !== null) {
      const accountCode = alertMatch[1];
      const reportedValue = parseFloat(alertMatch[2].replace(/[,.]/g, ''));
      const accountData = extractAccountValue(accountCode);
      
      // Verifică dacă AI-ul menționează un cont care nu există sau are sold 0
      if (!accountData.exists) {
        corrections.push(
          `🔴 **EROARE CRITICĂ**: Analiza AI menționează contul ${accountCode} cu ${reportedValue.toLocaleString('ro-RO')} RON, ` +
          `dar acest cont **NU APARE** în balanța pentru perioada curentă sau are sold final 0.00 RON!\n\n` +
          `**CONCLUZIE**: Contul ${accountCode} este INEXISTENT sau ÎNCHIS în această perioadă. ` +
          `AI-ul a inventat această informație! Ignoră orice alertă sau analiză legată de acest cont.`
        );
      } else if (accountData.finalBalance !== null && Math.abs(reportedValue - accountData.finalBalance) > 1) {
        // Verifică dacă valoarea raportată este greșită
        corrections.push(
          `⚠️ **CORECȚIE AUTOMATĂ**: Analiza AI a raportat o valoare incorectă pentru contul ${accountCode}.\n` +
          `• Valoare GREȘITĂ raportată de AI: ${reportedValue.toLocaleString('ro-RO')} RON\n` +
          `• Valoare CORECTĂ din balanță (sold final): ${accountData.finalBalance.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON\n` +
          `**Te rugăm să folosești doar valoarea corectă din balanță!**`
        );
      }
    }
    
    // Verifică dacă user-ul este admin pentru a afișa corecțiile
    let isAdmin = false;
    if (user) {
      const { data: adminCheck } = await supabaseClient.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      isAdmin = adminCheck === true;
    }
    
    if (corrections.length > 0) {
      // Loghează corecțiile pentru debugging (vizibile în Supabase logs)
      console.log('⚠️ [CORRECTIONS] Detected', corrections.length, 'automatic corrections');
      corrections.forEach((corr, idx) => {
        console.log(`   Correction ${idx + 1}:`, corr.substring(0, 100));
      });
      
      // Adaugă corecțiile în analiză DOAR pentru admini
      if (isAdmin) {
        const correctionsSection = `\n\n🔴 **CORECȚII AUTOMATE - VALORI INCORECTE DETECTATE ÎN ANALIZĂ** (Vizibil doar pentru admin)\n\n${corrections.join('\n\n')}`;
        return new Response(
          JSON.stringify({ 
            analysis: analysis + correctionsSection,
            metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Pentru useri normali, returnăm analiza fără corecții (dar cu metadata corectată)
    }
    
    // FAZA 5: Feature flag pentru activare/dezactivare validări
    const enableAdvancedValidations = Deno.env.get('ENABLE_ADVANCED_VALIDATIONS') !== 'false'; // default: true
    
    const validationWarnings: string[] = [];
    
    // FAZA 3: Validări formule contabile (LAYER SUPLIMENTAR)
    if (enableAdvancedValidations) {
      console.log("🔍 [VALIDATION LAYER] Validări avansate ACTIVE");
      
      // VALIDARE 1: Total Activ = Total Pasiv
      console.log("🔍 [VALIDATION LAYER] Verificare echilibru bilanț (Activ = Pasiv)...");
      
      const totalActiv = [
        ...groupedBalance.class1.filter((a: any) => a.balanceType === 'debit'),
        ...groupedBalance.class2.filter((a: any) => a.balanceType === 'debit'),
        ...groupedBalance.class3.filter((a: any) => a.balanceType === 'debit'),
        ...groupedBalance.class4.filter((a: any) => a.balanceType === 'debit'),
        ...groupedBalance.class5.filter((a: any) => a.balanceType === 'debit')
      ].reduce((sum: number, acc: any) => sum + acc.netBalance, 0);

      const totalPasiv = [
        ...groupedBalance.class1.filter((a: any) => 
          (a.accountCode.startsWith('10') || a.accountCode.startsWith('11') || a.accountCode === '121') && 
          a.balanceType === 'credit'
        ),
        ...groupedBalance.class4.filter((a: any) => a.balanceType === 'credit')
      ].reduce((sum: number, acc: any) => sum + Math.abs(acc.netBalance), 0);

      const diferentaBilant = Math.abs(totalActiv - totalPasiv);

      if (diferentaBilant > 10) {
        const bilantErrorWarning = 
          `🔴 **EROARE CRITICĂ BILANȚ - NEECHILIBRAT!**\n\n` +
          `• Total ACTIV: ${totalActiv.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• Total PASIV: ${totalPasiv.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• **DIFERENȚĂ: ${diferentaBilant.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON** ⚠️\n\n` +
          `**CAUZE POSIBILE:**\n` +
          `1. Balanță NEVALIDATĂ din programul contabil\n` +
          `2. Înregistrări contabile incomplete sau eronate\n` +
          `3. Lipsă regularizări de inventar/amortizare\n` +
          `4. Diferențe din evaluare la cursul valutar (dacă aveți tranzacții în valută)\n\n` +
          `**ACȚIUNE URGENTĂ NECESARĂ:**\n` +
          `✓ Verificați în programul contabil raportul "Balanță de verificare"\n` +
          `✓ Asigurați-vă că Total Activ = Total Pasiv înainte de export\n` +
          `✓ Validați toate înregistrările contabile din perioada curentă\n` +
          `✓ Contactați un contabil autorizat pentru corectarea erorilor\n\n` +
          `⛔ **ACEASTĂ BALANȚĂ NU POATE FI FOLOSITĂ PENTRU RAPORTĂRI OFICIALE!**`;
        
        validationWarnings.push(bilantErrorWarning);
        console.error(`🔴 [VALIDATION] BILANȚ NEECHILIBRAT! Diferență: ${diferentaBilant} RON`);
      }

      // VALIDARE 2: Profit = Venituri - Cheltuieli
      console.log("🔍 [VALIDATION LAYER] Verificare formulă Profit = Venituri - Cheltuieli...");

      const totalVenituri = groupedActivity.class7.reduce((sum: number, acc: any) => sum + acc.totalCredit, 0);
      const totalCheltuieli = groupedActivity.class6.reduce((sum: number, acc: any) => sum + acc.totalDebit, 0);
      const rezultatCalculat = totalVenituri - totalCheltuieli;
      const rezultatCont121 = groupedBalance.class1.find((a: any) => a.accountCode === '121')?.netBalance || 0;
      const diferentaRezultat = Math.abs(rezultatCalculat - Math.abs(rezultatCont121));

      if (diferentaRezultat > 10) {
        const profitMismatchWarning = 
          `⚠️ **NECONCORDANȚĂ REZULTAT FINANCIAR**\n\n` +
          `• Total Venituri (clasa 7): ${totalVenituri.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• Total Cheltuieli (clasa 6): ${totalCheltuieli.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• Rezultat CALCULAT (7 - 6): ${rezultatCalculat.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• Sold Contul 121: ${Math.abs(rezultatCont121).toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
          `• **DIFERENȚĂ: ${diferentaRezultat.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON** ⚠️\n\n` +
          `**CAUZE POSIBILE:**\n` +
          `1. Operațiuni de regularizare neînregistrate (amortizări, provizioane)\n` +
          `2. Venituri/cheltuieli în avans (conturi 471/472) neluate în calcul\n` +
          `3. Erori de înregistrare în conturile de venituri sau cheltuieli\n` +
          `4. Reclasificări neefectuate la închiderea lunii/anului\n\n` +
          `**RECOMANDARE:** Verificați concordanța între contul 121 și diferența clasa 7 - clasa 6 în programul contabil.`;
        
        validationWarnings.push(profitMismatchWarning);
        console.warn(`⚠️ [VALIDATION] Rezultat neconcordant! Diferență: ${diferentaRezultat} RON`);
      }

      // VALIDARE 3: TVA (doar dacă firma este plătitoare de TVA)
      console.log("🔍 [VALIDATION LAYER] Verificare formule TVA...");

      const tvColectata = groupedBalance.class4.find((a: any) => a.accountCode === '4427')?.netBalance || 0;
      const tvDeductibila = groupedBalance.class4.find((a: any) => a.accountCode === '4426')?.netBalance || 0;
      const tvDePlata = groupedBalance.class4.find((a: any) => a.accountCode === '4423')?.netBalance || 0;

      if (tvColectata > 0 || tvDeductibila > 0) {
        const tvCalculat = Math.abs(tvColectata) - Math.abs(tvDeductibila);
        if (Math.abs(Math.abs(tvDePlata) - Math.abs(tvCalculat)) > 1) {
          const tvaWarning = 
            `⚠️ **NECONCORDANȚĂ TVA**\n\n` +
            `• TVA Colectată (4427): ${Math.abs(tvColectata).toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
            `• TVA Deductibilă (4426): ${Math.abs(tvDeductibila).toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
            `• TVA de plată (calculat): ${Math.abs(tvCalculat).toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON\n` +
            `• TVA de plată (cont 4423): ${Math.abs(tvDePlata).toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON`;
          
          validationWarnings.push(tvaWarning);
        }
      }

      // FAZA 6: Audit Trail (adaugă în finalMetadata)
      finalMetadata.auditTrail = {
        timestamp: new Date().toISOString(),
        validationsRun: true,
        balanceValidation: {
          totalActiv,
          totalPasiv,
          diferenta: diferentaBilant,
          status: diferentaBilant <= 10 ? 'OK' : 'ERROR'
        },
        profitValidation: {
          totalVenituri,
          totalCheltuieli,
          rezultatCalculat,
          rezultatCont121: Math.abs(rezultatCont121),
          diferenta: diferentaRezultat,
          status: diferentaRezultat <= 10 ? 'OK' : 'WARNING'
        },
        tvaValidation: (tvColectata > 0 || tvDeductibila > 0) ? {
          tvColectata: Math.abs(tvColectata),
          tvDeductibila: Math.abs(tvDeductibila),
          tvDePlata: Math.abs(tvDePlata),
          tvCalculat: Math.abs(tvColectata) - Math.abs(tvDeductibila),
          status: 'VERIFICAT'
        } : null
      };
    } else {
      console.log("⏭️ [VALIDATION LAYER] Validări avansate DEZACTIVATE");
    }
    
    // Adaugă warnings în finalMetadata.anomalies (NU înlocuiește, adaugă)
    if (validationWarnings.length > 0) {
      const existingAnomalies = finalMetadata.anomalies || [];
      finalMetadata.anomalies = [
        ...existingAnomalies,
        ...validationWarnings
      ];
    }
    
    // Validare DSO folosind finalMetadata
    if (finalMetadata.dso && finalMetadata.dso > 90) {
      validationWarnings.push(`⚠️ ALERTĂ CRITICĂ: DSO extrem de ridicat (${finalMetadata.dso} zile) - Banii sunt blocați în creanțe prea mult timp`);
    }
    
    // Validare Cash flow negativ
    if (finalMetadata.revenue && finalMetadata.expenses) {
      if (finalMetadata.expenses > finalMetadata.revenue) {
        validationWarnings.push(`🔴 PIERDERE GARANTATĂ: Cheltuielile (${finalMetadata.expenses.toLocaleString('ro-RO')}) depășesc veniturile (${finalMetadata.revenue.toLocaleString('ro-RO')})`);
      }
    }
    
    // Validare plafon casă folosind finalMetadata
    if (finalMetadata.soldCasa && finalMetadata.soldCasa > 50000) {
      validationWarnings.push(`⛔ NELEGAL: Plafon casă depășit! Aveți ${finalMetadata.soldCasa.toLocaleString('ro-RO')} RON în casă. Maximum legal: 50.000 RON`);
    }
    
    // Validare CRITICĂ: Verifică dacă profitul din metadata corespunde cu contul 121
    if (finalMetadata.profit !== undefined && structuredData.accounts.length > 0) {
      const cont121 = structuredData.accounts.find((acc: any) => acc.code === '121');
      
      if (cont121) {
        const debit = cont121.debit || 0;
        const credit = cont121.credit || 0;
        const soldCont121 = (credit > debit) ? (credit - debit) : -(debit - credit);
        
        // Verifică dacă metadata.profit se potrivește cu soldul contului 121
        if (Math.abs(finalMetadata.profit - soldCont121) > 1) {
          console.warn(`⚠️ [VALIDATION] DISCREPANȚĂ PROFIT: metadata=${finalMetadata.profit}, cont 121=${soldCont121}`);
          
          // Prioritizează soldul contului 121 (este sursa de adevăr!)
          finalMetadata.profit = soldCont121;
          console.log(`✅ [VALIDATION] Profitul CORECTAT la valoarea din cont 121: ${soldCont121} RON`);
          
          validationWarnings.push(
            `🔴 **CORECȚIE AUTOMATĂ**: Profitul a fost corectat de la ${finalMetadata.profit} RON la ${soldCont121} RON ` +
            `bazat pe soldul real al contului 121.`
          );
        }
      }
    }
    
    // Validare CRITICĂ: Verifică dacă interpretarea profitului/pierderii este corectă
    if (finalMetadata.profit !== undefined) {
      const profitValue = finalMetadata.profit;
      const analysisLower = analysis.toLowerCase();
      
      // Detectează contradicții în interpretarea profitului
      if (profitValue < 0 && 
          (analysisLower.includes('profit de') || analysisLower.includes('profitul de')) && 
          !analysisLower.includes('pierdere')) {
        validationWarnings.push(
          `🔴 **CORECȚIE CRITICĂ**: Analiza menționează "profit" dar contul 121 are sold DEBITOR (${Math.abs(profitValue).toLocaleString('ro-RO')} RON), ` +
          `ceea ce înseamnă de fapt **PIERDERE**! În contabilitate:\n` +
          `• Sold DEBITOR pe contul 121 = PIERDERE ❌\n` +
          `• Sold CREDITOR pe contul 121 = PROFIT ✅\n\n` +
          `**Concluzie corectă**: Compania a înregistrat o **PIERDERE de ${Math.abs(profitValue).toLocaleString('ro-RO')} RON**, NU profit!`
        );
      } else if (profitValue > 0 && 
                 (analysisLower.includes('pierdere de') || analysisLower.includes('pierderea de')) && 
                 !analysisLower.includes('profit')) {
        validationWarnings.push(
          `🔴 **CORECȚIE CRITICĂ**: Analiza menționează "pierdere" dar contul 121 are sold CREDITOR (${profitValue.toLocaleString('ro-RO')} RON), ` +
          `ceea ce înseamnă de fapt **PROFIT**! În contabilitate:\n` +
          `• Sold CREDITOR pe contul 121 = PROFIT ✅\n` +
          `• Sold DEBITOR pe contul 121 = PIERDERE ❌\n\n` +
          `**Concluzie corectă**: Compania a înregistrat un **PROFIT de ${profitValue.toLocaleString('ro-RO')} RON**, NU pierdere!`
        );
      }
    }
    
    // Adaugă warnings la sfârșitul analizei dacă există
    if (validationWarnings.length > 0) {
      const warningsSection = `\n\n🚨 **ALERTE AUTOMATE DE VALIDARE**\n\n${validationWarnings.join('\n\n')}`;
      
      // Validare metadata: trebuie să aibă cel puțin un indicator > 0 SAU cel puțin 3 indicatori != 0
      const metadataValues = Object.values(finalMetadata).filter(v => typeof v === 'number');
      const hasValidData = metadataValues.some(v => v > 0) || metadataValues.filter(v => v !== 0).length >= 3;
      
      // Adaugă badge consiliu AI
      let finalAnalysisWithWarnings = analysis + warningsSection;
      if (councilValidation) {
        if (councilValidation.validated && councilValidation.confidence >= 80) {
          finalAnalysisWithWarnings += `\n\n---\n✅ **Validat de Consiliul AI** (${councilValidation.confidence}%)\n`;
        } else if (councilValidation.consensus?.verdict === "REQUIRES_REVIEW") {
          finalAnalysisWithWarnings += `\n\n---\n⚠️ **Consiliul AI recomandă verificare suplimentară**\n`;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          analysis: finalAnalysisWithWarnings,
          metadata: hasValidData ? finalMetadata : null,
          councilValidation: councilValidation
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validare metadata: trebuie să aibă cel puțin un indicator > 0 SAU cel puțin 3 indicatori != 0
    const metadataValues = Object.values(finalMetadata).filter(v => typeof v === 'number');
    const hasValidData = metadataValues.some(v => v > 0) || metadataValues.filter(v => v !== 0).length >= 3;
    
    // Adaugă badge de validare consiliu AI la analiza finală
    let finalAnalysisText = analysis;
    if (councilValidation) {
      if (councilValidation.validated && councilValidation.confidence >= 80) {
        finalAnalysisText += `\n\n---\n✅ **Validat de Consiliul AI** (${councilValidation.consensus.total}/3 AI-uri, Confidence: ${councilValidation.confidence}%)\n`;
        finalAnalysisText += `Această analiză a fost verificată de ${councilValidation.aiResponses.map((r: any) => r.provider).join(', ').toUpperCase()}.\n`;
        
        // Afișează consensul pe indicatori
        if (councilValidation.agreements) {
          const consensusCount = councilValidation.consensus.indicatorsWithConsensus || 0;
          finalAnalysisText += `\n📊 Consens pe ${consensusCount}/10 indicatori financiari\n`;
        }
        
        if (councilValidation.recommendations && councilValidation.recommendations.length > 0) {
          finalAnalysisText += `\n**Recomandări consiliu:**\n${councilValidation.recommendations.slice(0, 3).map((r: string) => `• ${r}`).join('\n')}\n`;
        }
      } else if (councilValidation.consensus?.verdict === "REQUIRES_REVIEW") {
        finalAnalysisText += `\n\n---\n⚠️ **Necesită Verificare**: Consiliul AI a detectat discrepanțe (${councilValidation.discrepancies?.length || 0} indicatori în dezacord).\n`;
        
        if (councilValidation.discrepancies && councilValidation.discrepancies.length > 0) {
          finalAnalysisText += `\n**Discrepanțe detectate:**\n`;
          councilValidation.discrepancies.slice(0, 3).forEach((d: any) => {
            finalAnalysisText += `• ${d.field}: ${d.reason}\n`;
          });
        }
        
        if (councilValidation.alerts && councilValidation.alerts.length > 0) {
          finalAnalysisText += `\n**Alerte consiliu:**\n${councilValidation.alerts.slice(0, 3).map((a: string) => `• ${a}`).join('\n')}\n`;
        }
      } else {
        // Confidence moderat (70-80%)
        finalAnalysisText += `\n\n---\n⚡ **Validare Consiliu AI** (${councilValidation.consensus.total}/3 AI-uri, Confidence: ${councilValidation.confidence}%)\n`;
        finalAnalysisText += `Analiză verificată de consiliul AI cu consens parțial.\n`;
        
        if (councilValidation.discrepancies && councilValidation.discrepancies.length > 0) {
          finalAnalysisText += `\n⚠️ Atenție: ${councilValidation.discrepancies.length} indicatori fără consens clar.\n`;
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        analysis: finalAnalysisText,
        metadata: hasValidData ? finalMetadata : null,
        councilValidation: councilValidation,
        structuredData: structuredData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // ✅ SECURITY FIX: Sanitize error messages - don't expose internal details
    console.error("Eroare în analyze-balance:", error);
    return new Response(
      JSON.stringify({
        error: "A apărut o eroare tehnică la procesarea fișierului. Te rog verifică formatul și încearcă din nou."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
