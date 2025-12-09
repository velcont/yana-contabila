import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProfitInsightPanelProps {
  totalRevenues: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  onBack: () => void;
  onFollowUp: () => void;
}

const ProfitInsightPanel: React.FC<ProfitInsightPanelProps> = ({
  totalRevenues,
  totalExpenses,
  netProfit,
  profitMargin,
  onBack,
  onFollowUp
}) => {
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('ro-RO', { 
      style: 'decimal', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(Math.abs(val)) + ' RON';

  const isProfit = netProfit > 0;
  const isLoss = netProfit < 0;
  const isBreakeven = netProfit === 0;

  const getStatusColor = () => {
    if (isProfit) return 'text-green-500';
    if (isLoss) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusBg = () => {
    if (isProfit) return 'bg-green-500/20 border-green-500/30';
    if (isLoss) return 'bg-red-500/20 border-red-500/30';
    return 'bg-yellow-500/20 border-yellow-500/30';
  };

  const getStatusIcon = () => {
    if (isProfit) return <TrendingUp className="h-8 w-8" />;
    if (isLoss) return <TrendingDown className="h-8 w-8" />;
    return <Minus className="h-8 w-8" />;
  };

  const getStatusText = () => {
    if (isProfit) return 'PROFIT';
    if (isLoss) return 'PIERDERE';
    return 'BREAK-EVEN';
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 animate-in fade-in duration-500 overflow-y-auto">
      {/* Header cu buton înapoi */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          📈 Cum stai cu Profitul?
        </h2>
      </div>

      {/* Indicator principal - Profit/Pierdere */}
      <Card className={`mb-6 border-2 ${getStatusBg()}`}>
        <CardContent className="p-6 text-center">
          <div className={`inline-flex items-center justify-center gap-3 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-3xl md:text-4xl font-bold">
              {getStatusText()}
            </span>
          </div>
          <div className={`text-4xl md:text-5xl font-bold mt-4 ${getStatusColor()}`}>
            {isLoss ? '-' : '+'}{formatMoney(netProfit)}
          </div>
          <div className="text-muted-foreground mt-2">
            Marja de profit: <span className={`font-semibold ${getStatusColor()}`}>
              {profitMargin.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detalii venituri vs cheltuieli */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border border-green-500/30 bg-green-500/10">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Venituri Totale</div>
            <div className="text-xl md:text-2xl font-bold text-green-500">
              {formatMoney(totalRevenues)}
            </div>
            <div className="text-xs text-muted-foreground">Clasa 7</div>
          </CardContent>
        </Card>

        <Card className="border border-red-500/30 bg-red-500/10">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Cheltuieli Totale</div>
            <div className="text-xl md:text-2xl font-bold text-red-500">
              {formatMoney(totalExpenses)}
            </div>
            <div className="text-xs text-muted-foreground">Clasa 6</div>
          </CardContent>
        </Card>
      </div>

      {/* Bară vizuală venituri vs cheltuieli */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-3 text-center">
            Raport Venituri / Cheltuieli
          </div>
          <div className="h-8 rounded-full overflow-hidden bg-muted flex">
            <div 
              className="bg-green-500 h-full transition-all duration-500"
              style={{ 
                width: `${totalRevenues + totalExpenses > 0 
                  ? (totalRevenues / (totalRevenues + totalExpenses)) * 100 
                  : 50}%` 
              }}
            />
            <div 
              className="bg-red-500 h-full transition-all duration-500"
              style={{ 
                width: `${totalRevenues + totalExpenses > 0 
                  ? (totalExpenses / (totalRevenues + totalExpenses)) * 100 
                  : 50}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Venituri</span>
            <span>Cheltuieli</span>
          </div>
        </CardContent>
      </Card>

      {/* Buton follow-up */}
      <Button
        onClick={onFollowUp}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
      >
        🕳️ Vrei să vezi care sunt cele mai mari cheltuieli?
      </Button>
    </div>
  );
};

export default ProfitInsightPanel;
