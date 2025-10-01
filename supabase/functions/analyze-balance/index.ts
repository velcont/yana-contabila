import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Analizeaza balanta atasata urmand urmatoarele Instrucțiuni:

La inceputul anlizei vei scrie urmatorul mesaj:Acesta este o analiză managerială efectuată cu ajutorul inteligenței artificiale.

Notă importantă privind :Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare).Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI.

Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale.

Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie fiscală validată.

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
• Conturile 5121 (conturi curente bancare) și 5311 (casa în lei) au solduri finale debitoare deoarece reprezintă disponibilități.
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
• În orice analiză automată (GPT, script Python, procesare PDF), această regulă se aplică ca filtru de validare.
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

1) Snapshot Strategic și Recomandări Preliminare:
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
TVA de plată Contul 4423 în Solduri finale Creditoare
TVA de recuperat Contul 4424 în Solduri finale Debitoare
Clienți Contul 4111 în Solduri finale Debitoare : [ ] | DSO: [ ] zile
Furnizori Contul 401 în Solduri finale Creditoare: [ ] | DPO: [ ] zile
Impozitul pe profit Contul 4411 în Solduri finale Creditoare
Impozitul pe venit Contul 4418 în Solduri finale Creditoare
Mărfuri Contul 371 în Solduri finale Debitoare
Materii prime Contul 301 în Solduri finale Debitoare
Materiale de natura obiectelor de inventar Contul în Solduri finale Debitoare
Banii care sunt în bancă se regăsesc în contul 512, numit „Conturi curente la bănci". Acest cont înregistrează disponibilitățile în lei și în valută aflate în conturile bancare ale firmei. Soldul debitor al contului arată suma banilor disponibili în conturile bancare, iar soldul creditor reprezintă eventualele credite primite de la bancă.
Banii care sunt efectiv în casă se găsesc în contul 5311, numit „Casa în lei". Soldul final al acestui cont, aflat pe partea de debit, indică suma de bani cash disponibilă în caserie. Acest cont nu poate avea sold creditor (adică nu poate apărea cu valoare negativă), deoarece nu există bani cu minus în casă.
Interpretare și Recomandări Preliminare: Pe baza acestor indicatori cheie, oferă o primă evaluare a sănătății financiare a companiei și sugerează direcții inițiale de optimizare sau zone care necesită o investigație mai aprofundată.

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
Verifică dacă: \`diferenta == sold_cont121\``;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfBase64, fileName } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Nu s-a furnizat fișierul PDF cu balanța" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY nu este configurată");
    }

    console.log(`Procesare PDF: ${fileName || "necunoscut"}`);
    console.log("Trimitere cerere către Lovable AI cu PDF...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizează balanța de verificare din PDF-ul atașat conform tuturor instrucțiunilor detaliate din prompt."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Eroare Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit depășit. Te rog încearcă din nou peste câteva minute.");
      }
      
      if (response.status === 402) {
        throw new Error("Credite insuficiente. Te rog adaugă credite în contul Lovable AI.");
      }
      
      throw new Error(`Eroare API (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Răspuns primit de la AI");

    const analysis = data.choices?.[0]?.message?.content;
    
    if (!analysis) {
      throw new Error("Nu s-a putut genera analiza");
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Eroare în edge function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "A apărut o eroare la procesarea cererii" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
