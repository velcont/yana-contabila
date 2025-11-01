import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type RunwayData, type Alert as FinancialAlert } from '@/services/financialAnalysis';

interface FinancialSnapshotProps {
  cash: number;
  profit: number;
  runway: RunwayData | null;
  alertsCount: number;
  onScrollToChat: () => void;
}

export const FinancialSnapshot = React.memo(({ 
  cash, 
  profit, 
  runway, 
  alertsCount,
  onScrollToChat 
}: FinancialSnapshotProps) => {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Snapshot Financiar Rapid
          </CardTitle>
          <Button 
            onClick={onScrollToChat}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            💬 Sari la Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cash Total */}
          <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white">
            <div className="text-xs opacity-80 mb-1">💰 Cash Total</div>
            <div className="text-2xl font-bold">
              {formatCurrency(cash)}
            </div>
          </div>

          {/* Profit/Loss */}
          <div className={cn(
            "p-4 rounded-xl text-white",
            profit >= 0
              ? "bg-gradient-to-br from-green-500 to-emerald-600"
              : "bg-gradient-to-br from-red-500 to-rose-600"
          )}>
            <div className="text-xs opacity-80 mb-1">
              {profit >= 0 ? '✅ Profit' : '🔴 Pierdere'}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(Math.abs(profit))}
            </div>
          </div>

          {/* Runway */}
          <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
            <div className="text-xs opacity-80 mb-1">⏱️ Runway</div>
            <div className="text-2xl font-bold">
              {runway?.months === Infinity ? '∞' : runway?.months.toFixed(1)} luni
            </div>
          </div>

          {/* Alerte */}
          <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl text-white">
            <div className="text-xs opacity-80 mb-1">🔔 Alerte</div>
            <div className="text-2xl font-bold">
              {alertsCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FinancialSnapshot.displayName = 'FinancialSnapshot';
