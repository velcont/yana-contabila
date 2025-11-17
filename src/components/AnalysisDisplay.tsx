import { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  TrendingUp, 
  Building,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Briefcase,
  ChevronRight,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BalanceAuditViewer } from './BalanceAuditViewer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface AnalysisDisplayProps {
  analysisText: string;
  fileName?: string;
  createdAt?: string;
  metadata?: any;
  analysisId?: string;
  onReprocessComplete?: () => void;
}

interface AnalysisSection {
  id: string;
  title: string;
  icon: any;
  content: string;
  summary: string;
  color: string;
}

export const AnalysisDisplay = ({ analysisText, fileName, createdAt, metadata, analysisId, onReprocessComplete }: AnalysisDisplayProps) => {
  const [selectedSection, setSelectedSection] = useState<AnalysisSection | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleReprocess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !analysisId) return;
    
    setIsReprocessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64WithoutPrefix = base64Data.split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('analyze-balance', {
          body: { 
            excelBase64: base64WithoutPrefix,
            fileName: file.name,
            forceReprocess: true
          }
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        await supabase.from('analyses').update({
          analysis_text: data.analysis,
          metadata: {
            ...(data?.metadata ?? {}),
            structuredData: data.structuredData // ✅ Include structuredData pentru Word + safe handling
          }
        }).eq('id', analysisId);
        
        toast.success('✅ Analiză reprocesată cu succes! Cache golit.');
        onReprocessComplete?.();
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error('Eroare la reprocesare: ' + error.message);
    } finally {
      setIsReprocessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Extract month from filename
  const extractMonthFromFilename = (filename?: string): string => {
    if (!filename) return 'N/A';
    
    // Try to extract date range from filename: [01-03-2025 31-03-2025] or [01/03/2025 31/03/2025]
    const dateRangeMatch = filename.match(/\[(\d{2})[-\/](\d{2})[-\/](\d{4})\s+\d{2}[-\/](\d{2})[-\/]\d{4}\]/);
    
    if (dateRangeMatch) {
      const monthNum = parseInt(dateRangeMatch[2], 10);
      const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 
                          'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
      return monthNames[monthNum - 1] || 'N/A';
    }
    
    return 'N/A';
  };

  // Parse company info
  const extractCompanyInfo = (text: string) => {
    const cuiMatch = text.match(/CUI[:\s]+(\d+)/i);
    const companyMatch = text.match(/\*\*([^*]+(?:SRL|SA|SCS|SNC|PFA)[^*]*)\*\*/i);
    const periodMatch = text.match(/Perioada analizată[:\s]+([^\n]+)/i);
    
    return {
      name: companyMatch?.[1]?.trim() || 'Firmă',
      cui: cuiMatch?.[1] || 'N/A',
      period: periodMatch?.[1]?.trim() || extractMonthFromFilename(fileName)
    };
  };

  // Extract ALL sections from analysis text automatically
  const extractSections = (text: string): AnalysisSection[] => {
    const sections: AnalysisSection[] = [];
    
    // Define icons and colors for different section types
    const sectionStyles = [
      { icon: Briefcase, color: 'from-blue-500/20 to-blue-600/20' },
      { icon: FileText, color: 'from-green-500/20 to-green-600/20' },
      { icon: Receipt, color: 'from-purple-500/20 to-purple-600/20' },
      { icon: AlertCircle, color: 'from-red-500/20 to-red-600/20' },
      { icon: TrendingUp, color: 'from-indigo-500/20 to-indigo-600/20' },
      { icon: Building, color: 'from-orange-500/20 to-orange-600/20' },
      { icon: FileText, color: 'from-teal-500/20 to-teal-600/20' },
      { icon: Calendar, color: 'from-pink-500/20 to-pink-600/20' }
    ];
    
    // Try to split by numbered sections: ### 1. or **1.** or just 1.
    // This regex looks for patterns like "### 1." or "**1.**" or "1." at the start of a line
    const sectionPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?(\d+)[\.\)]\s*(?:\*\*)?\s*([^\n*]+)/g;
    const matches = Array.from(text.matchAll(sectionPattern));
    
    if (matches.length > 0) {
      // Extract content for each numbered section
      matches.forEach((match, index) => {
        const sectionNumber = parseInt(match[1]);
        // Clean title: extract only the descriptive name
        let sectionTitle = match[2].trim()
          .replace(/\*\*/g, '')
          .replace(/\$/g, '')
          // Remove account numbers at the start (e.g., "4551 -", "421/431/437 –", "121/117 –")
          .replace(/^\d+(?:\/\d+)*\s*[–—-]+\s*/g, '')
          // Remove "Cont" or "**Cont" prefixes
          .replace(/^\*{0,2}Cont\s+\d+(?:\/\d+)*\s+/gi, '')
          // Extract text between dashes/colons and parentheses or "în"
          // Example: "TVA de plată" from "TVA – de plată (text) în Solduri..."
          .replace(/^([^(]+?)\s*(?:\([^)]*\)|\bîn\b|\bîn\s+Solduri\b).*$/i, '$1')
          // Remove text in parentheses
          .replace(/\s*\([^)]*\)/g, '')
          // Remove "în Solduri finale..." and similar
          .replace(/\s+în\s+(?:Solduri|Total).*$/gi, '')
          // Remove trailing colons and dashes
          .replace(/[:\s–—-]+$/g, '')
          // Replace & with și
          .replace(/\s*&\s*/g, ' și ')
          // Clean up extra spaces
          .replace(/\s+/g, ' ')
          .trim();
        const startIndex = match.index!;
        const endIndex = index < matches.length - 1 ? matches[index + 1].index! : text.length;
        const content = text.substring(startIndex, endIndex).trim();
        
        // Extract a meaningful summary (first 150 chars of actual content, not title)
        const contentLines = content.split('\n').filter(line => 
          line.trim() && 
          !line.match(/^#{1,3}/) && 
          !line.match(/^\*\*\d+\./) &&
          line.length > 20
        );
        const summary = contentLines.slice(0, 2).join(' ').substring(0, 200).trim() + '...';
        
        const style = sectionStyles[index % sectionStyles.length];
        
        sections.push({
          id: `section-${index + 1}`,
          title: sectionTitle,
          icon: style.icon,
          content: content,
          summary: summary,
          color: style.color
        });
      });
    } else {
      // Fallback: try to split by ### headers
      const parts = text.split(/(?=###\s+)/);
      parts.forEach((part, index) => {
        if (part.trim() && part.includes('###')) {
          const lines = part.trim().split('\n');
          const titleLine = lines.find(l => l.startsWith('###'));
          const title = titleLine ? titleLine.replace(/###/g, '').trim() : `Secțiunea ${index + 1}`;
          const content = part.trim();
          
          const contentLines = content.split('\n').filter(line => 
            line.trim() && !line.match(/^#{1,3}/) && line.length > 20
          );
          const summary = contentLines.slice(0, 2).join(' ').substring(0, 200).trim() + '...';
          
          const style = sectionStyles[index % sectionStyles.length];
          
          sections.push({
            id: `section-${index + 1}`,
            title: title,
            icon: style.icon,
            content: content,
            summary: summary,
            color: style.color
          });
        }
      });
    }
    
    // If still no sections, show full text as one section
    if (sections.length === 0) {
      sections.push({
        id: 'full-analysis',
        title: 'Analiză Completă',
        icon: FileText,
        content: text,
        summary: text.substring(0, 200).trim() + '...',
        color: 'from-blue-500/20 to-blue-600/20'
      });
    }

    return sections;
  };

  const companyInfo = extractCompanyInfo(analysisText);
  const sections = extractSections(analysisText);

  // Generate Premium Financial Report Word document
  const generateWordExplanations = async () => {
    // === FIX #6: DEBUG LOGGING START ===
    console.log('\n' + '='.repeat(80));
    console.log('🚀 START GENERARE RAPORT PREMIUM');
    console.log('='.repeat(80));
    console.log(`📅 Data: ${new Date().toLocaleString('ro-RO')}`);
    console.log(`🏢 Companie: ${companyInfo.name || 'N/A'}`);
    console.log(`🆔 CUI: ${companyInfo.cui || 'N/A'}`);
    console.log('='.repeat(80));

    // === FIX #3: PRELUARE RAPORT PRECEDENT DIN DB ===
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Utilizator neautentificat');
      return;
    }

    // Extrage CUI și date din metadata/companyInfo
    const cui = companyInfo.cui || metadata?.cui || '';
    const endDate = metadata?.endDate || new Date().toISOString().split('T')[0];
    const startDate = metadata?.startDate || endDate;

    // Funcție preluare raport precedent
    async function getPreviousReport(
      userId: string, 
      cui: string, 
      currentEndDate: string
    ): Promise<any | null> {
      try {
        const { data, error } = await supabase
          .from('rapoarte_metadata')
          .select('*')
          .eq('user_id', userId)
          .eq('cui', cui)
          .lt('perioada_end', currentEndDate)
          .order('perioada_end', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.log('⚠️ Eroare preluare raport precedent:', error.message);
          return null;
        }
        
        if (!data) {
          console.log('📊 Nu există raport precedent pentru comparație');
          return null;
        }
        
        console.log(`✅ Găsit raport precedent: ${format(new Date(data.perioada_end), 'MMMM yyyy', { locale: ro })}`);
        console.log(`   Profit precedent: ${data.profit_net} RON`);
        console.log(`   Cash precedent: ${(data.cash_banca || 0) + (data.cash_casa || 0)} RON`);
        
        return data;
      } catch (error) {
        console.error('❌ Eroare excepție preluare raport:', error);
        return null;
      }
    }

    const previousReport = await getPreviousReport(user.id, cui, endDate);

    // Fallback: construiește date structurate din metadata dacă lipsesc
    let sd: { cui: string; company: string; accounts: Array<{code: string; name: string; debit: number; credit: number; accountClass: number}> } | null = null;

    if (metadata?.structuredData?.accounts && metadata.structuredData.accounts.length > 0) {
      sd = metadata.structuredData;
    } else {
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

      // Clase 1-5 din metadata
      pushFromBalance((metadata as any)?.class1_FixedAssets, 1);
      pushFromBalance((metadata as any)?.class2_CurrentAssets, 2);
      pushFromBalance((metadata as any)?.class3_Inventory, 3);
      pushFromBalance((metadata as any)?.class4_ThirdParties, 4);
      pushFromBalance((metadata as any)?.class5_Treasury, 5);

      // Clase 6 și 7 din rulaje totale
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
      toast.error("Nu există date suficiente pentru generarea documentului Word. Reprocesează balanța.");
      return;
    }

    try {
      const { cui, company, accounts } = sd;
      
      // Helper functions
      const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const get = (code: string) => {
        const acc = accounts.find(a => a.code === code);
        if (!acc) return { debit: 0, credit: 0, sold: 0 };
        const sold = acc.debit > 0 ? acc.debit : (acc.credit > 0 ? acc.credit : 0);
        return { debit: acc.debit, credit: acc.credit, sold };
      };
      
      // Enhanced helper functions for new sections
      const getAccountValue = (code: string, type: 'debit' | 'credit' = 'debit'): number => {
        const acc = accounts.find(a => a.code === code);
        if (!acc) return 0;
        return type === 'debit' ? (acc.debit || 0) : (acc.credit || 0);
      };
      
      const getAccountsSum = (pattern: RegExp, type: 'debit' | 'credit' = 'debit'): number => {
        return accounts
          .filter(a => pattern.test(a.code))
          .reduce((sum, a) => sum + (type === 'debit' ? (a.debit || 0) : (a.credit || 0)), 0);
      };
      
      const getClassSum = (classNum: number, type: 'debit' | 'credit' = 'debit'): number => {
        return accounts
          .filter(a => a.accountClass === classNum)
          .reduce((sum, a) => sum + (type === 'debit' ? (a.debit || 0) : (a.credit || 0)), 0);
      };
      
      const calculateProfitLoss = (): { profitNet: number; isProfit: boolean } => {
        const loss = getAccountValue('121', 'debit');
        const profit = getAccountValue('121', 'credit');
        
        if (loss > 0) return { profitNet: -loss, isProfit: false };
        if (profit > 0) return { profitNet: profit, isProfit: true };
        return { profitNet: 0, isProfit: true };
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
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Analiză detaliată a tuturor conturilor cu recomandări de optimizare',
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
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
          spacing: { after: 600 }
        })
      );
      
      // === DISCLAIMER ===
      docSections.push(
        new Paragraph({
          text: '⚠️ NOTĂ LEGALĂ IMPORTANTĂ',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: 'Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale. Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie fiscală validată.',
          spacing: { after: 600 }
        })
      );
      
      // === REZUMAT EXECUTIV ===
      docSections.push(
        new Paragraph({
          text: '📊 REZUMAT EXECUTIV - Situația Ta Financiară pe Scurt',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
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
            new TextRun({ text: '👥 Cine îți datorează bani (Clienți): ', bold: true }),
            new TextRun(`${fmt(totalClients)} RON`)
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🏢 Cui datorezi (Furnizori): ', bold: true }),
            new TextRun(`${fmt(suppliers)} RON`)
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '📦 Valoare stocuri: ', bold: true }),
            new TextRun(`${fmt(stocks)} RON`)
          ],
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '🎯 INDICATORI CHEIE',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Sănătate financiară: ${healthStatus} (${healthColor})`, bold: true })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Număr alerte identificate: ${alertsCount}`, bold: true })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Direcție recomandată: ', bold: true }),
            new TextRun(alertsCount > 2 ? 'Acțiune URGENTĂ necesară' : alertsCount > 0 ? 'Monitorizare atentă' : 'Continuă astfel')
          ],
          spacing: { after: 600 }
        })
      );

      // === CALCULE FINANCIARE (folosite în mai multe secțiuni) ===
      let venituri = getClassSum(7, 'credit');
      const cheltuieli = getClassSum(6, 'debit');
      const { profitNet, isProfit } = calculateProfitLoss();
      
      // FIX #4: VALIDARE ANOMALII - Verifică integritatea balanței
      const anomalii: string[] = [];
      
      // Verificare 1: Conturile 1-5 nu trebuie să aibă simultan sold debitor și creditor
      for (let classNum = 1; classNum <= 5; classNum++) {
        const conturi_clasa = accounts.filter(a => a.accountClass === classNum);
        conturi_clasa.forEach(cont => {
          if (cont.debit > 0 && cont.credit > 0) {
            anomalii.push(`⚠️ Cont ${cont.code}: Sold DEBIT (${fmt(cont.debit)}) și CREDIT (${fmt(cont.credit)}) simultan - INCORECT pentru clase 1-5!`);
          }
        });
      }
      
      // Verificare 2: Total Debit = Total Credit pentru clasele 6-7
      const total_debit_67 = getClassSum(6, 'debit') + getClassSum(7, 'debit');
      const total_credit_67 = getClassSum(6, 'credit') + getClassSum(7, 'credit');
      const diferenta_67 = Math.abs(total_debit_67 - total_credit_67);
      
      if (diferenta_67 > 1) { // Toleranță 1 RON pentru rotunjiri
        anomalii.push(`⚠️ Clase 6-7: Total DEBIT (${fmt(total_debit_67)}) ≠ Total CREDIT (${fmt(total_credit_67)}) - Diferență: ${fmt(diferenta_67)} RON - Balanța este NEBALANSATĂ!`);
      }
      
      // Verificare 3: Cont 121 (Profit/Pierdere) - nu poate avea simultan debit și credit
      const profit_debit = getAccountValue('121', 'debit');
      const profit_credit = getAccountValue('121', 'credit');
      if (profit_debit > 0 && profit_credit > 0) {
        anomalii.push(`⚠️ Cont 121 (Profit/Pierdere): Sold DEBIT (${fmt(profit_debit)}) și CREDIT (${fmt(profit_credit)}) simultan - IMPOSIBIL! Firma nu poate avea simultan profit și pierdere.`);
      }
      
      // Cash pentru analiza "Unde sunt banii?" - INCLUDE VALUTĂ!
      const cash_banca_lei = getAccountValue('5121', 'debit');
      const cash_banca_valuta = getAccountValue('5124', 'debit'); // FIX: EUR/USD
      const cash_casa = getAccountValue('5311', 'debit');
      const total_cash = cash_banca_lei + cash_banca_valuta + cash_casa;
      const diferenta_profit_cash = profitNet - total_cash;
      
      // Debug logging pentru cash detaliat
      console.log('💰 CASH TOTAL DETALIAT:');
      console.log(`   Bancă LEI (5121): ${fmt(cash_banca_lei)} RON`);
      console.log(`   Bancă VALUTĂ (5124): ${fmt(cash_banca_valuta)} RON`);
      console.log(`   Casă (5311): ${fmt(cash_casa)} RON`);
      console.log(`   ${'━'.repeat(30)}`);
      console.log(`   TOTAL: ${fmt(total_cash)} RON`);
      
      // Reconstitui venituri dacă lipsesc din balanță
      let venituri_reconstituite = false;
      if (venituri === 0 && profitNet !== 0) {
        venituri = profitNet + cheltuieli;
        venituri_reconstituite = true;
        console.log(`⚠️ Venituri reconstituite: ${fmt(venituri)} RON (Profit ${fmt(profitNet)} + Cheltuieli ${fmt(cheltuieli)})`);
      }
      
      // Calculează marja netă
      const marjaNet = venituri > 0 ? (profitNet / venituri) * 100 : 0;
      
      // === FIX #6: DEBUG LOGGING - CALCULE FINANCIARE ===
      console.log('\n' + '='.repeat(60));
      console.log('💰 CALCULE FINANCIARE:');
      console.log('='.repeat(60));
      console.log(`  Venituri clasa 7: ${fmt(venituri)} RON`);
      if (venituri_reconstituite) {
        console.log(`  ⚠️ VENITURI RECONSTITUITE din Profit + Cheltuieli`);
      }
      console.log(`  Cheltuieli clasa 6: ${fmt(cheltuieli)} RON`);
      console.log(`  Profit cont 121: ${fmt(profitNet)} RON`);
      console.log(`  Marja netă: ${marjaNet.toFixed(2)}%`);
      console.log(`  Cash total (bancă + casă): ${fmt(total_cash)} RON`);
      console.log(`  Diferență profit-cash: ${fmt(diferenta_profit_cash)} RON`);
      console.log('='.repeat(60));

      // FIX #4: AFIȘARE ANOMALII DETECTATE (dacă există)
      if (anomalii.length > 0) {
        docSections.push(
          new Paragraph({
            text: '⚠️ ANOMALII DETECTATE ÎN BALANȚĂ',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: '🔴 ATENȚIE: Balanța ta conține erori care trebuie corectate!', 
                bold: true, 
                color: 'FF0000',
                size: 28
              })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: 'Următoarele anomalii au fost detectate automat și necesită atenție:',
            spacing: { after: 300 }
          })
        );
        
        anomalii.forEach((anomalie, index) => {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. `, bold: true, color: 'FF0000' }),
                new TextRun({ text: anomalie })
              ],
              spacing: { after: 200 }
            })
          );
        });
        
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: '💡 Recomandare: ', 
                bold: true, 
                color: 'FF8C00' 
              }),
              new TextRun({ 
                text: 'Corectează aceste erori în contabilitate înainte de a lua decizii pe baza acestui raport. Contactează contabilul pentru clarificări.' 
              })
            ],
            spacing: { after: 600 }
          })
        );
      }

      // === FIX #3: PROFIL COMPANIE ===
      docSections.push(
        new Paragraph({
          text: '📋 PROFILUL COMPANIEI',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 400 }
        })
      );

      const are_stocuri = getClassSum(3, 'debit') > 0;
      const are_salariati = getAccountValue('641', 'debit') > 0;
      const creante_minime = getAccountsSum(/^411/, 'debit') < 1000;
      const marja_foarte_mare = marjaNet > 90;

      // FIX #2: PROFIL BUSINESS - Prioritizează natura veniturilor (704/707/701)
      const venituri_servicii = getAccountValue('704', 'credit');   // Servicii
      const venituri_marfuri = getAccountValue('707', 'credit');    // Mărfuri  
      const venituri_productie = getAccountValue('701', 'credit');  // Producție
      const total_venituri_identificate = venituri_servicii + venituri_marfuri + venituri_productie;

      let tip_business = '';
      let caracteristici: string[] = [];

      // Prioritate #1: Natura veniturilor (cel mai fiabil indicator!)
      if (venituri_servicii > 0 && venituri_marfuri === 0 && venituri_productie === 0) {
        tip_business = '✅ Prestări servicii (cont 704)';
        caracteristici = [
          `✅ 100% venituri din servicii (${fmt(venituri_servicii)} RON)`,
          '✅ Fără stocuri (normal pentru servicii)',
          creante_minime ? '✅ Încasări rapide' : '⚠️ Creanțe mari - monitorizează DSO',
          marja_foarte_mare ? '🚀 Marje excepționale (90%+)' : `📊 Marja netă: ${marjaNet.toFixed(1)}%`
        ];
      } else if (venituri_marfuri > venituri_productie && venituri_marfuri > venituri_servicii) {
        tip_business = '📦 Comerț mărfuri (cont 707)';
        caracteristici = [
          `📦 Venituri mărfuri: ${fmt(venituri_marfuri)} RON`,
          are_stocuri ? '✅ Stocuri prezente (cont 371)' : '⚠️ Lipsă stocuri - neobișnuit pentru comerț!',
          `📊 Marja netă: ${marjaNet.toFixed(1)}%`,
          creante_minime ? '✅ Încasări rapide' : '⚠️ Creanțe mari'
        ];
      } else if (venituri_productie > 0) {
        tip_business = '🏭 Producție (cont 701)';
        caracteristici = [
          `🏭 Venituri producție: ${fmt(venituri_productie)} RON`,
          are_stocuri ? '✅ Stocuri materii prime + produse finite' : '⚠️ Lipsă stocuri - verifică!',
          `📊 Marja netă: ${marjaNet.toFixed(1)}%`
        ];
      } else if (total_venituri_identificate > 0) {
        tip_business = '🔄 Activitate mixtă';
        caracteristici = [];
        if (venituri_servicii > 0) caracteristici.push(`Servicii (704): ${fmt(venituri_servicii)} RON`);
        if (venituri_marfuri > 0) caracteristici.push(`Mărfuri (707): ${fmt(venituri_marfuri)} RON`);
        if (venituri_productie > 0) caracteristici.push(`Producție (701): ${fmt(venituri_productie)} RON`);
        caracteristici.push(`📊 Marja netă: ${marjaNet.toFixed(1)}%`);
      } else if (marja_foarte_mare && !are_stocuri && creante_minime) {
        // Fallback pentru cazuri speciale (IT fără cont 704, consultanță)
        tip_business = '💻 Software/IT (marje foarte mari, fără cont 704 identificat)';
        caracteristici = [
          '✅ Marje extraordinare (90%+)',
          '✅ Model asset-light',
          '✅ Încasări rapide',
          '⚠️ Verifică încadrarea corectă a veniturilor în cont 704'
        ];
      } else {
        tip_business = '❓ Neidentificat (lipsesc conturile de venituri 70x)';
        caracteristici = [
          are_stocuri ? '📦 Are stocuri' : '✅ Fără stocuri',
          `📊 Marja netă: ${marjaNet.toFixed(1)}%`,
          '⚠️ IMPORTANT: Verifică încadrarea corectă a veniturilor în conturile 701/704/707'
        ];
      }

      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Tip business identificat: ', bold: true }),
            new TextRun({ text: tip_business, color: '0066CC' })
          ],
          spacing: { after: 200 }
        })
      );

      caracteristici.forEach(c => {
        docSections.push(new Paragraph({ text: `   ${c}`, spacing: { after: 100 } }));
      });

      if (marja_foarte_mare && total_cash < 10000) {
        docSections.push(
          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: '⚠️ ALERTĂ SPECIFICĂ BUSINESS-ULUI TĂU:', bold: true, color: 'FF0000' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({ text: 'Model cu marje foarte mari dar cash EXTREM de scăzut!', spacing: { after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: '🎯 PRIORITATE MAXIMĂ: ', bold: true, color: 'FF8C00' }),
              new TextRun({ text: 'Citește secțiunea "Unde Sunt Banii?" pentru investigație detaliată!' })
            ],
            spacing: { after: 400 }
          })
        );
      }

      // === RECOMANDĂRI PERSONALIZATE (bazate pe profilul companiei) ===
      docSections.push(
        new Paragraph({ text: '', spacing: { before: 400 } }),
        new Paragraph({
          text: '🎯 RECOMANDĂRI PERSONALIZATE',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Bazate pe profilul tău de business: ', bold: true }),
            new TextRun({ text: tip_business, color: '0066CC', bold: true })
          ],
          spacing: { after: 400 }
        })
      );

      // Recomandări specifice în funcție de tip business
      if (marja_foarte_mare && !are_stocuri && creante_minime) {
        // SOFTWARE/IT cu marje foarte mari
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '1️⃣ SCALING RAPID (prioritate maximă):', bold: true, size: 28, color: '008000' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: `Cu marje de ${marjaNet.toFixed(1)}%, ai cea mai profitabilă industrie din România! Fiecare client nou = aproape 100% profit.`,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '⚡ ACȚIUNI CONCRETE:', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Investește MASIV în marketing (Google Ads, LinkedIn): 1 client nou = câștig instant',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Automatizează tot ce poți: onboarding clienți, rapoarte, facturare',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Creează pachete recurente (SaaS, mentenanță): venit predictibil',
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2️⃣ DIVERSIFICARE PORTOFOLIU CLIENȚI:', bold: true, size: 28, color: 'FF8C00' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '⚠️ RISC: Ești vulnerabil dacă pierzi un client mare.',
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '🎯 TARGET:', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Niciun client să nu reprezinte >30% din venituri',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Minim 5-10 clienți activi simultan',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Contracte pe minim 6-12 luni (stabilitate)',
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3️⃣ OPTIMIZARE FISCALĂ AGRESIVĂ:', bold: true, size: 28, color: '0066CC' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: `Cu profit de ${fmt(profitNet)} RON la marje de ${marjaNet.toFixed(1)}%, impozitarea e critică!`,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '   → Micro-întreprindere (1% sau 3% pe venit): salvează ENORM la taxe',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Dividende (10% impozit FINAL) vs salarii (45%+ taxe): diferență URIAȘĂ',
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '      📌 Detalii impozitare dividende 2025:\n', bold: true, italics: true, size: 20 }),
              new TextRun({ text: '      • Impozit: 10% (reținut la sursă de firmă, final)\n', italics: true }),
              new TextRun({ text: '      • Termen plată: până pe 25 a lunii următoare\n', italics: true }),
              new TextRun({ text: '      • CASS 10% adițional DOAR dacă venituri totale >24.300 lei/an\n', italics: true }),
              new TextRun({ text: '        (dividende + PFA + chirii + drepturi autor)\n', italics: true, size: 18 })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '   → Consultă specialist fiscal pentru setup optim',
            spacing: { after: 400 }
          })
        );

        if (total_cash < profitNet * 0.5) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '⚠️ ALERTĂ CASH MANAGEMENT:', bold: true, size: 28, color: 'FF0000' })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Profit ${fmt(profitNet)} RON dar cash doar ${fmt(total_cash)} RON → Banii au fost retrași.`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: '🎯 RECOMANDARE: Păstrează minim 20-30% din profit în firmă ca "buffer urgențe"',
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: '   → Echipamente noi, server crash, oportunitate mare: ai nevoie de cash instant',
              spacing: { after: 400 }
            })
          );
        }

      } else if (!are_stocuri && creante_minime) {
        // SERVICII (consultanță, intermediere)
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '1️⃣ CREȘTERE MARJĂ PROFIT:', bold: true, size: 28, color: '008000' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: `Marja actuală: ${marjaNet.toFixed(1)}%. ${marjaNet < 20 ? 'Sub standardul industriei (20-30%)!' : 'Bună, dar poate fi mai mare!'}`,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '⚡ TACTICI RAPIDE:', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → UP-SELLING: oferă pachete premium (+30-50% preț pentru "servicii VIP")',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → CROSS-SELLING: vinde servicii adiționale clienților existenți',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → EFICIENTIZARE: automatizează procese repetitive → mai mult timp pentru clienți noi',
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2️⃣ STANDARDIZARE SERVICII:', bold: true, size: 28, color: 'FF8C00' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Transformă servicii "bespoke" în pachete fixe:',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '   ✅ AVANTAJE: vânzare mai rapidă, delivery mai rapid, predictibilitate',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   ✅ EXEMPLU: În loc de "consultanță personalizată", oferă "Audit Standard" + "Audit Premium"',
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3️⃣ RECURENȚĂ & RETENȚIE:', bold: true, size: 28, color: '0066CC' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '🎯 OBIECTIV: Transformă clienți one-time în clienți recurenți',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '   → Contracte lunare/anuale cu plată recurentă',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Pachete mentenanță/suport ongoing',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Follow-up automat: verifică satisfacție → oportunități de re-vânzare',
            spacing: { after: 400 }
          })
        );

      } else {
        // COMERȚ/PRODUCȚIE
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '1️⃣ OPTIMIZARE COST MARFĂ/PRODUCȚIE:', bold: true, size: 28, color: '008000' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'În comerț/producție, marja se face la ACHIZIȚIE, nu la vânzare!',
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '⚡ TACTICI AGRESIVE:', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → RENEGOCIAZĂ cu furnizori: cere discount 5-10% pentru volume mari sau plată rapidă',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → SCHIMBĂ furnizori: testează 2-3 alternative → compară calitate/preț',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → IMPORT DIRECT: dacă volume mari, elimină intermediari',
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2️⃣ MANAGEMENT STOCURI:', bold: true, size: 28, color: 'FF8C00' })
            ],
            spacing: { after: 200 }
          })
        );

        if (are_stocuri) {
          const stocuri_valoare = getClassSum(3, 'debit');
          docSections.push(
            new Paragraph({
              text: `Ai ${fmt(stocuri_valoare)} RON în stocuri → bani "înghețați" care nu generează profit!`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '🎯 ACȚIUNI:', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: '   → Identifică stocuri "moarte" (>90 zile fără mișcare): LICHIDEAZĂ urgent',
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: '   → Comandă just-in-time: doar ce vinzi rapid → eliberează cash',
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: '   → Negociază cu furnizori: plată la 30-60 zile → cash flow îmbunătățit',
              spacing: { after: 400 }
            })
          );
        } else {
          docSections.push(
            new Paragraph({
              text: '✅ Bine că nu ai stocuri mari! Păstrează acest model lean.',
              spacing: { after: 400 }
            })
          );
        }

        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '3️⃣ CREȘTERE MARJĂ BRUTĂ:', bold: true, size: 28, color: '0066CC' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: `Marja actuală: ${marjaNet.toFixed(1)}%. ${marjaNet < 15 ? 'PREA MIC pentru comerț!' : marjaNet < 30 ? 'Medie, dar poate crește!' : 'Excelent!'}`,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '   → Crește prețuri cu 5-10%: majoritatea clienților nu pleacă pentru diferențe mici',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Adaugă servicii conexe: instalare, suport, garanții extinse → marjă mare',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Focus pe produse cu marjă mare: elimină treptat produse low-margin',
            spacing: { after: 400 }
          })
        );
      }

      // Recomandare generală finală pentru toate tipurile de business
      docSections.push(
        new Paragraph({
          text: '─'.repeat(70),
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '💬 ÎNTREBĂRI DESPRE RECOMANDĂRILE DE MAI SUS?', bold: true, size: 28, color: '0066CC' })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Întreabă Chat AI YANA pentru strategii personalizate pentru business-ul tău specific!',
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Exemple:',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `  • "Cum pot crește marja de la ${marjaNet.toFixed(1)}% la 30%?"`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "Care sunt cei mai buni furnizori pentru industria mea?"',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "Cum automatizez procesele repetitive?"',
          spacing: { after: 600 }
        })
      );

      // === FIX #1: NOTĂ VENITURI RECONSTITUITE + FIX #2: UNDE SUNT BANII ===
      if (venituri_reconstituite) {
        docSections.push(
          new Paragraph({ text: '', spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: '⚠️ NOTĂ TEHNICĂ: ', bold: true, color: 'FF8C00' }),
              new TextRun({ text: 'Veniturile au fost reconstituite matematic: ' }),
              new TextRun({ text: 'Venituri = Profit + Cheltuieli', italics: true, bold: true }),
              new TextRun({ text: ` → ${fmt(venituri)} RON` })
            ],
            spacing: { after: 400 }
          })
        );
      }

      docSections.push(
        new Paragraph({ text: '', pageBreakBefore: true }),
        new Paragraph({ text: '🔍 ANALIZA CRITICĂ: Unde Sunt Banii?', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
        new Paragraph({ text: 'Aceasta este cea mai importantă secțiune!', spacing: { after: 400 } })
      );

      // FIX #1: CONT 4551 - Separă BĂGAT (credit) vs RETRAS (debit)
      const asociati_bagat = getAccountValue('4551', 'credit') + 
                             getAccountValue('456', 'credit') + 
                             getAccountValue('4582', 'credit');
      
      const asociati_retras = getAccountValue('4551', 'debit') + 
                              getAccountValue('456', 'debit') + 
                              getAccountValue('4582', 'debit');
      
      const imobilizari = getClassSum(2, 'debit');
      const creante_clienti = getAccountsSum(/^411/, 'debit');

      docSections.push(
        new Paragraph({ children: [new TextRun({ text: 'DISCREPANȚA PROFIT vs CASH:', bold: true, size: 28 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun('Profit (cont 121): '), new TextRun({ text: `${fmt(profitNet)} RON ✅`, bold: true, color: '008000' })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun('Cash real: '), new TextRun({ text: `${fmt(total_cash)} RON ⚠️`, bold: true, color: 'FF0000' })], spacing: { after: 100 } }),
        new Paragraph({ text: '─'.repeat(70), spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun('DIFERENȚĂ: '), new TextRun({ text: `${fmt(diferenta_profit_cash)} RON ❓`, bold: true, size: 32, color: 'FF0000' })], spacing: { after: 400 } })
      );

      // Afișează BĂGAT (sold creditoare = investiție în firmă)
      if (asociati_bagat > 0) {
        docSections.push(
          new Paragraph({ 
            children: [
              new TextRun({ text: '1️⃣ BANII BĂGAȚI DE ASOCIAȚI: ', bold: true, color: '008000' }), 
              new TextRun({ text: `${fmt(asociati_bagat)} RON`, bold: true })
            ], 
            spacing: { after: 200 } 
          }),
          new Paragraph({ 
            text: '💡 Asociații au INVESTIT în firmă (sold creditoare 4551/456/4582) - firma datorează asociaților acești bani. Îi poți returna prin dividende sau rambursare.',
            spacing: { after: 400 } 
          })
        );
      }
      
      // Afișează RETRAS (sold debitoare = retragere din firmă)
      if (asociati_retras > 0) {
        docSections.push(
          new Paragraph({ 
            children: [
              new TextRun({ text: '1️⃣ BANII RETRAȘI DE ASOCIAȚI: ', bold: true, color: 'FF8C00' }), 
              new TextRun({ text: `${fmt(asociati_retras)} RON`, bold: true })
            ], 
            spacing: { after: 200 } 
          }),
          new Paragraph({ 
            text: '💡 Asociații au RETRAS bani din firmă (sold debitoare 4551/456/4582) - asociații datorează firmei. Trebuie regularizat prin dividende sau returnare bani.',
            spacing: { after: 400 } 
          })
        );
      }

      // === EXPLICAȚII CONTURI CHEIE ===
      docSections.push(
        new Paragraph({
          text: '💡 EXPLICAȚII PE LIMBA TA - Ce Înseamnă Conturile Tale',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
        })
      );
      
      // Key accounts with simple explanations
      const keyAccounts = [
        {
          code: '5121',
          title: '🏦 Banii firmei tale în bancă (Cont 5121 - LEI)',
          what: `Ai în cont bancar LEI: ${fmt(cash_banca_lei)} RON`,
          why: 'Acestea sunt banii disponibili imediat pentru plăți. Îi poți folosi oricând ai nevoie.',
          check: 'Verifică lunar: Are firma suficienți bani pentru furnizori și salarii? Dacă nu, trebuie să încasezi urgent de la clienți.',
          optimize: cash_banca_lei < 50000 ? 'IMPORTANT: Sold scăzut! Concentrează-te pe încasări rapide de la clienți.' : 'Bine! Ai lichiditate suficientă.'
        },
        {
          code: '5124',
          title: '💶 Banii firmei în VALUTĂ (Cont 5124 - EUR/USD)',
          what: `Ai în cont bancar în valută: ${fmt(cash_banca_valuta)} RON (echivalent)`,
          why: 'Conturi în EUR/USD pentru tranzacții internaționale. Protejează împotriva fluctuațiilor de curs.',
          check: 'Verifică lunar: Cursul EUR/RON a evoluat favorabil? Convertești în RON sau păstrezi?',
          optimize: cash_banca_valuta > 100000 
            ? '⚠️ Sume mari în valută - consideră hedging valutar (contracte forward cu banca)' 
            : cash_banca_valuta > 0 
              ? '✅ Bine! Ai diversificare valutară pentru plăți internaționale.'
              : 'N/A - Nu ai conturi în valută active.'
        },
        {
          code: '5311',
          title: '💵 Banii firmei tale în numerar - la casă (Cont 5311)',
          what: `Ai în casă: ${fmt(cash)} RON`,
          why: 'Bani cash pentru plăți mici zilnice. Legal, nu poți plăti peste 5.000 lei/zi în numerar între firme.',
          check: 'Verifică zilnic casa și ține evidența clară. Emite chitanțe pentru toate intrările/ieșirile.',
          optimize: cash > 10000 ? 'ATENȚIE: Prea mulți bani în casă = risc de furt. Depune la bancă!' : 'OK.'
        },
        {
          code: '411',
          title: '👥 Banii pe care trebuie să-i încasezi de la clienți (Cont 411/4111)',
          what: `Clienții îți datorează: ${fmt(totalClients)} RON`,
          why: 'Sunt bani blocați - tu ai livrat produse/servicii, dar nu i-ai primit încă. Risc: clientul poate să nu plătească.',
          check: 'Verifică lunar: Cine îți datorează? De cât timp? Sună clienții cu întârzieri! Trimite notificări la 30 zile.',
          optimize: totalClients > bank * 2 ? 'ATENȚIE: Ai prea mulți bani în clienți! Risc mare de cash-flow. Încearcă: discount 2% pentru plată imediată.' : 'OK, nivel acceptabil.'
        },
        {
          code: '401',
          title: '🏢 Banii pe care îi datorezi furnizorilor (Cont 401)',
          what: `Datorezi furnizorilor: ${fmt(suppliers)} RON`,
          why: 'Ai primit produse/servicii, dar nu ai plătit încă. Atenție la termene - întârzierea = penalități!',
          check: 'Verifică săptămânal: Ce facturi expirăîn curând? Prioritizează plățile importante (utilități, chirii).',
          optimize: suppliers > bank * 1.5 ? 'ATENȚIE CRITICĂ: Datorezi mai mult decât ai în bancă! Urgență: negociază termene cu furnizorii.' : 'OK.'
        },
        {
          code: '4423',
          title: '💸 TVA de plată către stat (Cont 4423)',
          what: `Datorezi TVA: ${fmt(get('4423').credit)} RON`,
          why: 'TVA colectat de la clienți minus TVA plătit la furnizori. Termen: 25 ale lunii următoare.',
          check: 'OBLIGATORIU: Verifică că ai bani pentru TVA înainte de 25! Întârzierea = penalități 0.02%/zi.',
          optimize: get('4423').credit > bank * 0.3 ? 'RISC: TVA-ul e mare față de lichidități. Păstrează banii deoparte!' : 'OK.'
        },
        {
          code: '4424',
          title: '💰 TVA de recuperat de la stat (Cont 4424)',
          what: `Ai de recuperat TVA: ${fmt(get('4424').debit)} RON`,
          why: 'Ai plătit mai mult TVA la achiziții decât ai colectat de la clienți. Poți recupera diferența de la stat.',
          check: 'Poți cere rambursare sau compensa în lunile următoare când vei avea TVA de plată.',
          optimize: 'Bine! Reprezintă o creanță la stat.'
        },
        {
          code: '371',
          title: '📦 Valoarea stocurilor (Cont 371)',
          what: `Ai stocuri de: ${fmt(stocks)} RON`,
          why: 'Produse/mărfuri în depozit. Bani blocați până vinzi produsele.',
          check: 'Lunar: Care produse stau mult în stoc? Fă inventar fizic trimestrial.',
          optimize: stocks > bank ? 'ATENȚIE: Prea multe stocuri! Banii tăi stau în depozit. Încearcă: promoții pentru produse slow-moving.' : 'OK.'
        },
        {
          code: '121',
          title: '📈 Rezultatul tău - Profit sau Pierdere (Cont 121)',
          what: `Rezultat: ${profitOrLoss >= 0 ? 'PROFIT' : 'PIERDERE'} de ${fmt(Math.abs(profitOrLoss))} RON`,
          why: profitOrLoss >= 0 ? 'Bravo! Veniturile au depășit cheltuielile. Poți reinvesti sau distribui dividende.' : 'Atenție! Cheltuielile au depășit veniturile. Trebuie acoperită pierderea.',
          check: 'Compară cu anul trecut. Crește profitul? Scade? De ce?',
          optimize: profitOrLoss < 0 ? 'URGENT: Pierdere! Analizează: Care cheltuieli pot fi reduse? Cum creșți vânzările?' : profitOrLoss < 10000 ? 'Profit mic. Caută oportunități de creștere.' : 'Excelent! Continuă strategia actuală.'
        }
      ];
      
      keyAccounts.forEach(acc => {
        const accountData = get(acc.code);
        if (accountData.sold > 0 || acc.code === '121' || acc.code === '4423' || acc.code === '4424') {
          docSections.push(
            new Paragraph({
              text: acc.title,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '📌 Ce ai: ', bold: true }),
                new TextRun(acc.what)
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '🔍 De ce contează: ', bold: true }),
                new TextRun(acc.why)
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '✅ Ce să verifici: ', bold: true }),
                new TextRun(acc.check)
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '⚡ Optimizări posibile: ', bold: true }),
                new TextRun(acc.optimize)
              ],
              spacing: { after: 300 }
            })
          );
        }
      });
      
      // === ZONE DE RISC ===
      docSections.push(
        new Paragraph({
          text: '⚠️ ZONE DE RISC ȘI ALERTE IDENTIFICATE',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        })
      );
      
      const risks: Array<{ type: string; message: string; severity: string }> = [];
      
      if (totalCash < 20000) {
        risks.push({
          type: '🔴 CRICTIC',
          message: `Lichiditate foarte scăzută (${fmt(totalCash)} RON). Risc de incapacitate de plată.`,
          severity: 'URGENT'
        });
      }
      
      if (get('4423').credit > bank * 0.5) {
        risks.push({
          type: '🔴 CRITIC',
          message: `TVA de plată (${fmt(get('4423').credit)} RON) este peste 50% din banii din bancă. Risc de neplată la termen.`,
          severity: 'URGENT'
        });
      }
      
      if (suppliers > bank * 1.5) {
        risks.push({
          type: '🔴 CRITIC',
          message: `Datorii furnizori (${fmt(suppliers)} RON) depășesc semnificativ disponibilitățile bancare.`,
          severity: 'URGENT'
        });
      }
      
      if (profitOrLoss < 0) {
        risks.push({
          type: '🟡 AVERTISMENT',
          message: `Pierdere în cont 121: ${fmt(Math.abs(profitOrLoss))} RON. Revizuiește structura de costuri.`,
          severity: 'MEDIU'
        });
      }
      
      if (cash > 10000) {
        risks.push({
          type: '🟡 AVERTISMENT',
          message: `Numerar prea mare în casă (${fmt(cash)} RON). Risc de furt/pierdere.`,
          severity: 'MEDIU'
        });
      }
      
      // FIX #3: Elimină limbaj speculativ - doar fapte concrete
      if (stocks > bank * 2) {
        risks.push({
          type: '🟡 AVERTISMENT',
          message: `Stocuri mari (${fmt(stocks)} RON) depășesc de 2x lichiditatea bancară. Verifică rotația stocurilor (DIO) pentru a confirma eficiența.`,
          severity: 'MEDIU'
        });
      }
      
      if (risks.length === 0) {
        docSections.push(
          new Paragraph({
            text: '✅ Felicitări! Nu au fost identificate zone critice de risc.',
            spacing: { after: 300 }
          })
        );
      } else {
        risks.forEach(risk => {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${risk.type} - `, bold: true }),
                new TextRun({ text: `${risk.message}`, bold: false })
              ],
              spacing: { after: 200 }
            })
          );
        });
      }
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `TOTAL ALERTE: ${risks.length}`, bold: true })
          ],
          spacing: { before: 300, after: 600 }
        })
      );
      
      // === SOLUȚII DE OPTIMIZARE ===
      docSections.push(
        new Paragraph({
          text: '💡 SOLUȚII DE OPTIMIZARE - Pașii Următori',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
          text: '🚀 ACȚIUNI IMEDIATE (0-7 zile)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          text: '• Contactează clienții cu facturi restante peste 30 zile',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Verifică scadențele furnizori și prioritizează plățile critice',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Asigură-te că ai bani pentru TVA până pe 25',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Depune numerarul peste 5.000 lei la bancă',
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '📅 ACȚIUNI PE TERMEN MEDIU (1-3 luni)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          text: '• Implementează sistem de monitorizare clienți (alerte automate la 30/60/90 zile)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Negociază termene mai bune cu furnizorii principali',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Analizează stocurile cu mișcare lentă și fă promoții',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Creează un buffer de siguranță = 3 luni de cheltuieli fixe',
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '🎯 STRATEGIE PE TERMEN LUNG (3-12 luni)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          text: '• Diversifică clienții (risc concentrare)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Optimizează structura de costuri (target: cheltuieli < 70% din venituri)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Automatizează procesele contabile pentru reducerea erorilor',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '• Implementează dashboard financiar pentru monitorizare în timp real',
          spacing: { after: 600 }
        })
      );
      
      // === CHECKLIST LUNAR ===
      docSections.push(
        new Paragraph({
          text: '✅ CHECKLIST LUNAR - Nu Uita!',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
          text: '📋 OBLIGATORII (Legal)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 150 }
        }),
        new Paragraph({
          text: '□ Depune declarația de TVA (până pe 25)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Plătește TVA-ul datorat (până pe 25)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Verifică și plătește contribuțiile sociale (CAS, CASS)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Depune D112 (declarația privind obligațiile de plată)',
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '💰 FINANCIARE (Recomandate)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 150 }
        }),
        new Paragraph({
          text: '□ Reconciliază conturile bancare cu evidența contabilă',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Verifică casa și fă inventarul numerarului',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Analizează facturile neîncasate de la clienți',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Verifică scadențele facturilor către furnizori',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Calculează indicatorii cheie (lichiditate, profitabilitate)',
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '🔍 ANALIZĂ STRATEGICĂ (Lunar)',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 150 }
        }),
        new Paragraph({
          text: '□ Compară rezultatele cu luna precedentă',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Identifică tendințele (venituri/cheltuieli în creștere/scădere)',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Analizează rentabilitatea pe produse/servicii',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '□ Revizuiește prognoza de cash-flow pentru luna următoare',
          spacing: { after: 600 }
        })
      );
      
      // === FIX #5: COMPARAȚIE CU LUNA PRECEDENTĂ ===
      if (previousReport) {
        console.log('\n🔍 Generez secțiune COMPARAȚIE cu luna precedentă...');
        
        // Calculează evoluții procentuale
        const prev_total_cash = (previousReport.cash_banca || 0) + (previousReport.cash_casa || 0);
        
        const evol_profit = previousReport.profit_net !== 0 
          ? ((profitNet - previousReport.profit_net) / Math.abs(previousReport.profit_net)) * 100 
          : 0;
          
        const evol_cash = prev_total_cash !== 0
          ? ((total_cash - prev_total_cash) / prev_total_cash) * 100
          : 0;
          
        const evol_venituri = previousReport.venituri_totale !== 0
          ? ((venituri - previousReport.venituri_totale) / previousReport.venituri_totale) * 100
          : 0;
          
        const evol_cheltuieli = previousReport.cheltuieli_totale !== 0
          ? ((cheltuieli - previousReport.cheltuieli_totale) / previousReport.cheltuieli_totale) * 100
          : 0;
          
        const evol_marja = marjaNet - (previousReport.marja_neta || 0);
        
        // Funcție helper pentru emoji evoluție
        const getEvolEmoji = (value: number, invers = false) => {
          const val = invers ? -value : value;
          if (val > 10) return '🟢';
          if (val > 0) return '🟡';
          if (val > -10) return '🟠';
          return '🔴';
        };
        
        // Header secțiune
        docSections.push(
          new Paragraph({ text: '', pageBreakBefore: true }),
          new Paragraph({
            text: '📊 COMPARAȚIE CU LUNA PRECEDENTĂ',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${format(new Date(endDate), 'MMMM yyyy', { locale: ro })} vs ${format(new Date(previousReport.perioada_end), 'MMMM yyyy', { locale: ro })}`,
                italics: true,
                size: 24
              })
            ],
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [new TextRun({ text: 'INDICATOR', bold: true })],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '━'.repeat(70),
            spacing: { after: 200 }
          })
        );
        
        // Linie 1: Profit
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '💰 PROFIT\n', bold: true, size: 24 })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Actual:    ${fmt(profitNet)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `   Precedent: ${fmt(previousReport.profit_net)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `   Evoluție:  ` }),
              new TextRun({
                text: `${evol_profit > 0 ? '+' : ''}${evol_profit.toFixed(1)}% ${getEvolEmoji(evol_profit)}`,
                bold: true,
                color: evol_profit > 0 ? '008000' : 'FF0000'
              })
            ],
            spacing: { after: 300 }
          })
        );
        
        // Linie 2: Cash
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '💵 CASH (bancă + casă)\n', bold: true, size: 24 })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Actual:    ${fmt(total_cash)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `   Precedent: ${fmt(prev_total_cash)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `   Evoluție:  ` }),
              new TextRun({
                text: `${evol_cash > 0 ? '+' : ''}${evol_cash.toFixed(1)}% ${getEvolEmoji(evol_cash)}`,
                bold: true,
                color: evol_cash > 0 ? '008000' : 'FF0000'
              })
            ],
            spacing: { after: 300 }
          })
        );
        
        // Linie 3: Venituri
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '📈 VENITURI\n', bold: true, size: 24 })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Actual:    ${fmt(venituri)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `   Precedent: ${fmt(previousReport.venituri_totale)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `   Evoluție:  ` }),
              new TextRun({
                text: `${evol_venituri > 0 ? '+' : ''}${evol_venituri.toFixed(1)}% ${getEvolEmoji(evol_venituri)}`,
                bold: true,
                color: evol_venituri > 0 ? '008000' : 'FF0000'
              })
            ],
            spacing: { after: 300 }
          })
        );
        
        // Linie 4: Cheltuieli
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '💸 CHELTUIELI\n', bold: true, size: 24 })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Actual:    ${fmt(cheltuieli)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `   Precedent: ${fmt(previousReport.cheltuieli_totale)} RON`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `   Evoluție:  ` }),
              new TextRun({
                text: `${evol_cheltuieli > 0 ? '+' : ''}${evol_cheltuieli.toFixed(1)}% ${getEvolEmoji(evol_cheltuieli, true)}`,
                bold: true,
                color: evol_cheltuieli < 0 ? '008000' : 'FF0000'
              })
            ],
            spacing: { after: 300 }
          })
        );
        
        // Linie 5: Marja
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '📊 MARJA NETĂ\n', bold: true, size: 24 })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Actual:    ${marjaNet.toFixed(1)}%`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `   Precedent: ${(previousReport.marja_neta || 0).toFixed(1)}%`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `   Evoluție:  ` }),
              new TextRun({
                text: `${evol_marja > 0 ? '+' : ''}${evol_marja.toFixed(1)}pp ${getEvolEmoji(evol_marja)}`,
                bold: true,
                color: evol_marja > 0 ? '008000' : 'FF0000'
              })
            ],
            spacing: { after: 400 }
          })
        );
        
        // INSIGHTS AUTOMATE
        docSections.push(
          new Paragraph({
            text: '━'.repeat(70),
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '🎯 INSIGHTS CHEIE:', bold: true, size: 28, color: '0066CC' })
            ],
            spacing: { after: 200 }
          })
        );
        
        // Îmbunătățiri detectate
        const imbunatatiri: string[] = [];
        if (evol_profit > 5) imbunatatiri.push(`✅ Profit crescut cu ${fmt(profitNet - previousReport.profit_net)} (+${evol_profit.toFixed(1)}%)`);
        if (evol_cheltuieli < -5) imbunatatiri.push(`✅ Cheltuieli reduse cu ${fmt(previousReport.cheltuieli_totale - cheltuieli)} (${evol_cheltuieli.toFixed(1)}%)`);
        if (evol_marja > 2) imbunatatiri.push(`✅ Marja îmbunătățită cu ${evol_marja.toFixed(1)} puncte procentuale`);
        if (evol_venituri > 5) imbunatatiri.push(`✅ Venituri crescute cu ${fmt(venituri - previousReport.venituri_totale)} (+${evol_venituri.toFixed(1)}%)`);
        if (evol_cash > 10) imbunatatiri.push(`✅ Cash crescut cu ${fmt(total_cash - prev_total_cash)} (+${evol_cash.toFixed(1)}%)`);
        
        if (imbunatatiri.length > 0) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '✅ ÎMBUNĂTĂȚIRI FAŢ DE LUNA PRECEDENTĂ:', bold: true, color: '008000', size: 24 })
              ],
              spacing: { after: 200 }
            })
          );
          imbunatatiri.forEach(i => {
            docSections.push(
              new Paragraph({
                text: `   ${i}`,
                spacing: { after: 100 }
              })
            );
          });
        }
        
        // Deteriorări detectate
        const deteriorari: string[] = [];
        if (evol_cash < -10) deteriorari.push(`⚠️ Cash scăzut cu ${fmt(prev_total_cash - total_cash)} (${evol_cash.toFixed(1)}%)`);
        if (evol_profit < -5) deteriorari.push(`⚠️ Profit scăzut cu ${fmt(previousReport.profit_net - profitNet)} (${evol_profit.toFixed(1)}%)`);
        if (evol_venituri < -5) deteriorari.push(`⚠️ Venituri scăzute cu ${fmt(previousReport.venituri_totale - venituri)} (${evol_venituri.toFixed(1)}%)`);
        if (evol_marja < -2) deteriorari.push(`⚠️ Marja scăzută cu ${Math.abs(evol_marja).toFixed(1)} puncte procentuale`);
        if (evol_cheltuieli > 15) deteriorari.push(`⚠️ Cheltuieli crescute cu ${fmt(cheltuieli - previousReport.cheltuieli_totale)} (+${evol_cheltuieli.toFixed(1)}%)`);
        
        if (deteriorari.length > 0) {
          docSections.push(
            new Paragraph({ text: '', spacing: { before: 300 } }),
            new Paragraph({
              children: [
                new TextRun({ text: '⚠️ DETERIORĂRI FAŢ DE LUNA PRECEDENTĂ:', bold: true, color: 'FF0000', size: 24 })
              ],
              spacing: { after: 200 }
            })
          );
          deteriorari.forEach(d => {
            docSections.push(
              new Paragraph({
                text: `   ${d}`,
                spacing: { after: 100 }
              })
            );
          });
        }
        
        // CONCLUZIE AUTOMATĂ
        docSections.push(
          new Paragraph({ text: '', spacing: { before: 400, after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: '💡 CONCLUZIE:', bold: true, color: '0066CC', size: 28 })
            ],
            spacing: { after: 200 }
          })
        );
        
        let concluzie = '';
        if (evol_profit > 10 && evol_cash > 0) {
          concluzie = '🚀 Business în CREȘTERE SĂNĂTOASĂ! Atât profitul cât și cash-ul cresc. Continuă strategia actuală și reinvestește în creștere.';
        } else if (evol_profit > 10 && evol_cash < -10) {
          concluzie = '⚡ Business PROFITABIL dar cu PROBLEME de LICHIDITATE! Profit mare dar cash scăzut. PRIORITATE: Îmbunătățește cash flow-ul (încasează mai repede, plătește mai târziu).';
        } else if (evol_profit < -10 && evol_venituri < 0) {
          concluzie = '🔴 ATENȚIE: Profitabilitate ȘI venituri în SCĂDERE! Situație critică. Ia măsuri URGENTE: crește vânzările sau reducere drastică cheltuieli.';
        } else if (evol_profit < -10 && evol_cheltuieli > 15) {
          concluzie = '🔴 ALERTĂ: Profit în scădere din cauza CREȘTERII RAPIDE a cheltuielilor! Analizează URGENT breakdown-ul cheltuielilor și elimină costuri inutile.';
        } else if (evol_cheltuieli < -10 && evol_profit > 5) {
          concluzie = '✅ OPTIMIZARE EXCELENTĂ! Ai redus cheltuielile și ai crescut profitul. Acesta este modelul perfect de eficientizare!';
        } else if (Math.abs(evol_profit) < 5 && Math.abs(evol_venituri) < 5) {
          concluzie = '📊 Evoluție STABILĂ. Business predictibil, fără schimbări majore. Monitorizează constant indicatorii pentru a detecta timpuriu tendințele.';
        } else {
          concluzie = '📈 Evoluție MIXTĂ. Unii indicatori în creștere, alții în scădere. Analizează în detaliu breakdown-ul cheltuielilor și secțiunea "Unde Sunt Banii?" pentru a înțelege dinamica.';
        }
        
        docSections.push(
          new Paragraph({
            text: concluzie,
            spacing: { after: 600 }
          })
        );
        
        console.log('✅ Secțiune COMPARAȚIE generată cu succes!');
      }
      
      // === NEW SECTION: INDICATORI FINANCIARI CHEIE ===
      docSections.push(
        new Paragraph({
          text: '📊 INDICATORI FINANCIARI CHEIE',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 400 },
          pageBreakBefore: true
        })
      );
      
      // === LICHIDITATE ===
      docSections.push(
        new Paragraph({
          text: '💧 Indicatori de Lichiditate',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
        })
      );
      
      // Calculate liquidity metrics
      const stocuri = getAccountsSum(/^3/, 'debit');
      const creanteClienti = getAccountsSum(/^411/, 'debit');
      const casa = getAccountValue('5311', 'debit');
      const bancaLei = getAccountValue('5121', 'debit');
      const bancaValuta = getAccountValue('5124', 'debit');
      const alteCreante = getAccountsSum(/^41[^1]/, 'debit');
      
      const activeCurente = stocuri + creanteClienti + casa + bancaLei + bancaValuta + alteCreante;
      
      const datoriiFurnizori = getAccountsSum(/^40/, 'credit');
      const datoriiSalarii = getAccountValue('421', 'credit');
      const datoriiCAS = getAccountValue('431', 'credit');
      const datoriiCASS = getAccountValue('437', 'credit');
      const datoriiTVA = getAccountValue('4423', 'credit');
      const datoriiImpozit = getAccountValue('4411', 'credit');
      const alteDatorii = getAccountsSum(/^44[^2]/, 'credit');
      const datoriiAsociati = getAccountsSum(/^45/, 'credit');
      
      const datoriiCurente = datoriiFurnizori + datoriiSalarii + datoriiCAS + datoriiCASS + 
                             datoriiTVA + datoriiImpozit + alteDatorii + datoriiAsociati;
      
      // 1. Lichiditate Generală
      const lichidGen = datoriiCurente > 0 ? activeCurente / datoriiCurente : 999;
      const statusLG = lichidGen >= 1.5 ? '🟢 EXCELENT' : lichidGen >= 1.0 ? '🟡 ACCEPTABIL' : '🔴 CRITIC';
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '1️⃣ LICHIDITATE GENERALĂ: ', bold: true }),
            new TextRun({ text: `${lichidGen.toFixed(2)} ${statusLG}`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`Pentru fiecare 1 RON datorat, ai ${lichidGen.toFixed(2)} RON disponibil.`)
          ],
          spacing: { after: 100 }
        })
      );
      
      if (lichidGen < 1.0 && datoriiCurente > 0) {
        const deficit = datoriiCurente - activeCurente;
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '🎯 ACȚIUNE URGENTĂ:', bold: true })
            ],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: `  • Trebuie să crești cash-ul cu ${fmt(deficit)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `  • Încasează URGENT de la clienți: ${fmt(creanteClienti)} RON`,
            spacing: { after: 100 }
          })
        );
        
        if (stocuri > 0) {
          docSections.push(
            new Paragraph({
              text: `  • Vinde stocuri pentru cash: ${fmt(stocuri * 0.3)} RON (30%)`,
              spacing: { after: 100 }
            })
          );
        }
      }
      
      // 2. Lichiditate Rapidă
      const activeLichide = activeCurente - stocuri;
      const lichidRapida = datoriiCurente > 0 ? activeLichide / datoriiCurente : 999;
      const statusLR = lichidRapida >= 1.0 ? '🟢 EXCELENT' : lichidRapida >= 0.5 ? '🟡 ACCEPTABIL' : '🔴 CRITIC';
      
      docSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '2️⃣ LICHIDITATE RAPIDĂ (Acid Test): ', bold: true }),
            new TextRun({ text: `${lichidRapida.toFixed(2)} ${statusLR}`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`Fără vânzarea stocurilor, ai ${lichidRapida.toFixed(2)} RON la fiecare 1 RON datorat.`)
          ],
          spacing: { after: 200 }
        })
      );
      
      if (activeCurente > 0) {
        const procentStocuri = (stocuri / activeCurente) * 100;
        if (procentStocuri > 60) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `🚨 CRIZĂ: ${procentStocuri.toFixed(0)}% din activele tale sunt BLOCATE în stocuri!`, bold: true })
              ],
              spacing: { after: 100 }
            })
          );
        }
      }
      
      // 3. Capital de Lucru
      const capitalLucru = activeCurente - datoriiCurente;
      docSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '3️⃣ CAPITAL DE LUCRU: ', bold: true }),
            new TextRun({ 
              text: `${fmt(capitalLucru)} RON ${capitalLucru >= 0 ? '🟢 POZITIV' : '🔴 NEGATIV'}`, 
              bold: true 
            })
          ],
          spacing: { after: 200 }
        })
      );
      
      if (capitalLucru < 0) {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Datorezi cu ${fmt(Math.abs(capitalLucru))} RON mai mult decât ai!`, bold: false })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '🚨 INSOLVENȚĂ TEHNICĂ: ', bold: true }),
              new TextRun({ text: 'Dacă toți creditorii cer banii SIMULTAN, intri în faliment!' })
            ],
            spacing: { after: 400 }
          })
        );
      }
      
      // === PROFITABILITATE ===
      docSections.push(
        new Paragraph({
          text: '💸 Indicatori de Profitabilitate',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        })
      );
      
      // Variabilele venituri, cheltuieli, profitNet, marjaNet, etc. sunt calculate mai sus
      
      // 1. Marja Netă
      const statusMN = marjaNet >= 8 ? '🟢 EXCELENT' : marjaNet >= 0 ? '🟡 SLAB' : '🔴 PIERDERE';
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '1️⃣ MARJA DE PROFIT NETĂ: ', bold: true }),
            new TextRun({ text: `${marjaNet.toFixed(2)}% ${statusMN}`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`La fiecare 100 RON vânzări, ${marjaNet < 0 ? 'PIERZI' : 'câștigi'} ${Math.abs(marjaNet).toFixed(2)} RON profit${marjaNet < 0 ? '!' : ' net.'}`)
          ],
          spacing: { after: 300 }
        })
      );
      
      // Breakdown venituri vs cheltuieli
      if (venituri > 0) {
        const procentChelt = (cheltuieli / venituri) * 100;
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '💡 BREAKDOWN PROFIT:', bold: true })
            ],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: `Venituri:      ${fmt(venituri)} RON (100.0%)`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `Cheltuieli:   -${fmt(cheltuieli)} RON (${procentChelt.toFixed(1)}%)`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `Profit net:    ${fmt(profitNet)} RON (${marjaNet.toFixed(1)}%)`,
            spacing: { after: 400 }
          })
        );
      }
      
      // Recomandări dacă marja < 8%
      if (marjaNet < 8 && venituri > 0) {
        const targetCheltuieli = venituri * 0.92;
        const reducereNecesara = cheltuieli - targetCheltuieli;
        
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '🎯 TARGET: Ajunge la minimum +8% marjă în 90 zile', bold: true })
            ],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: `   Cheltuieli MAX permise: ${fmt(targetCheltuieli)} RON (92% din venituri)`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   Trebuie să REDUCI cheltuielile cu: ${fmt(reducereNecesara)} RON`,
            spacing: { after: 400 }
          })
        );
      }
      
      // === EFICIENȚĂ ===
      docSections.push(
        new Paragraph({
          text: '🔄 Indicatori de Eficiență Operațională',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        })
      );
      
      // 1. Rotație Stocuri
      const costMarfuri = getAccountValue('607', 'debit');
      if (costMarfuri > 0 && stocuri > 0) {
        const rotatieStocuri = (stocuri / costMarfuri) * 365;
        const statusRS = rotatieStocuri <= 30 ? '🟢 RAPID' : rotatieStocuri <= 45 ? '🟡 OK' : '🔴 LENT';
        
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '1️⃣ ROTAȚIA STOCURILOR: ', bold: true }),
              new TextRun({ text: `${rotatieStocuri.toFixed(0)} zile ${statusRS}`, bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Ce înseamnă: ', bold: true }),
              new TextRun(`Un produs stă în medie ${rotatieStocuri.toFixed(0)} zile în depozit până se vinde.`)
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '📊 Benchmark sănătos: 20-30 zile',
            spacing: { after: 300 }
          })
        );
        
        if (rotatieStocuri > 45) {
          const vanzareTarget = stocuri * 0.3;
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '⚡ PLAN DE ACȚIUNE:', bold: true })
              ],
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: `   • Identifică produsele > ${(rotatieStocuri * 0.7).toFixed(0)} zile în stoc`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `   • Flash sales: -25% pe stocuri vechi`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `   • Target: vinde ${fmt(vanzareTarget)} RON din stocuri`,
              spacing: { after: 300 }
            })
          );
        }
      }
      
      // 2. DSO (Days Sales Outstanding)
      const dso = venituri > 0 ? (creanteClienti / venituri) * 365 : 0;
      const statusDSO = dso <= 15 ? '🟢 RAPID' : dso <= 30 ? '🟢 BINE' : dso <= 60 ? '🟡 OK' : '🔴 LENT';
      
      docSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '2️⃣ ZILE MEDII DE ÎNCASARE (DSO): ', bold: true }),
            new TextRun({ text: `${dso.toFixed(0)} zile ${statusDSO}`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`Clienții tăi plătesc în medie în ${dso.toFixed(0)} zile de la vânzare.`)
          ],
          spacing: { after: 300 }
        })
      );
      
      // 3. DPO (Days Payable Outstanding)
      const dpo = cheltuieli > 0 ? (datoriiFurnizori / cheltuieli) * 365 : 0;
      
      docSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '3️⃣ ZILE MEDII DE PLATĂ (DPO): ', bold: true }),
            new TextRun({ text: `${dpo.toFixed(0)} zile`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`Plătești furnizorii în medie la ${dpo.toFixed(0)} zile după facturare.`)
          ],
          spacing: { after: 300 }
        })
      );
      
      // 4. Cash Conversion Cycle
      const rotatieZile = costMarfuri > 0 && stocuri > 0 ? (stocuri / costMarfuri) * 365 : 0;
      const ccc = dso + rotatieZile - dpo;
      const statusCCC = ccc <= 20 ? '🟢 EXCELENT' : ccc <= 40 ? '🟡 OK' : '🔴 SLAB';
      
      docSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '4️⃣ CICLU DE CONVERSIE CASH (CCC): ', bold: true }),
            new TextRun({ text: `${ccc.toFixed(0)} zile ${statusCCC}`, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Ce înseamnă: ', bold: true }),
            new TextRun(`De la investiție până la recuperare cash durează ${ccc.toFixed(0)} zile.`)
          ],
          spacing: { after: 600 }
        })
      );
      
      // === BREAKDOWN CHELTUIELI ===
      docSections.push(
        new Paragraph({
          text: '💸 BREAKDOWN DETALIAT CHELTUIELI',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 400 },
          pageBreakBefore: true
        })
      );
      
      const expensesDict: Record<string, number> = {
        'Cost mărfuri (607)': getAccountValue('607', 'debit'),
        'Marketing/Publicitate (6232)': getAccountValue('6232', 'debit'),
        'Telecomunicații (626)': getAccountValue('626', 'debit'),
        'Servicii bancare (627)': getAccountValue('627', 'debit'),
        'Alte servicii externe (628)': getAccountValue('628', 'debit'),
        'Impozite și taxe (635)': getAccountValue('635', 'debit'),
        'Chirii (621)': getAccountValue('621', 'debit'),
        'Întreținere/Reparații (611)': getAccountValue('611', 'debit'),
        'Transport (624)': getAccountValue('624', 'debit'),
        'Deplasări (625)': getAccountValue('625', 'debit'),
        'Salarii (641)': getAccountValue('641', 'debit'),
        'Asigurări sociale (645)': getAccountValue('645', 'debit'),
        'Dobânzi (666)': getAccountValue('666', 'debit'),
        'Diferențe curs nefavorabile (6651)': getAccountValue('6651', 'debit'),
        'Impozit profit (691)': getAccountValue('691', 'debit'),
      };
      
      const expensesSorted = Object.entries(expensesDict)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);
      
      const cheltuieliTotale = expensesSorted.reduce((sum, [_, val]) => sum + val, 0);
      
      if (cheltuieliTotale > 0) {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '📊 CHELTUIELI TOTALE: ', bold: true }),
              new TextRun({ text: `${fmt(cheltuieliTotale)} RON`, bold: true })
            ],
            spacing: { after: 400 }
          })
        );
        
        // Top 3
        const top3Value = expensesSorted.slice(0, 3).reduce((sum, [_, val]) => sum + val, 0);
        const top3Procent = (top3Value / cheltuieliTotale) * 100;
        
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `📈 REGULA PARETO: Top 3 categorii = ${top3Procent.toFixed(1)}% din cheltuieli`, bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   → Focus aici pentru impact MAXIM de reducere!',
            spacing: { after: 400 }
          })
        );
        
        // Lista categorii
        expensesSorted.forEach(([categorie, valoare], index) => {
          const procent = (valoare / cheltuieliTotale) * 100;

          // === FIX #5: RECOMANDĂRI SPECIFICE PENTRU DIFERENȚE CURS (6651) ===
          if (categorie.includes('6651') || (categorie.toLowerCase().includes('diferențe') && categorie.toLowerCase().includes('curs'))) {
            docSections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${index + 1}. ${categorie}: `, bold: true }),
                  new TextRun({ text: `${fmt(valoare)} RON (${procent.toFixed(1)}%)`, bold: true, color: 'FF0000' })
                ],
                spacing: { before: 200, after: 200 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '⚡ DESPRE ACEASTĂ CHELTUIALĂ:', bold: true })
                ],
                spacing: { after: 200 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'ℹ️ IMPORTANT: ', bold: true, color: '0066CC' }),
                  new TextRun({ text: 'Diferențele de curs valutar NU sunt cheltuieli controlabile direct.' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: 'Acestea apar automat din fluctuațiile RON vs EUR/USD/etc.',
                spacing: { after: 300 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '💡 CE POȚI FACE:', bold: true })
                ],
                spacing: { after: 200 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '1. HEDGING VALUTAR:', bold: true })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Dacă ai tranzacții mari în EUR (>10.000/lună)',
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Vorbește cu banca despre contracte forward/futures',
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Fixezi cursul pe 3-6 luni → zero surprize',
                spacing: { after: 300 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '2. CONTURI ÎN VALUTĂ:', bold: true })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Deschide cont EUR la bancă',
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Încasezi în EUR, plătești în EUR → elimini conversiile',
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Convertești la curs favorabil când tu decizi',
                spacing: { after: 300 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '3. CLAUZE CONTRACTUALE:', bold: true })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → În contracte noi: "Preț în RON echivalent EUR la cursul BNR din ziua plății"',
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: '   → Transferi riscul valutar la client/furnizor',
                spacing: { after: 300 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '⚠️ NU încerca să "reduci" această cheltuială direct - ',
                    color: 'FF8C00'
                  }),
                  new TextRun({ text: 'e rezultatul pieței valutare!' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                text: 'Focus pe strategiile de management risc de mai sus.',
                spacing: { after: 600 }
              })
            );
            return; // Skip recomandările generice pentru 6651
          }
          const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${emoji} ${categorie}`, bold: true })
              ],
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: `   ${fmt(valoare)} RON (${procent.toFixed(1)}%)${index < 3 ? ' ⚡ PRIORITATE!' : ''}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `   ${'█'.repeat(Math.floor(procent / 2))}`,
              spacing: { after: 200 }
            })
          );
        });
        
        // === FIX #4: SIMULARE CORECTĂ REDUCERE CHELTUIELI ===
        const reducere15 = top3Value * 0.15;
        const cheltuieliNoi = cheltuieliTotale - reducere15;
        // CALCUL CORECT: Profit NOU = Profit ACTUAL + Reducere
        const profitNou = profitNet + reducere15;  // ✅ CORECT!
        const deltaProfit = profitNou - profitNet;
        
        docSections.push(
          new Paragraph({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '🚀 SIMULARE: Dacă reduci top 3 categorii cu 15%', bold: true })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: `Cheltuieli ACUM:      ${fmt(cheltuieliTotale)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `Reducere -15% top 3: -${fmt(reducere15)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: ' '.repeat(20) + '─'.repeat(30),
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `Cheltuieli NOI:       ${fmt(cheltuieliNoi)} RON`,
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: `Profit ACTUAL:        ${fmt(profitNet)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `Profit NOU:           ${fmt(profitNou)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: ' '.repeat(20) + '─'.repeat(30),
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ÎMBUNĂTĂȚIRE:        +${fmt(deltaProfit)} RON  🚀`, bold: true, size: 32, color: '008000' })
            ],
            spacing: { after: 300 }
          })
        );

        // Impact pe marjă
        if (venituri > 0) {
          const marja_noua = (profitNou / venituri) * 100;
          const delta_marja = marja_noua - marjaNet;
          
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '📊 IMPACT PE MARJĂ:', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Marja actuală:  ${marjaNet.toFixed(2)}%`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Marja nouă:     ${marja_noua.toFixed(2)}%  ` }),
                new TextRun({
                  text: `(+${delta_marja.toFixed(2)} puncte procentuale!)`,
                  bold: true,
                  color: '008000'
                })
              ],
              spacing: { after: 600 }
            })
          );
        }
      }
      
      // === PLAN ACȚIUNE 90 ZILE ===
      docSections.push(
        new Paragraph({
          text: '🎯 PLAN DE ACȚIUNE EXECUTIV - NEXT 90 DAYS',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 400 },
          pageBreakBefore: true
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Bazat pe analiza completă a situației tale financiare, ', bold: true }),
            new TextRun({ text: 'acesta este planul tău de acțiune prioritizat:' })
          ],
          spacing: { after: 400 }
        })
      );
      
      // LUNA 1
      docSections.push(
        new Paragraph({
          text: '📅 LUNA 1: STABILIZARE & QUICK WINS (Zile 1-30)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🎯 OBIECTIV: ', bold: true }),
            new TextRun({ text: 'Îmbunătățește lichiditatea și oprește hemoragia de cash' })
          ],
          spacing: { after: 300 }
        })
      );
      
      // Săptămâna 1 - adaptat la lichiditate
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 1 (Zile 1-7): CASH SPRINT 💨', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      
      if (lichidGen < 1.0) {
        const deficit = datoriiCurente - activeCurente;
        docSections.push(
          new Paragraph({
            text: `   ❗ URGENȚĂ MAXIMĂ: Deficit de ${fmt(deficit)} RON`,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Zi 1: Listează TOȚI clienții cu restanțe',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Zi 2-3: Apelează telefonic top 5 clienți cu cele mai mari datorii',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Zi 4-5: Email reminder la TOȚI clienții',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `   🎯 TARGET: Încasează minimum ${fmt(creanteClienti * 0.5)} RON (50% din creanțe)`,
            spacing: { after: 300 }
          })
        );
      } else {
        docSections.push(
          new Paragraph({
            text: '   ✅ Lichiditate OK, dar optimizează cash flow:',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Zi 1-3: Analizează timing plăți vs încasări',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Zi 4-7: Configurează reminder automat facturi',
            spacing: { after: 300 }
          })
        );
      }
      
      // Săptămâna 2-4
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 2 (Zile 8-14): NEGOCIERE FURNIZORI 🤝', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Identifică top 3 furnizori cu cele mai mari datorii',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Negociază: +30 zile termen plată SAU discount 5%',
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 3 (Zile 15-21): AUDIT CHELTUIELI ✂️', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Exportă extras bancar ultima lună',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Anulează abonamente neutilizate',
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 4 (Zile 22-30): SISTEMATIZARE 📊', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Configurează dashboard cash flow săptămânal',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Setează alerte: sold bancă < X RON',
          spacing: { after: 400 }
        })
      );
      
      // LUNA 2
      docSections.push(
        new Paragraph({
          text: '📅 LUNA 2: OPTIMIZARE & EFICIENȚĂ (Zile 31-60)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🎯 OBIECTIV: ', bold: true }),
            new TextRun({ text: 'Crește profitabilitatea și optimizează operațiunile' })
          ],
          spacing: { after: 300 }
        })
      );
      
      // Prioritizare pe bază de marjă
      if (marjaNet < 5 || !isProfit) {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '⚠️ PRIORITATE: REDUCERE AGRESIVĂ CHELTUIELI', bold: true })
            ],
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'SĂPTĂMÂNA 5-6: Deep Dive Categorii Cheltuieli', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Analizează TOP 3 categorii cheltuieli',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Implementează reduceri: target -15% per categorie',
            spacing: { after: 300 }
          })
        );
      } else {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: '✅ PRIORITATE: CREȘTERE VENITURI', bold: true })
            ],
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'SĂPTĂMÂNA 5-6: Optimizare Prețuri', bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Test A/B +10% pe 20% produse',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '   [ ] Implementează upsell/cross-sell',
            spacing: { after: 300 }
          })
        );
      }
      
      // LUNA 3
      docSections.push(
        new Paragraph({
          text: '📅 LUNA 3: SCALARE & CREȘTERE (Zile 61-90)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🎯 OBIECTIV: ', bold: true }),
            new TextRun({ text: 'Construiește fundații pentru creștere sustenabilă' })
          ],
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 9-10: SISTEME & PROCESE 🔧', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Documentează procese cheie',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Automatizează facturare, remindere, raportare',
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'SĂPTĂMÂNA 11-12: PLANIFICARE CREȘTERE 📈', bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Construiește forecast 6 luni',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   [ ] Evaluează nevoie finanțare',
          spacing: { after: 400 }
        })
      );
      
      // Reminder Chat AI
      docSections.push(
        new Paragraph({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '💬 PE TOT PARCURSUL ACESTUI PLAN:', bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Folosește Chat AI YANA', bold: true }),
            new TextRun({ text: ' pentru:' })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   • Clarificări pe orice punct din plan',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   • Simulări: "Ce se întâmplă dacă...?"',
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '   • Prioritizare dynamică bazată pe situația reală',
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🎯 Chat AI știe EXACT situația ta financiară și te poate ajuta la fiecare pas!', bold: true })
          ],
          spacing: { after: 600 }
        })
      );
      
      // === FOOTER UPDATED ===
      docSections.push(
        new Paragraph({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 300 },
          pageBreakBefore: true
        }),
        new Paragraph({
          text: '📞 Informații Contact & Suport',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: 'Pentru suport tehnic, întrebări sau consultanță suplimentară:',
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '📧 Email: ', bold: true }),
            new TextRun({ text: 'office@velcont.com' })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '📱 WhatsApp: ', bold: true }),
            new TextRun({ text: '0731377793' })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🌐 Website: ', bold: true }),
            new TextRun({ text: 'yana-contabila.velcont.com' })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '💬 AI CHAT ASSISTANT', bold: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Ai întrebări despre raportul tău?',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Folosește ', italics: true }),
            new TextRun({ text: 'Chat AI YANA', bold: true }),
            new TextRun({ text: ' pentru a primi răspunsuri personalizate instant!', italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          text: 'Exemple de întrebări pentru Chat AI:',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "De ce am pierdere dacă vând bine?"',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "Cum pot reduce cheltuielile cu 3.000 RON?"',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "Ce furnizor să plătesc primul?"',
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: '  • "Când voi avea 5.000 RON în bancă?"',
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '🎯 Chat AI înțelege EXACT situația ta financiară și îți dă sfaturi personalizate!', bold: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 300 }
        }),
        new Paragraph({
          text: '📄 Informații Document',
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Data generării: ', bold: true }),
            new TextRun(`${new Date().toLocaleString('ro-RO')}`)
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Versiune raport: ', bold: true }),
            new TextRun('Premium v3.0 (AI Enhanced)')
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Sursă date: ', bold: true }),
            new TextRun('Balanță de verificare contabilă')
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );

      // Create document
      // === FIX #6: DEBUG LOGGING FINAL ===
      console.log('\n' + '='.repeat(80));
      console.log('✅ RAPORT GENERAT CU SUCCES');
      console.log('='.repeat(80));
      console.log('📊 VERIFICARE FINALĂ:');
      console.log(`   Secțiuni generate: ${docSections.length}`);
      console.log(`   Venituri: ${fmt(venituri)} RON ${venituri_reconstituite ? '(reconstituite)' : ''}`);
      console.log(`   Cheltuieli: ${fmt(cheltuieli)} RON`);
      console.log(`   Profit: ${fmt(profitNet)} RON`);
      console.log(`   Marja: ${marjaNet.toFixed(2)}%`);
      console.log(`   Cash: ${fmt(total_cash)} RON`);
      console.log('='.repeat(80) + '\n');

      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections
        }]
      });

      // === SALVARE METADATA ÎN DB (pentru comparații viitoare) ===
      async function saveReportMetadata() {
        try {
          console.log('\n💾 Salvez metadata raport în DB...');
          
          // Calculează indicatori
          const activeCurente = getClassSum(3, 'debit') + getAccountsSum(/^411/, 'debit') + total_cash;
          const datoriiCurente = getAccountsSum(/^401/, 'credit') + getAccountValue('4423', 'credit');
          const lichiditate_gen = datoriiCurente > 0 ? activeCurente / datoriiCurente : 0;
          const lichiditate_rapida = datoriiCurente > 0 ? (activeCurente - getClassSum(3, 'debit')) / datoriiCurente : 0;
          const capital_lucru = activeCurente - datoriiCurente;
          
          // Top 3 cheltuieli (verifică dacă expensesDict există în scope)
          const top_cheltuieli_obj = typeof expensesDict !== 'undefined' 
            ? Object.fromEntries(
                Object.entries(expensesDict)
                  .filter(([_, val]) => val > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
              )
            : {};
          
          const { error } = await supabase
            .from('rapoarte_metadata')
            .upsert({
              user_id: user.id,
              cui: cui,
              company_name: companyInfo.name || '',
              perioada_start: startDate,
              perioada_end: endDate,
              profit_net: profitNet,
              cash_banca: cash_banca_lei + cash_banca_valuta, // Include valută!
              cash_casa: cash_casa,
              venituri_totale: venituri,
              cheltuieli_totale: cheltuieli,
              marja_neta: marjaNet,
              lichiditate_generala: lichiditate_gen,
              lichiditate_rapida: lichiditate_rapida,
              capital_lucru: capital_lucru,
              dso_zile: 0, // TODO: calculează din cod dacă există
              dpo_zile: 0,
              ccc_zile: 0,
              rotatie_stocuri_zile: 0,
              top_cheltuieli: top_cheltuieli_obj
            }, {
              onConflict: 'user_id,cui,perioada_end'
            });
          
          if (error) {
            console.error('❌ Eroare salvare metadata:', error.message);
          } else {
            console.log('✅ Metadata raport salvată cu succes!');
            console.log(`   → ${Object.keys(top_cheltuieli_obj).length} categorii top cheltuieli salvate`);
          }
        } catch (error) {
          console.error('❌ Excepție salvare metadata:', error);
        }
      }

      // Apel funcție (asincron, nu așteaptă)
      saveReportMetadata().catch(err => console.error('Eroare save metadata:', err));

      // === DEBUG LOGGING FINAL ===
      console.log('\n' + '='.repeat(80));
      console.log('✅ RAPORT PREMIUM GENERAT CU SUCCES');
      console.log('='.repeat(80));
      console.log('📊 VERIFICARE FINALĂ:');
      console.log(`   Venituri: ${fmt(venituri)} RON ${venituri_reconstituite ? '(reconstituite)' : ''}`);
      console.log(`   Cheltuieli: ${fmt(cheltuieli)} RON`);
      console.log(`   Profit: ${fmt(profitNet)} RON`);
      console.log(`   Marja: ${marjaNet.toFixed(2)}%`);
      console.log(`   Cash: ${fmt(total_cash)} RON`);
      console.log(`   Comparație cu precedent: ${previousReport ? '✅ DA' : '❌ NU (prim raport)'}`);
      console.log(`   Metadata salvată: ${user ? '✅ DA' : '❌ NU (user lipsă)'}`);
      console.log('='.repeat(80) + '\n');

      // Generate and download with proper filename
      const blob = await Packer.toBlob(doc);
      const fileName = `Raport_Financiar_${cui}_${new Date().toISOString().split('T')[0]}.docx`;
      
      console.log('📄 Generare raport premium cu numele:', fileName);
      
      // Try primary download method
      try {
        saveAs(blob, fileName);
        toast.success('✅ Raport Financiar Premium generat cu succes!');
      } catch (saveError) {
        // Fallback: force download via link
        console.warn('saveAs failed, using fallback download method');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('✅ Raport Financiar Premium generat (download forțat)!');
      }
      
    } catch (error) {
      console.error('Eroare generare Raport Premium:', error);
      toast.error('Eroare la generarea raportului financiar');
    }
  };

  const AutoScrollText = () => {
    const [isScrolling, setIsScrolling] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastScrollPosition, setLastScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollSpeed = 1.5; // pixels per frame

    // Text-to-Speech functionality - cleanup on unmount
    useEffect(() => {
      return () => {
        window.speechSynthesis.cancel();
      };
    }, []);

    const toggleSpeech = () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(analysisText);
        utterance.lang = 'ro-RO';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const romanianFemaleVoice = voices.find(voice => 
          voice.lang.startsWith('ro') && voice.name.toLowerCase().includes('female')
        );
        const romanianVoice = voices.find(voice => voice.lang.startsWith('ro'));
        const femaleVoice = voices.find(voice => voice.name.toLowerCase().includes('female'));

        if (romanianFemaleVoice) {
          utterance.voice = romanianFemaleVoice;
        } else if (romanianVoice) {
          utterance.voice = romanianVoice;
        } else if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    };

    useEffect(() => {
      let animationFrameId: number;
      
      // Restore last scroll position when resuming
      if (isScrolling && containerRef.current && lastScrollPosition > 0) {
        containerRef.current.scrollTop = lastScrollPosition;
      }
      
      const scrollStep = () => {
        if (isScrolling && containerRef.current) {
          const newScrollTop = containerRef.current.scrollTop + scrollSpeed;
          containerRef.current.scrollTop = newScrollTop;
          setLastScrollPosition(newScrollTop);
          
          // Reset to top when reaching bottom
          if (containerRef.current.scrollTop >= containerRef.current.scrollHeight - containerRef.current.clientHeight) {
            containerRef.current.scrollTop = 0;
            setLastScrollPosition(0);
          }
        }
        animationFrameId = requestAnimationFrame(scrollStep);
      };

      if (isScrolling) {
        animationFrameId = requestAnimationFrame(scrollStep);
      }

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [isScrolling]);

    const toggleScroll = () => {
      // Save current position when stopping
      if (isScrolling && containerRef.current) {
        setLastScrollPosition(containerRef.current.scrollTop);
      }
      setIsScrolling(!isScrolling);
    };

    return (
      <div className="relative rounded-lg overflow-hidden border border-primary/20 shadow-lg animate-fade-in">
        {/* Voice Control Button */}
        <button
          onClick={toggleSpeech}
          className="absolute top-4 right-4 z-10 px-4 py-2 bg-accent/80 hover:bg-accent backdrop-blur-sm rounded-lg text-sm font-medium transition-colors border border-accent/50 flex items-center gap-2"
        >
          {isSpeaking ? (
            <>
              <VolumeX className="h-4 w-4" />
              Oprește Vocea
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              Pornește Vocea
            </>
          )}
        </button>

        {/* Scroll Control Button */}
        <button
          onClick={toggleScroll}
          className="absolute top-4 right-44 z-10 px-4 py-2 bg-primary/20 hover:bg-primary/30 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors border border-primary/30"
        >
          {isScrolling ? 'Oprește Scroll' : 'Pornește Scroll'}
        </button>

        {/* Scrolling Container */}
        <div
          ref={containerRef}
          onClick={toggleScroll}
          className={`h-[70vh] bg-background/95 backdrop-blur-sm cursor-pointer px-8 py-12 ${isScrolling ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{
            scrollBehavior: 'smooth'
          }}
        >
          <div className="space-y-6 font-mono text-base leading-relaxed text-foreground/90 whitespace-pre-line">
            {analysisText}
          </div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Company Info Card */}
      <Card className="border-primary/20 shadow-lg animate-fade-in">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 px-6">
          <div className="space-y-3">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building className="h-6 w-6 text-primary animate-scale-in" />
              Firmă
            </CardTitle>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[80px]">CUI:</span>
                <span>{companyInfo.cui}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[80px]">Perioadă:</span>
                <span>{companyInfo.period}</span>
              </div>
              {fileName && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="break-all text-sm">{fileName}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Audit Trail - Validări Conformitate */}
      {metadata?.auditTrail && (
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <BalanceAuditViewer auditTrail={metadata.auditTrail} />
        </div>
      )}
      
      {/* Reprocess Button */}
      {analysisId && (
        <Card className="border-primary/20 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reprocesare Analiză
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Încarcă din nou fișierul Excel pentru a reanaliza balanța cu cache-ul golit și indexii coloanelor actualizați.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleReprocess}
              accept=".xls,.xlsx"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isReprocessing}
              variant="outline"
            >
              {isReprocessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {isReprocessing ? 'Reprocesare...' : 'Reprocesează balanța'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Word Document Generation Button */}
      <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <Button 
          onClick={generateWordExplanations} 
          variant="outline"
          className="w-full relative overflow-hidden"
          size="lg"
  style={{
    animation: 'pulse-orange 2s ease-in-out infinite',
    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 191, 36, 0.1))',
    borderColor: 'rgb(251, 146, 60)',
    fontWeight: 600
  }}
        >
          <FileText className="h-5 w-5 mr-2" />
          📄 Generează Raport Financiar Premium
        </Button>
        
        {/* Word Readiness Indicator */}
        {(() => {
          // Calculate accounts count
          let accountsCount = 0;
          let source = '';
          
          // Try structuredData first
          if (metadata?.structuredData?.accounts?.length) {
            accountsCount = metadata.structuredData.accounts.length;
            source = 'structurat';
          } else {
            // Fallback: count from metadata classes 1-7
            const meta = metadata || {};
            let count = 0;
            
            // Classes 1-5: sold final > 0
            for (let i = 1; i <= 5; i++) {
              const accounts = meta[`class${i}_Accounts`];
              if (accounts && typeof accounts === 'object') {
                count += Object.values(accounts).filter((acc: any) => 
                  (Number(acc?.soldFinalDebitor || 0) > 0) || 
                  (Number(acc?.soldFinalCreditor || 0) > 0)
                ).length;
              }
            }
            
            // Class 6: totalDebit > 0
            const class6 = meta.class6_Expenses;
            if (class6 && typeof class6 === 'object') {
              count += Object.values(class6).filter((acc: any) => 
                Number(acc?.totalDebit || 0) > 0
              ).length;
            }
            
            // Class 7: totalCredit > 0 (exclude 709)
            const class7 = meta.class7_Income;
            if (class7 && typeof class7 === 'object') {
              count += Object.entries(class7).filter(([code, acc]: [string, any]) => 
                !code.startsWith('709') && Number(acc?.totalCredit || 0) > 0
              ).length;
            }
            
            accountsCount = count;
            source = 'fallback';
          }
          
          const isReady = accountsCount > 0;
          
          return (
            <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${
              isReady 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}>
              {isReady ? (
                <span className="flex items-center gap-2">
                  <span className="font-semibold">✓ Word Ready:</span>
                  <span>{accountsCount} conturi detectate ({source})</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="font-semibold">✗ Nu există date suficiente</span>
                  <span className="text-xs">→ Reprocesează balanța</span>
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Auto-Scrolling Analysis Text */}
      <div className="space-y-6">
        <div className="space-y-2 animate-fade-in">
          <h2 className="text-3xl font-bold">Analiză Completă</h2>
          <p className="text-muted-foreground">
            Click pe text sau pe buton pentru a opri/porni scrollul automat
          </p>
        </div>
        <AutoScrollText />
      </div>


      {/* Dialog for Section Details */}
      <Dialog open={!!selectedSection} onOpenChange={() => setSelectedSection(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl animate-fade-in">
              {selectedSection && (
                <>
                  <div className="p-2 rounded-lg bg-primary/10 animate-scale-in">
                    <selectedSection.icon className="h-6 w-6" />
                  </div>
                  {selectedSection.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4 whitespace-pre-wrap break-words overflow-wrap-anywhere animate-fade-in" style={{ animationDelay: '100ms' }}>
            {selectedSection?.content}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};