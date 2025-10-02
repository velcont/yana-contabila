import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { FinancialIndicators, formatCurrency, formatNumber } from '@/utils/analysisParser';
import { TrendingUp, TrendingDown, Activity, DollarSign, Calendar, AlertCircle, Clock, PieChart, BarChart3 } from 'lucide-react';

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

  // Funcții pentru alerte
  const getDSOAlert = (dso: number) => {
    if (dso > 60) return { level: 'danger', text: 'Prea mare!' };
    if (dso > 45) return { level: 'warning', text: 'Atenție' };
    return { level: 'success', text: 'Bine' };
  };

  const getEBITDAAlert = (ebitda: number) => {
    if (ebitda < 0) return { level: 'danger', text: 'Negativ!' };
    if (ebitda < 10000) return { level: 'warning', text: 'Scăzut' };
    return { level: 'success', text: 'Sănătos' };
  };

  const getProfitAlert = (profit: number) => {
    if (profit < 0) return { level: 'danger', text: 'Pierdere!' };
    if (profit < 5000) return { level: 'warning', text: 'Scăzut' };
    return { level: 'success', text: 'Profitabil' };
  };

  const getBadgeVariant = (level: string): "default" | "destructive" | "secondary" => {
    if (level === 'danger') return 'destructive';
    if (level === 'warning') return 'secondary';
    return 'default';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-xl">
          <p className="font-semibold mb-2 text-card-foreground">{payload[0]?.payload?.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-card-foreground">
                {typeof entry.value === 'number' && entry.value > 1000 
                  ? formatCurrency(entry.value)
                  : entry.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const latestData = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      {/* Indicatori Cheie - KPI Cards Îmbunătățite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* DSO Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                DSO (Zile Creanță)
              </CardTitle>
              <Badge variant={getBadgeVariant(getDSOAlert(latestData.dso).level)} className="text-xs">
                {getDSOAlert(latestData.dso).text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold">
                {formatNumber(latestData.dso, 0)} <span className="text-lg text-muted-foreground">zile</span>
              </div>
              {getTrend('dso') && (
                <div className={`flex items-center text-sm font-medium ${getTrend('dso')!.isPositive ? 'text-destructive' : 'text-green-600'}`}>
                  {getTrend('dso')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(getTrend('dso')!.change).toFixed(1)}%
                </div>
              )}
            </div>
            {/* Mini Sparkline */}
            <div className="h-12 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-5)}>
                  <defs>
                    <linearGradient id="dsoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="dso" 
                    stroke="hsl(var(--chart-1))" 
                    fill="url(#dsoGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* EBITDA Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                EBITDA
              </CardTitle>
              <Badge variant={getBadgeVariant(getEBITDAAlert(latestData.ebitda).level)} className="text-xs">
                {getEBITDAAlert(latestData.ebitda).text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold">
                {formatCurrency(latestData.ebitda)}
              </div>
              {getTrend('ebitda') && (
                <div className={`flex items-center text-sm font-medium ${getTrend('ebitda')!.isPositive ? 'text-green-600' : 'text-destructive'}`}>
                  {getTrend('ebitda')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(getTrend('ebitda')!.change).toFixed(1)}%
                </div>
              )}
            </div>
            {/* Mini Sparkline */}
            <div className="h-12 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-5)}>
                  <defs>
                    <linearGradient id="ebitdaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="ebitda" 
                    stroke="hsl(var(--accent))" 
                    fill="url(#ebitdaGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit Net Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-chart-4/5 rounded-full -mr-16 -mt-16 group-hover:bg-chart-4/10 transition-colors" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Profit Net
              </CardTitle>
              <Badge variant={getBadgeVariant(getProfitAlert(latestData.profit).level)} className="text-xs">
                {getProfitAlert(latestData.profit).text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-end justify-between mb-3">
              <div className="text-3xl font-bold">
                {formatCurrency(latestData.profit)}
              </div>
              {getTrend('profit') && (
                <div className={`flex items-center text-sm font-medium ${getTrend('profit')!.isPositive ? 'text-green-600' : 'text-destructive'}`}>
                  {getTrend('profit')!.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(getTrend('profit')!.change).toFixed(1)}%
                </div>
              )}
            </div>
            {/* Mini Sparkline */}
            <div className="h-12 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-5)}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--chart-4))" 
                    fill="url(#profitGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafic Indicatori Cash Flow - Îmbunătățit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Indicatori Cash Flow în Timp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorDSO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={10}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="dso" 
                stroke="hsl(var(--chart-1))" 
                name="DSO (zile)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="dpo" 
                stroke="hsl(var(--chart-2))" 
                name="DPO (zile)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="ccc" 
                stroke="hsl(var(--chart-3))" 
                name="Cash Conversion Cycle"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic Venituri vs Cheltuieli - Îmbunătățit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Venituri vs Cheltuieli
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={10}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                tickMargin={10}
              />
              <Tooltip 
                content={<CustomTooltip />}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="square"
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--chart-4))" 
                name="Venituri"
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="expenses" 
                fill="hsl(var(--chart-5))" 
                name="Cheltuieli"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic EBITDA - Îmbunătățit cu Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evoluție EBITDA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEBITDA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={10}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area 
                type="monotone" 
                dataKey="ebitda" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorEBITDA)"
                name="EBITDA"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};