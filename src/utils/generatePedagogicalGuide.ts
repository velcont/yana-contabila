import jsPDF from 'jspdf';

export const generatePedagogicalGuide = async (data: {
  documentTitle: string;
  authorName: string;
  scriptContent: string;
}) => {
  const doc = new jsPDF();
  
  // PAGINA 1: COVER
  doc.setFillColor(41, 128, 185); // Blue
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('GHID DE SUSȚINERE ACADEMICĂ', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`Pentru: ${data.authorName}`, 105, 30, { align: 'center' });
  
  // Resetare culoare
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(data.documentTitle, 105, 55, { align: 'center', maxWidth: 180 });
  
  doc.setFontSize(12);
  doc.text(`Generat: ${new Date().toLocaleString('ro-RO')}`, 105, 70, { align: 'center' });
  
  // Instrucțiuni cover
  doc.setFontSize(11);
  const instructions = [
    '📋 CONȚINUT GHID:',
    '',
    '1. Scripturi răspunsuri pentru întrebări frecvente',
    '2. Dovezi concrete de prezentat la susținere',
    '3. Timeline proces de lucru',
    '4. Sfaturi pentru pregătire și susținere',
    '',
    '⏱️ TIMP PREGĂTIRE RECOMANDAT: 30 minute',
    '📖 CITEȘTE TOT GHIDUL înainte de susținere!',
  ];
  
  let yPos = 90;
  instructions.forEach(line => {
    doc.text(line, 20, yPos);
    yPos += 7;
  });
  
  // PAGINA 2+: SCRIPT COMPLET
  doc.addPage();
  doc.setFontSize(10);
  
  const scriptLines = data.scriptContent.split('\n');
  yPos = 20;
  
  scriptLines.forEach(line => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    if (line.includes('ÎNTREBAREA')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    } else if (line.includes('TU RĂSPUNZI') || line.includes('DOVEZI')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }
    
    const wrapped = doc.splitTextToSize(line, 170);
    wrapped.forEach((l: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(l, 20, yPos);
      yPos += 5;
    });
  });
  
  return doc.output('blob');
};
