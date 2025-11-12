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

  // Generate Word document with account explanations
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
      
      // Account explanations map
      const accountExplanations: Record<string, { name: string; explanation: string; implications: string }> = {
        "121": {
          name: "Profit sau Pierdere",
          explanation: "Acest cont reflectă rezultatul anual al companiei. Un sold creditor indică profit (veniturile au depășit cheltuielile), în timp ce un sold debitor indică pierdere.",
          implications: "Profitul poate fi reinvestit în companie sau distribuit către asociați. Pierderea trebuie acoperită din rezerve sau profit viitor."
        },
        "4111": {
          name: "Clienți - Vânzări produse/servicii",
          explanation: "Reprezintă sumele datorate de clienți pentru produse/servicii livrate dar nefacturate încă, sau facturi emise dar neîncasate.",
          implications: "Sold mare = bani blocați în creanțe. Risc de neîncasare. Monitorizați termene de plată și urmăriți clienții restanți."
        },
        "401": {
          name: "Furnizori - Datorii către furnizori",
          explanation: "Reprezintă obligațiile de plată către furnizori pentru bunuri/servicii primite.",
          implications: "Sold mare poate indica negocieri bune de termene, dar atenție la termenele de plată pentru a evita penalizări."
        },
        "4423": {
          name: "TVA de plată",
          explanation: "Diferența între TVA colectată (din vânzări) și TVA deductibilă (din achiziții), de plătit către ANAF.",
          implications: "Asigurați-vă că aveți lichiditățile necesare pentru plata TVA-ului la termen (25 ale lunii următoare)."
        },
        "4424": {
          name: "TVA de recuperat",
          explanation: "TVA deductibilă mai mare decât TVA colectată - diferența se poate recupera de la ANAF sau compensa în lunile următoare.",
          implications: "Reprezintă o creanță la stat. Puteți solicita rambursarea sau o puteți compensa cu TVA viitoare de plată."
        },
        "5121": {
          name: "Conturi la bănci în lei",
          explanation: "Disponibilități bănești în conturile bancare în RON.",
          implications: "Asigură lichiditatea pentru plăți curente. Sold scăzut = risc de cash-flow. Monitorizați zilnic."
        },
        "5311": {
          name: "Casa în lei",
          explanation: "Numerar disponibil în casa companiei.",
          implications: "Utilizat pentru plăți mici. Atenție la limitele legale de plăți în numerar (5.000 lei/zi)."
        },
        "371": {
          name: "Mărfuri",
          explanation: "Stocul de mărfuri destinate revânzării, evaluate la cost de achiziție.",
          implications: "Sold mare poate indica suprastocuri sau mișcare lentă. Verificați rotația stocurilor și produsele cu mișcare lentă."
        },
        "512": {
          name: "Conturi curente la bănci",
          explanation: "Include toate conturile bancare curente (5121 în lei, 5124 în valută).",
          implications: "Esențial pentru operațiunile zilnice. Diversificarea în mai multe bănci reduce riscul."
        },
        "531": {
          name: "Casa",
          explanation: "Numerarul disponibil în casa unității (5311 lei, 5314 valută).",
          implications: "Respectați limita legală de 5.000 lei pentru plăți în numerar între profesionisti."
        }
      };

      // Build document sections
      const docSections: Paragraph[] = [
        new Paragraph({
          text: `EXPLICAȚII BALANȚĂ CONTABILĂ`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Companie: ", bold: true }),
            new TextRun(company || "N/A")
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "CUI: ", bold: true }),
            new TextRun(cui || "N/A")
          ],
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: "Explicații Conturi Principale",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
        })
      ];

      // Normalize accounts structure (array or map) and add explanations
      const entries: Array<{ code: string; name?: string; soldFinal: number }> = [];

      if (Array.isArray(accounts)) {
        (accounts as any[]).forEach((a: any) => {
          const d = Number(a?.debit || 0);
          const c = Number(a?.credit || 0);
          const soldFinal = d > 0 ? d : c;
          if (soldFinal > 0 && a?.code) {
            entries.push({ code: String(a.code), name: a.name, soldFinal });
          }
        });
      } else if (accounts && typeof accounts === 'object') {
        Object.keys(accounts as any).forEach((code) => {
          const a: any = (accounts as any)[code];
          const soldFinal = Number(a?.soldFinalDebitor || 0) || Number(a?.soldFinalCreditor || 0) || Number(a?.totalDebit || 0) || Number(a?.totalCredit || 0) || 0;
          if (soldFinal > 0) {
            entries.push({ code, name: a?.accountName, soldFinal });
          }
        });
      }

      // Add explanations for accounts with balance > 0
      entries.forEach(({ code, soldFinal }) => {
        if (soldFinal > 0 && accountExplanations[code]) {
          const explanation = accountExplanations[code];

          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Contul ${code} - ${explanation.name}`, bold: true, size: 24 })
              ],
              spacing: { before: 300, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Ce reprezintă: ", bold: true }),
                new TextRun(explanation.explanation)
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Implicații pentru afacere: ", bold: true }),
                new TextRun(explanation.implications)
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Sold actual: ", bold: true }),
                new TextRun(`${soldFinal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
              ],
              spacing: { after: 300 }
            })
          );
        }
      });

      // Add confirmation section
      docSections.push(
        new Paragraph({
          text: "Declarație de Confirmare",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 300 }
        }),
        new Paragraph({
          text: `Subsemnatul(a) _____________________, în calitate de administrator/director al ${company || "companiei"}, confirm prin prezenta că am luat la cunoștință de informațiile contabile prezentate mai sus și declar că acestea corespund cu realitatea situației financiare a companiei la data analizei.`,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: "Data: ______________",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Semnătura: ______________",
          spacing: { after: 600 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Notă juridică: ", bold: true, italics: true }),
            new TextRun({ 
              text: "Acest document are valoare juridică și servește ca dovadă a luării la cunoștință a situației contabile de către administrator. Se recomandă păstrarea acestui document timp de 10 ani conform legislației contabile în vigoare. Termenul de confirmare este de maximum 5 zile lucrătoare de la primirea analizei.",
              italics: true,
              size: 20
            })
          ],
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

      // Generate and download
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Explicatii_Balanta_${company}_${cui}.docx`);
      toast.success("Document Word generat cu succes!");
    } catch (error) {
      console.error("Eroare generare Word:", error);
      toast.error("Eroare la generarea documentului Word");
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
          className="w-full"
          size="lg"
        >
          <FileText className="h-5 w-5 mr-2" />
          📄 Generează Explicații Word (Document Confirmare Administrator)
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