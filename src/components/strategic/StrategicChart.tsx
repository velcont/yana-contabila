import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  name: string;
  value: number;
  benchmark?: number;
  color?: string;
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface StrategicChartProps {
  chartData: ChartData;
}

export const StrategicChart: React.FC<StrategicChartProps> = ({ chartData }) => {
  const chartConfig = {
    user: {
      label: 'Tu',
      color: 'hsl(var(--chart-1))',
    },
    benchmark: {
      label: 'Industrie',
      color: 'hsl(var(--chart-2))',
    },
    alert: {
      label: 'Risc',
      color: 'hsl(var(--destructive))',
    },
  };

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const renderChart = () => {
    // Convert data for Recharts compatibility
    const rechartsData = chartData.data.map(point => ({
      ...point,
      fill: point.color,
    }));

    switch (chartData.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rechartsData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--chart-1))" 
                radius={[8, 8, 0, 0]}
              />
              {chartData.data[0]?.benchmark !== undefined && (
                <Bar 
                  dataKey="benchmark" 
                  fill="hsl(var(--chart-2))" 
                  radius={[8, 8, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rechartsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              >
                {rechartsData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rechartsData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
              />
              {chartData.data[0]?.benchmark !== undefined && (
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="mt-4 border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          📊 {chartData.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {chartData.xAxisLabel && chartData.yAxisLabel && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{chartData.xAxisLabel}</span>
            <span>{chartData.yAxisLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
