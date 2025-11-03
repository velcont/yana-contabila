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

interface ChapterData {
  chapter_number: number;
  chapter_title: string;
  content: string;
  word_count: number;
}

export const generateDoctorateDocument = async (
  title: string,
  chapters: ChapterData[]
) => {
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
  
  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  const fileName = `Doctorat_DRAFT_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
  
  return fileName;
};
