import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialIndicators, formatCurrency, formatNumber } from './analysisParser';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface AnalysisSection {
  title: string;
  content: string;
}

interface ExportData {
  companyName: string;
  fileName: string;
  date: string;
  fullAnalysisText: string;
  indicators: FinancialIndicators;
  alerts: Array<{
    type: string;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  recommendations: string[];
}

const PRIMARY_COLOR: [number, number, number] = [59, 130, 246]; // rgb(59, 130, 246) - primary blue
const DANGER_COLOR: [number, number, number] = [239, 68, 68]; // rgb(239, 68, 68) - red
const WARNING_COLOR: [number, number, number] = [245, 158, 11]; // rgb(245, 158, 11) - amber
const SUCCESS_COLOR: [number, number, number] = [16, 185, 129]; // rgb(16, 185, 129) - green

// Helper function to extract sections from analysis text
const extractSections = (text: string): AnalysisSection[] => {
  const sections: AnalysisSection[] = [];
  
  // Try to split by numbered sections: ### 1. or **1.** or just 1.
  const sectionPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?(\d+)[\.\)]\s*(?:\*\*)?\s*([^\n*]+)/g;
  const matches = Array.from(text.matchAll(sectionPattern));
  
  if (matches.length > 0) {
    matches.forEach((match, index) => {
      let sectionTitle = match[2].trim()
        .replace(/\*\*/g, '')
        .replace(/\$/g, '')
        .replace(/^\d+(?:\/\d+)*\s*[–—-]+\s*/g, '')
        .replace(/^\*{0,2}Cont\s+\d+(?:\/\d+)*\s+/gi, '')
        .replace(/^([^(]+?)\s*(?:\([^)]*\)|\bîn\b|\bîn\s+Solduri\b).*$/i, '$1')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s+în\s+(?:Solduri|Total).*$/gi, '')
        .replace(/[:\s–—-]+$/g, '')
        .replace(/\s*&\s*/g, ' și ')
        .replace(/\s+/g, ' ')
        .trim();
        
      const startIndex = match.index!;
      const endIndex = index < matches.length - 1 ? matches[index + 1].index! : text.length;
      const content = text.substring(startIndex, endIndex).trim();
      
      sections.push({
        title: sectionTitle,
        content: content
      });
    });
  } else {
    // Fallback: treat entire text as one section
    sections.push({
      title: 'Analiză Financiară Completă',
      content: text
    });
  }
  
  return sections;
};

export const generateAnalysisPDF = (data: ExportData): void => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header with logo and title
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('YANA', 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Analiză Financiară Automatizată', 15, 28);
  
  // Date and filename
  doc.setFontSize(8);
  doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')}`, 150, 28);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Company Info Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Informații Firmă', 15, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Firmă: ${data.companyName || 'N/A'}`, 15, yPos);
  yPos += 6;
  doc.text(`Fișier: ${data.fileName}`, 15, yPos);
  yPos += 6;
  doc.text(`Perioadă analiză: ${data.date}`, 15, yPos);
  yPos += 15;

  // Critical Alerts Section
  if (data.alerts.length > 0) {
    doc.setFillColor(239, 68, 68, 0.1);
    doc.rect(10, yPos - 5, 190, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DANGER_COLOR);
    doc.text('⚠️ Alerte Critice', 15, yPos);
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    data.alerts.slice(0, 5).forEach((alert) => {
      const severityColor = 
        alert.severity === 'critical' ? DANGER_COLOR :
        alert.severity === 'warning' ? WARNING_COLOR : PRIMARY_COLOR;
      
      doc.setFillColor(...severityColor);
      doc.circle(13, yPos - 1.5, 1.5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text(alert.title, 20, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(alert.description, 170);
      doc.text(descLines, 20, yPos);
      yPos += descLines.length * 4 + 3;
    });
    yPos += 5;
  }

  // Key Financial Indicators Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicatori Financiari Principali', 15, yPos);
  yPos += 10;

  const indicatorsData = [
    ['Indicator', 'Valoare', 'Status'],
    ['Cifră Afaceri', formatCurrency(data.indicators.revenue || 0), '📊'],
    ['Cheltuieli', formatCurrency(data.indicators.expenses || 0), '💰'],
    ['Profit Net', formatCurrency(data.indicators.profit || 0), data.indicators.profit > 0 ? '✅' : '❌'],
    ['EBITDA', formatCurrency(data.indicators.ebitda || 0), data.indicators.ebitda > 0 ? '✅' : '⚠️'],
    ['DSO (zile)', formatNumber(data.indicators.dso || 0), data.indicators.dso > 60 ? '⚠️' : '✅'],
    ['DPO (zile)', formatNumber(data.indicators.dpo || 0), '📊'],
    ['Cash Conversion Cycle', `${formatNumber(data.indicators.cashConversionCycle || 0)} zile`, '⏱️'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [indicatorsData[0]],
    body: indicatorsData.slice(1),
    theme: 'grid',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Balance Sheet Highlights
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Evidențe Bilanț', 15, yPos);
  yPos += 10;

  const balanceData = [
    ['Categorie', 'Valoare'],
    ['Disponibil Bancă', formatCurrency(data.indicators.soldBanca || 0)],
    ['Disponibil Casă', formatCurrency(data.indicators.soldCasa || 0)],
    ['Creanțe Clienți', formatCurrency(data.indicators.soldClienti || 0)],
    ['Datorii Furnizori', formatCurrency(data.indicators.soldFurnizori || 0)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [balanceData[0]],
    body: balanceData.slice(1),
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Full Analysis Text - All Sections
  if (data.fullAnalysisText) {
    const sections = extractSections(data.fullAnalysisText);
    
    sections.forEach((section, sectionIndex) => {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      // Section Header
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(10, yPos - 5, 190, 10, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${sectionIndex + 1}. ${section.title}`, 15, yPos);
      yPos += 12;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Clean and split content into lines
      const cleanContent = section.content
        .replace(/#{1,3}\s*/g, '') // Remove markdown headers
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/^\d+[\.\)]\s*[^\n]+\n/gm, '') // Remove section title line
        .trim();

      const contentLines = doc.splitTextToSize(cleanContent, 180);
      
      // Add content lines
      contentLines.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        
        // Check if line looks like a bullet point or list item
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
          doc.setFont('helvetica', 'normal');
          doc.text(line, 20, yPos);
        } else if (line.trim().length > 0) {
          doc.text(line, 15, yPos);
        }
        
        yPos += 5;
      });
      
      yPos += 5; // Space between sections
    });
  }

  // Recommendations Section (if not already included in full text)
  if (data.recommendations.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...SUCCESS_COLOR);
    doc.rect(10, yPos - 5, 190, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('💡 Recomandări Acționabile', 15, yPos);
    yPos += 12;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    data.recommendations.slice(0, 8).forEach((rec, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(...SUCCESS_COLOR);
      doc.circle(13, yPos - 1.5, 1.5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}.`, 20, yPos);
      
      doc.setFont('helvetica', 'normal');
      const recLines = doc.splitTextToSize(rec, 165);
      doc.text(recLines, 27, yPos);
      yPos += recLines.length * 4 + 2;
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Pagina ${i} din ${pageCount} | Generat de Yana AI | ${new Date().toLocaleDateString('ro-RO')}`,
      105,
      287,
      { align: 'center' }
    );
  }

  // Save PDF
  const pdfFileName = `Analiza_${data.companyName || 'Firma'}_${data.date.replace(/\s+/g, '_')}.pdf`;
  doc.save(pdfFileName);
};
