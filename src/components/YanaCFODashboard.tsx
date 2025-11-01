import { useState, useEffect, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getLatestFinancialData,
  calculateRunway,
  calculateCashFlowForecast,
  simulateWhatIf,
  detectFinancialAlerts,
  type FinancialData,
  type CashFlowData,
  type SimulationResult,
} from '@/services/financialAnalysis';
import { Loader2, FileBarChart, Coins, AlertCircle } from 'lucide-react';
import { CFOChatInterface } from './cfo/CFOChatInterface';
import { RunwayCard } from './cfo/RunwayCard';
import { FinancialSnapshot } from './cfo/FinancialSnapshot';
import { SourceDataCard } from './cfo/SourceDataCard';
import { CashFlowChart } from './cfo/CashFlowChart';
import { WhatIfSimulator } from './cfo/WhatIfSimulator';
import { FinancialAlerts } from './cfo/FinancialAlerts';

interface YanaCFODashboardProps {
  userId: string;
  creditRemaining: number;
  onCreditDeduct: (amount: number) => Promise<boolean>;
}

export const YanaCFODashboard = ({ userId, creditRemaining, onCreditDeduct }: YanaCFODashboardProps) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCFOResponseDialog, setShowCFOResponseDialog] = useState(false);
  const [cfoResponse, setCFOResponse] = useState('');
  const [cfoQuestion, setCfoQuestion] = useState('');
  const [cfoConversationHistory, setCfoConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());
  const { toast } = useToast();

  // What-If Simulator state
  const [newEmployees, setNewEmployees] = useState(0);
  const [avgSalary, setAvgSalary] = useState(5000);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Computed values with useMemo for performance
  const runway = useMemo(() => {
    if (!financialData) return null;
    const currentCash = financialData.soldBanca + financialData.soldCasa;
    return calculateRunway(currentCash, financialData.revenue / 12, financialData.expenses / 12);
  }, [financialData]);

  const alerts = useMemo(() => {
    if (!financialData) return [];
    return detectFinancialAlerts(financialData);
  }, [financialData]);

  const currentCash = useMemo(() => {
    if (!financialData) return 0;
    return financialData.soldBanca + financialData.soldCasa;
  }, [financialData]);

  // Load initial data
  useEffect(() => {
    handleRefreshDashboard();
    loadCFOConversationHistory();
  }, [userId]);

  const loadCFOConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Încarcă ultimele 20 mesaje CFO
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('metadata->>type', 'cfo')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        // Grupează pe conversation_id pentru a lua ultima conversație
        const conversationGroups = data.reduce((acc, msg) => {
          if (!acc[msg.conversation_id]) {
            acc[msg.conversation_id] = [];
          }
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, typeof data>);

        const lastConvId = Object.keys(conversationGroups)[0];
        if (lastConvId) {
          const lastMessages = conversationGroups[lastConvId]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            }));

          setCfoConversationHistory(lastMessages);
          setConversationId(lastConvId);
        }
      }
    } catch (err) {
      // Silently handle error - conversation history is optional
    }
  };

  const handleRefreshDashboard = async () => {
    setIsLoading(true);
    
    try {
      const data = await getLatestFinancialData(userId);
      
      if (!data) {
        toast({
          title: "📊 Nicio balanță încărcată",
          description: "Mergi la tab-ul 'Chat Strategist' și încarcă o balanță Excel pentru a vedea CFO Dashboard.",
          variant: "default"
        });
        return;
      }
      
      setFinancialData(data);
      
      const currentCash = data.soldBanca + data.soldCasa;
      const forecastData = calculateCashFlowForecast(currentCash, data.revenue / 12, data.expenses / 12);
      setCashFlowForecast(forecastData);
      
      toast({
        title: "✅ Dashboard actualizat",
        description: "Date financiare afișate gratuit din analiza balanței tale."
      });
    } catch (error) {
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

    // Adaugă întrebarea în istoric
    setCfoConversationHistory(prev => [...prev, {
      role: 'user',
      content: question
    }]);

    setIsLoading(true);

    try {
      const data = await getLatestFinancialData(userId);
      
      if (!data) {
        toast({
          title: "Nu există date ANAF",
          description: "Încarcă o balanță pentru a folosi CFO Chat.",
          variant: "destructive"
        });
        return;
      }

      // Salvează întrebarea în baza de date
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'user',
          content: question,
          metadata: { type: 'cfo' }
        });
      }

      const { data: cfoResponseData, error } = await supabase.functions.invoke('cfo-advisor', {
        body: {
          userId,
          question,
          financialData: data,
          conversationId
        }
      });

      if (error) throw error;

      // Adaugă răspunsul în istoric
      setCfoConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: cfoResponseData.answer
      }]);

      // Salvează răspunsul în baza de date
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'assistant',
          content: cfoResponseData.answer,
          metadata: { type: 'cfo' }
        });
      }
      
      toast({
        title: "✅ Răspuns primit",
        description: `Cost: ${cost.toFixed(2)} lei`
      });
    } catch (error: any) {
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


      {/* Mini Loading Banner - Feedback instant */}
      {isLoading && (
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle className="text-sm font-semibold">
            🔍 Se încarcă datele CFO...
          </AlertTitle>
          <AlertDescription className="text-xs">
            Analizăm balanțele tale pentru a genera dashboard-ul complet
          </AlertDescription>
        </Alert>
      )}

      {/* CFO CHAT INTERFACE - Extracted Component */}
      <CFOChatInterface
        financialData={financialData}
        cfoConversationHistory={cfoConversationHistory}
        isLoading={isLoading}
        onAskQuestion={askCFOQuestion}
      />

      {/* RUNWAY CARD - Extracted Component */}
      <RunwayCard
        runway={runway}
        currentCash={currentCash}
        isLoading={isLoading}
        onRefresh={handleRefreshDashboard}
        onScrollToChat={() => {
          document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* Loading State - PRIORITATE 1 */}
      {isLoading && !financialData && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">🔍 Se încarcă datele financiare...</h3>
            <p className="text-sm text-gray-400 mb-4">Analizăm balanțele tale pentru a genera dashboard-ul CFO</p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Citire balanțe din baza de date...
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                Calcul indicatori financiari...
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                Generare predicții și alerte...
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">⏱️ Durează aproximativ 3-5 secunde</p>
          </div>
        </div>
      )}

      {/* Skeleton Loading pentru tranziție smoothă */}
      {isLoading && financialData && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-800 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl h-64"></div>
          <div className="bg-gray-800 rounded-xl h-96"></div>
        </div>
      )}

      {/* FINANCIAL SNAPSHOT - Extracted Component */}
      {financialData && (
        <FinancialSnapshot
          cash={currentCash}
          profit={financialData.profit}
          runway={runway}
          alertsCount={alerts.length}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}


      {/* SOURCE DATA CARD - Extracted Component */}
      {financialData && (
        <SourceDataCard
          financialData={financialData}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* CASH FLOW CHART - Extracted Component */}
      <CashFlowChart
        cashFlowForecast={cashFlowForecast}
        onScrollToChat={() => {
          document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* WHAT-IF SIMULATOR - Extracted Component */}
      {financialData && (
        <WhatIfSimulator
          newEmployees={newEmployees}
          avgSalary={avgSalary}
          revenueGrowth={revenueGrowth}
          simulationResult={simulationResult}
          isLoading={isLoading}
          onNewEmployeesChange={(value) => setNewEmployees(value[0])}
          onAvgSalaryChange={(value) => setAvgSalary(value[0])}
          onRevenueGrowthChange={(value) => setRevenueGrowth(value[0])}
          onSimulate={handleSimulate}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* FINANCIAL ALERTS - Extracted Component */}
      <FinancialAlerts
        alerts={alerts}
        onScrollToChat={() => {
          document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

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
