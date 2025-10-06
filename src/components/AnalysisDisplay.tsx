import { useState } from 'react';
import { 
  AlertCircle, 
  TrendingUp, 
  Building,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AnalysisDisplayProps {
  analysisText: string;
  fileName?: string;
  createdAt?: string;
}

interface AnalysisSection {
  id: string;
  title: string;
  icon: any;
  content: string;
  summary: string;
  color: string;
}

export const AnalysisDisplay = ({ analysisText, fileName, createdAt }: AnalysisDisplayProps) => {
  const [selectedSection, setSelectedSection] = useState<AnalysisSection | null>(null);

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

  const ChapterSection = ({ section, index }: { section: AnalysisSection; index: number }) => {
    const Icon = section.icon;
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Define specific background colors for each chapter using semantic tokens
    const chapterColors = [
      'bg-blue-500/10 border-blue-500/30',
      'bg-green-500/10 border-green-500/30',
      'bg-purple-500/10 border-purple-500/30',
      'bg-red-500/10 border-red-500/30',
      'bg-indigo-500/10 border-indigo-500/30',
      'bg-orange-500/10 border-orange-500/30',
      'bg-teal-500/10 border-teal-500/30',
      'bg-pink-500/10 border-pink-500/30'
    ];
    
    const iconColors = [
      'text-blue-600 dark:text-blue-400',
      'text-green-600 dark:text-green-400',
      'text-purple-600 dark:text-purple-400',
      'text-red-600 dark:text-red-400',
      'text-indigo-600 dark:text-indigo-400',
      'text-orange-600 dark:text-orange-400',
      'text-teal-600 dark:text-teal-400',
      'text-pink-600 dark:text-pink-400'
    ];
    
    const bgClass = chapterColors[index % chapterColors.length];
    const iconClass = iconColors[index % iconColors.length];
    
    return (
      <div 
        className={`border-l-4 rounded-lg p-6 space-y-4 transition-all duration-300 animate-fade-in ${bgClass}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Chapter Header */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-background/50 backdrop-blur-sm ${iconClass}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-2xl font-bold leading-tight">
              Capitolul {index + 1}
            </h3>
            <h4 className="text-xl font-semibold text-foreground/90">
              {section.title}
            </h4>
          </div>
        </div>
        
        {/* Chapter Summary */}
        <div className="space-y-3 pl-16">
          <p className="text-base text-foreground/80 leading-relaxed">
            {section.summary}
          </p>
          
          {/* Expandable Content */}
          {isExpanded && (
            <div className="pt-4 border-t border-border/50 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap animate-fade-in">
              {section.content}
            </div>
          )}
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            {isExpanded ? (
              <>
                <span>Ascunde detaliile</span>
                <ChevronRight className="h-4 w-4 -rotate-90 group-hover:-translate-y-1 transition-transform" />
              </>
            ) : (
              <>
                <span>Vezi detalii complete</span>
                <ChevronRight className="h-4 w-4 rotate-90 group-hover:translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Company Info Card */}
      <Card className="border-primary/20 shadow-lg animate-fade-in">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
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

      {/* Chapter-Based Analysis Sections */}
      {sections.length > 0 && (
        <div className="space-y-6">
          <div className="space-y-2 animate-fade-in">
            <h2 className="text-3xl font-bold">Analiză pe Capitole</h2>
            <p className="text-muted-foreground">
              Informațiile din balanță organizate în secțiuni clare și ușor de urmărit
            </p>
          </div>
          <div className="space-y-6">
            {sections.map((section, index) => (
              <ChapterSection key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Full Analysis Fallback */}
      {sections.length === 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analiză Completă
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {analysisText}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4 whitespace-pre-wrap animate-fade-in" style={{ animationDelay: '100ms' }}>
            {selectedSection?.content}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};