import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { performVersionRefresh } from "@/utils/versionRefresh";

export const UpdateNotificationBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [localVersion, setLocalVersion] = useState<string | null>(null);

  // Inițializare: citim versiunea locală
  useEffect(() => {
    const stored = localStorage.getItem('yana_app_version');
    setLocalVersion(stored);
    
    // FIX CRITIC: Dacă nu există versiune locală salvată, forțăm salvarea primei versiuni
    // Acest lucru previne utilizatorii noi să vadă versiuni vechi
    if (!stored) {
      console.log('[UpdateNotificationBanner] No local version found - will save on first fetch');
    }
  }, []);

  const { data: currentVersion, refetch } = useQuery({
    queryKey: ['current-app-version'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('version, title')
        .eq('is_current_version', true)
        .eq('status', 'published')
        .maybeSingle();
      
      if (error) {
        console.warn('[UpdateNotificationBanner] Failed to fetch app updates:', error);
        return null;
      }
      return data;
    },
    // FIX: Interval redus de la 30 min la 5 min pentru detectare mai rapidă
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Re-activat pentru a detecta versiuni noi când user revine
    staleTime: 2 * 60 * 1000, // 2 minutes - consider data fresh for 2 min
    retry: false,
  });

  const hasNewVersion = currentVersion && 
    localVersion !== null && 
    currentVersion.version !== localVersion;

  // FIX CRITIC: Verificare IMEDIATĂ la încărcare pentru utilizatori noi
  // Dacă nu au versiune salvată, salvăm versiunea curentă
  useEffect(() => {
    if (currentVersion && localVersion === null) {
      console.log('[UpdateNotificationBanner] First visit - saving current version:', currentVersion.version);
      localStorage.setItem('yana_app_version', currentVersion.version);
      setLocalVersion(currentVersion.version);
    }
  }, [currentVersion, localVersion]);

  // Afișează banner-ul când există versiune nouă - FĂRĂ auto-refresh
  useEffect(() => {
    if (hasNewVersion && !dismissed) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [hasNewVersion, dismissed]);

  const handleRefresh = useCallback(async () => {
    if (currentVersion) {
      localStorage.setItem('yana_app_version', currentVersion.version);
      localStorage.setItem('yana_last_forced_refresh', Date.now().toString());
      await performVersionRefresh();
    }
  }, [currentVersion]);

  if (dismissed || !hasNewVersion) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm text-primary-foreground shadow-md border-b border-primary-foreground/10 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-1">
          <RefreshCw className="h-4 w-4 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              Versiune nouă: {currentVersion.version}
            </p>
            <p className="text-xs opacity-80 truncate">
              {currentVersion.title}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
            className="font-medium text-xs h-7 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Actualizează (curăță cache)
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            aria-label="Închide notificarea"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
