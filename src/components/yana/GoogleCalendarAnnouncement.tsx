import { useState } from 'react';
import { Calendar, Sparkles, X, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'yana_gcal_announcement_dismissed_v1';

export const GoogleCalendarAnnouncement = () => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const isMobile = useIsMobile();

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
        <Calendar className="w-4 h-4 text-primary" />
      </div>

      <p className="text-sm font-medium text-foreground mb-2">
        Yana se conectează acum la Google Calendar.
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Întreab-o ce ai azi, programează întâlniri sau cere-i memento-uri — direct din chat.
      </p>

      <Link
        to="/settings?tab=integrations"
        onClick={handleDismiss}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Conectează calendarul
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};
