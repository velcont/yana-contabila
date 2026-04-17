// KEY separată pentru versiunea semantică (din DB) vs BUILD_VERSION (pentru PWA cache)
const DB_VERSION_KEY = 'yana_db_version';
const REFRESH_COUNT_KEY = 'yana_refresh_count';
const MAX_REFRESH_COUNT = 2;

/**
 * Verifică dacă am depășit limita de refresh-uri în sesiunea curentă
 */
const isRefreshLimitReached = (): boolean => {
  const count = parseInt(sessionStorage.getItem(REFRESH_COUNT_KEY) || '0', 10);
  return count >= MAX_REFRESH_COUNT;
};

/**
 * Incrementează contorul de refresh-uri
 */
const incrementRefreshCount = (): void => {
  const count = parseInt(sessionStorage.getItem(REFRESH_COUNT_KEY) || '0', 10);
  sessionStorage.setItem(REFRESH_COUNT_KEY, String(count + 1));
};

/**
 * Funcție comună pentru refresh-ul aplicației cu curățare completă a cache-ului
 * Include protecție anti-loop: maxim 2 refresh-uri per sesiune
 */
export const performVersionRefresh = async () => {
  // GUARD: Verificăm dacă am depășit limita de refresh-uri
  if (isRefreshLimitReached()) {
    console.warn('[VERSION_REFRESH] Refresh limit reached (' + MAX_REFRESH_COUNT + ') - stopping to prevent loop');
    return;
  }

  // Incrementăm contorul ÎNAINTE de refresh
  incrementRefreshCount();

  try {
    // STEP 1: Dezînregistrează toate Service Worker-urile
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // STEP 2: Șterge toate cache-urile browser-ului
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // STEP 3: Hard refresh cu timestamp pentru bypass cache
    window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
  } catch (error) {
    console.error('[VERSION_REFRESH] Error during refresh:', error);
    window.location.reload();
  }
};

/**
 * Verifică dacă există o versiune nouă în DB față de localStorage
 */
export const checkForNewVersion = async (supabase: any): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('version')
      .eq('is_current_version', true)
      .eq('status', 'published')
      .maybeSingle();
    
    if (error || !data) return false;
    
    const localVersion = localStorage.getItem(DB_VERSION_KEY);
    
    // FIX: Dacă nu avem versiune salvată local (prima vizită pe acest device/browser),
    // salvăm versiunea curentă fără a declanșa refresh - altfel utilizatorul vede pagina
    // reîncărcându-se singură în primele secunde după login.
    if (!localVersion) {
      localStorage.setItem(DB_VERSION_KEY, data.version);
      return false;
    }
    
    return data.version !== localVersion;
  } catch (error) {
    console.warn('[VERSION_CHECK] Failed to check version:', error);
    return false;
  }
};

/**
 * Salvează versiunea curentă în localStorage - SINCRON și verificat
 */
export const saveCurrentVersion = async (supabase: any): Promise<void> => {
  try {
    const { data } = await supabase
      .from('app_updates')
      .select('version')
      .eq('is_current_version', true)
      .eq('status', 'published')
      .maybeSingle();
    
    if (data?.version) {
      localStorage.setItem(DB_VERSION_KEY, data.version);
      // Verificare că s-a salvat corect
      const saved = localStorage.getItem(DB_VERSION_KEY);
      if (saved !== data.version) {
        console.error('[VERSION_SAVE] Verification failed! Expected:', data.version, 'Got:', saved);
      }
    }
  } catch (error) {
    console.warn('[VERSION_SAVE] Failed to save version:', error);
  }
};
