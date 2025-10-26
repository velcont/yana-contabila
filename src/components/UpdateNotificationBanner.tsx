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
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minute
    refetchOnWindowFocus: true,
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

  const handleRefresh = () => {
    if (currentVersion) {
      localStorage.setItem('yana_app_version', currentVersion.version);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (currentVersion && !localVersion) {
      localStorage.setItem('yana_app_version', currentVersion.version);
      setLocalVersion(currentVersion.version);
    }
  }, [currentVersion, localVersion]);

  if (dismissed || !hasNewVersion) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <RefreshCw className="h-5 w-5 animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold">
              Versiune nouă disponibilă: {currentVersion.version}
            </p>
            <p className="text-sm opacity-90">
              {currentVersion.title}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
            className="font-semibold"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizează Acum
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            aria-label="Închide notificarea"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
