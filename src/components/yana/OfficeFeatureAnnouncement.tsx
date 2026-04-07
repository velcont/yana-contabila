import { useState } from 'react';
import { FileText, Table, FileDown, Presentation, Sparkles, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const STORAGE_KEY = 'yana_office_announcement_dismissed';

export const OfficeFeatureAnnouncement = () => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const isMobile = useIsMobile();

  // Hide on mobile to save vertical space
  if (dismissed || isMobile) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mx-2 mb-3 p-4 rounded-xl border-2 border-primary/30 bg-card relative animate-in fade-in slide-in-from-top-2 duration-500">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Închide"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          <Sparkles className="w-3 h-3" />
          NOU
        </span>
      </div>

      <p className="text-sm font-medium text-foreground mb-2">
        Yana generează acum Word, Excel, PDF și PowerPoint.
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Spune-i ce document vrei — îl primești gata, pe email.
      </p>

      <div className="flex items-center gap-3 text-muted-foreground">
        <FileText className="w-4 h-4" />
        <Table className="w-4 h-4" />
        <FileDown className="w-4 h-4" />
        <Presentation className="w-4 h-4" />
      </div>
    </div>
  );
};
