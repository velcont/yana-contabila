import { Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContextIndicatorProps {
  companyName: string;
  onClear: () => void;
}

export function ContextIndicator({ companyName, onClear }: ContextIndicatorProps) {
  return (
    <div className="flex items-center justify-center px-4 py-2 bg-primary/5 border-b border-primary/10">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Context activ:</span>
        <span className="font-medium text-foreground">{companyName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-1"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}