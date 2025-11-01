import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Loader2, Lightbulb, Building2 } from 'lucide-react';
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
  const [businessSector, setBusinessSector] = useState<string>('');
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

    if (!businessSector) {
      toast({
        title: 'Selectează domeniul de activitate',
        description: 'Pentru predicții realiste, trebuie să selectezi domeniul firmei.',
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
          businessSector,
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0 w-full">
              <CardTitle className="flex items-center gap-2 flex-wrap break-words">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="break-words">Predicții AI - Următoarele 3 Luni</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                Scenarii realiste bazate pe date istorice și contextul economic actual
              </p>
              
              {/* Business Sector Selector */}
              <div className="mt-4 max-w-md w-full">
                <Label htmlFor="business-sector" className="flex items-center gap-2 mb-2 break-words">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold break-words">Domeniul de activitate al firmei</span>
                </Label>
                <Select value={businessSector} onValueChange={setBusinessSector}>
                  <SelectTrigger id="business-sector">
                    <SelectValue placeholder="Selectează domeniul..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Comerț cu amănuntul</SelectItem>
                    <SelectItem value="wholesale">Comerț cu ridicata</SelectItem>
                    <SelectItem value="manufacturing">Producție/Manufacturing</SelectItem>
                    <SelectItem value="construction">Construcții</SelectItem>
                    <SelectItem value="it_software">IT & Software</SelectItem>
                    <SelectItem value="professional_services">Servicii profesionale</SelectItem>
                    <SelectItem value="horeca">HoReCa (Restaurante, Hoteluri)</SelectItem>
                    <SelectItem value="transport_logistics">Transport & Logistică</SelectItem>
                    <SelectItem value="agriculture">Agricultură</SelectItem>
                    <SelectItem value="healthcare_pharma">Sănătate & Farmacie</SelectItem>
                    <SelectItem value="education">Educație</SelectItem>
                    <SelectItem value="real_estate">Imobiliare</SelectItem>
                    <SelectItem value="energy_utilities">Energie & Utilități</SelectItem>
                    <SelectItem value="telecommunications">Telecomunicații</SelectItem>
                    <SelectItem value="other">Altele</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Acest lucru ajută AI-ul să folosească date macroeconomice relevante sectorului tău
                </p>
              </div>
            </div>
            <Button
              onClick={generatePredictions}
              disabled={isLoading || analyses.length < 2 || !businessSector}
              className="gap-2 flex-shrink-0 w-full sm:w-auto"
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
                    <CardTitle className="flex items-center gap-2 text-lg flex-wrap break-words">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="break-words">Simulări Interactive "What If"</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground break-words">
                      Ajustează variabilele pentru a vedea impactul asupra predicțiilor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {/* Revenue Change */}
                      <div className="space-y-2">
                        <Label className="flex flex-col sm:flex-row justify-between gap-1">
                          <span className="break-words">Schimbare Venituri</span>
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
                        <p className="text-xs text-muted-foreground break-words overflow-wrap-anywhere">
                          Ce se întâmplă dacă veniturile {revenueChange >= 0 ? 'cresc' : 'scad'} cu {Math.abs(revenueChange)}%?
                        </p>
                      </div>

                      {/* Expense Change */}
                      <div className="space-y-2">
                        <Label className="flex flex-col sm:flex-row justify-between gap-1">
                          <span className="break-words">Schimbare Cheltuieli</span>
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
                        <p className="text-xs text-muted-foreground break-words overflow-wrap-anywhere">
                          Ce se întâmplă dacă cheltuielile {expenseChange >= 0 ? 'cresc' : 'scad'} cu {Math.abs(expenseChange)}%?
                        </p>
                      </div>

                      {/* DSO Delay */}
                      <div className="space-y-2">
                        <Label className="flex flex-col sm:flex-row justify-between gap-1">
                          <span className="break-words">Întârziere Încasări (DSO)</span>
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
                        <p className="text-xs text-muted-foreground break-words overflow-wrap-anywhere">
                          Cum arată cash flow-ul dacă clienții întârzie cu {dsoDelay} zile?
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
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
                          className="w-full sm:w-auto"
                        >
                          Reset
                        </Button>
                      )}
                    </div>

                    {showSimulation && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm font-medium text-primary flex items-center gap-2 break-words">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="break-words">Simulare Activă</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 break-words">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <CardTitle className="text-lg break-words overflow-wrap-anywhere">
                        {prediction.timeframe}
                      </CardTitle>
                      <Badge className={`${getScenarioColor(prediction.scenario)} flex-shrink-0`}>
                        {getScenarioLabel(prediction.scenario)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Forecast Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1 break-words">Cash Flow Estimat</p>
                        <p className="text-2xl font-bold break-words overflow-wrap-anywhere">
                          {formatCurrency(prediction.cash_flow)}
                        </p>
                        {prediction.cash_flow > 0 ? (
                          <TrendingUp className="h-4 w-4 text-success mt-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive mt-1" />
                        )}
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1 break-words">Venituri Estimate</p>
                        <p className="text-2xl font-bold break-words overflow-wrap-anywhere">
                          {formatCurrency(prediction.revenue_forecast)}
                        </p>
                      </div>
                    </div>

                    {/* Key Risks */}
                    {prediction.key_risks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 break-words">
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <span className="break-words">Riscuri Identificate</span>
                        </h4>
                        <ul className="space-y-1">
                          {prediction.key_risks.map((risk, riskIdx) => (
                            <li key={riskIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-destructive mt-1 flex-shrink-0">•</span>
                              <span className="break-words overflow-wrap-anywhere">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Opportunities */}
                    {prediction.opportunities.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 break-words">
                          <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
                          <span className="break-words">Oportunități</span>
                        </h4>
                        <ul className="space-y-1">
                          {prediction.opportunities.map((opp, oppIdx) => (
                            <li key={oppIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-success mt-1 flex-shrink-0">•</span>
                              <span className="break-words overflow-wrap-anywhere">{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {prediction.recommended_actions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 break-words">
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="break-words">Acțiuni Recomandate</span>
                        </h4>
                        <ul className="space-y-1">
                          {prediction.recommended_actions.map((action, actionIdx) => (
                            <li key={actionIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1 flex-shrink-0">→</span>
                              <span className="break-words overflow-wrap-anywhere">{action}</span>
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