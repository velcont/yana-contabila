import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type RunwayData, type Alert as FinancialAlert } from '@/services/financialAnalysis';

interface FinancialSnapshotProps {
  cash: number;
  profit: number;
  runway: RunwayData | null;
  alertsCount: number;
  onScrollToChat: () => void;
  companyName?: string;
}

export const FinancialSnapshot = React.memo(({ 
  cash, 
  profit, 
  runway, 
  alertsCount,
  onScrollToChat,
  companyName 
}: FinancialSnapshotProps) => {
  return (
    <Card className="border-primary/30 shadow-xl">
      <CardHeader className="pb-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            Snapshot Financiar Rapid
            {companyName && (
              <Badge variant="outline" className="text-xs font-normal">
                {companyName}
              </Badge>
            )}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Cash Total */}
          <div className="p-6 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 rounded-xl text-white shadow-lg hover:scale-105 transition-transform">
            <div className="text-sm opacity-90 mb-2 font-medium">💰 Cash Total</div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(cash)}
            </div>
            <div className="text-xs opacity-80">Bank + Casă</div>
          </div>

          {/* Profit/Loss */}
          <div className={cn(
            "p-6 rounded-xl text-white shadow-lg hover:scale-105 transition-transform",
            profit >= 0
              ? "bg-gradient-to-br from-green-500 via-emerald-600 to-green-700"
              : "bg-gradient-to-br from-red-500 via-rose-600 to-red-700"
          )}>
            <div className="text-sm opacity-90 mb-2 font-medium">
              {profit >= 0 ? '✅ Profit Anual' : '🔴 Pierdere Anuală'}
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(Math.abs(profit))}
            </div>
            <div className="text-xs opacity-80">
              {profit >= 0 ? 'Rentabil' : 'Necesită atenție'}
            </div>
          </div>

          {/* Runway */}
          <div className="p-6 bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-700 rounded-xl text-white shadow-lg hover:scale-105 transition-transform">
            <div className="text-sm opacity-90 mb-2 font-medium">⏱️ Runway</div>
            <div className="text-3xl font-bold mb-1">
              {runway?.months === Infinity ? '∞' : runway?.months.toFixed(1)} luni
            </div>
            <div className="text-xs opacity-80">
              {runway?.months === Infinity ? 'Profitabil' : 'Până la cash zero'}
            </div>
          </div>

          {/* Alerte */}
          <div className="p-6 bg-gradient-to-br from-orange-500 via-red-500 to-red-700 rounded-xl text-white shadow-lg hover:scale-105 transition-transform">
            <div className="text-sm opacity-90 mb-2 font-medium">🔔 Alerte</div>
            <div className="text-3xl font-bold mb-1">
              {alertsCount}
            </div>
            <div className="text-xs opacity-80">
              {alertsCount === 0 ? 'Totul OK' : 'Atenție necesară'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FinancialSnapshot.displayName = 'FinancialSnapshot';
