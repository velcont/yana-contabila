import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuestionPattern {
  question_pattern: string;
  question_category: string;
  frequency: number;
}

interface QuickReplySuggestionsProps {
  suggestions: QuestionPattern[];
  onSelectSuggestion: (question: string) => void;
  title?: string;
  showFrequency?: boolean;
}

export const QuickReplySuggestions = ({ 
  suggestions, 
  onSelectSuggestion,
  title = "Sugestii Întrebări",
  showFrequency = false
}: QuickReplySuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Lightbulb className="h-3 w-3" />
        {title}
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => onSelectSuggestion(suggestion.question_pattern)}
              className="h-auto py-2 px-3 text-left whitespace-normal hover:bg-primary/5 hover:border-primary/50 transition-all group"
            >
              <div className="flex items-start gap-2 w-full">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium leading-snug">
                    {suggestion.question_pattern}
                  </p>
                  {showFrequency && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Întrebat {suggestion.frequency}x
                      </span>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};