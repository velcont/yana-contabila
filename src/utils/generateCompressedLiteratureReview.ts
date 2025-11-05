import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel 
} from "docx";
import { saveAs } from "file-saver";

export const generateCompressedLiteratureReview = async (
  authorName: string = "Nume Autor",
  affiliation: string = "Universitatea X, Facultatea Y"
) => {
  const doc = new Document({
    creator: "Yana AI - Academic Conference Assistant",
    title: "Reziliența organizațională - Literature Review (Versiune Conferință)",
    description: "Versiune comprimată 4 pagini pentru conferința doctoranzi Oradea",
    
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        // TITLU + AUTOR + AFILIERE
        new Paragraph({
          text: "Reziliența organizațională în contextul IMM-urilor din România: o sinteză a literaturii",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: authorName, bold: true, size: 22 }),
            new TextRun({ text: "\n" + affiliation, italics: true, size: 20 })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // ABSTRACT RO
        new Paragraph({
          text: "Abstract",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Reziliența organizațională a evoluat de la capacitatea de supraviețuire la abordări transformative care integrează anticipare, adaptare și învățare continuă. Această sinteză analizează evoluția conceptului (de la fizică la științe organizaționale), dimensiunile rezilienței (cognitive, comportamentale, contextuale), cadrele teoretice principale (capacități dinamice - Teece et al., 1997; inovație sustenabilă - Bocken et al., 2014) și relevanța acestora pentru IMM-urile din România. Concluziile subliniază caracterul dinamic și multidimensional al rezilienței, evidențiind lacunele de cercetare specifice contextului românesc.",
              font: "Times New Roman",
              size: 22
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        // Keywords
        new Paragraph({
          children: [
            new TextRun({ text: "Cuvinte cheie: ", bold: true, size: 22 }),
            new TextRun({ text: "reziliență organizațională, IMM-uri România, capacități dinamice, inovație modelelor de afaceri", italics: true, size: 22 })
          ],
          spacing: { after: 400, line: 360 }
        }),
        
        // INTRODUCERE (1 paragraf - 150 cuvinte)
        new Paragraph({
          text: "1. Introducere",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Conceptul de reziliență, originar din fizică (Holling, 1973), s-a extins în științele organizaționale pentru a explica modul în care firmele fac față perturbărilor externe. Literatura evidențiază o evoluție de la abordări reactive (capacitatea de revenire la status-quo ante - Wildavsky, 1988) la perspective transformative care subliniază învățarea și reconfigurarea strategică post-criză (Linnenluecke, 2017; Williams et al., 2017). Această sinteză examinează principalele cadre teoretice și definițiile rezilienței organizaționale, cu accent pe relevanța acestora pentru IMM-urile din România - context caracterizat prin volatilitate economică și vulnerabilitate structurală sporită.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        // SECȚIUNEA 1 (2 paragrafe - 300 cuvinte)
        new Paragraph({
          text: "2. Evoluția conceptului și dimensiuni ale rezilienței",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Reziliența organizațională implică trei dimensiuni temporale complementare: anticiparea riscurilor potențiale, adaptarea rapidă în timpul crizei și recuperarea prin învățare post-criză (Sutcliffe & Vogus, 2003; Duchek, 2020). Aceste dimensiuni se asociază cu capacități cognitive (interpretarea semnalelor slabe de criză), comportamentale (acțiune rapidă), contextuale (resurse și structuri facilitatoare) și emoționale (angajament colectiv - Kantur & Iseri-Say, 2015). Abordarea multidimensională arată că reziliența nu este o proprietate statică, ci un proces dinamic de reconfigurare organizațională care depinde de interacțiunea dintre cunoaștere, cultură, leadership și mobilizare colectivă.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Dimensiunea transformativă a rezilienței (Linnenluecke, 2017) subliniază că organizațiile nu doar rezistă șocurilor, ci evoluează strategic prin recombinarea resurselor și reconfigurarea modelelor de afaceri. Această perspectivă redirecționează atenția de la simpla supraviețuire la capacitatea de valorificare a crizelor ca oportunități de inovare și repoziționare competitivă - aspect crucial pentru IMM-urile din economii emergente.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        // SECȚIUNEA 2 (2 paragrafe - 300 cuvinte)
        new Paragraph({
          text: "3. Cadre teoretice: capacități dinamice și inovație sustenabilă",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Modelul capacităților dinamice (Teece et al., 1997; Teece, 2007) explică reziliența prin abilitatea firmelor de a detecta (sensing), evalua (seizing) și transforma (reconfiguring) resursele organizaționale pentru a se adapta la medii rapid schimbătoare. Organizațiile cu capacități dinamice puternice pot nu doar să supraviețuiască crizelor, ci și să identifice noi oportunități în mijlocul perturbației, reconfigurând lanțul valoric și pivotând către noi segmente de piață. Această abordare subliniază caracterul proactiv și strategic al rezilienței, depășind logica reactivă a simplei supraviețuiri.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Complementar, inovația modelelor de afaceri sustenabile (Bocken et al., 2014; Geissdoerfer et al., 2018) - incluzând eficiență energetică, economie circulară și parteneriate comunitare - contribuie la diversificarea surselor de reziliență prin reducerea dependenței de o singură piață sau model de venit. În contextul crizelor, firmele cu modele de afaceri diversificate pot compensa contractarea unui segment prin alte fluxuri de venit legate de servicii sustenabile sau inovare socială, configurând astfel un avantaj strategic pe termen lung.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        // SECȚIUNEA 3 (1 paragraf - 150 cuvinte)
        new Paragraph({
          text: "4. Reziliența IMM-urilor din România: specificități și direcții de cercetare",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "În contextul IMM-urilor din România, cercetările evidențiază vulnerabilități structurale specifice: acces limitat la finanțare, dependență de lanțuri valorice internaționale și capacitate redusă de inovare tehnologică. O direcție complementară este reprezentată de studii asupra digitalizării accelerate (post-pandemie), diversificării pieței și dezvoltării competențelor antreprenoriale care susțin reziliența organizațională. Lacunele identificate includ lipsa măsurătorilor validate local și necesitatea unor studii longitudinale care să examineze evoluția rezilienței în cicluri economice complete.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        }),
        
        // CONCLUZII (1 paragraf - 100 cuvinte)
        new Paragraph({
          text: "5. Concluzii",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Reziliența organizațională configurează un construct multidimensional care integrează anticipare, adaptare, învățare și transformare strategică. Cadrele teoretice contemporane - capacități dinamice și inovație sustenabilă - oferă fundamente solide pentru analiza rezilienței, însă aplicarea lor în contextul IMM-urilor din România necesită validare empirică și adaptare la specificități locale. Cercetările viitoare ar trebui să exploreze mecanismele concrete prin care digitalizarea și diversificarea modelelor de afaceri contribuie la construirea rezilienței pe termen lung.",
              font: "Times New Roman",
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400, line: 360 }
        }),
        
        // BIBLIOGRAFIE (doar referințele ESENȚIALE - 15-20)
        new Paragraph({
          text: "Bibliografie",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        // Lista bibliografică comprimată (doar referințele cheie)
        ...createCompressedBibliography()
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Literature_Review_COMPRESSED_Conference_4pages.docx");
};

function createCompressedBibliography() {
  const references = [
    "Bocken, N. M. P., Short, S. W., Rana, P., & Evans, S. (2014). A literature and practice review to develop sustainable business model archetypes. Journal of Cleaner Production, 65, 42-56.",
    "Duchek, S. (2020). Organizational resilience: A capability-based conceptualization. Business Research, 13(1), 215-246.",
    "Geissdoerfer, M., Vladimirova, D., & Evans, S. (2018). Sustainable business model innovation: A review. Journal of Cleaner Production, 198, 401-416.",
    "Holling, C. S. (1973). Resilience and stability of ecological systems. Annual Review of Ecology and Systematics, 4(1), 1-23.",
    "Kantur, D., & Iseri-Say, A. (2015). Measuring organizational resilience: A scale development. Journal of Business Economics and Finance, 4(3), 456-472.",
    "Linnenluecke, M. K. (2017). Resilience in business and management research: A review of influential publications and a research agenda. International Journal of Management Reviews, 19(1), 4-30.",
    "Sutcliffe, K. M., & Vogus, T. J. (2003). Organizing for resilience. In K. S. Cameron, J. E. Dutton, & R. E. Quinn (Eds.), Positive organizational scholarship (pp. 94-110). Berrett-Koehler.",
    "Teece, D. J. (2007). Explicating dynamic capabilities: The nature and microfoundations of (sustainable) enterprise performance. Strategic Management Journal, 28(13), 1319-1350.",
    "Teece, D. J., Pisano, G., & Shuen, A. (1997). Dynamic capabilities and strategic management. Strategic Management Journal, 18(7), 509-533.",
    "Wildavsky, A. (1988). Searching for safety. Transaction Publishers.",
    "Williams, T. A., Gruber, D. A., Sutcliffe, K. M., Shepherd, D. A., & Zhao, E. Y. (2017). Organizational response to adversity: Fusing crisis management and resilience research streams. Academy of Management Annals, 11(2), 733-769."
  ];
  
  return references.map(ref => new Paragraph({
    children: [
      new TextRun({
        text: ref,
        font: "Times New Roman",
        size: 20
      })
    ],
    spacing: { before: 100, after: 100, line: 276 },
    alignment: AlignmentType.LEFT
  }));
}
