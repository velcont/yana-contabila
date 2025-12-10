import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./utils/sentry";
import { performanceMonitor } from "./utils/performanceMonitor";
import { preloadCriticalComponents } from "./utils/componentPreloader";

// Initialize Sentry for error tracking
initSentry();

// Mark app initialization
performanceMonitor.mark('app-init');

// Set dark mode as default
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.toggle('dark', savedTheme === 'dark');

// ===== OPERAȚIUNEA PĂMÂNT PÂRJOLIT =====
// Verificare versiune ÎNAINTE de a randa aplicația
const executeScorchedEarth = async (): Promise<boolean> => {
  const SUPABASE_URL = "https://ygfsuoloxzjpiulogrjz.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnN1b2xveHpqcGl1bG9ncmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTUxNTUsImV4cCI6MjA3NDgzMTE1NX0.69qcg2ituWRE5GwUfrpc-D_fWlCfGCv0zw8gNxTmkqE";
  
  try {
    // 1. Fetch versiunea live de pe server
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/app_updates?is_current_version=eq.true&status=eq.published&select=version`,
      { 
        headers: { 
          'apikey': SUPABASE_KEY, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
    if (!response.ok) {
      console.warn('[SCORCHED_EARTH] Failed to fetch version, continuing...');
      return true; // Continuă dacă nu poate verifica
    }
    
    const data = await response.json();
    if (!data?.[0]?.version) {
      console.warn('[SCORCHED_EARTH] No version found, continuing...');
      return true; // Continuă dacă nu există versiune
    }
    
    const serverVersion = data[0].version;
    const localVersion = localStorage.getItem('yana_app_version');
    
    console.log('[SCORCHED_EARTH] Version check:', { localVersion, serverVersion });
    
    // 2. COMPARAȚIE: Dacă versiunea locală NU corespunde cu cea live
    if (localVersion && localVersion !== serverVersion) {
      console.log('[SCORCHED_EARTH] 🔥 VERSION MISMATCH DETECTED! Executing nuclear refresh...');
      
      // ACȚIUNE 1: Invalidare sesiune Supabase (forțează re-login)
      localStorage.removeItem('sb-ygfsuoloxzjpiulogrjz-auth-token');
      console.log('[SCORCHED_EARTH] ✓ Session invalidated');
      
      // ACȚIUNE 2: Curățare Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        console.log('[SCORCHED_EARTH] ✓ Service Workers unregistered');
      }
      
      // ACȚIUNE 3: Curățare cache-uri browser
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
        console.log('[SCORCHED_EARTH] ✓ Browser caches cleared');
      }
      
      // ACȚIUNE 4: Salvăm noua versiune ÎNAINTE de refresh
      localStorage.setItem('yana_app_version', serverVersion);
      console.log('[SCORCHED_EARTH] ✓ New version saved:', serverVersion);
      
      // ACȚIUNE 5: Hard refresh - NUCLEAR (cu timestamp pentru bypass cache)
      console.log('[SCORCHED_EARTH] 🚀 Executing hard refresh...');
      window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
      
      return false; // Nu randa aplicația - pagina face refresh
    }
    
    // Prima vizită - salvăm versiunea curentă
    if (!localVersion) {
      localStorage.setItem('yana_app_version', serverVersion);
      console.log('[SCORCHED_EARTH] First visit, version saved:', serverVersion);
    }
    
    return true; // Continuă cu randarea normală
    
  } catch (error) {
    console.warn('[SCORCHED_EARTH] Check failed, continuing normally:', error);
    return true; // Continuă dacă verificarea eșuează (fail-safe)
  }
};

// Execută verificarea versiunii și randează DOAR dacă versiunea e OK
executeScorchedEarth().then((shouldRender) => {
  if (shouldRender) {
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
    
    // Measure app initialization time
    performanceMonitor.measure('app-init');
    
    // Preload critical components after initial render
    preloadCriticalComponents();
  }
  // Dacă shouldRender = false, pagina deja face refresh - nu randăm nimic
});
