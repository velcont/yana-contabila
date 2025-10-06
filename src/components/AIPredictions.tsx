import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Loader2, Lightbulb } from 'lucide-react';
import { formatCurrency, type FinancialIndicators } from '@/utils/analysisParser';

interface Analysis {
  id: string;
  company_name?: string;
  file_name: string;
  created_at: string;
  metadata: FinancialIndicators;
}

interface Prediction {
  timeframe: string;
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
  cash_flow: number;
  revenue_forecast: number;
  key_risks: string[];
  opportunities: string[];
  recommended_actions: string[];
}

interface AIPredictionsProps {
  analyses: Analysis[];
}

export const AIPredictions = ({ analyses }: AIPredictionsProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [originalPredictions, setOriginalPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // What If simulation parameters
  const [expenseChange, setExpenseChange] = useState(0); // -50 to +50 %
  const [dsoDelay, setDsoDelay] = useState(0); // 0 to 60 days
  const [revenueChange, setRevenueChange] = useState(0); // -50 to +50 %
  const [showSimulation, setShowSimulation] = useState(false);

  const generatePredictions = async () => {
    if (analyses.length < 2) {
      toast({
        title: 'Date insuficiente',
        description: 'Sunt necesare cel puțin 2 analize pentru predicții precise.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-predictions', {
        body: {
          analyses: analyses.slice(-6).map(a => ({
            date: a.created_at,
            indicators: a.metadata,
          })),
        },
      });

      if (error) throw error;

      const generatedPredictions = data.predictions || [];
      setPredictions(generatedPredictions);
      setOriginalPredictions(generatedPredictions);
      toast({
        title: 'Predicții generate!',
        description: 'AI-ul a analizat datele și a generat scenarii pentru următoarele 3 luni.',
      });
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut genera predicții. Te rog încearcă din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScenarioColor = (scenario: string) => {
    switch (scenario) {
      case 'optimistic':
        return 'bg-success text-success-foreground';
      case 'realistic':
        return 'bg-primary text-primary-foreground';
      case 'pessimistic':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getScenarioLabel = (scenario: string) => {
    switch (scenario) {
      case 'optimistic':
        return 'Optimist';
      case 'realistic':
        return 'Realist';
      case 'pessimistic':
        return 'Pesimist';
      default:
        return scenario;
    }
  };

  const applySimulation = () => {
    if (originalPredictions.length === 0) return;

    const simulatedPredictions = originalPredictions.map(pred => {
      // Apply revenue change
      const adjustedRevenue = pred.revenue_forecast * (1 + revenueChange / 100);
      
      // Apply expense change (impacts cash flow)
      const expenseImpact = pred.revenue_forecast * (expenseChange / 100);
      
      // DSO delay impacts cash flow (rough estimate: each day delay reduces available cash)
      const dsoImpact = (pred.revenue_forecast / 30) * dsoDelay * -0.5;
      
      const adjustedCashFlow = pred.cash_flow - expenseImpact + dsoImpact;

      return {
        ...pred,
        revenue_forecast: adjustedRevenue,
        cash_flow: adjustedCashFlow,
      };
    });

    setPredictions(simulatedPredictions);
    setShowSimulation(true);
  };

  const resetSimulation = () => {
    setPredictions(originalPredictions);
    setExpenseChange(0);
    setDsoDelay(0);
    setRevenueChange(0);
    setShowSimulation(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Predicții AI - Următoarele 3 Luni
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Scenarii generate de AI bazate pe analiza tendințelor tale istorice
              </p>
            </div>
            <Button
              onClick={generatePredictions}
              disabled={isLoading || analyses.length < 2}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generez...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generează Predicții
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {analyses.length < 2
                  ? 'Adaugă cel puțin 2 analize pentru a genera predicții'
                  : 'Apasă butonul de mai sus pentru a genera predicții AI'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* What If Simulator */}
              {originalPredictions.length > 0 && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Simulări Interactive "What If"
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ajustează variabilele pentru a vedea impactul asupra predicțiilor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {/* Revenue Change */}
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Schimbare Venituri</span>
                          <span className="font-mono text-sm">
                            {revenueChange > 0 ? '+' : ''}{revenueChange}%
                          </span>
                        </Label>
                        <Slider
                          value={[revenueChange]}
                          onValueChange={(val) => setRevenueChange(val[0])}
                          min={-50}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce se întâmplă dacă veniturile {revenueChange >= 0 ? 'cresc' : 'scad'} cu {Math.abs(revenueChange)}%?
                        </p>
                      </div>

                      {/* Expense Change */}
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Schimbare Cheltuieli</span>
                          <span className="font-mono text-sm">
                            {expenseChange > 0 ? '+' : ''}{expenseChange}%
                          </span>
                        </Label>
                        <Slider
                          value={[expenseChange]}
                          onValueChange={(val) => setExpenseChange(val[0])}
                          min={-50}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce se întâmplă dacă cheltuielile {expenseChange >= 0 ? 'cresc' : 'scad'} cu {Math.abs(expenseChange)}%?
                        </p>
                      </div>

                      {/* DSO Delay */}
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Întârziere Încasări (DSO)</span>
                          <span className="font-mono text-sm">+{dsoDelay} zile</span>
                        </Label>
                        <Slider
                          value={[dsoDelay]}
                          onValueChange={(val) => setDsoDelay(val[0])}
                          min={0}
                          max={60}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Cum arată cash flow-ul dacă clienții întârzie cu {dsoDelay} zile?
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={applySimulation}
                        className="flex-1"
                        variant="default"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Aplică Simulare
                      </Button>
                      {showSimulation && (
                        <Button 
                          onClick={resetSimulation}
                          variant="outline"
                        >
                          Reset
                        </Button>
                      )}
                    </div>

                    {showSimulation && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm font-medium text-primary flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Simulare Activă
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Predicțiile afișate reflectă scenariul ajustat
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {predictions.map((prediction, idx) => (
                <Card key={idx} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {prediction.timeframe}
                      </CardTitle>
                      <Badge className={getScenarioColor(prediction.scenario)}>
                        {getScenarioLabel(prediction.scenario)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Forecast Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Cash Flow Estimat</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(prediction.cash_flow)}
                        </p>
                        {prediction.cash_flow > 0 ? (
                          <TrendingUp className="h-4 w-4 text-success mt-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive mt-1" />
                        )}
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Venituri Estimate</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(prediction.revenue_forecast)}
                        </p>
                      </div>
                    </div>

                    {/* Key Risks */}
                    {prediction.key_risks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Riscuri Identificate
                        </h4>
                        <ul className="space-y-1">
                          {prediction.key_risks.map((risk, riskIdx) => (
                            <li key={riskIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-destructive mt-1">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Opportunities */}
                    {prediction.opportunities.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-success" />
                          Oportunități
                        </h4>
                        <ul className="space-y-1">
                          {prediction.opportunities.map((opp, oppIdx) => (
                            <li key={oppIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-success mt-1">•</span>
                              {opp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {prediction.recommended_actions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Acțiuni Recomandate
                        </h4>
                        <ul className="space-y-1">
                          {prediction.recommended_actions.map((action, actionIdx) => (
                            <li key={actionIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};