import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';

type ThemeRole = 'landing' | 'entrepreneur' | 'accountant' | 'admin';

interface ThemeRoleContextType {
  currentTheme: ThemeRole;
  setThemeOverride: (theme: ThemeRole | null) => void;
  themeOverride: ThemeRole | null;
}

const ThemeRoleContext = createContext<ThemeRoleContextType | undefined>(undefined);

export const ThemeRoleProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [themeOverride, setThemeOverride] = useState<ThemeRole | null>(null);

  const getCurrentTheme = (): ThemeRole => {
    const path = location.pathname;

    // Public pages ALWAYS use landing theme (violet) - regardless of user role
    if (path === '/' || path === '/landing' || path === '/auth' || path === '/terms' || path === '/privacy' || path === '/contact') {
      return 'landing';
    }

    // For authenticated pages, apply role-based theming
    // Admin pages use admin theme (orange)
    if (path.includes('/admin') || path === '/system-health' || path === '/analytics' || path === '/updates-manager') {
      return 'admin';
    }

    // Accountant pages use accountant theme (green)
    if (path.includes('/accountant') || path === '/crm' || path.includes('/yanacrm') || path.includes('/accountant-branding')) {
      return 'accountant';
    }

    // Entrepreneur pages use entrepreneur theme (blue)
    // This includes /app, /demo, /subscription, etc.
    return 'entrepreneur';
  };

  const currentTheme = themeOverride || getCurrentTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes and any previous inline overrides
    root.classList.remove('theme-entrepreneur', 'theme-accountant', 'theme-admin');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--sidebar-ring');
    
    // Add the appropriate theme class
    if (currentTheme === 'entrepreneur') {
      root.classList.add('theme-entrepreneur');
    } else if (currentTheme === 'accountant') {
      root.classList.add('theme-accountant');
    } else if (currentTheme === 'admin') {
      root.classList.add('theme-admin');
    }
    // Landing theme is the default (no class needed)
  }, [currentTheme]);

  return (
    <ThemeRoleContext.Provider value={{ currentTheme, setThemeOverride, themeOverride }}>
      {children}
    </ThemeRoleContext.Provider>
  );
};

export const useThemeRole = () => {
  const context = useContext(ThemeRoleContext);
  if (context === undefined) {
    throw new Error('useThemeRole must be used within a ThemeRoleProvider');
  }
  return context;
};
