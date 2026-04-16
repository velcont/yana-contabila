/**
 * Performance monitoring utilities
 */

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initObservers();
  }

  private initObservers() {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          console.log('📊 LCP:', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            console.log('📊 FID:', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Monitor long tasks - only warn for truly problematic ones (>200ms)
      // and only in development to avoid console noise in production
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          if (import.meta.env.MODE !== 'development') return;
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 200) {
              console.warn('⚠️ Long task detected:', Math.round(entry.duration), 'ms');
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Long task observer not supported
      }
    }
  }

  /**
   * Mark the start of a performance measurement
   */
  mark(name: string) {
    if ('performance' in window) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark the end of a performance measurement and log the duration
   */
  measure(name: string) {
    if ('performance' in window) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        console.log(`⚡ ${name}:`, measure.duration.toFixed(2), 'ms');
        
        // Clean up marks
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
      } catch (e) {
        console.warn('Error measuring performance:', e);
      }
    }
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals() {
    if (!('performance' in window)) return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      // Time to First Byte
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
      
      // First Contentful Paint
      fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      
      // DOM Content Loaded
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      
      // Load Complete
      loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      
      // Total Load Time
      totalLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
    };
  }

  /**
   * Log bundle sizes (requires webpack-bundle-analyzer in dev)
   */
  logBundleInfo() {
    console.group('📦 Bundle Information');
    console.log('Check webpack bundle analyzer for detailed breakdown');
    console.log('Recommendations:');
    console.log('- Keep main bundle under 200KB (gzipped)');
    console.log('- Lazy load routes and heavy components');
    console.log('- Use dynamic imports for code splitting');
    console.groupEnd();
  }

  /**
   * Clean up observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Log web vitals on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const vitals = performanceMonitor.getWebVitals();
      console.group('📊 Web Vitals');
      console.table(vitals);
      console.groupEnd();
    }, 0);
  });
}

// Cleanup on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}
