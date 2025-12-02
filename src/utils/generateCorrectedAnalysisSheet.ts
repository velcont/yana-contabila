import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export const generateCorrectedAnalysisSheet = async () => {
  try {
    const doc = new Document({
      creator: "YANA Academic Assistant",
      title: "Fișă de Analiză - Lu, Ren et al. (2020) - CSR și Competitivitate",
      description: "Fișă de analiză completă pentru articolul CSR și competitivitatea firmelor",
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Times New Roman",
              size: 24,
            },
            paragraph: {
              spacing: { line: 360 },
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "FIȘĂ DE ANALIZĂ A CERCETĂRII ȘTIINȚIFICE",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Article Info
          new Paragraph({
            children: [
              new TextRun({
                text: "Curs: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Strategii de dezvoltare și competitivitate în afaceri",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Doctorand: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "[Nume Doctorand]",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Data analizei: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: new Date().toLocaleDateString('ro-RO'),
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 400 },
          }),

          // Section 1: Referință bibliografică
          new Paragraph({
            text: "1. REFERINȚĂ BIBLIOGRAFICĂ",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Lu, J., Ren, L., Yao, S., Qiao, J., Mikalauskiene, A. & Streimikis, J. (2020). Exploring the relationship between corporate social responsibility and firm competitiveness. ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Economic Research-Ekonomska Istraživanja",
                size: 24,
                font: "Times New Roman",
                italics: true,
              }),
              new TextRun({
                text: ", 33(1), 1621-1646. DOI: 10.1080/1331677X.2020.1761419",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 2: Scop și context
          new Paragraph({
            text: "2. SCOP ȘI CONTEXT",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Scopul studiului: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Analiza relației dintre responsabilitatea socială corporativă (CSR) și competitivitatea firmelor. Cercetarea dezvoltă un model teoretic care stabilește legăturile dintre CSR și competențele corporative, testat empiric pe companii din Lituania.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Contextul cercetării: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "În societatea modernă, companiile nu mai pot ignora nevoile consumatorilor conștienți care cer ca afacerile să fie responsabile social, ecologic și etic. Deși conceptul CSR a fost discutat încă din anii 1950, inițiativa Global Compact lansată în 1999 de ONU a marcat un punct de cotitură, încurajând companiile să respecte drepturile omului, protecția mediului și lupta anticorupție.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Problema identificată: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Studiile anterioare s-au concentrat pe impactul CSR asupra performanței firmei, valorii de brand sau profitului, dar nu au oferit un cadru clar și simplu pentru legătura CSR-competitivitate. Majoritatea au folosit analize de moderare/mediere complexe cu ecuații structurale și zeci de ipoteze.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 3: Metodologie
          new Paragraph({
            text: "3. METODOLOGIE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Design cercetare: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Studiu empiric cantitativ bazat pe chestionare cu evaluare calitativă.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Eșantion: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "33 de companii din Lituania - toate companiile membre Global Compact din această țară. Chestionarele au fost distribuite prin email în septembrie 2019, cu răspunsuri de la toate cele 33 de companii (rată de răspuns 100%).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Instrumente: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Chestionar cu scală Likert de 4 puncte pentru evaluarea impactului CSR asupra competitivității. Scala: 1 = niciun impact, 2 = impact nesemnificativ, 3 = impact moderat, 4 = impact ridicat.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Variabile independente (Dimensiuni CSR): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Dimensiunea de mediu (environmental), Dimensiunea socială (social), Dimensiunea economică (economic), Dimensiunea stakeholder-ilor (shareholder), Dimensiunea voluntariatului/filantropiei (voluntariness/philanthropic).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Variabile dependente (Elemente de competitivitate): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Capacitate financiară, Calitatea producției, Satisfacerea nevoilor consumatorilor, Productivitate și eficiență, Posibilități de introducere a inovațiilor, Imaginea și reputația companiei.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 4: Metode statistico-matematice
          new Paragraph({
            text: "4. METODE STATISTICO-MATEMATICE UTILIZATE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Metoda principală: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Calculul coeficienților de impact (K coefficient)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Formula aplicată: Ki = Σ(j=1 to N) kj × ni / n",
                size: 24,
                font: "Times New Roman",
                italics: true,
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Unde: Ki = coeficientul de impact al dimensiunii CSR selectate asupra elementului i de competitivitate; kj = scorul de impact; j = scorul de la 1 la N (N=4); ni = numărul de răspunsuri care au selectat scorul j pentru elementul i; n = numărul total de răspunsuri.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Scala unipolară cu 4 grade: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "0; 0.25; 0.5; 1",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "NOTĂ IMPORTANTĂ: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Studiul este predominant CALITATIV, nu utilizează teste statistice inferențiale (t-test, ANOVA, regresie). Coeficienții K reprezintă o măsură descriptivă a percepției respondenților asupra impactului CSR. Autorii recunosc explicit această limitare și recomandă utilizarea Structural Equation Modelling în cercetări viitoare pentru analize mai riguroase.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 5: Rezultate obținute
          new Paragraph({
            text: "5. REZULTATE OBȚINUTE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "TABEL - Coeficienți de impact K (din Tabelul 5 al studiului):",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "                              Mediu    Social   Economic  Stakeholder  Filantropie",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Capacitate financiară         0.247    0.140    0.264     0.253        0.123",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Calitatea producției          0.173    0.153    0.183     0.263        0.110",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Nevoi consumatori             0.267    0.267    0.223     0.320        0.160",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Productivitate                0.220    0.203    0.220     0.317        0.127",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Introducere inovații          0.253    0.180    0.197     0.273        0.120",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Imagine/Reputație             0.353    0.350    0.313     0.340        0.340",
                size: 22,
                font: "Courier New",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "CONCLUZII PRINCIPALE:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. Toate dimensiunile CSR influențează cel mai mult IMAGINEA și REPUTAȚIA companiei (coeficienți între 0.313-0.353).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2. Calitatea producției și introducerea inovațiilor NU sunt afectate semnificativ de dimensiunile CSR.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3. Imaginea/reputația și satisfacerea nevoilor consumatorilor sunt afectate de TOATE dimensiunile CSR.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4. Capacitatea financiară este influențată predominant de dimensiunile de mediu (0.247) și economică (0.264).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "5. Productivitatea și eficiența sunt corelate cu dimensiunile socială (0.203), stakeholder (0.317) și filantropică (0.127).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 6: Încadrarea în studii similare
          new Paragraph({
            text: "6. ÎNCADRAREA ÎN STUDII SIMILARE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Studiul se poziționează în cadrul literaturii despre CSR și competitivitate:",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Battaglia et al. (2014) - ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "\"CSR and Competitiveness within SMEs of the Fashion Industry\" (Italia, Franța). Similitudine: Confirmă impactul CSR asupra imaginii/reputației. Diferență: Nu menționează influența asupra satisfacției consumatorilor.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Tantalo et al. (2014) - ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Cadru de evaluare calitativă CSR-competitivitate. Similitudine: Abordare calitativă similară. Diferență: Găsește relație nesemnificativă pentru dimensiunea socială, pe când studiul actual identifică impact.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Vilanova et al. (2009) - ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Ipoteze despre impactul CSR asupra competitivității. Similitudine: Dezvoltă ipoteze clare despre legătura CSR-competitivitate. Diferență: Studiul actual oferă date empirice concrete.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Zait et al. (2015) - ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Studiu în context european. Similitudine: Focus pe capacitate financiară și imagine. Diferență: Nu analizează dimensiunea economică separat.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 7: Elemente de noutate
          new Paragraph({
            text: "7. ELEMENTE DE NOUTATE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. CADRU CONCEPTUAL SIMPLIFICAT: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Dezvoltă un model clar pentru relația CSR-competitivitate, în contrast cu ecuațiile structurale complexe din studiile anterioare.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2. EVALUARE CALITATIVĂ DIRECTĂ: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Aplică o abordare diferită - evaluare calitativă cu coeficienți K în loc de analize de moderare/mediere.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3. STUDIU EXHAUSTIV PE MEMBRI GLOBAL COMPACT: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Acoperă 100% din companiile membre Global Compact din Lituania (33 companii).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4. REZULTATE CONTRAINTUITIVE: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Descoperă că calitatea producției și inovația NU sunt afectate de CSR, contrazicând asumpții comune din literatură.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 8: Conectarea la teza doctorală
          new Paragraph({
            text: "8. CONECTAREA LA TEZA DOCTORANDULUI",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "RELEVANȚĂ PENTRU TEZA: \"Inovație digitală și reziliență financiară în IMM-urile din România\"",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. CADRU TEORETIC TRANSFERABIL: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Modelul CSR-competitivitate poate fi adaptat pentru analiza inovație digitală-reziliență. Dimensiunile CSR pot fi înlocuite cu dimensiuni ale inovației digitale (tehnologii cloud, automatizare, e-commerce, analiză date).",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2. METODOLOGIE REPLICABILĂ: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Scala Likert și coeficienții K pot fi aplicați pentru măsurarea impactului inovației digitale asupra rezilienței IMM-urilor românești.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3. COMPETITIVITATE CA CONSTRUCT COMUN: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Elementele de competitivitate din studiu (capacitate financiară, productivitate, imagine) sunt relevante și pentru evaluarea rezilienței.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4. IPOTEZE DE CERCETARE DERIVATE: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "H1: Inovația digitală influențează diferit elementele rezilienței; H2: Nu toate tipurile de inovație digitală afectează toate elementele rezilienței; H3: Imaginea/reputația digitală este cel mai afectat element.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "5. DIRECȚII VIITOARE: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Autorii recomandă Structural Equation Modelling pentru analize mai riguroase - metodă recomandată și pentru validarea modelului inovație-reziliență în teza doctorală.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Section 9: Observații Critice
          new Paragraph({
            text: "9. OBSERVAȚII CRITICE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "PUNCTE FORTE:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Model conceptual clar și ușor de înțeles pentru relația CSR-competitivitate",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Acoperire exhaustivă a populației țintă (100% din membrii Global Compact Lituania)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Cadru metodologic simplu și replicabil pentru alte contexte",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Rezultate contraintuitive care contribuie la teoria CSR (calitatea producției și inovația nu sunt afectate de CSR)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "LIMITĂRI ALE STUDIULUI:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Eșantion mic (N=33) - limitează generalizabilitatea rezultatelor",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Focus geografic îngust (doar Lituania) - rezultatele pot să nu fie transferabile în alte contexte culturale",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Metodologie predominant calitativă - lipsa testelor statistice inferențiale (t-test, ANOVA, regresie)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Date auto-raportate susceptibile la bias de dezirabilitate socială",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Lipsa validării externe a rezultatelor sau a datelor financiare obiective",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Coeficienții K nu permit inferențe despre cauzalitate sau semnificație statistică",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 400 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: "─".repeat(50),
                size: 24,
                font: "Times New Roman",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Document generat: Decembrie 2024",
                size: 20,
                font: "Times New Roman",
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Fisa_Analiza_Lu_Ren_2020_CSR_Competitivitate.docx");
    toast.success("✅ Fișa de analiză a fost descărcată!");
  } catch (error) {
    console.error("Error generating analysis sheet:", error);
    toast.error("Eroare la generarea fișei de analiză");
  }
};
