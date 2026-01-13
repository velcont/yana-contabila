import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProactiveInitiativeCardProps {
  content: string;
  initiativeType: string;
  onDismiss: () => void;
  className?: string;
}

export function ProactiveInitiativeCard({ 
  content, 
  initiativeType, 
  onDismiss,
  className 
}: ProactiveInitiativeCardProps) {
  const isApology = initiativeType === 'self_correction_apology';

  return (
    <div 
      className={cn(
        "relative mx-auto max-w-3xl rounded-2xl p-4 mb-6 border",
        isApology 
          ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30"
          : "bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/30",
        className
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
        aria-label="Închide"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
          isApology 
            ? "bg-gradient-to-br from-amber-500 to-orange-500"
            : "bg-gradient-to-br from-primary to-accent"
        )}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">
            {isApology ? 'YANA vrea să-ți spună ceva' : 'Mesaj de la YANA'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {isApology ? 'Despre conversația noastră anterioară' : 'Inițiativă proactivă'}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-10">
        {content}
      </p>

      {/* Action hint */}
      <div className="mt-4 pl-10 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Poți să răspunzi direct în chat dacă vrei să continuăm discuția.
        </span>
      </div>
    </div>
  );
}
