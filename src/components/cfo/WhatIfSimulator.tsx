import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserPlus, ShoppingCart, Scissors, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SimulationResult } from '@/services/financialAnalysis';

interface WhatIfSimulatorProps {
  newEmployees: number;
  avgSalary: number;
  revenueGrowth: number;
  simulationResult: SimulationResult | null;
  isLoading: boolean;
  onNewEmployeesChange: (value: number[]) => void;
  onAvgSalaryChange: (value: number[]) => void;
  onRevenueGrowthChange: (value: number[]) => void;
  onSimulate: () => void;
  onScrollToChat: () => void;
}

export const WhatIfSimulator = React.memo(({
  newEmployees,
  avgSalary,
  revenueGrowth,
  simulationResult,
  isLoading,
  onNewEmployeesChange,
  onAvgSalaryChange,
  onRevenueGrowthChange,
  onSimulate,
  onScrollToChat
}: WhatIfSimulatorProps) => {
  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              What-If Simulator
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                💎 0.25 lei
              </Badge>
            </CardTitle>
            <CardDescription>
              Testează scenarii "Ce se întâmplă dacă..." pentru decizii de afaceri
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
      <CardContent className="space-y-6">
        {/* Slider 1: Angajări Noi */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            <Label>Angajări Noi: <strong>{newEmployees}</strong> persoane</Label>
          </div>
          <Slider
            value={[newEmployees]}
            onValueChange={onNewEmployeesChange}
            min={0}
            max={10}
            step={1}
            className="mb-1"
          />
          <p className="text-xs text-muted-foreground">
            Câți oameni vrei să angajezi?
          </p>
        </div>

        {/* Slider 2: Salariu Mediu */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Scissors className="h-4 w-4 text-red-500" />
            <Label>Salariu Mediu: <strong>{avgSalary}</strong> lei/lună</Label>
          </div>
          <Slider
            value={[avgSalary]}
            onValueChange={onAvgSalaryChange}
            min={3000}
            max={15000}
            step={500}
            className="mb-1"
          />
          <p className="text-xs text-muted-foreground">
            Cu ce salariu vrei să angajezi?
          </p>
        </div>

        {/* Slider 3: Creștere Venituri */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-green-500" />
            <Label>Creștere Venituri: <strong>{revenueGrowth}%</strong></Label>
          </div>
          <Slider
            value={[revenueGrowth]}
            onValueChange={onRevenueGrowthChange}
            min={-50}
            max={100}
            step={5}
            className="mb-1"
          />
          <p className="text-xs text-muted-foreground">
            Cu cât crește/scade cifra de afaceri?
          </p>
        </div>

        {/* Buton Simulare */}
        <Button 
          onClick={onSimulate}
          disabled={isLoading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          {isLoading ? '⏳ Se calculează...' : '🚀 Simulează (0.25 lei)'}
        </Button>

        {/* Rezultat Simulare */}
        {simulationResult && (
          <Alert className={cn(
            "border-2",
            simulationResult.severity === 'success' && "border-green-500 bg-green-50 dark:bg-green-950",
            simulationResult.severity === 'warning' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
            simulationResult.severity === 'critical' && "border-red-500 bg-red-50 dark:bg-red-950"
          )}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">
              {simulationResult.severity === 'success' && '✅ Rezultat Pozitiv'}
              {simulationResult.severity === 'warning' && '⚠️ Atenție'}
              {simulationResult.severity === 'critical' && '🔴 Risc MAJOR'}
            </AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p><strong>Impact runway:</strong> {simulationResult.runwayChange > 0 ? '+' : ''}{simulationResult.runwayChange.toFixed(1)} luni ({simulationResult.runwayChangePercent > 0 ? '+' : ''}{simulationResult.runwayChangePercent.toFixed(0)}%)</p>
              <p><strong>Runway nou:</strong> {simulationResult.newRunway.months === Infinity ? '∞' : simulationResult.newRunway.months.toFixed(1)} luni</p>
              <p className="font-semibold">{simulationResult.recommendation}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
});

WhatIfSimulator.displayName = 'WhatIfSimulator';
