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

// Set dark mode as default and persist preference
const savedTheme = localStorage.getItem('theme');
if (!savedTheme) {
  localStorage.setItem('theme', 'dark');
}
document.documentElement.classList.toggle('dark', (savedTheme || 'dark') === 'dark');

// PWA: Listener pentru SW controller change - forțează reload când SW nou preia controlul
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] Service Worker controller changed - reloading');
    window.location.reload();
  });
}

// Randează aplicația imediat - versioning-ul se face prin VersionUpdateBanner
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Measure app initialization time
performanceMonitor.measure('app-init');

// Preload critical components after initial render
preloadCriticalComponents();
