import pptxgen from "pptxgenjs";

export const generateMarketplacePowerPoint = () => {
  const pptx = new pptxgen();

  // Configurare globală
  pptx.author = "YANA - Marketplace";
  pptx.title = "Marketplace YANA - Ghid Complet";
  pptx.subject = "Conectează Antreprenori cu Contabili";

  // Culori YANA
  const primaryGreen = "22C55E";
  const primaryBlue = "3B82F6";
  const darkGray = "1F2937";
  const lightGray = "F3F4F6";

  // ========== SLIDE 1: Titlu General ==========
  const slide1 = pptx.addSlide();
  slide1.background = { color: primaryGreen };
  
  slide1.addText("MARKETPLACE YANA", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.5,
    fontSize: 54,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });

  slide1.addText("Conectează Antreprenori cu Contabili Profesioniști", {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: "FFFFFF",
    align: "center",
  });

  slide1.addText("Platformă Integrată • Verificată • Eficientă", {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.5,
    fontSize: 20,
    color: "F0FDF4",
    align: "center",
    italic: true,
  });

  // ========== PARTEA CONTABILI (3 SLIDE-URI) ==========

  // SLIDE 2: Pentru Contabili - Introducere
  const slide2 = pptx.addSlide();
  slide2.background = { color: "EFF6FF" };
  
  slide2.addText("💼 PENTRU CONTABILI", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 40,
    bold: true,
    color: primaryBlue,
    align: "center",
  });

  slide2.addText("Găsește Clienți Noi și Dezvoltă-ți Portofoliul", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.6,
    fontSize: 24,
    color: darkGray,
    align: "center",
  });

  const accountantBenefits = [
    "✓ Acces la zeci de oportunități noi de clienți",
    "✓ Clienți care TE caută activ pe TINE",
    "✓ Trimite oferte personalizate și relevante",
    "✓ Construiește-ți reputația cu rating și recenzii",
    "✓ Plată transparentă și negociabilă direct cu clientul",
  ];

  accountantBenefits.forEach((benefit, index) => {
    slide2.addText(benefit, {
      x: 1,
      y: 2.5 + index * 0.6,
      w: 8,
      h: 0.5,
      fontSize: 20,
      color: darkGray,
    });
  });

  // SLIDE 3: Cum Răspunzi la Anunțuri
  const slide3 = pptx.addSlide();
  slide3.background = { color: "FFFFFF" };
  
  slide3.addText("📬 CUM TRIMIȚI OFERTE", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: primaryBlue,
    align: "center",
  });

  const offerSteps = [
    {
      title: "1. Browse Anunțuri Active",
      desc: "Vezi cerințele companiilor care caută contabil acum",
    },
    {
      title: "2. Personalizează Oferta",
      desc: "Descrie experiența ta, serviciile oferite și prețul propus",
    },
    {
      title: "3. Adaugă Contact",
      desc: "Email, telefon, WhatsApp - facilitează comunicarea rapidă",
    },
    {
      title: "4. Trimite și Așteaptă",
      desc: "Clientul va primi notificare și te va contacta dacă e interesat",
    },
  ];

  offerSteps.forEach((step, index) => {
    slide3.addText(step.title, {
      x: 1,
      y: 1.8 + index * 1.0,
      w: 8,
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: primaryBlue,
    });

    slide3.addText(step.desc, {
      x: 1.5,
      y: 2.2 + index * 1.0,
      w: 7.5,
      h: 0.4,
      fontSize: 18,
      color: darkGray,
    });
  });

  // SLIDE 4: Construiește Reputația
  const slide4 = pptx.addSlide();
  slide4.background = { color: "EFF6FF" };
  
  slide4.addText("🌟 CONSTRUIEȘTE REPUTAȚIA", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: primaryBlue,
    align: "center",
  });

  const reputationTips = [
    {
      emoji: "🎯",
      title: "Răspunde Prompt",
      desc: "Trimite oferte în maxim 24h - clientul apreciază rapiditatea",
    },
    {
      emoji: "💎",
      title: "Oferte de Calitate",
      desc: "Personalizează fiecare ofertă - arată că înțelegi nevoile specifice",
    },
    {
      emoji: "📈",
      title: "Profil Complet",
      desc: "Completează profilul cu experiența, certificări și specialități",
    },
    {
      emoji: "⭐",
      title: "Colectează Review-uri",
      desc: "Clienții mulțumiți = rating mai bun = mai multe oportunități",
    },
  ];

  reputationTips.forEach((tip, index) => {
    slide4.addText(`${tip.emoji} ${tip.title}`, {
      x: 1,
      y: 1.8 + index * 0.9,
      w: 8,
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: primaryBlue,
    });

    slide4.addText(tip.desc, {
      x: 1.5,
      y: 2.15 + index * 0.9,
      w: 7.5,
      h: 0.4,
      fontSize: 16,
      color: darkGray,
    });
  });

  // ========== PARTEA ANTREPRENORI (4 SLIDE-URI) ==========

  // SLIDE 5: Pentru Antreprenori - Introducere
  const slide5 = pptx.addSlide();
  slide5.background = { color: "F0FDF4" };
  
  slide5.addText("🚀 PENTRU ANTREPRENORI", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 40,
    bold: true,
    color: primaryGreen,
    align: "center",
  });

  slide5.addText("Găsește Contabilul Perfect pentru Afacerea Ta", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.6,
    fontSize: 24,
    color: darkGray,
    align: "center",
  });

  const entrepreneurBenefits = [
    "✓ Postezi GRATUIT cerințele tale specifice",
    "✓ Primești oferte de la contabili verificați",
    "✓ Compari prețuri și servicii într-un singur loc",
    "✓ Chat direct cu candidații potriviți",
    "✓ Economisești timp și bani în căutarea contabilului ideal",
  ];

  entrepreneurBenefits.forEach((benefit, index) => {
    slide5.addText(benefit, {
      x: 1,
      y: 2.5 + index * 0.6,
      w: 8,
      h: 0.5,
      fontSize: 20,
      color: darkGray,
      bullet: false,
    });
  });

  // SLIDE 6: Cum Postezi un Anunț
  const slide6 = pptx.addSlide();
  slide6.background = { color: "FFFFFF" };
  
  slide6.addText("📝 CUM POSTEZI UN ANUNȚ", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: primaryGreen,
    align: "center",
  });

  const postingSteps = [
    {
      title: "1. Completează Detalii",
      desc: "Nume companie, CUI, industrie, nr. angajați",
    },
    {
      title: "2. Descrie Cerințele",
      desc: "Servicii necesare, frecvență, situații speciale",
    },
    {
      title: "3. Setează Bugetul",
      desc: "Indică bugetul lunar pentru servicii contabile",
    },
    {
      title: "4. Preferințe Contact",
      desc: "Alege cum preferi să fii contactat: Email, WhatsApp, Telefon",
    },
  ];

  postingSteps.forEach((step, index) => {
    slide6.addText(step.title, {
      x: 1,
      y: 1.8 + index * 1.0,
      w: 8,
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: primaryGreen,
    });

    slide6.addText(step.desc, {
      x: 1.5,
      y: 2.2 + index * 1.0,
      w: 7.5,
      h: 0.4,
      fontSize: 18,
      color: darkGray,
    });
  });

  // SLIDE 7: Cum Evaluezi Ofertele
  const slide7 = pptx.addSlide();
  slide7.background = { color: "F0FDF4" };
  
  slide7.addText("⭐ CUM EVALUEZI OFERTELE", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: primaryGreen,
    align: "center",
  });

  const evaluationTips = [
    {
      emoji: "💰",
      title: "Compară Prețurile",
      desc: "Vezi oferte de la mai mulți contabili și alege cel mai bun raport calitate-preț",
    },
    {
      emoji: "📊",
      title: "Verifică Experiența",
      desc: "Citește despre expertiza și specialitățile fiecărui contabil",
    },
    {
      emoji: "💬",
      title: "Comunică Direct",
      desc: "Chat integrat pentru clarificări și negocieri rapide",
    },
    {
      emoji: "✅",
      title: "Ia Decizia",
      desc: "Acceptă oferta potrivită și începe colaborarea imediat",
    },
  ];

  evaluationTips.forEach((tip, index) => {
    slide7.addText(`${tip.emoji} ${tip.title}`, {
      x: 1,
      y: 1.8 + index * 0.9,
      w: 8,
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: primaryGreen,
    });

    slide7.addText(tip.desc, {
      x: 1.5,
      y: 2.15 + index * 0.9,
      w: 7.5,
      h: 0.4,
      fontSize: 16,
      color: darkGray,
    });
  });

  // SLIDE 8: Beneficii pentru Antreprenori
  const slide8 = pptx.addSlide();
  slide8.background = { color: "FFFFFF" };
  
  slide8.addText("🎯 DE CE MARKETPLACE YANA?", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: primaryGreen,
    align: "center",
  });

  const whyYana = [
    "⚡ Rapiditate: Primești oferte în maxim 24-48h",
    "🔒 Siguranță: Contabili verificați și cu experiență",
    "💡 Transparență: Vezi toate costurile înainte să te angajezi",
    "🎁 Fără costuri ascunse sau comisioane pentru tine",
    "📱 Totul într-o singură platformă - de la postare la contract",
  ];

  whyYana.forEach((reason, index) => {
    slide8.addText(reason, {
      x: 1,
      y: 2.0 + index * 0.7,
      w: 8,
      h: 0.5,
      fontSize: 20,
      color: darkGray,
    });
  });

  slide8.addText("Începe acum și găsește contabilul perfect! 🚀", {
    x: 0.5,
    y: 5.2,
    w: 9,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: primaryGreen,
    align: "center",
    italic: true,
  });

  // SLIDE 9: Final - Call to Action
  const slide9 = pptx.addSlide();
  slide9.background = { color: darkGray };
  
  slide9.addText("🚀 ÎNCEPE AZI!", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.0,
    fontSize: 48,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });

  slide9.addText("MARKETPLACE YANA", {
    x: 0.5,
    y: 2.8,
    w: 9,
    h: 0.8,
    fontSize: 36,
    color: primaryGreen,
    align: "center",
    bold: true,
  });

  slide9.addText("Conectează. Colaborează. Crește.", {
    x: 0.5,
    y: 3.8,
    w: 9,
    h: 0.6,
    fontSize: 24,
    color: "FFFFFF",
    align: "center",
    italic: true,
  });

  slide9.addText("www.yana-contabila.velcont.com/marketplace", {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: lightGray,
    align: "center",
  });

  // Generare și descărcare
  pptx.writeFile({ fileName: "Marketplace_YANA_Prezentare_Completa.pptx" });
};
