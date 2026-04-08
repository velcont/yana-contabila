import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performVersionRefresh } from '@/utils/versionRefresh';
import { analytics } from '@/utils/analytics';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DB_VERSION_KEY = 'yana_db_version';

/**
 * Banner NON-AGRESIV pentru actualizare versiune.
 * - Afișează banner când există versiune nouă
 * - NU face refresh automat (fără countdown)
 * - Utilizatorul decide când actualizează
 * - Protecție anti-loop prin sessionStorage
 */
export const VersionUpdateBanner = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: currentVersion } = useQuery({
    queryKey: ['app-version-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('version')
        .eq('is_current_version', true)
        .eq('status', 'published')
        .maybeSingle();
      
      if (error) {
        console.warn('[VersionBanner] Query error:', error.message);
        return null;
      }
      return data?.version || null;
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  
  const localVersion = typeof window !== 'undefined' 
    ? localStorage.getItem(DB_VERSION_KEY) 
    : null;
  
  // Determină dacă există o versiune nouă
  const hasNewVersion = currentVersion && localVersion && 
    currentVersion !== localVersion;
  
  // Salvează versiunea curentă la prima vizită
  useEffect(() => {
    // Curăță valori invalide (timestamp-uri cu prefix 'v')
    if (localVersion && localVersion.startsWith('v')) {
      localStorage.removeItem(DB_VERSION_KEY);
    }
    
    const cleanLocalVersion = localStorage.getItem(DB_VERSION_KEY);
    if (currentVersion && !cleanLocalVersion) {
      localStorage.setItem(DB_VERSION_KEY, currentVersion);
    }
  }, [currentVersion, localVersion]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      analytics.versionRefresh({
        from: localVersion,
        to: currentVersion!,
        trigger: 'banner_click',
        duration_ms: 0
      });
      
      // Salvăm versiunea SINCRON înainte de orice refresh
      if (currentVersion) {
        localStorage.setItem(DB_VERSION_KEY, currentVersion);
      }
      
      await performVersionRefresh();
    } catch (error) {
      console.error('[VersionUpdateBanner] Refresh failed:', error);
      setIsRefreshing(false);
    }
  };
  
  if (!hasNewVersion) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            ⚠️ Versiune nouă YANA ({currentVersion}) disponibilă
          </span>
        </div>
        
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white text-destructive hover:bg-white/90 font-semibold"
        >
          {isRefreshing ? 'Se actualizează...' : 'Actualizează'}
        </Button>
      </div>
    </div>
  );
};
