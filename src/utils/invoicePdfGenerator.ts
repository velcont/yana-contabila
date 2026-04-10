/**
 * Romanian Invoice PDF Generator
 * Adapted from: https://github.com/kprovorov/invoi (MIT License)
 * Uses jspdf for PDF generation with Romanian fiscal layout
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceData } from './invoiceTypes';
import { calculateInvoiceTotals, formatCurrencyRO, formatDateRO, numberToWordsRO } from './invoiceCalculator';

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const totals = calculateInvoiceTotals(data);
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── HEADER ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURĂ', pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const serieNr = `Seria ${data.invoiceSeries} Nr. ${data.invoiceNumber}`;
  doc.text(serieNr, pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.text(`Data emiterii: ${formatDateRO(data.issueDate)}`, pageW / 2, y, { align: 'center' });
  if (data.dueDate) {
    y += 4;
    doc.text(`Scadenta: ${formatDateRO(data.dueDate)}`, pageW / 2, y, { align: 'center' });
  }
  y += 8;

  // ── SUPPLIER & CUSTOMER BOXES ──
  const boxW = contentW / 2 - 3;
  const boxStartY = y;
  const boxH = 42;

  // Supplier box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, boxStartY, boxW, boxH, 2, 2);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('FURNIZOR', margin + 3, boxStartY + 5);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.supplier.name || '—', margin + 3, boxStartY + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let sy = boxStartY + 16;
  if (data.supplier.cui) { doc.text(`CUI: ${data.supplier.cui}`, margin + 3, sy); sy += 4; }
  if (data.supplier.registrationNumber) { doc.text(`Reg. Com.: ${data.supplier.registrationNumber}`, margin + 3, sy); sy += 4; }
  if (data.supplier.address) { doc.text(data.supplier.address, margin + 3, sy); sy += 4; }
  if (data.supplier.city) { doc.text(`${data.supplier.city}${data.supplier.county ? ', ' + data.supplier.county : ''}`, margin + 3, sy); sy += 4; }
  if (data.supplier.bankAccount) { doc.text(`IBAN: ${data.supplier.bankAccount}`, margin + 3, sy); sy += 4; }
  if (data.supplier.bankName) { doc.text(`Banca: ${data.supplier.bankName}`, margin + 3, sy); }

  // Customer box
  const custX = margin + boxW + 6;
  doc.roundedRect(custX, boxStartY, boxW, boxH, 2, 2);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('CLIENT', custX + 3, boxStartY + 5);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name || '—', custX + 3, boxStartY + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let cy = boxStartY + 16;
  if (data.customer.cui) { doc.text(`CUI: ${data.customer.cui}`, custX + 3, cy); cy += 4; }
  if (data.customer.registrationNumber) { doc.text(`Reg. Com.: ${data.customer.registrationNumber}`, custX + 3, cy); cy += 4; }
  if (data.customer.address) { doc.text(data.customer.address, custX + 3, cy); cy += 4; }
  if (data.customer.city) { doc.text(`${data.customer.city}${data.customer.county ? ', ' + data.customer.county : ''}`, custX + 3, cy); cy += 4; }
  if (data.customer.bankAccount) { doc.text(`IBAN: ${data.customer.bankAccount}`, custX + 3, cy); cy += 4; }
  if (data.customer.bankName) { doc.text(`Banca: ${data.customer.bankName}`, custX + 3, cy); }

  y = boxStartY + boxH + 8;

  // ── LINE ITEMS TABLE ──
  const tableHeaders = [['Nr.', 'Descriere', 'U.M.', 'Cant.', 'Pret unit.', 'Valoare', 'TVA %', 'TVA']];
  const tableBody = data.lineItems.map((item, i) => {
    const lineVal = parseFloat((item.quantity * item.unitPrice).toFixed(2));
    const vatAmt = data.isVatPayer ? parseFloat((lineVal * item.vatRate / 100).toFixed(2)) : 0;
    return [
      String(i + 1),
      item.description || '—',
      item.unitCode,
      String(item.quantity),
      formatCurrencyRO(item.unitPrice, data.currency),
      formatCurrencyRO(lineVal, data.currency),
      data.isVatPayer ? `${item.vatRate}%` : 'N/A',
      formatCurrencyRO(vatAmt, data.currency),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 24, halign: 'right' },
    },
    theme: 'grid',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── TOTALS ──
  const totalsX = pageW - margin - 70;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatCurrencyRO(totals.subtotal, data.currency), pageW - margin, y, { align: 'right' });
  y += 5;

  if (data.isVatPayer) {
    for (const vat of totals.vatBreakdown) {
      doc.text(`TVA ${vat.rate}%:`, totalsX, y);
      doc.text(formatCurrencyRO(vat.amount, data.currency), pageW - margin, y, { align: 'right' });
      y += 5;
    }
  }

  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, y);
  doc.text(formatCurrencyRO(totals.grandTotal, data.currency), pageW - margin, y, { align: 'right' });
  y += 6;

  // Total in words
  if (data.currency === 'RON') {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const words = numberToWordsRO(totals.grandTotal);
    doc.text(`Adica: ${words}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  } else {
    y += 4;
  }

  // ── DELEGATION (optional) ──
  if (data.delegateName) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Date delegat:', margin, y);
    y += 4;
    doc.text(`Nume: ${data.delegateName}`, margin + 3, y);
    if (data.delegateId) { y += 4; doc.text(`Act identitate: ${data.delegateId}`, margin + 3, y); }
    if (data.delegateVehicle) { y += 4; doc.text(`Mijloc transport: ${data.delegateVehicle}`, margin + 3, y); }
    y += 8;
  }

  // ── NOTE ──
  if (data.note) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(data.note, contentW);
    doc.text(noteLines, margin, y);
    doc.setTextColor(0, 0, 0);
    y += noteLines.length * 4 + 6;
  }

  // ── SIGNATURES ──
  const sigY = Math.max(y + 10, 250);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Supplier signature
  doc.text('Semnatura furnizor', margin + 20, sigY, { align: 'center' });
  doc.line(margin, sigY + 2, margin + 40, sigY + 2);

  // Customer signature
  doc.text('Semnatura client', pageW - margin - 20, sigY, { align: 'center' });
  doc.line(pageW - margin - 40, sigY + 2, pageW - margin, sigY + 2);

  // ── FOOTER ──
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('Factura generata cu YANA Contabila - yana-contabila.lovable.app', pageW / 2, 290, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  return doc;
}

/**
 * Generate and download invoice as PDF
 */
export function downloadInvoicePdf(data: InvoiceData): void {
  const doc = generateInvoicePdf(data);
  const fileName = `Factura_${data.invoiceSeries}_${data.invoiceNumber}_${data.issueDate}.pdf`;
  doc.save(fileName);
}

/**
 * Generate invoice as base64 string (for preview or storage)
 */
export function invoicePdfToBase64(data: InvoiceData): string {
  const doc = generateInvoicePdf(data);
  return doc.output('datauristring');
}
