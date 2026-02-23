import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BusinessProfile, AIAnalysis, Assumptions, CostEstimate, AIOpportunity } from '@/config/aiStrategyData';

export function generateAIStrategyPDF(
  profile: BusinessProfile,
  analysis: AIAnalysis,
  assumptions: Assumptions,
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addNewPageIfNeeded = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Strategie Transformare Digitala cu AI', 14, 20);
  doc.setFontSize(11);
  doc.text(`YANA - Analiza generata pe ${new Date().toLocaleDateString('ro-RO')}`, 14, 30);
  doc.setTextColor(0, 0, 0);
  y = 50;

  // Sumar executiv
  doc.setFontSize(16);
  doc.text('Sumar Executiv', 14, y);
  y += 8;
  doc.setFontSize(10);
  const industryLabel = profile.industry.charAt(0).toUpperCase() + profile.industry.slice(1);
  const summaryLines = [
    `Industrie: ${industryLabel} | Angajati: ${profile.employeesCount}`,
    `Cifra de afaceri: ${profile.annualRevenue.toLocaleString('ro-RO')} RON | Profit net: ${profile.netProfit.toLocaleString('ro-RO')} RON`,
    `Departamente: ${profile.departments.join(', ') || 'Nespecificate'}`,
    `Oportunitati AI identificate: ${analysis.opportunities.length}`,
  ];
  summaryLines.forEach(line => {
    doc.text(line, 14, y);
    y += 6;
  });
  y += 6;

  // Oportunități
  addNewPageIfNeeded(40);
  doc.setFontSize(14);
  doc.text('Oportunitati AI Identificate', 14, y);
  y += 8;

  const oppData = analysis.opportunities.map((o: AIOpportunity, i: number) => [
    `${i + 1}`,
    o.title,
    o.description.substring(0, 80) + (o.description.length > 80 ? '...' : ''),
    `${o.impact}/10`,
    `${o.timeSavingsHoursMonth}h/luna`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Oportunitate', 'Descriere', 'Impact', 'Economie']],
    body: oppData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Costuri
  addNewPageIfNeeded(40);
  doc.setFontSize(14);
  doc.text('Costuri de Implementare', 14, y);
  y += 8;

  const costData = analysis.costEstimates.map((c: CostEstimate) => [
    c.toolName,
    `${c.monthlyCostRON.toLocaleString('ro-RO')} RON`,
    `${c.users}`,
    `${(c.monthlyCostRON * c.users).toLocaleString('ro-RO')} RON`,
    `${c.setupCostRON.toLocaleString('ro-RO')} RON`,
  ]);

  const totalMonthly = analysis.costEstimates.reduce((s: number, c: CostEstimate) => s + c.monthlyCostRON * c.users, 0);
  costData.push(['TOTAL', '', '', `${totalMonthly.toLocaleString('ro-RO')} RON`, '']);

  autoTable(doc, {
    startY: y,
    head: [['Tool', 'Cost/user/luna', 'Utilizatori', 'Total lunar', 'Setup']],
    body: costData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ROI
  addNewPageIfNeeded(40);
  doc.setFontSize(14);
  doc.text('Previziuni ROI', 14, y);
  y += 8;

  const totalTimeSavings = analysis.opportunities.reduce((s: number, o: AIOpportunity) => s + o.timeSavingsHoursMonth, 0);
  const monthlyBenefits = totalTimeSavings * assumptions.hourlyCost +
    (profile.annualRevenue / 12) * (assumptions.growthPercent / 100) * 0.15 +
    (profile.annualRevenue / 12) * (assumptions.costReductionPercent / 100) * 0.3;

  const totalSetup = analysis.costEstimates.reduce((s: number, c: CostEstimate) => s + c.setupCostRON, 0);

  const roiData = [6, 12, 24].map(m => {
    const ramp = m <= 6 ? 0.5 : m <= 12 ? 0.75 : 1;
    const benefits = monthlyBenefits * m * ramp;
    const costs = totalSetup + totalMonthly * m;
    const roi = costs > 0 ? ((benefits - costs) / costs * 100) : 0;
    return [
      `${m} luni`,
      `${Math.round(benefits).toLocaleString('ro-RO')} RON`,
      `${Math.round(costs).toLocaleString('ro-RO')} RON`,
      `${Math.round(benefits - costs).toLocaleString('ro-RO')} RON`,
      `${Math.round(roi)}%`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Perioada', 'Beneficii', 'Costuri', 'Net', 'ROI']],
    body: roiData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Plan implementare
  addNewPageIfNeeded(40);
  doc.setFontSize(14);
  doc.text('Plan de Implementare', 14, y);
  y += 8;

  analysis.roadmap.forEach((phase) => {
    addNewPageIfNeeded(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(phase.phase, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    phase.actions.forEach(action => {
      doc.text(`• ${action}`, 18, y);
      y += 5;
    });
    doc.text(`Tools: ${phase.tools.join(', ')} | Cost: ${phase.estimatedCostRON.toLocaleString('ro-RO')} RON`, 18, y);
    y += 5;
    doc.text(`Responsabil: ${phase.responsible} | Rezultat: ${phase.expectedResult}`, 18, y);
    y += 8;
  });

  // Disclaimer
  addNewPageIfNeeded(30);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('DISCLAIMER: Cifrele prezentate sunt estimari bazate pe benchmark-uri din industrie si nu constituie garantii.', 14, y);
  y += 4;
  doc.text('Se recomanda consultarea unui specialist inainte de implementare. Curs USD/RON utilizat: ' + assumptions.usdRonRate, 14, y);
  y += 4;
  doc.text(`Generat de YANA - Velcont | ${new Date().toLocaleDateString('ro-RO')}`, 14, y);

  doc.save(`Strategie-AI-${profile.industry}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
