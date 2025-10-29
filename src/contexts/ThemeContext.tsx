import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useThemeRole } from './ThemeRoleContext';

type ThemeType = 'entrepreneur' | 'accountant';

interface ThemeContextType {
  themeType: ThemeType;
  setThemeOverride: (theme: ThemeType | null) => void;
  themeOverride: ThemeType | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useUserRole();
  const { currentTheme, setThemeOverride: setRoleThemeOverride, themeOverride: roleThemeOverride } = useThemeRole();
  // Mirror role theme override to keep both contexts in sync
  const themeOverride: ThemeType | null = (roleThemeOverride as ThemeType | null);
  const [themeType, setThemeType] = useState<ThemeType>('entrepreneur');

  // Keep ThemeRoleContext (route classes) in sync with ThemeContext overrides
  const setThemeOverrideSynced = (theme: ThemeType | null) => {
    // Single source of truth: ThemeRoleContext
    setRoleThemeOverride(theme);
  };
  useEffect(() => {
    // Determine theme based on route-driven theme, allow explicit override (used to switch modules)
    let next: ThemeType = currentTheme === 'accountant' ? 'accountant' : 'entrepreneur';
    if (themeOverride) {
      next = themeOverride;
    }
    
    setThemeType(next);
  }, [currentTheme, themeOverride, isAdmin]);

  return (
    <ThemeContext.Provider value={{ themeType, setThemeOverride: setThemeOverrideSynced, themeOverride }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
