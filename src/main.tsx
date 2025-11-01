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

const root = createRoot(document.getElementById("root")!);

root.render(<App />);

// Measure app initialization time
performanceMonitor.measure('app-init');

// Preload critical components after initial render
preloadCriticalComponents();
