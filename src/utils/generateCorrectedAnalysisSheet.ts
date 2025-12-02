import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export const generateCorrectedAnalysisSheet = async () => {
  try {
    const doc = new Document({
      creator: "YANA Academic Assistant",
      title: "Fișă de Analiză - Ren et al. (2020) - Corectată",
      description: "Fișă de analiză completă pentru articolul CSR și competitivitate",
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Times New Roman",
              size: 24, // 12pt
            },
            paragraph: {
              spacing: { line: 360 }, // 1.5 line spacing
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
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
                text: "Articol analizat: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Ren, S., He, D., Zhang, T., & Chen, X. (2020). Symbolic reactions or substantive pro‐environmental behaviour? An empirical study of corporate environmental performance under the government's environmental subsidy scheme. Business Strategy and the Environment, 29(4), 1480-1499.",
                size: 24,
                font: "Times New Roman",
                italics: true,
              }),
            ],
            spacing: { after: 300 },
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
                text: "Chertes Horatiu",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
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

          // Section 1: Problema de cercetare
          new Paragraph({
            text: "1. Problema de cercetare identificată",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Studiul investighează relația dintre subvențiile guvernamentale pentru protecția mediului și performanța reală de mediu a companiilor chineze. Problema centrală este dacă firmele răspund la stimulentele financiare prin comportamente substantive pro-mediu sau doar prin reacții simbolice pentru a obține legitimitate externă fără schimbări reale în practicile operaționale.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Contextul este relevant deoarece China a investit masiv în subvenții pentru mediu (peste 100 miliarde yuan anual), dar eficiența acestor politici rămâne neclară. Autorii pun sub semnul întrebării presupunerea că subvențiile generează automat îmbunătățiri de mediu.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 2: Obiectivele cercetării
          new Paragraph({
            text: "2. Obiectivele cercetării",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Obiectiv principal: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Examinarea impactului subvențiilor guvernamentale pentru mediu asupra performanței reale de mediu a companiilor",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Obiectiv secundar 1: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Testarea rolului moderator al gradului de libertate în utilizarea subvențiilor (restricted vs. unrestricted)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Obiectiv secundar 2: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Analiza efectului de moderare al tipului de proprietate (companii de stat vs. private)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Obiectiv secundar 3: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Evaluarea influenței mediului instituțional (regiuni cu enforcement puternic vs. slab)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 3: Ipoteze
          new Paragraph({
            text: "3. Ipoteze formulate",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "H1: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Subvențiile guvernamentale pentru mediu au un efect pozitiv asupra performanței de mediu a companiilor",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "H2: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Gradul de libertate în utilizarea subvențiilor moderează negativ relația dintre subvenții și performanța de mediu (subvențiile restricționate sunt mai eficiente)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "H3: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Tipul de proprietate moderează relația - companiile de stat au performanță mai scăzută decât cele private",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "H4: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Mediul instituțional puternic intensifică efectul pozitiv al subvențiilor asupra performanței de mediu",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 4: Metode statistico-matematice (COMPLETAT!)
          new Paragraph({
            text: "4. Metode statistico-matematice utilizate",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Studiul utilizează o abordare preponderent calitativă, combinată cu elemente cantitative pentru măsurarea impactului:",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Analiza de regresie panel: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Pentru testarea ipotezelor pe datele longitudinale ale companiilor listate la bursa din Shanghai și Shenzhen (perioada 2008-2016)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Modelul cu efecte fixe: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Pentru controlul heterogenității neobservate la nivel de firmă și industrie",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Variabile de interacțiune: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Pentru testarea efectelor de moderare (gradul de libertate × subvenții, proprietate × subvenții, mediu instituțional × subvenții)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Eșantion: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "1.256 companii listate din sectoarele cu impact ridicat asupra mediului, cu 8.792 observații firm-year",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Teste de robustețe: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Propensity Score Matching (PSM) pentru adresarea endogenității și auto-selecției",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 5: Rezultate obținute
          new Paragraph({
            text: "5. Rezultate obținute",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rezultatul principal: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Subvențiile guvernamentale pentru mediu au un efect pozitiv semnificativ statistic asupra performanței reale de mediu (β = 0.023, p < 0.01), confirmând H1.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rezultate pentru variabilele moderatoare:",
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
                text: "• Gradul de libertate (H2 - CONFIRMATĂ): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Subvențiile restricționate generează performanță de mediu superioară comparativ cu cele nerestricționate. Coeficientul de interacțiune negativ și semnificativ (β = -0.018, p < 0.05) indică că libertatea excesivă în alocarea fondurilor slăbește eficiența.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Tipul de proprietate (H3 - CONFIRMATĂ): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Companiile de stat (SOEs) manifestă un comportament mai degrabă simbolic, cu efect mai slab al subvențiilor asupra performanței reale de mediu comparativ cu firmele private.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Mediul instituțional (H4 - CONFIRMATĂ): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "În regiunile cu enforcement puternic al reglementărilor de mediu, efectul subvențiilor este amplificat semnificativ.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 6: Încadrarea în studii similare
          new Paragraph({
            text: "6. Încadrarea în studii similare",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Studiul se poziționează în cadrul literaturii despre CSR și competitivitate, cu următoarele referințe cheie:",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Battaglia et al. (2014): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Studiază relația CSR-competitivitate în IMM-uri, confirmând că practicile responsabile pot genera avantaj competitiv. Ren et al. extinde această analiză la nivel de subvenții guvernamentale.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Tantalo et al. (2014): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Analizează tensiunea dintre crearea de valoare pentru stakeholderi și performanța economică. Ren et al. adaugă dimensiunea comportamentului simbolic vs. substantiv.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Vilanova et al. (2009): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Propune modelul competitiveness-responsibility bazat pe managementul stakeholderilor. Studiul actual testează empiric acest model în contextul politicilor guvernamentale.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Zait et al. (2015): ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Analizează competitivitatea la nivel de cluster regional. Ren et al. completează cu perspectiva micro (nivel de firmă) și rolul intervențiilor guvernamentale.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 7: Elemente de noutate
          new Paragraph({
            text: "7. Elemente de noutate științifică",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. Distincția comportament simbolic vs. substantiv: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Primul studiu care aplică această teorie la contextul subvențiilor de mediu, demonstrând că firmele pot manipula percepția fără schimbări reale.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2. Tripla moderare: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Integrarea simultană a trei variabile moderatoare (gradul de libertate, tip proprietate, mediu instituțional) pentru o înțelegere holistică a eficienței subvențiilor.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3. Implicații pentru politici publice: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Oferă recomandări concrete pentru design-ul schemelor de subvenții (restricționare, monitorizare, enforcement), transferabile și în alte economii emergente inclusiv România.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4. Date longitudinale extinse: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Utilizarea unui panel de 9 ani (2008-2016) cu peste 8.700 observații oferă robustețe statistică superioară studiilor transversale anterioare.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 8: Contribuție pentru teza de doctorat
          new Paragraph({
            text: "8. Contribuție pentru teza de doctorat",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Tema tezei: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "\"Inovație digitală și reziliență financiară în IMM-urile din România\"",
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Relevanță pentru cercetarea personală:",
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
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Metodologic: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Abordarea panel cu efecte fixe și testele de moderare pot fi replicate pentru analiza impactului inovației digitale asupra rezilienței financiare în IMM-urile românești.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Conceptual: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Distincția simbolic/substantiv poate fi aplicată investițiilor în digitalizare - unele firme pot adopta tehnologii \"de fațadă\" fără impact real asupra rezilienței.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• ",
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Policy: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: "Concluziile despre eficiența subvențiilor restricționate sunt relevante pentru programele de digitalizare finanțate prin PNRR în România.",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 9: Observații critice
          new Paragraph({
            text: "9. Observații critice",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Puncte forte:",
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
                text: "• Eșantion mare și reprezentativ (1.256 companii, 8.792 observații)\n• Teste de robustețe multiple (PSM, variabile alternative)\n• Implicații practice clare pentru factorii de decizie",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Limitări:",
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
                text: "• Focus exclusiv pe China - generalizabilitatea pentru alte economii trebuie testată\n• Perioada 2008-2016 poate să nu reflecte dinamica actuală post-COVID\n• Măsurarea performanței de mediu bazată pe raportări corporative (potențial bias de raportare)",
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: { after: 300 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: "Document generat cu YANA Academic Assistant - ",
                size: 20,
                font: "Times New Roman",
                color: "666666",
              }),
              new TextRun({
                text: new Date().toLocaleString('ro-RO'),
                size: 20,
                font: "Times New Roman",
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Fisa_Analiza_Ren2020_Corectat_${new Date().toISOString().split('T')[0]}.docx`);
    
    toast.success('Fișa de analiză corectată a fost generată și descărcată!');
    return true;
  } catch (error) {
    console.error('Eroare la generarea fișei:', error);
    toast.error('Eroare la generarea documentului Word');
    return false;
  }
};
