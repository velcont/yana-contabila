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

Conturile din clasa 1, 2, 3, 4, 5 se analizează doar pe coloana Solduri finale Debitoare sau Creditoare. Conturile din clasa 6 și 7 se analizează doar pe coloana Total sume Debitoare și Creditoare. Conturile din clasa 1, 2, 3, 4, 5 trebuie să aibă ori Solduri finale Debitoare ori doar Solduri finale Creditoare, nu pot să aibă și una și alta. În schimb, conturile din clasa 6 și 7 în coloana Total sume Debitoare și în coloana Total sume Creditoare trebuie să aibă aceleași sume. Dacă nu este așa, înseamnă că sunt anomalii în balanță.

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
    if (!excelBase64) {
      return new Response(
        JSON.stringify({ error: "Lipsește fișierul Excel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        console.warn("⚠️ [METADATA-EXTRACT] NU s-au găsit coloanele necesare - ACTIVARE FALLBACK FĂRĂ HEADER");
        
        // Strategie alternativă: caută conturi cunoscute (4111, 401, 5121, 7xx, 6xx) direct în celule
        let soldClienti = 0, soldFurnizori = 0, soldBanca = 0, soldCasa = 0;
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
            
            // Extrage valori din celulele următoare (asumă structură: Cont, ..., Sold Deb, Sold Cred, Total Deb, Total Cred)
            const extractNum = (colIdx: number): number => {
              if (colIdx >= row.length) return 0;
              const val = row[colIdx];
              if (val === null || val === undefined || val === '') return 0;
              const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
              return isNaN(num) ? 0 : num;
            };
            
            // Încearcă să extragă solduri din ultimele coloane (probabil SF Deb la row.length-4, SF Cred la row.length-3, etc.)
            const lastCols = Math.min(6, row.length - 1);
            const possibleSFDebit = extractNum(row.length - lastCols);
            const possibleSFCredit = extractNum(row.length - lastCols + 1);
            const possibleTotalDebit = extractNum(row.length - lastCols + 2);
            const possibleTotalCredit = extractNum(row.length - lastCols + 3);
            
            console.log(`  [FALLBACK] Cont ${contCode}: SF Deb=${possibleSFDebit}, SF Cred=${possibleSFCredit}, Total D=${possibleTotalDebit}, Total C=${possibleTotalCredit}`);
            
            // Mapare conturi cunoscute
            if (contCode === '4111' && possibleSFDebit > 0) soldClienti = possibleSFDebit;
            if (contCode === '401' && possibleSFCredit > 0) soldFurnizori = possibleSFCredit;
            if ((contCode === '5121' || contCode === '5124' || contCode === '5125') && possibleSFDebit > 0) soldBanca += possibleSFDebit;
            if (contCode === '5311' && possibleSFDebit > 0) soldCasa = possibleSFDebit;
            
            // Venituri (clasa 7)
            if (contCode.startsWith('7') && contCode !== '709' && possibleTotalCredit > 0) {
              totalVenituri += possibleTotalCredit;
              console.log(`  [FALLBACK] Venituri cont ${contCode}: +${possibleTotalCredit} (Total: ${totalVenituri})`);
            }
            if (contCode === '709' && possibleTotalCredit > 0) reduceriComerciale = possibleTotalCredit;
            
            // Cheltuieli (clasa 6)
            if (contCode.startsWith('6') && possibleTotalDebit > 0) {
              totalCheltuieli += possibleTotalDebit;
              console.log(`  [FALLBACK] Cheltuieli cont ${contCode}: +${possibleTotalDebit} (Total: ${totalCheltuieli})`);
            }
          }
        }
        
        // Calculează indicatori din fallback
        const revenue = Math.max(0, totalVenituri - reduceriComerciale);
        const expenses = totalCheltuieli;
        const profit = revenue - expenses;
        
        deterministic_metadata.revenue = revenue;
        deterministic_metadata.expenses = expenses;
        deterministic_metadata.profit = profit;
        deterministic_metadata.soldClienti = soldClienti;
        deterministic_metadata.soldFurnizori = soldFurnizori;
        deterministic_metadata.soldBanca = soldBanca;
        deterministic_metadata.soldCasa = soldCasa;
        
        if (revenue > 0) deterministic_metadata.dso = Math.round((soldClienti / revenue) * 365);
        if (expenses > 0) deterministic_metadata.dpo = Math.round((soldFurnizori / expenses) * 365);
        if (deterministic_metadata.dso && deterministic_metadata.dpo) {
          deterministic_metadata.cashConversionCycle = deterministic_metadata.dso - deterministic_metadata.dpo;
        }
        
        console.log("✅ [METADATA-EXTRACT-FALLBACK] METADATA EXTRASĂ (fără header):", deterministic_metadata);
        
      } else {
        // Proceeding with header-based extraction
        console.log("✅ [METADATA-EXTRACT] Header-uri GĂSITE - Extragere cu header...");

        // Funcție helper pentru a extrage valoare numerică
        const getNumValue = (row: any[], colIndex: number): number => {
          if (colIndex === -1) return 0;
          const val = row[colIndex];
          if (val === null || val === undefined || val === '') return 0;
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };
        
        // Extrage valori pentru calcule
        let soldClienti = 0; // 4111
        let soldFurnizori = 0; // 401
        let soldBanca = 0; // 5121, 5124, 5125
        let soldCasa = 0; // 5311
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
        const profit = revenue - expenses;
        
        // Calculează indicatori
        deterministic_metadata.revenue = revenue;
        deterministic_metadata.expenses = expenses;
        deterministic_metadata.profit = profit;
        deterministic_metadata.soldClienti = soldClienti;
        deterministic_metadata.soldFurnizori = soldFurnizori;
        deterministic_metadata.soldBanca = soldBanca;
        deterministic_metadata.soldCasa = soldCasa;
        
        // DSO: (Sold Clienți / CA perioadă) * 365
        if (revenue > 0) {
          deterministic_metadata.dso = Math.round((soldClienti / revenue) * 365);
        }
        
        // DPO: (Sold Furnizori / Cheltuieli) * 365
        if (expenses > 0) {
          deterministic_metadata.dpo = Math.round((soldFurnizori / expenses) * 365);
        }
        
        // Cash Conversion Cycle: DSO + DIO - DPO (DIO = 0 dacă nu avem CMV)
        if (deterministic_metadata.dso && deterministic_metadata.dpo) {
          deterministic_metadata.cashConversionCycle = deterministic_metadata.dso - deterministic_metadata.dpo;
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
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

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
    
    // Prioritizează metadata deterministă peste cea extrasă din text
    // (păstrează doar valorile AI dacă nu există în deterministic)
    const finalMetadata = { ...metadata, ...deterministic_metadata };
    console.log("✅ Metadata final (prioritate determinist):", finalMetadata);
    console.log(`   - Calculat determinist: ${Object.keys(deterministic_metadata).length} indicatori`);
    console.log(`   - Extras din AI: ${Object.keys(metadata).length - Object.keys(deterministic_metadata).length} indicatori`);
    
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
    
    if (corrections.length > 0) {
      const correctionsSection = `\n\n🔴 **CORECȚII AUTOMATE - VALORI INCORECTE DETECTATE ÎN ANALIZĂ**\n\n${corrections.join('\n\n')}`;
      return new Response(
        JSON.stringify({ 
          analysis: analysis + correctionsSection,
          metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validationWarnings: string[] = [];
    
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
      return new Response(
        JSON.stringify({ 
          analysis: analysis + warningsSection,
          metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        analysis,
        metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Eroare în analyze-balance:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Eroare necunoscută la procesarea Excel-ului"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
