import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

      setPredictions(data.predictions || []);
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