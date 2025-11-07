/**
 * Component preloader utility
 * Preload components before they are needed to improve perceived performance
 */

type PreloadableComponent = 
  | 'chatAI'
  | 'dashboard'
  | 'fiscalChat'
  | 'strategicCouncil'
  | 'analytics'
  | 'companyManager'
  | 'crmClient'
  | 'emailManager';

const preloadCache = new Set<PreloadableComponent>();

const componentLoaders: Record<PreloadableComponent, () => Promise<any>> = {
  chatAI: () => import('@/components/ChatAI'),
  dashboard: () => import('@/components/Dashboard'),
  fiscalChat: () => import('@/components/FiscalChat'),
  strategicCouncil: () => import('@/components/StrategicCouncil'),
  analytics: () => import('@/components/AnalyticsCharts'),
  companyManager: () => import('@/components/CompanyManager'),
  crmClient: () => import('@/components/CRMClientForm'),
  emailManager: () => import('@/components/EmailManager'),
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
        console.log(`✅ Preloaded: ${component}`);
      })
      .catch((error) => {
        console.error(`❌ Failed to preload ${component}:`, error);
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
 * Preload critical components that are likely to be used soon
 */
export const preloadCriticalComponents = (): void => {
  // Wait a bit to not interfere with initial render
  setTimeout(() => {
    preloadComponents(['chatAI', 'dashboard']);
  }, 1000);
};

/**
 * Preload on hover - use this on buttons/links
 */
export const createPreloadHandler = (component: PreloadableComponent) => {
  return () => preloadComponent(component);
};

/**
 * Preload based on route
 */
export const preloadForRoute = (route: string): void => {
  const routePreloads: Record<string, PreloadableComponent[]> = {
    '/app': ['chatAI', 'dashboard'],
    '/strategic-advisor': ['strategicCouncil'],
    '/analytics': ['analytics'],
    '/crm': ['crmClient', 'emailManager'],
  };

  const components = routePreloads[route];
  if (components) {
    preloadComponents(components);
  }
};
