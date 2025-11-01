import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { type CashFlowData } from '@/services/financialAnalysis';

interface CashFlowChartProps {
  cashFlowForecast: CashFlowData | null;
  onScrollToChat: () => void;
  companyName?: string;
}

export const CashFlowChart = React.memo(({ cashFlowForecast, onScrollToChat, companyName }: CashFlowChartProps) => {
  if (!cashFlowForecast) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Cash Flow Forecast (90 zile)
              {companyName && (
                <Badge variant="outline" className="text-xs font-normal">
                  {companyName}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Proiecția evoluției cash-ului bazată pe trend-ul curent (Gratuit)
            </CardDescription>
          </div>
          <Button 
            onClick={onScrollToChat}
            size="sm"
            variant="outline"
            className="gap-2 ml-4"
          >
            💬 Sari la Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashFlowForecast.forecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip 
              formatter={(value: any) => [`${value.toFixed(2)} lei`, 'Cash']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Cash Proiectat"
            />
            <Line 
              type="monotone" 
              dataKey="threshold" 
              stroke="#ff0000" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Prag Critic (20%)"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Trend Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Trend:</strong>{' '}
            {cashFlowForecast.trendLine === 'positive' && '📈 Pozitiv - Cash-ul crește'}
            {cashFlowForecast.trendLine === 'negative' && '📉 Negativ - Cash-ul scade'}
            {cashFlowForecast.trendLine === 'stable' && '➡️ Stabil - Cash-ul rămâne constant'}
          </p>
          <p className="text-sm mt-1">
            <strong>Proiecție 90 zile:</strong> {cashFlowForecast.projectedBalance90Days.toFixed(2)} lei
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

CashFlowChart.displayName = 'CashFlowChart';
