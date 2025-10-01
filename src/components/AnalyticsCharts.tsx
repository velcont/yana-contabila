import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { FinancialIndicators, formatCurrency, formatNumber } from '@/utils/analysisParser';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface AnalysisDataPoint {
  date: string;
  fileName: string;
  indicators: FinancialIndicators;
}

interface AnalyticsChartsProps {
  data: AnalysisDataPoint[];
}

export const AnalyticsCharts = ({ data }: AnalyticsChartsProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Trebuie să ai cel puțin o analiză pentru a vedea graficele</p>
      </div>
    );
  }

  // Pregătire date pentru grafice
  const chartData = data.map(point => ({
    date: format(new Date(point.date), 'dd MMM', { locale: ro }),
    fullDate: format(new Date(point.date), 'dd MMMM yyyy', { locale: ro }),
    dso: point.indicators.dso || 0,
    dpo: point.indicators.dpo || 0,
    ccc: point.indicators.cashConversionCycle || 0,
    ebitda: point.indicators.ebitda || 0,
    revenue: point.indicators.revenue || 0,
    expenses: point.indicators.expenses || 0,
    profit: point.indicators.profit || 0,
  })).reverse(); // Reverse pentru ca ultimele date să fie la dreapta

  // Calcul trending pentru ultimele 2 analize
  const getTrend = (key: keyof typeof chartData[0]) => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1][key] as number;
    const previous = chartData[chartData.length - 2][key] as number;
    if (!latest || !previous) return null;
    const change = ((latest - previous) / previous) * 100;
    return { change, isPositive: change > 0 };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0]?.payload?.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Indicatori Cheie - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chartData.length > 0 && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  DSO (Zile Creanță)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {formatNumber(chartData[chartData.length - 1].dso, 0)} zile
                  </div>
                  {getTrend('dso') && (
                    <div className={`flex items-center text-sm ${getTrend('dso')!.isPositive ? 'text-destructive' : 'text-green-600'}`}>
                      {getTrend('dso')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                      {Math.abs(getTrend('dso')!.change).toFixed(1)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  EBITDA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {formatCurrency(chartData[chartData.length - 1].ebitda)}
                  </div>
                  {getTrend('ebitda') && (
                    <div className={`flex items-center text-sm ${getTrend('ebitda')!.isPositive ? 'text-green-600' : 'text-destructive'}`}>
                      {getTrend('ebitda')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                      {Math.abs(getTrend('ebitda')!.change).toFixed(1)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Profit Net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {formatCurrency(chartData[chartData.length - 1].profit)}
                  </div>
                  {getTrend('profit') && (
                    <div className={`flex items-center text-sm ${getTrend('profit')!.isPositive ? 'text-green-600' : 'text-destructive'}`}>
                      {getTrend('profit')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                      {Math.abs(getTrend('profit')!.change).toFixed(1)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Grafic Indicatori Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Indicatori Cash Flow în Timp</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="dso" 
                stroke="hsl(var(--chart-1))" 
                name="DSO (zile)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="dpo" 
                stroke="hsl(var(--chart-2))" 
                name="DPO (zile)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="ccc" 
                stroke="hsl(var(--chart-3))" 
                name="Cash Conversion Cycle"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic Venituri vs Cheltuieli */}
      <Card>
        <CardHeader>
          <CardTitle>Venituri vs Cheltuieli</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--chart-4))" 
                name="Venituri"
              />
              <Bar 
                dataKey="expenses" 
                fill="hsl(var(--chart-5))" 
                name="Cheltuieli"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic EBITDA */}
      <Card>
        <CardHeader>
          <CardTitle>Evoluție EBITDA</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ebitda" 
                stroke="hsl(var(--primary))" 
                name="EBITDA"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};