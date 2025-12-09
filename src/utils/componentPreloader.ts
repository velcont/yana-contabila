/**
 * Component preloader utility
 * Preload components before they are needed to improve perceived performance
 * Simplified version - v2
 */

type PreloadableComponent = 
  | 'chatAI'
  | 'dashboard'
  | 'fiscalChat'
  | 'strategicCouncil'
  | 'analytics';

const preloadCache = new Set<PreloadableComponent>();

const componentLoaders: Record<PreloadableComponent, () => Promise<any>> = {
  chatAI: () => import('@/components/ChatAI'),
  dashboard: () => import('@/components/Dashboard'),
  fiscalChat: () => import('@/components/FiscalChat'),
  strategicCouncil: () => import('@/components/StrategicCouncil'),
  analytics: () => import('@/components/AnalyticsCharts'),
};

/**
 * Preload a specific component
 */
export const preloadComponent = (component: PreloadableComponent): void => {
  if (preloadCache.has(component)) {
    return; // Already preloaded
  }

  const loader = componentLoaders[component];
  if (loader) {
    loader()
      .then(() => {
        preloadCache.add(component);
      })
      .catch((error) => {
        console.warn(`Failed to preload component ${component}:`, error);
      });
  }
};

/**
 * Preload multiple components
 */
export const preloadComponents = (components: PreloadableComponent[]): void => {
  components.forEach(preloadComponent);
};

/**
 * Preload critical components for initial app load
 */
export const preloadCriticalComponents = (): void => {
  preloadComponents(['chatAI', 'dashboard']);
};

/**
 * Preload components based on route
 */
export const preloadForRoute = (route: string): void => {
  switch (route) {
    case '/app':
      preloadComponents(['chatAI', 'dashboard', 'analytics']);
      break;
    case '/strategic-advisor':
      preloadComponents(['strategicCouncil']);
      break;
    default:
      // Unknown route, no specific preloading
      break;
  }
};

/**
 * Check if a component has been preloaded
 */
export const isPreloaded = (component: PreloadableComponent): boolean => {
  return preloadCache.has(component);
};

/**
 * Preload components after a delay (for non-critical components)
 */
export const preloadAfterDelay = (
  components: PreloadableComponent[],
  delayMs: number = 2000
): void => {
  setTimeout(() => {
    preloadComponents(components);
  }, delayMs);
};

/**
 * Preload components when the browser is idle
 */
export const preloadWhenIdle = (components: PreloadableComponent[]): void => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadComponents(components);
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    preloadAfterDelay(components, 1000);
  }
};