/**
 * PROMPT COMPLET PENTRU ANALIZĂ BALANȚE CONTABILE
 * 
 * Acest fișier centralizează ÎNTREGUL prompt de analiză financiară
 * folosit atât de analyze-balance cât și de chat-ai.
 * 
 * O singură sursă de adevăr pentru toate regulile și instrucțiunile!
 */

export const FULL_ANALYSIS_PROMPT = `Analizeaza balanta atasata urmand urmatoarele Instrucțiuni:

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

**CLASE 1-5 (Balanță - Active/Pasive/Capital):**
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

// Export pentru utilizare în edge functions
export function getFullAnalysisPrompt(): string {
  return FULL_ANALYSIS_PROMPT;
}
