interface BattlePlanFact {
  fact_key: string;
  fact_value: string;
  fact_unit: string | null;
  fact_category: string;
}

interface BattlePlanData {
  facts: BattlePlanFact[];
  lastStrategy: string;
  companyName: string;
  date: string;
}

/**
 * Extract company name from facts or use default
 */
const extractCompanyName = (facts: BattlePlanFact[]): string => {
  const companyFact = facts.find(f => 
    f.fact_key.toLowerCase().includes('companie') || 
    f.fact_key.toLowerCase().includes('firma')
  );
  return companyFact?.fact_value || 'Compania Ta';
};

/**
 * Extract vulnerabilities from strategy text
 */
const extractVulnerabilities = (strategy: string): string[] => {
  const vulnerabilities: string[] = [];
  const lines = strategy.split('\n');
  
  let inVulnerabilitySection = false;
  lines.forEach(line => {
    if (line.toLowerCase().includes('vulnerabilit') || 
        line.toLowerCase().includes('risc') ||
        line.toLowerCase().includes('problemă')) {
      inVulnerabilitySection = true;
    }
    if (inVulnerabilitySection && (line.trim().startsWith('-') || line.trim().startsWith('•'))) {
      vulnerabilities.push(line.trim().substring(1).trim());
    }
    if (line.trim() === '' && vulnerabilities.length > 0) {
      inVulnerabilitySection = false;
    }
  });
  
  return vulnerabilities.slice(0, 5); // Top 5 vulnerabilities
};

/**
 * Extract action items from strategy text
 */
const extractActionPlan = (strategy: string): Array<{ deadline: string; action: string }> => {
  const actions: Array<{ deadline: string; action: string }> = [];
  const lines = strategy.split('\n');
  
  let actionCounter = 1;
  lines.forEach(line => {
    if ((line.includes('trebuie') || line.includes('urgent') || line.includes('imediat')) &&
        line.length > 20 && line.length < 200) {
      const deadline = actionCounter <= 7 ? `1-7` : actionCounter <= 30 ? `8-30` : `31-90`;
      actions.push({
        deadline,
        action: line.trim().replace(/^[-•*]\s*/, ''),
      });
      actionCounter += 10;
    }
  });
  
  return actions.slice(0, 12); // Max 12 actions
};

/**
 * Normalize Romanian text for PDF compatibility
 */
const normalizeRomanianText = (text: string): string => {
  return text
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/Ă/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Î/g, 'I')
    .replace(/Ș/g, 'S')
    .replace(/Ț/g, 'T');
};

/**
 * Generate Strategic Battle Plan PDF
 */
export const generateStrategicBattlePlan = async (data: BattlePlanData) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ========== PAGE 1: COVER ==========
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.text('BATTLE PLAN', pageWidth / 2, 80, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeRomanianText('Plan Strategic de Executie - 90 Zile'), pageWidth / 2, 100, { align: 'center' });
  
  // Red line separator
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(2);
  doc.line(40, 110, pageWidth - 40, 110);
  
  // Company info
  doc.setFontSize(14);
  doc.text(normalizeRomanianText(`Companie: ${data.companyName}`), pageWidth / 2, 140, { align: 'center' });
  doc.setFontSize(12);
  doc.text(normalizeRomanianText(`Generat: ${data.date}`), pageWidth / 2, 155, { align: 'center' });
  
  // Confidential stamp
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', pageWidth / 2, 220, { align: 'center' });
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('YANA Strategic Advisor', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // ========== PAGE 2: FINANCIAL HEALTH CHECK ==========
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text(normalizeRomanianText('1. VERIFICARE SANATATE FINANCIARA'), 15, 25);
  
  // Financial table
  const financialFacts = data.facts
    .filter(f => f.fact_category === 'financiar' || f.fact_category === 'operational')
    .slice(0, 15); // Limit to 15 facts
  
  const financialTable = financialFacts.map(f => [
    normalizeRomanianText(f.fact_key),
    normalizeRomanianText(`${f.fact_value} ${f.fact_unit || ''}`),
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[normalizeRomanianText('Indicator'), normalizeRomanianText('Valoare')]],
    body: financialTable,
    theme: 'grid',
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ========== PAGE 3: CRITICAL VULNERABILITIES ==========
  doc.addPage();
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text(normalizeRomanianText('2. VULNERABILITATI CRITICE'), 15, 25);
  
  const vulnerabilities = extractVulnerabilities(data.lastStrategy);
  
  if (vulnerabilities.length > 0) {
    let yPos = 40;
    vulnerabilities.forEach((vuln, index) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(`${index + 1}.`, 20, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(normalizeRomanianText(vuln), pageWidth - 35);
      doc.text(lines, 30, yPos);
      yPos += lines.length * 7 + 10;
      
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 25;
      }
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(normalizeRomanianText('Nu au fost identificate vulnerabilitati critice.'), 20, 40);
  }

  // ========== PAGE 4: 90-DAY EXECUTION PLAN ==========
  doc.addPage();
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(normalizeRomanianText('3. PLAN DE EXECUTIE 90 ZILE'), 15, 25);
  
  const executionSteps = extractActionPlan(data.lastStrategy);
  
  if (executionSteps.length > 0) {
    let yPos = 40;
    executionSteps.forEach((step, index) => {
      // Checkbox
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(20, yPos - 4, 5, 5);
      
      // Deadline badge
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(30, yPos - 4, 18, 5, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(normalizeRomanianText(`Zile ${step.deadline}`), 39, yPos, { align: 'center' });
      
      // Action text
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(normalizeRomanianText(step.action), pageWidth - 60);
      doc.text(lines, 52, yPos);
      yPos += lines.length * 7 + 8;
      
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 25;
      }
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(normalizeRomanianText('Nu au fost identificate actiuni specifice.'), 20, 40);
  }

  // ========== FOOTER pe toate paginile ==========
  const totalPages = (doc as any).internal.pages.length - 1; // Exclude the first empty page
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `YANA Strategic | Pagina ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `BattlePlan_${data.companyName.replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  doc.save(normalizeRomanianText(fileName));
};
