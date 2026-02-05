import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles, Brain, Zap, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  message?: string;
  showProgress?: boolean;
  variant?: 'default' | 'thinking' | 'analyzing';
}

const THINKING_MESSAGES = [
  "Analizez contextul...",
  "Procesez informațiile...",
  "Formulez răspunsul...",
  "Caut date relevante...",
  "Structurez ideile...",
];

const ANALYZING_MESSAGES = [
  "Citesc documentul...",
  "Extrag datele financiare...",
  "Calculez indicatorii...",
  "Identific tendințele...",
  "Pregătesc analiza...",
];

export const TypingIndicator = ({ 
  message, 
  showProgress = true,
  variant = 'thinking'
}: TypingIndicatorProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(5);
  
  const messages = variant === 'analyzing' ? ANALYZING_MESSAGES : THINKING_MESSAGES;
  const displayMessage = message || messages[messageIndex];
  
  // Rotate through messages
  useEffect(() => {
    if (message) return; // Don't rotate if custom message provided
    
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [message, messages.length]);
  
  // Animate progress
  useEffect(() => {
    if (!showProgress) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        // Slow down as we approach 95%
        const increment = prev < 50 ? 8 : prev < 80 ? 4 : 1;
        return Math.min(95, prev + increment);
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, [showProgress]);
  
  const Icon = variant === 'analyzing' ? BarChart3 : variant === 'thinking' ? Brain : Sparkles;
  
  return (
    <div className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar with rotating glow */}
      <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-20 thinking-icon-rotate" />
        <Icon className="h-5 w-5 text-primary z-10 thinking-text-pulse" />
      </div>
      
      {/* Main thinking card with gradient border */}
      <Card className={cn(
        "max-w-[85%] px-5 py-4 thinking-indicator rounded-xl",
        "border-0 shadow-lg"
      )}>
        <div className="space-y-3">
          {/* Header with icon and main status */}
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary thinking-icon-rotate" />
            <span className="font-medium text-foreground">Yana gândește...</span>
          </div>
          
          {/* Progress bar */}
          {showProgress && (
            <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Dynamic message */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground thinking-text-pulse">
              {displayMessage}
            </span>
            <div className="flex gap-1 ml-1">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};