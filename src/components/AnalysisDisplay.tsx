import { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Building,
  Calendar,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AnalysisDisplayProps {
  analysisText: string;
  fileName?: string;
  createdAt?: string;
}

interface Section {
  title: string;
  content: string;
  type: 'info' | 'alert' | 'success' | 'recommendation';
}

export const AnalysisDisplay = ({ analysisText, fileName, createdAt }: AnalysisDisplayProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  // Parse company info from analysis
  const extractCompanyInfo = (text: string) => {
    const cuiMatch = text.match(/CUI[:\s]+(\d+)/i);
    const companyMatch = text.match(/\*\*([^*]+(?:SRL|SA|SCS|SNC|PFA)[^*]*)\*\*/i);
    const periodMatch = text.match(/Perioada analizată[:\s]+([^\n]+)/i);
    
    return {
      name: companyMatch?.[1]?.trim() || 'Firmă',
      cui: cuiMatch?.[1] || 'N/A',
      period: periodMatch?.[1]?.trim() || 'N/A'
    };
  };

  // Parse sections from analysis
  const parseSections = (text: string): Section[] => {
    const sections: Section[] = [];
    
    // Extract main sections
    const sectionMatches = text.split(/(?=\*\*\d+\)|===)/);
    
    sectionMatches.forEach(section => {
      if (!section.trim()) return;
      
      // Dashboard CEO / Indicatori
      if (section.includes('Dashboard') || section.includes('INDICATORI')) {
        sections.push({
          title: '📊 Dashboard CEO - Indicatori Cheie',
          content: section,
          type: 'info'
        });
      }
      // Alerte
      else if (section.includes('ALERTE') || section.includes('Alerte critice') || section.includes('⚠️') || section.includes('🚨')) {
        sections.push({
          title: '⚠️ Alerte și Riscuri',
          content: section,
          type: 'alert'
        });
      }
      // Recomandări
      else if (section.includes('Recomandări') || section.includes('RECOMANDĂRI') || section.includes('Optimizare')) {
        sections.push({
          title: '💡 Recomandări Strategice',
          content: section,
          type: 'recommendation'
        });
      }
      // Analiză conturi
      else if (section.includes('Analiză') || section.includes('ANALIZA') || section.match(/\d+\.\d+\)/)) {
        sections.push({
          title: '🔍 Analiză Detaliată Conturi',
          content: section,
          type: 'info'
        });
      }
      // Validare structură
      else if (section.includes('Validare') || section.includes('Structură')) {
        sections.push({
          title: '✅ Validare Balanță',
          content: section,
          type: 'success'
        });
      }
    });

    return sections.length > 0 ? sections : [{
      title: '📄 Analiză Completă',
      content: text,
      type: 'info'
    }];
  };

  // Extract disclaimer
  const extractDisclaimer = (text: string): string => {
    const disclaimerMatch = text.match(/\*\*Notă importantă:\*\*([^*]+(?:\*\*[^*]+\*\*[^*]+)*)/i);
    return disclaimerMatch?.[0] || '';
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSectionBadge = (type: string) => {
    switch (type) {
      case 'alert': return <Badge variant="destructive">Urgent</Badge>;
      case 'recommendation': return <Badge className="bg-yellow-500">Acțiune</Badge>;
      case 'success': return <Badge className="bg-green-500">OK</Badge>;
      default: return null;
    }
  };

  const companyInfo = extractCompanyInfo(analysisText);
  const sections = parseSections(analysisText);
  const disclaimer = extractDisclaimer(analysisText);

  // Format content with better styling
  const formatContent = (content: string) => {
    return content
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/⚠️/g, '<span class="text-destructive">⚠️</span>')
      .replace(/✅/g, '<span class="text-green-500">✅</span>')
      .replace(/💡/g, '<span class="text-yellow-500">💡</span>')
      .replace(/🚨/g, '<span class="text-destructive">🚨</span>')
      .replace(/📊/g, '<span class="text-blue-500">📊</span>')
      .replace(/📈/g, '<span class="text-green-500">📈</span>')
      .replace(/📉/g, '<span class="text-destructive">📉</span>');
  };

  return (
    <div className="space-y-6">
      {/* Company Info Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                {companyInfo.name}
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  <span><strong>CUI:</strong> {companyInfo.cui}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span><strong>Perioadă:</strong> {companyInfo.period}</span>
                </div>
                {fileName && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-xs" title={fileName}>{fileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Disclaimer */}
      {disclaimer && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div 
                className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatContent(disclaimer) }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections Accordion */}
      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card 
            key={index} 
            className={`overflow-hidden transition-all ${
              section.type === 'alert' ? 'border-destructive/30' :
              section.type === 'recommendation' ? 'border-yellow-500/30' :
              section.type === 'success' ? 'border-green-500/30' :
              'border-border'
            }`}
          >
            <button
              onClick={() => toggleSection(index)}
              className="w-full text-left"
            >
              <CardHeader className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                section.type === 'alert' ? 'bg-destructive/5' :
                section.type === 'recommendation' ? 'bg-yellow-500/5' :
                section.type === 'success' ? 'bg-green-500/5' :
                'bg-muted/20'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    {getSectionIcon(section.type)}
                    <span className="font-semibold text-base">{section.title}</span>
                    {getSectionBadge(section.type)}
                  </div>
                  {expandedSections.has(index) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
            </button>

            {expandedSections.has(index) && (
              <CardContent className="pt-6">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats if available */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sursa Datelor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Analiză generată automat cu AI pe baza balanței de verificare.
            {createdAt && ` • ${new Date(createdAt).toLocaleDateString('ro-RO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};