import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, convertInchesToTwip } from "docx";
import { generateAccountantSections, generateLegalNoteSectionIfNeeded } from '@/components/BalanceConfirmationHistory';

// ==================== INTERFACES ====================

export interface ReportCompanyInfo {
  name: string;
  cui: string;
  period: string;
}

export interface ReportAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  accountClass: number;
}

export interface ReportStructuredData {
  cui: string;
  company: string;
  accounts: ReportAccount[];
  metadata?: {
    cui?: string;
    perioada?: string;
    dataInceput?: string;
    dataSfarsit?: string;
  };
}

export interface ReportBrandingConfig {
  logoUrl?: string;
  brandColor?: string;
}

export interface ReportGrokValidation {
  validation_status: 'VALID' | 'WARNING' | 'CRITICAL';
  ready_for_report: boolean;
  summary?: string;
  errors?: Array<{ severity: string; message: string }>;
  warnings?: Array<{ severity: string; message: string }>;
}

export interface ReportPreviousData {
  metadata?: {
    profit?: number;
    ca?: number;
    cheltuieli?: number;
  };
  perioada_end?: string;
}

export interface GenerateReportOptions {
  structuredData: ReportStructuredData;
  companyInfo: ReportCompanyInfo;
  isAccountantMode: boolean;
  grokValidation?: ReportGrokValidation;
  previousReport?: ReportPreviousData;
  brandingConfig?: ReportBrandingConfig;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Creare Call-to-Action boxes pentru Chat AI
 */
const createChatAICallToAction = (type: 'hero' | 'section' | 'final'): Paragraph[] => {
  if (type === 'hero') {
    return [
      new Paragraph({
        text: "🚀 AI-ul YANA te așteaptă!",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        text: "Ai întrebări despre raport? Pune-le acum Chat AI-ului care știe EXACT situația firmei tale!",
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Exemple reale:", bold: true })],
        spacing: { after: 100 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        text: '• "De ce am pierdere dacă am încasat bine?"',
        spacing: { after: 50 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        text: '• "Cât pot să-mi scot dividende fără să rămân fără cash?"',
        spacing: { after: 50 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        text: '• "Ce furnizor să plătesc primul luna asta?"',
        spacing: { after: 50 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        text: '• "Cum reduc cheltuielile cu 10.000 RON/lună?"',
        spacing: { after: 100 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        children: [new TextRun({ text: "→ Mergi la chatboxul de la început și întreabă orice!", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        shading: { fill: "FFA500" }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 TIP: ", bold: true }),
          new TextRun({ text: 'Poți folosi și funcția "🏛️ Legislație Fiscală" pentru confirmări în lege!' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        shading: { fill: "FFA500" }
      })
    ];
  }

  if (type === 'section') {
    return [
      new Paragraph({
        text: "💬 Ai întrebări despre această secțiune?",
        spacing: { before: 100, after: 50 },
        shading: { fill: "E0E0E0" }
      }),
      new Paragraph({
        text: "Scrie direct în chatboxul de la început (unde ai încărcat balanța) → Chat AI-ul YANA răspunde instant!",
        spacing: { after: 50 },
        shading: { fill: "E0E0E0" }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 BONUS: ", bold: true }),
          new TextRun({ text: 'Alege funcția "🏛️ Legislație Fiscală" din chat pentru a căuta confirmări în legislație românească!' })
        ],
        spacing: { after: 100 },
        shading: { fill: "E0E0E0" }
      })
    ];
  }

  if (type === 'final') {
    return [
      new Paragraph({
        text: "⚡ NU mai aștepta răspuns de la contabil 3 zile!",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 150, after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FF0000" }
      }),
      new Paragraph({
        text: "Chat AI YANA știe deja totul despre firma ta și îți răspunde în 5 secunde.",
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FF0000" }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Click aici și întreabă orice vrei!", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        shading: { fill: "FF0000" }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 BONUS: ", bold: true }),
          new TextRun({ text: 'Folosește și funcția "🏛️ Legislație Fiscală" din chat pentru verificări rapide în lege!' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        shading: { fill: "FF0000" }
      })
    ];
  }

  return [];
};

/**
 * Generare explicații detaliate pentru conturi (MODUL ANTREPRENOR)
 */
const getAccountExplanation = (acc: ReportAccount): string => {
  const amount = acc.debit > 0 ? acc.debit : acc.credit;
  const code = acc.code;

  // CLASA 1 - CAPITALURI
  if (code === "101") return `💼 Capital social subscris nevărsat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - capitalul promis de acționari dar nevirat încă. Trebuie plătit conform actelor constitutive.`;
  if (code === "1011" || code === "1012") return `💼 Capital social: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - banii pe care asociații i-au pus efectiv în firmă la înființare, înscriși la Registrul Comerțului.`;
  if (code === "104") return `💰 Prime de capital: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - sume suplimentare peste valoarea nominală primite la emisiunea de acțiuni.`;
  if (code === "105" || code === "1068" || code === "106") return `💰 Rezerve: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - profit din anii trecuți păstrat ca rezervă de siguranță (obligatoriu legal min 5% din capital). Bani pentru situații neprevăzute.`;
  
  if (code === "117" || code === "1171") {
    const isLoss = acc.debit > 0;
    return `📊 Rezultat reportat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON ${isLoss ? 'PIERDERE' : 'PROFIT'} din anii trecuți reportată în anul curent. ${isLoss ? '⚠️ Pierdere veche neacoperită - trebuie acoperită din profituri viitoare.' : '✅ Profit vechi reinvestit în firmă.'}`;
  }
  
  if (code === "121") {
    const isLoss = acc.debit > 0;
    return isLoss 
      ? `⚠️ PIERDERE: Firma ta a pierdut ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON în această perioadă. Cheltuielile (clasa 6) au depășit veniturile (clasa 7). ATENȚIE: pierderi repetate pot atrage control ANAF - firma trebuie să genereze profit! Ce poți face: analizează unde cheltuielile sunt mari și caută să crești veniturile prin mai multe vânzări.`
      : `✅ PROFIT: Firma ta a câștigat ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON în această perioadă! Veniturile (clasa 7) au depășit cheltuielile (clasa 6). Rezultat pozitiv - afacerea merge bine. Continuă activitățile profitabile!`;
  }

  // CLASA 2 - IMOBILIZĂRI
  if (code === "211") return `🏢 Terenuri: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - valoarea terenurilor deținute. Active fixe folosite pentru activitate (sediu, depozit), NU pentru vânzare.`;
  if (code === "2131" || code === "2135") return `🏗️ Construcții: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - valoarea clădirilor (sedii, hale, depozite). Se amortizează în timp - valoarea contabilă scade.`;
  if (code === "214") return `⚙️ Mobilier și echipamente birotice: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - mobilier, calculatoare, imprimante. Echipamente pentru operațiuni zilnice.`;

  // CLASA 3 - STOCURI
  if (code === "371") return `📦 Mărfuri în stoc: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON mărfuri în depozit. VERIFICĂ FIZIC la inventar dacă corespunde! Dacă lipsesc → pierderi. Dacă prea multe → bani blocați. Ideal: vinde rapid pentru cash.`;

  // CLASA 4 - TERȚI
  if (code === "401") return `💳 Datorii furnizori: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON datorați pentru bunuri/servicii primite și NEACHITATE. VERIFICĂ SCADENȚELE - întârzieri = penalități, dobânzi sau oprirea livrărilor! Planifică cash flow-ul pentru plăți la timp.`;
  if (code === "411" || code === "4111") return `💰 Clienți: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON pe care clienții ÎI DATOREAZĂ pentru livrări efectuate. URMĂREȘTE-I ACTIV! Dacă nu plătesc la timp → cash-flow blocat. Sună-i, trimite reminder-uri, ia măsuri de recuperare! Banii ăștia TREBUIE încasați!`;
  if (code === "421") return `💼 Salarii datorate: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - salarii calculate dar neplatite încă. Datorie de onoare - plătește la termen (max 15 a lunii)!`;
  if (code === "4423") return `🏛️ TVA de plată: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON TVA colectat care TREBUIE VIRAT la stat până la 25 a lunii următoare! NU întârzia - riști amenzi mari (0.01%-0.02% pe zi) și dobânzi. Prioritate fiscală critică!`;
  if (code === "4424") return `↩️ TVA de recuperat: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON TVA deductibil de RECUPERAT de la ANAF. Depune decontul la timp (până la 25). ATENȚIE: Sume mari (peste 45.000) = verificări suplimentare, poate dura 2-6 luni. Pregătește toate facturile!`;

  // CLASA 5 - TREZORERIE
  if (code === "5121") return `💵 Cont curent bancă: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON - disponibil în contul bancar principal. Banii efectivi pe care îi ai ACUM pentru plăți. Monitorizează zilnic pentru a evita surprize neplăcute.`;
  if (code === "531") return `💰 Casa: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON în numerar. ATENȚIE: Plafon legal 50.000 RON! Depășiri = risc ANAF. Păstrează bonurile pentru toate intrările/ieșirile.`;

  // Default
  return `${acc.name}: ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;
};

/**
 * Convertire text în paragrafe pentru docx
 */
const convertTextToParagraphs = (text: string, options: any = {}): Paragraph[] => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const trimmed = line.trim();
    
    if (trimmed.match(/^#{3,}/)) {
      return new Paragraph({
        text: trimmed.replace(/^#+\s*/, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
        ...options
      });
    }
    
    if (trimmed.match(/^[•\-*]/)) {
      return new Paragraph({
        text: trimmed.replace(/^[•\-*]\s*/, ''),
        bullet: { level: 0 },
        spacing: { before: 50, after: 50 },
        ...options
      });
    }
    
    return new Paragraph({
      text: trimmed,
      spacing: { before: 100, after: 100 },
      ...options
    });
  });
};

// ==================== MAIN FUNCTION ====================

/**
 * Generare document Word Premium - Funcție pură
 */
export async function generateFinancialReport(options: GenerateReportOptions): Promise<Blob> {
  const {
    structuredData,
    companyInfo,
    isAccountantMode,
    grokValidation,
    previousReport,
    brandingConfig
  } = options;

  console.log('[generateFinancialReport] START', {
    company: companyInfo.name,
    cui: companyInfo.cui,
    mode: isAccountantMode ? 'CONTABIL' : 'ANTREPRENOR',
    hasGrok: !!grokValidation,
    hasPrevious: !!previousReport
  });

  const sections: any[] = [];

  // ==================== ANTET RAPORT ====================
  sections.push(
    new Paragraph({
      text: "RAPORT FINANCIAR PREMIUM",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: `Generat de YANA AI - Platforma de Inteligență Financiară`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }),
    new Paragraph({
      text: `Data: ${new Date().toLocaleDateString('ro-RO')}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // ==================== INFO FIRMĂ ====================
  sections.push(
    new Paragraph({
      text: "Informații Societate",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Denumire: ", bold: true }),
        new TextRun({ text: companyInfo.name })
      ],
      spacing: { after: 50 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "CUI: ", bold: true }),
        new TextRun({ text: companyInfo.cui })
      ],
      spacing: { after: 50 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Perioadă analizată: ", bold: true }),
        new TextRun({ text: companyInfo.period })
      ],
      spacing: { after: 200 }
    })
  );

  // ==================== VALIDARE GROK (dacă există) ====================
  if (grokValidation) {
    const validationColor = 
      grokValidation.validation_status === 'VALID' ? '4CAF50' :
      grokValidation.validation_status === 'WARNING' ? 'FFA500' : 'D32F2F';

    sections.push(
      new Paragraph({
        text: "🤖 Validare Automată Grok AI",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Status: ", bold: true }),
          new TextRun({ 
            text: grokValidation.validation_status,
            color: validationColor,
            bold: true
          })
        ],
        spacing: { after: 100 }
      })
    );

    if (grokValidation.summary) {
      sections.push(...convertTextToParagraphs(grokValidation.summary));
    }

    if (grokValidation.warnings && grokValidation.warnings.length > 0) {
      sections.push(
        new Paragraph({
          text: "⚠️ Avertismente:",
          spacing: { before: 100, after: 50 },
          shading: { fill: "FFF3CD" }
        })
      );
      grokValidation.warnings.forEach((w: any) => {
        sections.push(
          new Paragraph({
            text: `• ${w.message}`,
            spacing: { after: 50 },
            shading: { fill: "FFF3CD" }
          })
        );
      });
    }
  }

  // ==================== CALL TO ACTION HERO ====================
  sections.push(...createChatAICallToAction('hero'));

  // ==================== GENERARE SECȚIUNI ====================
  if (isAccountantMode) {
    // ✅ MODUL CONTABIL - Raport concis
    console.log('[generateFinancialReport] Modul CONTABIL');
    
    const accountsRecord: Record<string, { debit: number; credit: number }> = 
      structuredData.accounts.reduce((acc, account) => {
        acc[account.code] = { 
          debit: account.debit || 0, 
          credit: account.credit || 0 
        };
        return acc;
      }, {} as Record<string, { debit: number; credit: number }>);

    sections.push(
      ...generateAccountantSections(
        accountsRecord,
        structuredData.cui,
        structuredData.company,
        new Date().toLocaleDateString('ro-RO')
      ),
      ...generateLegalNoteSectionIfNeeded(true)
    );

  } else {
    // ✅ MODUL ANTREPRENOR - Raport detaliat
    console.log('[generateFinancialReport] Modul ANTREPRENOR');

    sections.push(
      new Paragraph({
        text: "Explicații Detaliate Conturi",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      })
    );

    // Grupare conturi pe clase
    const accountsByClass: Record<number, ReportAccount[]> = {};
    structuredData.accounts.forEach(acc => {
      if (!accountsByClass[acc.accountClass]) {
        accountsByClass[acc.accountClass] = [];
      }
      accountsByClass[acc.accountClass].push(acc);
    });

    Object.keys(accountsByClass).sort().forEach((classKey, idx) => {
      const accountClass = parseInt(classKey);
      const accounts = accountsByClass[accountClass];

      sections.push(
        new Paragraph({
          text: `Clasa ${accountClass}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 100 }
        })
      );

      accounts.forEach(acc => {
        const explanation = getAccountExplanation(acc);
        sections.push(...convertTextToParagraphs(explanation));
      });

      // Call-to-action după fiecare clasă
      if (idx < Object.keys(accountsByClass).length - 1) {
        sections.push(...createChatAICallToAction('section'));
      }
    });
  }

  // ==================== COMPARAȚIE CU RAPORT PRECEDENT ====================
  if (previousReport?.metadata) {
    const currentProfit = structuredData.accounts.find(a => a.code === '121')?.credit || 0;
    const currentCA = structuredData.accounts.filter(a => a.accountClass === 7).reduce((sum, a) => sum + a.credit, 0);
    
    const prevProfit = previousReport.metadata.profit || 0;
    const prevCA = previousReport.metadata.ca || 0;

    sections.push(
      new Paragraph({
        text: "📊 Comparație cu Perioada Precedentă",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Profit: ", bold: true }),
          new TextRun({ text: `${currentProfit.toLocaleString('ro-RO')} RON (anterior: ${prevProfit.toLocaleString('ro-RO')} RON)` })
        ],
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Cifră de afaceri: ", bold: true }),
          new TextRun({ text: `${currentCA.toLocaleString('ro-RO')} RON (anterior: ${prevCA.toLocaleString('ro-RO')} RON)` })
        ],
        spacing: { after: 100 }
      })
    );
  }

  // ==================== CALL TO ACTION FINAL ====================
  sections.push(...createChatAICallToAction('final'));

  // ==================== FOOTER ====================
  sections.push(
    new Paragraph({
      text: "___",
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: "Acest raport a fost generat automat de YANA AI",
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }),
    new Paragraph({
      text: "Pentru întrebări suplimentare, utilizați Chat AI din platformă",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // ==================== GENERARE DOCUMENT ====================
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  console.log('[generateFinancialReport] Document generat cu succes');
  
  return blob;
}
