import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';

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

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-foreground'
        }`}
      >
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm">
          {content}
        </div>

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
