// KEY separată pentru versiunea semantică (din DB) vs BUILD_VERSION (pentru PWA cache)
// yana_app_version = BUILD_VERSION (timestamp) - folosit în index.html pentru PWA cache busting
// yana_db_version = versiunea semantică din DB (ex: 4.0.0) - folosit pentru VersionUpdateBanner
const DB_VERSION_KEY = 'yana_db_version';

/**
 * Funcție comună pentru refresh-ul aplicației cu curățare completă a cache-ului
 * Folosită la login, logout recovery și verificare inactivitate >24h
 */
export const performVersionRefresh = async () => {
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
    // Fallback: refresh simplu dacă curățarea cache-ului eșuează
    window.location.reload();
  }
};

/**
 * Verifică dacă există o versiune nouă în DB față de localStorage
 * Folosește DB_VERSION_KEY pentru versiunea semantică
 */
export const checkForNewVersion = async (supabase: any): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('version')
      .eq('is_current_version', true)
      .eq('status', 'published')
      .single();
    
    if (error || !data) return false;
    
    const localVersion = localStorage.getItem(DB_VERSION_KEY);
    return data.version !== localVersion;
  } catch (error) {
    console.warn('[VERSION_CHECK] Failed to check version:', error);
    return false;
  }
};

/**
 * Salvează versiunea curentă în localStorage
 * Folosește DB_VERSION_KEY pentru versiunea semantică
 */
export const saveCurrentVersion = async (supabase: any): Promise<void> => {
  try {
    const { data } = await supabase
      .from('app_updates')
      .select('version')
      .eq('is_current_version', true)
      .eq('status', 'published')
      .single();
    
    if (data?.version) {
      localStorage.setItem(DB_VERSION_KEY, data.version);
    }
  } catch (error) {
    console.warn('[VERSION_SAVE] Failed to save version:', error);
  }
};
