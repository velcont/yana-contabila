import pptxgen from "pptxgenjs";

export const generateYanaPremiumReportPPT = () => {
  const pptx = new pptxgen();
  
  // Metadata
  pptx.author = "YANA - AI Financial Assistant";
  pptx.title = "YANA Raport Premium - Tutorial + Unicitate";
  pptx.subject = "Tutorial & Market Uniqueness Presentation";
  
  // Culori YANA (HSL convertite la HEX pentru pptxgen)
  const YANA_BLUE = "3B82F6"; // Primary entrepreneur blue
  const YANA_DARK = "1E293B"; // Dark text
  const DANGER = "EF4444"; // Red for problems
  const SUCCESS = "10B981"; // Green for benefits
  const LIGHT_BG = "F8FAFC"; // Light background
  const WHITE = "FFFFFF";
  
  // ======== SLIDE 1: Titlu + Acroșaj ========
  const slide1 = pptx.addSlide();
  slide1.background = { fill: YANA_BLUE };
  
  slide1.addText("Cum Funcționează\nRaportul Premium YANA", {
    x: 0.5, y: 1.8, w: 9, h: 1.5,
    fontSize: 44, bold: true, color: WHITE, align: "center",
    fontFace: "Arial"
  });
  
  slide1.addText("Tutorial Complet: De la Balanță la Raport Profesional în 3 Pași", {
    x: 1, y: 3.8, w: 8, h: 0.6,
    fontSize: 20, color: WHITE, align: "center",
    fontFace: "Arial"
  });
  
  slide1.addText("📊 → 💬 → 📄", {
    x: 3, y: 4.8, w: 4, h: 0.8,
    fontSize: 48, color: WHITE, align: "center"
  });
  
  // ======== SLIDE 2: Problema Tradițională ========
  const slide2 = pptx.addSlide();
  slide2.background = { fill: WHITE };
  
  slide2.addText("Ce Fac Ceilalți din Piață? 📊", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  const problemsText = [
    "❌ Încarci balanța → Primești raport static",
    "",
    "❌ Ai întrebări? Trimite email și așteaptă răspuns",
    "",
    "❌ Vrei clarificări? Trebuie să programezi întâlnire",
    "",
    "❌ Zero interacțiune în timp real"
  ];
  
  slide2.addText(problemsText.join("\n"), {
    x: 1, y: 1.8, w: 8, h: 3.5,
    fontSize: 22, color: DANGER,
    fontFace: "Arial",
    lineSpacing: 32
  });
  
  slide2.addShape(pptx.ShapeType.rect, {
    x: 2, y: 5.5, w: 6, h: 0.8,
    fill: { color: DANGER, transparency: 20 }
  });
  
  slide2.addText("Proces Linear: Balanță → Raport → STOP", {
    x: 2, y: 5.55, w: 6, h: 0.7,
    fontSize: 18, bold: true, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 3: Soluția YANA ========
  const slide3 = pptx.addSlide();
  slide3.background = { fill: WHITE };
  
  slide3.addText("Cum Lucrează YANA Diferit? 🚀", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  const solutionText = [
    "✅ AI Conversațional - Vorbești cu YANA ca și cu un contabil",
    "",
    "✅ Analiză LIVE în chat, cu explicații pe loc",
    "",
    "✅ Raport Premium disponibil oricând (bonus)",
    "",
    "✅ Întrebări nelimitate după ce citești raportul"
  ];
  
  slide3.addText(solutionText.join("\n"), {
    x: 1, y: 1.8, w: 8, h: 3,
    fontSize: 22, color: SUCCESS,
    fontFace: "Arial",
    lineSpacing: 32
  });
  
  slide3.addShape(pptx.ShapeType.rect, {
    x: 1.5, y: 5, w: 7, h: 1,
    fill: { color: SUCCESS, transparency: 20 }
  });
  
  slide3.addText("YANA = Conversație Continuă + Raport Premium", {
    x: 1.5, y: 5.1, w: 7, h: 0.8,
    fontSize: 22, bold: true, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  slide3.addText("Proces Circular: Balanță → Chat AI → Raport → Chat AI (ciclu continuu)", {
    x: 1, y: 6.3, w: 8, h: 0.5,
    fontSize: 16, italic: true, color: YANA_BLUE, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 4: Tutorial Pas 1 - Încarcă Balanța ========
  const slide4 = pptx.addSlide();
  slide4.background = { fill: WHITE };
  
  slide4.addText("Pas 1: Încarcă Balanța în Chat AI 📤", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  const step1Text = [
    "📁 Apasă pe iconița de atașament din chat",
    "",
    "📊 Selectează fișierul Excel (.xls/.xlsx)",
    "",
    "⚡ YANA procesează balanța în câteva secunde"
  ];
  
  slide4.addText(step1Text.join("\n"), {
    x: 0.8, y: 1.6, w: 4.5, h: 2.5,
    fontSize: 20, color: YANA_DARK,
    fontFace: "Arial",
    lineSpacing: 28
  });
  
  // Screenshot placeholder
  slide4.addShape(pptx.ShapeType.rect, {
    x: 5.5, y: 1.6, w: 4, h: 3,
    fill: { color: LIGHT_BG },
    line: { color: YANA_BLUE, width: 2 }
  });
  
  slide4.addText("Interfața Chat AI\nButon Upload Vizibil\n\n📸 Screenshot Placeholder", {
    x: 5.5, y: 2.3, w: 4, h: 1.5,
    fontSize: 16, color: YANA_BLUE, align: "center", italic: true,
    fontFace: "Arial"
  });
  
  slide4.addShape(pptx.ShapeType.rect, {
    x: 1.5, y: 5.2, w: 7, h: 0.6,
    fill: { color: YANA_BLUE, transparency: 10 }
  });
  
  slide4.addText("Format acceptat: Excel (.xls/.xlsx) - Max 10MB", {
    x: 1.5, y: 5.25, w: 7, h: 0.5,
    fontSize: 16, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 5: Tutorial Pas 2 - Analiza LIVE ========
  const slide5 = pptx.addSlide();
  slide5.background = { fill: WHITE };
  
  slide5.addText("Pas 2: Primești Analiza LIVE în Chat 💬", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  const step2Text = [
    "🤖 YANA îți răspunde IMEDIAT cu analiza",
    "",
    "📊 Vezi indicatori cheie: DSO, Lichiditate, Cifra de Afaceri",
    "",
    "⚠️ Primești alerte automate pentru probleme",
    "",
    "❓ Poți pune întrebări INSTANT despre orice nu înțelegi"
  ];
  
  slide5.addText(step2Text.join("\n"), {
    x: 0.8, y: 1.6, w: 4.5, h: 3,
    fontSize: 18, color: YANA_DARK,
    fontFace: "Arial",
    lineSpacing: 26
  });
  
  // Screenshot placeholder
  slide5.addShape(pptx.ShapeType.rect, {
    x: 5.5, y: 1.6, w: 4, h: 3.5,
    fill: { color: LIGHT_BG },
    line: { color: SUCCESS, width: 2 }
  });
  
  slide5.addText("Conversație Chat AI\nAnaliza Afișată\nIndicatori Vizibili\n\n📸 Screenshot Placeholder", {
    x: 5.5, y: 2.5, w: 4, h: 1.5,
    fontSize: 16, color: SUCCESS, align: "center", italic: true,
    fontFace: "Arial"
  });
  
  slide5.addShape(pptx.ShapeType.rect, {
    x: 1.5, y: 5.5, w: 7, h: 0.7,
    fill: { color: SUCCESS, transparency: 20 }
  });
  
  slide5.addText("Diferența cheie: Conversația CONTINUĂ!", {
    x: 1.5, y: 5.55, w: 7, h: 0.6,
    fontSize: 20, bold: true, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 6: Tutorial Pas 3 - Raportul Premium ========
  const slide6 = pptx.addSlide();
  slide6.background = { fill: WHITE };
  
  slide6.addText("Pas 3: Generează Raportul Premium (Opțional) 📄", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 32, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  const step3Text = [
    "🏠 Mergi la Dashboard → \"Dosarul Meu\"",
    "",
    "📊 Selectează analiza din listă",
    "",
    "📄 Apasă \"Generează Raport Premium\"",
    "",
    "💾 Descarcă fișierul Word (12-20 pagini)"
  ];
  
  slide6.addText(step3Text.join("\n"), {
    x: 0.8, y: 1.6, w: 4.5, h: 3,
    fontSize: 20, color: YANA_DARK,
    fontFace: "Arial",
    lineSpacing: 28
  });
  
  // Screenshot placeholder
  slide6.addShape(pptx.ShapeType.rect, {
    x: 5.5, y: 1.6, w: 4, h: 3,
    fill: { color: LIGHT_BG },
    line: { color: YANA_BLUE, width: 2 }
  });
  
  slide6.addText("Dashboard YANA\nButon Raport Premium\n\n📸 Screenshot Placeholder", {
    x: 5.5, y: 2.3, w: 4, h: 1.5,
    fontSize: 16, color: YANA_BLUE, align: "center", italic: true,
    fontFace: "Arial"
  });
  
  slide6.addShape(pptx.ShapeType.rect, {
    x: 1, y: 5.2, w: 8, h: 0.8,
    fill: { color: YANA_BLUE, transparency: 10 }
  });
  
  slide6.addText("După ce citești raportul, revii în chat cu întrebări!", {
    x: 1, y: 5.3, w: 8, h: 0.6,
    fontSize: 18, bold: true, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 7: Conținut + Unicitate vs Competiție ========
  const slide7 = pptx.addSlide();
  slide7.background = { fill: WHITE };
  
  slide7.addText("Ce Găsești în Raport + De Ce E YANA Unică? 🌟", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 30, bold: true, color: YANA_DARK,
    fontFace: "Arial"
  });
  
  // Coloană stângă - Conținut Raport
  slide7.addText("Conținut Raport Premium:", {
    x: 0.5, y: 1.3, w: 4.5, h: 0.5,
    fontSize: 18, bold: true, color: YANA_BLUE,
    fontFace: "Arial"
  });
  
  const contentText = [
    "✅ Analiza completă (12-20 pagini)",
    "✅ Grafice și indicatori vizuali",
    "✅ Zone de risc identificate automat",
    "✅ Soluții concrete de optimizare",
    "✅ Checklist lunar de verificări"
  ];
  
  slide7.addText(contentText.join("\n\n"), {
    x: 0.5, y: 2, w: 4.5, h: 3,
    fontSize: 16, color: YANA_DARK,
    fontFace: "Arial",
    lineSpacing: 28
  });
  
  // Coloană dreaptă - YANA vs Competiție
  slide7.addText("YANA vs Competiția:", {
    x: 5.3, y: 1.3, w: 4.5, h: 0.5,
    fontSize: 18, bold: true, color: SUCCESS,
    fontFace: "Arial"
  });
  
  // Tabel comparativ
  const tableData = [
    [
      { text: "Competiția", options: { bold: true, color: DANGER, fontSize: 14 } },
      { text: "YANA", options: { bold: true, color: SUCCESS, fontSize: 14 } }
    ],
    [
      { text: "Raport static → STOP", options: { fontSize: 12 } },
      { text: "Raport + Conversație continuă", options: { fontSize: 12, color: SUCCESS } }
    ],
    [
      { text: "Email pentru întrebări", options: { fontSize: 12 } },
      { text: "Chat AI instant", options: { fontSize: 12, color: SUCCESS } }
    ],
    [
      { text: "O singură analiză", options: { fontSize: 12 } },
      { text: "Întrebări nelimitate", options: { fontSize: 12, color: SUCCESS } }
    ],
    [
      { text: "Zero personalizare", options: { fontSize: 12 } },
      { text: "Recomandări contextualizate", options: { fontSize: 12, color: SUCCESS } }
    ]
  ];
  
  slide7.addTable(tableData, {
    x: 5.3, y: 2, w: 4.5, h: 3,
    border: { pt: 1, color: YANA_BLUE },
    fontFace: "Arial"
  });
  
  // Highlight final
  slide7.addShape(pptx.ShapeType.rect, {
    x: 1, y: 5.5, w: 8, h: 0.8,
    fill: { color: SUCCESS, transparency: 20 }
  });
  
  slide7.addText("YANA = Contabilul tău AI, disponibil 24/7", {
    x: 1, y: 5.55, w: 8, h: 0.7,
    fontSize: 22, bold: true, color: YANA_DARK, align: "center",
    fontFace: "Arial"
  });
  
  // ======== SLIDE 8: Call to Action ========
  const slide8 = pptx.addSlide();
  slide8.background = { fill: YANA_BLUE };
  
  slide8.addText("Încearcă YANA Acum! 🚀", {
    x: 0.5, y: 1, w: 9, h: 0.9,
    fontSize: 44, bold: true, color: WHITE, align: "center",
    fontFace: "Arial"
  });
  
  const ctaText = [
    "🎁 Trial gratuit pentru noii utilizatori",
    "",
    "📊 Încarcă prima balanță și vezi diferența",
    "",
    "💬 Vorbește cu AI-ul ca și cu un contabil real",
    "",
    "📄 Generează primul tău raport premium"
  ];
  
  slide8.addText(ctaText.join("\n"), {
    x: 1.5, y: 2.5, w: 7, h: 2.5,
    fontSize: 20, color: WHITE, align: "center",
    fontFace: "Arial",
    lineSpacing: 32
  });
  
  // Butoane vizuale
  slide8.addShape(pptx.ShapeType.rect, {
    x: 2.5, y: 5.2, w: 2.5, h: 0.6,
    fill: { color: WHITE },
    line: { color: WHITE, width: 2 }
  });
  
  slide8.addText("🌐 Vizitează yana.ro", {
    x: 2.5, y: 5.25, w: 2.5, h: 0.5,
    fontSize: 16, bold: true, color: YANA_BLUE, align: "center",
    fontFace: "Arial"
  });
  
  slide8.addShape(pptx.ShapeType.rect, {
    x: 5.3, y: 5.2, w: 2.5, h: 0.6,
    fill: { color: WHITE },
    line: { color: WHITE, width: 2 }
  });
  
  slide8.addText("📧 Contactează-ne", {
    x: 5.3, y: 5.25, w: 2.5, h: 0.5,
    fontSize: 16, bold: true, color: YANA_BLUE, align: "center",
    fontFace: "Arial"
  });
  
  // Footer
  slide8.addText("YANA - Contabilul tău AI. Conversație. Nu doar rapoarte.", {
    x: 1, y: 6.5, w: 8, h: 0.4,
    fontSize: 16, italic: true, color: WHITE, align: "center",
    fontFace: "Arial"
  });
  
  // Generare fișier
  pptx.writeFile({ fileName: "YANA_Raport_Premium_Tutorial.pptx" });
};
