import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * GENERATE-OFFICE-DOCUMENT v4.0 — Enhanced with OfficeCLI Design Principles
 * Richer PPTX layouts, professional typography, varied slide designs
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface DocumentRequest {
  userId: string;
  documentType: "docx" | "xlsx" | "pptx" | "pdf";
  title: string;
  description: string;
  content?: string;
  templateType?: string;
  template?: "blank" | "letterhead" | "report" | "client_notification" | "contract";
  customData?: Record<string, unknown>;
  recipientEmail?: string;
  mode?: "create" | "merge" | "fill_form";
  sourceFiles?: string[];
  templatePath?: string;
  fields?: Record<string, string>;
  excelConfig?: {
    sheets?: Array<{
      name: string;
      headers: string[];
      rows: Array<Array<string | number>>;
      formulas?: Array<{ cell: string; formula: string }>;
      columnWidths?: Record<string, number>;
    }>;
    styling?: {
      headerColor?: string;
      headerFontColor?: string;
      alternateRowColor?: string;
      autoFilter?: boolean;
      freezeHeader?: boolean;
    };
  };
  balanceContext?: Record<string, unknown>;
}

// =============================================================================
// COLOR PALETTES (inspired by OfficeCLI design system)
// =============================================================================
const PALETTES = {
  midnight: { primary: "1E2761", secondary: "CADCFC", accent: "3B82F6", bg: "0F172A", text: "F8FAFC", muted: "94A3B8" },
  ocean:    { primary: "065A82", secondary: "1C7293", accent: "21295C", bg: "0C2D48", text: "E0F2FE", muted: "7DD3FC" },
  forest:   { primary: "2C5F2D", secondary: "97BC62", accent: "1B4332", bg: "14532D", text: "F0FDF4", muted: "86EFAC" },
  coral:    { primary: "F96167", secondary: "F9E795", accent: "2F3C7E", bg: "1E293B", text: "FFF1F2", muted: "FDA4AF" },
  teal:     { primary: "028090", secondary: "00A896", accent: "02C39A", bg: "134E4A", text: "F0FDFA", muted: "5EEAD4" },
};

function pickPalette(): typeof PALETTES.midnight {
  const keys = Object.keys(PALETTES) as (keyof typeof PALETTES)[];
  return PALETTES[keys[Math.floor(Math.random() * keys.length)]];
}

// =============================================================================
// STRUCTURED AI PROMPTS PER DOCUMENT TYPE (v4.0 — enhanced)
// =============================================================================

function getStructuredPrompt(documentType: string, templateType: string, customData?: Record<string, unknown>, balanceContext?: Record<string, unknown>): string {
  const balanceSection = balanceContext ? `

DATE FINANCIARE DISPONIBILE (folosește-le OBLIGATORIU dacă sunt relevante):
${JSON.stringify(balanceContext, null, 2)}
` : '';

  switch (documentType) {
    case 'xlsx':
      return `Ești Yana, expert în generare documente Excel profesionale.
Generezi conținut structurat în format JSON pentru spreadsheet-uri.

RĂSPUNDE DOAR CU JSON VALID. Schema OBLIGATORIE:
{
  "title": "Titlul documentului",
  "sheets": [
    {
      "name": "Numele sheet-ului (max 31 caractere)",
      "headers": ["Col1", "Col2", "Col3"],
      "rows": [["val1", "val2", "val3"], ...],
      "formulas": [{"cell": "D10", "formula": "=SUM(D2:D9)"}],
      "columnWidths": {"A": 25, "B": 15}
    }
  ]
}

REGULI EXCEL PROFESIONALE:
- Toate valorile numerice ca numere, nu string-uri
- Include formule SUM/AVERAGE/COUNT/IF acolo unde are sens
- Fiecare sheet max 31 caractere în nume
- Adaugă sheet de sumar dacă datele sunt complexe
- Formatează valorile monetare cu 2 zecimale
- Adaugă totaluri și subtotaluri pe fiecare sheet
- Column widths: minim 12 pentru cifre, minim 25 pentru text descriptiv
- Organizează datele logic: categorii, subcategorii, valori
- Adaugă un sheet "Sumar" cu KPI-urile principale dacă ai mai mult de 2 sheets
${balanceSection}
${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;

    case 'pptx':
      return `Ești Yana, expert în prezentări profesionale vizuale.
Generezi conținut structurat în format JSON pentru PowerPoint cu layout-uri variate și design profesional.

RĂSPUNDE DOAR CU JSON VALID. Schema OBLIGATORIE:
{
  "title": "Titlul prezentării",
  "slides": [
    {
      "layout": "title|content|two_column|stats|comparison|quote|section_break|cta",
      "title": "Titlu slide",
      "content": "Conținut principal",
      "subtitle": "Subtitlu opțional",
      "notes": "Note speaker opționale",
      "stats": [{"value": "25%", "label": "Creștere venituri"}, ...],
      "left_content": "Conținut coloana stânga (pt two_column)",
      "right_content": "Conținut coloana dreapta (pt two_column)",
      "quote_author": "Autor citat (pt quote)"
    }
  ]
}

TIPURI LAYOUT-URI (variază-le!):
- "title" — slide de titlu principal (fundal întunecat, text mare centrat)
- "content" — conținut standard cu titlu și text/bullets
- "two_column" — două coloane cu left_content și right_content
- "stats" — numere mari impactante (stats: array de {value, label})
- "comparison" — comparație A vs B (left_content vs right_content cu titluri)
- "quote" — citat inspirațional centrat + quote_author
- "section_break" — slide de tranziție între secțiuni (fundal colorat)
- "cta" — call-to-action final

REGULI DESIGN PROFESIONAL:
- VARIAZĂ layout-urile! Nu repeta același tip de 2 ori la rând
- Max 6-8 slide-uri (concis, vizual)
- Primul slide = "title", ultimul = "cta"
- Include cel puțin un slide "stats" dacă ai cifre
- Include "two_column" pentru comparații sau pro/contra
- Bullet points cu "- " la început de linie, max 4-5 per slide
- Textul pe slide trebuie să fie SCURT — ideile lungi puse în notes
- Fiecare slide transmite O SINGURĂ idee
- Stats: maxim 3-4 valori per slide, valori scurte ("25%", "1.2M", "+15%")
${balanceSection}
${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;

    case 'docx':
      return getDocxPrompt(templateType, customData, balanceSection);

    default: // pdf
      return `Ești Yana, expert în generare documente PDF profesionale.
Generezi conținut structurat în format JSON.

RĂSPUNDE DOAR CU JSON VALID. Schema:
{
  "title": "Titlul documentului",
  "sections": [
    { "heading": "Titlu secțiune", "content": "Conținut detaliat...", "type": "text|table|list" }
  ]
}
${balanceSection}
${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;
  }
}

function getDocxPrompt(templateType: string, customData?: Record<string, unknown>, balanceSection?: string): string {
  const baseRules = `Ești Yana, expert în generare documente Word profesionale în limba română.
RĂSPUNDE DOAR CU JSON VALID.`;

  switch (templateType) {
    case 'contract':
      return `${baseRules}

Generezi un CONTRACT PROFESIONAL structurat pe articole.

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE [TIP]",
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE CONTRACTANTE", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL CONTRACTULUI", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 3 – DURATA CONTRACTULUI", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 4 – PREȚUL ȘI MODALITATEA DE PLATĂ", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 5 – OBLIGAȚIILE PRESTATORULUI", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 6 – OBLIGAȚIILE BENEFICIARULUI", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 7 – CONFIDENȚIALITATE", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 8 – RĂSPUNDEREA CONTRACTUALĂ", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 9 – ÎNCETAREA CONTRACTULUI", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 10 – FORȚA MAJORĂ", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 11 – LITIGII", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 12 – DISPOZIȚII FINALE", "content": "...", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ Acest document este un DRAFT generat automat de Yana AI și are caracter orientativ. NU constituie consultanță juridică. Vă recomandăm să consultați un avocat specializat înainte de semnare.", "type": "text" }
  ]
}

REGULI CONTRACT:
- Fiecare articol e complet și detaliat (min 3-4 propoziții)
- Folosește "[DENUMIRE PRESTATOR]" și "[DENUMIRE BENEFICIAR]" ca placeholder-uri
- Include CUI, sediu, reprezentant ca câmpuri de completat: "[CUI]", "[SEDIU]", "[REPREZENTANT]"
- Articolul despre preț include termene de plată concrete (30 zile, etc.)
- Articolul despre durată include condiții de prelungire automată
- ULTIMUL articol = DISCLAIMER obligatoriu
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'nda':
      return `${baseRules}

Generezi un ACORD DE CONFIDENȚIALITATE (NDA) profesional.

Schema OBLIGATORIE:
{
  "title": "ACORD DE CONFIDENȚIALITATE",
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 2 – DEFINIȚII", "content": "Informații Confidențiale = ...", "type": "list" },
    { "heading": "ARTICOLUL 3 – OBLIGAȚII DE CONFIDENȚIALITATE", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 4 – EXCEPȚII", "content": "...", "type": "list" },
    { "heading": "ARTICOLUL 5 – DURATA", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 6 – SANCȚIUNI", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 7 – DISPOZIȚII FINALE", "content": "...", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ Acest document este un DRAFT generat automat de Yana AI. Consultați un avocat înainte de semnare.", "type": "text" }
  ]
}
${customData ? `\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'propunere':
      return `${baseRules}

Generezi o PROPUNERE COMERCIALĂ / OFERTĂ profesională.

Schema OBLIGATORIE:
{
  "title": "PROPUNERE COMERCIALĂ",
  "sections": [
    { "heading": "1. CONTEXT ȘI NEVOI IDENTIFICATE", "content": "...", "type": "text" },
    { "heading": "2. SOLUȚIA PROPUSĂ", "content": "...", "type": "list" },
    { "heading": "3. BENEFICII CHEIE", "content": "...", "type": "list" },
    { "heading": "4. STRUCTURA PREȚULUI", "content": "...", "type": "table" },
    { "heading": "5. TIMELINE DE IMPLEMENTARE", "content": "...", "type": "table" },
    { "heading": "6. DE CE NOI", "content": "...", "type": "list" },
    { "heading": "7. URMĂTORII PAȘI", "content": "...", "type": "text" }
  ]
}
${customData ? `\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'raport':
      return `${baseRules}

Generezi un RAPORT PROFESIONAL structurat.

Schema OBLIGATORIE:
{
  "title": "RAPORT [SUBIECT]",
  "sections": [
    { "heading": "REZUMAT EXECUTIV", "content": "...", "type": "text" },
    { "heading": "1. CONTEXT ȘI OBIECTIVE", "content": "...", "type": "text" },
    { "heading": "2. ANALIZĂ DETALIATĂ", "content": "...", "type": "text" },
    { "heading": "3. CONSTATĂRI PRINCIPALE", "content": "...", "type": "list" },
    { "heading": "4. CONCLUZII", "content": "...", "type": "text" },
    { "heading": "5. RECOMANDĂRI ȘI ACȚIUNI", "content": "...", "type": "list" }
  ]
}
${balanceSection || ''}
${customData ? `\nDate suplimentare: ${JSON.stringify(customData)}` : ''}`;

    case 'factura':
      return `${baseRules}

Generezi un DRAFT VIZUAL de factură. 
⚠️ ATENȚIE: Aceasta NU este o factură fiscală validă. Pentru facturi oficiale, folosește SmartBill sau alt soft de facturare autorizat.

Schema:
{
  "title": "FACTURĂ PROFORMĂ (DRAFT)",
  "sections": [
    { "heading": "DATE FURNIZOR", "content": "[Denumire]\\nCUI: [CUI]\\nAdresă: [ADRESĂ]\\nCont: [IBAN]", "type": "text" },
    { "heading": "DATE CLIENT", "content": "[Denumire client]\\nCUI: [CUI]\\nAdresă: [ADRESĂ]", "type": "text" },
    { "heading": "SERVICII / PRODUSE", "content": "Nr. | Descriere | Cantitate | Preț unitar | Total\\n1 | [Serviciu] | 1 | [Preț] | [Total]", "type": "table" },
    { "heading": "TOTAL", "content": "Subtotal: [X] RON\\nTVA (19%): [Y] RON\\nTOTAL: [Z] RON", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ Acest document este un DRAFT vizual generat de Yana AI. NU are valoare fiscală. Folosiți SmartBill sau alt software autorizat pentru emiterea facturilor oficiale.", "type": "text" }
  ]
}
${customData ? `\nContext: ${JSON.stringify(customData)}` : ''}`;

    default:
      return `${baseRules}

Generezi un document Word profesional structurat pe secțiuni.

Schema OBLIGATORIE:
{
  "title": "Titlul documentului",
  "sections": [
    { "heading": "Titlu secțiune", "content": "Conținut detaliat...", "type": "text|table|list" }
  ]
}

REGULI:
- Conținut profesional, în limba română (dacă nu se specifică altfel)
- Structurat pe secțiuni logice
- Adaptat contextului cererii utilizatorului
- Pentru tabele: format "Header1 | Header2\\nVal1 | Val2"
- Pentru liste: fiecare element pe linie nouă, prefixat cu "- "
${balanceSection || ''}
${customData ? `\nDate suplimentare: ${JSON.stringify(customData)}` : ''}`;
  }
}

// =============================================================================
// AI CONTENT GENERATION — STRUCTURED TOOL CALLING
// =============================================================================

async function generateDocumentContent(
  description: string,
  documentType: string,
  templateType?: string,
  customData?: Record<string, unknown>,
  balanceContext?: Record<string, unknown>
): Promise<{ title: string; sections: Array<{ heading: string; content: string; type?: string }>; sheets?: unknown[]; slides?: unknown[] }> {
  const systemPrompt = getStructuredPrompt(documentType, templateType || 'general', customData, balanceContext);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    const parsed = JSON.parse(content);
    if (!parsed.sections && parsed.sheets) {
      parsed.sections = parsed.sheets.map((s: { name: string }) => ({
        heading: s.name || 'Sheet',
        content: '',
        type: 'table',
      }));
    }
    if (!parsed.sections && !parsed.slides) {
      parsed.sections = [{ heading: "Conținut", content: content || description, type: "text" }];
    }
    return parsed;
  } catch {
    return {
      title: "Document generat",
      sections: [{ heading: "Conținut", content: content || description, type: "text" }],
    };
  }
}

// ==================== DOCX GENERATION v3.0 ====================
async function generateDocx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }> },
  template?: string
): Promise<Uint8Array> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer, PageNumber, PageBreak, LevelFormat } = await import("npm:docx@9.5.1");

  const children: any[] = [];
  const isLetterhead = template === 'letterhead' || template === 'client_notification' || template === 'report';
  const isContract = template === 'contract' || template === 'nda';

  const numberingConfig = {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "articles",
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "ARTICOLUL %1 –",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 0, hanging: 0 } } },
        }],
      },
    ],
  };

  if (template === 'client_notification') {
    children.push(
      new Paragraph({ spacing: { after: 100 } }),
      new Paragraph({
        children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 22, font: "Calibri" })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Către: [DENUMIRE DESTINATAR]", size: 22, font: "Calibri", bold: true })],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Firma: [DENUMIRE FIRMĂ]", size: 22, font: "Calibri" })],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "CUI: [CUI]", size: 22, font: "Calibri" })],
        spacing: { after: 200 },
      }),
    );
  }

  if (isContract) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Nr. _______ / ${new Date().toLocaleDateString("ro-RO")}`, size: 20, font: "Calibri", color: "666666" })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: docContent.title, bold: true, size: isContract ? 32 : 36, font: "Calibri", color: "1E2761" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: isContract ? 300 : 400 },
    })
  );

  if (!isLetterhead && !isContract) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 20, color: "666666", font: "Calibri" })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      })
    );
  }

  for (const section of docContent.sections) {
    const isDisclaimer = section.heading?.toUpperCase().includes('DISCLAIMER');

    if (isDisclaimer) {
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: "─".repeat(60), size: 16, color: "CCCCCC", font: "Calibri" })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: section.content, size: 18, font: "Calibri", italics: true, color: "888888" })],
          spacing: { after: 200 },
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.heading, bold: true, size: isContract ? 24 : 28, font: "Calibri", color: "1E2761" })],
        spacing: { before: isContract ? 200 : 300, after: isContract ? 100 : 200 },
      })
    );

    if (section.type === "table" && section.content.includes("|")) {
      const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
      const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
      const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const tableRows = rows.map((row: string, idx: number) => {
        const cells = row.split("|").filter((c: string) => c.trim()).map((cell: string) =>
          new TableCell({
            borders,
            width: { size: 3000, type: WidthType.DXA },
            shading: idx === 0 ? { fill: "1E2761", type: "clear" as any } : (idx % 2 === 0 ? { fill: "F2F6FC", type: "clear" as any } : undefined),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({ text: cell.trim(), bold: idx === 0, size: 20, font: "Calibri", color: idx === 0 ? "FFFFFF" : "333333" })],
            })],
          })
        );
        return new TableRow({ children: cells });
      });

      if (tableRows.length > 0) {
        children.push(new Table({ rows: tableRows, width: { size: 9026, type: WidthType.DXA } }));
      }
    } else if (section.type === "list") {
      const items = section.content.split("\n").filter((l: string) => l.trim());
      for (const item of items) {
        children.push(
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: [new TextRun({ text: item.replace(/^[-•*]\s*/, ""), size: 22, font: "Calibri" })],
            spacing: { after: 100 },
          })
        );
      }
    } else {
      const paragraphs = section.content.split("\n\n");
      for (const para of paragraphs) {
        if (para.trim()) {
          const subLines = para.trim().split("\n");
          for (const line of subLines) {
            if (line.trim()) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: line.trim(), size: 22, font: "Calibri" })],
                  spacing: { after: 100 },
                })
              );
            }
          }
          children.push(new Paragraph({ spacing: { after: 100 } }));
        }
      }
    }
  }

  if (isContract) {
    children.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({ children: [new TextRun({ text: "PRESTATOR", bold: true, size: 22, font: "Calibri" })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: "Denumire: [DENUMIRE PRESTATOR]", size: 22, font: "Calibri" })], spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: "Reprezentant: [NUME REPREZENTANT]", size: 22, font: "Calibri" })], spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: "Semnătura: ___________________________", size: 22, font: "Calibri", color: "999999" })], spacing: { after: 300 } }),
      new Paragraph({ children: [new TextRun({ text: "BENEFICIAR", bold: true, size: 22, font: "Calibri" })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: "Denumire: [DENUMIRE BENEFICIAR]", size: 22, font: "Calibri" })], spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: "Reprezentant: [NUME REPREZENTANT]", size: 22, font: "Calibri" })], spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: "Semnătura: ___________________________", size: 22, font: "Calibri", color: "999999" })] }),
    );
  }

  if (template === 'client_notification') {
    children.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({ children: [new TextRun({ text: "Cu stimă,", size: 22, font: "Calibri" })], spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: "___________________________", size: 22, font: "Calibri", color: "999999" })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: "[Semnătura / Numele complet / Funcția]", size: 18, font: "Calibri", color: "999999", italics: true })] }),
    );
  }

  const headerChildren = isLetterhead ? [
    new Paragraph({
      children: [
        new TextRun({ text: "DOCUMENT OFICIAL", bold: true, size: 20, font: "Calibri", color: "1E2761" }),
        new TextRun({ text: `  •  ${new Date().toLocaleDateString("ro-RO")}`, size: 18, font: "Calibri", color: "999999" }),
      ],
      alignment: AlignmentType.LEFT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E2761", space: 1 } },
      spacing: { after: 200 },
    }),
  ] : isContract ? [
    new Paragraph({
      children: [
        new TextRun({ text: "CONFIDENȚIAL", bold: true, size: 16, font: "Calibri", color: "CC0000" }),
        new TextRun({ text: "  •  DRAFT — necesită verificare juridică", size: 16, font: "Calibri", color: "999999" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CC0000", space: 1 } },
      spacing: { after: 200 },
    }),
  ] : [];

  const footerChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: "Pagina ", size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ text: " din ", size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ text: "  •  Generat de Yana AI", size: 16, font: "Calibri", color: "CCCCCC" }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];

  const doc = new Document({
    numbering: numberingConfig,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Calibri", color: "1E2761" },
          paragraph: { spacing: { before: 240, after: 240 } },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Calibri", color: "2E5090" },
          paragraph: { spacing: { before: 180, after: 180 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: headerChildren.length > 0 ? { default: new Header({ children: headerChildren }) } : undefined,
      footers: { default: new Footer({ children: footerChildren }) },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// ==================== XLSX GENERATION v2.0 ====================
async function generateXlsx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }>; sheets?: any[] },
  excelConfig?: DocumentRequest["excelConfig"]
): Promise<Uint8Array> {
  const ExcelJS = (await import("npm:exceljs@4.4.0")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Yana AI";
  workbook.created = new Date();

  const styling = excelConfig?.styling || {};
  const headerColor = (styling.headerColor || "#2E5090").replace("#", "");
  const headerFontColor = (styling.headerFontColor || "#FFFFFF").replace("#", "");
  const alternateRowColor = (styling.alternateRowColor || "#F2F6FC").replace("#", "");
  const autoFilter = styling.autoFilter !== false;
  const freezeHeader = styling.freezeHeader !== false;

  const sheetsData = excelConfig?.sheets || (docContent as any).sheets || null;

  if (sheetsData && sheetsData.length > 0) {
    for (const sheetData of sheetsData) {
      const ws = workbook.addWorksheet((sheetData.name || 'Sheet').substring(0, 31));
      
      const headers = sheetData.headers || [];
      if (headers.length > 0) {
        const headerRow = ws.addRow(headers);
        headerRow.height = 24;
        headerRow.eachCell((cell: any) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerColor}` } };
          cell.font = { bold: true, color: { argb: `FF${headerFontColor}` }, size: 11, name: "Calibri" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          };
        });
      }

      const rows = sheetData.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const row = ws.addRow(rows[i]);
        row.eachCell((cell: any) => {
          cell.font = { size: 10, name: "Calibri" };
          cell.alignment = { vertical: "middle" };
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          };
          if (i % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${alternateRowColor}` } };
          }
          // Auto-format numbers
          if (typeof cell.value === 'number') {
            if (cell.value % 1 !== 0) {
              cell.numFmt = '#,##0.00';
            } else if (cell.value > 999) {
              cell.numFmt = '#,##0';
            }
          }
        });
      }

      if (sheetData.formulas) {
        for (const f of sheetData.formulas) {
          const cell = ws.getCell(f.cell);
          cell.value = { formula: f.formula } as any;
          cell.font = { bold: true, size: 11, name: "Calibri", color: { argb: `FF${headerColor}` } };
        }
      }

      if (sheetData.columnWidths || sheetData.column_widths) {
        const widths = sheetData.columnWidths || sheetData.column_widths;
        for (const [col, width] of Object.entries(widths)) {
          let colNum = 0;
          for (let i = 0; i < col.length; i++) {
            colNum = colNum * 26 + (col.charCodeAt(i) - 64);
          }
          if (colNum > 0 && colNum <= 16384) {
            ws.getColumn(colNum).width = width as number;
          }
        }
      } else {
        ws.columns.forEach((col: any) => {
          let maxLen = 12;
          col.eachCell?.({ includeEmpty: false }, (cell: any) => {
            const cellLen = String(cell.value || "").length;
            if (cellLen > maxLen) maxLen = cellLen;
          });
          col.width = Math.min(maxLen + 4, 50);
        });
      }

      if (freezeHeader) ws.views = [{ state: "frozen", ySplit: 1 }];
      if (autoFilter && headers.length > 0) {
        ws.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1 + rows.length, column: headers.length },
        };
      }
    }
  } else {
    for (const section of docContent.sections) {
      const sheetName = section.heading.substring(0, 31);

      if (section.type === "table" && section.content.includes("|")) {
        const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
        const data = rows.map((row: string) => row.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim()));

        if (data.length > 0) {
          const ws = workbook.addWorksheet(sheetName);
          const headerRow = ws.addRow(data[0]);
          headerRow.height = 24;
          headerRow.eachCell((cell: any) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerColor}` } };
            cell.font = { bold: true, color: { argb: `FF${headerFontColor}` }, size: 11, name: "Calibri" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });
          for (let i = 1; i < data.length; i++) {
            const row = ws.addRow(data[i]);
            row.eachCell((cell: any) => {
              cell.font = { size: 10, name: "Calibri" };
              if (i % 2 === 0) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${alternateRowColor}` } };
              }
            });
          }
          ws.columns.forEach((col: any) => {
            let maxLen = 12;
            col.eachCell?.({ includeEmpty: false }, (cell: any) => {
              const cellLen = String(cell.value || "").length;
              if (cellLen > maxLen) maxLen = cellLen;
            });
            col.width = Math.min(maxLen + 4, 50);
          });
          if (freezeHeader) ws.views = [{ state: "frozen", ySplit: 1 }];
          if (autoFilter) {
            ws.autoFilter = {
              from: { row: 1, column: 1 },
              to: { row: data.length, column: data[0].length },
            };
          }
        }
      } else {
        const ws = workbook.addWorksheet(sheetName);
        const lines = section.content.split("\n").filter((l: string) => l.trim());
        const titleRow = ws.addRow([section.heading]);
        titleRow.getCell(1).font = { bold: true, size: 14, name: "Calibri", color: { argb: `FF${headerColor}` } };
        ws.addRow([]);
        for (const line of lines) {
          ws.addRow([line]);
        }
        ws.getColumn(1).width = 60;
      }
    }
  }

  if (workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet("Sheet1");
    ws.addRow([docContent.title]);
    ws.addRow(["Conținut generat de Yana"]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

// ==================== PPTX GENERATION v4.0 — Rich Layouts ====================
async function generatePptx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }>; slides?: any[] }
): Promise<Uint8Array> {
  const PptxGenJS = (await import("npm:pptxgenjs@3.12.0")).default;

  const pptx = new PptxGenJS();
  pptx.author = "Yana AI";
  pptx.title = docContent.title;
  pptx.layout = "LAYOUT_16x9";

  const pal = pickPalette();

  const slides = (docContent as any).slides || null;

  if (slides && slides.length > 0) {
    for (const slideData of slides) {
      const slide = pptx.addSlide();
      const layout = slideData.layout || 'content';

      switch (layout) {
        case 'title': {
          // Full dark background with centered title + subtitle
          slide.background = { color: pal.bg };
          // Decorative accent bar at top
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.06,
            fill: { color: pal.accent },
          });
          slide.addText(slideData.title || docContent.title, {
            x: 1, y: 1.5, w: 8, h: 2,
            fontSize: 40, bold: true, color: pal.text, fontFace: "Arial",
            align: "center", valign: "middle",
          });
          if (slideData.subtitle || slideData.content) {
            slide.addText(slideData.subtitle || slideData.content, {
              x: 1.5, y: 3.8, w: 7, h: 1,
              fontSize: 16, color: pal.muted, fontFace: "Arial", align: "center",
            });
          }
          // Bottom branding
          slide.addText(`Generat de Yana • ${new Date().toLocaleDateString("ro-RO")}`, {
            x: 0, y: 5, w: 10, h: 0.4,
            fontSize: 10, color: pal.muted, fontFace: "Arial", align: "center",
          });
          break;
        }

        case 'section_break': {
          // Full colored slide for section transitions
          slide.background = { color: pal.primary };
          slide.addText(slideData.title || '', {
            x: 1, y: 1.8, w: 8, h: 2,
            fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Arial",
            align: "center", valign: "middle",
          });
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 2, y: 3.8, w: 6, h: 1,
              fontSize: 16, color: pal.secondary, fontFace: "Arial", align: "center",
            });
          }
          break;
        }

        case 'stats': {
          // Large stat numbers in cards
          slide.background = { color: "FFFFFF" };
          // Title bar
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.9,
            fill: { color: pal.bg },
          });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.12, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const stats: Array<{ value: string; label: string }> = slideData.stats || [];
          const count = Math.min(stats.length, 4);
          if (count > 0) {
            const cardW = count <= 2 ? 3.8 : 2.0;
            const gap = count <= 2 ? 0.4 : 0.3;
            const totalW = count * cardW + (count - 1) * gap;
            let startX = (10 - totalW) / 2;

            for (let i = 0; i < count; i++) {
              const x = startX + i * (cardW + gap);
              // Card background
              slide.addShape(pptx.ShapeType.roundRect, {
                x, y: 1.5, w: cardW, h: 2.8,
                fill: { color: pal.bg },
                rectRadius: 0.15,
              });
              // Big number
              slide.addText(stats[i].value, {
                x, y: 1.7, w: cardW, h: 1.6,
                fontSize: count <= 2 ? 48 : 36, bold: true, color: pal.secondary,
                fontFace: "Arial", align: "center", valign: "middle",
              });
              // Label
              slide.addText(stats[i].label, {
                x: x + 0.2, y: 3.3, w: cardW - 0.4, h: 0.8,
                fontSize: 12, color: pal.muted, fontFace: "Arial",
                align: "center", valign: "top",
              });
            }
          }

          // Additional content below
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 1, y: 4.5, w: 8, h: 0.8,
              fontSize: 13, color: "666666", fontFace: "Arial", align: "center",
            });
          }
          break;
        }

        case 'two_column':
        case 'comparison': {
          slide.background = { color: "FFFFFF" };
          // Title bar
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.9,
            fill: { color: pal.bg },
          });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.12, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          // Left column
          const leftContent = slideData.left_content || '';
          const rightContent = slideData.right_content || '';

          if (layout === 'comparison') {
            // Colored backgrounds for comparison
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.4, y: 1.2, w: 4.3, h: 3.8,
              fill: { color: pal.bg },
              rectRadius: 0.1,
            });
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 5.3, y: 1.2, w: 4.3, h: 3.8,
              fill: { color: "F5F5F5" },
              rectRadius: 0.1,
            });
          }

          // Left
          const leftLines = leftContent.split("\n").filter((l: string) => l.trim());
          if (leftLines.some((l: string) => l.startsWith("-") || l.startsWith("•"))) {
            slide.addText(
              leftLines.map((l: string) => ({
                text: l.replace(/^[-•*]\s*/, ""),
                options: { fontSize: 14, fontFace: "Arial", color: layout === 'comparison' ? pal.text : "333333", bullet: true, breakType: "break" as const },
              })),
              { x: 0.6, y: 1.4, w: 3.8, h: 3.4, valign: "top" }
            );
          } else {
            slide.addText(leftContent, {
              x: 0.6, y: 1.4, w: 3.8, h: 3.4,
              fontSize: 14, color: layout === 'comparison' ? pal.text : "333333", fontFace: "Arial", valign: "top",
              lineSpacingMultiple: 1.3,
            });
          }

          // Right
          const rightLines = rightContent.split("\n").filter((l: string) => l.trim());
          if (rightLines.some((l: string) => l.startsWith("-") || l.startsWith("•"))) {
            slide.addText(
              rightLines.map((l: string) => ({
                text: l.replace(/^[-•*]\s*/, ""),
                options: { fontSize: 14, fontFace: "Arial", color: "333333", bullet: true, breakType: "break" as const },
              })),
              { x: 5.5, y: 1.4, w: 3.8, h: 3.4, valign: "top" }
            );
          } else {
            slide.addText(rightContent, {
              x: 5.5, y: 1.4, w: 3.8, h: 3.4,
              fontSize: 14, color: "333333", fontFace: "Arial", valign: "top",
              lineSpacingMultiple: 1.3,
            });
          }

          // Divider line
          slide.addShape(pptx.ShapeType.rect, {
            x: 4.9, y: 1.4, w: 0.02, h: 3.4,
            fill: { color: "DDDDDD" },
          });
          break;
        }

        case 'quote': {
          slide.background = { color: pal.bg };
          // Large quote mark
          slide.addText('"', {
            x: 1, y: 0.8, w: 2, h: 1.5,
            fontSize: 120, color: pal.primary, fontFace: "Georgia",
            bold: true,
          });
          // Quote text
          slide.addText(slideData.content || '', {
            x: 1.5, y: 2, w: 7, h: 2,
            fontSize: 22, color: pal.text, fontFace: "Georgia",
            italic: true, align: "center", valign: "middle",
            lineSpacingMultiple: 1.5,
          });
          // Author
          if (slideData.quote_author) {
            slide.addText(`— ${slideData.quote_author}`, {
              x: 2, y: 4.2, w: 6, h: 0.5,
              fontSize: 14, color: pal.muted, fontFace: "Arial", align: "center",
            });
          }
          break;
        }

        case 'cta': {
          slide.background = { color: pal.bg };
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.06,
            fill: { color: pal.accent },
          });
          slide.addText(slideData.title || "Mulțumesc!", {
            x: 1, y: 1.5, w: 8, h: 1.5,
            fontSize: 44, bold: true, color: pal.text, fontFace: "Arial",
            align: "center", valign: "middle",
          });
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 2, y: 3.2, w: 6, h: 1.2,
              fontSize: 18, color: pal.muted, fontFace: "Arial",
              align: "center", valign: "top",
            });
          }
          // Contact/action line
          if (slideData.subtitle) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 3, y: 4.3, w: 4, h: 0.6,
              fill: { color: pal.primary },
              rectRadius: 0.3,
            });
            slide.addText(slideData.subtitle, {
              x: 3, y: 4.3, w: 4, h: 0.6,
              fontSize: 14, bold: true, color: "FFFFFF", fontFace: "Arial",
              align: "center", valign: "middle",
            });
          }
          break;
        }

        default: {
          // Standard content slide
          slide.background = { color: "FFFFFF" };
          // Title bar with gradient effect
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.9,
            fill: { color: pal.bg },
          });
          // Accent line under title bar
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0.9, w: 10, h: 0.04,
            fill: { color: pal.primary },
          });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.12, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const content = (slideData.content || '').substring(0, 1500);
          const lines = content.split("\n").filter((l: string) => l.trim());

          if (lines.some((l: string) => l.startsWith("-") || l.startsWith("•"))) {
            slide.addText(
              lines.map((l: string) => ({
                text: l.replace(/^[-•*]\s*/, ""),
                options: { fontSize: 15, fontFace: "Arial", color: "333333", bullet: { type: "bullet", style: "●", indent: 15 }, breakType: "break" as const },
              })),
              { x: 0.8, y: 1.3, w: 8.4, h: 3.8, valign: "top", lineSpacingMultiple: 1.4 }
            );
          } else {
            slide.addText(content, {
              x: 0.5, y: 1.3, w: 9, h: 3.8,
              fontSize: 15, color: "333333", fontFace: "Arial", valign: "top",
              lineSpacingMultiple: 1.4,
            });
          }

          // Slide number in corner
          slide.addText(`${slides.indexOf(slideData) + 1}`, {
            x: 9.2, y: 5, w: 0.5, h: 0.4,
            fontSize: 10, color: "BBBBBB", fontFace: "Arial", align: "right",
          });
          break;
        }
      }

      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }
  } else {
    // Fallback: generate from sections
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: pal.bg };
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.06,
      fill: { color: pal.accent },
    });
    titleSlide.addText(docContent.title, {
      x: 1, y: 1.5, w: 8, h: 2,
      fontSize: 40, bold: true, color: pal.text, fontFace: "Arial",
      align: "center", valign: "middle",
    });
    titleSlide.addText(`Generat de Yana • ${new Date().toLocaleDateString("ro-RO")}`, {
      x: 1, y: 4, w: 8, h: 0.5,
      fontSize: 12, color: pal.muted, fontFace: "Arial", align: "center",
    });

    for (const section of docContent.sections) {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.9,
        fill: { color: pal.bg },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0.9, w: 10, h: 0.04,
        fill: { color: pal.primary },
      });
      slide.addText(section.heading, {
        x: 0.5, y: 0.12, w: 9, h: 0.65,
        fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
      });

      const contentText = section.content.substring(0, 1500);
      const lines = contentText.split("\n").filter((l: string) => l.trim());

      if (section.type === "list" || lines.every((l: string) => l.startsWith("-") || l.startsWith("•"))) {
        slide.addText(
          lines.map((l: string) => ({
            text: l.replace(/^[-•*]\s*/, ""),
            options: { fontSize: 15, fontFace: "Arial", color: "333333", bullet: true, breakType: "break" as const },
          })),
          { x: 0.8, y: 1.3, w: 8.4, h: 3.8, valign: "top", lineSpacingMultiple: 1.4 }
        );
      } else {
        slide.addText(contentText, {
          x: 0.5, y: 1.3, w: 9, h: 3.8,
          fontSize: 15, color: "333333", fontFace: "Arial", valign: "top",
          lineSpacingMultiple: 1.4,
        });
      }
    }

    const endSlide = pptx.addSlide();
    endSlide.background = { color: pal.bg };
    endSlide.addText("Mulțumesc!", {
      x: 1, y: 2, w: 8, h: 2,
      fontSize: 44, bold: true, color: pal.text, fontFace: "Arial",
      align: "center", valign: "middle",
    });
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" });
  return new Uint8Array(arrayBuffer as ArrayBuffer);
}

// ==================== PDF GENERATION ====================
async function generatePdf(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }> }
): Promise<Uint8Array> {
  const { jsPDF } = await import("npm:jspdf@2.5.2");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(docContent.title, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 10 + 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, pageWidth - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  for (const section of docContent.sections) {
    if (y > 260) { doc.addPage(); y = 20; }

    const isDisclaimer = section.heading?.toUpperCase().includes('DISCLAIMER');

    doc.setFontSize(isDisclaimer ? 10 : 16);
    doc.setFont("helvetica", isDisclaimer ? "italic" : "bold");
    doc.setTextColor(isDisclaimer ? 136 : 30, isDisclaimer ? 136 : 39, isDisclaimer ? 136 : 97);
    const headingLines = doc.splitTextToSize(section.heading, contentWidth);
    doc.text(headingLines, margin, y);
    y += headingLines.length * 7 + 5;

    doc.setFontSize(isDisclaimer ? 9 : 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(isDisclaimer ? 136 : 50, isDisclaimer ? 136 : 50, isDisclaimer ? 136 : 50);

    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 8;
  }

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} din ${totalPages} • Generat de Yana AI`, pageWidth / 2, 290, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

async function mergePdfs(supabase: any, sourceFiles: string[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("npm:pdf-lib@1.17.1");
  
  const mergedPdf = await PDFDocument.create();
  
  for (const filePath of sourceFiles) {
    try {
      const { data, error } = await supabase.storage
        .from("generated-documents")
        .download(filePath);
      
      if (error || !data) {
        console.warn(`[PDF-MERGE] Failed to download ${filePath}:`, error);
        continue;
      }
      
      const pdfBytes = new Uint8Array(await data.arrayBuffer());
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      pages.forEach((page: any) => mergedPdf.addPage(page));
    } catch (err) {
      console.warn(`[PDF-MERGE] Error processing ${filePath}:`, err);
    }
  }
  
  if (mergedPdf.getPageCount() === 0) {
    throw new Error("Nu am putut combina niciun PDF. Verifică fișierele sursă.");
  }
  
  const mergedBytes = await mergedPdf.save();
  return new Uint8Array(mergedBytes);
}

async function fillPdfForm(supabase: any, templatePath: string, fields: Record<string, string>): Promise<Uint8Array> {
  const { PDFDocument } = await import("npm:pdf-lib@1.17.1");
  
  console.log(`[PDF-FILL] Loading template: ${templatePath}`);
  
  const { data, error } = await supabase.storage
    .from("generated-documents")
    .download(templatePath);
  
  if (error || !data) {
    throw new Error(`Nu am putut descărca template-ul PDF: ${error?.message || 'fișier negăsit'}`);
  }
  
  const pdfBytes = new Uint8Array(await data.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  try {
    const form = pdfDoc.getForm();
    const fieldNames = form.getFields().map((f: any) => f.getName());
    console.log(`[PDF-FILL] Template has ${fieldNames.length} fields: ${fieldNames.join(', ')}`);
    
    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
          console.log(`[PDF-FILL] Set field "${fieldName}" = "${value.substring(0, 30)}..."`);
        }
      } catch (fieldErr) {
        console.warn(`[PDF-FILL] Could not set field "${fieldName}":`, fieldErr);
      }
    }
    
    form.flatten();
  } catch (formErr) {
    console.warn('[PDF-FILL] No AcroForm found in PDF, fields cannot be filled:', formErr);
    throw new Error('Template-ul PDF nu conține câmpuri de formular (AcroForm). Verifică fișierul.');
  }
  
  const filledBytes = await pdfDoc.save();
  return new Uint8Array(filledBytes);
}

// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[DOC-GEN][${requestId}] Request received`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Neautorizat" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalid" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DocumentRequest = await req.json();
    const { documentType, title, description, content, templateType, template, customData, recipientEmail, mode, sourceFiles, excelConfig, balanceContext, templatePath, fields } = body;

    // PDF Merge mode
    if (mode === "merge" && documentType === "pdf" && sourceFiles?.length) {
      console.log(`[DOC-GEN][${requestId}] PDF MERGE mode: ${sourceFiles.length} files`);
      
      const mergedBuffer = await mergePdfs(supabase, sourceFiles);
      const fileName = `${user.id}/merged_${Date.now()}.pdf`;
      
      await supabase.storage.from("generated-documents").upload(fileName, mergedBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      
      const { data: signedUrlData } = await supabase.storage
        .from("generated-documents")
        .createSignedUrl(fileName, 7 * 24 * 60 * 60);
      
      return new Response(
        JSON.stringify({
          success: true,
          documentTitle: "PDF Combinat",
          documentType: "pdf",
          downloadUrl: signedUrlData?.signedUrl,
          filePath: fileName,
          fileSize: mergedBuffer.length,
          emailSent: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PDF Fill Form mode
    if (mode === "fill_form" && documentType === "pdf" && templatePath && fields) {
      console.log(`[DOC-GEN][${requestId}] PDF FILL_FORM mode: template=${templatePath}, fields=${Object.keys(fields).length}`);
      
      const filledBuffer = await fillPdfForm(supabase, templatePath, fields);
      const fileName = `${user.id}/filled_${Date.now()}.pdf`;
      
      await supabase.storage.from("generated-documents").upload(fileName, filledBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      
      const { data: signedUrlData } = await supabase.storage
        .from("generated-documents")
        .createSignedUrl(fileName, 7 * 24 * 60 * 60);
      
      await supabase.from("generated_documents").insert({
        user_id: user.id,
        document_type: "pdf_filled",
        document_title: `Formular completat`,
        main_file_path: fileName,
        metadata: {
          generated_by: "yana-office-generator-v4",
          mode: "fill_form",
          template_path: templatePath,
          fields_count: Object.keys(fields).length,
        },
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          documentTitle: "Formular PDF Completat",
          documentType: "pdf",
          downloadUrl: signedUrlData?.signedUrl,
          filePath: fileName,
          fileSize: filledBuffer.length,
          emailSent: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!documentType || !description) {
      return new Response(JSON.stringify({ error: "documentType și description sunt obligatorii" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveTemplate = template || templateType || 'general';
    console.log(`[DOC-GEN][${requestId}] Type: ${documentType}, Template: ${effectiveTemplate}, Title: ${title || 'auto'}`);

    const docContent = content
      ? { title: title || "Document", sections: [{ heading: "Conținut", content, type: "text" }] }
      : await generateDocumentContent(description, documentType, effectiveTemplate, customData, balanceContext);

    console.log(`[DOC-GEN][${requestId}] AI content generated: ${docContent.sections?.length || 0} sections, ${(docContent as any).sheets?.length || 0} sheets, ${(docContent as any).slides?.length || 0} slides`);

    let fileBuffer: Uint8Array;
    let contentType: string;
    let extension: string;

    switch (documentType) {
      case "docx":
        fileBuffer = await generateDocx(docContent, effectiveTemplate);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;
      case "xlsx":
        fileBuffer = await generateXlsx(docContent, excelConfig);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;
      case "pptx":
        fileBuffer = await generatePptx(docContent);
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        extension = "pptx";
        break;
      case "pdf":
        fileBuffer = await generatePdf(docContent);
        contentType = "application/pdf";
        extension = "pdf";
        break;
      default:
        throw new Error(`Tip document nesuportat: ${documentType}`);
    }

    console.log(`[DOC-GEN][${requestId}] File generated: ${fileBuffer.length} bytes`);

    const sanitizedTitle = (docContent.title || title || "document")
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50) || 'document';
    const fileName = `${user.id}/${sanitizedTitle}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, fileBuffer, { contentType, upsert: false });

    if (uploadError) {
      console.error(`[DOC-GEN][${requestId}] Upload error:`, uploadError);
      throw new Error(`Eroare la salvare: ${uploadError.message}`);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("generated-documents")
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    if (signedUrlError) {
      throw new Error(`Eroare la generare URL: ${signedUrlError.message}`);
    }

    await supabase.from("generated_documents").insert({
      user_id: user.id,
      document_type: templateType || documentType,
      document_title: docContent.title || title || "Document generat",
      main_file_path: fileName,
      metadata: {
        generated_by: "yana-office-generator-v4",
        document_format: documentType,
        template_type: templateType,
        template: template,
        file_size_bytes: fileBuffer.length,
        sections_count: docContent.sections?.length || 0,
        slides_count: (docContent as any).slides?.length || 0,
        recipient_email: recipientEmail || null,
        has_excel_config: !!excelConfig,
        has_balance_context: !!balanceContext,
      },
    });

    let emailSent = false;
    if (recipientEmail) {
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

        if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
          const docTitle = docContent.title || title || "Document";
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: RESEND_FROM_EMAIL,
              to: [recipientEmail],
              subject: `📎 ${docTitle} — Document generat de Yana`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #1E2761; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">📄 Document generat de Yana</h1>
                  </div>
                  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1E2761; margin-top: 0;">${docTitle}</h2>
                    <p style="color: #333; line-height: 1.6;">
                      Documentul tău <strong>${extension.toUpperCase()}</strong> a fost generat cu succes.
                    </p>
                    <div style="text-align: center; margin: 25px 0;">
                      <a href="${signedUrlData.signedUrl}" 
                         style="background: #1E2761; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        ⬇️ Descarcă documentul
                      </a>
                    </div>
                    <p style="color: #888; font-size: 13px; text-align: center;">
                      Link-ul expiră în 7 zile.
                    </p>
                  </div>
                  <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 15px;">
                    Generat automat de Yana AI • ${new Date().toLocaleDateString("ro-RO")}
                  </p>
                </div>
              `,
            }),
          });

          if (resendResponse.ok) {
            emailSent = true;
            console.log(`[DOC-GEN][${requestId}] Email sent via Resend to ${recipientEmail}`);
          } else {
            const resendError = await resendResponse.text();
            console.warn(`[DOC-GEN][${requestId}] Resend error: ${resendResponse.status} - ${resendError}`);
          }
        }
      } catch (emailErr) {
        console.warn(`[DOC-GEN][${requestId}] Email send failed:`, emailErr);
      }
    }

    console.log(`[DOC-GEN][${requestId}] ✅ Complete. File: ${fileName}, Email: ${emailSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentTitle: docContent.title || title,
        documentType: extension,
        downloadUrl: signedUrlData.signedUrl,
        filePath: fileName,
        fileSize: fileBuffer.length,
        emailSent,
        recipientEmail: recipientEmail || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[DOC-GEN][${requestId}] ❌ Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la generarea documentului" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
