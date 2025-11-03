import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PlagiarismReport {
  overallScore: number;
  riskLevel: string;
  plagiarismProbability: number;
  criteriaScores: {
    [key: string]: {
      score: number;
      issues: string[];
      severity: string;
      locations: string[];
    };
  };
  detailedFindings: Array<{
    criterion: string;
    location: string;
    issue: string;
    recommendation: string;
    severity: string;
  }>;
  recommendations: string[];
}

interface ChapterInfo {
  chapterNumber: number;
  chapterTitle: string;
}

export function exportPlagiarismReportPDF(report: PlagiarismReport, chapterInfo: ChapterInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // primary color
  doc.text('YANA - Raport Anti-Plagiat Academic', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Capitol ${chapterInfo.chapterNumber}: ${chapterInfo.chapterTitle}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(10);
  doc.text(`Data raport: ${new Date().toLocaleDateString('ro-RO')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Overall Score Section
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('📊 SCOR GENERAL', 20, yPosition);
  yPosition += 10;

  const getRiskColor = (risk: string): [number, number, number] => {
    switch (risk) {
      case 'LOW': return [34, 197, 94]; // green
      case 'MEDIUM': return [234, 179, 8]; // yellow
      case 'HIGH': return [249, 115, 22]; // orange
      case 'CRITICAL': return [239, 68, 68]; // red
      default: return [100, 100, 100]; // gray
    }
  };

  const riskColor = getRiskColor(report.riskLevel);
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.rect(20, yPosition, 40, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`${report.overallScore}/100`, 40, yPosition + 7, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Nivel Risc: ${report.riskLevel}`, 70, yPosition + 7);
  doc.text(`Probabilitate Plagiat: ${report.plagiarismProbability}%`, 140, yPosition + 7);

  yPosition += 20;

  // Criteria Table
  doc.setFontSize(14);
  doc.text('🔍 Evaluare Criterii', 20, yPosition);
  yPosition += 5;

  const criteriaNames: Record<string, { name: string; max: number }> = {
    typographyVariations: { name: 'Variații Tipografice', max: 20 },
    translationErrors: { name: 'Erori de Traducere', max: 20 },
    styleInconsistency: { name: 'Stil Incoerent', max: 15 },
    structureLogic: { name: 'Structură Ilogică', max: 10 },
    personInconsistency: { name: 'Inconsistențe Persoană', max: 15 },
    citationInconsistency: { name: 'Inconsistențe Citări', max: 10 },
    bibliographyIssues: { name: 'Probleme Bibliografice', max: 5 },
    attributionErrors: { name: 'Erori Atribuire', max: 5 },
  };

  const criteriaTableData = Object.entries(report.criteriaScores).map(([key, value]) => [
    criteriaNames[key]?.name || key,
    `${value.score}/${criteriaNames[key]?.max || 20}`,
    value.severity,
    value.issues.length.toString(),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Criteriu', 'Scor', 'Severitate', 'Nr. Probleme']],
    body: criteriaTableData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Detailed Findings
  if (report.detailedFindings.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('🔎 Probleme Detectate', 20, yPosition);
    yPosition += 5;

    const findingsData = report.detailedFindings.map(finding => [
      finding.criterion,
      finding.location,
      finding.issue,
      finding.recommendation,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Criteriu', 'Locație', 'Problemă', 'Recomandare']],
      body: findingsData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60 },
        3: { cellWidth: 60 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Recommendations
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.text('📋 Recomandări de Acțiune', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  report.recommendations.forEach((rec, idx) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 40);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * 6;
  });

  // Footer disclaimer
  yPosition += 10;
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimer = 'Acest raport este generat automat de YANA pentru a asista în procesul de revizuire academică. Nu înlocuiește analiza umană profesională și nu constituie o evaluare oficială pentru CNATDCU.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 40);
  doc.text(disclaimerLines, 20, yPosition);

  // Save PDF
  const filename = `Raport_AntiPlagiat_Capitol_${chapterInfo.chapterNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
