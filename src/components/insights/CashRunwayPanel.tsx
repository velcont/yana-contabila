import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface CashRunwayPanelProps {
  totalCash: number;
  monthlyBurn: number;
  survivalMonths: number;
  onBack: () => void;
  onFollowUp: () => void;
}

export const CashRunwayPanel = ({
  totalCash,
  monthlyBurn,
  survivalMonths,
  onBack,
  onFollowUp
}: CashRunwayPanelProps) => {
  // Determinare culoare bazată pe luni de supraviețuire
  const getColorScheme = () => {
    if (survivalMonths === Infinity || survivalMonths > 6) {
      return {
        bg: 'bg-green-500',
        bgLight: 'bg-green-500/20',
        border: 'border-green-500',
        text: 'text-green-600 dark:text-green-400',
        label: 'STABIL',
        icon: CheckCircle
      };
    }
    if (survivalMonths >= 3) {
      return {
        bg: 'bg-yellow-500',
        bgLight: 'bg-yellow-500/20',
        border: 'border-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
        label: 'ATENȚIE',
        icon: AlertTriangle
      };
    }
    return {
      bg: 'bg-red-500',
      bgLight: 'bg-red-500/20',
      border: 'border-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: 'CRITIC',
      icon: AlertTriangle
    };
  };

  const colorScheme = getColorScheme();
  const StatusIcon = colorScheme.icon;

  // Formatare numere
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value));
  };

  const formatMonths = (months: number) => {
    if (months === Infinity) return '∞';
    if (months > 99) return '99+';
    return months.toFixed(1);
  };

  // Calculare procentaj pentru bară (max 12 luni = 100%)
  const barPercentage = survivalMonths === Infinity 
    ? 100 
    : Math.min((survivalMonths / 12) * 100, 100);

  const isAccumulating = monthlyBurn >= 0;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header cu buton înapoi */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi
        </Button>
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          💰 Analiza Cash-ului
        </h2>
      </div>

      {/* A. Grafic Principal - Pista de Supraviețuire */}
      <Card className={`${colorScheme.bgLight} ${colorScheme.border} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${colorScheme.text}`} />
              <span className="font-semibold text-foreground">Pista de Supraviețuire</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${colorScheme.bgLight} ${colorScheme.border} border`}>
              <StatusIcon className={`h-4 w-4 ${colorScheme.text}`} />
              <span className={`text-sm font-bold ${colorScheme.text}`}>
                {colorScheme.label}
              </span>
            </div>
          </div>

          {/* Bara vizuală */}
          <div className="relative h-8 bg-muted rounded-full overflow-hidden mb-3">
            {/* Gradient background */}
            <div className="absolute inset-0 flex">
              <div className="w-1/4 bg-red-500/30" />
              <div className="w-1/4 bg-yellow-500/30" />
              <div className="w-1/2 bg-green-500/30" />
            </div>
            
            {/* Indicator poziție */}
            <div 
              className={`absolute top-0 left-0 h-full ${colorScheme.bg} transition-all duration-1000 ease-out rounded-full`}
              style={{ width: `${barPercentage}%` }}
            />
            
            {/* Markere pentru 3 și 6 luni */}
            <div className="absolute top-0 left-1/4 h-full w-0.5 bg-foreground/20" />
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-foreground/20" />
          </div>

          {/* Etichete sub bară */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>0 luni</span>
            <span>3 luni</span>
            <span>6 luni</span>
            <span>12+ luni</span>
          </div>

          {/* Valoare mare centrală */}
          <div className="mt-6 text-center">
            <span className={`text-5xl md:text-6xl font-bold ${colorScheme.text}`}>
              {formatMonths(survivalMonths)}
            </span>
            <span className={`text-2xl md:text-3xl font-semibold ${colorScheme.text} ml-2`}>
              {survivalMonths === 1 ? 'LUNĂ' : 'LUNI'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* B. Cifre Cheie - KPI-uri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI #1: Luni de Supraviețuire */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">LUNI DE SUPRAVIEȚUIRE</span>
            </div>
            <div className={`text-3xl font-bold ${colorScheme.text}`}>
              {formatMonths(survivalMonths)} {survivalMonths === 1 ? 'lună' : 'luni'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cash total: {formatMoney(totalCash)} RON
            </p>
          </CardContent>
        </Card>

        {/* KPI #2: Ardere Lunară Netă */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {isAccumulating ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {isAccumulating ? 'ACUMULARE LUNARĂ' : 'ARDERE LUNARĂ NETĂ'}
              </span>
            </div>
            <div className={`text-3xl font-bold ${isAccumulating ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isAccumulating ? '+' : '-'}{formatMoney(monthlyBurn)} RON
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isAccumulating 
                ? 'Firma acumulează bani lunar' 
                : 'Suma pierdută în fiecare lună'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* C. Buton Follow-up */}
      <Button
        onClick={onFollowUp}
        variant="outline"
        className="w-full h-14 text-base font-medium border-2 hover:border-primary hover:bg-primary/5 transition-all"
      >
        <span className="mr-2">🕳️</span>
        Vrei să vezi care sunt cele mai mari 3 "găuri negre" care îți consumă cash-ul?
      </Button>
    </div>
  );
};
