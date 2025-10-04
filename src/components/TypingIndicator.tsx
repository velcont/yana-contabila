import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  message?: string;
}

export const TypingIndicator = ({ message = "Yana scrie..." }: TypingIndicatorProps) => {
  return (
    <div className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
      </div>
      <Card className="max-w-[80%] px-4 py-3 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{message}</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </Card>
    </div>
  );
};