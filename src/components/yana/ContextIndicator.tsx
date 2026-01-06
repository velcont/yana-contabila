import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContextIndicatorProps {
  companyName: string;
  onClear: () => void;
}

export function ContextIndicator({ companyName, onClear }: ContextIndicatorProps) {
  return (
    <div className="flex items-center justify-center px-4 py-1.5 border-b border-border/30">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Context:</span>
        <span className="font-medium text-foreground/80">{companyName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-50 hover:opacity-100"
          onClick={onClear}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}