import pptxgen from "pptxgenjs";

// YANA brand colors
const COLORS = {
  primary: "1E3A5F",      // Navy blue
  accent: "E63946",       // Red for alerts
  success: "2A9D8F",      // Green for solutions
  gold: "D4AF37",         // Gold accent
  dark: "1D1D1D",
  light: "F8F9FA",
  muted: "6C757D"
};

export async function generateFiscalTaxPPT(): Promise<void> {
  const pptx = new pptxgen();
  
  pptx.author = "YANA AI";
  pptx.title = "Impozitul Special pe Bunuri de Valoare Mare";
  pptx.subject = "Formular 216 - Educație + YANA Fiscală";
  pptx.company = "YANA";
  
  // ==========================================
  // SLIDE 1: EDUCATIV - Ce este acest impozit?
  // ==========================================
  const slide1 = pptx.addSlide();
  slide1.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.light } });
  
  slide1.addText("Impozitul Special pe Bunuri de Lux", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.primary,
    bold: true
  });
  
  slide1.addText("Ce trebuie să știi în 2025", {
    x: 0.5, y: 1.1, w: 9, h: 0.5,
    fontSize: 22,
    fontFace: "Arial",
    color: COLORS.muted,
    italic: true
  });
  
  // Info boxes
  const infoItems = [
    { icon: "🏠", title: "Clădiri rezidențiale", value: "> 2.500.000 RON" },
    { icon: "🚗", title: "Autoturisme", value: "> 375.000 RON" },
    { icon: "📊", title: "Cotă impozit", value: "0,3% din diferență" },
    { icon: "📋", title: "Formular", value: "216 la ANAF" }
  ];
  
  infoItems.forEach((item, index) => {
    const xPos = 0.5 + (index % 2) * 4.5;
    const yPos = 1.9 + Math.floor(index / 2) * 1.3;
    
    slide1.addShape("roundRect", {
      x: xPos, y: yPos, w: 4.2, h: 1.1,
      fill: { color: "FFFFFF" },
      line: { color: COLORS.primary, width: 1 },
      shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.2 }
    });
    
    slide1.addText(item.icon, {
      x: xPos + 0.2, y: yPos + 0.15, w: 0.6, h: 0.6,
      fontSize: 28
    });
    
    slide1.addText(item.title, {
      x: xPos + 0.9, y: yPos + 0.15, w: 3, h: 0.4,
      fontSize: 14,
      fontFace: "Arial",
      color: COLORS.muted
    });
    
    slide1.addText(item.value, {
      x: xPos + 0.9, y: yPos + 0.55, w: 3, h: 0.4,
      fontSize: 18,
      fontFace: "Arial",
      color: COLORS.primary,
      bold: true
    });
  });
  
  slide1.addText("Termen depunere: 31 Decembrie 2025", {
    x: 0.5, y: 4.6, w: 9, h: 0.4,
    fontSize: 18,
    fontFace: "Arial",
    color: COLORS.accent,
    bold: true
  });
  
  // Speaker notes for avatar
  slide1.addNotes(`AVATAR TEXT SLIDE 1:

Din 2025, avem un impozit nou.

Se aplică bunurilor de valoare mare.
Clădiri peste 2,5 milioane de lei.
Autoturisme peste 375.000 de lei.

Impozitul este 0,3% din diferență.
Și trebuie declarat la ANAF.
Formularul 216.

Termenul limită?
31 decembrie 2025.`);
  
  // ==========================================
  // SLIDE 2: EDUCATIV - Calculul pentru autoturisme
  // ==========================================
  const slide2 = pptx.addSlide();
  slide2.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.dark } });
  
  slide2.addText("Cum se calculează pentru autoturisme?", {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 30,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  // Two columns: PF vs PJ
  slide2.addShape("roundRect", {
    x: 0.3, y: 1.3, w: 4.4, h: 2.6,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary }
  });
  
  slide2.addText("👤 Persoană Fizică", {
    x: 0.5, y: 1.45, w: 4, h: 0.5,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide2.addText("• Valoare de calcul = preț + TVA\n• TVA-ul NU se recuperează\n• Include TVA din factură\n• Exemplu: 400.000 RON cu tot cu TVA", {
    x: 0.5, y: 2, w: 4, h: 1.8,
    fontSize: 15,
    fontFace: "Arial",
    color: COLORS.light,
    lineSpacing: 24
  });
  
  slide2.addShape("roundRect", {
    x: 5.3, y: 1.3, w: 4.4, h: 2.6,
    fill: { color: COLORS.success },
    line: { color: COLORS.success }
  });
  
  slide2.addText("🏢 Persoană Juridică (platitor TVA)", {
    x: 5.5, y: 1.45, w: 4, h: 0.5,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide2.addText("• Valoare de calcul = FĂRĂ TVA\n• TVA-ul SE recuperează\n• Doar costul de achiziție\n• Exemplu: 336.000 RON (fără TVA)", {
    x: 5.5, y: 2, w: 4, h: 1.8,
    fontSize: 15,
    fontFace: "Arial",
    color: COLORS.light,
    lineSpacing: 24
  });
  
  // Important note
  slide2.addShape("roundRect", {
    x: 0.3, y: 4.1, w: 9.4, h: 0.9,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent }
  });
  
  slide2.addText("⚠️ Impozitul se datorează 5 ANI de la data achiziției!", {
    x: 0.5, y: 4.25, w: 9, h: 0.6,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide2.addNotes(`AVATAR TEXT SLIDE 2:

Cum se calculează?
Depinde cine ești.

Persoană fizică.
Iei prețul CU TVA.
Pentru că TVA-ul nu îl recuperezi.

Persoană juridică plătitoare de TVA.
Iei prețul FĂRĂ TVA.
Pentru că îl deduci.

Atenție.
Acest impozit se plătește 5 ani.
De la data când ai devenit proprietar.

Nu contează că l-ai cumpărat anul trecut.
Sau acum 2 ani.
Tot trebuie declarat.`);
  
  // ==========================================
  // SLIDE 3: TRANZIȚIE - Întrebări retorice
  // ==========================================
  const slide3 = pptx.addSlide();
  slide3.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.light } });
  
  slide3.addText("Și acum...", {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.muted,
    italic: true
  });
  
  slide3.addText("câte declarații fiscale ții minte?", {
    x: 0.5, y: 1, w: 9, h: 0.7,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const questions = [
    "❓ Știai de formularul 216?",
    "❓ Știi dacă trebuie să-l depui?",
    "❓ Cum afli ce se mai schimbă în legislație?",
    "❓ Unde cauți când ANAF nu răspunde?"
  ];
  
  questions.forEach((q, index) => {
    slide3.addText(q, {
      x: 0.5, y: 2 + (index * 0.65), w: 9, h: 0.6,
      fontSize: 22,
      fontFace: "Arial",
      color: COLORS.primary
    });
  });
  
  slide3.addText("Legislația se schimbă constant.\nCine te ține la curent?", {
    x: 0.5, y: 4.5, w: 9, h: 0.7,
    fontSize: 18,
    fontFace: "Arial",
    color: COLORS.accent,
    italic: true
  });
  
  slide3.addNotes(`AVATAR TEXT SLIDE 3:

Și acum, sincer.

Câte declarații fiscale ții minte?

Știai de formularul 216?
Înainte de acest video?

Știi dacă trebuie să-l depui tu?

Legislația se schimbă mereu.
OUG-uri noi. Modificări. Excepții.

Unde cauți când ai o întrebare?
Și ANAF nu răspunde?

Sau răspunde... într-o lună.`);
  
  // ==========================================
  // SLIDE 4: SOLUȚIE - YANA Fiscală
  // ==========================================
  const slide4 = pptx.addSlide();
  slide4.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.primary } });
  
  slide4.addText("YANA Fiscală", {
    x: 0.5, y: 0.7, w: 9, h: 0.9,
    fontSize: 48,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  slide4.addText("Asistentul AI pentru legislația fiscală românească", {
    x: 0.5, y: 1.6, w: 9, h: 0.6,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.gold
  });
  
  slide4.addText("Întrebi în limbaj natural. Primești răspuns cu surse oficiale.", {
    x: 0.5, y: 2.4, w: 9, h: 0.5,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
  
  const features = [
    "✓ Răspunsuri bazate pe legislația actualizată ANAF",
    "✓ Disponibil 24/7, fără așteptare",
    "✓ Explicații pe înțelesul tuturor, fără jargon",
    "✓ Surse oficiale citate în fiecare răspuns"
  ];
  
  features.forEach((feature, index) => {
    slide4.addText(feature, {
      x: 0.5, y: 3.2 + (index * 0.55), w: 9, h: 0.5,
      fontSize: 20,
      fontFace: "Arial",
      color: COLORS.light
    });
  });
  
  slide4.addNotes(`AVATAR TEXT SLIDE 4:

Există o soluție.

YANA Fiscală.
Un asistent AI pentru legislație.

Întrebi ce vrei.
În limbaj normal.
Fără termeni juridici.

Și primești răspuns.
Cu surse oficiale.
Din legislația actualizată.

Disponibil oricând.
Fără să suni la ANAF.
Fără să aștepți o săptămână.`);
  
  // ==========================================
  // SLIDE 5: FUNCȚIONALITĂȚI - Butonul Legislație Fiscală
  // ==========================================
  const slide5 = pptx.addSlide();
  slide5.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.light } });
  
  slide5.addText("Cum funcționează?", {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  // Step by step
  const steps = [
    { num: "1", title: "Intri în Chat AI", desc: "Pe app.yana.ro, secțiunea Chat AI" },
    { num: "2", title: "Apeși 'Legislație Fiscală'", desc: "Buton dedicat pentru întrebări fiscale" },
    { num: "3", title: "Întrebi orice", desc: "Ex: 'Trebuie să depun formularul 216?'" },
    { num: "4", title: "Primești răspuns instant", desc: "Cu explicații clare și surse ANAF" }
  ];
  
  steps.forEach((step, index) => {
    const yPos = 1.2 + (index * 0.9);
    
    slide5.addShape("ellipse", {
      x: 0.5, y: yPos, w: 0.6, h: 0.6,
      fill: { color: COLORS.primary }
    });
    
    slide5.addText(step.num, {
      x: 0.5, y: yPos + 0.05, w: 0.6, h: 0.5,
      fontSize: 20,
      fontFace: "Arial",
      color: COLORS.light,
      bold: true,
      align: "center"
    });
    
    slide5.addText(step.title, {
      x: 1.3, y: yPos, w: 4, h: 0.4,
      fontSize: 20,
      fontFace: "Arial",
      color: COLORS.dark,
      bold: true
    });
    
    slide5.addText(step.desc, {
      x: 1.3, y: yPos + 0.4, w: 6, h: 0.4,
      fontSize: 16,
      fontFace: "Arial",
      color: COLORS.muted
    });
  });
  
  // Placeholder for screenshot
  slide5.addShape("rect", {
    x: 6.5, y: 1.2, w: 3, h: 3.5,
    fill: { color: "E8E8E8" },
    line: { color: COLORS.muted, dashType: "dash" }
  });
  
  slide5.addText("📷 Screenshot\nButon Legislație Fiscală", {
    x: 6.5, y: 2.5, w: 3, h: 1,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.muted,
    align: "center",
    italic: true
  });
  
  slide5.addNotes(`AVATAR TEXT SLIDE 5:

Cum funcționează exact?

Intri pe app.yana.ro.
În secțiunea Chat AI.

Apeși pe butonul "Legislație Fiscală".

Și întrebi ce vrei.
"Trebuie să depun formularul 216?"
"Cât e impozitul pentru mașina mea?"

Primești răspuns instant.
Cu explicații clare.
Cu surse oficiale.

Fără căutat prin PDF-uri.
Fără sunat la ANAF.`);
  
  // ==========================================
  // SLIDE 6: CTA - Încearcă gratuit
  // ==========================================
  const slide6 = pptx.addSlide();
  slide6.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.dark } });
  
  slide6.addText("Încearcă ACUM", {
    x: 0.5, y: 0.9, w: 9, h: 0.9,
    fontSize: 48,
    fontFace: "Arial",
    color: COLORS.success,
    bold: true
  });
  
  slide6.addText("GRATUIT", {
    x: 0.5, y: 1.8, w: 9, h: 0.8,
    fontSize: 42,
    fontFace: "Arial",
    color: COLORS.gold,
    bold: true
  });
  
  slide6.addText("app.yana.ro", {
    x: 0.5, y: 2.8, w: 9, h: 0.6,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.light,
    bold: true
  });
  
  const benefits = [
    "✓ 5 credite AI gratuite",
    "✓ Fără card, fără obligații",
    "✓ Răspunsuri în 2 minute",
    "✓ Legislație fiscală actualizată"
  ];
  
  benefits.forEach((benefit, index) => {
    slide6.addText(benefit, {
      x: 0.5, y: 3.6 + (index * 0.5), w: 9, h: 0.5,
      fontSize: 20,
      fontFace: "Arial",
      color: COLORS.light
    });
  });
  
  slide6.addText("YANA FISCALĂ", {
    x: 7, y: 4.8, w: 2.5, h: 0.4,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.primary,
    bold: true
  });
  
  slide6.addNotes(`AVATAR TEXT SLIDE 6:

Vrei să încerci?

Intră pe app.yana.ro

Primele 5 credite sunt gratuite.
Fără card.
Fără obligații.

Întreabă despre formularul 216.
Sau orice altceva din legislație.

Primești răspuns în 2 minute.
Cu surse oficiale.

YANA Fiscală.
Legislația fiscală, simplificată.`);
  
  // Download the file
  await pptx.writeFile({ fileName: "YANA_Impozit_Special_Lux.pptx" });
}
