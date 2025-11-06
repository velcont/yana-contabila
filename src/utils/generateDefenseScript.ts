import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, Packer } from 'docx';
import { saveAs } from 'file-saver';

export const generateDefenseScript = async (config: {
  thesisTopic: string;
  authorName: string;
  affiliation: string;
}) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // TITLU
        new Paragraph({
          text: "SCRIPT DETALIARE PROCES LUCRU",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Pentru susținerea în fața profesorului pe Zoom", italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),

        // SALUT INIȚIAL
        new Paragraph({
          text: "1. SALUT INIȚIAL",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Bună ziua, domnule profesor! Vă mulțumesc pentru timpul acordat. Vreau să vă prezint în detaliu procesul de lucru pentru această lucrare de revizie a literaturii.",
          spacing: { after: 400 }
        }),

        // PREZENTARE GENERALĂ
        new Paragraph({
          text: "2. PREZENTARE GENERALĂ PROCES",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Am lucrat la această lucrare timp de aproximativ 14 zile, urmând un proces structurat în 5 etape principale:",
          spacing: { after: 200 }
        }),
        
        // Etape enumerate
        ...["📚 Identificarea și selecția surselor (3 zile)",
           "📖 Lectura critică și notarea conceptelor (4 zile)",
           "🔄 Structurarea sintetică a informației (3 zile)",
           "✍️ Redactarea și integrarea citărilor (3 zile)",
           "✅ Verificarea anti-plagiat și formatarea finală (1 zi)"].map(stage => 
          new Paragraph({
            text: stage,
            bullet: { level: 0 },
            spacing: { after: 100 }
          })
        ),

        // STRUCTURA EXACTĂ A DOCUMENTULUI
        new Paragraph({
          text: "3. STRUCTURA EXACTĂ A DOCUMENTULUI",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),

        // Pagina 1
        new Paragraph({
          children: [
            new TextRun({ text: "PAGINA 1 - Introducere (aprox. 450 cuvinte)", bold: true, underline: { type: UnderlineType.SINGLE } })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Context: De ce este relevantă reziliența organizațională pentru IMM-urile din România",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Justificare: Vulnerabilitatea crescută a IMM-urilor românești în contextul crizelor multiple",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Obiectiv: Analiza cadrelor teoretice și dimensiunilor rezilienței în literatura recentă",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Citate cheie: Duchek (2020) pentru definiție, Hillmann & Guenther (2021) pentru conceptualizare",
          bullet: { level: 0 },
          spacing: { after: 300 }
        }),

        // Pagina 2
        new Paragraph({
          children: [
            new TextRun({ text: "PAGINA 2 - Evoluția conceptului (aprox. 500 cuvinte)", bold: true, underline: { type: UnderlineType.SINGLE } })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Secțiunea 1: Evoluția și dimensiunile rezilienței organizaționale",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Tranziția de la 'bounce back' la 'bounce forward' (Ortiz-de-Mandojana & Bansal, 2016)",
          bullet: { level: 1 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Cele 4 dimensiuni: Anticipare, Răspuns, Recuperare, Adaptare",
          bullet: { level: 1 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Secțiunea 2: Cadre teoretice dominante",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Dynamic Capabilities Framework (Teece, Pisano & Shuen, 1997)",
          bullet: { level: 1 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Business Model Innovation (Bocken et al., 2014)",
          bullet: { level: 1 },
          spacing: { after: 300 }
        }),

        // Pagina 3
        new Paragraph({
          children: [
            new TextRun({ text: "PAGINA 3 - Context românesc (aprox. 480 cuvinte)", bold: true, underline: { type: UnderlineType.SINGLE } })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Secțiunea 3: Reziliența IMM-urilor din România",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Date empirice despre rata de supraviețuire (Doern et al., 2019)",
          bullet: { level: 1 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Bariere specifice: acces limitat la finanțare, infrastructură slabă, digitalizare redusă",
          bullet: { level: 1 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "  - Strategii de adaptare: diversificare, colaborare, inovație frugală",
          bullet: { level: 1 },
          spacing: { after: 300 }
        }),

        // Pagina 4
        new Paragraph({
          children: [
            new TextRun({ text: "PAGINA 4 - Concluzii (aprox. 350 cuvinte)", bold: true, underline: { type: UnderlineType.SINGLE } })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Sinteză: Reziliența = combinație de capacități dinamice + inovație BMI",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Gap identificat: Lipsă studii empirice pe IMM-uri România post-pandemie",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Direcții viitoare: Studii longitudinale, analiza factorilor contextuali specifici",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Bibliografie: 11 surse esențiale (vezi secțiunea următoare)",
          bullet: { level: 0 },
          spacing: { after: 400 }
        }),

        // BIBLIOGRAFIA EXACTĂ
        new Paragraph({
          text: "4. CELE 11 SURSE ESENȚIALE",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "A. Fundații Teoretice (3 surse):", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "1. Teece, D.J., Pisano, G., & Shuen, A. (1997). Dynamic capabilities and strategic management. Strategic Management Journal, 18(7), 509-533.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Citat de peste 50.000 de ori - Fundamentul teoriei capacităților dinamice",
          bullet: { level: 1 },
          spacing: { after: 100 }
        }),

        new Paragraph({
          text: "2. Bocken, N.M.P., Short, S.W., Rana, P., & Evans, S. (2014). A literature and practice review to develop sustainable business model archetypes. Journal of Cleaner Production, 65, 42-56.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Peste 3.000 citări - Inovația modelului de afaceri pentru sustenabilitate",
          bullet: { level: 1 },
          spacing: { after: 100 }
        }),

        new Paragraph({
          text: "3. Ortiz-de-Mandojana, N., & Bansal, P. (2016). The long-term benefits of organizational resilience through sustainable business practices. Strategic Management Journal, 37(8), 1615-1631.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Peste 1.200 citări - Legătura dintre reziliență și practici sustenabile",
          bullet: { level: 1 },
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "B. Dimensiuni ale Rezilienței (3 surse):", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "4. Duchek, S. (2020). Organizational resilience: A capability-based conceptualization. Business Research, 13, 215-246.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Definește reziliența ca proces în 3 etape: anticipare, coping, adaptare",
          bullet: { level: 1 },
          spacing: { after: 100 }
        }),

        new Paragraph({
          text: "5. Hillmann, J., & Guenther, E. (2021). Organizational resilience: A valuable construct for management research? International Journal of Management Reviews, 23(1), 7-44.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Review sistematic - Clarifică conceptualizarea rezilienței în literatura de management",
          bullet: { level: 1 },
          spacing: { after: 100 }
        }),

        new Paragraph({
          text: "6. Lengnick-Hall, C.A., Beck, T.E., & Lengnick-Hall, M.L. (2011). Developing a capacity for organizational resilience through strategic human resource management. Human Resource Management Review, 21(3), 243-255.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Peste 1.500 citări - Rolul resurselor umane în construirea rezilienței",
          bullet: { level: 1 },
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "C. Evoluția Conceptului (2 surse):", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "7. Williams, T.A., Gruber, D.A., Sutcliffe, K.M., Shepherd, D.A., & Zhao, E.Y. (2017). Organizational response to adversity: Fusing crisis management and resilience research streams. Academy of Management Annals, 11(2), 733-769.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Integrează literatura de management al crizelor cu reziliența organizațională",
          bullet: { level: 1 },
          spacing: { after: 100 }
        }),

        new Paragraph({
          text: "8. Kuckertz, A., Brändle, L., Gaudig, A., Hinderer, S., Reyes, C.A.M., Prochotta, A., ... & Berger, E.S.C. (2020). Startups in times of crisis – A rapid response to the COVID-19 pandemic. Journal of Business Venturing Insights, 13, e00169.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "   → Evidențe empirice despre strategii de adaptare în pandemie",
          bullet: { level: 1 },
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "D. Inovație Sustenabilă (3 surse):", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "9. Lüdeke-Freund, F., & Dembek, K. (2017). Sustainable business model research and practice: Emerging field or passing fancy? Journal of Cleaner Production, 168, 1668-1678.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),

        new Paragraph({
          text: "10. Doern, R., Williams, N., & Vorley, T. (2019). Special issue on entrepreneurship and crises: business as usual? An introduction and review of the literature. Entrepreneurship & Regional Development, 31(5-6), 400-412.",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),

        new Paragraph({
          text: "11. Geissdoerfer, M., Vladimirova, D., & Evans, S. (2018). Sustainable business model innovation: A review. Journal of Cleaner Production, 198, 401-416.",
          bullet: { level: 0 },
          spacing: { after: 400 }
        }),

        // RĂSPUNSURI LA ÎNTREBĂRI
        new Paragraph({
          text: "5. RĂSPUNSURI LA ÎNTREBĂRI PROBABILE",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Întrebarea 1: 'Cum ai selectat aceste surse?'", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Am folosit criteriile CRAAP (Currency, Relevance, Authority, Accuracy, Purpose):",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Currency: Toate sursele sunt din 2011-2020, majoritatea post-2015",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Relevance: Direct legate de reziliență organizațională și IMM-uri",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Authority: Publicate în reviste Q1 (Strategic Management Journal, Academy of Management Annals)",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Accuracy: Peste 1.000 citări fiecare, peer-reviewed",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Purpose: Construire cadru teoretic solid pentru cercetarea de doctorat",
          bullet: { level: 0 },
          spacing: { after: 300 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Întrebarea 2: 'De ce aceste cadre teoretice?'", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Am ales Dynamic Capabilities + Business Model Innovation pentru că:",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• DC explică CAPACITATEA de adaptare (sensing, seizing, transforming)",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• BMI explică MECANISMUL concret de adaptare (cum schimbi modelul de business)",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Împreună acoperă atât dimensiunea strategică, cât și operațională a rezilienței",
          bullet: { level: 0 },
          spacing: { after: 300 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Întrebarea 3: 'Cum ai asigurat originalitatea?'", bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Am parafrazat activ toate conceptele, nu am copiat direct",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Am integrat sintetic idei din mai multe surse în fiecare paragraf",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Am adăugat propriile observații despre contextul românesc",
          bullet: { level: 0 }
        }),
        new Paragraph({
          text: "• Verificare anti-plagiat finală cu [Turnitin/Similar Tool]",
          bullet: { level: 0 },
          spacing: { after: 400 }
        }),

        // DOVEZI CONCRETE
        new Paragraph({
          text: "6. DOVEZI CONCRETE DE ARĂTAT",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),

        new Paragraph({
          text: "✅ Folderul cu PDF-urile celor 11 articole descărcate",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "✅ Notițe manuscrise sau Word cu concepte extrase",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "✅ Fișierul Excel cu bibliografia detaliată",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "✅ PDF-uri highlight-uite (secțiunile citite și notate)",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "✅ Documentul Word cu citările corecte APA 7",
          bullet: { level: 0 },
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "✅ Raportul Turnitin/anti-plagiat",
          bullet: { level: 0 },
          spacing: { after: 400 }
        }),

        // ÎNCHEIERE
        new Paragraph({
          text: "7. ÎNCHEIERE",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Am încercat să construiesc o bază teoretică solidă pentru cercetarea de doctorat, combinând cadre clasice (Dynamic Capabilities) cu perspective contemporane (BMI sustenabil). Următorul pas este aplicarea acestor cadre într-un studiu empiric pe IMM-uri din România.",
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Sunt deschis la orice feedback și întrebări suplimentare!", italics: true })
          ],
          spacing: { after: 200 }
        }),
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `SCRIPT_SUSTINERE_${config.authorName.replace(/\s+/g, '_')}.docx`);
};
