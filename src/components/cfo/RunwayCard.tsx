import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type RunwayData } from '@/services/financialAnalysis';

interface RunwayCardProps {
  runway: RunwayData | null;
  currentCash: number;
  isLoading: boolean;
  onRefresh: () => void;
  onScrollToChat: () => void;
  companyName?: string;
}

export const RunwayCard = memo(({ runway, currentCash, isLoading, onRefresh, onScrollToChat, companyName }: RunwayCardProps) => {
  if (!runway) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard CFO</CardTitle>
          <CardDescription>Nicio balanță încărcată</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Se încarcă...' : '🔄 Refresh'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50',
          label: 'CRITIC',
          message: '🚨 URGENT: Lichiditate scăzută! Ia măsuri imediat.',
          progressValue: 20,
          progressClass: '[&>div]:bg-red-500'
        };
      case 'warning':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          label: 'ATENȚIE',
          message: '⚠️ Atenție: Runway sub 6 luni. Planifică acțiuni.',
          progressValue: 50,
          progressClass: '[&>div]:bg-yellow-500'
        };
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/50',
          label: 'SĂNĂTOS',
          message: '✅ Situație bună: Lichiditate suficientă.',
          progressValue: 80,
          progressClass: '[&>div]:bg-green-500'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/50',
          label: 'NORMAL',
          message: 'Situație financiară normală.',
          progressValue: 50,
          progressClass: '[&>div]:bg-gray-500'
        };
    }
  };

  const status = getStatusConfig(runway.status);

  return (
    <Card className={cn("border-2 transition-all", status.borderColor, status.bgColor)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6">
        <div className="flex-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            ⏳ Cash Runway
            {companyName && (
              <Badge variant="outline" className="text-xs font-normal">
                {companyName}
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    <strong>Runway</strong> = câte luni poți supraviețui cu cash-ul actual, 
                    la rata curentă de cheltuieli. Este un indicator critic de lichiditate.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {status.message}
          </CardDescription>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onScrollToChat}
            className="h-8 gap-2"
          >
            <MessageCircle className="h-3 w-3" />
            Întreabă CFO
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 gap-2"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className={cn("text-5xl font-bold", status.color)}>
            {runway.months === Infinity ? '∞' : runway.months.toFixed(1)}
          </span>
          <div>
            <span className="text-lg text-muted-foreground">
              {runway.months === Infinity ? 'Infinit' : 'luni'}
            </span>
            {runway.months !== Infinity && runway.days > 0 && (
              <p className="text-xs text-muted-foreground">
                (≈ {Math.floor(runway.days)} zile)
              </p>
            )}
          </div>
          <div className={cn(
            "ml-auto px-3 py-1 rounded-full text-xs font-bold",
            status.bgColor,
            status.color
          )}>
            {status.label}
          </div>
        </div>
        
        <Progress 
          value={status.progressValue} 
          className={cn("h-3", status.progressClass)}
        />
        
        <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Cash Disponibil</p>
            <p className="font-semibold">{formatCurrency(currentCash)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Burn Rate Lunar</p>
            <p className="font-semibold">
              {runway.months === Infinity 
                ? 'Profitabil' 
                : formatCurrency(currentCash / runway.months)
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

RunwayCard.displayName = 'RunwayCard';
