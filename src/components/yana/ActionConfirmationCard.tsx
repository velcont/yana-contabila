import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ActionConfirmationData {
  actionId: string;
  actionText: string;
  category: string;
  preview?: string;
}

interface ActionConfirmationCardProps {
  data: ActionConfirmationData;
  title?: string;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onEdit: (actionId: string) => void;
}

export function ActionConfirmationCard({ data, title, onConfirm, onReject, onEdit }: ActionConfirmationCardProps) {
  const categoryEmoji: Record<string, string> = {
    email: '📧',
    document: '📄',
    negociere: '🤝',
    fiscal: '📋',
    financiar: '💰',
  };

  const emoji = categoryEmoji[data.category] || '⚡';

  return (
    <Card className="p-4 bg-background/50 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">{title || 'Confirmare acțiune'}</p>
            <p className="text-sm text-muted-foreground mt-1">{data.actionText}</p>
          </div>
        </div>
        {data.preview && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
            {data.preview}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="flex-1 gap-1.5"
            onClick={() => onConfirm(data.actionId)}
          >
            <Check className="h-3.5 w-3.5" />
            Confirmă
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => onEdit(data.actionId)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editează
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => onReject(data.actionId)}
          >
            <X className="h-3.5 w-3.5" />
            Anulează
          </Button>
        </div>
      </div>
    </Card>
  );
}
