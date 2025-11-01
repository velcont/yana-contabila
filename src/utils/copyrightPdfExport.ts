export const generateCopyrightPDF = async () => {
  // Dynamic import to reduce initial bundle size
  const { default: jsPDF } = await import('jspdf');
  
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add page break if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(7);
      pdf.text(line, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 3;
  };

  // Page 1: Cover Page
  pdf.setFillColor(139, 92, 246); // Purple color
  pdf.rect(0, 0, pageWidth, 80, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('YANA', pageWidth / 2, 35, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.text('Analiza Balantei', pageWidth / 2, 50, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Documentatie pentru Inregistrarea', pageWidth / 2, 65, { align: 'center' });
  pdf.text('Drepturilor de Autor', pageWidth / 2, 75, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
  yPosition = 100;

  // Document information
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Informatii Document', margin, yPosition);
  yPosition += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const today = new Date().toLocaleDateString('ro-RO');
  pdf.text(`Data: ${today}`, margin, yPosition);
  yPosition += 7;
  pdf.text('Tip: Aplicatie Web (Software as a Service)', margin, yPosition);
  yPosition += 7;
  pdf.text('Autor/Proprietar: [Nume Companie/Dezvoltator]', margin, yPosition);
  yPosition += 15;

  // Executive Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rezumat Executiv', margin, yPosition);
  yPosition += 10;

  addWrappedText(
    'YANA (Your Advanced Numerical Analyst) este o aplicatie web avansata de analiza financiara, ' +
    'bazata pe inteligenta artificiala, destinata antreprenorilor si contabililor din Romania. ' +
    'Platforma ofera analize financiare detaliate, rapoarte personalizate si recomandari actionabile ' +
    'pentru imbunatatirea sanatatii financiare a companiilor.'
  );

  // Page 2: Detailed Description
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1. Descrierea Aplicatiei', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(13);
  pdf.text('1.1 Scop si Obiective', margin, yPosition);
  yPosition += 8;

  addWrappedText(
    'Aplicatia YANA a fost dezvoltata pentru a automatiza si simplifica procesul de analiza financiara, ' +
    'oferind acces rapid la informatii critice despre sanatatea financiara a unei companii. ' +
    'Prin utilizarea algoritmilor de inteligenta artificiala, platforma identifica tendinte, ' +
    'riscuri si oportunitati care altfel ar necesita ore de analiza manuala.'
  );

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1.2 Utilizatori Tinta', margin, yPosition);
  yPosition += 8;

  addWrappedText('• Antreprenori: Proprietari de IMM-uri care doresc sa-si monitorizeze sanatatea financiara');
  addWrappedText('• Contabili: Profesionisti care gestioneaza multiple companii si necesita instrumente eficiente');
  addWrappedText('• Manageri financiari: Specialisti careiau decizii strategice bazate pe date');

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1.3 Propunere Unica de Valoare', margin, yPosition);
  yPosition += 8;

  addWrappedText(
    '• Analiza instantanee: Rezultate in sub 2 secunde (vs. ore de analiza manuala)\n' +
    '• Interfata conversationala: Chat AI in limba romana pentru intrebari financiare complexe\n' +
    '• Interfata vocala: Prima analiza financiara in Romania care poate fi operata vocal\n' +
    '• Predictii AI: Algoritmi care anticipeaza probleme financiare inainte sa apara\n' +
    '• Dashboard live: Vizualizari interactive, nu rapoarte statice'
  );

  // Page 3: Features
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2. Functionalitati Principale', margin, yPosition);
  yPosition += 12;

  const features = [
    {
      title: '2.1 Analiza Automata a Balantei',
      description: 'Utilizatorii incarca fisiere Excel cu balantele contabile. Sistemul proceseaza automat datele si genereaza rapoarte detaliate cu: indicatori cheie de performanta (lichiditate, solvabilitate, profitabilitate), alerte critice pentru probleme potentiale, recomandari actionabile pentru imbunatatiri.'
    },
    {
      title: '2.2 Chat AI Conversational',
      description: 'Asistent virtual inteligent care raspunde la intrebari despre situatia financiara in limba romana naturala. Capabil sa explice concepte financiare complexe, sa compare perioade diferite si sa ofere contextualizari personalizate.'
    },
    {
      title: '2.3 Interfata Vocala (Voice Interface)',
      description: 'Prima platforma de analiza financiara din Romania cu functionalitate vocala completa. Utilizatorii pot interactiona cu aplicatia folosind comenzi vocale, ideal pentru situatii in care nu este posibila introducerea manuala.'
    },
    {
      title: '2.4 Dashboard Interactiv',
      description: 'Vizualizari grafice in timp real: grafice de evolutie, comparatii multi-perioada, heatmaps pentru identificarea rapida a problemelor, widget-uri customizabile.'
    },
    {
      title: '2.5 Sistem Multi-Companii',
      description: 'Antreprenorii pot gestiona multiple firme, iar contabilii pot administra portofolii intregi de clienti. Comparatii intre companii, raportare centralizata si gestionare avansata a accesului.'
    },
    {
      title: '2.6 Predictii si Alerte Proactive',
      description: 'Algoritmi de machine learning care: anticipeaza probleme de cashflow, identifica tendinte negative inainte sa devina critice, recomanda actiuni preventive.'
    },
    {
      title: '2.7 CRM Integrat pentru Contabili',
      description: 'Modul dedicat pentru contabili care include: gestionarea clientilor si comunicare, trimiterea de rapoarte automate, tracking-ul taskurilor si deadline-urilor fiscale.'
    }
  ];

  features.forEach(feature => {
    checkPageBreak(25);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(feature.title, margin, yPosition);
    yPosition += 8;
    addWrappedText(feature.description);
    yPosition += 5;
  });

  // Page 4: Technical Architecture
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('3. Arhitectura Tehnica', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(13);
  pdf.text('3.1 Stack Tehnologic', margin, yPosition);
  yPosition += 10;

  const techStack = [
    { category: 'Frontend', tech: 'React 18.3, TypeScript, Vite, TailwindCSS' },
    { category: 'Backend', tech: 'Supabase (PostgreSQL, Edge Functions, Realtime)' },
    { category: 'AI/ML', tech: 'OpenAI GPT-4, Google Gemini, Realtime Voice API' },
    { category: 'Autentificare', tech: 'Supabase Auth (Email, Google OAuth)' },
    { category: 'Storage', tech: 'Supabase Storage cu buckets securizate' },
    { category: 'UI Components', tech: 'Radix UI, Shadcn/ui, Recharts' },
    { category: 'Payments', tech: 'Stripe (pentru subscriptii)' },
    { category: 'Monitoring', tech: 'Sentry (error tracking)' }
  ];

  techStack.forEach(item => {
    checkPageBreak(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${item.category}:`, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.tech, margin + 45, yPosition);
    yPosition += 7;
  });

  yPosition += 8;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('3.2 Securitate si Protectia Datelor', margin, yPosition);
  yPosition += 8;

  addWrappedText(
    '• Row Level Security (RLS): Fiecare utilizator are acces doar la propriile date\n' +
    '• Criptare end-to-end: Toate datele sunt criptate in tranzit si in repaus\n' +
    '• Autentificare multi-factor: Suport pentru 2FA\n' +
    '• Backup automat: Backup zilnic al bazei de date\n' +
    '• GDPR compliant: Respecta toate reglementarile europene de protectie a datelor'
  );

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('3.3 Scalabilitate', margin, yPosition);
  yPosition += 8;

  addWrappedText(
    'Arhitectura serverless permite scalare automata in functie de trafic. ' +
    'Edge Functions se scaleaza automat, iar baza de date PostgreSQL suporta milioane de inregistrari. ' +
    'CDN global pentru viteze de incarcare rapide in orice locatie.'
  );

  // Page 5: User Flow
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('4. Fluxul Utilizatorului', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(13);
  pdf.text('4.1 Fluxul pentru Antreprenori', margin, yPosition);
  yPosition += 10;

  const entrepreneurFlow = [
    '1. Inregistrare si Autentificare: Email sau Google OAuth',
    '2. Selectare Tip Cont: Antreprenor sau Contabil',
    '3. Adaugare Companie: Introducere detalii firma (CUI, nume, etc.)',
    '4. Upload Balanta: Incarcare fisier Excel cu balanta contabila',
    '5. Analiza Automata: AI proceseaza datele in <2 secunde',
    '6. Vizualizare Rezultate: Dashboard cu grafice, indicatori, alerte',
    '7. Interactiune Chat: Intrebari in limba romana despre analiza',
    '8. Export Raport: Descarca PDF cu analiza completa'
  ];

  entrepreneurFlow.forEach(step => {
    checkPageBreak(10);
    addWrappedText(step);
  });

  yPosition += 5;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('4.2 Fluxul pentru Contabili', margin, yPosition);
  yPosition += 10;

  const accountantFlow = [
    '1. Inregistrare ca Contabil: Selectare tip cont Contabil',
    '2. Adaugare Clienti: Invitare clienti prin email',
    '3. Gestionare Portofoliu: Vizualizare toate companiile clientilor',
    '4. Setare Parametri Fiscali: Configurare TVA, impozit, etc.',
    '5. Monitorizare Centralizata: Dashboard cu toti clientii',
    '6. Rapoarte Automate: Trimitere rapoarte periodice catre clienti',
    '7. CRM Integrat: Comunicare si task management'
  ];

  accountantFlow.forEach(step => {
    checkPageBreak(10);
    addWrappedText(step);
  });

  // Page 6: Innovation & Differentiation
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('5. Inovatie si Diferentiere', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(13);
  pdf.text('5.1 Elemente Inovatoare', margin, yPosition);
  yPosition += 10;

  const innovations = [
    {
      title: 'Prima interfata vocala pentru analiza financiara in Romania',
      desc: 'Utilizatorii pot vorbi cu aplicatia si primi raspunsuri vocale'
    },
    {
      title: 'AI conversational in limba romana',
      desc: 'Chat care intelege contextul financiar romanesc (TVA, D394, etc.)'
    },
    {
      title: 'Analiza predictiva',
      desc: 'Machine learning pentru anticiparea problemelor financiare'
    },
    {
      title: 'Dashboard live vs rapoarte statice',
      desc: 'Vizualizari interactive, nu PDF-uri statice'
    }
  ];

  innovations.forEach(item => {
    checkPageBreak(15);
    pdf.setFont('helvetica', 'bold');
    addWrappedText(`• ${item.title}`, 11, true);
    pdf.setFont('helvetica', 'normal');
    addWrappedText(`  ${item.desc}`, 10);
    yPosition += 3;
  });

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('5.2 Avantaje Competitive', margin, yPosition);
  yPosition += 10;

  addWrappedText(
    '• Timp de raspuns: <2 secunde vs. ore pentru analiza manuala\n' +
    '• Acuratete: AI reduce erorile umane\n' +
    '• Accesibilitate: Interfata simpla pentru non-specialisti\n' +
    '• Scalabilitate: Un contabil poate gestiona 10x mai multi clienti\n' +
    '• Cost: Fractiune din costul unui consultant financiar'
  );

  // Page 7: Business Model
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('6. Model de Business', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(13);
  pdf.text('6.1 Planuri de Subscriptie', margin, yPosition);
  yPosition += 10;

  const plans = [
    { name: 'Gratuit (Trial)', features: '30 zile gratuite, functionalitati de baza' },
    { name: 'Antreprenor Basic', features: '1 companie, analize nelimitate, chat AI' },
    { name: 'Antreprenor Pro', features: 'Multiple companii, predictii AI, suport prioritar' },
    { name: 'Contabil Professional', features: 'Clienti nelimitati, CRM, white-label, API access' }
  ];

  plans.forEach(plan => {
    checkPageBreak(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`• ${plan.name}`, margin, yPosition);
    yPosition += 7;
    pdf.setFont('helvetica', 'normal');
    addWrappedText(`  ${plan.features}`, 10);
  });

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('6.2 Modele de Monetizare', margin, yPosition);
  yPosition += 10;

  addWrappedText(
    '• Subscriptii recurente (MRR - Monthly Recurring Revenue)\n' +
    '• Upgrade-uri la planuri superioare\n' +
    '• Add-ons: Integrari custom, API access, rapoarte personalizate\n' +
    '• White-label pentru firme de contabilitate mari'
  );

  // Page 8: Code Sample (Optional)
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('7. Mostre de Cod Reprezentative', margin, yPosition);
  yPosition += 12;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'italic');
  addWrappedText(
    'Nota: Urmatoarele fragmente de cod demonstreaza originalitatea implementarii si ' +
    'sunt incluse ca exemplu al complexitatii tehnice a aplicatiei.'
  );

  yPosition += 5;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('7.1 Fragment - Analiza AI cu Rate Limiting', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(9);
  pdf.setFont('courier', 'normal');
  const codeSnippet1 = `// Edge Function pentru analiza balantei cu AI
const analyzeBalance = async (balanceData: ExcelData) => {
  // Rate limiting per user
  const rateLimitKey = \`analysis:\${userId}:\${Date.now()}\`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts > 10) throw new Error('Rate limit exceeded');
  
  // AI prompt construction
  const prompt = buildFinancialPrompt(balanceData);
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.3 // Lower for financial accuracy
  });
  
  return parseAIResponse(response);
};`;

  const codeLines1 = codeSnippet1.split('\n');
  codeLines1.forEach(line => {
    checkPageBreak(5);
    pdf.text(line, margin, yPosition);
    yPosition += 4;
  });

  yPosition += 8;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('7.2 Fragment - Row Level Security Policy', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(9);
  pdf.setFont('courier', 'normal');
  const codeSnippet2 = `-- RLS Policy: Utilizatorii vad doar propriile companii
CREATE POLICY "Users see only own companies"
ON public.companies FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = managed_by_accountant_id
);

-- RLS Policy: Contabilii pot gestiona companiile clientilor
CREATE POLICY "Accountants manage client companies"
ON public.companies FOR UPDATE
USING (auth.uid() = managed_by_accountant_id);`;

  const codeLines2 = codeSnippet2.split('\n');
  codeLines2.forEach(line => {
    checkPageBreak(5);
    pdf.text(line, margin, yPosition);
    yPosition += 4;
  });

  // Page 9: Conclusion
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('8. Concluzie', margin, yPosition);
  yPosition += 12;

  addWrappedText(
    'YANA reprezinta o solutie inovatoare si completa pentru analiza financiara automatizata, ' +
    'destinata pietei romanesti. Prin combinarea inteligenței artificiale avansate cu o interfata ' +
    'intuitiva si functionalitati unice (voice interface, chat conversational in romana), ' +
    'aplicatia ofera o valoare semnificativa atat pentru antreprenori cat si pentru contabili.'
  );

  addWrappedText(
    'Arhitectura tehnica robusta, securitatea avansata si scalabilitatea asigura ca platforma ' +
    'poate creste odata cu nevoile utilizatorilor, de la startup-uri mici pana la firme de ' +
    'contabilitate cu sute de clienti.'
  );

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('8.1 Declaratie de Originalitate', margin, yPosition);
  yPosition += 10;

  addWrappedText(
    'Subsemnatul declar ca aplicatia YANA - Analiza Balantei este o lucrare originala, ' +
    'dezvoltata independent, si ca toate componentele software, algoritmii si interfetele ' +
    'prezentate in acest document sunt rezultatul propriei munci creative si intelectuale.'
  );

  yPosition += 10;
  pdf.text('_______________________________', margin, yPosition);
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Semnatura si Data', margin, yPosition);

  // Footer on all pages
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Pagina ${i} din ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    pdf.text(
      'YANA - Documentatie Drepturi de Autor',
      margin,
      pageHeight - 10
    );
  }

  // Save PDF
  const fileName = `YANA_Drepturile_de_Autor_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
