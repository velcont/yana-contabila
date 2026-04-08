import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * GENERATE-OFFICE-DOCUMENT v5.0 — Major Upgrade
 * 
 * Improvements:
 * - PPTX: 3 new layouts (timeline, icon_grid, checklist), gradient overlays, better typography
 * - DOCX: Professional cover page, TOC placeholder, colored section accents, improved tables
 * - XLSX: Conditional formatting, totals row, auto-summary sheet, sparkline-ready
 * - AI Prompts: More specific, richer content generation
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
// COLOR PALETTES v2.0 — Richer, more professional
// =============================================================================
const PALETTES = {
  midnight:   { primary: "1E2761", secondary: "CADCFC", accent: "3B82F6", bg: "0F172A", text: "F8FAFC", muted: "94A3B8", highlight: "818CF8", cardBg: "1E293B" },
  ocean:      { primary: "065A82", secondary: "1C7293", accent: "21295C", bg: "0C2D48", text: "E0F2FE", muted: "7DD3FC", highlight: "38BDF8", cardBg: "164E63" },
  forest:     { primary: "2C5F2D", secondary: "97BC62", accent: "1B4332", bg: "14532D", text: "F0FDF4", muted: "86EFAC", highlight: "4ADE80", cardBg: "166534" },
  coral:      { primary: "F96167", secondary: "F9E795", accent: "2F3C7E", bg: "1E293B", text: "FFF1F2", muted: "FDA4AF", highlight: "FB7185", cardBg: "374151" },
  teal:       { primary: "028090", secondary: "00A896", accent: "02C39A", bg: "134E4A", text: "F0FDFA", muted: "5EEAD4", highlight: "2DD4BF", cardBg: "115E59" },
  charcoal:   { primary: "36454F", secondary: "F2F2F2", accent: "EAB308", bg: "1F2937", text: "F9FAFB", muted: "9CA3AF", highlight: "FBBF24", cardBg: "374151" },
  berry:      { primary: "6D2E46", secondary: "A26769", accent: "ECE2D0", bg: "1C1017", text: "FDF2F8", muted: "F9A8D4", highlight: "EC4899", cardBg: "3B0764" },
};

function pickPalette(): typeof PALETTES.midnight {
  const keys = Object.keys(PALETTES) as (keyof typeof PALETTES)[];
  return PALETTES[keys[Math.floor(Math.random() * keys.length)]];
}

// =============================================================================
// ENHANCED AI PROMPTS v5.0
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
      "columnWidths": {"A": 25, "B": 15},
      "conditionalRules": [{"column": "D", "type": "positive_negative"}]
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
- OBLIGATORIU: Adaugă un sheet "Sumar Executiv" cu KPI-urile principale
- Adaugă "conditionalRules" pentru coloane care beneficiază de formatare condiționată:
  - "positive_negative": verde pentru valori pozitive, roșu pentru negative
  - "percentage": bare de progres vizuale
  - "threshold": evidențiere valori peste/sub un prag
- Include formule de calcul procentaje, variații, totaluri
${balanceSection}
${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;

    case 'pptx':
      return `Ești Yana, expert în prezentări profesionale vizuale cu design de top.
Generezi conținut structurat în format JSON pentru PowerPoint cu layout-uri variate și design profesional.

RĂSPUNDE DOAR CU JSON VALID. Schema OBLIGATORIE:
{
  "title": "Titlul prezentării",
  "slides": [
    {
      "layout": "title|content|two_column|stats|comparison|quote|section_break|cta|timeline|icon_grid|checklist",
      "title": "Titlu slide",
      "content": "Conținut principal",
      "subtitle": "Subtitlu opțional",
      "notes": "Note speaker opționale",
      "stats": [{"value": "25%", "label": "Creștere venituri", "trend": "up"}, ...],
      "left_content": "Conținut coloana stânga",
      "right_content": "Conținut coloana dreapta",
      "quote_author": "Autor citat",
      "timeline_items": [{"step": "1", "title": "Pas 1", "description": "Detalii"}, ...],
      "grid_items": [{"icon": "📊", "title": "Titlu", "description": "Detalii"}, ...],
      "checklist_items": [{"text": "Item", "checked": true}, ...]
    }
  ]
}

TIPURI LAYOUT-URI (variază-le obligatoriu!):
- "title" — slide de titlu principal (fundal întunecat, text mare centrat)
- "content" — conținut standard cu titlu și text/bullets
- "two_column" — două coloane cu left_content și right_content
- "stats" — numere mari impactante (stats: array de {value, label, trend})
- "comparison" — comparație A vs B (left_content vs right_content)
- "quote" — citat inspirațional centrat + quote_author
- "section_break" — slide de tranziție între secțiuni (fundal colorat)
- "cta" — call-to-action final
- "timeline" — timeline vizual cu pași/etape (timeline_items: array de {step, title, description})
- "icon_grid" — grid 2x2 sau 2x3 cu emoji + titlu + descriere (grid_items: array)
- "checklist" — listă de verificare cu checkbox-uri (checklist_items: array)

REGULI DESIGN PROFESIONAL OBLIGATORII:
- VARIAZĂ layout-urile! Max 2 slide-uri "content" consecutive, apoi altceva
- 8-12 slide-uri (concis, vizual, variat)
- Primul slide = "title", ultimul = "cta"
- Include cel puțin un slide "stats" dacă ai cifre
- Include cel puțin un "timeline" sau "icon_grid" pentru varietate vizuală
- Include "two_column" sau "comparison" pentru pro/contra
- Bullet points cu "- " la început de linie, max 4-5 per slide
- Textul pe slide trebuie să fie SCURT — ideile lungi în notes
- Fiecare slide transmite O SINGURĂ idee
- Stats: maxim 3-4 valori per slide, valori scurte ("25%", "1.2M", "+15%")
- Timeline: 3-5 pași, descrieri scurte (1-2 propoziții)
- Icon grid: 4-6 items cu emoji relevante
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
  "subtitle": "Subtitlu opțional",
  "sections": [
    { "heading": "Titlu secțiune", "content": "Conținut detaliat...", "type": "text|table|list|highlight" }
  ]
}

REGULI:
- Adaugă un "subtitle" descriptiv
- Folosește type "highlight" pentru box-uri evidențiate cu informații importante
- Fiecare secțiune cu conținut substanțial (min 3-4 propoziții)
- Structură logică cu flux narativ clar
${balanceSection}
${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;
  }
}

function getDocxPrompt(templateType: string, customData?: Record<string, unknown>, balanceSection?: string): string {
  const baseRules = `Ești Yana, expert în generare documente Word profesionale în limba română.
RĂSPUNDE DOAR CU JSON VALID.

REGULI GENERALE DOCUMENT WORD:
- Conținut profesional, structurat, în limba română
- Fiecare secțiune cu conținut substanțial (min 3-5 propoziții)
- Pentru tabele: format "Header1 | Header2\\nVal1 | Val2"
- Pentru liste: fiecare element pe linie nouă, prefixat cu "- "
- Adaugă un câmp "summary" cu un rezumat executiv de 2-3 fraze
- Adaugă un câmp "keywords" cu 3-5 cuvinte cheie relevante`;

  switch (templateType) {
    case 'contract':
      return `${baseRules}

Generezi un CONTRACT PROFESIONAL structurat pe articole.

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE [TIP]",
  "summary": "Rezumat executiv al contractului...",
  "keywords": ["contract", "prestări servicii", "obligații"],
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
  "summary": "Acord de protecție a informațiilor confidențiale...",
  "keywords": ["NDA", "confidențialitate", "protecție date"],
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
  "summary": "Propunere de colaborare pentru...",
  "keywords": ["propunere", "ofertă", "colaborare"],
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
  "summary": "Rezumat executiv al raportului...",
  "keywords": ["raport", "analiză", "concluzii"],
  "sections": [
    { "heading": "REZUMAT EXECUTIV", "content": "...", "type": "highlight" },
    { "heading": "1. CONTEXT ȘI OBIECTIVE", "content": "...", "type": "text" },
    { "heading": "2. ANALIZĂ DETALIATĂ", "content": "...", "type": "text" },
    { "heading": "3. CONSTATĂRI PRINCIPALE", "content": "...", "type": "list" },
    { "heading": "4. DATE ȘI CIFRE", "content": "...", "type": "table" },
    { "heading": "5. CONCLUZII", "content": "...", "type": "text" },
    { "heading": "6. RECOMANDĂRI ȘI ACȚIUNI", "content": "...", "type": "list" }
  ]
}
${balanceSection || ''}
${customData ? `\nDate suplimentare: ${JSON.stringify(customData)}` : ''}`;

    case 'factura':
      return `${baseRules}

Generezi un DRAFT VIZUAL de factură.
⚠️ ATENȚIE: Aceasta NU este o factură fiscală validă.

Schema:
{
  "title": "FACTURĂ PROFORMĂ (DRAFT)",
  "summary": "Draft de factură pentru...",
  "keywords": ["factură", "proformă", "draft"],
  "sections": [
    { "heading": "DATE FURNIZOR", "content": "[Denumire]\\nCUI: [CUI]\\nAdresă: [ADRESĂ]\\nCont: [IBAN]", "type": "text" },
    { "heading": "DATE CLIENT", "content": "[Denumire client]\\nCUI: [CUI]\\nAdresă: [ADRESĂ]", "type": "text" },
    { "heading": "SERVICII / PRODUSE", "content": "Nr. | Descriere | Cantitate | Preț unitar | Total\\n1 | [Serviciu] | 1 | [Preț] | [Total]", "type": "table" },
    { "heading": "TOTAL", "content": "Subtotal: [X] RON\\nTVA (19%): [Y] RON\\nTOTAL: [Z] RON", "type": "highlight" },
    { "heading": "DISCLAIMER", "content": "⚠️ Acest document este un DRAFT vizual generat de Yana AI. NU are valoare fiscală.", "type": "text" }
  ]
}
${customData ? `\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'cv':
      return `${baseRules}

Generezi un CV PROFESIONAL structurat.

Schema OBLIGATORIE:
{
  "title": "CURRICULUM VITAE",
  "summary": "Profil profesional de [X] ani experiență în [domeniu]...",
  "keywords": ["CV", "experiență", "competențe"],
  "sections": [
    { "heading": "DATE PERSONALE", "content": "Nume: [NUME COMPLET]\\nEmail: [EMAIL]\\nTelefon: [TELEFON]\\nLinkedIn: [URL]\\nLocație: [ORAȘ, ȚARĂ]", "type": "text" },
    { "heading": "PROFIL PROFESIONAL", "content": "Rezumat de 3-4 fraze despre experiența, competențele cheie și obiectivele profesionale ale candidatului.", "type": "highlight" },
    { "heading": "EXPERIENȚĂ PROFESIONALĂ", "content": "[POZIȚIE] | [COMPANIE] | [PERIOADA]\\n- Realizare/responsabilitate concretă cu cifre/rezultate\\n- ...\\n\\n[POZIȚIE] | [COMPANIE] | [PERIOADA]\\n- ...", "type": "list" },
    { "heading": "EDUCAȚIE", "content": "[DIPLOMĂ/TITLU] | [UNIVERSITATE] | [ANUL]\\n- Specializare/Teză: [DETALII]\\n\\n[DIPLOMĂ] | [LICEU/FACULTATE] | [ANUL]", "type": "list" },
    { "heading": "COMPETENȚE TEHNICE", "content": "- Competență 1 (Nivel: Avansat)\\n- Competență 2 (Nivel: Intermediar)\\n- Software/Unelte: [LISTĂ]", "type": "list" },
    { "heading": "LIMBI STRĂINE", "content": "Limba | Nivel\\nRomână | Nativă\\nEngleză | [NIVEL C1/B2]\\nFranceză | [NIVEL]", "type": "table" },
    { "heading": "CERTIFICĂRI ȘI CURSURI", "content": "- [CERTIFICARE] – [EMITENT] – [ANUL]\\n- [CURS] – [PLATFORMA] – [ANUL]", "type": "list" },
    { "heading": "PROIECTE RELEVANTE", "content": "- [PROIECT]: [Descriere scurtă, impact, tehnologii utilizate]", "type": "list" }
  ]
}

REGULI CV:
- Conținut orientat pe REALIZĂRI, nu doar responsabilități
- Folosește verbe de acțiune: implementat, coordonat, optimizat, crescut, redus
- Include cifre și rezultate concrete acolo unde e posibil (ex: "Crescut vânzările cu 25%")
- Placeholder-uri clare între paranteze pătrate [TEXT] pentru datele personalizabile
- Ordinea: cele mai recente experiențe primele (cronologie inversă)
- Adaptat domeniului menționat de utilizator
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'oferta-pret':
      return `${baseRules}

Generezi o OFERTĂ DE PREȚ profesională, structurată și clară.

Schema OBLIGATORIE:
{
  "title": "OFERTĂ DE PREȚ",
  "summary": "Ofertă comercială pentru [servicii/produse]...",
  "keywords": ["ofertă", "preț", "servicii"],
  "sections": [
    { "heading": "DATE FURNIZOR", "content": "Denumire: [DENUMIRE FURNIZOR]\\nCUI: [CUI]\\nAdresă: [ADRESĂ]\\nTelefon: [TELEFON]\\nEmail: [EMAIL]\\nCont bancar: [IBAN] – [BANCĂ]", "type": "text" },
    { "heading": "DATE CLIENT", "content": "Denumire: [DENUMIRE CLIENT]\\nCUI: [CUI CLIENT]\\nAdresă: [ADRESĂ CLIENT]\\nPersoană de contact: [NUME] – [FUNCȚIE]", "type": "text" },
    { "heading": "OBIECTUL OFERTEI", "content": "Descriere detaliată a serviciilor/produselor oferite, specificații tehnice, standarde de calitate.", "type": "text" },
    { "heading": "TABEL PREȚURI", "content": "Nr. | Descriere serviciu/produs | U.M. | Cantitate | Preț unitar (RON) | Total (RON)\\n1 | [Serviciu 1] | buc | 1 | [PREȚ] | [TOTAL]\\n2 | [Serviciu 2] | ore | 10 | [PREȚ] | [TOTAL]\\n\\nSubtotal: [X] RON\\nTVA (19%): [Y] RON\\nTOTAL GENERAL: [Z] RON", "type": "table" },
    { "heading": "CONDIȚII COMERCIALE", "content": "- Termen de plată: [30/60] zile de la facturare\\n- Modalitate de plată: transfer bancar\\n- Termen de livrare: [X] zile lucrătoare de la confirmarea comenzii\\n- Garanție: [DETALII]", "type": "list" },
    { "heading": "VALABILITATE", "content": "Prezenta ofertă este valabilă [30] zile calendaristice de la data emiterii.", "type": "highlight" },
    { "heading": "SEMNĂTURĂ", "content": "Cu stimă,\\n\\n[NUME REPREZENTANT]\\n[FUNCȚIE]\\n[DENUMIRE FURNIZOR]\\n\\nData: [DATA]\\nSemnătura: _______________", "type": "text" }
  ]
}

REGULI OFERTĂ DE PREȚ:
- Tabelul de prețuri OBLIGATORIU cu: Nr., Descriere, U.M., Cantitate, Preț unitar, Total
- Include subtotal, TVA și total general
- Condiții comerciale clare (termen plată, livrare, garanție)
- Valabilitate specificată explicit
- Ton profesional dar accesibil
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'scrisoare-intentie':
      return `${baseRules}

Generezi o SCRISOARE DE INTENȚIE profesională pentru candidatură.

Schema OBLIGATORIE:
{
  "title": "SCRISOARE DE INTENȚIE",
  "summary": "Scrisoare de intenție pentru poziția de [POST]...",
  "keywords": ["scrisoare", "intenție", "candidatură"],
  "sections": [
    { "heading": "DESTINATAR", "content": "Către: [NUME MANAGER/DEPARTAMENT HR]\\n[DENUMIRE COMPANIE]\\n[ADRESĂ]\\n\\nData: [DATA]", "type": "text" },
    { "heading": "SUBIECT", "content": "Ref: Candidatură pentru poziția de [DENUMIRE POST]", "type": "highlight" },
    { "heading": "INTRODUCERE", "content": "Paragraf de deschidere: cum am aflat de oportunitate, de ce mă interesează compania și rolul. Ton profesional dar entuziast. 3-4 propoziții.", "type": "text" },
    { "heading": "MOTIVAȚIE ȘI ALINIERE", "content": "De ce sunt potrivit/ă pentru acest rol. Ce mă motivează la această companie. Cum se aliniază valorile mele cu ale companiei. 4-5 propoziții cu exemple concrete.", "type": "text" },
    { "heading": "COMPETENȚE ȘI REALIZĂRI RELEVANTE", "content": "- Competență 1 + realizare concretă cu cifre\\n- Competență 2 + impact demonstrabil\\n- Competență 3 + proiect relevant\\nMaxim 3-4 puncte, fiecare cu dovadă concretă.", "type": "list" },
    { "heading": "ÎNCHEIERE", "content": "Paragraf de încheiere: disponibilitate pentru interviu, mulțumire, date de contact. 2-3 propoziții.\\n\\nCu respect,\\n\\n[NUME COMPLET]\\n[TELEFON]\\n[EMAIL]", "type": "text" }
  ]
}

REGULI SCRISOARE DE INTENȚIE:
- Ton: profesional, sincer, entuziast (nu servil)
- Lungime: max 1 pagină (concis și la obiect)
- Focalizată pe VALOARE adusă companiei, nu pe nevoile candidatului
- Include realizări cuantificabile (cifre, procente, rezultate)
- Personalizată pentru compania și rolul specific
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'email-comercial':
      return `${baseRules}

Generezi un EMAIL COMERCIAL profesional (cerere de preț, ofertă, follow-up).

Schema OBLIGATORIE:
{
  "title": "EMAIL COMERCIAL",
  "summary": "Email de [cerere preț/ofertă/follow-up] pentru...",
  "keywords": ["email", "comercial", "ofertă"],
  "sections": [
    { "heading": "SUBIECT EMAIL", "content": "[Subiect clar și concis, max 60 caractere]", "type": "highlight" },
    { "heading": "SALUT", "content": "Stimat(ă) [Doamnă/Domnule NUME],", "type": "text" },
    { "heading": "CORP EMAIL", "content": "Paragraf 1: Context și motiv al contactării (2-3 propoziții)\\n\\nParagraf 2: Detalii specifice ale cererii/ofertei (specificații, cantități, termene)\\n\\nParagraf 3: Condiții sau cerințe suplimentare", "type": "text" },
    { "heading": "CALL TO ACTION", "content": "Vă rog să ne transmiteți [oferta de preț/confirmarea/răspunsul] până la data de [TERMEN].\\nPentru clarificări suplimentare, mă puteți contacta la [TELEFON] sau [EMAIL].", "type": "text" },
    { "heading": "SEMNĂTURĂ", "content": "Cu stimă,\\n\\n[NUME COMPLET]\\n[FUNCȚIE]\\n[DENUMIRE COMPANIE]\\nTel: [TELEFON]\\nEmail: [EMAIL]\\nWeb: [WEBSITE]", "type": "text" }
  ]
}

REGULI EMAIL COMERCIAL:
- Subiect: clar, specific, max 60 caractere
- Ton: profesional, direct, politicos
- Corp: max 3 paragrafe scurte (emailul se citește rapid)
- Include TOATE detaliile necesare (cantitate, specificații, termen)
- Call to action clar cu termen specific
- Semnătură completă cu toate datele de contact
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'scrisoare-recomandare':
      return `${baseRules}

Generezi o SCRISOARE DE RECOMANDARE profesională.

Schema OBLIGATORIE:
{
  "title": "SCRISOARE DE RECOMANDARE",
  "summary": "Recomandare profesională pentru [NUME PERSOANĂ]...",
  "keywords": ["recomandare", "referință", "profesional"],
  "sections": [
    { "heading": "DESTINATAR", "content": "Către cine este interesat,\\n\\nData: [DATA]", "type": "text" },
    { "heading": "IDENTIFICARE AUTOR", "content": "Subsemnatul/a [NUME], în calitate de [FUNCȚIE] la [COMPANIE], recomand prin prezenta pe [NUME PERSOANĂ RECOMANDATĂ].", "type": "text" },
    { "heading": "CONTEXT COLABORARE", "content": "Am colaborat cu [NUME] în perioada [PERIOADĂ], în cadrul [DEPARTAMENT/PROIECT]. Descriere a relației profesionale și a contextului colaborării. 3-4 propoziții.", "type": "text" },
    { "heading": "CALITĂȚI PROFESIONALE", "content": "- Calitate 1: [Descriere cu exemplu concret]\\n- Calitate 2: [Descriere cu exemplu concret]\\n- Calitate 3: [Descriere cu exemplu concret]\\n- Calitate 4: [Descriere cu exemplu concret]", "type": "list" },
    { "heading": "REALIZĂRI NOTABILE", "content": "Descriere a 2-3 realizări concrete ale persoanei recomandate, cu cifre și impact demonstrabil.", "type": "text" },
    { "heading": "RECOMANDARE", "content": "Recomand cu căldură pe [NUME] pentru [tipul de oportunitate]. Sunt convins/ă că va aduce valoare semnificativă oricărei echipe.\\n\\nPentru detalii suplimentare, mă puteți contacta la [TELEFON/EMAIL].\\n\\nCu stimă,\\n\\n[NUME AUTOR]\\n[FUNCȚIE]\\n[COMPANIE]", "type": "text" }
  ]
}
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'memo':
      return `${baseRules}

Generezi un MEMO / NOTĂ INTERNĂ profesională.

Schema OBLIGATORIE:
{
  "title": "NOTĂ INTERNĂ",
  "summary": "Comunicare internă privind [SUBIECT]...",
  "keywords": ["memo", "notă internă", "comunicare"],
  "sections": [
    { "heading": "ANTET", "content": "DE LA: [NUME, FUNCȚIE]\\nCĂTRE: [DESTINATARI/DEPARTAMENT]\\nDATA: [DATA]\\nSUBIECT: [SUBIECT CLAR ȘI CONCIS]", "type": "highlight" },
    { "heading": "CONTEXT", "content": "Descriere a situației sau motivului pentru care se emite această notă internă. 2-3 propoziții clare.", "type": "text" },
    { "heading": "DETALII", "content": "Informații detaliate, decizii luate, măsuri necesare. Structurat pe puncte dacă sunt mai multe aspecte.", "type": "text" },
    { "heading": "ACȚIUNI NECESARE", "content": "- Acțiune 1 – Responsabil: [NUME] – Termen: [DATA]\\n- Acțiune 2 – Responsabil: [NUME] – Termen: [DATA]", "type": "list" },
    { "heading": "OBSERVAȚII", "content": "Note suplimentare, excepții sau clarificări.", "type": "text" }
  ]
}
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'minuta':
      return `${baseRules}

Generezi o MINUTĂ DE ȘEDINȚĂ profesională.

Schema OBLIGATORIE:
{
  "title": "MINUTĂ DE ȘEDINȚĂ",
  "summary": "Minută ședință din [DATA] privind [SUBIECT]...",
  "keywords": ["minută", "ședință", "decizii"],
  "sections": [
    { "heading": "INFORMAȚII GENERALE", "content": "Data: [DATA]\\nOra: [ORA ÎNCEPUT] – [ORA SFÂRȘIT]\\nLocație: [LOCAȚIE/ONLINE]\\nModerator: [NUME]", "type": "text" },
    { "heading": "PARTICIPANȚI", "content": "Nr. | Nume | Funcție | Prezent\\n1 | [NUME 1] | [FUNCȚIE] | Da\\n2 | [NUME 2] | [FUNCȚIE] | Da\\n3 | [NUME 3] | [FUNCȚIE] | Nu (scuzat)", "type": "table" },
    { "heading": "AGENDA", "content": "1. [Punct 1 pe ordinea de zi]\\n2. [Punct 2 pe ordinea de zi]\\n3. [Punct 3 pe ordinea de zi]\\n4. Diverse", "type": "list" },
    { "heading": "DISCUȚII ȘI CONCLUZII", "content": "Punct 1: [Rezumat discuții, opinii exprimate, argumente]\\n\\nPunct 2: [Rezumat discuții]\\n\\nPunct 3: [Rezumat discuții]", "type": "text" },
    { "heading": "DECIZII LUATE", "content": "- Decizie 1: [DESCRIERE] – Aprobat în unanimitate/cu [X] voturi\\n- Decizie 2: [DESCRIERE] – Aprobat cu majoritate", "type": "list" },
    { "heading": "ACȚIUNI ȘI RESPONSABILI", "content": "Nr. | Acțiune | Responsabil | Termen\\n1 | [ACȚIUNE 1] | [NUME] | [DATA]\\n2 | [ACȚIUNE 2] | [NUME] | [DATA]\\n3 | [ACȚIUNE 3] | [NUME] | [DATA]", "type": "table" },
    { "heading": "URMĂTOAREA ȘEDINȚĂ", "content": "Data: [DATA]\\nOra: [ORA]\\nSubiect principal: [SUBIECT]", "type": "text" }
  ]
}
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'fisa-post':
      return `${baseRules}

Generezi o FIȘĂ A POSTULUI profesională, conformă cu legislația muncii din România.

Schema OBLIGATORIE:
{
  "title": "FIȘA POSTULUI",
  "summary": "Fișa postului pentru poziția de [DENUMIRE POST]...",
  "keywords": ["fișa postului", "job description", "responsabilități"],
  "sections": [
    { "heading": "IDENTIFICARE POST", "content": "Denumire post: [DENUMIRE]\\nDepartament: [DEPARTAMENT]\\nCod COR: [COD COR]\\nNivel post: [Execuție/Conducere]\\nNorma de lucru: [Full-time/Part-time]\\nLocul desfășurării activității: [LOCAȚIE]", "type": "text" },
    { "heading": "RELAȚII IERARHICE", "content": "Se subordonează: [FUNCȚIE SUPERIOARĂ]\\nAre în subordine: [FUNCȚII/Nimeni]\\nColaborează cu: [DEPARTAMENTE/FUNCȚII]\\nReprezintă compania în relația cu: [PARTENERI/CLIENȚI]", "type": "text" },
    { "heading": "SCOPUL POSTULUI", "content": "Descriere concisă (2-3 fraze) a scopului principal al postului și contribuția la obiectivele organizației.", "type": "highlight" },
    { "heading": "RESPONSABILITĂȚI PRINCIPALE", "content": "- Responsabilitate 1 (descriere detaliată)\\n- Responsabilitate 2 (descriere detaliată)\\n- Responsabilitate 3\\n- Responsabilitate 4\\n- Responsabilitate 5\\n- Alte sarcini atribuite de superiorul ierarhic", "type": "list" },
    { "heading": "CERINȚE OBLIGATORII", "content": "- Studii: [Superioare/Medii] în domeniul [DOMENIU]\\n- Experiență: minim [X] ani în [DOMENIU]\\n- Cunoștințe: [SPECIFICARE]\\n- Competențe digitale: [SOFTWARE/UNELTE]\\n- Limbi străine: [LIMBA – NIVEL]", "type": "list" },
    { "heading": "CERINȚE PREFERENȚIALE", "content": "- Certificări: [CERTIFICĂRI]\\n- Experiență specifică: [DETALII]\\n- Competențe suplimentare: [DETALII]", "type": "list" },
    { "heading": "COMPETENȚE PERSONALE", "content": "- Abilități de comunicare și lucru în echipă\\n- Capacitate de organizare și planificare\\n- Orientare către rezultate\\n- Capacitate de analiză și sinteză\\n- Rezistență la stres", "type": "list" },
    { "heading": "CONDIȚII DE MUNCĂ", "content": "- Program: [PROGRAM]\\n- Deplasări: [DA/NU – FRECVENȚĂ]\\n- Condiții speciale: [DETALII]", "type": "text" },
    { "heading": "BENEFICII", "content": "- Salariu competitiv: [INTERVAL]\\n- Tichete de masă: [VALOARE]\\n- Asigurare medicală privată\\n- Zile libere suplimentare\\n- Oportunități de dezvoltare profesională", "type": "list" },
    { "heading": "SEMNĂTURI", "content": "Întocmit de: [FUNCȚIE] _______________\\nAprobat de: [FUNCȚIE] _______________\\nLuat la cunoștință de titular: _______________\\nData: [DATA]", "type": "text" }
  ]
}

REGULI FIȘĂ POST:
- Include Cod COR dacă este menționat domeniul
- Responsabilități clare, măsurabile, orientate pe rezultate
- Cerințe realiste și nediscriminatorii
- Beneficii concrete, nu vagi
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'contract-munca':
      return `${baseRules}

Generezi un CONTRACT INDIVIDUAL DE MUNCĂ (CIM) conform Codului Muncii din România.

Schema OBLIGATORIE:
{
  "title": "CONTRACT INDIVIDUAL DE MUNCĂ",
  "summary": "Contract individual de muncă pe durată [nedeterminată/determinată]...",
  "keywords": ["CIM", "contract muncă", "angajare"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE CONTRACTANTE", "content": "ANGAJATOR:\\nDenumire: [DENUMIRE SOCIETATE]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nReprezentant legal: [NUME], în calitate de [FUNCȚIE]\\n\\nANGAJAT:\\nNume și prenume: [NUME COMPLET]\\nCNP: [CNP]\\nDomiciliu: [ADRESĂ]\\nAct identitate: [TIP] seria [SERIA] nr. [NR.]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL CONTRACTULUI", "content": "Prezentul contract reglementează raportul de muncă dintre angajator și angajat, în conformitate cu Legea nr. 53/2003 – Codul Muncii.", "type": "text" },
    { "heading": "ARTICOLUL 3 – DURATA CONTRACTULUI", "content": "Contractul se încheie pe durată [nedeterminată/determinată de X luni].\\nData începerii activității: [DATA]\\nPerioada de probă: [30/45/90] zile calendaristice.", "type": "text" },
    { "heading": "ARTICOLUL 4 – LOCUL DE MUNCĂ", "content": "Activitatea se desfășoară la sediul angajatorului din [ADRESĂ] / în regim de telemuncă conform Legii 81/2018.", "type": "text" },
    { "heading": "ARTICOLUL 5 – FELUL MUNCII", "content": "Funcția/Meseria: [DENUMIRE POST]\\nCod COR: [COD COR]\\nAtribuțiile postului sunt prevăzute în fișa postului, anexă la prezentul contract.", "type": "text" },
    { "heading": "ARTICOLUL 6 – PROGRAMA DE LUCRU", "content": "Durata timpului de muncă: [8] ore/zi, [40] ore/săptămână.\\nProgram: Luni-Vineri, [09:00-17:00].", "type": "text" },
    { "heading": "ARTICOLUL 7 – SALARIUL", "content": "Salariul de bază lunar brut: [SUMA] RON\\nAlte elemente: [sporuri, bonusuri, tichete de masă]\\nData plății: [ziua X a lunii]\\nModalitatea de plată: transfer bancar", "type": "text" },
    { "heading": "ARTICOLUL 8 – CONCEDIUL DE ODIHNĂ", "content": "Durata concediului anual: [20/21/25] zile lucrătoare.\\nIndemnizația de concediu conform art. 150 din Codul Muncii.", "type": "text" },
    { "heading": "ARTICOLUL 9 – OBLIGAȚIILE ANGAJATORULUI", "content": "- Să acorde salariului toate drepturile din contract\\n- Să asigure condiții de muncă corespunzătoare\\n- Să informeze salariatul asupra condițiilor de muncă\\n- Să asigure confidențialitatea datelor personale", "type": "list" },
    { "heading": "ARTICOLUL 10 – OBLIGAȚIILE ANGAJATULUI", "content": "- Să îndeplinească atribuțiile din fișa postului\\n- Să respecte disciplina muncii și regulamentul intern\\n- Să respecte normele SSM\\n- Să fie loial angajatorului", "type": "list" },
    { "heading": "ARTICOLUL 11 – CLAUZE SPECIFICE", "content": "Clauza de confidențialitate: [DETALII]\\nClauza de neconcurență: [DACĂ ESTE CAZUL]\\nClauza de mobilitate: [DACĂ ESTE CAZUL]", "type": "text" },
    { "heading": "ARTICOLUL 12 – ÎNCETAREA CONTRACTULUI", "content": "Încetare conform Codului Muncii:\\n- De drept (art. 56)\\n- Acord părți (art. 55 lit. b)\\n- Demisie (art. 81) – preaviz [20] zile lucrătoare\\n- Concediere (art. 58-67)", "type": "list" },
    { "heading": "SEMNĂTURI", "content": "ANGAJATOR: _______________\\nANGAJAT: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un specialist în dreptul muncii înainte de utilizare.", "type": "text" }
  ]
}

REGULI CIM:
- Respectă structura Codului Muncii (Legea 53/2003)
- Include toate elementele obligatorii: părți, durată, loc, funcție, salariu, concediu
- Perioadă de probă: max 90 zile execuție, 120 conducere
- DISCLAIMER obligatoriu
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'contract-vanzare-cumparare':
      return `${baseRules}

Generezi un CONTRACT DE VÂNZARE-CUMPĂRARE profesional.

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE VÂNZARE-CUMPĂRARE",
  "summary": "Contract de vânzare-cumpărare pentru [OBIECT]...",
  "keywords": ["vânzare", "cumpărare", "transfer proprietate"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE CONTRACTANTE", "content": "VÂNZĂTORUL: [DENUMIRE], CUI/CNP [X], adresă [X], cont [IBAN]\\n\\nCUMPĂRĂTORUL: [DENUMIRE], CUI/CNP [X], adresă [X], cont [IBAN]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL CONTRACTULUI", "content": "Vânzătorul vinde, iar Cumpărătorul cumpără:\\n\\nNr. | Descriere | Cantitate | Preț unitar | Total\\n1 | [DESCRIERE] | [CANT.] | [PREȚ] RON | [TOTAL] RON\\n\\nStare: [NOU/FOLOSIT]", "type": "table" },
    { "heading": "ARTICOLUL 3 – PREȚUL ȘI PLATA", "content": "Preț total: [SUMĂ] RON + TVA [19%] = [TOTAL] RON.\\nPlata: [transfer bancar/numerar/rate]\\nTermen: [la livrare / 30 zile]\\nPenalități: [0.1%/zi] din suma restantă.", "type": "text" },
    { "heading": "ARTICOLUL 4 – LIVRAREA ȘI RECEPȚIA", "content": "Termen livrare: [X] zile lucrătoare.\\nLoc livrare: [ADRESĂ].\\nTransport în sarcina [VÂNZĂTORULUI/CUMPĂRĂTORULUI].\\nRecepție pe bază de proces-verbal.", "type": "text" },
    { "heading": "ARTICOLUL 5 – TRANSFERUL PROPRIETĂȚII", "content": "Proprietatea se transferă la [livrare/plata integrală]. Riscurile se transferă odată cu proprietatea.", "type": "text" },
    { "heading": "ARTICOLUL 6 – GARANȚIE", "content": "Garanție [X] luni/ani. Acoperă defecte de fabricație. Nu acoperă uzura normală.", "type": "text" },
    { "heading": "ARTICOLUL 7 – OBLIGAȚIILE PĂRȚILOR", "content": "Vânzătorul: livrare, calitate, documente.\\nCumpărătorul: plată, recepție, utilizare conformă.", "type": "list" },
    { "heading": "ARTICOLUL 8 – RĂSPUNDERE ȘI LITIGII", "content": "Nerespectarea obligațiilor: rezoluțiune + daune. Forța majoră exonerează. Litigii: instanțe competente.", "type": "text" },
    { "heading": "ARTICOLUL 9 – DISPOZIȚII FINALE", "content": "Încheiat în 2 exemplare. Modificări prin act adițional.\\n\\nVÂNZĂTOR: _______________\\nCUMPĂRĂTOR: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat înainte de semnare.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'contract-inchiriere':
      return `${baseRules}

Generezi un CONTRACT DE ÎNCHIRIERE profesional.

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE ÎNCHIRIERE",
  "summary": "Contract de închiriere pentru [TIP SPAȚIU]...",
  "keywords": ["închiriere", "chirie", "locațiune"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "PROPRIETAR (Locator): [NUME], CUI/CNP [X], adresă [X]\\n\\nCHIRIAȘ (Locatar): [NUME], CUI/CNP [X], adresă [X]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL", "content": "Imobilul din [ADRESĂ], compus din [DESCRIERE], suprafață [X] mp.", "type": "text" },
    { "heading": "ARTICOLUL 3 – DESTINAȚIA", "content": "Exclusiv ca [locuință/birou/spațiu comercial]. Schimbarea doar cu acord scris.", "type": "text" },
    { "heading": "ARTICOLUL 4 – DURATA", "content": "Perioadă: [X] luni/ani, de la [DATA] la [DATA]. Prelungire prin act adițional.", "type": "text" },
    { "heading": "ARTICOLUL 5 – CHIRIA", "content": "Chirie lunară: [SUMĂ] RON/EUR. Plata până pe [X] ale lunii. Indexare anuală [X]%. Penalități: [0.1%/zi].", "type": "text" },
    { "heading": "ARTICOLUL 6 – GARANȚIA", "content": "Depozit: [X] chirii = [SUMĂ] RON. Se restituie la încetare minus daune/restanțe.", "type": "text" },
    { "heading": "ARTICOLUL 7 – OBLIGAȚII PROPRIETAR", "content": "- Predare spațiu corespunzător\\n- Folosință liniștită\\n- Reparații capitale", "type": "list" },
    { "heading": "ARTICOLUL 8 – OBLIGAȚII CHIRIAȘ", "content": "- Plata chiriei la termen\\n- Folosire conform destinației\\n- Reparații locative\\n- Plata utilități\\n- Fără subînchiriere fără acord", "type": "list" },
    { "heading": "ARTICOLUL 9 – ÎNCETAREA", "content": "Expirare, acord, reziliere (preaviz 30 zile), denunțare unilaterală (preaviz 60 zile).", "type": "list" },
    { "heading": "ARTICOLUL 10 – DISPOZIȚII FINALE", "content": "2 exemplare. Art. 1777-1835 Cod Civil.\\n\\nPROPRIETAR: _______________\\nCHIRIAȘ: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat/notar.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'contract-comodat':
      return `${baseRules}

Generezi un CONTRACT DE COMODAT (folosință gratuită).

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE COMODAT",
  "summary": "Contract de comodat pentru [OBIECT]...",
  "keywords": ["comodat", "folosință", "gratuit"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "COMODANT: [NUME], CUI/CNP [X]\\nCOMODATAR: [NUME], CUI/CNP [X]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL", "content": "Comodantul transmite gratuit dreptul de folosință asupra [BINE/SPAȚIU] din [ADRESĂ].", "type": "text" },
    { "heading": "ARTICOLUL 3 – DURATA", "content": "De la [DATA] la [DATA]. Prelungire prin act adițional.", "type": "text" },
    { "heading": "ARTICOLUL 4 – DESTINAȚIA", "content": "Exclusiv ca [sediu social/locuință/depozit].", "type": "text" },
    { "heading": "ARTICOLUL 5 – OBLIGAȚII COMODATAR", "content": "- Conservare ca bun proprietar\\n- Folosire conform destinației\\n- Suportarea cheltuielilor de utilizare\\n- Restituire la termen\\n- Fără subcesiune", "type": "list" },
    { "heading": "ARTICOLUL 6 – OBLIGAȚII COMODANT", "content": "- Predare în stare corespunzătoare\\n- Neturburare pe durata contractului", "type": "list" },
    { "heading": "ARTICOLUL 7 – DISPOZIȚII FINALE", "content": "2 exemplare. Art. 2146-2157 Cod Civil.\\nCOMODANT: _______________\\nCOMODATAR: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'contract-cesiune':
      return `${baseRules}

Generezi un CONTRACT DE CESIUNE.

Schema OBLIGATORIE:
{
  "title": "CONTRACT DE CESIUNE",
  "summary": "Cesiune de [creanță/părți sociale/drepturi]...",
  "keywords": ["cesiune", "transfer", "drepturi"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "CEDENT: [NUME], CUI/CNP [X]\\nCESIONAR: [NUME], CUI/CNP [X]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL CESIUNII", "content": "Cedentul cedează [creanță de X RON / X părți sociale / drepturi de proprietate intelectuală].", "type": "text" },
    { "heading": "ARTICOLUL 3 – PREȚUL", "content": "Preț: [SUMĂ] RON, plătibil prin [transfer bancar] în [X] zile.", "type": "text" },
    { "heading": "ARTICOLUL 4 – DECLARAȚII CEDENT", "content": "- Titular exclusiv\\n- Fără sarcini sau litigii\\n- Nu a cedat altei persoane\\n- Va notifica debitorul cedat", "type": "list" },
    { "heading": "ARTICOLUL 5 – EFECTE", "content": "Efecte de la [semnare/notificare/înregistrare ONRC].", "type": "text" },
    { "heading": "ARTICOLUL 6 – DISPOZIȚII FINALE", "content": "2 exemplare. Art. 1566-1592 Cod Civil.\\nCEDENT: _______________\\nCESIONAR: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'procura':
      return `${baseRules}

Generezi o PROCURĂ.

Schema OBLIGATORIE:
{
  "title": "PROCURĂ",
  "summary": "Procură pentru [SCOP]...",
  "keywords": ["procură", "împuternicire", "mandat"],
  "sections": [
    { "heading": "MANDANT", "content": "Subsemnatul/a [NUME], CNP [CNP], domiciliat/ă în [ADRESĂ], CI seria [X] nr. [X].", "type": "text" },
    { "heading": "MANDATAR", "content": "Împuternicesc pe [NUME MANDATAR], CNP [CNP], domiciliat/ă în [ADRESĂ], CI seria [X] nr. [X].", "type": "text" },
    { "heading": "OBIECTUL PROCURII", "content": "Mandatarul este împuternicit să mă reprezinte la [INSTITUȚIE] în vederea:\\n- [Acțiune 1]\\n- [Acțiune 2]\\n- [Acțiune 3]\\ninclusiv să semneze orice acte necesare.", "type": "list" },
    { "heading": "DURATA", "content": "Valabilă [X] luni/ani de la autentificare / până la îndeplinirea mandatului.", "type": "text" },
    { "heading": "SEMNĂTURĂ", "content": "Data: [DATA]\\nMandant: _______________", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Anumite procuri necesită autentificare notarială.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'act-aditional':
      return `${baseRules}

Generezi un ACT ADIȚIONAL la un contract existent.

Schema OBLIGATORIE:
{
  "title": "ACT ADIȚIONAL NR. [X]",
  "summary": "Act adițional la contractul nr. [NR] din [DATA]...",
  "keywords": ["act adițional", "modificare", "contract"],
  "sections": [
    { "heading": "PREAMBUL", "content": "Act adițional nr. [X] la Contractul [TIP] nr. [NR] din [DATA]\\n\\n1. [PARTE 1]\\n2. [PARTE 2]", "type": "text" },
    { "heading": "ARTICOLUL 1 – MODIFICĂRI", "content": "1.1. Art. [X] se modifică:\\nText vechi: \\\"[...]\\\"\\nText nou: \\\"[...]\\\"\\n\\n1.2. Art. [Y] se modifică: [DETALII]", "type": "text" },
    { "heading": "ARTICOLUL 2 – INTRAREA ÎN VIGOARE", "content": "Intră în vigoare la semnare. Celelalte clauze rămân neschimbate.\\n\\nPartea 1: _______________\\nPartea 2: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'cerere-concediu':
      return `${baseRules}

Generezi o CERERE DE CONCEDIU.

Schema OBLIGATORIE:
{
  "title": "CERERE DE CONCEDIU DE ODIHNĂ",
  "summary": "Cerere concediu [DATA-DATA]...",
  "keywords": ["concediu", "cerere", "odihnă"],
  "sections": [
    { "heading": "DESTINATAR", "content": "Către: Conducerea [COMPANIE]\\nÎn atenția: [HR/Director]", "type": "text" },
    { "heading": "CERERE", "content": "Subsemnatul/a [NUME], funcția [FUNCȚIE], dept. [DEPT], CIM nr. [NR] din [DATA], rog aprobarea concediului [DATA ÎNCEPUT] – [DATA SFÂRȘIT], total [X] zile lucrătoare.\\n\\nÎnlocuitor: [NUME COLEG].\\nSarcinile au fost predate corespunzător.", "type": "text" },
    { "heading": "SEMNĂTURĂ", "content": "Data: [DATA]\\nNume: [NUME]\\nSemnătura: _______________\\n\\nAviz șef: _______________\\nAviz HR: _______________", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'cerere-demisie':
      return `${baseRules}

Generezi o CERERE DE DEMISIE.

Schema OBLIGATORIE:
{
  "title": "CERERE DE DEMISIE",
  "summary": "Notificare demisie cu preaviz [X] zile...",
  "keywords": ["demisie", "preaviz", "încetare"],
  "sections": [
    { "heading": "DESTINATAR", "content": "Către: Conducerea [COMPANIE]", "type": "text" },
    { "heading": "CERERE", "content": "Subsemnatul/a [NUME], funcția [FUNCȚIE], notific decizia de a demisiona cu preaviz de [20] zile lucrătoare (art. 81 Codul Muncii).\\n\\nUltima zi de lucru: [DATA].\\n\\nMă angajez să predau sarcinile în perioada de preaviz.\\n\\nVă mulțumesc pentru colaborare.", "type": "text" },
    { "heading": "SEMNĂTURĂ", "content": "Data: [DATA]\\nNume: [NUME]\\nSemnătura: _______________\\n\\nNr. înregistrare: _______________", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'adeverinta':
      return `${baseRules}

Generezi o ADEVERINȚĂ.

Schema OBLIGATORIE:
{
  "title": "ADEVERINȚĂ",
  "summary": "Adeverință de salariat...",
  "keywords": ["adeverință", "salariat", "confirmare"],
  "sections": [
    { "heading": "ANTET", "content": "[COMPANIE]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "ADEVERINȚĂ", "content": "Adeverim că dl./dna. [NUME], CNP [CNP], este angajat/ă ca [FUNCȚIE], CIM nr. [NR] din [DATA], durată [nedeterminată/determinată].\\n\\nSalariu brut: [SUMA] RON.\\nVechime: [X] ani.\\n\\nEliberată la cerere pentru [SCOP].", "type": "text" },
    { "heading": "SEMNĂTURĂ", "content": "Director: [NUME] _______________\\nHR: [NUME] _______________\\nȘtampila", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'conventie-civila':
      return `${baseRules}

Generezi o CONVENȚIE CIVILĂ DE PRESTĂRI SERVICII.

Schema OBLIGATORIE:
{
  "title": "CONVENȚIE CIVILĂ DE PRESTĂRI SERVICII",
  "summary": "Convenție civilă pentru [SERVICII]...",
  "keywords": ["convenție civilă", "prestări servicii", "PFA"],
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "BENEFICIAR: [DENUMIRE], CUI [X]\\nPRESTATOR: [NUME/PFA], CUI/CNP [X]", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL", "content": "Prestatorul prestează: [DESCRIERE SERVICII]. Livrabile: [CONCRETE].", "type": "text" },
    { "heading": "ARTICOLUL 3 – DURATA", "content": "De la [DATA] la [DATA].", "type": "text" },
    { "heading": "ARTICOLUL 4 – REMUNERAȚIA", "content": "Remunerație: [SUMA] RON. Plata în [X] zile de la factură. Prestatorul răspunde fiscal.", "type": "text" },
    { "heading": "ARTICOLUL 5 – OBLIGAȚII", "content": "Prestator: calitate, termene, confidențialitate, factură.\\nBeneficiar: plată, informații, recepție.", "type": "list" },
    { "heading": "ARTICOLUL 6 – DISPOZIȚII FINALE", "content": "⚠️ NU generează raporturi de muncă.\\n2 exemplare.\\nBENEFICIAR: _______________\\nPRESTATOR: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Consultați un avocat/contabil.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'regulament-intern':
      return `${baseRules}

Generezi un REGULAMENT INTERN conform Codului Muncii.

Schema OBLIGATORIE:
{
  "title": "REGULAMENT INTERN",
  "summary": "Regulament intern al [COMPANIE]...",
  "keywords": ["regulament", "disciplină", "norme"],
  "sections": [
    { "heading": "CAP. I – DISPOZIȚII GENERALE", "content": "Art. 1. Conform art. 241-246 din Legea 53/2003.\\nArt. 2. Se aplică tuturor salariaților.", "type": "text" },
    { "heading": "CAP. II – PROGRAM DE LUCRU", "content": "Art. 3. Program: L-V, [09:00-17:00], 8h/zi.\\nArt. 4. Pauza: [30/60] min.\\nArt. 5. Ore suplimentare: conform art. 120-124 CM.", "type": "text" },
    { "heading": "CAP. III – CONCEDII", "content": "Art. 6. CO: min [20] zile/an.\\nArt. 7. CM: conform legislației.\\nArt. 8. Zile libere legale.\\nArt. 9. CFP: la cerere, cu aprobare.", "type": "text" },
    { "heading": "CAP. IV – DREPTURI ȘI OBLIGAȚII", "content": "Drepturi: salariu, condiții, demnitate, informare.\\nObligații: program, atribuții, SSM, confidențialitate.", "type": "list" },
    { "heading": "CAP. V – DISCIPLINA MUNCII", "content": "Sancțiuni (art. 248): avertisment, retrogradare (max 60 zile), reducere salariu (max 10%, 3 luni), desfacere.\\nProcedura: cercetare disciplinară (art. 251).", "type": "list" },
    { "heading": "CAP. VI – SSM", "content": "Instruire la angajare și periodic. Respectarea normelor SSM.", "type": "text" },
    { "heading": "CAP. VII – GDPR", "content": "Prelucrare date conform GDPR. Drepturi: informare, acces, rectificare, ștergere.", "type": "text" },
    { "heading": "CAP. VIII – DISPOZIȚII FINALE", "content": "Se aduce la cunoștință prin semnare. Modificări cu consultarea salariaților. Intră în vigoare: [DATA].\\n\\nAdministrator: _______________\\nData: [DATA]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Adaptați la specificul companiei cu un specialist.", "type": "text" }
  ]
}
${customData ? `\\nContext: ${JSON.stringify(customData)}` : ''}`;

    case 'notificare-plata':
      return `${baseRules}

Generezi o NOTIFICARE DE PLATĂ profesională pentru recuperarea unei creanțe comerciale.

Schema OBLIGATORIE:
{
  "title": "NOTIFICARE DE PLATĂ",
  "summary": "Notificare amiabilă privind achitarea sumei de [X] RON...",
  "keywords": ["notificare", "plată", "creanță", "restanță"],
  "sections": [
    { "heading": "ANTET EMITENT", "content": "Denumire: [DENUMIRE CREDITOR]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nCont IBAN: [IBAN] – [BANCĂ]\\nTel: [TELEFON]\\nEmail: [EMAIL]\\n\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "DESTINATAR", "content": "Către: [DENUMIRE DEBITOR]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nÎn atenția: [NUME PERSOANĂ/DEPARTAMENT FINANCIAR]", "type": "text" },
    { "heading": "OBIECT", "content": "Ref: Notificare de plată privind facturi restante", "type": "highlight" },
    { "heading": "CONȚINUT", "content": "Stimate partener,\\n\\nPrin prezenta vă aducem la cunoștință că, conform evidențelor noastre contabile, înregistrați următoarele facturi restante:\\n\\nNr. factură | Data emitere | Scadența | Valoare (RON) | Zile întârziere\\n[NR] | [DATA] | [SCADENȚA] | [SUMA] | [ZILE]\\n[NR] | [DATA] | [SCADENȚA] | [SUMA] | [ZILE]\\n\\nTotal restanță: [TOTAL] RON\\nPenalități de întârziere calculate: [PENALITĂȚI] RON (conform contractului / [0.X]%/zi)\\nTotal de plată: [TOTAL GENERAL] RON", "type": "table" },
    { "heading": "SOLICITARE", "content": "Vă rugăm să efectuați plata sumei de [TOTAL] RON în contul IBAN [IBAN], deschis la [BANCĂ], în termen de [10/15] zile calendaristice de la primirea prezentei notificări.\\n\\nMenționăm că, în conformitate cu prevederile contractuale și ale legislației în vigoare (OG 13/2011, Legea 72/2013), ne rezervăm dreptul de a calcula penalități de întârziere și de a iniția demersuri juridice în vederea recuperării creanței.", "type": "text" },
    { "heading": "ÎNCHEIERE", "content": "Sperăm într-o soluționare amiabilă și vă stăm la dispoziție pentru orice clarificări.\\n\\nCu stimă,\\n\\n[NUME REPREZENTANT]\\n[FUNCȚIE]\\n[DENUMIRE CREDITOR]\\n\\nData: [DATA]\\nSemnătura: _______________\\nȘtampila", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Verificați datele și consultați un specialist înainte de trimitere.", "type": "text" }
  ]
}

REGULI NOTIFICARE DE PLATĂ:
- Ton profesional, ferm dar politicos (nu amenințător)
- Include OBLIGATORIU: tabel facturi, scadențe, zile întârziere, penalități
- Menționează temeiul legal (OG 13/2011, Legea 72/2013)
- Termen clar de plată (10-15 zile)
- Cont IBAN complet pentru plată
- Se trimite prin scrisoare recomandată cu confirmare de primire
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'somatie':
      return `${baseRules}

Generezi o SOMAȚIE DE PLATĂ formală (punere în întârziere conform art. 1522 Cod Civil).

Schema OBLIGATORIE:
{
  "title": "SOMAȚIE DE PLATĂ",
  "summary": "Somație pentru achitarea debitului de [X] RON...",
  "keywords": ["somație", "punere în întârziere", "creanță", "recuperare"],
  "sections": [
    { "heading": "ANTET EMITENT", "content": "Denumire: [DENUMIRE CREDITOR]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nJ[NR]/[AN]\\nCont IBAN: [IBAN] – [BANCĂ]\\n\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "DESTINATAR", "content": "Către: [DENUMIRE DEBITOR]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nJ[NR]/[AN]", "type": "text" },
    { "heading": "OBIECT", "content": "SOMAȚIE DE PLATĂ\\n(Punere în întârziere conform art. 1522 Cod Civil)", "type": "highlight" },
    { "heading": "TEMEIUL JURIDIC", "content": "În temeiul:\\n- Contractului nr. [NR] din [DATA] / Comenzii nr. [NR] / Facturii nr. [NR]\\n- Art. 1522 Cod Civil (punerea în întârziere a debitorului)\\n- OG 13/2011 privind dobânda legală\\n- Legea 72/2013 privind măsurile de combatere a întârzierilor în plată\\n- OUG 119/2007 privind procedura ordonanței de plată", "type": "text" },
    { "heading": "EXPUNEREA CREANȚEI", "content": "Vă somăm să achitați debitul restant compus din:\\n\\nNr. factură | Data | Scadența | Valoare (RON) | Zile întârziere\\n[NR] | [DATA] | [SCADENȚA] | [SUMA] | [ZILE]\\n\\nDebit principal: [SUMA] RON\\nPenalități de întârziere ([X]%/zi × [Y] zile): [PENALITĂȚI] RON\\nDobânda legală penalizatoare (BNR + 8pp): [DOBÂNDĂ] RON\\nCompensație conform Legea 72/2013: 200 RON (echiv. 40 EUR)\\n\\nTOTAL DE PLATĂ: [TOTAL] RON", "type": "table" },
    { "heading": "TERMENUL DE PLATĂ", "content": "Vă acordăm un termen de 5 (cinci) zile calendaristice de la primirea prezentei somații pentru achitarea integrală a sumei de [TOTAL] RON în contul:\\n\\nIBAN: [IBAN]\\nBanca: [BANCĂ]\\nTitular: [DENUMIRE CREDITOR]\\nDetalii plată: 'Plata fact. [NR] din [DATA]'", "type": "highlight" },
    { "heading": "CONSECINȚE", "content": "În cazul neachitării debitului în termenul acordat, vă informăm că vom proceda la:\\n- Introducerea cererii de ordonanță de plată (OUG 119/2007) sau cererii de chemare în judecată\\n- Solicitarea cheltuielilor de judecată și a onorariului de avocat\\n- Raportarea la Centrala Incidentelor de Plăți\\n- Executarea silită prin executor judecătoresc\\n\\nPrezenta somație constituie punere în întârziere în sensul art. 1522 Cod Civil.", "type": "list" },
    { "heading": "SEMNĂTURĂ", "content": "[NUME REPREZENTANT]\\n[FUNCȚIE]\\n[DENUMIRE CREDITOR]\\n\\nData: [DATA]\\nSemnătura: _______________\\nȘtampila\\n\\nTrimis prin scrisoare recomandată cu confirmare de primire nr. [NR]", "type": "text" },
    { "heading": "DISCLAIMER", "content": "⚠️ DRAFT generat de Yana AI. Verificați datele, temeiurile juridice și consultați un avocat înainte de trimitere.", "type": "text" }
  ]
}

REGULI SOMAȚIE:
- Ton FORMAL, JURIDIC, FERM (nu agresiv, dar fără ambiguitate)
- Temei juridic OBLIGATORIU (art. 1522 Cod Civil, OG 13/2011, Legea 72/2013)
- Tabel detaliat cu facturi, scadențe, penalități
- Termen scurt de plată (5-10 zile)
- Enumerare explicită a consecințelor juridice
- Mențiune: "constituie punere în întârziere"
- Se trimite OBLIGATORIU prin scrisoare recomandată
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'adresa':
      return `${baseRules}

Generezi o ADRESĂ OFICIALĂ (corespondență comercială formală).

Schema OBLIGATORIE:
{
  "title": "ADRESĂ",
  "summary": "Adresă oficială privind [SUBIECT]...",
  "keywords": ["adresă", "corespondență", "oficial"],
  "sections": [
    { "heading": "ANTET", "content": "[DENUMIRE SOCIETATE]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nTel: [TELEFON] | Email: [EMAIL]\\n\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "DESTINATAR", "content": "Către: [DENUMIRE DESTINATAR]\\nÎn atenția: [NUME/DEPARTAMENT]\\nAdresă: [ADRESĂ DESTINATAR]", "type": "text" },
    { "heading": "SUBIECT", "content": "Ref: [OBIECTUL ADRESEI - clar și concis]", "type": "highlight" },
    { "heading": "CONȚINUT", "content": "Stimate/Stimată [TITLU],\\n\\n[Paragraf 1: Context — motivul adresei, referire la documente/contracte anterioare]\\n\\n[Paragraf 2: Expunerea detaliată a solicitării/informării/răspunsului]\\n\\n[Paragraf 3: Acțiuni solicitate sau informații suplimentare]", "type": "text" },
    { "heading": "DOCUMENTE ANEXATE", "content": "Anexăm prezentei:\\n- [Document 1]\\n- [Document 2]\\n- [Document 3]", "type": "list" },
    { "heading": "ÎNCHEIERE", "content": "Rămânem la dispoziția dumneavoastră pentru orice informații suplimentare.\\n\\nCu stimă,\\n\\n[NUME REPREZENTANT]\\n[FUNCȚIE]\\n[DENUMIRE SOCIETATE]\\n\\nData: [DATA]\\nSemnătura: _______________\\nȘtampila", "type": "text" }
  ]
}

REGULI ADRESĂ:
- Ton formal, profesional, clar
- Număr de înregistrare obligatoriu
- Subiect clar (Ref:)
- Structură: context → expunere → solicitare
- Include lista documentelor anexate dacă este cazul
- Semnătură completă cu funcție și ștampilă
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'confirmare-sold-furnizor':
      return `${baseRules}

Generezi o CONFIRMARE DE SOLD FURNIZOR (soldul pe care NOI îl datorăm furnizorului).

Schema OBLIGATORIE:
{
  "title": "CONFIRMARE DE SOLD FURNIZOR",
  "summary": "Confirmare sold furnizor la data de [DATA]...",
  "keywords": ["confirmare sold", "furnizor", "reconciliere"],
  "sections": [
    { "heading": "ANTET EMITENT", "content": "[DENUMIRE SOCIETATE NOASTRĂ]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nJ[NR]/[AN]\\n\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "DESTINATAR", "content": "Către: [DENUMIRE FURNIZOR]\\nCUI: [CUI FURNIZOR]\\nSediu: [ADRESĂ FURNIZOR]\\nÎn atenția: Departament Financiar-Contabil", "type": "text" },
    { "heading": "OBIECT", "content": "CONFIRMARE DE SOLD la data de [DATA REFERINȚĂ]\\n(Sold cont furnizor – cont 401)", "type": "highlight" },
    { "heading": "SITUAȚIA SOLDULUI", "content": "Vă rugăm să confirmați soldul evidențiat în contabilitatea noastră la data de [DATA]:\\n\\nNr. factură | Data factură | Valoare factură (RON) | Plăți efectuate (RON) | Sold rămas (RON)\\n[NR] | [DATA] | [SUMA] | [PLĂȚI] | [SOLD]\\n[NR] | [DATA] | [SUMA] | [PLĂȚI] | [SOLD]\\n[NR] | [DATA] | [SUMA] | [PLĂȚI] | [SOLD]\\n\\nTOTAL SOLD DATORAT FURNIZORULUI: [TOTAL] RON", "type": "table" },
    { "heading": "SOLICITARE CONFIRMARE", "content": "Vă rugăm să verificați datele de mai sus și să ne returnați un exemplar al prezentei confirmări, semnat și ștampilat, cu una dintre următoarele mențiuni:\\n\\n☐ Confirmăm soldul de [TOTAL] RON în favoarea dumneavoastră\\n☐ Soldul conform evidențelor noastre este de _______ RON\\n☐ Observații: _______________________________________\\n\\nTermenul de răspuns solicitat: [15] zile calendaristice de la primire.", "type": "text" },
    { "heading": "SEMNĂTURI", "content": "EMITENT (societatea noastră):\\n[NUME] – Director\\nSemnătura: _______________\\n[NUME] – Contabil\\nSemnătura: _______________\\nȘtampila\\nData: [DATA]\\n\\n─────────────────────────\\n\\nDESTINATAR (furnizorul):\\n[NUME] – Director\\nSemnătura: _______________\\n[NUME] – Contabil\\nSemnătura: _______________\\nȘtampila\\nData: _______________", "type": "text" }
  ]
}

REGULI CONFIRMARE SOLD FURNIZOR:
- Cont contabil 401 (Furnizori)
- Sold = datoria NOASTRĂ către furnizor
- Include tabel cu toate facturile neachitate/parțial achitate
- Include câmpuri pentru răspunsul furnizorului (confirmare/diferență)
- Bloc dublu de semnătură (emitent + destinatar)
- Se emite de regulă la finalul trimestrului sau anului fiscal
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    case 'confirmare-sold-client':
      return `${baseRules}

Generezi o CONFIRMARE DE SOLD CLIENT (soldul pe care CLIENTUL ni-l datorează).

Schema OBLIGATORIE:
{
  "title": "CONFIRMARE DE SOLD CLIENT",
  "summary": "Confirmare sold client la data de [DATA]...",
  "keywords": ["confirmare sold", "client", "creanță", "reconciliere"],
  "sections": [
    { "heading": "ANTET EMITENT", "content": "[DENUMIRE SOCIETATE NOASTRĂ]\\nCUI: [CUI]\\nSediu: [ADRESĂ]\\nJ[NR]/[AN]\\n\\nNr. [X] din [DATA]", "type": "text" },
    { "heading": "DESTINATAR", "content": "Către: [DENUMIRE CLIENT]\\nCUI: [CUI CLIENT]\\nSediu: [ADRESĂ CLIENT]\\nÎn atenția: Departament Financiar-Contabil", "type": "text" },
    { "heading": "OBIECT", "content": "CONFIRMARE DE SOLD la data de [DATA REFERINȚĂ]\\n(Sold cont client – cont 4111)", "type": "highlight" },
    { "heading": "SITUAȚIA SOLDULUI", "content": "Vă rugăm să confirmați soldul evidențiat în contabilitatea noastră la data de [DATA]:\\n\\nNr. factură | Data factură | Valoare factură (RON) | Încasări (RON) | Sold rămas (RON)\\n[NR] | [DATA] | [SUMA] | [ÎNCASĂRI] | [SOLD]\\n[NR] | [DATA] | [SUMA] | [ÎNCASĂRI] | [SOLD]\\n[NR] | [DATA] | [SUMA] | [ÎNCASĂRI] | [SOLD]\\n\\nTOTAL SOLD DE ÎNCASAT DE LA CLIENT: [TOTAL] RON\\n\\nDin care:\\n- Facturi în termen: [X] RON\\n- Facturi restante (1-30 zile): [Y] RON\\n- Facturi restante (31-60 zile): [Z] RON\\n- Facturi restante (peste 60 zile): [W] RON", "type": "table" },
    { "heading": "SOLICITARE CONFIRMARE", "content": "Vă rugăm să verificați datele de mai sus și să ne returnați un exemplar al prezentei confirmări, semnat și ștampilat, cu una dintre următoarele mențiuni:\\n\\n☐ Confirmăm soldul de [TOTAL] RON în favoarea dumneavoastră\\n☐ Soldul conform evidențelor noastre este de _______ RON\\n☐ Observații: _______________________________________\\n\\nTermenul de răspuns solicitat: [15] zile calendaristice de la primire.\\n\\nÎn cazul în care nu primim răspuns în termenul menționat, soldul va fi considerat confirmat.", "type": "text" },
    { "heading": "SEMNĂTURI", "content": "EMITENT (societatea noastră):\\n[NUME] – Director\\nSemnătura: _______________\\n[NUME] – Contabil\\nSemnătura: _______________\\nȘtampila\\nData: [DATA]\\n\\n─────────────────────────\\n\\nDESTINATAR (clientul):\\n[NUME] – Director\\nSemnătura: _______________\\n[NUME] – Contabil\\nSemnătura: _______________\\nȘtampila\\nData: _______________", "type": "text" }
  ]
}

REGULI CONFIRMARE SOLD CLIENT:
- Cont contabil 4111 (Clienți)
- Sold = creanța NOASTRĂ asupra clientului (ce ne datorează)
- Include aging analysis (vechime facturi: în termen, 1-30, 31-60, peste 60 zile)
- Include câmpuri pentru răspunsul clientului
- Mențiune: soldul se consideră confirmat în absența răspunsului
- Bloc dublu de semnătură (emitent + destinatar)
${customData ? `\nContext specific: ${JSON.stringify(customData)}` : ''}`;

    default:
      return `${baseRules}

Generezi un document Word profesional structurat pe secțiuni.

Schema OBLIGATORIE:
{
  "title": "Titlul documentului",
  "summary": "Rezumat executiv...",
  "keywords": ["cuvânt1", "cuvânt2"],
  "sections": [
    { "heading": "Titlu secțiune", "content": "Conținut detaliat...", "type": "text|table|list|highlight" }
  ]
}

REGULI:
- Conținut profesional, în limba română (dacă nu se specifică altfel)
- Structurat pe secțiuni logice cu flux narativ
- Adaptat contextului cererii utilizatorului
- Folosește type "highlight" pentru informații cheie/rezumate
- Fiecare secțiune cu conținut substanțial
${balanceSection || ''}
${customData ? `\nDate suplimentare: ${JSON.stringify(customData)}` : ''}`;
  }
}

// =============================================================================
// AI CONTENT GENERATION
// =============================================================================

async function generateDocumentContent(
  description: string,
  documentType: string,
  templateType?: string,
  customData?: Record<string, unknown>,
  balanceContext?: Record<string, unknown>
): Promise<{ title: string; summary?: string; keywords?: string[]; sections: Array<{ heading: string; content: string; type?: string }>; sheets?: unknown[]; slides?: unknown[] }> {
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

// ==================== DOCX GENERATION v4.0 — Professional ====================
async function generateDocx(
  docContent: { title: string; summary?: string; keywords?: string[]; sections: Array<{ heading: string; content: string; type?: string }> },
  template?: string
): Promise<Uint8Array> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer, PageNumber, PageBreak, LevelFormat, ShadingType } = await import("npm:docx@9.5.1");

  const children: any[] = [];
  const isLetterhead = template === 'letterhead' || template === 'client_notification' || template === 'report';
  const isContract = template === 'contract' || template === 'nda';
  const brandColor = "1E2761";
  const accentColor = "3B82F6";
  const mutedColor = "64748B";

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
        reference: "sub_bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "◦",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        }],
      },
      {
        reference: "numbered",
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  };

  // === COVER PAGE (for reports, proposals, contracts) ===
  if (isLetterhead || isContract || template === 'propunere' || template === 'raport') {
    // Large colored header block
    children.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: brandColor, space: 1 } },
        spacing: { after: 400 },
        children: [],
      }),
      new Paragraph({
        children: [new TextRun({ text: docContent.title, bold: true, size: 48, font: "Calibri", color: brandColor })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      }),
    );

    // Summary if available
    if (docContent.summary) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: docContent.summary, size: 24, font: "Calibri", color: mutedColor, italics: true })],
          spacing: { after: 300 },
        }),
      );
    }

    // Metadata line
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 20, font: "Calibri", color: mutedColor }),
          new TextRun({ text: "  |  ", size: 20, font: "Calibri", color: "CCCCCC" }),
          new TextRun({ text: "Generat de Yana AI", size: 20, font: "Calibri", color: mutedColor }),
        ],
        spacing: { after: 200 },
      }),
    );

    // Keywords tags
    if (docContent.keywords && docContent.keywords.length > 0) {
      children.push(
        new Paragraph({
          children: docContent.keywords.map((kw, i) => new TextRun({
            text: i === 0 ? `🏷 ${kw}` : `  •  ${kw}`,
            size: 18, font: "Calibri", color: accentColor,
          })),
          spacing: { after: 400 },
        }),
      );
    }

    // Page break after cover
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // === CLIENT NOTIFICATION HEADER ===
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

  // === CONTRACT NUMBER ===
  if (isContract && !isLetterhead) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Nr. _______ / ${new Date().toLocaleDateString("ro-RO")}`, size: 20, font: "Calibri", color: mutedColor })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      }),
    );
  }

  // === TITLE (if no cover page) ===
  if (!isLetterhead && !isContract && template !== 'propunere' && template !== 'raport') {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: docContent.title, bold: true, size: 36, font: "Calibri", color: brandColor })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 20, color: mutedColor, font: "Calibri" })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 },
      }),
    );
  }

  // === SECTIONS ===
  for (const section of docContent.sections) {
    const isDisclaimer = section.heading?.toUpperCase().includes('DISCLAIMER');
    const isHighlight = section.type === 'highlight';

    if (isDisclaimer) {
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0", space: 8 } },
          children: [new TextRun({ text: section.content, size: 18, font: "Calibri", italics: true, color: "888888" })],
          spacing: { after: 200 },
        }),
      );
      continue;
    }

    // Highlight box (for executive summaries, key findings)
    if (isHighlight) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: section.heading, bold: true, size: 28, font: "Calibri", color: brandColor })],
          spacing: { before: 300, after: 150 },
        }),
      );

      // Create a highlight table (single cell with colored background)
      const highlightCell = new TableCell({
        borders: {
          left: { style: BorderStyle.SINGLE, size: 12, color: accentColor },
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        shading: { fill: "F0F4FF", type: ShadingType.CLEAR },
        margins: { top: 150, bottom: 150, left: 200, right: 200 },
        width: { size: 9026, type: WidthType.DXA },
        children: section.content.split("\n").filter((l: string) => l.trim()).map((line: string) =>
          new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 22, font: "Calibri", color: "1E3A5F" })],
            spacing: { after: 80 },
          })
        ),
      });

      children.push(
        new Table({
          rows: [new TableRow({ children: [highlightCell] })],
          width: { size: 9026, type: WidthType.DXA },
        }),
        new Paragraph({ spacing: { after: 200 } }),
      );
      continue;
    }

    // Section heading with accent
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accentColor, space: 4 } },
        children: [new TextRun({ text: section.heading, bold: true, size: isContract ? 24 : 28, font: "Calibri", color: brandColor })],
        spacing: { before: isContract ? 200 : 350, after: isContract ? 100 : 200 },
      })
    );

    // Table content
    if (section.type === "table" && section.content.includes("|")) {
      const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
      const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
      const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const cellCount = rows.length > 0 ? rows[0].split("|").filter((c: string) => c.trim()).length : 1;
      const cellWidth = Math.floor(9026 / Math.max(cellCount, 1));

      const tableRows = rows.map((row: string, idx: number) => {
        const cells = row.split("|").filter((c: string) => c.trim()).map((cell: string) =>
          new TableCell({
            borders,
            width: { size: cellWidth, type: WidthType.DXA },
            shading: idx === 0
              ? { fill: brandColor, type: ShadingType.CLEAR }
              : (idx % 2 === 0 ? { fill: "F8FAFC", type: ShadingType.CLEAR } : undefined),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({
                text: cell.trim(),
                bold: idx === 0,
                size: idx === 0 ? 20 : 21,
                font: "Calibri",
                color: idx === 0 ? "FFFFFF" : "374151",
              })],
            })],
          })
        );
        return new TableRow({ children: cells });
      });

      if (tableRows.length > 0) {
        children.push(
          new Table({
            rows: tableRows,
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: Array(cellCount).fill(cellWidth),
          }),
          new Paragraph({ spacing: { after: 200 } }),
        );
      }
    } else if (section.type === "list") {
      const items = section.content.split("\n").filter((l: string) => l.trim());
      for (const item of items) {
        const cleanText = item.replace(/^[-•*]\s*/, "");
        const isBold = cleanText.includes("**");
        const displayText = cleanText.replace(/\*\*/g, "");
        children.push(
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: [new TextRun({ text: displayText, size: 22, font: "Calibri", bold: isBold })],
            spacing: { after: 80 },
          })
        );
      }
      children.push(new Paragraph({ spacing: { after: 100 } }));
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
                  spacing: { after: 80, line: 320 },
                })
              );
            }
          }
          children.push(new Paragraph({ spacing: { after: 80 } }));
        }
      }
    }
  }

  // === CONTRACT SIGNATURE BLOCK ===
  if (isContract) {
    children.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0", space: 8 } },
        spacing: { after: 300 },
        children: [],
      }),
    );

    // Two-column signature using a table
    const sigBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const sigBorders = { top: sigBorder, bottom: sigBorder, left: sigBorder, right: sigBorder };

    const sigTable = new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [4513, 4513],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: sigBorders,
              width: { size: 4513, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: "PRESTATOR", bold: true, size: 22, font: "Calibri", color: brandColor })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: "Denumire: [DENUMIRE PRESTATOR]", size: 20, font: "Calibri" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Reprezentant: [NUME]", size: 20, font: "Calibri" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Semnătura: ___________________", size: 20, font: "Calibri", color: "999999" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Data: ___________________", size: 20, font: "Calibri", color: "999999" })] }),
              ],
            }),
            new TableCell({
              borders: sigBorders,
              width: { size: 4513, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: "BENEFICIAR", bold: true, size: 22, font: "Calibri", color: brandColor })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: "Denumire: [DENUMIRE BENEFICIAR]", size: 20, font: "Calibri" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Reprezentant: [NUME]", size: 20, font: "Calibri" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Semnătura: ___________________", size: 20, font: "Calibri", color: "999999" })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: "Data: ___________________", size: 20, font: "Calibri", color: "999999" })] }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(sigTable);
  }

  // === CLIENT NOTIFICATION SIGN-OFF ===
  if (template === 'client_notification') {
    children.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({ children: [new TextRun({ text: "Cu stimă,", size: 22, font: "Calibri" })], spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: "___________________________", size: 22, font: "Calibri", color: "999999" })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: "[Semnătura / Numele complet / Funcția]", size: 18, font: "Calibri", color: "999999", italics: true })] }),
    );
  }

  // === HEADER ===
  const headerChildren = isLetterhead ? [
    new Paragraph({
      children: [
        new TextRun({ text: "DOCUMENT OFICIAL", bold: true, size: 18, font: "Calibri", color: brandColor }),
        new TextRun({ text: `  •  ${new Date().toLocaleDateString("ro-RO")}`, size: 16, font: "Calibri", color: "999999" }),
      ],
      alignment: AlignmentType.LEFT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: brandColor, space: 1 } },
      spacing: { after: 200 },
    }),
  ] : isContract ? [
    new Paragraph({
      children: [
        new TextRun({ text: "CONFIDENȚIAL", bold: true, size: 16, font: "Calibri", color: "CC0000" }),
        new TextRun({ text: "  •  DRAFT — necesită verificare juridică", size: 14, font: "Calibri", color: "999999" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CC0000", space: 1 } },
      spacing: { after: 200 },
    }),
  ] : [];

  // === FOOTER ===
  const footerChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: "Pagina ", size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ text: " din ", size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Calibri", color: "999999" }),
        new TextRun({ text: "  •  Generat de Yana AI", size: 14, font: "Calibri", color: "CCCCCC" }),
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
          run: { size: 36, bold: true, font: "Calibri", color: brandColor },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Calibri", color: "2E5090" },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
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

// ==================== XLSX GENERATION v3.0 — Enhanced ====================
async function generateXlsx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }>; sheets?: any[] },
  excelConfig?: DocumentRequest["excelConfig"]
): Promise<Uint8Array> {
  const ExcelJS = (await import("npm:exceljs@4.4.0")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Yana AI";
  workbook.created = new Date();

  const styling = excelConfig?.styling || {};
  const headerColor = (styling.headerColor || "1E2761").replace("#", "");
  const headerFontColor = (styling.headerFontColor || "FFFFFF").replace("#", "");
  const alternateRowColor = (styling.alternateRowColor || "F0F4FF").replace("#", "");
  const autoFilter = styling.autoFilter !== false;
  const freezeHeader = styling.freezeHeader !== false;

  const sheetsData = excelConfig?.sheets || (docContent as any).sheets || null;

  if (sheetsData && sheetsData.length > 0) {
    for (const sheetData of sheetsData) {
      const ws = workbook.addWorksheet((sheetData.name || 'Sheet').substring(0, 31));
      
      const headers = sheetData.headers || [];
      if (headers.length > 0) {
        const headerRow = ws.addRow(headers);
        headerRow.height = 28;
        headerRow.eachCell((cell: any, colNumber: number) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerColor}` } };
          cell.font = { bold: true, color: { argb: `FF${headerFontColor}` }, size: 11, name: "Calibri" };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FF" + headerColor } },
            bottom: { style: "medium", color: { argb: "FF" + headerColor } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          };
        });
      }

      const rows = sheetData.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const row = ws.addRow(rows[i]);
        const isLastRow = i === rows.length - 1;
        const isTotalRow = isLastRow && rows[i]?.[0]?.toString().toLowerCase().includes('total');

        row.eachCell((cell: any) => {
          cell.font = {
            size: isTotalRow ? 11 : 10,
            name: "Calibri",
            bold: isTotalRow,
            color: isTotalRow ? { argb: `FF${headerColor}` } : undefined,
          };
          cell.alignment = { vertical: "middle" };
          cell.border = {
            bottom: { style: isTotalRow ? "double" : "thin", color: { argb: isTotalRow ? `FF${headerColor}` : "FFE5E7EB" } },
          };

          if (isTotalRow) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
          } else if (i % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${alternateRowColor}` } };
          }

          // Smart number formatting
          if (typeof cell.value === 'number') {
            if (Math.abs(cell.value) >= 1000000) {
              cell.numFmt = '#,##0';
            } else if (cell.value % 1 !== 0) {
              cell.numFmt = '#,##0.00';
            } else if (Math.abs(cell.value) > 999) {
              cell.numFmt = '#,##0';
            }
          }
        });
      }

      // Apply conditional formatting rules
      if (sheetData.conditionalRules) {
        for (const rule of sheetData.conditionalRules) {
          const colIdx = rule.column.charCodeAt(0) - 64;
          const dataRange = `${rule.column}2:${rule.column}${rows.length + 1}`;

          if (rule.type === 'positive_negative') {
            ws.addConditionalFormatting({
              ref: dataRange,
              rules: [
                {
                  type: 'cellIs',
                  operator: 'greaterThan',
                  formulae: [0],
                  style: { font: { color: { argb: 'FF16A34A' } } },
                  priority: 1,
                },
                {
                  type: 'cellIs',
                  operator: 'lessThan',
                  formulae: [0],
                  style: { font: { color: { argb: 'FFDC2626' } } },
                  priority: 2,
                },
              ],
            });
          }
        }
      }

      // Formulas
      if (sheetData.formulas) {
        for (const f of sheetData.formulas) {
          const cell = ws.getCell(f.cell);
          cell.value = { formula: f.formula } as any;
          cell.font = { bold: true, size: 11, name: "Calibri", color: { argb: `FF${headerColor}` } };
        }
      }

      // Column widths
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
        // Auto-width with better algorithm
        ws.columns.forEach((col: any) => {
          let maxLen = 12;
          col.eachCell?.({ includeEmpty: false }, (cell: any) => {
            const cellLen = String(cell.value || "").length;
            if (cellLen > maxLen) maxLen = cellLen;
          });
          col.width = Math.min(Math.max(maxLen + 3, 10), 45);
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

    // Auto-generate Summary sheet if >2 data sheets
    if (sheetsData.length >= 2) {
      const summaryWs = workbook.addWorksheet("📊 Sumar");
      summaryWs.addRow(["Rezumat Document"]).getCell(1).font = { bold: true, size: 16, name: "Calibri", color: { argb: `FF${headerColor}` } };
      summaryWs.addRow([]);
      summaryWs.addRow(["Informație", "Valoare"]);
      summaryWs.getRow(3).eachCell((cell: any) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerColor}` } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
      });

      summaryWs.addRow(["Titlu document", docContent.title]);
      summaryWs.addRow(["Nr. sheet-uri", sheetsData.length]);
      summaryWs.addRow(["Data generării", new Date().toLocaleDateString("ro-RO")]);
      summaryWs.addRow(["Generat de", "Yana AI"]);

      for (const sd of sheetsData) {
        summaryWs.addRow([`Sheet: ${sd.name}`, `${(sd.rows || []).length} rânduri, ${(sd.headers || []).length} coloane`]);
      }

      summaryWs.getColumn(1).width = 30;
      summaryWs.getColumn(2).width = 40;

      // Move summary to first position
      const sheetCount = workbook.worksheets.length;
      if (sheetCount > 1) {
        workbook.moveWorksheet(summaryWs.name, 0);
      }
    }
  } else {
    // Fallback: generate from sections
    for (const section of docContent.sections) {
      const sheetName = section.heading.substring(0, 31);

      if (section.type === "table" && section.content.includes("|")) {
        const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
        const data = rows.map((row: string) => row.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim()));

        if (data.length > 0) {
          const ws = workbook.addWorksheet(sheetName);
          const headerRow = ws.addRow(data[0]);
          headerRow.height = 28;
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
            col.width = Math.min(maxLen + 4, 45);
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

// ==================== PPTX GENERATION v5.0 — Rich Layouts ====================
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
  const totalSlides = slides ? slides.length : (docContent.sections.length + 2);

  // Helper: add slide number
  const addSlideNumber = (slide: any, num: number) => {
    slide.addText(`${num} / ${totalSlides}`, {
      x: 8.8, y: 5.1, w: 1, h: 0.3,
      fontSize: 9, color: "999999", fontFace: "Arial", align: "right",
    });
  };

  // Helper: add subtle branding
  const addBranding = (slide: any) => {
    slide.addText("Yana AI", {
      x: 0.3, y: 5.15, w: 1.5, h: 0.25,
      fontSize: 8, color: "BBBBBB", fontFace: "Arial",
    });
  };

  if (slides && slides.length > 0) {
    for (let si = 0; si < slides.length; si++) {
      const slideData = slides[si];
      const slide = pptx.addSlide();
      const layout = slideData.layout || 'content';

      switch (layout) {
        case 'title': {
          slide.background = { color: pal.bg };
          // Top accent bar
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: pal.highlight } });
          // Side accent
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.05, w: 0.08, h: 5.58, fill: { color: pal.primary } });

          slide.addText(slideData.title || docContent.title, {
            x: 0.8, y: 1.2, w: 8.4, h: 2.2,
            fontSize: 42, bold: true, color: pal.text, fontFace: "Arial",
            align: "left", valign: "middle",
          });
          if (slideData.subtitle || slideData.content) {
            slide.addText(slideData.subtitle || slideData.content, {
              x: 0.8, y: 3.5, w: 7.5, h: 1,
              fontSize: 17, color: pal.muted, fontFace: "Arial", align: "left",
              lineSpacingMultiple: 1.4,
            });
          }
          // Bottom bar with date
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.1, w: 10, h: 0.52, fill: { color: pal.cardBg } });
          slide.addText(`${new Date().toLocaleDateString("ro-RO")}  •  Generat de Yana`, {
            x: 0.5, y: 5.15, w: 9, h: 0.4,
            fontSize: 10, color: pal.muted, fontFace: "Arial",
          });
          break;
        }

        case 'section_break': {
          slide.background = { color: pal.primary };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: pal.highlight } });
          // Large section number or icon
          slide.addText(slideData.title || '', {
            x: 1, y: 1.5, w: 8, h: 2.2,
            fontSize: 38, bold: true, color: "FFFFFF", fontFace: "Arial",
            align: "center", valign: "middle",
          });
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 2, y: 3.8, w: 6, h: 1,
              fontSize: 16, color: pal.secondary, fontFace: "Arial", align: "center",
              lineSpacingMultiple: 1.3,
            });
          }
          addSlideNumber(slide, si + 1);
          break;
        }

        case 'stats': {
          slide.background = { color: "FFFFFF" };
          // Title bar
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const stats: Array<{ value: string; label: string; trend?: string }> = slideData.stats || [];
          const count = Math.min(stats.length, 4);
          if (count > 0) {
            const cardW = count <= 2 ? 3.6 : count === 3 ? 2.6 : 2.0;
            const gap = 0.35;
            const totalW = count * cardW + (count - 1) * gap;
            let startX = (10 - totalW) / 2;

            for (let i = 0; i < count; i++) {
              const x = startX + i * (cardW + gap);
              // Card with subtle shadow effect
              slide.addShape(pptx.ShapeType.roundRect, {
                x: x + 0.03, y: 1.53, w: cardW, h: 2.7,
                fill: { color: "E5E7EB" }, rectRadius: 0.12,
              });
              slide.addShape(pptx.ShapeType.roundRect, {
                x, y: 1.5, w: cardW, h: 2.7,
                fill: { color: pal.bg }, rectRadius: 0.12,
              });
              // Trend indicator
              const trendIcon = stats[i].trend === 'up' ? '↑' : stats[i].trend === 'down' ? '↓' : '';
              const trendColor = stats[i].trend === 'up' ? '4ADE80' : stats[i].trend === 'down' ? 'F87171' : pal.secondary;

              slide.addText(`${stats[i].value} ${trendIcon}`, {
                x, y: 1.7, w: cardW, h: 1.4,
                fontSize: count <= 2 ? 44 : 34, bold: true, color: trendColor,
                fontFace: "Arial", align: "center", valign: "middle",
              });
              slide.addText(stats[i].label, {
                x: x + 0.15, y: 3.2, w: cardW - 0.3, h: 0.8,
                fontSize: 12, color: pal.muted, fontFace: "Arial",
                align: "center", valign: "top", lineSpacingMultiple: 1.2,
              });
            }
          }

          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 1, y: 4.5, w: 8, h: 0.6,
              fontSize: 12, color: "666666", fontFace: "Arial", align: "center",
            });
          }
          addSlideNumber(slide, si + 1);
          addBranding(slide);
          break;
        }

        case 'timeline': {
          slide.background = { color: "FFFFFF" };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || 'Timeline', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const items: Array<{ step: string; title: string; description: string }> = slideData.timeline_items || [];
          const itemCount = Math.min(items.length, 5);

          if (itemCount > 0) {
            // Horizontal timeline line
            const lineY = 2.4;
            slide.addShape(pptx.ShapeType.rect, {
              x: 0.8, y: lineY, w: 8.4, h: 0.04,
              fill: { color: pal.primary },
            });

            const stepW = 8.4 / itemCount;
            for (let i = 0; i < itemCount; i++) {
              const cx = 0.8 + i * stepW + stepW / 2;
              // Circle node
              slide.addShape(pptx.ShapeType.ellipse, {
                x: cx - 0.22, y: lineY - 0.2, w: 0.44, h: 0.44,
                fill: { color: pal.primary },
              });
              // Step number in circle
              slide.addText(items[i].step || `${i + 1}`, {
                x: cx - 0.22, y: lineY - 0.2, w: 0.44, h: 0.44,
                fontSize: 12, bold: true, color: "FFFFFF", fontFace: "Arial",
                align: "center", valign: "middle",
              });
              // Title below
              slide.addText(items[i].title, {
                x: cx - stepW / 2 + 0.1, y: lineY + 0.4, w: stepW - 0.2, h: 0.5,
                fontSize: 12, bold: true, color: pal.bg, fontFace: "Arial",
                align: "center", valign: "top",
              });
              // Description
              slide.addText(items[i].description, {
                x: cx - stepW / 2 + 0.1, y: lineY + 0.9, w: stepW - 0.2, h: 1.2,
                fontSize: 10, color: "666666", fontFace: "Arial",
                align: "center", valign: "top", lineSpacingMultiple: 1.3,
              });
            }
          }

          addSlideNumber(slide, si + 1);
          addBranding(slide);
          break;
        }

        case 'icon_grid': {
          slide.background = { color: "FFFFFF" };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const gridItems: Array<{ icon: string; title: string; description: string }> = slideData.grid_items || [];
          const gridCount = Math.min(gridItems.length, 6);
          const cols = gridCount <= 4 ? 2 : 3;
          const rowCount = Math.ceil(gridCount / cols);
          const cardW = cols === 2 ? 4.2 : 2.7;
          const cardH = rowCount === 1 ? 3.0 : 1.8;
          const gapX = 0.4;
          const gapY = 0.3;
          const totalGridW = cols * cardW + (cols - 1) * gapX;
          const startGridX = (10 - totalGridW) / 2;
          const startGridY = 1.2;

          for (let i = 0; i < gridCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startGridX + col * (cardW + gapX);
            const y = startGridY + row * (cardH + gapY);

            // Card background
            slide.addShape(pptx.ShapeType.roundRect, {
              x, y, w: cardW, h: cardH,
              fill: { color: "F8FAFC" }, rectRadius: 0.1,
              line: { color: "E2E8F0", width: 0.5 },
            });
            // Emoji icon
            slide.addText(gridItems[i].icon || '📌', {
              x: x + 0.2, y: y + 0.15, w: 0.5, h: 0.5,
              fontSize: 22, fontFace: "Arial",
            });
            // Title
            slide.addText(gridItems[i].title, {
              x: x + 0.8, y: y + 0.15, w: cardW - 1, h: 0.4,
              fontSize: 13, bold: true, color: pal.bg, fontFace: "Arial",
              valign: "middle",
            });
            // Description
            slide.addText(gridItems[i].description, {
              x: x + 0.2, y: y + 0.65, w: cardW - 0.4, h: cardH - 0.85,
              fontSize: 10, color: "64748B", fontFace: "Arial",
              valign: "top", lineSpacingMultiple: 1.3,
            });
          }

          addSlideNumber(slide, si + 1);
          addBranding(slide);
          break;
        }

        case 'checklist': {
          slide.background = { color: "FFFFFF" };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || 'Checklist', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const checkItems: Array<{ text: string; checked: boolean }> = slideData.checklist_items || [];
          const checkCount = Math.min(checkItems.length, 8);
          const itemH = 0.45;
          const startY = 1.3;

          for (let i = 0; i < checkCount; i++) {
            const y = startY + i * (itemH + 0.1);
            const isChecked = checkItems[i].checked;
            // Checkbox icon
            slide.addText(isChecked ? '✅' : '⬜', {
              x: 1, y, w: 0.5, h: itemH,
              fontSize: 16, fontFace: "Arial", valign: "middle",
            });
            // Item text
            slide.addText(checkItems[i].text, {
              x: 1.6, y, w: 7.4, h: itemH,
              fontSize: 14, color: isChecked ? "16A34A" : "374151", fontFace: "Arial",
              valign: "middle",
              strike: isChecked,
            });
            // Subtle separator
            if (i < checkCount - 1) {
              slide.addShape(pptx.ShapeType.rect, {
                x: 1.6, y: y + itemH, w: 7, h: 0.01,
                fill: { color: "E5E7EB" },
              });
            }
          }

          addSlideNumber(slide, si + 1);
          addBranding(slide);
          break;
        }

        case 'two_column':
        case 'comparison': {
          slide.background = { color: "FFFFFF" };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const leftContent = slideData.left_content || '';
          const rightContent = slideData.right_content || '';

          if (layout === 'comparison') {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.4, y: 1.15, w: 4.3, h: 3.8,
              fill: { color: pal.bg }, rectRadius: 0.1,
            });
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 5.3, y: 1.15, w: 4.3, h: 3.8,
              fill: { color: "F5F5F5" }, rectRadius: 0.1,
            });
          }

          const renderColumn = (content: string, x: number, w: number, textColor: string) => {
            const lines = content.split("\n").filter((l: string) => l.trim());
            if (lines.some((l: string) => l.startsWith("-") || l.startsWith("•"))) {
              slide.addText(
                lines.map((l: string) => ({
                  text: l.replace(/^[-•*]\s*/, ""),
                  options: { fontSize: 14, fontFace: "Arial", color: textColor, bullet: true, breakType: "break" as const },
                })),
                { x, y: 1.35, w, h: 3.4, valign: "top", lineSpacingMultiple: 1.35 }
              );
            } else {
              slide.addText(content, {
                x, y: 1.35, w, h: 3.4,
                fontSize: 14, color: textColor, fontFace: "Arial", valign: "top",
                lineSpacingMultiple: 1.35,
              });
            }
          };

          renderColumn(leftContent, 0.6, 3.8, layout === 'comparison' ? pal.text : "333333");
          renderColumn(rightContent, 5.5, 3.8, "333333");

          // Divider
          slide.addShape(pptx.ShapeType.rect, {
            x: 4.9, y: 1.4, w: 0.02, h: 3.2,
            fill: { color: "DDDDDD" },
          });

          addSlideNumber(slide, si + 1);
          addBranding(slide);
          break;
        }

        case 'quote': {
          slide.background = { color: pal.bg };
          // Decorative quote mark
          slide.addText('"', {
            x: 0.5, y: 0.5, w: 2, h: 1.8,
            fontSize: 140, color: pal.primary, fontFace: "Georgia", bold: true,
          });
          slide.addText(slideData.content || '', {
            x: 1.2, y: 1.8, w: 7.6, h: 2.2,
            fontSize: 22, color: pal.text, fontFace: "Georgia",
            italic: true, align: "center", valign: "middle",
            lineSpacingMultiple: 1.5,
          });
          if (slideData.quote_author) {
            slide.addShape(pptx.ShapeType.rect, {
              x: 4, y: 4.1, w: 2, h: 0.03,
              fill: { color: pal.highlight },
            });
            slide.addText(`— ${slideData.quote_author}`, {
              x: 2, y: 4.3, w: 6, h: 0.5,
              fontSize: 14, color: pal.muted, fontFace: "Arial", align: "center",
            });
          }
          addSlideNumber(slide, si + 1);
          break;
        }

        case 'cta': {
          slide.background = { color: pal.bg };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: pal.highlight } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.05, w: 0.08, h: 5.58, fill: { color: pal.primary } });

          slide.addText(slideData.title || "Mulțumesc!", {
            x: 0.8, y: 1.2, w: 8.4, h: 1.5,
            fontSize: 44, bold: true, color: pal.text, fontFace: "Arial",
            align: "left", valign: "middle",
          });
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.8, y: 2.8, w: 7, h: 1.2,
              fontSize: 17, color: pal.muted, fontFace: "Arial",
              align: "left", valign: "top", lineSpacingMultiple: 1.4,
            });
          }
          if (slideData.subtitle) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.8, y: 4.2, w: 4, h: 0.6,
              fill: { color: pal.primary }, rectRadius: 0.3,
            });
            slide.addText(slideData.subtitle, {
              x: 0.8, y: 4.2, w: 4, h: 0.6,
              fontSize: 14, bold: true, color: "FFFFFF", fontFace: "Arial",
              align: "center", valign: "middle",
            });
          }
          break;
        }

        default: {
          // Standard content slide
          slide.background = { color: "FFFFFF" };
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
          slide.addText(slideData.title || '', {
            x: 0.5, y: 0.1, w: 9, h: 0.65,
            fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
          });

          const content = (slideData.content || '').substring(0, 1500);
          const lines = content.split("\n").filter((l: string) => l.trim());

          if (lines.some((l: string) => l.startsWith("-") || l.startsWith("•"))) {
            slide.addText(
              lines.map((l: string) => ({
                text: l.replace(/^[-•*]\s*/, ""),
                options: { fontSize: 15, fontFace: "Arial", color: "374151", bullet: { type: "bullet", style: "●", indent: 15 }, breakType: "break" as const },
              })),
              { x: 0.8, y: 1.2, w: 8.4, h: 3.8, valign: "top", lineSpacingMultiple: 1.45 }
            );
          } else {
            slide.addText(content, {
              x: 0.5, y: 1.2, w: 9, h: 3.8,
              fontSize: 15, color: "374151", fontFace: "Arial", valign: "top",
              lineSpacingMultiple: 1.45,
            });
          }

          addSlideNumber(slide, si + 1);
          addBranding(slide);
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
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: pal.highlight } });
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.05, w: 0.08, h: 5.58, fill: { color: pal.primary } });
    titleSlide.addText(docContent.title, {
      x: 0.8, y: 1.5, w: 8.4, h: 2,
      fontSize: 40, bold: true, color: pal.text, fontFace: "Arial",
      align: "left", valign: "middle",
    });
    titleSlide.addText(`Generat de Yana • ${new Date().toLocaleDateString("ro-RO")}`, {
      x: 0.8, y: 4, w: 8, h: 0.5,
      fontSize: 12, color: pal.muted, fontFace: "Arial",
    });

    for (let si = 0; si < docContent.sections.length; si++) {
      const section = docContent.sections[si];
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.bg } });
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: 10, h: 0.04, fill: { color: pal.highlight } });
      slide.addText(section.heading, {
        x: 0.5, y: 0.1, w: 9, h: 0.65,
        fontSize: 22, bold: true, color: pal.text, fontFace: "Arial",
      });

      const contentText = section.content.substring(0, 1500);
      const lines = contentText.split("\n").filter((l: string) => l.trim());

      if (section.type === "list" || lines.every((l: string) => l.startsWith("-") || l.startsWith("•"))) {
        slide.addText(
          lines.map((l: string) => ({
            text: l.replace(/^[-•*]\s*/, ""),
            options: { fontSize: 15, fontFace: "Arial", color: "374151", bullet: true, breakType: "break" as const },
          })),
          { x: 0.8, y: 1.2, w: 8.4, h: 3.8, valign: "top", lineSpacingMultiple: 1.45 }
        );
      } else {
        slide.addText(contentText, {
          x: 0.5, y: 1.2, w: 9, h: 3.8,
          fontSize: 15, color: "374151", fontFace: "Arial", valign: "top",
          lineSpacingMultiple: 1.45,
        });
      }
      addSlideNumber(slide, si + 2);
      addBranding(slide);
    }

    const endSlide = pptx.addSlide();
    endSlide.background = { color: pal.bg };
    endSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: pal.highlight } });
    endSlide.addText("Mulțumesc!", {
      x: 1, y: 1.8, w: 8, h: 2,
      fontSize: 44, bold: true, color: pal.text, fontFace: "Arial",
      align: "center", valign: "middle",
    });
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" });
  return new Uint8Array(arrayBuffer as ArrayBuffer);
}

// ==================== PDF GENERATION v2.0 ====================
async function generatePdf(
  docContent: { title: string; subtitle?: string; sections: Array<{ heading: string; content: string; type?: string }> }
): Promise<Uint8Array> {
  const { jsPDF } = await import("npm:jspdf@2.5.2");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Title with accent line
  doc.setDrawColor(30, 39, 97);
  doc.setLineWidth(1.5);
  doc.line(margin, y - 2, margin + 40, y - 2);
  y += 5;

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 39, 97);
  const titleLines = doc.splitTextToSize(docContent.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 3;

  // Subtitle
  if (docContent.subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    const subLines = doc.splitTextToSize(docContent.subtitle, contentWidth);
    doc.text(subLines, margin, y);
    y += subLines.length * 5 + 5;
  }

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  for (const section of docContent.sections) {
    if (y > 255) { doc.addPage(); y = 20; }

    const isDisclaimer = section.heading?.toUpperCase().includes('DISCLAIMER');
    const isHighlight = section.type === 'highlight';

    // Highlight box
    if (isHighlight) {
      doc.setFillColor(240, 244, 255);
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      const boxH = Math.max(25, doc.splitTextToSize(section.content, contentWidth - 10).length * 5.5 + 10);
      if (y + boxH > 270) { doc.addPage(); y = 20; }
      doc.roundedRect(margin - 2, y - 3, contentWidth + 4, boxH, 2, 2, 'FD');
      doc.line(margin - 2, y - 3, margin - 2, y - 3 + boxH);

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 39, 97);
      doc.text(section.heading, margin + 3, y + 4);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 58, 95);
      const hLines = doc.splitTextToSize(section.content, contentWidth - 10);
      for (const hl of hLines) {
        doc.text(hl, margin + 3, y);
        y += 5;
      }
      y += 8;
      continue;
    }

    // Section heading
    doc.setFontSize(isDisclaimer ? 10 : 14);
    doc.setFont("helvetica", isDisclaimer ? "italic" : "bold");
    doc.setTextColor(isDisclaimer ? 136 : 30, isDisclaimer ? 136 : 39, isDisclaimer ? 136 : 97);
    const headingLines = doc.splitTextToSize(section.heading, contentWidth);
    doc.text(headingLines, margin, y);
    y += headingLines.length * 6 + 3;

    // Accent underline for non-disclaimer headings
    if (!isDisclaimer) {
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, y - 1, margin + 30, y - 1);
      y += 3;
    }

    // Content
    doc.setFontSize(isDisclaimer ? 9 : 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(isDisclaimer ? 136 : 55, isDisclaimer ? 136 : 55, isDisclaimer ? 136 : 55);

    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 8;
  }

  // Page numbers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} din ${totalPages}  •  Generat de Yana AI`, pageWidth / 2, 290, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// ==================== PDF MERGE & FILL ====================
async function mergePdfs(supabase: any, sourceFiles: string[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("npm:pdf-lib@1.17.1");
  const mergedPdf = await PDFDocument.create();
  
  for (const filePath of sourceFiles) {
    try {
      const { data, error } = await supabase.storage.from("generated-documents").download(filePath);
      if (error || !data) { console.warn(`[PDF-MERGE] Failed: ${filePath}`); continue; }
      const pdfBytes = new Uint8Array(await data.arrayBuffer());
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      pages.forEach((page: any) => mergedPdf.addPage(page));
    } catch (err) { console.warn(`[PDF-MERGE] Error: ${filePath}`, err); }
  }
  
  if (mergedPdf.getPageCount() === 0) throw new Error("Nu am putut combina niciun PDF.");
  return new Uint8Array(await mergedPdf.save());
}

async function fillPdfForm(supabase: any, templatePath: string, fields: Record<string, string>): Promise<Uint8Array> {
  const { PDFDocument } = await import("npm:pdf-lib@1.17.1");
  const { data, error } = await supabase.storage.from("generated-documents").download(templatePath);
  if (error || !data) throw new Error(`Nu am putut descărca template-ul PDF: ${error?.message || 'negăsit'}`);
  
  const pdfDoc = await PDFDocument.load(new Uint8Array(await data.arrayBuffer()));
  try {
    const form = pdfDoc.getForm();
    for (const [fieldName, value] of Object.entries(fields)) {
      try { const field = form.getTextField(fieldName); if (field) field.setText(value); } catch {}
    }
    form.flatten();
  } catch { throw new Error('Template-ul PDF nu conține câmpuri de formular (AcroForm).'); }
  
  return new Uint8Array(await pdfDoc.save());
}

// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[DOC-GEN-v5][${requestId}] Request received`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Neautorizat" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalid" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DocumentRequest = await req.json();
    const { documentType, title, description, content, templateType, template, customData, recipientEmail, mode, sourceFiles, excelConfig, balanceContext, templatePath, fields } = body;

    // PDF Merge mode
    if (mode === "merge" && documentType === "pdf" && sourceFiles?.length) {
      console.log(`[DOC-GEN-v5][${requestId}] PDF MERGE: ${sourceFiles.length} files`);
      const mergedBuffer = await mergePdfs(supabase, sourceFiles);
      const fileName = `${user.id}/merged_${Date.now()}.pdf`;
      await supabase.storage.from("generated-documents").upload(fileName, mergedBuffer, { contentType: "application/pdf", upsert: false });
      const { data: signedUrlData } = await supabase.storage.from("generated-documents").createSignedUrl(fileName, 7 * 24 * 60 * 60);
      return new Response(JSON.stringify({ success: true, documentTitle: "PDF Combinat", documentType: "pdf", downloadUrl: signedUrlData?.signedUrl, filePath: fileName, fileSize: mergedBuffer.length, emailSent: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PDF Fill Form mode
    if (mode === "fill_form" && documentType === "pdf" && templatePath && fields) {
      console.log(`[DOC-GEN-v5][${requestId}] PDF FILL: template=${templatePath}`);
      const filledBuffer = await fillPdfForm(supabase, templatePath, fields);
      const fileName = `${user.id}/filled_${Date.now()}.pdf`;
      await supabase.storage.from("generated-documents").upload(fileName, filledBuffer, { contentType: "application/pdf", upsert: false });
      const { data: signedUrlData } = await supabase.storage.from("generated-documents").createSignedUrl(fileName, 7 * 24 * 60 * 60);
      await supabase.from("generated_documents").insert({ user_id: user.id, document_type: "pdf_filled", document_title: "Formular completat", main_file_path: fileName, metadata: { generated_by: "yana-office-generator-v5", mode: "fill_form", template_path: templatePath, fields_count: Object.keys(fields).length } });
      return new Response(JSON.stringify({ success: true, documentTitle: "Formular PDF Completat", documentType: "pdf", downloadUrl: signedUrlData?.signedUrl, filePath: fileName, fileSize: filledBuffer.length, emailSent: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!documentType || !description) {
      return new Response(JSON.stringify({ error: "documentType și description sunt obligatorii" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveTemplate = template || templateType || 'general';
    console.log(`[DOC-GEN-v5][${requestId}] Type: ${documentType}, Template: ${effectiveTemplate}`);

    const docContent = content
      ? { title: title || "Document", sections: [{ heading: "Conținut", content, type: "text" }] }
      : await generateDocumentContent(description, documentType, effectiveTemplate, customData, balanceContext);

    console.log(`[DOC-GEN-v5][${requestId}] AI content: ${docContent.sections?.length || 0} sections, ${(docContent as any).sheets?.length || 0} sheets, ${(docContent as any).slides?.length || 0} slides`);

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

    console.log(`[DOC-GEN-v5][${requestId}] File: ${fileBuffer.length} bytes`);

    const sanitizedTitle = (docContent.title || title || "document")
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50) || 'document';
    const fileName = `${user.id}/${sanitizedTitle}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, fileBuffer, { contentType, upsert: false });

    if (uploadError) throw new Error(`Eroare la salvare: ${uploadError.message}`);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("generated-documents")
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    if (signedUrlError) throw new Error(`Eroare la generare URL: ${signedUrlError.message}`);

    await supabase.from("generated_documents").insert({
      user_id: user.id,
      document_type: templateType || documentType,
      document_title: docContent.title || title || "Document generat",
      main_file_path: fileName,
      metadata: {
        generated_by: "yana-office-generator-v5",
        document_format: documentType,
        template_type: templateType,
        template,
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
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: RESEND_FROM_EMAIL,
              to: [recipientEmail],
              subject: `📎 ${docTitle} — Document generat de Yana`,
              html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #1E2761, #3B82F6); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">📄 Document generat de Yana</h1>
                  </div>
                  <div style="background: #fafafa; padding: 30px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1E2761; margin-top: 0;">${docTitle}</h2>
                    <p style="color: #374151; line-height: 1.6;">
                      Documentul tău <strong>${extension.toUpperCase()}</strong> a fost generat cu succes.
                    </p>
                    <div style="text-align: center; margin: 25px 0;">
                      <a href="${signedUrlData.signedUrl}" 
                         style="background: linear-gradient(135deg, #1E2761, #3B82F6); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(30,39,97,0.3);">
                        ⬇️ Descarcă documentul
                      </a>
                    </div>
                    <p style="color: #9CA3AF; font-size: 13px; text-align: center;">Link-ul expiră în 7 zile.</p>
                  </div>
                  <p style="color: #BCBCBC; font-size: 11px; text-align: center; margin-top: 15px;">
                    Generat automat de Yana AI • ${new Date().toLocaleDateString("ro-RO")}
                  </p>
                </div>
              `,
            }),
          });

          if (resendResponse.ok) {
            emailSent = true;
            console.log(`[DOC-GEN-v5][${requestId}] Email sent to ${recipientEmail}`);
          }
        }
      } catch (emailErr) {
        console.warn(`[DOC-GEN-v5][${requestId}] Email failed:`, emailErr);
      }
    }

    console.log(`[DOC-GEN-v5][${requestId}] ✅ Complete. File: ${fileName}`);

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
    console.error(`[DOC-GEN-v5][${requestId}] ❌ Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la generarea documentului" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
