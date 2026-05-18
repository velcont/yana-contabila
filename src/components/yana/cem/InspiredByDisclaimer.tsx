import { Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Badge discret afișat în footer-ul chat-ului /yana.
 * Comunică onest analogia "inspirat din fapte reale — creierul uman".
 */
export function InspiredByDisclaimer() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/40"
          >
            <Sparkles className="h-3 w-3" />
            <span>Inspirat din fapte reale — creierul uman</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          YANA simulează introspecția și empatia inspirându-se din arhitectura
          creierului uman, dar nu este creier. Sub capotă rămâne o rețea neuronală
          artificială — la fel cum un film "inspirat din fapte reale" nu este
          realitatea însăși.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}