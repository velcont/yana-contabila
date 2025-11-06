import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, FileBarChart, Coins, AlertCircle, Building2 } from 'lucide-react';
import { CFOChatInterface } from './cfo/CFOChatInterface';
import { RunwayCard } from './cfo/RunwayCard';
import { FinancialSnapshot } from './cfo/FinancialSnapshot';
import { SourceDataCard } from './cfo/SourceDataCard';
import { AccountsBreakdown } from './cfo/AccountsBreakdown';
import { LoadingSpinner } from './ui/skeleton-loader';
import { EmptyState } from './ui/empty-state';
import { ContextualHelp } from './ContextualHelp';

// Lazy load Recharts heavy components
const CashFlowChart = lazy(() => import('./cfo/CashFlowChart').then(m => ({ default: m.CashFlowChart })));
const WhatIfSimulator = lazy(() => import('./cfo/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));
const FinancialAlerts = lazy(() => import('./cfo/FinancialAlerts').then(m => ({ default: m.FinancialAlerts })));

const ChartLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <LoadingSpinner size="lg" />
  </div>
);

interface YanaCFODashboardProps {
  userId: string;
  creditRemaining: number;
  onCreditDeduct: (amount: number) => Promise<boolean>;
  financialData?: FinancialData | null;
}

export const YanaCFODashboard = ({ userId, creditRemaining, onCreditDeduct, financialData: propFinancialData }: YanaCFODashboardProps) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(propFinancialData || null);
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCFOResponseDialog, setShowCFOResponseDialog] = useState(false);
  const [cfoResponse, setCFOResponse] = useState('');
  const [cfoQuestion, setCfoQuestion] = useState('');
  const [cfoConversationHistory, setCfoConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());
  const [analysisMetadata, setAnalysisMetadata] = useState<any>(null); // Full metadata including account breakdown
  
  // Company selector state
  const [companies, setCompanies] = useState<Array<{id: string, company_name: string}>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const { toast } = useToast();

  // What-If Simulator state
  const [newEmployees, setNewEmployees] = useState(0);
  const [avgSalary, setAvgSalary] = useState(5000);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Computed values with useMemo for performance
  const runway = useMemo(() => {
    if (!financialData) {
      console.log('🔍 CFO - Runway useMemo: financialData is null');
      return null;
    }
    const currentCash = financialData.soldBanca + financialData.soldCasa;
    // financialData already contains normalized monthly values
    const runwayData = calculateRunway(currentCash, financialData.revenue, financialData.expenses);
    console.log('🔍 CFO - Runway useMemo calculated:', { 
      currentCash, 
      monthlyRevenue: financialData.revenue, 
      monthlyExpenses: financialData.expenses,
      monthsInFile: financialData.monthsInFile,
      periodLabel: financialData.periodLabel,
      runwayData 
    });
    return runwayData;
  }, [financialData]);

  const alerts = useMemo(() => {
    if (!financialData) return [];
    return detectFinancialAlerts(financialData);
  }, [financialData]);

  const currentCash = useMemo(() => {
    if (!financialData) return 0;
    return financialData.soldBanca + financialData.soldCasa;
  }, [financialData]);

  // Load companies list
  useEffect(() => {
    loadCompanies();
  }, [userId]);

  // Load initial data
  useEffect(() => {
    // Use prop data if available
    if (propFinancialData) {
      console.log('✅ Using financial data from prop');
      setFinancialData(propFinancialData);
    } else {
      handleRefreshDashboard();
    }
    loadCFOConversationHistory();
  }, [userId, propFinancialData, selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      // Get all analyses for this user to extract company info
      const { data: analyses, error: analysesError } = await supabase
        .from('analyses')
        .select('id, company_id, file_name, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (analysesError) {
        console.error('❌ Error loading analyses:', analysesError);
        return;
      }

      console.log('📊 Analyses found:', analyses?.length || 0);

      // Extract unique companies from analyses
      const companyMap = new Map<string, { id: string; company_name: string }>();

      for (const analysis of analyses || []) {
        let companyId = analysis.company_id;
        let companyName = '';

        // If company_id exists, fetch from companies table
        if (companyId) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('company_name')
            .eq('id', companyId)
            .maybeSingle();

          companyName = companyData?.company_name || `Companie ${companyId.slice(0, 8)}`;
        } else {
          // Extract company name from file_name or metadata
          const metadataObj = analysis.metadata as Record<string, any> | null;
          companyName = metadataObj?.company_name || 
                       analysis.file_name?.replace(/\d{8}\.xls.*$/i, '').trim() || 
                       'Companie Necunoscută';
          // Use analysis id as pseudo company id for filtering
          companyId = `analysis_${analysis.id}`;
        }

        if (!companyMap.has(companyId)) {
          companyMap.set(companyId, { id: companyId, company_name: companyName });
        }
      }

      const companiesList = Array.from(companyMap.values());
      console.log('🏢 Companies extracted:', companiesList);

      if (companiesList.length > 0) {
        setCompanies(companiesList);
        // Auto-select first company
        if (!selectedCompanyId) {
          setSelectedCompanyId(companiesList[0].id);
        }
      } else {
        console.warn('⚠️ No companies found');
      }
    } catch (error) {
      console.error('❌ Exception loading companies:', error);
    }
  };

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
    console.log('🔍 CFO Dashboard - Loading financial data...');
    console.log('🔍 CFO Dashboard - Selected company:', selectedCompanyId);
    setIsLoading(true);
    
    try {
      // If selected company is a pseudo ID (analysis_*), extract the analysis ID
      let targetCompanyId = selectedCompanyId;
      let targetAnalysisId: string | undefined;
      
      if (selectedCompanyId?.startsWith('analysis_')) {
        targetAnalysisId = selectedCompanyId.replace('analysis_', '');
        targetCompanyId = undefined; // Don't filter by company_id
        console.log('🔍 CFO Dashboard - Using analysis ID for filtering:', targetAnalysisId);
      }

      const data = await getLatestFinancialData(userId, targetCompanyId, targetAnalysisId);
      console.log('🔍 CFO Dashboard - Financial data loaded:', data);
      
      if (!data) {
        console.log('🔍 CFO Dashboard - NO DATA FOUND');
        toast({
          title: "📊 Nicio balanță încărcată",
          description: selectedCompanyId 
            ? "Nu există balanță încărcată pentru firma selectată. Încarcă o balanță în Chat Strategist."
            : "Mergi la tab-ul 'Chat Strategist' și încarcă o balanță Excel pentru a vedea CFO Dashboard.",
          variant: "default"
        });
        return;
      }

      // Load full metadata from latest analysis
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestAnalysis?.metadata) {
        console.log('✅ CFO Dashboard - Analysis metadata loaded:', Object.keys(latestAnalysis.metadata).length, 'keys');
        setAnalysisMetadata(latestAnalysis.metadata);
      }
      
      console.log('🔍 CFO Dashboard - Sold Banca:', data?.soldBanca);
      console.log('🔍 CFO Dashboard - Sold Casa:', data?.soldCasa);
      console.log('🔍 CFO Dashboard - Revenue:', data?.revenue);
      console.log('🔍 CFO Dashboard - Expenses:', data?.expenses);
      console.log('🔍 CFO Dashboard - DSO:', data?.dso);
      console.log('🔍 CFO Dashboard - DPO:', data?.dpo);
      console.log('🔍 CFO Dashboard - Company:', data?.companyName);
      
      setFinancialData(data);
      
      const currentCash = data.soldBanca + data.soldCasa;
      // data already contains normalized monthly values
      const forecastData = calculateCashFlowForecast(currentCash, data.revenue, data.expenses);
      setCashFlowForecast(forecastData);
      
      console.log('✅ CFO - Financial data set, runway should recalculate automatically');
      
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
      {/* Company Selector - NEW */}
      {companies.length > 1 && (
        <Card className="border-primary/20 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Selectează firma pentru care vrei să vezi CFO Dashboard:
                </label>
                <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Alege firma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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


      {/* Loading Overlay - FULLSCREEN */}
      {isLoading && !financialData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-8 max-w-lg border-primary/30">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h3 className="text-2xl font-bold text-center">
                🔍 Se încarcă datele CFO...
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Analizăm balanțele pentru a genera dashboard-ul financiar complet
              </p>
              <div className="w-full max-w-xs">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Citire date din baza de date...
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    Calcul indicatori financiari...
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Generare dashboard...
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* FINANCIAL SNAPSHOT - MOVE TO TOP */}
      {financialData && !isLoading && (
        <FinancialSnapshot
          cash={currentCash}
          profit={financialData.profit}
          runway={runway}
          alertsCount={alerts.length}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          companyName={financialData.companyName}
          periodLabel={financialData.periodLabel}
          monthsInFile={financialData.monthsInFile}
        />
      )}

      {/* ACCOUNTS BREAKDOWN - DETAILED BALANCE STRUCTURE */}
      {analysisMetadata && (
        <AccountsBreakdown metadata={analysisMetadata} />
      )}

      {/* RUNWAY CARD */}
      <RunwayCard
        runway={runway}
        currentCash={currentCash}
        isLoading={isLoading}
        onRefresh={handleRefreshDashboard}
        onScrollToChat={() => {
          document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        companyName={financialData?.companyName}
      />

      {/* CASH FLOW CHART - MOVE UP */}
      <Suspense fallback={<ChartLoader />}>
        <CashFlowChart
          cashFlowForecast={cashFlowForecast}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          companyName={financialData?.companyName}
        />
      </Suspense>

      {/* FINANCIAL ALERTS - MOVE UP */}
      {financialData && (
        <Suspense fallback={<ChartLoader />}>
          <FinancialAlerts
            alerts={alerts}
            onScrollToChat={() => {
              document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            companyName={financialData.companyName}
          />
        </Suspense>
      )}

      {/* CFO CHAT INTERFACE - NOW COLLAPSIBLE */}
      <CFOChatInterface
        financialData={financialData}
        cfoConversationHistory={cfoConversationHistory}
        isLoading={isLoading}
        onAskQuestion={askCFOQuestion}
      />

      {/* WHAT-IF SIMULATOR */}
      {financialData && (
        <Suspense fallback={<ChartLoader />}>
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
            companyName={financialData.companyName}
          />
        </Suspense>
      )}

      {/* SOURCE DATA CARD - AT BOTTOM */}
      {financialData && (
        <SourceDataCard
          financialData={financialData}
          onScrollToChat={() => {
            document.getElementById('cfo-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* 6. EMPTY STATE */}
      {!financialData && !isLoading && (
        <EmptyState
          icon={<FileBarChart className="w-16 h-16" />}
          title="CFO Dashboard Gol"
          description="CFO Dashboard afișează date financiare din analiza balanței tale. Mergi la tab-ul 'Chat Strategist', încarcă balanța ta (.xls/.xlsx) și revino aici pentru dashboard-ul complet."
          action={{
            label: "💬 Mergi la Chat pentru Upload",
            onClick: () => {
              const tabsList = document.querySelector('[role="tablist"]');
              const chatTab = tabsList?.querySelector('[value="chat"]');
              if (chatTab instanceof HTMLElement) {
                chatTab.click();
              }
            }
          }}
          secondaryAction={{
            label: "↩️ Înapoi la Dashboard Principal",
            onClick: () => window.location.href = '/app'
          }}
        />
      )}

      {/* CFO Response Dialog */}
      <Dialog open={showCFOResponseDialog} onOpenChange={setShowCFOResponseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💬 Răspuns CFO</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {cfoResponse}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
