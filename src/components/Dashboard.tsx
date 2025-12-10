import { useEffect, useState, lazy, Suspense, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Eye, Download, BarChart3, Calendar, Newspaper, Info, TrendingUp, Rocket, AlertTriangle, Sparkles, Building2, Mail, Users, Bot, Database, Shield, Loader2, Briefcase } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonChart, LoadingSpinner } from '@/components/ui/skeleton-loader';
import { ContextualHelp, helpContent } from '@/components/ContextualHelp';
import { format, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import CompareAnalyses from './CompareAnalyses';
import { parseAnalysisText, formatCurrency, type FinancialIndicators } from '@/utils/analysisParser';
import { FiscalNews } from './FiscalNews';
import { AnalysisDisplay } from './AnalysisDisplay';
import { useUserRole } from '@/hooks/useUserRole';
import { useThemeRole } from '@/contexts/ThemeRoleContext';
import { TopIssuesWidget } from './TopIssuesWidget';
import { ProactiveAlerts } from './ProactiveAlerts';
import { AIPredictions } from './AIPredictions';
import { ResilienceAnalysis } from './ResilienceAnalysis';
import { EmailAnalysisDialog } from './EmailAnalysisDialog';
import { ShareAnalysisDialog } from './ShareAnalysisDialog';
import { extractCompanyNameFromFileName } from '@/utils/companyNameExtractor';
import { AnalysisComments } from './AnalysisComments';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

// Lazy load Recharts components (~100KB)
const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));
const MultiCompanyComparison = lazy(() => import('./MultiCompanyComparison').then(m => ({ default: m.MultiCompanyComparison })));

const ChartLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Analysis {
  id: string;
  file_name: string;
  analysis_text: string;
  created_at: string;
  company_name?: string;
  metadata: FinancialIndicators;
}

export const Dashboard = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'3' | '6' | '12' | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { themeType } = useTheme();
  const { currentTheme } = useThemeRole();
  const isAccountantMode = themeType === 'accountant';
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalyses();

    // Set up Supabase Realtime subscription for automatic updates (fix audit 1.1)
    const channel = supabase
      .channel('analyses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analyses' },
        () => {
          loadAnalyses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      // FIX #15: Limit query pentru a preveni încărcarea a sute de analize simultan
      const ANALYSES_LIMIT = 100; // Încarcă maxim 100 de analize
      
      // SECURITY FIX: Explicit user_id filtering for clarity and performance
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(ANALYSES_LIMIT);

      if (error) throw error;
      
      // Preferă metadata din bază; dacă lipsește, parsează din text
      const analysesWithMetadata = (data || []).map((analysis: any) => {
        const hasDbMetadata = analysis?.metadata && Object.keys(analysis.metadata || {}).length > 0;
        return {
          ...analysis,
          metadata: hasDbMetadata ? analysis.metadata : parseAnalysisText(analysis.analysis_text)
        } as Analysis;
      });
      
      // Logging pentru observabilitate
      const withMetadata = analysesWithMetadata.filter(a => Object.keys(a.metadata || {}).length >= 3).length;
      const withoutMetadata = analysesWithMetadata.length - withMetadata;
      
      if (withoutMetadata > 0 && analysesWithMetadata.length > 0) {
        // Toast doar dacă sunt analize recente fără metadata
        const recentWithoutMetadata = analysesWithMetadata
          .filter(a => Object.keys(a.metadata || {}).length < 3)
          .filter(a => {
            const daysSinceCreation = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCreation < 7; // Ultimele 7 zile
          });
        
        if (recentWithoutMetadata.length > 0) {
          toast({
            title: '⚠️ Date numerice incomplete',
            description: `${recentWithoutMetadata.length} ${recentWithoutMetadata.length === 1 ? 'analiză recentă nu are' : 'analize recente nu au'} indicatori financiari completi. Reîncarcă balanțele pentru date complete.`,
            variant: 'default',
            duration: 8000
          });
        }
      }
      
      setAnalyses(analysesWithMetadata);
    } catch (error) {
      console.error('Error loading analyses:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca istoricul analizelor.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(null);
      }

      toast({
        title: 'Șters cu succes',
        description: 'Analiza a fost ștearsă.'
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge analiza.',
        variant: 'destructive'
      });
    }
  }, [selectedAnalysis, toast]);

  const deleteAllAnalyses = useCallback(async () => {
    // FIX #16: Confirmare dublă pentru operațiune critică
    const firstConfirm = window.confirm(
      `⚠️ ATENȚIE: Vrei să ștergi TOATE ${analyses.length} analizele?\n\nAceastă acțiune NU poate fi anulată!`
    );
    
    if (!firstConfirm) return;
    
    // Confirmare secundară cu text exact
    const secondConfirm = window.confirm(
      `🔴 CONFIRMARE FINALĂ:\n\nEști absolut sigur? Tastează OK pentru a continua.\n\nSe vor șterge ${analyses.length} analize permanent.`
    );
    
    if (!secondConfirm) {
      toast({
        title: 'Ștergere anulată',
        description: 'Analizele tale sunt în siguranță.'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setAnalyses([]);
      setSelectedAnalysis(null);
      
      toast({
        title: 'Șters cu succes',
        description: 'Toate analizele au fost șterse permanent.'
      });
    } catch (error) {
      console.error('Error deleting all analyses:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge analizele.',
        variant: 'destructive'
      });
    }
  }, [analyses.length, toast]);

  const loadDemoData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      // Check if demo data already exists
      const { data: existingDemo } = await supabase
        .from('analyses')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_name', 'SC DEMO CONSTRUCT SRL')
        .limit(1);

      if (existingDemo && existingDemo.length > 0) {
        toast({
          title: 'Date demo existente',
          description: 'Ai deja date demo încărcate. Șterge-le mai întâi dacă vrei să reîncarci.',
          variant: 'destructive'
        });
        return;
      }

      // Demo data - 4 analyses from different months
      const demoAnalyses = [
        {
          company_name: 'SC DEMO CONSTRUCT SRL',
          file_name: 'Balanta_Ianuarie_2025.xlsx',
          created_at: new Date('2025-01-31').toISOString(),
          analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 450,000 RON
- Cheltuieli totale: 380,000 RON
- Profit net: 70,000 RON
- EBITDA: 95,000 RON
- Marja profitului: 15.56%

SITUAȚIA TREZORERIEI:
- Sold bancă: 125,000 RON
- Sold casă: 8,500 RON
- Creanțe clienți: 180,000 RON
- Datorii furnizori: 95,000 RON

INDICATORI OPERAȚIONALI:
- DSO (Days Sales Outstanding): 45 zile
- DPO (Days Payable Outstanding): 28 zile
- DIO (Days Inventory Outstanding): 35 zile
- Cash Conversion Cycle: 52 zile

OBSERVAȚII:
Situație financiară bună în ianuarie. Lichidități solide, profit pozitiv și EBITDA sănătos. DSO este acceptabil dar ar putea fi îmbunătățit.`,
          metadata: {
            ca: 450000,
            cheltuieli: 380000,
            profit: 70000,
            ebitda: 95000,
            profit_margin: 15.56,
            soldBanca: 125000,
            soldCasa: 8500,
            soldClienti: 180000,
            soldFurnizori: 95000,
            dso: 45,
            dpo: 28,
            dio: 35,
            cashConversionCycle: 52
          }
        },
        {
          company_name: 'SC DEMO CONSTRUCT SRL',
          file_name: 'Balanta_Februarie_2025.xlsx',
          created_at: new Date('2025-02-28').toISOString(),
          analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/02/2025 - 28/02/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 520,000 RON
- Cheltuieli totale: 465,000 RON
- Profit net: 55,000 RON
- EBITDA: 78,000 RON
- Marja profitului: 10.58%

SITUAȚIA TREZORERIEI:
- Sold bancă: 98,000 RON
- Sold casă: 12,000 RON
- Creanțe clienți: 285,000 RON
- Datorii furnizori: 145,000 RON

INDICATORI OPERAȚIONALI:
- DSO (Days Sales Outstanding): 68 zile ⚠️
- DPO (Days Payable Outstanding): 35 zile
- DIO (Days Inventory Outstanding): 42 zile
- Cash Conversion Cycle: 75 zile

⚠️ ALERTĂ: DSO crescut semnificativ! Clienții întârzie la plată.
⚠️ ALERTĂ: Cash flow redus față de luna trecută.
⚠️ Marja profitului a scăzut de la 15.56% la 10.58%.`,
          metadata: {
            ca: 520000,
            cheltuieli: 465000,
            profit: 55000,
            ebitda: 78000,
            profit_margin: 10.58,
            soldBanca: 98000,
            soldCasa: 12000,
            soldClienti: 285000,
            soldFurnizori: 145000,
            dso: 68,
            dpo: 35,
            dio: 42,
            cashConversionCycle: 75
          }
        },
        {
          company_name: 'SC DEMO CONSTRUCT SRL',
          file_name: 'Balanta_Martie_2025.xlsx',
          created_at: new Date('2025-03-31').toISOString(),
          analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/03/2025 - 31/03/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 385,000 RON
- Cheltuieli totale: 420,000 RON
- Profit net: -35,000 RON 🔴
- EBITDA: -18,000 RON 🔴
- Marja profitului: -9.09%

SITUAȚIA TREZORERIEI:
- Sold bancă: 65,000 RON
- Sold casă: 15,000 RON
- Creanțe clienți: 325,000 RON
- Datorii furnizori: 185,000 RON

INDICATORI OPERAȚIONALI:
- DSO (Days Sales Outstanding): 82 zile 🔴
- DPO (Days Payable Outstanding): 38 zile
- DIO (Days Inventory Outstanding): 48 zile
- Cash Conversion Cycle: 92 zile

🔴 ALERTĂ CRITICĂ: Profit negativ! Cheltuielile depășesc veniturile.
🔴 ALERTĂ CRITICĂ: EBITDA negativ - pierderi operaționale.
🔴 ALERTĂ: DSO foarte ridicat - probleme serioase la încasări.
⚠️ Cash flow în scădere continuă - risc de lichiditate.`,
          metadata: {
            ca: 385000,
            cheltuieli: 420000,
            profit: -35000,
            ebitda: -18000,
            profit_margin: -9.09,
            soldBanca: 65000,
            soldCasa: 15000,
            soldClienti: 325000,
            soldFurnizori: 185000,
            dso: 82,
            dpo: 38,
            dio: 48,
            cashConversionCycle: 92
          }
        },
        {
          company_name: 'SC DEMO CONSTRUCT SRL',
          file_name: 'Balanta_Aprilie_2025.xlsx',
          created_at: new Date('2025-04-30').toISOString(),
          analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/04/2025 - 30/04/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 580,000 RON
- Cheltuieli totale: 485,000 RON
- Profit net: 95,000 RON ✅
- EBITDA: 125,000 RON ✅
- Marja profitului: 16.38%

SITUAȚIA TREZORERIEI:
- Sold bancă: 145,000 RON
- Sold casă: 9,500 RON
- Creanțe clienți: 235,000 RON
- Datorii furnizori: 125,000 RON

INDICATORI OPERAȚIONALI:
- DSO (Days Sales Outstanding): 52 zile
- DPO (Days Payable Outstanding): 32 zile
- DIO (Days Inventory Outstanding): 38 zile
- Cash Conversion Cycle: 58 zile

✅ ÎMBUNĂTĂȚIRE: Revenire pe profit și EBITDA pozitiv!
✅ ÎMBUNĂTĂȚIRE: DSO redus semnificativ - încasări mai rapide.
✅ Cash flow îmbunătățit considerabil.
💡 RECOMANDARE: Menține disciplina încasărilor din aprilie.`,
          metadata: {
            ca: 580000,
            cheltuieli: 485000,
            profit: 95000,
            ebitda: 125000,
            profit_margin: 16.38,
            soldBanca: 145000,
            soldCasa: 9500,
            soldClienti: 235000,
            soldFurnizori: 125000,
            dso: 52,
            dpo: 32,
            dio: 38,
            cashConversionCycle: 58
          }
        }
      ];

      // Insert demo analyses
      const analysesToInsert = demoAnalyses.map(demo => ({
        user_id: user.id,
        company_name: demo.company_name,
        file_name: demo.file_name,
        created_at: demo.created_at,
        analysis_text: demo.analysis_text,
        metadata: demo.metadata
      }));

      const { error } = await supabase
        .from('analyses')
        .insert(analysesToInsert);

      if (error) throw error;

      // Reload analyses
      await loadAnalyses();

      toast({
        title: '✨ Date demo încărcate!',
        description: '4 analize demo pentru SC DEMO CONSTRUCT SRL au fost adăugate. Explorează toate funcționalitățile!',
      });
    } catch (error) {
      console.error('Error loading demo data:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca datele demo.',
        variant: 'destructive'
      });
    }
  };

  const exportToPDF = async (analysis: Analysis) => {
    try {
      // Parse analysis to get structured data
      const indicators = parseAnalysisText(analysis.analysis_text);
      
      // Get insights for this analysis
      const { data: insights } = await supabase
        .from('chat_insights')
        .select('*')
        .eq('analysis_id', analysis.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const alerts = (insights || []).map(insight => ({
        type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity as 'critical' | 'warning' | 'info'
      }));

      // Extract recommendations from analysis text
      const recommendations: string[] = [];
      const recMatch = analysis.analysis_text.match(/recomandări?:?\s*([\s\S]*?)(?=\n\n|$)/i);
      if (recMatch) {
        const recText = recMatch[1];
        const recLines = recText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 10 && (line.match(/^[•\-*\d]/) || line.includes(':')));
        recommendations.push(...recLines.slice(0, 8));
      }

      // Add generic recommendations based on indicators
      if (indicators.dso > 60) {
        recommendations.push('Reduce DSO-ul: Implementează sistem automat de reminder pentru facturi restante');
      }
      if (indicators.profit < 0) {
        recommendations.push('Analizează structura costurilor și identifică zone de eficientizare');
      }
      if (indicators.ebitda < 0) {
        recommendations.push('Atenție la profitabilitatea operațională - revizuiește prețurile și costurile');
      }

      const exportData = {
        companyName: analysis.company_name || 'Firmă necunoscută',
        fileName: analysis.file_name,
        date: format(new Date(analysis.created_at), 'dd MMMM yyyy', { locale: ro }),
        indicators,
        alerts,
        recommendations: recommendations.slice(0, 8),
        fullAnalysisText: analysis.analysis_text,
        themeColor: currentTheme === 'accountant' ? 'accountant' as const : 'entrepreneur' as const
      };

      // Dynamic import to reduce bundle size
      const { generateAnalysisPDF } = await import('@/utils/pdfExport');
      await generateAnalysisPDF(exportData);
      
      toast({
        title: '📄 Export reușit',
        description: 'Raportul PDF a fost descărcat cu succes.'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Eroare export',
        description: 'Nu am putut genera PDF-ul.',
        variant: 'destructive'
      });
    }
  };

  // PERFORMANCE: Memoized filtered analyses to avoid recalculation on every render
  // MUST be before any conditional returns (Rules of Hooks)
  const filteredAnalyses = useMemo(() => {
    let filtered = analyses;
    
    // Filtrare după perioadă
    if (periodFilter !== 'all') {
      const months = parseInt(periodFilter);
      const cutoffDate = subMonths(new Date(), months);
      filtered = filtered.filter(analysis => 
        new Date(analysis.created_at) >= cutoffDate
      );
    }
    
    // Filtrare după companie
    if (companyFilter !== 'all') {
      filtered = filtered.filter(analysis => 
        analysis.company_name === companyFilter
      );
    }
    
    return filtered;
  }, [analyses, periodFilter, companyFilter]);
  
  // PERFORMANCE: Memoized unique companies list
  // MUST be before any conditional returns (Rules of Hooks)
  const uniqueCompanies = useMemo(() => 
    Array.from(new Set(
      analyses.map(a => a.company_name).filter(Boolean)
    )).sort(),
    [analyses]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-8 w-64 skeleton-shimmer rounded" />
            <div className="h-4 w-48 skeleton-shimmer rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-appear">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard Financiar</h1>
          <ContextualHelp 
            title="Dashboard Financiar"
            content={helpContent.dashboard.analyses.content}
          />
          {isAdmin && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Admin Mode
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vizualizezi date de la toți utilizatorii</p>
                    <p className="text-xs text-muted-foreground">{analyses.length} analize totale în sistem</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link to="/landing">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Landing
                </Button>
              </Link>
            </>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selectează perioada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Ultimele 3 luni</SelectItem>
              <SelectItem value="6">Ultimele 6 luni</SelectItem>
              <SelectItem value="12">Ultimele 12 luni</SelectItem>
              <SelectItem value="all">Toate perioadele</SelectItem>
            </SelectContent>
          </Select>
          
          {uniqueCompanies.length > 1 && (
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toate firmele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate firmele</SelectItem>
                {uniqueCompanies.map(company => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDemoData}
            className="flex items-center gap-2 btn-hover-lift"
          >
            <Database className="h-4 w-4" />
            Încarcă Date Demo
          </Button>

          {analyses.length > 0 && isAdmin && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={deleteAllAnalyses}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Șterge toate
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className={`grid w-full max-w-4xl ${isAccountantMode ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="analytics" data-tour="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Grafice
          </TabsTrigger>
          <TabsTrigger value="alerts" data-tour="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerte
          </TabsTrigger>
          <TabsTrigger value="predictions" data-tour="tab-predictions">
            <Sparkles className="h-4 w-4 mr-2" />
            Predicții
          </TabsTrigger>
          <TabsTrigger value="resilience" data-tour="tab-resilience">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reziliență
          </TabsTrigger>
          {isAccountantMode && (
            <TabsTrigger value="multi-company" data-tour="tab-multi-company">
              <Building2 className="h-4 w-4 mr-2" />
              Multi-Firmă
            </TabsTrigger>
          )}
          <TabsTrigger value="news" data-tour="tab-news">
            <Newspaper className="h-4 w-4 mr-2" />
            Știri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="py-4">
              <p className="text-sm">
                <strong>Tab "Grafice":</strong> Analiză detaliată a companiei selectate în filtru.{' '}
                {isAccountantMode && (
                  <span className="text-muted-foreground">
                    Pentru comparație între toate firmele, vezi tab-ul "Multi-Firmă".
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          <TopIssuesWidget />
          <Suspense fallback={<ChartLoader />}>
            <AnalyticsCharts analyses={filteredAnalyses} />
          </Suspense>
          {filteredAnalyses.length >= 2 && (
            <CompareAnalyses analyses={filteredAnalyses} />
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <ProactiveAlerts />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <AIPredictions analyses={filteredAnalyses} />
        </TabsContent>

        <TabsContent value="resilience" className="space-y-6">
          <ResilienceAnalysis analyses={filteredAnalyses} />
        </TabsContent>

        {isAccountantMode && (
          <TabsContent value="multi-company" className="space-y-6">
            <Suspense fallback={<ChartLoader />}>
              <MultiCompanyComparison />
            </Suspense>
          </TabsContent>
        )}


        <TabsContent value="news" className="space-y-6">
          <FiscalNews />
        </TabsContent>
      </Tabs>
      
      {/* Email Dialog */}
      {selectedAnalysis && (
        <EmailAnalysisDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          companyId={undefined}
          companyName={
            selectedAnalysis.company_name || 
            extractCompanyNameFromFileName(selectedAnalysis.file_name) ||
            'Firmă'
          }
          clientEmail=""
          clientName=""
          latestAnalysis={selectedAnalysis}
        />
      )}
      
      {/* Share Dialog */}
      {selectedAnalysis && (
        <ShareAnalysisDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          analysisId={selectedAnalysis.id}
        />
      )}
    </div>
  );
};
