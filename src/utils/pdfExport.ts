import { FinancialIndicators, formatCurrency, formatNumber } from './analysisParser';

// Types for dynamic jsPDF import
type JsPDFType = any;
type AutoTableType = any;

interface ExportData {
  companyName: string;
  fileName: string;
  date: string;
  indicators: FinancialIndicators;
  alerts: Array<{
    type: string;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  recommendations: string[];
  fullAnalysisText: string;
  themeColor?: 'entrepreneur' | 'accountant'; // Add theme parameter
}

// Normalize Romanian text by replacing diacritics with correct equivalents
const normalizeRomanianText = (text: string): string => {
  return text
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/ș/g, 's')
    .replace(/Ș/g, 'S')
    .replace(/ț/g, 't')
    .replace(/Ț/g, 'T');
};

// Color palettes based on theme
const ENTREPRENEUR_PRIMARY: [number, number, number] = [59, 130, 246]; // Blue
const ACCOUNTANT_PRIMARY: [number, number, number] = [16, 185, 129]; // Green
const DANGER_COLOR: [number, number, number] = [239, 68, 68]; // Red
const WARNING_COLOR: [number, number, number] = [245, 158, 11]; // Amber
const SUCCESS_COLOR: [number, number, number] = [16, 185, 129]; // Green

export const generateAnalysisPDF = async (data: ExportData): Promise<void> => {
  // Dynamic import to reduce initial bundle size
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  
  const doc = new jsPDF();
  
  // Determine primary color based on theme
  const PRIMARY_COLOR = data.themeColor === 'accountant' ? ACCOUNTANT_PRIMARY : ENTREPRENEUR_PRIMARY;
  
  // Use Helvetica - works perfectly without spacing issues
  doc.setFont('helvetica', 'normal');
  
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
  doc.text(normalizeRomanianText('Analiză Financiară Automatizată'), 15, 28);
  
  // Date and filename
  doc.setFontSize(8);
  doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')}`, 150, 28);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Company Info Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeRomanianText('Informații Firmă'), 15, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeRomanianText(`Firmă: ${data.companyName || 'N/A'}`), 15, yPos);
  yPos += 6;
  doc.text(normalizeRomanianText(`Fișier: ${data.fileName}`), 15, yPos);
  yPos += 6;
  doc.text(normalizeRomanianText(`Perioadă analiză: ${data.date}`), 15, yPos);
  yPos += 15;

  // Critical Alerts Section
  if (data.alerts.length > 0) {
    doc.setFillColor(239, 68, 68, 0.1);
    doc.rect(10, yPos - 5, 190, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DANGER_COLOR);
    doc.text(normalizeRomanianText('⚠️ Alerte Critice'), 15, yPos);
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
      doc.text(normalizeRomanianText(alert.title), 20, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(normalizeRomanianText(alert.description), 170);
      doc.text(descLines, 20, yPos);
      yPos += descLines.length * 4 + 3;
    });
    yPos += 5;
  }

  // Key Financial Indicators Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeRomanianText('Indicatori Financiari Principali'), 15, yPos);
  yPos += 10;

  const indicatorsData = [
    [normalizeRomanianText('Indicator'), normalizeRomanianText('Valoare'), 'Status'],
    [normalizeRomanianText('Cifră Afaceri'), formatCurrency(data.indicators.revenue || 0), '📊'],
    [normalizeRomanianText('Cheltuieli'), formatCurrency(data.indicators.expenses || 0), '💰'],
    [normalizeRomanianText('Profit Net'), formatCurrency(data.indicators.profit || 0), data.indicators.profit > 0 ? '✅' : '❌'],
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
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 9,
      font: 'helvetica',
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
  doc.text(normalizeRomanianText('Evidențe Bilanț'), 15, yPos);
  yPos += 10;

  const balanceData = [
    [normalizeRomanianText('Categorie'), normalizeRomanianText('Valoare')],
    [normalizeRomanianText('Disponibil Bancă'), formatCurrency(data.indicators.soldBanca || 0)],
    [normalizeRomanianText('Disponibil Casă'), formatCurrency(data.indicators.soldCasa || 0)],
    [normalizeRomanianText('Creanțe Clienți'), formatCurrency(data.indicators.soldClienti || 0)],
    [normalizeRomanianText('Datorii Furnizori'), formatCurrency(data.indicators.soldFurnizori || 0)],
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
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Full Analysis Text Section - EXACT content from interface
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(10, yPos - 5, 190, 10, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(normalizeRomanianText('📊 Analiză Completă'), 15, yPos);
  yPos += 15;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

  // Split the full analysis text into lines that fit the page - NORMALIZE the text first!
  const normalizedAnalysisText = normalizeRomanianText(data.fullAnalysisText);
  const analysisLines = doc.splitTextToSize(normalizedAnalysisText, 180);
  
  analysisLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 15, yPos);
    yPos += 5;
  });

  yPos += 10;
  if (data.recommendations.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(10, yPos - 5, 190, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(normalizeRomanianText('💡 Recomandări Acționabile'), 15, yPos);
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
      const normalizedRec = normalizeRomanianText(rec);
      const recLines = doc.splitTextToSize(normalizedRec, 165);
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
      normalizeRomanianText(`Pagina ${i} din ${pageCount} | Generat de Yana AI | ${new Date().toLocaleDateString('ro-RO')}`),
      105,
      287,
      { align: 'center' }
    );
  }

  // Save PDF
  const normalizedCompanyName = normalizeRomanianText(data.companyName || 'Firma');
  const normalizedDate = normalizeRomanianText(data.date);
  const pdfFileName = `Analiza_${normalizedCompanyName}_${normalizedDate.replace(/\s+/g, '_')}.pdf`;
  doc.save(pdfFileName);
};
