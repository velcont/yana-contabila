/**
 * OPERAȚIUNEA BISTURIUL - Export Conservator
 * Modul utilitar pentru generarea raportului complet de 40+ pagini
 * Exportat din AnalysisDisplay.tsx pentru utilizare în ChatAI "Butonul Roșu"
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ShadingType, Table, TableCell, TableRow, WidthType, BorderStyle, ImageRun, PageBreak, Header, Footer, TextDirection, VerticalAlign, PageNumber, NumberFormat, SectionType, PageOrientation, IStylesOptions, IParagraphStylePropertiesOptions, IBaseParagraphStyleOptions, convertInchesToTwip, ExternalHyperlink, TabStopType, TabStopPosition, UnderlineType } from "docx";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

// Interfaces
export interface GenerateReportParams {
  analysisText: string;
  metadata: any;
  companyInfo: {
    name: string;
    cui: string;
    period: string;
  };
  grokValidationData?: any;
  onProgress?: (status: string) => void;
}

export interface GenerateReportResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  error?: string;
}

// Helper function for Call-to-Action Chat AI boxes
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
        spacing: { after: 50 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        text: '• "Cum reduc cheltuielile cu 10.000 RON/lună?"',
        spacing: { after: 100 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "→ Mergi la chatboxul de la început și întreabă orice!", bold: true })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        shading: { fill: "FFA500", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 TIP: ", bold: true }),
          new TextRun({ text: 'Poți folosi și funcția "🏛️ Legislație Fiscală" pentru confirmări în lege!' })
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
        text: "Scrie direct în chatboxul de la început (unde ai încărcat balanța) → Chat AI-ul YANA răspunde instant!",
        spacing: { after: 50 },
        shading: { fill: "E0E0E0", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 BONUS: ", bold: true }),
          new TextRun({ text: 'Alege funcția "🏛️ Legislație Fiscală" din chat pentru a căuta confirmări în legislație românească!' })
        ],
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
        spacing: { after: 100 },
        shading: { fill: "FF0000", type: ShadingType.SOLID }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💡 BONUS: ", bold: true }),
          new TextRun({ text: 'Folosește și funcția "🏛️ Legislație Fiscală" din chat pentru verificări rapide în lege!' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        shading: { fill: "FF0000", type: ShadingType.SOLID }
      })
    ];
  }
  
  return [];
};

/**
 * Generează raportul complet de 40+ pagini Word
 * Acest cod este exportat din AnalysisDisplay.tsx pentru reutilizare
 */
export async function generateFullWordReport(params: GenerateReportParams): Promise<GenerateReportResult> {
  const { analysisText, metadata, companyInfo, grokValidationData, onProgress } = params;
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 START GENERARE RAPORT PREMIUM (Export Conservator)');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('ro-RO')}`);
  console.log(`🏢 Companie: ${companyInfo.name || 'N/A'}`);
  console.log(`🆔 CUI: ${companyInfo.cui || 'N/A'}`);
  console.log(`✅ Grok Validation: ${grokValidationData?.validation_status || 'N/A'}`);
  console.log('='.repeat(80));
  
  onProgress?.('Pregătire date...');
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Utilizator neautentificat' };
  }
  
  // Extract CUI and dates from metadata
  const cui = companyInfo.cui || metadata?.cui || '';
  const endDate = metadata?.endDate || new Date().toISOString().split('T')[0];
  
  // Get previous report for comparison
  async function getPreviousReport(userId: string, cuiParam: string, currentEndDate: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('rapoarte_metadata')
        .select('*')
        .eq('user_id', userId)
        .eq('cui', cuiParam)
        .lt('perioada_end', currentEndDate)
        .order('perioada_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return null;
      
      console.log(`✅ Găsit raport precedent: ${format(new Date(data.perioada_end), 'MMMM yyyy', { locale: ro })}`);
      return data;
    } catch {
      return null;
    }
  }
  
  onProgress?.('Căutare raport precedent...');
  const previousReport = await getPreviousReport(user.id, cui, endDate);
  
  // Build structured data
  let sd: { cui: string; company: string; accounts: Array<{code: string; name: string; debit: number; credit: number; finalDebit?: number; finalCredit?: number; accountClass: number}> } | null = null;
  
  console.log('📊 [WORD-GEN] Verificare date structurate:', {
    hasMetadata: !!metadata,
    hasStructuredData: !!metadata?.structuredData,
    accountsLength: metadata?.structuredData?.accounts?.length || 0
  });
  
  if (metadata?.structuredData?.accounts && metadata.structuredData.accounts.length > 0) {
    sd = metadata.structuredData;
    console.log('✅ [WORD-GEN] Folosesc structuredData direct:', sd.accounts.length, 'conturi');
  } else {
    // Fallback: reconstruct from metadata classes
    const accs: Array<{code: string; name: string; debit: number; credit: number; accountClass: number}> = [];
    const round2 = (n: number) => Math.round((n || 0) * 100) / 100;
    
    const pushFromBalance = (items: any[] | undefined, cls: number) => {
      items?.forEach((a) => {
        const debit = a?.finalBalanceDebit ?? (a?.balanceType === 'debit' ? Math.abs(a?.netBalance || 0) : 0);
        const credit = a?.finalBalanceCredit ?? (a?.balanceType === 'credit' ? Math.abs(a?.netBalance || 0) : 0);
        const d = Number(debit) || 0;
        const c = Number(credit) || 0;
        if (d > 0 || c > 0) {
          accs.push({
            code: String(a.accountCode || '').trim(),
            name: String(a.accountName || `Cont ${a.accountCode || ''}`).trim(),
            debit: round2(d),
            credit: round2(c),
            accountClass: cls,
          });
        }
      });
    };
    
    // Classes 1-5 from metadata
    pushFromBalance((metadata as any)?.class1_FixedAssets, 1);
    pushFromBalance((metadata as any)?.class2_CurrentAssets, 2);
    pushFromBalance((metadata as any)?.class3_Inventory, 3);
    pushFromBalance((metadata as any)?.class4_ThirdParties, 4);
    pushFromBalance((metadata as any)?.class5_Treasury, 5);
    
    // Classes 6 and 7 from total turnovers
    (metadata as any)?.class6_Expenses?.forEach((a: any) => {
      const d = Number(a?.totalDebit || 0);
      if (d > 0) {
        accs.push({
          code: String(a.accountCode || '').trim(),
          name: String(a.accountName || `Cont ${a.accountCode || ''}`).trim(),
          debit: round2(d),
          credit: 0,
          accountClass: 6,
        });
      }
    });
    (metadata as any)?.class7_Revenue?.forEach((a: any) => {
      const c = Number(a?.totalCredit || 0);
      if (c > 0) {
        accs.push({
          code: String(a.accountCode || '').trim(),
          name: String(a.accountName || `Cont ${a.accountCode || ''}`).trim(),
          debit: 0,
          credit: round2(c),
          accountClass: 7,
        });
      }
    });
    
    if (accs.length > 0) {
      sd = {
        cui: companyInfo.cui || '',
        company: companyInfo.name || 'Firmă',
        accounts: accs,
      };
    }
  }
  
  if (!sd) {
    console.error("❌ [WORD-GEN] Nu există date structurate!");
    return { success: false, error: 'Nu există date suficiente pentru generarea documentului Word. Reprocesează balanța.' };
  }
  
  onProgress?.('Generare raport Word (40+ pagini)...');
  
  try {
    const { cui: cuiVal, company, accounts } = sd;
    
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
    
    // Căutare FLEXIBILĂ de conturi
    const findAccount = (baseCode: string) => {
      if (!accounts || accounts.length === 0) return null;
      let acc = accounts.find(a => a.code === baseCode);
      if (acc) return acc;
      acc = accounts.find(a => a.code.startsWith(baseCode));
      if (acc) return acc;
      if (baseCode.length === 4) {
        acc = accounts.find(a => a.code === baseCode.substring(0, 3));
      }
      return acc || null;
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
    
    // Calculate key indicators
    const bank = get('5121').sold;
    const cash = get('5311').sold;
    const clients411 = get('411').debit;
    const clients4111 = get('4111').debit;
    const totalClients = clients411 + clients4111;
    const suppliers = get('401').credit;
    const stocks = get('371').debit;
    const profit121credit = get('121').credit;
    const profit121debit = get('121').debit;
    const profitOrLoss = profit121credit - profit121debit;
    const totalCash = bank + cash;
    
    // Sum revenues and expenses
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
    
    // Count alerts
    let alertsCount = 0;
    if (totalCash < 20000) alertsCount++;
    if (profitOrLoss < 0) alertsCount++;
    if (suppliers > bank * 2) alertsCount++;
    if (totalClients > bank * 3) alertsCount++;
    if (cash > 10000) alertsCount++;
    
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
          new TextRun(cuiVal || 'N/A')
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
        text: 'Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale. Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie fiscală validată.',
        spacing: { after: 300 }
      })
    );
    
    // === BYPASS GROK - BANNER ROȘU PENTRU CRITICAL ===
    if (grokValidationData?.validation_status === 'CRITICAL' || grokValidationData?.ready_for_report === false) {
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
              text: 'Această analiză a fost generată pe baza unei balanțe contabile care conține anomalii critice sau informații incomplete. Anumite cifre din acest raport pot fi distorsionate. Vă rugăm să discutați aceste anomalii cu contabilul dvs. sau să folosiți chat-ul nostru pentru a înțelege impactul.', 
              size: 22,
              color: '7F1D1D'
            })
          ],
          spacing: { after: 200 },
          shading: { fill: 'FEE2E2' }
        }),
        new Paragraph({
          text: '',
          spacing: { after: 200 }
        })
      );
      
      // List critical anomalies
      if (grokValidationData?.anomalies?.length > 0) {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: '🚨 ANOMALII CRITICE DETECTATE', 
                bold: true, 
                size: 32, 
                color: 'DC2626'
              })
            ],
            spacing: { before: 200, after: 100 },
            shading: { fill: 'FEE2E2' }
          }),
          new Paragraph({
            text: `Au fost detectate ${grokValidationData.anomalies.length} anomalie(i) critice în balanță:`,
            spacing: { after: 100 }
          })
        );
        
        grokValidationData.anomalies.forEach((anomaly: any, index: number) => {
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
        
        docSections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
    }
    
    // === GROK VALIDATION WARNINGS ===
    if (grokValidationData?.validation_status === 'WARNING' && grokValidationData?.anomalies?.length > 0) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: '⚠️ AVERTISMENTE DETECTATE DE GROK AI', 
              bold: true, 
              size: 32, 
              color: 'FFA500'
            })
          ],
          spacing: { before: 200, after: 100 },
          shading: { fill: 'FFF4E6' }
        }),
        new Paragraph({
          text: `Grok AI (cel mai puternic model contabil) a detectat ${grokValidationData.anomalies.length} avertisment(e) în balanță:`,
          spacing: { after: 100 }
        })
      );
      
      grokValidationData.anomalies.forEach((anomaly: any, index: number) => {
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
          }),
          new Paragraph({
            text: `💡 Recomandare: ${anomaly.recommendation}`,
            spacing: { after: 150 }
          })
        );
      });
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: '⚠️ Aceste avertismente nu blochează raportul, dar necesită atenție din partea contabilului.',
              italics: true
            })
          ],
          spacing: { after: 200 }
        })
      );
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
          new TextRun({ text: '📊 Total venituri: ', bold: true }),
          new TextRun(`${fmt(totalRevenue)} RON`)
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '📉 Total cheltuieli: ', bold: true }),
          new TextRun(`${fmt(totalExpenses)} RON`)
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '👥 Cât îți datorează clienții: ', bold: true }),
          new TextRun(`${fmt(totalClients)} RON`)
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '🏭 Cât datorezi furnizorilor: ', bold: true }),
          new TextRun(`${fmt(suppliers)} RON`)
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '📦 Stocuri de marfă: ', bold: true }),
          new TextRun(`${fmt(stocks)} RON`)
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `🏥 STARE GENERALĂ: ${healthStatus}`, bold: true, color: healthColor === 'roșu' ? 'FF0000' : (healthColor === 'portocaliu' ? 'FFA500' : (healthColor === 'galben' ? 'FFD700' : '00FF00')) })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `⚠️ Alerte identificate: ${alertsCount}`, bold: alertsCount > 0 })
        ],
        spacing: { after: 300 }
      })
    );
    
    // === CALL TO ACTION ===
    docSections.push(...createChatAICallToAction('hero'));
    
    // === ANALIZA DETALIATĂ PE CLASE DE CONTURI ===
    docSections.push(
      new Paragraph({
        text: '📋 ANALIZĂ DETALIATĂ PE CLASE DE CONTURI',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      })
    );
    
    // Add each class of accounts
    const classNames: Record<number, string> = {
      1: 'CLASA 1 - Capital și Rezerve',
      2: 'CLASA 2 - Imobilizări',
      3: 'CLASA 3 - Stocuri și Producție',
      4: 'CLASA 4 - Terți (Clienți, Furnizori, Stat)',
      5: 'CLASA 5 - Trezorerie (Bancă și Casă)',
      6: 'CLASA 6 - Cheltuieli',
      7: 'CLASA 7 - Venituri'
    };
    
    for (let classNum = 1; classNum <= 7; classNum++) {
      const classAccounts = accounts.filter(a => a.accountClass === classNum);
      if (classAccounts.length === 0) continue;
      
      docSections.push(
        new Paragraph({
          text: classNames[classNum] || `CLASA ${classNum}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );
      
      // Sort accounts by code
      classAccounts.sort((a, b) => a.code.localeCompare(b.code));
      
      // Add each account
      classAccounts.forEach(acc => {
        const value = acc.debit > 0 ? acc.debit : acc.credit;
        const type = acc.debit > 0 ? 'Sold Debitor' : 'Sold Creditor';
        
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${acc.code} - ${acc.name}: `, bold: true }),
              new TextRun(`${fmt(value)} RON (${type})`)
            ],
            spacing: { after: 50 }
          })
        );
      });
      
      // Class subtotal
      const classTotal = classAccounts.reduce((sum, a) => sum + (a.debit > 0 ? a.debit : a.credit), 0);
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `📊 Total ${classNames[classNum]}: `, bold: true }),
            new TextRun({ text: `${fmt(classTotal)} RON`, bold: true })
          ],
          spacing: { before: 100, after: 200 }
        })
      );
    }
    
    // === COMPARISON WITH PREVIOUS REPORT ===
    if (previousReport) {
      docSections.push(
        new Paragraph({
          text: '📈 COMPARAȚIE CU LUNA PRECEDENTĂ',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }),
        new Paragraph({
          text: `Raport precedent: ${format(new Date(previousReport.perioada_end), 'MMMM yyyy', { locale: ro })}`,
          spacing: { after: 150 }
        })
      );
      
      const prevProfit = previousReport.profit_net || 0;
      const prevCash = (previousReport.cash_banca || 0) + (previousReport.cash_casa || 0);
      const profitChange = profitOrLoss - prevProfit;
      const cashChange = totalCash - prevCash;
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Profit: ', bold: true }),
            new TextRun(`${fmt(profitOrLoss)} RON vs ${fmt(prevProfit)} RON (${profitChange >= 0 ? '+' : ''}${fmt(profitChange)} RON)`)
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Cash total: ', bold: true }),
            new TextRun(`${fmt(totalCash)} RON vs ${fmt(prevCash)} RON (${cashChange >= 0 ? '+' : ''}${fmt(cashChange)} RON)`)
          ],
          spacing: { after: 200 }
        })
      );
    }
    
    // === RECOMANDĂRI FINALE ===
    docSections.push(
      new Paragraph({
        text: '💡 RECOMANDĂRI FINALE',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      })
    );
    
    if (profitOrLoss < 0) {
      docSections.push(
        new Paragraph({
          text: '⚠️ URGENȚĂ: Firma este pe pierdere! Recomandăm analiză imediată a cheltuielilor și identificarea surselor de venituri suplimentare.',
          spacing: { after: 100 },
          shading: { fill: 'FEE2E2' }
        })
      );
    }
    
    if (totalCash < 20000) {
      docSections.push(
        new Paragraph({
          text: '⚠️ Cash-ul disponibil este sub 20.000 RON. Risc de probleme de lichiditate. Recomandăm accelerarea încasărilor și renegocierea termenelor cu furnizorii.',
          spacing: { after: 100 },
          shading: { fill: 'FFF4E6' }
        })
      );
    }
    
    if (totalClients > totalCash * 2) {
      docSections.push(
        new Paragraph({
          text: '💡 Creanțele clienți sunt de peste 2x cash-ul disponibil. Recomandăm implementarea unui sistem strict de urmărire a încasărilor.',
          spacing: { after: 100 }
        })
      );
    }
    
    if (suppliers > bank) {
      docSections.push(
        new Paragraph({
          text: '💡 Datoriile către furnizori depășesc soldul bancar. Prioritizați plățile în funcție de urgență și renegociați termenii dacă e posibil.',
          spacing: { after: 100 }
        })
      );
    }
    
    // General recommendations
    docSections.push(
      new Paragraph({
        text: '✅ Monitorizează lunar indicatorii financiari cheie',
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: '✅ Păstrează o rezervă de cash pentru minim 2 luni de cheltuieli',
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: '✅ Analizează structura cheltuielilor și identifică oportunități de reducere',
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: '✅ Folosește Chat AI YANA pentru întrebări punctuale despre situația financiară',
        spacing: { after: 200 }
      })
    );
    
    // === CALL TO ACTION FINAL ===
    docSections.push(...createChatAICallToAction('final'));
    
    // === FOOTER ===
    docSections.push(
      new Paragraph({
        text: '',
        spacing: { before: 300 }
      }),
      new Paragraph({
        text: '─'.repeat(60),
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        text: `Raport generat de YANA - Asistent Financiar AI | ${new Date().toLocaleDateString('ro-RO')}`,
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 }
      }),
      new Paragraph({
        text: 'www.yana.ro | Pentru întrebări, folosește Chat AI-ul din aplicație',
        alignment: AlignmentType.CENTER,
        spacing: { before: 50 }
      })
    );
    
    onProgress?.('Finalizare document...');
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: docSections
      }]
    });
    
    // Generate blob
    const blob = await Packer.toBlob(doc);
    const fileName = `Raport_Financiar_${company?.replace(/[^a-zA-Z0-9]/g, '_') || 'Firma'}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
    
    // Save report metadata for future comparisons
    try {
      await supabase.from('rapoarte_metadata').insert({
        user_id: user.id,
        cui: cuiVal,
        company_name: company,
        perioada_start: metadata?.startDate || endDate,
        perioada_end: endDate,
        profit_net: profitOrLoss,
        cash_banca: bank,
        cash_casa: cash,
        total_venituri: totalRevenue,
        total_cheltuieli: totalExpenses,
        creante_clienti: totalClients,
        datorii_furnizori: suppliers,
        grok_validation_status: grokValidationData?.validation_status || null,
        generated_at: new Date().toISOString()
      });
      console.log('✅ Metadata raport salvat pentru comparații viitoare');
    } catch (e) {
      console.log('⚠️ Nu am putut salva metadata raport (tabel poate nu există):', e);
    }
    
    console.log('='.repeat(80));
    console.log('✅ RAPORT GENERAT CU SUCCES');
    console.log(`📄 Fișier: ${fileName}`);
    console.log(`📊 Conturi procesate: ${accounts.length}`);
    console.log('='.repeat(80));
    
    return {
      success: true,
      blob,
      fileName
    };
    
  } catch (error: any) {
    console.error('❌ Eroare generare raport:', error);
    return {
      success: false,
      error: error.message || 'Eroare la generarea raportului Word'
    };
  }
}
