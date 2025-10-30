import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getLatestFinancialData,
  calculateRunway,
  calculateCashFlowForecast,
  simulateWhatIf,
  detectFinancialAlerts,
  formatCurrency,
  type FinancialData,
  type RunwayData,
  type CashFlowData,
  type SimulationResult,
  type Alert as FinancialAlert
} from '@/services/financialAnalysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, UserPlus, ShoppingCart, Scissors, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YanaCFODashboardProps {
  userId: string;
  creditRemaining: number;
  onCreditDeduct: (amount: number) => Promise<boolean>;
}

export const YanaCFODashboard = ({ userId, creditRemaining, onCreditDeduct }: YanaCFODashboardProps) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [runway, setRunway] = useState<RunwayData | null>(null);
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowData | null>(null);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCFOResponseDialog, setShowCFOResponseDialog] = useState(false);
  const [cfoResponse, setCFOResponse] = useState('');
  const { toast } = useToast();

  // What-If Simulator state
  const [newEmployees, setNewEmployees] = useState(0);
  const [avgSalary, setAvgSalary] = useState(5000);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Load initial data
  useEffect(() => {
    handleRefreshDashboard();
  }, [userId]);

  const handleRefreshDashboard = async () => {
    const cost = 0.25;
    const success = await onCreditDeduct(cost);
    if (!success) return;
    
    setIsLoading(true);
    
    try {
      const data = await getLatestFinancialData(userId);
      
      if (!data) {
        toast({
          title: "Nu există date ANAF",
          description: "Încarcă o balanță pentru a vedea dashboard-ul CFO.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      setFinancialData(data);
      
      const currentCash = data.soldBanca + data.soldCasa;
      const runwayData = calculateRunway(currentCash, data.revenue / 12, data.expenses / 12);
      setRunway(runwayData);
      
      const forecastData = calculateCashFlowForecast(currentCash, data.revenue / 12, data.expenses / 12);
      setCashFlowForecast(forecastData);
      
      const detectedAlerts = detectFinancialAlerts(data);
      setAlerts(detectedAlerts);
      
      toast({
        title: "✅ Dashboard actualizat",
        description: `Cost: ${cost.toFixed(2)} lei. Credit rămas: ${(creditRemaining - cost).toFixed(2)} lei`
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza dashboard-ul.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulate = async () => {
    const cost = 0.44;
    const success = await onCreditDeduct(cost);
    if (!success) return;
    
    if (!financialData) {
      toast({
        title: "Nu există date",
        description: "Nu există date pentru simulare!",
        variant: "destructive"
      });
      return;
    }
    
    const result = simulateWhatIf(financialData, {
      newEmployees,
      avgSalary,
      revenueGrowthPercent: revenueGrowth
    });
    
    setSimulationResult(result);
    toast({
      title: "✅ Simulare completă",
      description: `Cost: ${cost.toFixed(2)} lei`
    });
  };

  const askCFOQuestion = async (question: string) => {
    const cost = 0.85;
    const success = await onCreditDeduct(cost);
    if (!success) return;

    setIsLoading(true);

    try {
      const data = await getLatestFinancialData(userId);
      
      if (!data) {
        toast({
          title: "Nu există date ANAF",
          description: "Încarcă o balanță pentru a folosi CFO Chat.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const { data: cfoResponseData, error } = await supabase.functions.invoke('cfo-advisor', {
        body: {
          userId,
          question,
          financialData: data,
          conversationId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      setCFOResponse(cfoResponseData.answer);
      setShowCFOResponseDialog(true);
      
      toast({
        title: "✅ Răspuns primit",
        description: `Cost: ${cost.toFixed(2)} lei`
      });
    } catch (error: any) {
      console.error('Error asking CFO:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut obține răspunsul CFO.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER: Runway + Refresh */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle className="text-2xl">
              {runway ? (
                <>
                  Runway: <span className={cn(
                    runway.status === 'critical' && 'text-destructive',
                    runway.status === 'warning' && 'text-orange-600',
                    runway.status === 'healthy' && 'text-green-600'
                  )}>
                    {runway.months === Infinity ? '∞' : runway.months.toFixed(1)} luni
                  </span> ({runway.days === Infinity ? '∞' : Math.floor(runway.days)} zile)
                </>
              ) : (
                'Dashboard CFO'
              )}
            </CardTitle>
            <CardDescription>{runway?.message}</CardDescription>
          </div>
          
          <Button 
            onClick={handleRefreshDashboard} 
            disabled={isLoading || creditRemaining < 0.25}
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se recalculează...
              </>
            ) : (
              <>🔄 Refresh (0.25 lei)</>
            )}
          </Button>
        </CardHeader>
        
        {runway && (
          <CardContent>
            <Progress 
              value={runway.status === 'critical' ? 20 : runway.status === 'warning' ? 50 : 80} 
              className="h-3"
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Cash disponibil: {formatCurrency((financialData?.soldBanca || 0) + (financialData?.soldCasa || 0))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. GRAFIC: Cash Flow Forecast */}
      {cashFlowForecast && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Cash Flow Forecast (90 zile)</CardTitle>
            <CardDescription>
              Trend: {cashFlowForecast.trendLine === 'positive' ? '📈 Pozitiv' : 
                      cashFlowForecast.trendLine === 'negative' ? '📉 Negativ' : 
                      '➡️ Stabil'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowForecast.forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval={15}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--chart-1))" 
                  name="Sold Estimat" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="threshold" 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  name="Prag Critic (20%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. SIMULATOR: What-If Interactive */}
      {financialData && (
        <Card>
          <CardHeader>
            <CardTitle>🎲 What-If Simulator</CardTitle>
            <CardDescription>Testează scenarii și vezi impactul LIVE (0.44 lei/simulare)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Angajați noi (0-10)</Label>
              <Slider 
                min={0} 
                max={10} 
                step={1}
                value={[newEmployees]}
                onValueChange={(val) => setNewEmployees(val[0])}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {newEmployees} angajați × {avgSalary.toLocaleString('ro-RO')} lei = 
                <strong> +{(newEmployees * avgSalary).toLocaleString('ro-RO')} lei/lună</strong>
              </p>
            </div>
            
            <div>
              <Label>Salariu mediu (2.000 - 15.000 lei)</Label>
              <Slider 
                min={2000} 
                max={15000} 
                step={500}
                value={[avgSalary]}
                onValueChange={(val) => setAvgSalary(val[0])}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Salariu: {avgSalary.toLocaleString('ro-RO')} lei/lună
              </p>
            </div>
            
            <div>
              <Label>Creștere venituri (-50% - +100%)</Label>
              <Slider 
                min={-50} 
                max={100} 
                step={5}
                value={[revenueGrowth]}
                onValueChange={(val) => setRevenueGrowth(val[0])}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% venituri
              </p>
            </div>
            
            <Button 
              onClick={handleSimulate} 
              disabled={creditRemaining < 0.44 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se simulează...
                </>
              ) : (
                <>▶️ Simulează Scenariul (0.44 lei)</>
              )}
            </Button>
            
            {simulationResult && (
              <Alert 
                variant={simulationResult.severity === 'critical' ? 'destructive' : 'default'}
                className={simulationResult.severity === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
              >
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>
                  Runway: {simulationResult.baseRunway.months === Infinity ? '∞' : simulationResult.baseRunway.months.toFixed(1)} luni → 
                  <strong> {simulationResult.newRunway.months === Infinity ? '∞' : simulationResult.newRunway.months.toFixed(1)} luni</strong>
                  {simulationResult.runwayChangePercent !== 0 && (
                    <> ({simulationResult.runwayChangePercent > 0 ? '+' : ''}{simulationResult.runwayChangePercent.toFixed(0)}%)</>
                  )}
                </AlertTitle>
                <AlertDescription>
                  <p className="font-semibold mt-2">{simulationResult.recommendation}</p>
                  <div className="mt-3 text-sm space-y-1">
                    <p>• Cash Flow Impact: {simulationResult.cashFlowImpact > 0 ? '+' : ''}{formatCurrency(simulationResult.cashFlowImpact)}/lună</p>
                    {simulationResult.breakEvenDate && (
                      <p>• Data cash zero: {simulationResult.breakEvenDate.toLocaleDateString('ro-RO')}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. QUICK QUESTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>💬 Întrebări Quick CFO</CardTitle>
          <CardDescription>Click pentru răspuns instant (0.85 lei/întrebare)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => askCFOQuestion("Pot angaja 2 oameni cu salariu 5000 lei?")}
              disabled={creditRemaining < 0.85 || isLoading}
              className="justify-start"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Pot angaja 2 oameni?
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => askCFOQuestion("Când ajung la break-even?")}
              disabled={creditRemaining < 0.85 || isLoading}
              className="justify-start"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Când ajung la break-even?
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => askCFOQuestion("Îmi permit echipament nou de 20.000 lei?")}
              disabled={creditRemaining < 0.85 || isLoading}
              className="justify-start"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Îmi permit 20k investiție?
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => askCFOQuestion("Ce costuri pot reduce urgent?")}
              disabled={creditRemaining < 0.85 || isLoading}
              className="justify-start"
            >
              <Scissors className="mr-2 h-4 w-4" />
              Ce costuri reduc?
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. ALERTS */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔔 Alerte Financiare ({alerts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, idx) => (
              <Alert 
                key={idx} 
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>
                  {alert.message}
                  {alert.actionable && (
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      {alert.actionable.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. EMPTY STATE */}
      {!financialData && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Nu există date ANAF disponibile pentru analiză CFO.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              📊 Încarcă o balanță ANAF
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CFO Response Dialog */}
      <Dialog open={showCFOResponseDialog} onOpenChange={setShowCFOResponseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💬 Răspuns CFO</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {cfoResponse}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
