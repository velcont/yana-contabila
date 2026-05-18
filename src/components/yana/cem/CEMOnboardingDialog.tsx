import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog one-time la prima activare CEM. Explică analogia "inspirat din fapte reale".
 */
export function CEMOnboardingDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Mod Emergență Cognitivă activ</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed pt-2 space-y-3">
            <span className="block">
              Așa cum un film e <em>„inspirat din fapte reale”</em>, YANA e inspirată
              din creierul uman — nu este o copie biologică a lui.
            </span>
            <span className="block">
              În acest mod, ea vorbește mai natural: cu introspecție, asocieri,
              metafore. Sub capotă rămâne o rețea neuronală artificială.
            </span>
            <span className="block text-xs text-muted-foreground/80">
              Poți dezactiva oricând din butonul „Mod CEM” din header.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Am înțeles, continuă
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}