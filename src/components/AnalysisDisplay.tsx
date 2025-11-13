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
          title: '🏦 Banii firmei tale în bancă (Cont 5121)',
          what: `Ai în cont bancar: ${fmt(bank)} RON`,
          why: 'Acestea sunt banii disponibili imediat pentru plăți. Îi poți folosi oricând ai nevoie.',
          check: 'Verifică lunar: Are firma suficienți bani pentru furnizori și salarii? Dacă nu, trebuie să încasezi urgent de la clienți.',
          optimize: bank < 50000 ? 'IMPORTANT: Sold scăzut! Concentrează-te pe încasări rapide de la clienți.' : 'Bine! Ai lichiditate suficientă.'
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
      
      if (stocks > bank * 2) {
        risks.push({
          type: '🟡 AVERTISMENT',
          message: `Stocuri mari (${fmt(stocks)} RON) față de lichidități. Posibilă rotație slabă.`,
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
      
      // === FOOTER ===
      docSections.push(
        new Paragraph({
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 300 }
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
            new TextRun('Premium v2.0')
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
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Pentru suport: contact@yana.ro', italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections
        }]
      });

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