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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, UserPlus, ShoppingCart, Scissors, Loader2, FileBarChart, Sparkles, Coins, CheckCircle2, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setIsLoading(true);
    
    try {
      const data = await getLatestFinancialData(userId);
      
      if (!data) {
        toast({
          title: "📊 Nicio balanță încărcată",
          description: "Mergi la tab-ul 'Chat Strategist' și încarcă o balanță Excel pentru a vedea CFO Dashboard.",
          variant: "default"
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
        description: "Date financiare afișate gratuit din analiza balanței tale."
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza dashboard-ul.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleSimulate = async () => {
    const cost = 0.25;
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
      {/* Badge info header */}
      {financialData && (
        <Alert className="border-primary/30 bg-primary/5">
          <Coins className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
              ✅ GRATUIT
            </Badge>
            Dashboard de Bază
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            <strong>Gratuit:</strong> Cash disponibil, grafic istoric, alerte simple, indicatori de bază
            <br />
            <strong className="text-primary">💎 AI Premium:</strong> Predicții 90 zile (0.15 lei), Scenarii What-If (0.25 lei), Întrebări CFO (0.85 lei)
          </AlertDescription>
        </Alert>
      )}

      {/* 1. HEADER: Runway + Refresh */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {financialData && (
            <Badge variant="outline" className="absolute top-4 left-4 text-xs">
              📊 Date din: Analiza Balanței
            </Badge>
          )}
          
          <div className="flex-1 mt-6">
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
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se recalculează...
              </>
            ) : (
              <>🔄 Refresh</>
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

      {/* 2. CARD: Date Sursă Balanță - Pentru Verificare */}
      {financialData && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Date Sursă - Balanța Analizată
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verificat
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Toate datele CFO Dashboard provin din această analiză. Verifică cu contabilul tău.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Principale Financiare */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Venituri */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs text-muted-foreground mb-1">💰 Cifra Afaceri</div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(financialData.revenue)}
                </div>
              </div>

              {/* Cheltuieli */}
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs text-muted-foreground mb-1">📉 Cheltuieli</div>
                <div className="text-xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(financialData.expenses)}
                </div>
              </div>

              {/* Profit/Pierdere */}
              <div className={cn(
                "p-4 rounded-lg border",
                financialData.profit >= 0 
                  ? "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800"
                  : "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800"
              )}>
                <div className="text-xs text-muted-foreground mb-1">
                  {financialData.profit >= 0 ? '✅ Profit Net' : '🔴 Pierdere'}
                </div>
                <div className={cn(
                  "text-xl font-bold",
                  financialData.profit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                )}>
                  {formatCurrency(financialData.profit)}
                </div>
              </div>

              {/* Sold Bancă */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-muted-foreground mb-1">🏦 Sold Bancă</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(financialData.soldBanca)}
                </div>
              </div>

              {/* Sold Casă */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-xs text-muted-foreground mb-1">💵 Sold Casă</div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(financialData.soldCasa)}
                </div>
              </div>

              {/* Cash Total */}
              <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600">
                <div className="text-xs text-muted-foreground mb-1">💎 Cash Disponibil</div>
                <div className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                  {formatCurrency(financialData.soldBanca + financialData.soldCasa)}
                </div>
              </div>

              {/* Creanțe */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="text-xs text-muted-foreground mb-1">📊 Creanțe Clienți</div>
                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(financialData.soldClienti)}
                </div>
              </div>

              {/* Datorii */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-xs text-muted-foreground mb-1">📋 Datorii Furnizori</div>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(financialData.soldFurnizori)}
                </div>
              </div>

              {/* DSO */}
              <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 rounded-lg border border-teal-200 dark:border-teal-800">
                <div className="text-xs text-muted-foreground mb-1">⏱️ DSO (Zile Încasare)</div>
                <div className="text-xl font-bold text-teal-700 dark:text-teal-300">
                  {financialData.dso.toFixed(0)} zile
                </div>
              </div>

              {/* DPO */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-muted-foreground mb-1">⏳ DPO (Zile Plată)</div>
                <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  {financialData.dpo.toFixed(0)} zile
                </div>
              </div>
            </div>

            {/* Separare - Indicatori Cheie Avansați */}
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Indicatori Cheie Calculați
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Capital de Lucru */}
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-muted-foreground mb-1">💼 Capital de Lucru</div>
                  <div className={cn(
                    "text-xl font-bold",
                    (financialData.soldClienti - financialData.soldFurnizori) >= 0 
                      ? "text-emerald-700 dark:text-emerald-300" 
                      : "text-rose-700 dark:text-rose-300"
                  )}>
                    {formatCurrency(financialData.soldClienti - financialData.soldFurnizori)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Creanțe - Datorii
                  </div>
                </div>

                {/* Marja de Profit */}
                <div className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 rounded-lg border border-violet-200 dark:border-violet-800">
                  <div className="text-xs text-muted-foreground mb-1">📈 Marja de Profit</div>
                  <div className={cn(
                    "text-xl font-bold",
                    (financialData.profit / financialData.revenue * 100) >= 0 
                      ? "text-violet-700 dark:text-violet-300" 
                      : "text-rose-700 dark:text-rose-300"
                  )}>
                    {(financialData.profit / financialData.revenue * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    (Profit / Venituri) × 100
                  </div>
                </div>

                {/* Burn Rate */}
                <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 rounded-lg border border-pink-200 dark:border-pink-800">
                  <div className="text-xs text-muted-foreground mb-1">🔥 Burn Rate Lunar</div>
                  <div className={cn(
                    "text-xl font-bold",
                    ((financialData.expenses / 12) - (financialData.revenue / 12)) > 0
                      ? "text-rose-700 dark:text-rose-300" 
                      : "text-emerald-700 dark:text-emerald-300"
                  )}>
                    {formatCurrency((financialData.expenses / 12) - (financialData.revenue / 12))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Cheltuieli - Venituri /lună
                  </div>
                </div>
              </div>
            </div>
            
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">📋 Date Verificabile</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Poți copia aceste date și le poți trimite contabilului tău pentru confirmare. 
                CFO AI folosește exact acești indicatori pentru recomandări.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 3. GRAFIC: Cash Flow Forecast - GRATUIT historic, PREMIUM predicții */}
      {cashFlowForecast && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  📊 Cash Flow Forecast
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                    ✅ GRATUIT
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Trend: {cashFlowForecast.trendLine === 'positive' ? '📈 Pozitiv' : 
                          cashFlowForecast.trendLine === 'negative' ? '📉 Negativ' : 
                          '➡️ Stabil'}
                </CardDescription>
              </div>
            </div>
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
                <ChartTooltip 
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

      {/* 3. SIMULATOR: What-If Interactive - PREMIUM */}
      {financialData && (
        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  🎲 What-If Simulator
                  <Badge className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Premium
                  </Badge>
                </CardTitle>
                <CardDescription>Testează scenarii și vezi impactul LIVE (0.25 lei/simulare)</CardDescription>
              </div>
            </div>
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
              disabled={creditRemaining < 0.25 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se simulează...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Simulează Scenariul (0.25 lei)
                </>
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

      {/* 4. QUICK QUESTIONS - AI PREMIUM */}
      <Card className="border-primary/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                💬 Întrebări Quick CFO
                <Badge className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Premium
                </Badge>
              </CardTitle>
              <CardDescription>Click pentru răspuns instant (0.85 lei/întrebare)</CardDescription>
            </div>
          </div>
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

      {/* 5. ALERTS - GRATUIT */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔔 Alerte Financiare ({alerts.length})
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                ✅ GRATUIT
              </Badge>
            </CardTitle>
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
        <Card className="border-2 border-dashed">
          <CardContent className="pt-8 pb-8 text-center max-w-md mx-auto">
            <div className="mb-4">
              <FileBarChart className="w-16 h-16 mx-auto text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              CFO Dashboard Gol
            </h3>
            <p className="text-muted-foreground mb-4">
              CFO Dashboard afișează date financiare din <strong>analiza balanței tale</strong>.
            </p>
            <Alert className="text-left mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cum funcționează?</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                  <li>Mergi la tab-ul <strong>"💬 Chat Strategist"</strong></li>
                  <li>Încarcă balanța ta (.xls/.xlsx)</li>
                  <li>Revino aici pentru dashboard-ul CFO</li>
                </ol>
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button 
                size="lg" 
                onClick={() => {
                  const tabsList = document.querySelector('[role="tablist"]');
                  const chatTab = tabsList?.querySelector('[value="chat"]');
                  if (chatTab instanceof HTMLElement) {
                    chatTab.click();
                  }
                }}
                className="w-full"
              >
                💬 Mergi la Chat pentru Upload
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/app'}
              >
                ↩️ Înapoi la Dashboard Principal
              </Button>
            </div>
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
