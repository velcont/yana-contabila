import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { performVersionRefresh } from '@/utils/versionRefresh';
import { analytics } from '@/utils/analytics';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// KEY separată pentru versiunea semantică (din DB) vs BUILD_VERSION (pentru PWA cache)
const DB_VERSION_KEY = 'yana_db_version';
const JUST_REFRESHED_KEY = 'yana_just_refreshed';
const FORCE_REFRESH_TIMEOUT = 60000; // 60 secunde înainte de force refresh

/**
 * Faza 2.5 AGRESIVĂ: Banner cu countdown + force refresh
 * 
 * Când detectează versiune nouă:
 * 1. Afișează banner cu countdown de 60 secunde
 * 2. Utilizatorul poate da click pentru refresh imediat
 * 3. Dacă ignoră, refresh-ul se face automat după 60s
 * 4. Dismiss-ul NU persistă - banner-ul reapare la fiecare încărcare
 */
export const VersionUpdateBanner = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const forceRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Verifică dacă tocmai s-a făcut refresh - și curăță flag-ul
  useEffect(() => {
    const wasJustRefreshed = sessionStorage.getItem(JUST_REFRESHED_KEY);
    if (wasJustRefreshed) {
      console.log('[VersionBanner] ✅ Refresh recent detectat, ascund banner-ul');
      setJustRefreshed(true);
      sessionStorage.removeItem(JUST_REFRESHED_KEY);
      // După 5 secunde, resetează flag-ul pentru a permite detectarea viitoare
      setTimeout(() => setJustRefreshed(false), 5000);
    }
  }, []);
  
  // Fetch versiunea curentă din DB - folosește maybeSingle() pentru a evita erori 406
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
    retry: false, // Nu reîncerca dacă nu există date
  });
  
  // Verifică versiunea locală (din DB, NU BUILD_VERSION)
  const localVersion = typeof window !== 'undefined' 
    ? localStorage.getItem(DB_VERSION_KEY) 
    : null;
  
  // Fallback: verifică BUILD_VERSION dacă DB nu returnează nimic
  const buildVersion = typeof window !== 'undefined' 
    ? (window as any).BUILD_VERSION 
    : null;
  
  // Debug logging pentru investigare
  console.log('[VersionBanner] DB version:', currentVersion, '| Local:', localVersion, '| Build:', buildVersion);
  
  // Determină dacă există o versiune nouă
  const hasNewVersion = currentVersion && localVersion && 
    currentVersion !== localVersion;
  
  // Salvează versiunea curentă la prima vizită (dacă nu există)
  useEffect(() => {
    if (currentVersion && !localVersion) {
      localStorage.setItem(DB_VERSION_KEY, currentVersion);
      console.log('[VersionBanner] Salvat versiunea inițială:', currentVersion);
    }
  }, [currentVersion, localVersion]);
  
  // AGRESIV: Când detectăm versiune nouă, pornim countdown pentru force refresh
  useEffect(() => {
    if (hasNewVersion && !isRefreshing) {
      console.log('[VersionBanner] Versiune nouă detectată:', currentVersion, '- pornesc countdown');
      
      // Pornim countdown vizual
      setCountdown(60);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Pornim timer pentru force refresh
      forceRefreshTimerRef.current = setTimeout(async () => {
        console.log('[VersionBanner] Force refresh după timeout');
        await handleRefresh('banner_timeout');
      }, FORCE_REFRESH_TIMEOUT);
      
      return () => {
        if (forceRefreshTimerRef.current) {
          clearTimeout(forceRefreshTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [hasNewVersion, currentVersion, isRefreshing]);
  
  const handleRefresh = async (trigger: 'banner_click' | 'banner_timeout' = 'banner_click') => {
    const startTime = Date.now();
    setIsRefreshing(true);
    
    // Curățăm timer-ele
    if (forceRefreshTimerRef.current) {
      clearTimeout(forceRefreshTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    try {
      // Trimite analytics
      analytics.versionRefresh({
        from: localVersion,
        to: currentVersion!,
        trigger,
        duration_ms: Date.now() - startTime
      });
      
      // Salvează noua versiune înainte de refresh
      if (currentVersion) {
        localStorage.setItem(DB_VERSION_KEY, currentVersion);
      }
      
      // Setează flag că tocmai s-a făcut refresh (folosim sessionStorage pentru a supraviețui refresh-ului)
      sessionStorage.setItem(JUST_REFRESHED_KEY, 'true');
      
      await performVersionRefresh();
    } catch (error) {
      console.error('[VersionUpdateBanner] Refresh failed:', error);
      setIsRefreshing(false);
    }
  };
  
  // Nu afișa dacă nu există versiune nouă, se face refresh, sau tocmai s-a făcut refresh
  if (!hasNewVersion || justRefreshed) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            ⚠️ Versiune nouă YANA ({currentVersion}) - Actualizare automată în {countdown}s
          </span>
        </div>
        
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleRefresh('banner_click')}
          disabled={isRefreshing}
          className="bg-white text-destructive hover:bg-white/90 font-semibold"
        >
          {isRefreshing ? 'Se actualizează...' : 'Actualizează ACUM'}
        </Button>
      </div>
    </div>
  );
};
