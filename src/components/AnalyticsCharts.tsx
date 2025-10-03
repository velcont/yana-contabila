import { useState } from 'react';
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
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

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
    soldFurnizori: point.indicators.soldFurnizori || 0,
    soldClienti: point.indicators.soldClienti || 0,
    soldBanca: point.indicators.soldBanca || 0,
    soldCasa: point.indicators.soldCasa || 0,
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
        <div className="bg-card border-2 border-primary/20 rounded-lg p-4 shadow-2xl backdrop-blur-sm">
          <p className="font-bold mb-3 text-card-foreground border-b border-border pb-2">
            {payload[0]?.payload?.fullDate}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm py-1.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground font-medium">{entry.name}:</span>
              </div>
              <span className="font-bold text-card-foreground">
                {typeof entry.value === 'number' && entry.value > 1000 
                  ? formatCurrency(entry.value)
                  : typeof entry.value === 'number' 
                    ? entry.value.toFixed(1)
                    : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload, onClick }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <button
            key={`legend-${index}`}
            onClick={() => onClick(entry.dataKey)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 ${
              hiddenSeries[entry.dataKey]
                ? 'opacity-40 bg-muted/20'
                : 'bg-muted/50 shadow-sm'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </button>
        ))}
      </div>
    );
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

      {/* Grafice în format 2 coloane - Solduri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolutie Sold Furnizori */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Evoluție Sold Furnizori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorFurnizori" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
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
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--chart-5))', strokeWidth: 2, strokeDasharray: '5 5' }} />
                <Area 
                  type="monotone" 
                  dataKey="soldFurnizori" 
                  stroke="hsl(var(--chart-5))" 
                  fill="url(#colorFurnizori)"
                  name="Furnizori"
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolutie Sold Clienti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Evoluție Sold Clienți
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClienti" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
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
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  tickMargin={10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--chart-1))', strokeWidth: 2, strokeDasharray: '5 5' }} />
                <Area 
                  type="monotone" 
                  dataKey="soldClienti" 
                  stroke="hsl(var(--chart-1))" 
                  fill="url(#colorClienti)"
                  name="Clienți"
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolutie Sold Banca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Evoluție Sold Bancă
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBanca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
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
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--chart-2))', strokeWidth: 2, strokeDasharray: '5 5' }} />
                <Area 
                  type="monotone" 
                  dataKey="soldBanca" 
                  stroke="hsl(var(--chart-2))" 
                  fill="url(#colorBanca)"
                  name="Bancă"
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolutie Sold Casa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Evoluție Sold Casă
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCasa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
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
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--chart-3))', strokeWidth: 2, strokeDasharray: '5 5' }} />
                <Area 
                  type="monotone" 
                  dataKey="soldCasa" 
                  stroke="hsl(var(--chart-3))" 
                  fill="url(#colorCasa)"
                  name="Casă"
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grid cu grafice în 2 coloane - Indicatori */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grafic Indicatori Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Indicatori Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '5 5' }} />
                <Legend 
                  content={<CustomLegend onClick={toggleSeries} />}
                />
                <Line 
                  type="monotone" 
                  dataKey="dso" 
                  stroke="hsl(var(--chart-1))" 
                  name="DSO"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                  hide={hiddenSeries.dso}
                />
                <Line 
                  type="monotone" 
                  dataKey="dpo" 
                  stroke="hsl(var(--chart-2))" 
                  name="DPO"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                  hide={hiddenSeries.dpo}
                />
                <Line 
                  type="monotone" 
                  dataKey="ccc" 
                  stroke="hsl(var(--chart-3))" 
                  name="CCC"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  animationDuration={800}
                  hide={hiddenSeries.ccc}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafic Venituri vs Cheltuieli */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Venituri vs Cheltuieli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />
                <Legend 
                  content={<CustomLegend onClick={toggleSeries} />}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--chart-4))" 
                  name="Venituri"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  hide={hiddenSeries.revenue}
                />
                <Bar 
                  dataKey="expenses" 
                  fill="hsl(var(--chart-5))" 
                  name="Cheltuieli"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  hide={hiddenSeries.expenses}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grafic EBITDA - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Evoluție EBITDA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }} />
              <Area 
                type="monotone" 
                dataKey="ebitda" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorEBITDA)"
                name="EBITDA"
                strokeWidth={3}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};