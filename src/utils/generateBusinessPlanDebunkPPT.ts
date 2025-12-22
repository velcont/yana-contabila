import pptxgen from "pptxgenjs";

// YANA brand colors
const COLORS = {
  primary: "1E3A5F",      // Navy blue
  accent: "E63946",       // Red for problems
  success: "2A9D8F",      // Green for solutions
  dark: "1D1D1D",
  light: "F8F9FA",
  muted: "6C757D"
};

export async function generateBusinessPlanDebunkPPT(): Promise<void> {
  const pptx = new pptxgen();
  
  pptx.author = "YANA AI";
  pptx.title = "Business planul NU te salvează";
  pptx.subject = "Reclamă YANA Strategică";
  pptx.company = "YANA";
  
  // Slide 1: HOOK - Provocator
  const slide1 = pptx.addSlide();
  slide1.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.dark } });
  
  slide1.addText("Business planul", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 44,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide1.addText("NU te salvează", {
    x: 0.5, y: 2.3, w: 9, h: 1,
    fontSize: 54,
    fontFace: "Arial",
    color: COLORS.accent,
    bold: true
  });
  
  slide1.addText("87% din business planurile nu supraviețuiesc primei crize reale", {
    x: 0.5, y: 3.8, w: 9, h: 0.6,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.muted,
    italic: true
  });
  
  slide1.addText("YANA STRATEGICĂ", {
    x: 7, y: 4.8, w: 2.5, h: 0.4,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.primary,
    bold: true
  });
  
  // Slide 2: PROBLEME - 3 defecte fatale
  const slide2 = pptx.addSlide();
  slide2.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.light } });
  
  slide2.addText("3 defecte fatale ale business planului clasic", {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const problems = [
    { icon: "✗", title: "STATIC", desc: "Odată scris, rămâne în sertar. Nu se actualizează când piața se schimbă." },
    { icon: "✗", title: "NU PREVEDE CRIZE", desc: "Ce faci când clientul mare nu plătește? Când inflația sare la 15%?" },
    { icon: "✗", title: "PDF UITAT", desc: "L-ai făcut pentru bancă sau investitori. Apoi l-ai uitat." }
  ];
  
  problems.forEach((problem, index) => {
    const yPos = 1.6 + (index * 1.2);
    
    slide2.addText(problem.icon, {
      x: 0.5, y: yPos, w: 0.5, h: 0.6,
      fontSize: 28,
      fontFace: "Arial",
      color: COLORS.accent,
      bold: true
    });
    
    slide2.addText(problem.title, {
      x: 1.1, y: yPos, w: 3, h: 0.4,
      fontSize: 22,
      fontFace: "Arial",
      color: COLORS.dark,
      bold: true
    });
    
    slide2.addText(problem.desc, {
      x: 1.1, y: yPos + 0.4, w: 8, h: 0.5,
      fontSize: 16,
      fontFace: "Arial",
      color: COLORS.muted
    });
  });
  
  // Slide 3: CRIZA - Întrebări retorice
  const slide3 = pptx.addSlide();
  slide3.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.dark } });
  
  slide3.addText("Când vine criza...", {
    x: 0.5, y: 0.5, w: 9, h: 0.7,
    fontSize: 36,
    fontFace: "Arial",
    color: COLORS.accent,
    bold: true
  });
  
  slide3.addText("Business planul tău știe să răspundă?", {
    x: 0.5, y: 1.2, w: 9, h: 0.6,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.light
  });
  
  const questions = [
    "❓ Cât mai rezistă firma dacă pierd 30% din vânzări?",
    "❓ Ce cheltuieli tai primele fără să afectez operațiunile?",
    "❓ În câte luni intru în insolvență la scenariul actual?"
  ];
  
  questions.forEach((q, index) => {
    slide3.addText(q, {
      x: 0.5, y: 2.2 + (index * 0.7), w: 9, h: 0.6,
      fontSize: 22,
      fontFace: "Arial",
      color: COLORS.light
    });
  });
  
  slide3.addText("Planul tău tace. YANA răspunde.", {
    x: 0.5, y: 4.5, w: 9, h: 0.6,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.success,
    bold: true,
    italic: true
  });
  
  // Slide 4: SOLUȚIE - YANA Strategică
  const slide4 = pptx.addSlide();
  slide4.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.primary } });
  
  slide4.addText("YANA STRATEGICĂ", {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 42,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide4.addText("Consilierul AI care gândește în timp real", {
    x: 0.5, y: 1.6, w: 9, h: 0.6,
    fontSize: 26,
    fontFace: "Arial",
    color: COLORS.light
  });
  
  slide4.addText("Nu un document. O conversație.", {
    x: 0.5, y: 2.4, w: 9, h: 0.5,
    fontSize: 22,
    fontFace: "Arial",
    color: COLORS.success,
    italic: true
  });
  
  slide4.addText([
    { text: "→ Încarci balanța ta contabilă\n", options: { bullet: false } },
    { text: "→ Întrebi orice, în limbaj natural\n", options: { bullet: false } },
    { text: "→ Primești strategie personalizată instant", options: { bullet: false } }
  ], {
    x: 0.5, y: 3.2, w: 9, h: 1.5,
    fontSize: 22,
    fontFace: "Arial",
    color: COLORS.light,
    lineSpacing: 32
  });
  
  // Slide 5: FEATURES - War Room + Battle Plan
  const slide5 = pptx.addSlide();
  slide5.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.light } });
  
  slide5.addText("2 funcții care îți salvează afacerea", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  // War Room box
  slide5.addShape("roundRect", { 
    x: 0.3, y: 1.2, w: 4.5, h: 2.5, 
    fill: { color: COLORS.primary }, 
    line: { color: COLORS.primary }
  });
  
  slide5.addText("🎮 WAR ROOM", {
    x: 0.5, y: 1.4, w: 4, h: 0.5,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide5.addText("Simulează scenarii ÎNAINTE să se întâmple:\n• Scădere vânzări 20%\n• Creștere costuri 30%\n• Pierdere client major", {
    x: 0.5, y: 2, w: 4, h: 1.5,
    fontSize: 16,
    fontFace: "Arial",
    color: COLORS.light,
    lineSpacing: 22
  });
  
  // Battle Plan box
  slide5.addShape("roundRect", { 
    x: 5.2, y: 1.2, w: 4.5, h: 2.5, 
    fill: { color: COLORS.success }, 
    line: { color: COLORS.success }
  });
  
  slide5.addText("📋 BATTLE PLAN", {
    x: 5.4, y: 1.4, w: 4, h: 0.5,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide5.addText("Export strategie personalizată:\n• PDF profesional\n• Word editabil\n• Gata de implementat", {
    x: 5.4, y: 2, w: 4, h: 1.5,
    fontSize: 16,
    fontFace: "Arial",
    color: COLORS.light,
    lineSpacing: 22
  });
  
  slide5.addText("→ Placeholder pentru screenshots War Room + Battle Plan", {
    x: 0.5, y: 4, w: 9, h: 0.5,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.muted,
    italic: true
  });
  
  // Slide 6: CTA
  const slide6 = pptx.addSlide();
  slide6.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.dark } });
  
  slide6.addText("Încearcă ACUM", {
    x: 0.5, y: 1, w: 9, h: 0.9,
    fontSize: 48,
    fontFace: "Arial",
    color: COLORS.success,
    bold: true
  });
  
  slide6.addText("GRATUIT", {
    x: 0.5, y: 1.9, w: 9, h: 0.8,
    fontSize: 42,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide6.addText("yana.ro/strategic-advisor", {
    x: 0.5, y: 3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.primary,
    bold: true
  });
  
  const benefits = [
    "✓ Primele 5 credite AI gratuite",
    "✓ Fără card, fără obligații",
    "✓ Rezultate în 2 minute"
  ];
  
  benefits.forEach((benefit, index) => {
    slide6.addText(benefit, {
      x: 0.5, y: 3.8 + (index * 0.5), w: 9, h: 0.5,
      fontSize: 20,
      fontFace: "Arial",
      color: COLORS.light
    });
  });
  
  // Download the file
  await pptx.writeFile({ fileName: "YANA_Business_Plan_Debunk.pptx" });
}
