import { Crown, Building2, UserCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

export const AdminRoleSwitcher = () => {
  const { themeType, setThemeOverride, themeOverride } = useTheme();
  const { isAdmin } = useUserRole();

  if (!isAdmin) return null;

  const modes = [
    {
      id: null,
      name: 'Modul Real',
      description: 'Bazat pe abonamentul actual',
      icon: UserCircle,
    },
    {
      id: 'entrepreneur' as const,
      name: 'Modul Antreprenor',
      description: 'Interfață albastră',
      icon: Crown,
    },
    {
      id: 'accountant' as const,
      name: 'Modul Contabil',
      description: 'Interfață verde',
      icon: Building2,
    },
  ];

  const currentMode = modes.find((m) => m.id === themeOverride) || modes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentMode.name}</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            Admin
          </Badge>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          Comutare Mod (Admin)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = themeOverride === mode.id;

          return (
            <DropdownMenuItem
              key={mode.id || 'real'}
              onClick={() => setThemeOverride(mode.id)}
              className={isActive ? 'bg-accent' : ''}
            >
              <div className="flex items-start gap-3 w-full">
                <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-primary' : ''}`} />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {mode.name}
                    {isActive && (
                      <Badge variant="default" className="text-xs">
                        Activ
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {mode.description}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Mod curent real: {themeType === 'accountant' ? 'Contabil' : 'Antreprenor'}</p>
          <p>Schimbă între moduri pentru a testa interfața</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
