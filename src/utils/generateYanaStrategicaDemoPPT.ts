import pptxgen from "pptxgenjs";

/**
 * Generates a PowerPoint presentation for Yana Strategică YouTube Demo
 * 12 slides with TechServ SRL case study, Synthesia texts, and screenshot placeholders
 */
export const generateYanaStrategicaDemoPPT = async (): Promise<void> => {
  const pptx = new pptxgen();
  
  // Metadata
  pptx.author = "YANA Strategică";
  pptx.title = "Demo Yana Strategică - TechServ SRL";
  pptx.subject = "Video Demo YouTube - Caz Practic cu Texte Synthesia";
  pptx.company = "YANA - Your AI Navigator for Accounting";
  
  // YANA Brand Colors
  const COLORS = {
    YANA_BLUE: "3B82F6",
    YANA_DARK: "1E293B",
    WHITE: "FFFFFF",
    SUCCESS: "10B981",
    DANGER: "EF4444",
    WARNING: "F59E0B",
    MUTED: "94A3B8",
    PLACEHOLDER_BG: "F1F5F9"
  };

  // =====================
  // SLIDE 1 - COVER
  // =====================
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLORS.YANA_BLUE };
  
  slide1.addText("YANA STRATEGICĂ", {
    x: 0.5, y: 1.5, w: "90%", h: 1,
    fontSize: 48, bold: true, color: COLORS.WHITE,
    align: "center"
  });
  
  slide1.addText("Demo Complet - Cazul TechServ SRL", {
    x: 0.5, y: 2.7, w: "90%", h: 0.6,
    fontSize: 28, color: COLORS.WHITE,
    align: "center"
  });
  
  slide1.addText("Cum AI-ul îți salvează afacerea de criza de cash", {
    x: 0.5, y: 3.5, w: "90%", h: 0.5,
    fontSize: 20, italic: true, color: COLORS.WHITE,
    align: "center"
  });
  
  slide1.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 4.5, w: "90%", h: 0.4,
    fontSize: 14, bold: true, color: COLORS.WHITE
  });
  
  slide1.addText(
    "\"Bună! Sunt Yana, asistentul tău strategic cu inteligență artificială. " +
    "În următoarele minute, îți voi arăta cum poți transforma o criză de cash " +
    "într-o oportunitate de restructurare. Urmărește cazul lui Mihai, fondatorul TechServ SRL.\"",
    {
      x: 0.5, y: 4.9, w: "90%", h: 0.8,
      fontSize: 12, italic: true, color: COLORS.WHITE,
      align: "left"
    }
  );
  
  slide1.addNotes(
    "COVER SLIDE\n\n" +
    "Text Synthesia (copy-paste):\n" +
    "\"Bună! Sunt Yana, asistentul tău strategic cu inteligență artificială. " +
    "În următoarele minute, îți voi arăta cum poți transforma o criză de cash " +
    "într-o oportunitate de restructurare. Urmărește cazul lui Mihai, fondatorul TechServ SRL.\"\n\n" +
    "Durată: ~10 secunde"
  );

  // =====================
  // SLIDE 2 - ACCESARE
  // =====================
  const slide2 = pptx.addSlide();
  
  slide2.addText("Pas 1: Accesezi Yana Strategică", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  // Placeholder pentru screenshot
  slide2.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.MUTED, dashType: "dash", width: 2 }
  });
  
  slide2.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide2.addText("Screenshot: Pagina /strategic-advisor goală, înainte de prima întrebare", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide2.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide2.addText(
    "\"Mihai accesează Yana Strategică din meniul aplicației. " +
    "Interfața este simplă: o zonă de chat în stânga și un panou lateral pentru datele validate.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.5,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide2.addNotes(
    "PAS 1 - ACCESARE\n\n" +
    "Screenshot necesar:\n" +
    "- Pagina /strategic-advisor complet goală\n" +
    "- Sidebar vizibil dar gol\n" +
    "- Input chat vizibil jos\n\n" +
    "Text Synthesia:\n" +
    "\"Mihai accesează Yana Strategică din meniul aplicației. " +
    "Interfața este simplă: o zonă de chat în stânga și un panou lateral pentru datele validate.\"\n\n" +
    "Durată: ~8 secunde"
  );

  // =====================
  // SLIDE 3 - PRIMA ÎNTREBARE
  // =====================
  const slide3 = pptx.addSlide();
  
  slide3.addText("Pas 2: Mihai Descrie Problema", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  // Placeholder
  slide3.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 3.5,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.MUTED, dashType: "dash", width: 2 }
  });
  
  slide3.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.3, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide3.addText("Screenshot: Input-ul completat cu mesajul lui Mihai (înainte de Send)", {
    x: 0.5, y: 2.9, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  // Mesajul exact
  slide3.addText("💬 Mesajul lui Mihai:", {
    x: 0.5, y: 4.6, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_BLUE
  });
  
  slide3.addText(
    "\"Bună! Am o firmă de servicii IT cu 8 angajați, cifră de afaceri 1.2 milioane lei/an, " +
    "profit net de 180.000 lei. Dar am o problemă: cash-ul disponibil e doar 45.000 lei " +
    "și am de plătit salarii de 65.000 lei luna viitoare. Ce fac?\"",
    {
      x: 0.5, y: 4.9, w: "90%", h: 0.7,
      fontSize: 10, color: COLORS.YANA_DARK,
      fill: { color: "EFF6FF" }
    }
  );
  
  slide3.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.65, w: "90%", h: 0.25,
    fontSize: 11, bold: true, color: COLORS.YANA_DARK
  });
  
  slide3.addText(
    "\"Mihai scrie problema lui în limbaj natural. Nu are nevoie de rapoarte sau fișiere Excel. " +
    "Doar descrie situația așa cum i-ar spune unui consultant.\"",
    {
      x: 0.5, y: 5.9, w: "90%", h: 0.4,
      fontSize: 10, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide3.addNotes(
    "PAS 2 - PRIMA ÎNTREBARE\n\n" +
    "Screenshot necesar:\n" +
    "- Input chat completat cu mesajul (nu trimis încă)\n" +
    "- Mesajul vizibil în textarea\n\n" +
    "Mesajul exact de scris în chat:\n" +
    "\"Bună! Am o firmă de servicii IT cu 8 angajați, cifră de afaceri 1.2 milioane lei/an, " +
    "profit net de 180.000 lei. Dar am o problemă: cash-ul disponibil e doar 45.000 lei " +
    "și am de plătit salarii de 65.000 lei luna viitoare. Ce fac?\"\n\n" +
    "Text Synthesia:\n" +
    "\"Mihai scrie problema lui în limbaj natural. Nu are nevoie de rapoarte sau fișiere Excel. " +
    "Doar descrie situația așa cum i-ar spune unui consultant.\"\n\n" +
    "Durată: ~12 secunde"
  );

  // =====================
  // SLIDE 4 - RĂSPUNS AI
  // =====================
  const slide4 = pptx.addSlide();
  
  slide4.addText("Yana Analizează Instant", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide4.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.SUCCESS, dashType: "dash", width: 2 }
  });
  
  slide4.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide4.addText("Screenshot: Răspunsul complet al AI-ului cu diagnostic + opțiuni", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide4.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide4.addText(
    "\"În câteva secunde, Yana identifică problema: un gap de cash de 20.000 lei. " +
    "Dar nu se oprește aici - oferă instant 3 opțiuni strategice concrete, " +
    "fiecare cu avantaje și riscuri clar explicate.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide4.addNotes(
    "PAS 3 - RĂSPUNS AI\n\n" +
    "Screenshot necesar:\n" +
    "- Răspunsul complet al AI-ului vizibil\n" +
    "- Scroll dacă e necesar pentru a vedea tot\n" +
    "- Highlight pe diagnostic și opțiuni\n\n" +
    "Text Synthesia:\n" +
    "\"În câteva secunde, Yana identifică problema: un gap de cash de 20.000 lei. " +
    "Dar nu se oprește aici - oferă instant 3 opțiuni strategice concrete, " +
    "fiecare cu avantaje și riscuri clar explicate.\"\n\n" +
    "Durată: ~15 secunde"
  );

  // =====================
  // SLIDE 5 - SIDEBAR DATE VALIDATE
  // =====================
  const slide5 = pptx.addSlide();
  
  slide5.addText("Datele Tale - Validate Automat", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide5.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.YANA_BLUE, dashType: "dash", width: 2 }
  });
  
  slide5.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide5.addText("Screenshot: Sidebar cu datele validate (💰 Financiar, 👥 Companie, etc.)", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide5.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide5.addText(
    "\"Observă panoul din dreapta - Yana a extras automat toate datele financiare " +
    "din conversație și le-a organizat pe categorii. Cifra de afaceri, profit, cash disponibil, " +
    "număr angajați - toate sunt acum validate și gata pentru analize avansate.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide5.addNotes(
    "PAS 4 - SIDEBAR DATE\n\n" +
    "Screenshot necesar:\n" +
    "- Focus pe sidebar-ul din dreapta\n" +
    "- Toate categoriile vizibile: 💰 Financiar, 👥 Companie\n" +
    "- Valorile populate automat din conversație\n\n" +
    "Text Synthesia:\n" +
    "\"Observă panoul din dreapta - Yana a extras automat toate datele financiare " +
    "din conversație și le-a organizat pe categorii. Cifra de afaceri, profit, cash disponibil, " +
    "număr angajați - toate sunt acum validate și gata pentru analize avansate.\"\n\n" +
    "Durată: ~12 secunde"
  );

  // =====================
  // SLIDE 6 - STRATEGIE DETALIATĂ
  // =====================
  const slide6 = pptx.addSlide();
  
  slide6.addText("Strategia Personalizată", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide6.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.SUCCESS, dashType: "dash", width: 2 }
  });
  
  slide6.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide6.addText("Screenshot: Al doilea răspuns AI cu detalii strategie aleasă", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide6.addText("💬 Follow-up de trimis:", {
    x: 0.5, y: 4.6, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_BLUE
  });
  
  slide6.addText(
    "\"Opțiunea 2 sună bine - negocierea termenelor. Dar am un client mare care datorează 85.000 lei " +
    "de 45 de zile. Cum procedez exact?\"",
    {
      x: 0.5, y: 4.9, w: "90%", h: 0.5,
      fontSize: 10, color: COLORS.YANA_DARK,
      fill: { color: "EFF6FF" }
    }
  );
  
  slide6.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.45, w: "90%", h: 0.25,
    fontSize: 11, bold: true, color: COLORS.YANA_DARK
  });
  
  slide6.addText(
    "\"Mihai alege să aprofundeze opțiunea de negociere. Yana oferă acum un plan detaliat " +
    "pas cu pas pentru recuperarea creanțelor.\"",
    {
      x: 0.5, y: 5.7, w: "90%", h: 0.4,
      fontSize: 10, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide6.addNotes(
    "PAS 5 - STRATEGIE DETALIATĂ\n\n" +
    "Screenshot necesar:\n" +
    "- Răspunsul detaliat despre negocierea creanțelor\n" +
    "- Pași concreți vizibili\n\n" +
    "Follow-up de trimis:\n" +
    "\"Opțiunea 2 sună bine - negocierea termenelor. Dar am un client mare care datorează 85.000 lei " +
    "de 45 de zile. Cum procedez exact?\"\n\n" +
    "Text Synthesia:\n" +
    "\"Mihai alege să aprofundeze opțiunea de negociere. Yana oferă acum un plan detaliat " +
    "pas cu pas pentru recuperarea creanțelor.\"\n\n" +
    "Durată: ~10 secunde"
  );

  // =====================
  // SLIDE 7 - WAR ROOM DESCHIDERE
  // =====================
  const slide7 = pptx.addSlide();
  slide7.background = { color: "FEF3C7" }; // Warning yellow background
  
  slide7.addText("⚔️ War Room - Simulează Scenarii", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide7.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.WARNING, dashType: "dash", width: 3 }
  });
  
  slide7.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide7.addText("Screenshot: Interfața War Room cu slidere și scenarii predefinite", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide7.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide7.addText(
    "\"Dar ce se întâmplă dacă clientul nu plătește? Aici intervine War Room-ul. " +
    "Mihai poate simula scenarii de criză - pierderea unui client major, recesiune, " +
    "creșterea costurilor - și vede instant impactul asupra afacerii.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "FFFBEB" }
    }
  );
  
  slide7.addNotes(
    "PAS 6 - WAR ROOM\n\n" +
    "Screenshot necesar:\n" +
    "- War Room deschis (din meniul 3-dots → War Room Simulator)\n" +
    "- Slidere vizibile pentru ajustare date\n" +
    "- Butoane scenarii: Criză Cash, Pierdere Client, Recesiune, Inflație\n\n" +
    "Text Synthesia:\n" +
    "\"Dar ce se întâmplă dacă clientul nu plătește? Aici intervine War Room-ul. " +
    "Mihai poate simula scenarii de criză - pierderea unui client major, recesiune, " +
    "creșterea costurilor - și vede instant impactul asupra afacerii.\"\n\n" +
    "Durată: ~15 secunde"
  );

  // =====================
  // SLIDE 8 - SIMULARE REZULTATE
  // =====================
  const slide8 = pptx.addSlide();
  
  slide8.addText("🔴 Rezultatul Simulării: Criză Cash", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.DANGER
  });
  
  slide8.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.DANGER, dashType: "solid", width: 3 }
  });
  
  slide8.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide8.addText("Screenshot: Rezultatul simulării cu border roșu și măsuri de urgență", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide8.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide8.addText(
    "\"Simularea arată: dacă clientul nu plătește, runway-ul scade la 2 luni. " +
    "Dar Yana nu te lasă fără soluții - oferă instant 5 măsuri de urgență, " +
    "de la reducerea cheltuielilor la renegocierea cu furnizorii.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "FEF2F2" }
    }
  );
  
  slide8.addNotes(
    "PAS 7 - SIMULARE REZULTATE\n\n" +
    "Screenshot necesar:\n" +
    "- Rezultatul simulării afișat (border roșu distinct)\n" +
    "- Mesajul prefixat cu [SIMULATION_RESULT]\n" +
    "- Măsuri de urgență listate\n" +
    "- Runway estimat vizibil\n\n" +
    "Text Synthesia:\n" +
    "\"Simularea arată: dacă clientul nu plătește, runway-ul scade la 2 luni. " +
    "Dar Yana nu te lasă fără soluții - oferă instant 5 măsuri de urgență, " +
    "de la reducerea cheltuielilor la renegocierea cu furnizorii.\"\n\n" +
    "Durată: ~12 secunde"
  );

  // =====================
  // SLIDE 9 - BATTLE PLAN EXPORT
  // =====================
  const slide9 = pptx.addSlide();
  
  slide9.addText("📋 Exportă Planul de Acțiune", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide9.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.YANA_BLUE, dashType: "dash", width: 2 }
  });
  
  slide9.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide9.addText("Screenshot: Meniul 3-dots deschis cu opțiunea \"Exportă Battle Plan\"", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide9.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide9.addText(
    "\"După ce conversația a acumulat suficient context, Mihai poate exporta " +
    "întreaga strategie într-un Battle Plan PDF profesional - gata de implementat " +
    "sau de prezentat echipei și investitorilor.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide9.addNotes(
    "PAS 8 - BATTLE PLAN EXPORT\n\n" +
    "Screenshot necesar:\n" +
    "- Click pe butonul 3-dots (MoreVertical) din header\n" +
    "- Meniu dropdown deschis\n" +
    "- Opțiunea \"Exportă Battle Plan\" vizibilă și evidențiată\n\n" +
    "Text Synthesia:\n" +
    "\"După ce conversația a acumulat suficient context, Mihai poate exporta " +
    "întreaga strategie într-un Battle Plan PDF profesional - gata de implementat " +
    "sau de prezentat echipei și investitorilor.\"\n\n" +
    "Durată: ~10 secunde"
  );

  // =====================
  // SLIDE 10 - PDF GENERAT
  // =====================
  const slide10 = pptx.addSlide();
  
  slide10.addText("📄 Raportul Tău - Gata de Implementat", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide10.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.SUCCESS, dashType: "dash", width: 2 }
  });
  
  slide10.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide10.addText("Screenshot: PDF-ul Battle Plan deschis (cover page sau health check)", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide10.addText("📋 Conținut PDF:", {
    x: 0.5, y: 4.6, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.SUCCESS
  });
  
  slide10.addText(
    "• Cover Page CONFIDENTIAL  • Financial Health Check  • Critical Vulnerabilities  • 90-Day Execution Plan",
    {
      x: 0.5, y: 4.9, w: "90%", h: 0.4,
      fontSize: 10, color: COLORS.YANA_DARK,
      fill: { color: "ECFDF5" }
    }
  );
  
  slide10.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.35, w: "90%", h: 0.25,
    fontSize: 11, bold: true, color: COLORS.YANA_DARK
  });
  
  slide10.addText(
    "\"PDF-ul generat conține tot ce-i trebuie lui Mihai: o analiză de sănătate financiară, " +
    "vulnerabilitățile critice identificate, și un plan de acțiune pe 90 de zile cu deadline-uri precise.\"",
    {
      x: 0.5, y: 5.6, w: "90%", h: 0.5,
      fontSize: 10, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide10.addNotes(
    "PAS 9 - PDF BATTLE PLAN\n\n" +
    "Screenshot necesar:\n" +
    "- PDF-ul Battle Plan deschis în browser/viewer\n" +
    "- Cover page sau Financial Health Check vizibil\n" +
    "- Datele companiei TechServ vizibile\n\n" +
    "Text Synthesia:\n" +
    "\"PDF-ul generat conține tot ce-i trebuie lui Mihai: o analiză de sănătate financiară, " +
    "vulnerabilitățile critice identificate, și un plan de acțiune pe 90 de zile cu deadline-uri precise.\"\n\n" +
    "Durată: ~12 secunde"
  );

  // =====================
  // SLIDE 11 - ISTORIC CONVERSAȚII
  // =====================
  const slide11 = pptx.addSlide();
  
  slide11.addText("📂 Revino Oricând la Strategiile Tale", {
    x: 0.5, y: 0.3, w: "90%", h: 0.6,
    fontSize: 32, bold: true, color: COLORS.YANA_DARK
  });
  
  slide11.addShape("rect", {
    x: 0.5, y: 1, w: 9, h: 4,
    fill: { color: COLORS.PLACEHOLDER_BG },
    line: { color: COLORS.YANA_BLUE, dashType: "dash", width: 2 }
  });
  
  slide11.addText("📷 INSEREAZĂ CAPTURĂ AICI", {
    x: 0.5, y: 2.5, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide11.addText("Screenshot: Sheet lateral \"Istoric Conversații\" deschis cu lista conversațiilor", {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 12, italic: true, color: COLORS.MUTED,
    align: "center"
  });
  
  slide11.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 5.1, w: "90%", h: 0.3,
    fontSize: 12, bold: true, color: COLORS.YANA_DARK
  });
  
  slide11.addText(
    "\"Toate conversațiile sunt salvate automat. Peste o lună, Mihai poate reveni, " +
    "vedea ce strategie a implementat, și cere actualizări bazate pe noile rezultate. " +
    "E ca și cum ai un consultant disponibil 24/7.\"",
    {
      x: 0.5, y: 5.4, w: "90%", h: 0.6,
      fontSize: 11, italic: true, color: COLORS.YANA_DARK,
      fill: { color: "F8FAFC" }
    }
  );
  
  slide11.addNotes(
    "PAS 10 - ISTORIC CONVERSAȚII (FEATURE NOU!)\n\n" +
    "Screenshot necesar:\n" +
    "- Click pe 3-dots → Istoric Conversații\n" +
    "- Sheet lateral deschis din stânga\n" +
    "- Lista conversațiilor anterioare vizibilă\n" +
    "- Conversația curentă evidențiată\n\n" +
    "Text Synthesia:\n" +
    "\"Toate conversațiile sunt salvate automat. Peste o lună, Mihai poate reveni, " +
    "vedea ce strategie a implementat, și cere actualizări bazate pe noile rezultate. " +
    "E ca și cum ai un consultant disponibil 24/7.\"\n\n" +
    "Durată: ~12 secunde"
  );

  // =====================
  // SLIDE 12 - CALL TO ACTION
  // =====================
  const slide12 = pptx.addSlide();
  slide12.background = { color: COLORS.YANA_BLUE };
  
  slide12.addText("🚀 Începe Acum!", {
    x: 0.5, y: 1.5, w: "90%", h: 0.8,
    fontSize: 48, bold: true, color: COLORS.WHITE,
    align: "center"
  });
  
  slide12.addText("yana.ro", {
    x: 0.5, y: 2.5, w: "90%", h: 0.6,
    fontSize: 36, color: COLORS.WHITE,
    align: "center"
  });
  
  slide12.addText("✓ Trial gratuit  ✓ Fără card de credit  ✓ Setup în 2 minute", {
    x: 0.5, y: 3.3, w: "90%", h: 0.5,
    fontSize: 18, color: COLORS.WHITE,
    align: "center"
  });
  
  slide12.addText("🎙️ TEXT SYNTHESIA:", {
    x: 0.5, y: 4.5, w: "90%", h: 0.4,
    fontSize: 14, bold: true, color: COLORS.WHITE
  });
  
  slide12.addText(
    "\"Mihai și-a salvat afacerea. Tu ce aștepți? Încearcă Yana Strategică gratuit " +
    "și descoperă cum AI-ul poate transforma provocările tale în oportunități. " +
    "Ne vedem în aplicație!\"",
    {
      x: 0.5, y: 4.9, w: "90%", h: 0.8,
      fontSize: 12, italic: true, color: COLORS.WHITE,
      align: "left"
    }
  );
  
  slide12.addNotes(
    "SLIDE FINAL - CALL TO ACTION\n\n" +
    "Nu e nevoie de screenshot\n\n" +
    "Text Synthesia (final):\n" +
    "\"Mihai și-a salvat afacerea. Tu ce aștepți? Încearcă Yana Strategică gratuit " +
    "și descoperă cum AI-ul poate transforma provocările tale în oportunități. " +
    "Ne vedem în aplicație!\"\n\n" +
    "Durată: ~10 secunde\n\n" +
    "TOTAL VIDEO ESTIMAT: ~2 minute"
  );

  // Generate and download
  await pptx.writeFile({ fileName: "YANA_Strategica_Demo_TechServ.pptx" });
};
