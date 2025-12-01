import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { StrategicChart, ChartData } from '@/components/strategic/StrategicChart';
import { cn } from '@/lib/utils';

interface Source {
  title: string;
  url: string;
  domain: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  relatedQuestions?: string[];
  showFeedback?: boolean;
  feedbackGiven?: boolean;
  onFeedback?: (rating: number) => void;
  onQuestionClick?: (question: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  sources,
  relatedQuestions,
  showFeedback,
  feedbackGiven,
  onFeedback,
  onQuestionClick,
}) => {
  const getSourceIcon = (domain: string) => {
    if (domain.includes('anaf') || domain.includes('mfinante') || domain.includes('legislatie')) {
      return '🏛️';
    }
    if (domain.includes('ceccar')) {
      return '👔';
    }
    return '📄';
  };

  // Detect if message is a simulation result
  const isSimulation = content.includes('[SIMULATION_RESULT]');
  const cleanContent = content.replace(/\[SIMULATION_RESULT\]/g, '').trim();

  // Parse chart data from message
  const parseChartData = (text: string): ChartData | null => {
    const chartMatch = text.match(/\[CHART_DATA\](.*?)\[\/CHART_DATA\]/s);
    if (chartMatch) {
      try {
        return JSON.parse(chartMatch[1]);
      } catch (e) {
        console.error('Failed to parse chart data:', e);
        return null;
      }
    }
    return null;
  };

  const chartData = parseChartData(content);
  const contentWithoutChart = content.replace(/\[CHART_DATA\].*?\[\/CHART_DATA\]/s, '').trim();

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-4',
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-foreground',
          isSimulation && 'border-2 border-red-500 bg-red-500/10'
        )}
      >
        {isSimulation && (
          <div className="flex items-center gap-2 text-red-500 font-bold mb-3 pb-2 border-b border-red-500/30">
            <AlertTriangle className="w-5 h-5" />
            REZULTAT SIMULARE - SCENARIU IPOTETIC
          </div>
        )}
        
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm">
          {chartData ? contentWithoutChart : cleanContent}
        </div>

        {/* Dynamic Chart Rendering */}
        {chartData && <StrategicChart chartData={chartData} />}

        {/* Sources */}
        {role === 'assistant' && sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
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
                  className="text-xs hover:underline flex items-start gap-1 text-primary hover:text-primary/80"
                >
                  <span>{getSourceIcon(source.domain)}</span>
                  <span className="flex-1">{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related Questions */}
        {role === 'assistant' && relatedQuestions && relatedQuestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold mb-2">Întrebări similare:</p>
            <div className="flex flex-wrap gap-2">
              {relatedQuestions.slice(0, 3).map((q, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  onClick={() => onQuestionClick?.(q)}
                  className="text-xs h-auto py-1 px-2"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Buttons */}
        {showFeedback && !feedbackGiven && onFeedback && (
          <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFeedback(1)}
              className="gap-1"
            >
              <ThumbsUp className="h-3 w-3" />
              Util
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFeedback(-1)}
              className="gap-1"
            >
              <ThumbsDown className="h-3 w-3" />
              Nu ajută
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
