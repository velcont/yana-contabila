import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Toggle discret în header pentru Cognitive Emergence Mode.
 * Pulsație subtilă pe iconiță când e activ.
 */
export function CognitiveEmergenceToggle({ enabled, onToggle }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'gap-1.5 h-11 sm:h-10 touch-action-manipulation transition-colors',
              enabled
                ? 'text-primary hover:text-primary hover:bg-primary/10'
                : 'text-muted-foreground'
            )}
            title="Mod Emergență Cognitivă"
          >
            <Brain className={cn('h-4 w-4', enabled && 'animate-pulse')} />
            <span className="hidden md:inline text-xs font-medium">
              {enabled ? 'CEM activ' : 'CEM oprit'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
          <strong>Mod Emergență Cognitivă</strong>
          <br />
          YANA vorbește mai natural, introspectiv, cu metafore neuro-inspirate.
          Inspirat din creierul uman — nu este creier real.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}