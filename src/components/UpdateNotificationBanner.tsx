import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export const UpdateNotificationBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [localVersion, setLocalVersion] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('yana_app_version');
    setLocalVersion(stored);
  }, []);

  const { data: currentVersion } = useQuery({
    queryKey: ['current-app-version'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('version, title')
        .eq('is_current_version', true)
        .eq('status', 'published')
        .single();
      
      if (error) {
        console.warn('[UpdateNotificationBanner] Failed to fetch app updates:', error);
        return null; // Return null instead of throwing - feature is optional
      }
      return data;
    },
    refetchInterval: 30 * 60 * 1000, // 30 minutes - reduced from 5 to prevent UI flickering
    refetchOnWindowFocus: false, // Disable to reduce unnecessary checks
    staleTime: 10 * 60 * 1000, // 10 minutes - consider data fresh for 10 min
    retry: false, // Don't retry if app_updates table doesn't exist or has permission issues
  });

  const hasNewVersion = currentVersion && 
    localVersion !== null && 
    currentVersion.version !== localVersion;

  // Trigger slide-in animation when banner should show
  useEffect(() => {
    if (hasNewVersion && !dismissed) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [hasNewVersion, dismissed]);

  const handleRefresh = async () => {
    if (currentVersion) {
      localStorage.setItem('yana_app_version', currentVersion.version);
      
      // STEP 1: Șterge tot cache-ul Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // STEP 2: Șterge cache-ul browser-ului
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // STEP 3: HARD REFRESH (șterge și cache-ul memoriei)
      window.location.href = window.location.href + '?v=' + Date.now();
    }
  };

  // Detectează când Service Worker-ul se actualizează
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && !dismissed) {
                // Afișează banner-ul automat când SW se actualizează
                setIsVisible(true);
              }
            });
          }
        });
      });
    }
  }, [dismissed]);

  useEffect(() => {
    if (currentVersion && !localVersion) {
      localStorage.setItem('yana_app_version', currentVersion.version);
      setLocalVersion(currentVersion.version);
    }
  }, [currentVersion, localVersion]);

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
