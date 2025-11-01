import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  Lightbulb,
  Target,
  AlertCircle
} from 'lucide-react';

interface Section {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  icon?: React.ReactNode;
}

interface KeyInsight {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface ActionItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIStructuredResponseProps {
  content: string;
  sections?: Section[];
  keyInsights?: KeyInsight[];
  actionItems?: ActionItem[];
  sources?: Array<{ title: string; url: string; domain: string }>;
  relatedQuestions?: string[];
  onRelatedQuestionClick?: (question: string) => void;
}

export const AIStructuredResponse: React.FC<AIStructuredResponseProps> = ({
  content,
  sections,
  keyInsights,
  actionItems,
  sources,
  relatedQuestions,
  onRelatedQuestionClick
}) => {
  const parseContent = (text: string) => {
    // Auto-detect sections from markdown-style headers
    const lines = text.split('\n');
    const detectedSections: Section[] = [];
    let currentSection: Section | null = null;
    let currentContent: string[] = [];

    lines.forEach(line => {
      // Detect headers (##, ###)
      if (line.match(/^#{2,3}\s+/)) {
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim();
          detectedSections.push(currentSection);
        }
        currentSection = {
          title: line.replace(/^#{2,3}\s+/, '').trim(),
          content: '',
          type: 'info'
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    });

    // Push last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      detectedSections.push(currentSection);
    }

    return detectedSections.length > 0 ? detectedSections : null;
  };

  const autoSections = sections || parseContent(content);

  const getSectionIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSectionStyle = (type?: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-green-500 bg-green-500/5';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-500/5';
      case 'error':
        return 'border-l-4 border-red-500 bg-red-500/5';
      default:
        return 'border-l-4 border-blue-500 bg-blue-500/5';
    }
  };

  const getInsightIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-500/10 text-red-600 border-red-500/30',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      low: 'bg-blue-500/10 text-blue-600 border-blue-500/30'
    };
    const labels = {
      high: 'Prioritate Înaltă',
      medium: 'Prioritate Medie',
      low: 'Prioritate Scăzută'
    };
    return <Badge variant="outline" className={styles[priority]}>{labels[priority]}</Badge>;
  };

  return (
    <div className="space-y-4 animate-appear">
      {/* Main Content or Sections */}
      {autoSections && autoSections.length > 0 ? (
        <div className="space-y-3">
          {autoSections.map((section, idx) => (
            <Card key={idx} className={`p-4 ${getSectionStyle(section.type)} card-hover-scale`}>
              <div className="flex items-start gap-3">
                {getSectionIcon(section.type)}
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-foreground">{section.title}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words overflow-wrap-anywhere">{section.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-sm text-foreground whitespace-pre-wrap break-words overflow-wrap-anywhere">{content}</div>
      )}

      {/* Key Insights */}
      {keyInsights && keyInsights.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-foreground">Concluzii Cheie</h4>
            </div>
            <div className="space-y-2">
              {keyInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  {getInsightIcon(insight.type)}
                  <span className="text-muted-foreground">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Action Items */}
      {actionItems && actionItems.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-foreground">Acțiuni Recomandate</h4>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, idx) => (
                <Card key={idx} className="p-3 bg-card/50 card-hover-scale">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground flex-1">{item.text}</span>
                    {getPriorityBadge(item.priority)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sources */}
      {sources && sources.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Surse verificate:
            </p>
            <div className="space-y-1">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline flex items-start gap-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Related Questions */}
      {relatedQuestions && relatedQuestions.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Întrebări similare:</p>
            <div className="flex flex-wrap gap-2">
              {relatedQuestions.slice(0, 3).map((question, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onRelatedQuestionClick?.(question)}
                  className="text-xs h-auto py-1.5 px-3 btn-hover-lift"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
