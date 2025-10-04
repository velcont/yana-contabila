import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface QuestionPattern {
  question_pattern: string;
  question_category: string;
  frequency: number;
}

interface QuickReplySuggestionsProps {
  onSelectSuggestion: (question: string) => void;
  title?: string;
  showFrequency?: boolean;
  contextual?: boolean;
}

// Sugestii default pentru utilizatorii noi
const DEFAULT_SUGGESTIONS: QuestionPattern[] = [
  { question_pattern: "Simulează: dacă plătesc furnizorii în 60 zile în loc de 30, cum arată cash-ul?", question_category: "simulator", frequency: 0 },
  { question_pattern: "Care sunt Top 3 probleme și oportunități din ultima balanță?", question_category: "analysis", frequency: 0 },
  { question_pattern: "Creează plan de acțiune pentru îmbunătățirea DSO", question_category: "action_plan", frequency: 0 },
  { question_pattern: "Ce impact are un discount de 5% pentru plată în 15 zile?", question_category: "simulator", frequency: 0 },
  { question_pattern: "Care a fost profitul mediu în ultimele 6 luni?", question_category: "historical", frequency: 0 },
  { question_pattern: "Simulează reducere DSO cu 10 zile - impact cash flow", question_category: "simulator", frequency: 0 },
];

export const QuickReplySuggestions = ({ 
  onSelectSuggestion,
  title,
  showFrequency = false,
  contextual = true
}: QuickReplySuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<QuestionPattern[]>(DEFAULT_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isContextual, setIsContextual] = useState(false);

  useEffect(() => {
    if (contextual) {
      loadContextualSuggestions();
    }
  }, [contextual]);

  const loadContextualSuggestions = async () => {
    setIsLoading(true);
    try {
      // Încarcă pattern-urile frecvente ale utilizatorului
      const { data: userPatterns } = await supabase
        .from('conversation_history')
        .select('content, metadata')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(20);

      if (userPatterns && userPatterns.length > 0) {
        // Încarcă pattern-urile globale cu frecvența lor
        const { data: globalPatterns } = await supabase
          .from('chat_patterns')
          .select('question_pattern, question_category, frequency')
          .order('frequency', { ascending: false })
          .limit(10);

        if (globalPatterns && globalPatterns.length > 0) {
          // Extrage categoriile întrebărilor utilizatorului
          const userCategories = new Set(
            userPatterns
              .map(msg => {
                const metadata = msg.metadata as any;
                return metadata?.question_category;
              })
              .filter(Boolean)
          );

          // Filtrează pattern-urile relevante pentru utilizator
          const contextualPatterns = globalPatterns.filter(
            p => userCategories.has(p.question_category)
          );

          if (contextualPatterns.length >= 2) {
            // Avem suficiente pattern-uri contextuale
            setSuggestions(contextualPatterns.slice(0, 4));
            setIsContextual(true);
          } else {
            // Completăm cu pattern-uri populare generale
            setSuggestions(globalPatterns.slice(0, 4));
            setIsContextual(false);
          }
        } else {
          setSuggestions(DEFAULT_SUGGESTIONS);
          setIsContextual(false);
        }
      } else {
        // Utilizator nou - afișăm pattern-urile cele mai populare
        const { data: popularPatterns } = await supabase
          .from('chat_patterns')
          .select('question_pattern, question_category, frequency')
          .order('frequency', { ascending: false })
          .limit(4);

        if (popularPatterns && popularPatterns.length > 0) {
          setSuggestions(popularPatterns);
        } else {
          setSuggestions(DEFAULT_SUGGESTIONS);
        }
        setIsContextual(false);
      }
    } catch (error) {
      console.error('Error loading contextual suggestions:', error);
      setSuggestions(DEFAULT_SUGGESTIONS);
      setIsContextual(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (suggestions.length === 0 && !isLoading) return null;

  const displayTitle = title || (isContextual ? "Sugestii Personalizate" : "Întrebări Populare");

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        {isContextual ? (
          <>
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-primary">{displayTitle}</span>
          </>
        ) : (
          <>
            <Lightbulb className="h-3 w-3" />
            {displayTitle}
          </>
        )}
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-48 bg-muted/50 animate-pulse rounded-md" />
              ))}
            </>
          ) : (
            suggestions.map((suggestion, idx) => (
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
                    {showFrequency && suggestion.frequency > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {suggestion.frequency}x
                        </span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
