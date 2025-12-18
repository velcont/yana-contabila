/**
 * Utility pentru generarea raportului Word Premium
 * Extrage logica esențială din AnalysisDisplay pentru apel direct din ChatAI
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ShadingType } from "docx";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface StructuredData {
  cui: string;
  company: string;
  accounts: Array<{
    code: string;
    name: string;
    debit: number;
    credit: number;
    finalDebit?: number;   // 🆕 Sold final debitor (clase 1-5)
    finalCredit?: number;  // 🆕 Sold final creditor (clase 1-5)
    accountClass: number;
  }>;
}

interface GenerateReportParams {
  structuredData: StructuredData;
  grokValidation?: any;
  companyInfo: {
    name: string;
    cui: string;
  };
}

interface GenerateReportResult {
  blob: Blob;
  fileName: string;
}

// Helper pentru Call-to-Action boxes
const createChatAICallToAction = (type: 'hero' | 'section' | 'final'): Paragraph[] => {
  if (type === 'hero') {
    return [
      new Paragraph({
        text: "🚀 AI-ul YANA te așteaptă!",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: "Ai întrebări despre raport? Pune-le acum Chat AI-ului care știe EXACT situația firmei tale!",
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Exemple reale:", bold: true })
        ],
        spacing: { after: 100 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: '• "De ce am pierdere dacă am încasat bine?"',
        spacing: { after: 50 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: '• "Cât pot să-mi scot dividende fără să rămân fără cash?"',
        spacing: { after: 50 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: '• "Ce furnizor să plătesc primul luna asta?"',
        spacing: { after: 100 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "→ Mergi la chatboxul de la început și întreabă orice!", bold: true })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      })
    ];
  }
  
  if (type === 'section') {
    return [
      new Paragraph({
        text: "💬 Ai întrebări despre această secțiune?",
        spacing: { before: 100, after: 50 },
        shading: { fill: "E0E0E0", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: "Scrie direct în chatboxul de la început → Chat AI-ul YANA răspunde instant!",
        spacing: { after: 100 },
        shading: { fill: "E0E0E0", type: ShadingType.SOLID }
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
        shading: { fill: "FF0000", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: "Chat AI YANA știe deja totul despre firma ta și îți răspunde în 5 secunde.",
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER,
        shading: { fill: "FF0000", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Click aici și întreabă orice vrei!", bold: true })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        shading: { fill: "FF0000", type: ShadingType.SOLID }
      })
    ];
  }
  
  return [];
};

export async function generatePremiumWordReport(params: GenerateReportParams): Promise<GenerateReportResult> {
  const { structuredData, grokValidation, companyInfo } = params;
  const { cui, company, accounts } = structuredData;
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 START GENERARE RAPORT PREMIUM (Red Button Direct)');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('ro-RO')}`);
  console.log(`🏢 Companie: ${company || 'N/A'}`);
  console.log(`🆔 CUI: ${cui || 'N/A'}`);
  console.log(`✅ Grok Validation: ${grokValidation?.validation_status || 'N/A'}`);
  console.log('='.repeat(80));

  // Helper functions
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // 🆕 FUNCȚIA CRITICĂ: Citește valoarea corectă în funcție de clasa contului
  // Clase 1-5: folosim finalDebit/finalCredit (solduri finale)
  // Clase 6-7: folosim debit/credit (rulaje)
  const getCorrectValue = (acc: any, field: 'debit' | 'credit'): number => {
    if (!acc) return 0;
    const accountClass = acc.accountClass || parseInt(acc.code?.charAt(0) || '0');
    
    if (accountClass >= 1 && accountClass <= 5) {
      // Clase 1-5: Solduri finale
      return field === 'debit' ? (acc.finalDebit || 0) : (acc.finalCredit || 0);
    } else {
      // Clase 6-7: Rulaje
      return field === 'debit' ? (acc.debit || 0) : (acc.credit || 0);
    }
  };
  
  // 🆕 Căutare FLEXIBILĂ de conturi (exact match → startsWith → 3-digit pentru 4-digit codes)
  const findAccount = (baseCode: string) => {
    if (!accounts || accounts.length === 0) return null;
    // Exact match first
    let acc = accounts.find(a => a.code === baseCode);
    if (acc) return acc;
    // startsWith match (pentru a găsi 5121 când căutăm "512")
    acc = accounts.find(a => a.code.startsWith(baseCode));
    if (acc) return acc;
    // Pentru coduri 4-digit, verifică și varianta 3-digit (pentru soft-uri diferite)
    if (baseCode.length === 4) {
      acc = accounts.find(a => a.code === baseCode.substring(0, 3));
    }
    return acc || null;
  };
  
  // 🆕 Sumează mai multe conturi - FOLOSEȘTE getCorrectValue
  const sumAccounts = (baseCodes: string[], field: 'debit' | 'credit'): number => {
    let total = 0;
    for (const code of baseCodes) {
      // Găsește toate conturile care încep cu codul
      const matchingAccounts = accounts.filter(a => a.code.startsWith(code));
      for (const acc of matchingAccounts) {
        total += getCorrectValue(acc, field);
      }
    }
    return total;
  };
  
  const get = (code: string) => {
    const acc = findAccount(code);
    if (!acc) return { debit: 0, credit: 0, sold: 0 };
    const debit = getCorrectValue(acc, 'debit');
    const credit = getCorrectValue(acc, 'credit');
    const sold = debit > 0 ? debit : (credit > 0 ? credit : 0);
    return { debit, credit, sold };
  };
  
  const getAccountValue = (code: string, type: 'debit' | 'credit' = 'debit'): number => {
    const acc = findAccount(code);
    if (!acc) return 0;
    return getCorrectValue(acc, type);
  };
  
  const getAccountsSum = (pattern: RegExp, type: 'debit' | 'credit' = 'debit'): number => {
    return accounts
      .filter(a => pattern.test(a.code))
      .reduce((sum, a) => sum + getCorrectValue(a, type), 0);
  };
  
  const getClassSum = (classNum: number, type: 'debit' | 'credit' = 'debit'): number => {
    return accounts
      .filter(a => a.accountClass === classNum)
      .reduce((sum, a) => sum + getCorrectValue(a, type), 0);
  };

  // 🔍 LOGGING pentru debugging
  console.log(`[generatePremiumWordReport] Accounts received: ${accounts?.length || 0}`);
  console.log(`[generatePremiumWordReport] Sample accounts:`, accounts?.slice(0, 10).map(a => `${a.code}: D=${a.debit} C=${a.credit}`));

  // Calculate key indicators - 🆕 CORECTĂRI CRITICE
  // Bancă: 5121 (lei) + 5124 (valută) + 5125 (alte conturi)
  const bank5121 = getAccountValue('5121', 'debit');
  const bank5124 = getAccountValue('5124', 'debit');
  const bank5125 = getAccountValue('5125', 'debit');
  const bank = bank5121 + bank5124 + bank5125;
  
  // Cash la casă: 5311 (lei) + 5314 (valută)
  const cash5311 = getAccountValue('5311', 'debit');
  const cash5314 = getAccountValue('5314', 'debit');
  const cash = cash5311 + cash5314;
  
  // Total cash
  const totalCash = bank + cash;
  
  // Clienți: 4111 sau 411
  const clients4111 = getAccountValue('4111', 'debit');
  const clients411 = getAccountValue('411', 'debit');
  const totalClients = clients4111 > 0 ? clients4111 : clients411;
  
  // Furnizori: 401 (credit!)
  const suppliers = getAccountValue('401', 'credit');
  
  // Stocuri marfă: 371
  const stocks = getAccountValue('371', 'debit');
  
  // Profit/Pierdere: 121 (credit = profit, debit = pierdere)
  const profit121credit = getAccountValue('121', 'credit');
  const profit121debit = getAccountValue('121', 'debit');
  const profitOrLoss = profit121credit - profit121debit;
  
  // 🔍 LOGGING valorilor calculate
  console.log(`[generatePremiumWordReport] 💰 Bank (5121+5124+5125): ${bank5121} + ${bank5124} + ${bank5125} = ${bank}`);
  console.log(`[generatePremiumWordReport] 💵 Cash (5311+5314): ${cash5311} + ${cash5314} = ${cash}`);
  console.log(`[generatePremiumWordReport] 📊 Total Cash: ${totalCash}`);
  console.log(`[generatePremiumWordReport] 👥 Clients (4111/411): ${clients4111} / ${clients411} = ${totalClients}`);
  console.log(`[generatePremiumWordReport] 📦 Suppliers (401): ${suppliers}`);
  console.log(`[generatePremiumWordReport] 🏪 Stocks (371): ${stocks}`);
  console.log(`[generatePremiumWordReport] 📈 Profit/Loss (121): credit=${profit121credit} debit=${profit121debit} = ${profitOrLoss}`);
  
  // Sum revenues (class 7) and expenses (class 6)
  const totalRevenue = accounts.filter(a => a.accountClass === 7).reduce((sum, a) => sum + a.credit, 0);
  const totalExpenses = accounts.filter(a => a.accountClass === 6).reduce((sum, a) => sum + a.debit, 0);
  
  // Health status
  let healthStatus = 'EXCELENT';
  let healthColor = 'verde';
  if (totalCash < 10000 || profitOrLoss < 0) {
    healthStatus = 'CRITIC';
    healthColor = 'roșu';
  } else if (totalCash < 50000 || profitOrLoss < 10000) {
    healthStatus = 'ATENȚIE';
    healthColor = 'portocaliu';
  } else if (totalCash < 100000) {
    healthStatus = 'BINE';
    healthColor = 'galben';
  }

  // Build document sections
  const docSections: Paragraph[] = [];
  
  // === HEADER ===
  docSections.push(
    new Paragraph({
      text: 'RAPORT DE ANALIZĂ FINANCIARĂ COMPLETĂ',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 }
    }),
    new Paragraph({
      text: 'Analiză detaliată a tuturor conturilor cu recomandări de optimizare',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Companie: ', bold: true }),
        new TextRun(company || 'N/A')
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'CUI: ', bold: true }),
        new TextRun(cui || 'N/A')
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Data generării: ', bold: true }),
        new TextRun(new Date().toLocaleDateString('ro-RO'))
      ],
      spacing: { after: 300 }
    })
  );
  
  // === DISCLAIMER ===
  docSections.push(
    new Paragraph({
      text: '⚠️ NOTĂ LEGALĂ IMPORTANTĂ',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: 'Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI). Recomandăm ca toate concluziile să fie revizuite de un contabil autorizat înainte de a fi utilizate în luarea deciziilor.',
      spacing: { after: 300 }
    })
  );
  
  // === GROK CRITICAL BANNER ===
  if (grokValidation?.validation_status === 'CRITICAL' || grokValidation?.ready_for_report === false) {
    docSections.unshift(
      new Paragraph({
        children: [
          new TextRun({ 
            text: '⚠️ AVERTISMENT DE INTEGRITATE', 
            bold: true, 
            size: 36, 
            color: 'FFFFFF'
          })
        ],
        spacing: { before: 100, after: 100 },
        shading: { fill: 'DC2626' },
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: 'Această analiză a fost generată pe baza unei balanțe care conține anomalii critice. Anumite cifre pot fi distorsionate.', 
            size: 22,
            color: '7F1D1D'
          })
        ],
        spacing: { after: 200 },
        shading: { fill: 'FEE2E2' }
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
    
    if (grokValidation?.anomalies?.length > 0) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '🚨 ANOMALII DETECTATE', bold: true, size: 32, color: 'DC2626' })
          ],
          spacing: { before: 200, after: 100 },
          shading: { fill: 'FEE2E2' }
        })
      );
      
      grokValidation.anomalies.forEach((anomaly: any, index: number) => {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${anomaly.type}: `, bold: true, color: 'DC2626' }),
              new TextRun({ text: anomaly.account ? `Cont ${anomaly.account}` : 'General' })
            ],
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `📋 ${anomaly.message}`,
            spacing: { after: 100 }
          })
        );
      });
    }
  }
  
  // === WARNING BANNER ===
  if (grokValidation?.validation_status === 'WARNING' && grokValidation?.anomalies?.length > 0) {
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '⚠️ AVERTISMENTE DETECTATE', bold: true, size: 32, color: 'FFA500' })
        ],
        spacing: { before: 200, after: 100 },
        shading: { fill: 'FFF4E6' }
      })
    );
    
    grokValidation.anomalies.forEach((anomaly: any, index: number) => {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. ${anomaly.type}: `, bold: true }),
            new TextRun({ text: anomaly.account ? `Cont ${anomaly.account}` : 'General' })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `📋 ${anomaly.message}`,
          spacing: { after: 100 }
        })
      );
    });
  }
  
  // === REZUMAT EXECUTIV ===
  docSections.push(
    new Paragraph({
      text: '📊 REZUMAT EXECUTIV - Situația Ta Financiară pe Scurt',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '💰 Banii firmei tale în bancă: ', bold: true }),
        new TextRun(`${fmt(bank)} RON`)
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '💵 Banii în numerar (la casă): ', bold: true }),
        new TextRun(`${fmt(cash)} RON`)
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '📈 Cât ai câștigat (Profit/Pierdere): ', bold: true }),
        new TextRun(`${profitOrLoss >= 0 ? '+' : ''}${fmt(profitOrLoss)} RON ${profitOrLoss >= 0 ? '✅ PROFIT' : '❌ PIERDERE'}`)
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '🧾 Clienți care îți datorează bani: ', bold: true }),
        new TextRun(`${fmt(totalClients)} RON`)
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '📦 Furnizori cărora le datorezi: ', bold: true }),
        new TextRun(`${fmt(suppliers)} RON`)
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '🏪 Stocuri de marfă: ', bold: true }),
        new TextRun(`${fmt(stocks)} RON`)
      ],
      spacing: { after: 300 }
    })
  );

  // === SEMAFOR SĂNĂTATE FINANCIARĂ ===
  docSections.push(
    new Paragraph({
      text: '🚦 SEMAFORUL SĂNĂTĂȚII FINANCIARE',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Status general: ${healthStatus}`, bold: true, size: 32 })
      ],
      spacing: { after: 200 }
    })
  );
  
  // Call to action
  docSections.push(...createChatAICallToAction('hero'));
  
  // === PISTA DE SUPRAVIEȚUIRE ===
  const monthlyBurn = totalRevenue - totalExpenses;
  const survivalMonths = monthlyBurn >= 0 ? Infinity : (totalCash / Math.abs(monthlyBurn));
  
  docSections.push(
    new Paragraph({
      text: '🛤️ PISTA DE SUPRAVIEȚUIRE',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Cash disponibil: ', bold: true }),
        new TextRun(`${fmt(totalCash)} RON`)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Rezultat lunar (Venituri - Cheltuieli): ', bold: true }),
        new TextRun(`${fmt(monthlyBurn)} RON ${monthlyBurn >= 0 ? '(acumulezi)' : '(arzi)'}`)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Luni de supraviețuire: ', bold: true }),
        new TextRun(survivalMonths === Infinity ? '∞ (firma acumulează cash)' : `${survivalMonths.toFixed(1)} luni`)
      ],
      spacing: { after: 300 }
    })
  );
  
  // === TOP 3 CHELTUIELI ===
  const expensesByClass = accounts
    .filter(a => a.accountClass === 6 && a.debit > 0)
    .sort((a, b) => b.debit - a.debit)
    .slice(0, 5);
  
  if (expensesByClass.length > 0) {
    docSections.push(
      new Paragraph({
        text: '🔴 TOP 5 CHELTUIELI (Găuri Negre)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 150 }
      })
    );
    
    expensesByClass.forEach((acc, idx) => {
      const percent = totalExpenses > 0 ? ((acc.debit / totalExpenses) * 100).toFixed(1) : '0';
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. ${acc.name} (${acc.code}): `, bold: true }),
            new TextRun(`${fmt(acc.debit)} RON (${percent}% din cheltuieli)`)
          ],
          spacing: { after: 100 }
        })
      );
    });
  }
  
  // === TOP 3 VENITURI ===
  const revenuesByClass = accounts
    .filter(a => a.accountClass === 7 && a.credit > 0)
    .sort((a, b) => b.credit - a.credit)
    .slice(0, 5);
  
  if (revenuesByClass.length > 0) {
    docSections.push(
      new Paragraph({
        text: '🟢 TOP 5 VENITURI (Surse de Bani)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 150 }
      })
    );
    
    revenuesByClass.forEach((acc, idx) => {
      const percent = totalRevenue > 0 ? ((acc.credit / totalRevenue) * 100).toFixed(1) : '0';
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. ${acc.name} (${acc.code}): `, bold: true }),
            new TextRun(`${fmt(acc.credit)} RON (${percent}% din venituri)`)
          ],
          spacing: { after: 100 }
        })
      );
    });
  }
  
  // === INDICATORI CHEIE ===
  docSections.push(
    new Paragraph({
      text: '📐 INDICATORI CHEIE DE PERFORMANȚĂ',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Marja de profit: ', bold: true }),
        new TextRun(totalRevenue > 0 ? `${((profitOrLoss / totalRevenue) * 100).toFixed(1)}%` : 'N/A')
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Venituri: ', bold: true }),
        new TextRun(`${fmt(totalRevenue)} RON`)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Total Cheltuieli: ', bold: true }),
        new TextRun(`${fmt(totalExpenses)} RON`)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Profit Net (cont 121): ', bold: true }),
        new TextRun(`${fmt(profitOrLoss)} RON`)
      ],
      spacing: { after: 300 }
    })
  );
  
  // === RECOMANDĂRI ===
  docSections.push(
    new Paragraph({
      text: '💡 RECOMANDĂRI STRATEGICE',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 150 }
    })
  );
  
  if (profitOrLoss < 0) {
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '⚠️ ALERTĂ: Ești în pierdere!', bold: true, color: 'FF0000' })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: '→ Analizează cele mai mari cheltuieli de mai sus și identifică unde poți reduce',
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: '→ Crește veniturile: prețuri mai mari, clienți noi, produse/servicii adiționale',
        spacing: { after: 200 }
      })
    );
  }
  
  if (totalCash < 20000) {
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '⚠️ Cash scăzut!', bold: true, color: 'FF8C00' })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: '→ Încasează urgent creanțele de la clienți',
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: '→ Negociază termene mai lungi cu furnizorii',
        spacing: { after: 200 }
      })
    );
  }
  
  if (totalClients > totalCash * 2) {
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '⚠️ Creanțe mari față de cash!', bold: true, color: 'FF8C00' })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `→ Ai ${fmt(totalClients)} RON de încasat vs ${fmt(totalCash)} RON cash`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: '→ Intensifică eforturile de încasare, oferă discount pentru plată rapidă',
        spacing: { after: 200 }
      })
    );
  }
  
  // Call to action final
  docSections.push(...createChatAICallToAction('final'));
  
  // === FOOTER ===
  docSections.push(
    new Paragraph({
      text: '─'.repeat(70),
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      text: 'Raport generat de YANA - Asistent AI Financiar',
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: `Data: ${new Date().toLocaleDateString('ro-RO')} | Pentru: ${company} (CUI: ${cui})`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: docSections
    }]
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  const fileName = `Raport_Premium_${cui || 'Companie'}_${new Date().toISOString().split('T')[0]}.docx`;

  console.log('✅ Raport Word generat cu succes:', fileName);

  return { blob, fileName };
}
