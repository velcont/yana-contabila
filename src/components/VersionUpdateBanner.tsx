import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performVersionRefresh } from '@/utils/versionRefresh';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// KEY separată pentru versiunea semantică (din DB) vs BUILD_VERSION (pentru PWA cache)
const DB_VERSION_KEY = 'yana_db_version';

/**
 * Faza 2.5: Banner persistent pentru utilizatori deja logați
 * Verifică periodic dacă există o versiune nouă și afișează un banner
 * pentru ca utilizatorul să poată actualiza manual.
 * 
 * NOTĂ: Folosește `yana_db_version` pentru versiunea semantică din DB,
 * separat de `yana_app_version` folosit pentru PWA cache busting.
 */
export const VersionUpdateBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch versiunea curentă din DB
  const { data: currentVersion } = useQuery({
    queryKey: ['app-version-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('version')
        .eq('is_current_version', true)
        .eq('status', 'published')
        .single();
      
      if (error) return null;
      return data?.version || null;
    },
    refetchInterval: 5 * 60 * 1000, // Verifică la fiecare 5 minute
    staleTime: 2 * 60 * 1000, // Cache 2 minute
    refetchOnWindowFocus: true,
  });
  
  // Verifică versiunea locală (din DB, NU BUILD_VERSION)
  const localVersion = typeof window !== 'undefined' 
    ? localStorage.getItem(DB_VERSION_KEY) 
    : null;
  
  // Determină dacă există o versiune nouă
  const hasNewVersion = currentVersion && localVersion && currentVersion !== localVersion;
  
  // Salvează versiunea curentă la prima vizită (dacă nu există)
  useEffect(() => {
    if (currentVersion && !localVersion) {
      localStorage.setItem(DB_VERSION_KEY, currentVersion);
    }
  }, [currentVersion, localVersion]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Salvează noua versiune înainte de refresh
      if (currentVersion) {
        localStorage.setItem(DB_VERSION_KEY, currentVersion);
      }
      await performVersionRefresh();
    } catch (error) {
      console.error('[VersionUpdateBanner] Refresh failed:', error);
      setIsRefreshing(false);
    }
  };
  
  // Nu afișa dacă:
  // - Nu există versiune nouă
  // - Banner-ul a fost închis
  // - Se face refresh
  if (!hasNewVersion || dismissed) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            O versiune nouă YANA este disponibilă ({currentVersion})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            {isRefreshing ? 'Se actualizează...' : 'Actualizează acum'}
          </Button>
          
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
