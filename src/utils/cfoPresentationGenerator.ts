import pptxgen from "pptxgenjs";
import { saveDocumentToLibrary } from "./documentStorage";
import { toast } from "sonner";

export const generateCFOPresentation = async () => {
  const pptx = new pptxgen();
  
  // Configurare dimensiuni și tema
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Yana AI";
  pptx.title = "CFO Dashboard Yana - Prezentare Beneficii";
  
  // Definire culori tema Yana (în format hex fără #)
  const colors = {
    primary: "3B82F6",
    success: "10B981",
    critical: "EF4444",
    background: "F9FAFB",
    text: "1F2937",
    white: "FFFFFF",
    lightGray: "E5E7EB"
  };
  
  // ============================================
  // SLIDE 1 - COVER
  // ============================================
  const slide1 = pptx.addSlide();
  slide1.background = { color: colors.primary };
  
  slide1.addText("CFO Dashboard Yana", {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 54, bold: true, color: colors.white,
    align: "center", fontFace: "Arial"
  });
  
  slide1.addText("8 motive pentru care administratorii inteligenți aleg Yana", {
    x: 0.5, y: 3.8, w: 9, h: 0.8,
    fontSize: 24, color: colors.white,
    align: "center", fontFace: "Arial"
  });
  
  slide1.addText("Powered by Yana AI | app.yana.ro", {
    x: 0.5, y: 5.2, w: 9, h: 0.4,
    fontSize: 16, color: colors.white,
    align: "center", fontFace: "Arial", italic: true
  });
  
  // ============================================
  // SLIDE 2 - RUNWAY ÎN TIMP REAL
  // ============================================
  const slide2 = pptx.addSlide();
  slide2.background = { color: colors.white };
  
  slide2.addText("⏱️", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide2.addText("Runway în Timp Real", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide2.addText("Știi EXACT câte luni ai până rămâi fără cash", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets2 = [
    { text: "Dashboard vizual cu runway în luni și zile", options: {} },
    { text: "Alertă automată sub 3 luni → \"CRITIC\"", options: {} },
    { text: "Data exactă când ajungi la 0 lei în bancă", options: {} },
    { text: "Status color-coded: Critical/Warning/Healthy", options: {} }
  ];
  
  slide2.addText(bullets2, {
    x: 0.8, y: 2.3, w: 8, h: 2.5,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 7.5, y: 0.5, w: 2, h: 0.6,
    fill: { color: colors.success },
    line: { type: "none" }
  });
  
  slide2.addText("✅ GRATUIT", {
    x: 7.5, y: 0.5, w: 2, h: 0.6,
    fontSize: 18, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 3 - DASHBOARD 100% GRATUIT
  // ============================================
  const slide3 = pptx.addSlide();
  slide3.background = { color: colors.white };
  
  slide3.addText("💰", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide3.addText("Dashboard 100% GRATUIT", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide3.addText("Dashboard-ul de bază e complet GRATUIT", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets3 = [
    { text: "Cash disponibil (Sold Bancă + Casă)", options: {} },
    { text: "Grafic istoric cash flow", options: {} },
    { text: "Alerte financiare automate", options: {} },
    { text: "Indicatori DSO, DPO, profit, revenue", options: {} }
  ];
  
  slide3.addText(bullets3, {
    x: 0.8, y: 2.3, w: 8, h: 2.5,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: 7.2, y: 0.5, w: 2.3, h: 0.7,
    fill: { color: colors.success },
    line: { type: "none" }
  });
  
  slide3.addText("✅ 0 LEI", {
    x: 7.2, y: 0.5, w: 2.3, h: 0.7,
    fontSize: 24, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 4 - ALERTE LEGALE AUTOMATE
  // ============================================
  const slide4 = pptx.addSlide();
  slide4.background = { color: colors.white };
  
  slide4.addText("⚖️", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide4.addText("Alerte Legale Automate", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide4.addText("Evită amenzile ANAF cu verificări automate", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets4 = [
    { text: "Alertă sold casă > 50.000 lei (ILEGAL în RO)", options: {} },
    { text: "DSO > 90 zile → bani blocați în creanțe", options: {} },
    { text: "Runway < 3 luni → risc faliment", options: {} },
    { text: "DPO ridicat → presiune furnizori", options: {} }
  ];
  
  slide4.addText(bullets4, {
    x: 0.8, y: 2.3, w: 8, h: 2,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide4.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 4.5, w: 8.4, h: 0.7,
    fill: { color: colors.critical },
    line: { type: "none" }
  });
  
  slide4.addText("⚠️ EXEMPLU: Sold casă 65.000 lei → Amendă 5.000-10.000 lei ANAF", {
    x: 0.8, y: 4.5, w: 8.4, h: 0.7,
    fontSize: 18, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 5 - SIMULĂRI WHAT-IF
  // ============================================
  const slide5 = pptx.addSlide();
  slide5.background = { color: colors.white };
  
  slide5.addText("🎯", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide5.addText("Simulări What-If", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide5.addText("Testează scenarii ÎNAINTE să iei decizii", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets5 = [
    { text: "Simulează angajări noi (nr. angajați + salariu mediu)", options: {} },
    { text: "Previzionează creșteri de vânzări (+% revenue)", options: {} },
    { text: "Impactul automat asupra runway-ului", options: {} },
    { text: "Recomandări AI personalizate", options: {} }
  ];
  
  slide5.addText(bullets5, {
    x: 0.8, y: 2.3, w: 8, h: 2.5,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide5.addShape(pptx.ShapeType.roundRect, {
    x: 6.5, y: 5, w: 3, h: 0.6,
    fill: { color: colors.primary },
    line: { type: "none" }
  });
  
  slide5.addText("💳 0.25 lei/simulare", {
    x: 6.5, y: 5, w: 3, h: 0.6,
    fontSize: 18, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 6 - AI CFO CHAT
  // ============================================
  const slide6 = pptx.addSlide();
  slide6.background = { color: colors.white };
  
  slide6.addText("🤖", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide6.addText("AI CFO Chat 24/7", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide6.addText("Un CFO AI disponibil non-stop la 0.85 lei/întrebare", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets6 = [
    { text: "Răspunsuri instant la întrebări financiare complexe", options: {} },
    { text: "Context automat din bilanțurile tale", options: {} },
    { text: "Istorie conversațională (își amintește discuția)", options: {} },
    { text: "Comparativ: Consultant uman = 300-500 lei/oră", options: {} }
  ];
  
  slide6.addText(bullets6, {
    x: 0.8, y: 2.3, w: 8, h: 2,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide6.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 4.5, w: 8.4, h: 1.2,
    fill: { color: colors.lightGray },
    line: { width: 2, color: colors.primary }
  });
  
  slide6.addText("📋 EXEMPLE ÎNTREBĂRI:", {
    x: 0.9, y: 4.6, w: 8.2, h: 0.3,
    fontSize: 16, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide6.addText("• \"Pot să angajez 2 oameni cu salariu 5.000 lei?\"\n• \"Cum reduc DSO-ul de la 120 la 60 de zile?\"", {
    x: 0.9, y: 5, w: 8.2, h: 0.6,
    fontSize: 16, color: colors.text,
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 7 - FORECAST 90 DE ZILE
  // ============================================
  const slide7 = pptx.addSlide();
  slide7.background = { color: colors.white };
  
  slide7.addText("📈", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide7.addText("Forecast Cash Flow 90 de zile", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide7.addText("Previziuni precise pe 3 luni", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets7 = [
    { text: "Grafic interactiv cu trendul cash-ului", options: {} },
    { text: "Linia critică (20% din cash curent)", options: {} },
    { text: "Identifică exact când intri în zona roșie", options: {} },
    { text: "Proiecții bazate pe revenue/expenses reali", options: {} }
  ];
  
  slide7.addText(bullets7, {
    x: 0.8, y: 2.3, w: 8, h: 2.5,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide7.addShape(pptx.ShapeType.roundRect, {
    x: 5.8, y: 5, w: 3.7, h: 0.6,
    fill: { color: colors.success },
    line: { type: "none" }
  });
  
  slide7.addText("✅ Inclus GRATUIT în dashboard", {
    x: 5.8, y: 5, w: 3.7, h: 0.6,
    fontSize: 16, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 8 - MULTI-COMPANY SUPPORT
  // ============================================
  const slide8 = pptx.addSlide();
  slide8.background = { color: colors.white };
  
  slide8.addText("🏢", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide8.addText("Gestionare Multi-Companii", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide8.addText("Toate firmele tale dintr-un singur loc", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets8 = [
    { text: "Selector companii în header", options: {} },
    { text: "Dashboard separat pentru fiecare firmă", options: {} },
    { text: "Comparații între firme (coming soon)", options: {} },
    { text: "Ideal pentru administratori cu portofoliu", options: {} }
  ];
  
  slide8.addText(bullets8, {
    x: 0.8, y: 2.3, w: 8, h: 2,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide8.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 4.5, w: 8.4, h: 0.7,
    fill: { color: colors.primary },
    line: { type: "none" }
  });
  
  slide8.addText("💡 USE CASE: Ai 3 SRL-uri? Vezi runway-ul tuturor instant!", {
    x: 0.8, y: 4.5, w: 8.4, h: 0.7,
    fontSize: 18, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 9 - SNAPSHOT FINANCIAR INSTANT
  // ============================================
  const slide9 = pptx.addSlide();
  slide9.background = { color: colors.white };
  
  slide9.addText("⚡", {
    x: 0.5, y: 0.5, w: 1, h: 1,
    fontSize: 60
  });
  
  slide9.addText("Snapshot Financiar în 3 Secunde", {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 40, bold: true, color: colors.text,
    fontFace: "Arial"
  });
  
  slide9.addText("Situația completă fără să ceri rapoarte contabilului", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 22, color: colors.text,
    fontFace: "Arial", italic: true
  });
  
  const bullets9 = [
    { text: "Cash disponibil total (Bancă + Casă)", options: {} },
    { text: "Revenue anual și profit net", options: {} },
    { text: "DSO (cât durează până încasezi de la clienți)", options: {} },
    { text: "DPO (cât durează până plătești furnizorilor)", options: {} }
  ];
  
  slide9.addText(bullets9, {
    x: 0.8, y: 2.3, w: 8, h: 2.5,
    fontSize: 20, color: colors.text,
    bullet: { code: "2022" },
    fontFace: "Arial"
  });
  
  slide9.addShape(pptx.ShapeType.roundRect, {
    x: 7.5, y: 0.5, w: 2, h: 0.6,
    fill: { color: colors.success },
    line: { type: "none" }
  });
  
  slide9.addText("✅ INSTANT", {
    x: 7.5, y: 0.5, w: 2, h: 0.6,
    fontSize: 18, bold: true, color: colors.white,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  // ============================================
  // SLIDE 10 - TABEL COMPARATIV
  // ============================================
  const slide10 = pptx.addSlide();
  slide10.background = { color: colors.white };
  
  slide10.addText("Comparație: Yana vs Alternative", {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 36, bold: true, color: colors.text,
    align: "center", fontFace: "Arial"
  });
  
  const tableRows = [
    [
      { text: "Criteriu", options: { bold: true, fill: { color: colors.lightGray }, fontSize: 16 } },
      { text: "Excel Manual", options: { bold: true, fill: { color: colors.lightGray }, fontSize: 16 } },
      { text: "CFO Consultant", options: { bold: true, fill: { color: colors.lightGray }, fontSize: 16 } },
      { text: "✅ Yana Dashboard", options: { bold: true, fill: { color: colors.success }, color: colors.white, fontSize: 16 } }
    ],
    [
      { text: "Cost lunar", options: { bold: true, fontSize: 15 } },
      { text: "0 lei", options: { fontSize: 15 } },
      { text: "3.000-5.000 lei", options: { fontSize: 15 } },
      { text: "0-2 lei", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ],
    [
      { text: "Timp setup", options: { bold: true, fontSize: 15 } },
      { text: "2-4 ore/lună", options: { fontSize: 15 } },
      { text: "1-2 săptămâni", options: { fontSize: 15 } },
      { text: "30 secunde", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ],
    [
      { text: "Actualizare", options: { bold: true, fontSize: 15 } },
      { text: "Manual", options: { fontSize: 15 } },
      { text: "La cerere", options: { fontSize: 15 } },
      { text: "⚡ Timp real", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ],
    [
      { text: "Alerte automate", options: { bold: true, fontSize: 15 } },
      { text: "❌ Nu", options: { fontSize: 15 } },
      { text: "❌ Nu", options: { fontSize: 15 } },
      { text: "✅ Da", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ],
    [
      { text: "AI insights", options: { bold: true, fontSize: 15 } },
      { text: "❌ Nu", options: { fontSize: 15 } },
      { text: "❌ Nu", options: { fontSize: 15 } },
      { text: "✅ Da", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ],
    [
      { text: "Disponibilitate", options: { bold: true, fontSize: 15 } },
      { text: "Program birou", options: { fontSize: 15 } },
      { text: "Program birou", options: { fontSize: 15 } },
      { text: "🕐 24/7", options: { fill: { color: "E0F2FE" }, fontSize: 15 } }
    ]
  ];
  
  slide10.addTable(tableRows, {
    x: 0.5, y: 1.5, w: 9, h: 3.8,
    border: { pt: 1, color: colors.lightGray },
    fontFace: "Arial",
    align: "center",
    valign: "middle"
  });
  
  // ============================================
  // SLIDE 11 - CALL TO ACTION
  // ============================================
  const slide11 = pptx.addSlide();
  slide11.background = { color: colors.primary };
  
  slide11.addText("Începe GRATUIT astăzi!", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 48, bold: true, color: colors.white,
    align: "center", fontFace: "Arial"
  });
  
  slide11.addText("Dashboard-ul CFO e deja activat în contul tău Yana", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 22, color: colors.white,
    align: "center", fontFace: "Arial"
  });
  
  slide11.addShape(pptx.ShapeType.roundRect, {
    x: 2, y: 3.3, w: 6, h: 1.5,
    fill: { color: colors.white },
    line: { type: "none" }
  });
  
  slide11.addText("🌐 app.yana.ro/strategic-advisor", {
    x: 2, y: 3.4, w: 6, h: 0.5,
    fontSize: 24, bold: true, color: colors.primary,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  slide11.addText("📧 support@yana.ro", {
    x: 2, y: 3.9, w: 6, h: 0.4,
    fontSize: 20, color: colors.text,
    align: "center", valign: "middle",
    fontFace: "Arial"
  });
  
  slide11.addText("Fără card, fără abonament - Doar înregistrare gratuită", {
    x: 0.5, y: 5.1, w: 9, h: 0.4,
    fontSize: 18, color: colors.white,
    align: "center", fontFace: "Arial", italic: true
  });
  
  // Generare și descărcare fișier
  const fileName = "CFO_Dashboard_Yana_Prezentare.pptx";
  await pptx.writeFile({ fileName });
  
  // Save to library
  try {
    const blob = await pptx.write({ outputType: "blob" }) as Blob;
    await saveDocumentToLibrary({
      documentType: "cfo_presentation",
      documentTitle: "CFO Dashboard Yana - Prezentare Beneficii",
      mainFileBlob: blob,
      mainFileExtension: "pptx",
      metadata: {
        slides: 11,
        version: "synthesia_ready"
      }
    });
    toast.success("Prezentare salvată în biblioteca ta!");
  } catch (error) {
    console.error("Error saving to library:", error);
    toast.error("Prezentarea a fost descărcată, dar nu a putut fi salvată în bibliotecă");
  }
  
  return fileName;
};
