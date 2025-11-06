import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel,
  TableOfContents,
  PageBreak
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { processDocumenter } from "@/lib/processDocumenter";
import { generateProcessReport } from "./generateProcessReport";
import { generateSourcesSpreadsheet, extractSourcesFromContent } from "./generateSourcesSpreadsheet";
import { saveDocumentToLibrary } from "./documentStorage";
import { toast } from "sonner";

interface ChapterData {
  chapter_number: number;
  chapter_title: string;
  content: string;
  word_count: number;
}

export const generateDoctorateDocument = async (
  title: string,
  chapters: ChapterData[],
  exportAsZip: boolean = true
) => {
  // Log document generation start
  processDocumenter.logAction(
    'DOCUMENT_ASSEMBLY',
    `Începere asamblare document complet: ${title} (${chapters.length} capitole)`,
    false
  );
  const doc = new Document({
    creator: "Yana AI - Academic Assistant",
    title: title,
    description: "Teză de Doctorat - Document Final",
    
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch = 1440 twips
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: [
        // Cover Page
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 2880, after: 1440 }
        }),
        
        new Paragraph({
          text: "TEZĂ DE DOCTORAT",
          alignment: AlignmentType.CENTER,
          spacing: { after: 2880 }
        }),
        
        new Paragraph({
          text: new Date().getFullYear().toString(),
          alignment: AlignmentType.CENTER,
          spacing: { after: 1440 }
        }),
        
        // Page Break
        new Paragraph({
          children: [new PageBreak()]
        }),
        
        // Table of Contents
        new Paragraph({
          text: "CUPRINS",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        }),
        
        new TableOfContents("Cuprins", {
          hyperlink: true,
          headingStyleRange: "1-3"
        }),
        
        // Page Break
        new Paragraph({
          children: [new PageBreak()]
        }),
        
        // Chapters
        ...chapters.flatMap((chapter) => {
          const paragraphs: Paragraph[] = [];
          
          // Chapter Title
          paragraphs.push(
            new Paragraph({
              text: `${chapter.chapter_number}. ${chapter.chapter_title}`,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 400 }
            })
          );
          
          // Chapter Content - split by paragraphs
          const contentParagraphs = chapter.content
            .split('\n')
            .filter(p => p.trim().length > 0);
          
          contentParagraphs.forEach((text) => {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: text.trim(),
                    font: "Times New Roman",
                    size: 24 // 12pt = 24 half-points
                  })
                ],
                spacing: { 
                  before: 200, 
                  after: 200,
                  line: 360 // 1.5 line spacing
                },
                alignment: AlignmentType.JUSTIFIED
              })
            );
          });
          
          // Add word count note at the end of chapter
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Capitol ${chapter.chapter_number}: ${chapter.word_count.toLocaleString()} cuvinte]`,
                  italics: true,
                  size: 20,
                  color: "808080"
                })
              ],
              spacing: { before: 400, after: 400 },
              alignment: AlignmentType.RIGHT
            })
          );
          
          // Page Break after each chapter
          paragraphs.push(
            new Paragraph({
              children: [new PageBreak()]
            })
          );
          
          return paragraphs;
        }),
        
        // Bibliography Section
        new Paragraph({
          text: "BIBLIOGRAFIE",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 400 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "[Bibliografie va fi adăugată aici din toate capitolele]",
              italics: true,
              color: "808080"
            })
          ]
        })
      ]
    }]
  });
  
  // Generate main document blob
  const docBlob = await Packer.toBlob(doc);
  const baseFileName = `Doctorat_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  
  processDocumenter.logAction(
    'DOCUMENT_GENERATED',
    `Document principal generat: ${chapters.reduce((sum, c) => sum + c.word_count, 0)} cuvinte totale`,
    false
  );
  
  if (!exportAsZip) {
    // Simple export - just the document
    saveAs(docBlob, `${baseFileName}.docx`);
    return `${baseFileName}.docx`;
  }
  
  // Generate complete package with evidence
  const zip = new JSZip();
  
  // Add main document
  zip.file(`${baseFileName}.docx`, docBlob);
  
  // Generate process report
  const stats = processDocumenter.getSessionStats();
  const allLogs = processDocumenter.getAllLogs();
  
  const processReportBlob = await generateProcessReport({
    thesisTitle: title,
    chapterNumber: chapters.length,
    logs: allLogs,
    stats: stats
  });
  
  zip.file(`${baseFileName}_PROCES_MUNCA.pdf`, processReportBlob);
  
  processDocumenter.logAction(
    'PROCESS_REPORT_GENERATED',
    `Raport proces generat: ${allLogs.length} acțiuni documentate, ${stats.totalDurationHours} ore`,
    false
  );
  
  // Generate sources spreadsheet
  let sourcesBlob: Blob | undefined;
  const allSources = chapters.flatMap((chapter, idx) => 
    extractSourcesFromContent(chapter.content, idx + 1)
  );
  
  if (allSources.length > 0) {
    sourcesBlob = await generateSourcesSpreadsheet(allSources, chapters.length);
    zip.file(`${baseFileName}_BIBLIOGRAFIE.xlsx`, sourcesBlob);
    
    processDocumenter.logAction(
      'SOURCES_SPREADSHEET_GENERATED',
      `Fișier bibliografie generat: ${allSources.length} surse detectate`,
      false
    );
  }
  
  // Add process logs as JSON for transparency
  const logsJSON = processDocumenter.exportLogsJSON();
  zip.file(`${baseFileName}_LOGS.json`, logsJSON);
  
  // Add README with instructions
  const readme = `PACHET COMPLET TEZĂ DE DOCTORAT
═══════════════════════════════════════

Titlu: ${title}
Data generare: ${new Date().toLocaleString('ro-RO')}
Capitole incluse: ${chapters.length}
Total cuvinte: ${chapters.reduce((sum, c) => sum + c.word_count, 0).toLocaleString()}

CONȚINUT PACHET:
════════════════

1. ${baseFileName}.docx
   → Documentul principal al tezei (format Word)
   → Gata pentru citire și revizie

2. ${baseFileName}_PROCES_MUNCA.pdf
   → Jurnal detaliat de lucru (Process Documentation)
   → Conține: timeline, metadata, statistici, dovezi autenticitate
   → UTILIZARE: Demonstrează că lucrarea este realizată de tine

3. ${baseFileName}_BIBLIOGRAFIE.xlsx
   → Fișier Excel cu toate sursele detaliate
   → Conține: surse, autori, ani, concepte folosite, timp lectură
   → UTILIZARE: Verificare rapidă bibliografie

4. ${baseFileName}_LOGS.json
   → Export complet al log-urilor în format JSON
   → UTILIZARE: Verificare tehnică, audit detaliat

PENTRU SUSȚINERE:
══════════════════

La susținerea tezei, prezintă fișierul "${baseFileName}_PROCES_MUNCA.pdf" 
pentru a demonstra procesul de lucru și originalitatea lucrării.

Acest pachet oferă TRANSPARENȚĂ TOTALĂ și DOVEZI VERIFICABILE 
ale procesului academic.

Generat de: YANA Academic Assistant
Versiune: 1.0
`;
  
  zip.file('README.txt', readme);
  
  // Generate ZIP and download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `${baseFileName}_PACHET_COMPLET.zip`;
  saveAs(zipBlob, zipFileName);
  
  processDocumenter.logAction(
    'ZIP_EXPORT_COMPLETE',
    `Export finalizat: ${zipFileName} cu toate dovezile incluse`,
    false
  );
  
  // Save to library
  try {
    const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    await saveDocumentToLibrary({
      documentType: "doctorate",
      documentTitle: title,
      mainFileBlob: docBlob,
      mainFileExtension: "docx",
      guideFileBlob: processReportBlob,
      bibliographyFileBlob: sourcesBlob,
      zipFileBlob: zipBlob,
      wordCount: totalWords,
      metadata: {
        chapters: chapters.length,
        version: "complete_package"
      }
    });
    toast.success("Teză salvată în biblioteca ta!");
  } catch (error) {
    console.error("Error saving to library:", error);
    toast.error("Teza a fost descărcată, dar nu a putut fi salvată în bibliotecă");
  }
  
  return zipFileName;
};
