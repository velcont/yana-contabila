import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription } from './SubscriptionContext';
import { useUserRole } from '@/hooks/useUserRole';

type ThemeRole = 'landing' | 'entrepreneur' | 'accountant' | 'admin';

interface ThemeRoleContextType {
  currentTheme: ThemeRole;
}

const ThemeRoleContext = createContext<ThemeRoleContextType | undefined>(undefined);

export const ThemeRoleProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { isAccountant } = useSubscription();
  const { isAdmin } = useUserRole();

  const getCurrentTheme = (): ThemeRole => {
    const path = location.pathname;

    // Landing pages always use landing theme (violet)
    if (path === '/' || path === '/landing' || path === '/auth' || path === '/terms' || path === '/privacy' || path === '/contact') {
      return 'landing';
    }

    // Admin pages use admin theme (orange)
    if (isAdmin && (path.includes('/admin') || path === '/system-health' || path === '/analytics')) {
      return 'admin';
    }

    // Accountant pages use accountant theme (green)
    if (isAccountant || path.includes('/accountant') || path === '/crm') {
      return 'accountant';
    }

    // Entrepreneur pages use entrepreneur theme (blue)
    return 'entrepreneur';
  };

  const currentTheme = getCurrentTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-entrepreneur', 'theme-accountant', 'theme-admin');
    
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
    <ThemeRoleContext.Provider value={{ currentTheme }}>
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
