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
  const { currentTheme } = useThemeRole();
  const [themeOverride, setThemeOverride] = useState<ThemeType | null>(null);
  const [themeType, setThemeType] = useState<ThemeType>('entrepreneur');

  useEffect(() => {
    // Determine theme based on route-driven theme, allow explicit override (used to switch modules)
    let next: ThemeType = currentTheme === 'accountant' ? 'accountant' : 'entrepreneur';
    if (themeOverride) {
      next = themeOverride;
    }
    
    console.log('🎨 [THEME CONTEXT] Setting themeType:', next, 'from currentTheme:', currentTheme, 'override:', themeOverride);
    
    setThemeType(next);
  }, [currentTheme, themeOverride, isAdmin]);

  return (
    <ThemeContext.Provider value={{ themeType, setThemeOverride, themeOverride }}>
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
