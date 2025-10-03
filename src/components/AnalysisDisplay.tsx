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

  // Parse company info
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

  // Extract major sections from analysis text
  const extractSections = (text: string): AnalysisSection[] => {
    const sections: AnalysisSection[] = [];
    
    // Section 1: Snapshot Strategic (Dashboard CEO)
    const snapshotMatch = text.match(/(?:###\s*)?(?:1\.\s*)?Snapshot Strategic[^#]*((?:.*\n)*?)(?=###|$)/i);
    if (snapshotMatch) {
      const content = snapshotMatch[0];
      const summary = content.substring(0, 200).trim() + '...';
      sections.push({
        id: 'snapshot',
        title: 'Snapshot Strategic și Recomandări Preliminare',
        icon: Briefcase,
        content: content,
        summary: summary,
        color: 'from-blue-500/20 to-blue-600/20'
      });
    }

    // Section 2: Analiza Conturilor Cheie
    const contouriMatch = text.match(/(?:###\s*)?(?:2\.\s*)?Analiza Conturilor Cheie[^#]*((?:.*\n)*?)(?=###|$)/i);
    if (contouriMatch) {
      const content = contouriMatch[0];
      const summary = content.substring(0, 200).trim() + '...';
      sections.push({
        id: 'conturi',
        title: 'Analiza Conturilor Cheie – Interpretare, Riscuri și Oportunități',
        icon: DollarSign,
        content: content,
        summary: summary,
        color: 'from-green-500/20 to-green-600/20'
      });
    }

    // Section 3: Conformitate TVA & Impozite
    const tvaMatch = text.match(/(?:###\s*)?(?:3\.\s*)?Conformitate TVA[^#]*((?:.*\n)*?)(?=###|$)/i);
    if (tvaMatch) {
      const content = tvaMatch[0];
      const summary = content.substring(0, 200).trim() + '...';
      sections.push({
        id: 'tva',
        title: 'Conformitate TVA & Impozite – Analiză Detaliată și Măsuri',
        icon: Receipt,
        content: content,
        summary: summary,
        color: 'from-purple-500/20 to-purple-600/20'
      });
    }

    // If no structured sections found, try to split by major headers
    if (sections.length === 0) {
      const parts = text.split(/###/);
      parts.forEach((part, index) => {
        if (part.trim() && index > 0) {
          const lines = part.trim().split('\n');
          const title = lines[0].trim();
          const content = part.trim();
          const summary = content.substring(0, 200).trim() + '...';
          
          sections.push({
            id: `section-${index}`,
            title: title,
            icon: index === 1 ? Briefcase : index === 2 ? DollarSign : Receipt,
            content: content,
            summary: summary,
            color: index === 1 ? 'from-blue-500/20 to-blue-600/20' : 
                   index === 2 ? 'from-green-500/20 to-green-600/20' : 
                   'from-purple-500/20 to-purple-600/20'
          });
        }
      });
    }

    return sections;
  };

  const companyInfo = extractCompanyInfo(analysisText);
  const sections = extractSections(analysisText);

  const SectionCard = ({ section }: { section: AnalysisSection }) => {
    const Icon = section.icon;
    return (
      <Card 
        className={`group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br ${section.color} border-border/50`}
        onClick={() => setSelectedSection(section)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-background/50">
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg leading-tight">
                {section.title}
              </CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {section.summary}
          </p>
        </CardContent>
      </Card>
    );
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

      {/* Netflix-style Section Cards */}
      {sections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Secțiuni Analiză</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <SectionCard key={section.id} section={section} />
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              {selectedSection && (
                <>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <selectedSection.icon className="h-6 w-6" />
                  </div>
                  {selectedSection.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4 whitespace-pre-wrap">
            {selectedSection?.content}
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
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