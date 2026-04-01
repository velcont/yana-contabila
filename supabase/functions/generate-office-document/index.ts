import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * GENERATE-OFFICE-DOCUMENT
 * Generates DOCX, XLSX, PPTX, PDF files using AI content + npm libraries
 * Uploads to Supabase Storage, returns download URL
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface DocumentRequest {
  userId: string;
  documentType: "docx" | "xlsx" | "pptx" | "pdf";
  title: string;
  description: string;
  content?: string; // Pre-generated content or instructions
  templateType?: string; // e.g. "contract", "invoice", "report", "presentation"
  customData?: Record<string, unknown>;
  recipientEmail?: string; // If user wants to send via email
}

// AI content generation
async function generateDocumentContent(
  description: string,
  documentType: string,
  templateType?: string,
  customData?: Record<string, unknown>
): Promise<{ title: string; sections: Array<{ heading: string; content: string; type?: string }> }> {
  const systemPrompt = `Ești Yana, asistent AI specializat în generare documente Office profesionale.
Generezi conținut structurat în format JSON pentru documente de tip: ${documentType}.

REGULI:
- Conținut profesional, în limba română (dacă nu se specifică altfel)
- Structurat pe secțiuni logice
- Adaptat tipului de document: ${templateType || 'general'}

Răspunde DOAR cu JSON valid, fără text suplimentar. Format:
{
  "title": "Titlul documentului",
  "sections": [
    { "heading": "Titlu secțiune", "content": "Conținut detaliat...", "type": "text|table|list|chart" }
  ]
}

${customData ? `Date suplimentare: ${JSON.stringify(customData)}` : ''}`;

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
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
    return JSON.parse(content);
  } catch {
    return {
      title: "Document generat",
      sections: [{ heading: "Conținut", content: content || description, type: "text" }],
    };
  }
}

// ==================== DOCX GENERATION ====================
async function generateDocx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }> }
): Promise<Uint8Array> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import("npm:docx@9.5.1");

  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: docContent.title, bold: true, size: 36, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Date
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 20, color: "666666", font: "Arial" })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
    })
  );

  // Sections
  for (const section of docContent.sections) {
    // Section heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.heading, bold: true, size: 28, font: "Arial" })],
        spacing: { before: 300, after: 200 },
      })
    );

    if (section.type === "table" && section.content.includes("|")) {
      // Parse markdown table
      const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
      const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
      const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const tableRows = rows.map((row: string, idx: number) => {
        const cells = row.split("|").filter((c: string) => c.trim()).map((cell: string) =>
          new TableCell({
            borders,
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: cell.trim(), bold: idx === 0, size: 20, font: "Arial" })],
            })],
          })
        );
        return new TableRow({ children: cells });
      });

      if (tableRows.length > 0) {
        children.push(new Table({ rows: tableRows, width: { size: 9360, type: WidthType.DXA } }));
      }
    } else if (section.type === "list") {
      const items = section.content.split("\n").filter((l: string) => l.trim());
      for (const item of items) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item.replace(/^[-•*]\s*/, "")}`, size: 22, font: "Arial" })],
            spacing: { after: 100 },
            indent: { left: 720 },
          })
        );
      }
    } else {
      // Regular text paragraphs
      const paragraphs = section.content.split("\n\n");
      for (const para of paragraphs) {
        if (para.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: para.trim(), size: 22, font: "Arial" })],
              spacing: { after: 200 },
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// ==================== XLSX GENERATION ====================
async function generateXlsx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }> }
): Promise<Uint8Array> {
  const XLSX = await import("npm:xlsx@0.18.5");

  const workbook = XLSX.utils.book_new();

  for (const section of docContent.sections) {
    const sheetName = section.heading.substring(0, 31); // Excel sheet name limit

    if (section.type === "table" && section.content.includes("|")) {
      const rows = section.content.split("\n").filter((r: string) => r.includes("|") && !r.match(/^[\s|:-]+$/));
      const data = rows.map((row: string) => row.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim()));

      if (data.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(data);
        // Auto-width
        ws["!cols"] = data[0].map((_: string, i: number) => ({
          wch: Math.max(...data.map((r: string[]) => (r[i] || "").length), 10),
        }));
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      }
    } else {
      // Convert content to rows
      const lines = section.content.split("\n").filter((l: string) => l.trim());
      const data = [[section.heading], ...lines.map((l: string) => [l])];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{ wch: 60 }];
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }
  }

  // If no sheets added, create a default one
  if (workbook.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([[docContent.title], ["Conținut generat de Yana"]]);
    XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Uint8Array(buffer);
}

// ==================== PPTX GENERATION ====================
async function generatePptx(
  docContent: { title: string; sections: Array<{ heading: string; content: string; type?: string }> }
): Promise<Uint8Array> {
  const PptxGenJS = (await import("npm:pptxgenjs@3.12.0")).default;

  const pptx = new PptxGenJS();
  pptx.author = "Yana AI";
  pptx.title = docContent.title;

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "1E2761" };
  titleSlide.addText(docContent.title, {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Arial",
    align: "center", valign: "middle",
  });
  titleSlide.addText(`Generat de Yana • ${new Date().toLocaleDateString("ro-RO")}`, {
    x: 0.5, y: 4, w: 9, h: 0.5,
    fontSize: 14, color: "CADCFC", fontFace: "Arial", align: "center",
  });

  // Content slides
  for (const section of docContent.sections) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.8,
      fill: { color: "1E2761" },
    });
    slide.addText(section.heading, {
      x: 0.5, y: 0.1, w: 9, h: 0.6,
      fontSize: 22, bold: true, color: "FFFFFF", fontFace: "Arial",
    });

    // Content
    const contentText = section.content.substring(0, 1500); // Limit per slide
    const lines = contentText.split("\n").filter((l: string) => l.trim());

    if (section.type === "list" || lines.every((l: string) => l.startsWith("-") || l.startsWith("•"))) {
      slide.addText(
        lines.map((l: string) => ({
          text: l.replace(/^[-•*]\s*/, ""),
          options: { fontSize: 16, fontFace: "Arial", color: "333333", bullet: true, breakType: "break" as const },
        })),
        { x: 0.8, y: 1.2, w: 8.4, h: 4, valign: "top" }
      );
    } else {
      slide.addText(contentText, {
        x: 0.5, y: 1.2, w: 9, h: 4.2,
        fontSize: 16, color: "333333", fontFace: "Arial", valign: "top",
        lineSpacingMultiple: 1.3,
      });
    }
  }

  // End slide
  const endSlide = pptx.addSlide();
  endSlide.background = { color: "1E2761" };
  endSlide.addText("Mulțumesc!", {
    x: 0.5, y: 2, w: 9, h: 2,
    fontSize: 44, bold: true, color: "FFFFFF", fontFace: "Arial",
    align: "center", valign: "middle",
  });

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

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(docContent.title, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 10 + 5;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, pageWidth - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 15;

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  for (const section of docContent.sections) {
    // Check page break
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Section heading
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 39, 97); // Brand color
    const headingLines = doc.splitTextToSize(section.heading, contentWidth);
    doc.text(headingLines, margin, y);
    y += headingLines.length * 7 + 5;

    // Section content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5.5;
    }

    y += 8;
  }

  // Footer on each page
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} din ${totalPages} • Generat de Yana AI`, pageWidth / 2, 290, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[DOC-GEN][${requestId}] Request received`);

  try {
    // Auth check
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
    const { documentType, title, description, content, templateType, customData, recipientEmail } = body;

    if (!documentType || !description) {
      return new Response(JSON.stringify({ error: "documentType și description sunt obligatorii" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DOC-GEN][${requestId}] Type: ${documentType}, Template: ${templateType || 'general'}, Title: ${title || 'auto'}`);

    // Step 1: Generate content via AI
    const docContent = content
      ? { title: title || "Document", sections: [{ heading: "Conținut", content, type: "text" }] }
      : await generateDocumentContent(description, documentType, templateType, customData);

    console.log(`[DOC-GEN][${requestId}] AI content generated: ${docContent.sections.length} sections`);

    // Step 2: Generate file
    let fileBuffer: Uint8Array;
    let contentType: string;
    let extension: string;

    switch (documentType) {
      case "docx":
        fileBuffer = await generateDocx(docContent);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;
      case "xlsx":
        fileBuffer = await generateXlsx(docContent);
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

    // Step 3: Upload to Supabase Storage
    const sanitizedTitle = (docContent.title || title || "document").replace(/[^a-zA-Z0-9ăîâșțĂÎÂȘȚ\s-]/g, "_").substring(0, 50);
    const fileName = `${user.id}/${sanitizedTitle}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, fileBuffer, { contentType, upsert: false });

    if (uploadError) {
      console.error(`[DOC-GEN][${requestId}] Upload error:`, uploadError);
      throw new Error(`Eroare la salvare: ${uploadError.message}`);
    }

    // Step 4: Create signed URL (valid 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("generated-documents")
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days

    if (signedUrlError) {
      throw new Error(`Eroare la generare URL: ${signedUrlError.message}`);
    }

    // Step 5: Save metadata to generated_documents table
    await supabase.from("generated_documents").insert({
      user_id: user.id,
      document_type: templateType || documentType,
      document_title: docContent.title || title || "Document generat",
      main_file_path: fileName,
      metadata: {
        generated_by: "yana-office-generator",
        document_format: documentType,
        template_type: templateType,
        file_size_bytes: fileBuffer.length,
        sections_count: docContent.sections.length,
        recipient_email: recipientEmail || null,
      },
    });

    // Step 6: If email requested, send via transactional email
    let emailSent = false;
    if (recipientEmail) {
      try {
        const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "document-delivery",
            recipientEmail,
            idempotencyKey: `doc-delivery-${fileName}`,
            templateData: {
              documentTitle: docContent.title || title,
              documentType: extension.toUpperCase(),
              downloadUrl: signedUrlData.signedUrl,
              expiresIn: "7 zile",
            },
          },
        });

        emailSent = !emailError;
        if (emailError) {
          console.warn(`[DOC-GEN][${requestId}] Email send failed:`, emailError);
        }
      } catch (emailErr) {
        console.warn(`[DOC-GEN][${requestId}] Email service not available:`, emailErr);
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
