import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSubscription } from './SubscriptionContext';
import { useUserRole } from '@/hooks/useUserRole';

type ThemeType = 'entrepreneur' | 'accountant';

interface ThemeContextType {
  themeType: ThemeType;
  setThemeOverride: (theme: ThemeType | null) => void;
  themeOverride: ThemeType | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { subscriptionType, isAccountant } = useSubscription();
  const { isAdmin } = useUserRole();
  const [themeOverride, setThemeOverride] = useState<ThemeType | null>(null);
  const [themeType, setThemeType] = useState<ThemeType>('entrepreneur');

  useEffect(() => {
    // Admin can override theme for testing
    if (themeOverride && isAdmin) {
      setThemeType(themeOverride);
      applyTheme(themeOverride);
    } else if (isAccountant) {
      setThemeType('accountant');
      applyTheme('accountant');
    } else {
      setThemeType('entrepreneur');
      applyTheme('entrepreneur');
    }
  }, [subscriptionType, isAccountant, themeOverride, isAdmin]);

  const applyTheme = (theme: ThemeType) => {
    const root = document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('theme-accountant', 'theme-entrepreneur');
    
    if (theme === 'accountant') {
      root.classList.add('theme-accountant');
      // Green theme for accountants - using !important to ensure override
      root.style.setProperty('--primary', '160 84% 39%', 'important');  // Green
      root.style.setProperty('--primary-foreground', '0 0% 100%', 'important');
      root.style.setProperty('--accent', '160 60% 45%', 'important');
      root.style.setProperty('--accent-foreground', '0 0% 100%', 'important');
    } else {
      root.classList.add('theme-entrepreneur');
      // Blue theme for entrepreneurs (default)
      root.style.setProperty('--primary', '221.2 83.2% 53.3%', 'important'); // Blue
      root.style.setProperty('--primary-foreground', '210 40% 98%', 'important');
      root.style.setProperty('--accent', '210 40% 96.1%', 'important');
      root.style.setProperty('--accent-foreground', '222.2 47.4% 11.2%', 'important');
    }
  };

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
