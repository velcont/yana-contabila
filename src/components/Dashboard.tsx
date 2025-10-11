import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Eye, Download, BarChart3, Calendar, Newspaper, Info, TrendingUp, Rocket, AlertTriangle, Sparkles, Building2, Mail, Users, Bot, Database } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import jsPDF from 'jspdf';
import AnalyticsCharts from './AnalyticsCharts';
import CompareAnalyses from './CompareAnalyses';
import { parseAnalysisText, formatCurrency, type FinancialIndicators } from '@/utils/analysisParser';
import { FiscalNews } from './FiscalNews';
import { AnalysisDisplay } from './AnalysisDisplay';
import { useUserRole } from '@/hooks/useUserRole';
import { TopIssuesWidget } from './TopIssuesWidget';
import { ProactiveAlerts } from './ProactiveAlerts';
import { MultiCompanyComparison } from './MultiCompanyComparison';
import { AIPredictions } from './AIPredictions';
import { ResilienceAnalysis } from './ResilienceAnalysis';
import { EmailAnalysisDialog } from './EmailAnalysisDialog';
import { ShareAnalysisDialog } from './ShareAnalysisDialog';
import { AnalysisComments } from './AnalysisComments';
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    loadAnalyses();
  }, []);

  // Refresh automatically when a new analysis is created from ChatAI
  useEffect(() => {
    const handler = () => loadAnalyses();
    window.addEventListener('analysis:created', handler);
    return () => window.removeEventListener('analysis:created', handler);
  }, []);

  const loadAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse metadata pentru fiecare analiză
      const analysesWithMetadata = (data || []).map(analysis => ({
        ...analysis,
        metadata: parseAnalysisText(analysis.analysis_text)
      }));
      
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

  const deleteAnalysis = async (id: string) => {
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
  };

  const deleteAllAnalyses = async () => {
    if (!window.confirm('Ești sigur că vrei să ștergi TOATE analizele? Această acțiune nu poate fi anulată!')) {
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
        description: 'Toate analizele au fost șterse.'
      });
    } catch (error) {
      console.error('Error deleting all analyses:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge analizele.',
        variant: 'destructive'
      });
    }
  };

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
        fullAnalysisText: analysis.analysis_text
      };

      // Dynamic import to reduce bundle size
      const { generateAnalysisPDF } = await import('@/utils/pdfExport');
      generateAnalysisPDF(exportData);
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Filtrare date pe perioadă și companie
  const getFilteredAnalyses = () => {
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
  };
  
  // Lista unică de companii pentru filtru
  const uniqueCompanies = Array.from(new Set(
    analyses.map(a => a.company_name).filter(Boolean)
  )).sort();

  const filteredAnalyses = getFilteredAnalyses();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard Financiar</h1>
          {isAdmin && (
            <Link to="/landing">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Landing
              </Button>
            </Link>
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
            className="flex items-center gap-2"
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
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
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
          <TabsTrigger value="multi-company" data-tour="tab-multi-company">
            <Building2 className="h-4 w-4 mr-2" />
            Multi-Firmă
          </TabsTrigger>
          <TabsTrigger value="news" data-tour="tab-news">
            <Newspaper className="h-4 w-4 mr-2" />
            Știri
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Dosarul Meu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <TopIssuesWidget />
          <AnalyticsCharts analyses={filteredAnalyses} />
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

        <TabsContent value="multi-company" className="space-y-6">
          <MultiCompanyComparison analyses={analyses} />
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <FiscalNews />
        </TabsContent>

        <TabsContent value="history">
          <div className="grid md:grid-cols-3 gap-6">
        {/* Lista analizelor */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Analizele Tale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredAnalyses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nu ai analize salvate încă.
              </p>
            ) : (
              filteredAnalyses.map((analysis) => {
                // Extract period from analysis text - try multiple patterns
                const periodMatch = analysis.analysis_text.match(/Perioad[aă][:\s]+([^\n]+)/i) || 
                                  analysis.analysis_text.match(/Pentru perioad[aă][:\s]+([^\n]+)/i) ||
                                  analysis.analysis_text.match(/(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4})/i) ||
                                  analysis.analysis_text.match(/Perioada[:\s]*([^\n]+)/i);
                const period = periodMatch ? periodMatch[1].trim() : null;
                
                return (
                  <div
                    key={analysis.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAnalysis?.id === analysis.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedAnalysis(analysis)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {analysis.file_name}
                        </p>
                        {analysis.company_name && (
                          <p className="text-xs font-semibold text-primary">
                            {analysis.company_name}
                          </p>
                        )}
                        {period && (
                          <p className="text-xs font-medium text-foreground">
                            {period}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: ro })}
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Detalii analiză */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>
                {selectedAnalysis ? 'Detalii Analiză' : 'Selectează o analiză'}
              </CardTitle>
              {selectedAnalysis && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-red-500 cursor-help animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md p-4">
                      <p className="text-sm">
                        Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), 
                        pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă 
                        responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. 
                        Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat 
                        sau expert contabil, înainte de a fi utilizate în luarea deciziilor sau în relația cu autoritățile fiscale. 
                        Analiza are caracter informativ și orientativ, nu reprezintă un document oficial sau o opinie contabilă validată.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {selectedAnalysis && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Trimite Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Partajează
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(selectedAnalysis)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAnalysis(selectedAnalysis.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedAnalysis ? (
              <>
                {/* Helper function pentru extragerea soldului unui cont */}
                {(() => {
                  const extractAccountBalance = (accountNumber: string) => {
                    let debit = 0;
                    let credit = 0;
                    
                    // Pattern A: "XXX ... debitor|creditor ... Y RON"
                    const patternA = new RegExp(`${accountNumber}[^\\n.]*?(debitor|creditor)[^\\n.]*?(?:de\\s+)?([\\d.,]+)\\s*RON\\b`, 'i');
                    const matchA = selectedAnalysis.analysis_text.match(patternA);
                    
                    if (matchA) {
                      const amount = parseFloat(matchA[2].replace(/,/g, ''));
                      if (matchA[1].toLowerCase() === 'debitor') debit = amount; else credit = amount;
                    }
                    
                    // Pattern B: "debitor|creditor ... XXX ... Y RON"
                    if (debit === 0 && credit === 0) {
                      const patternB = new RegExp(`(debitor|creditor)[^\\n.]*?${accountNumber}[^\\n.]*?(?:de\\s+)?([\\d.,]+)\\s*RON\\b`, 'i');
                      const matchB = selectedAnalysis.analysis_text.match(patternB);
                      if (matchB) {
                        const amount = parseFloat(matchB[2].replace(/,/g, ''));
                        if (matchB[1].toLowerCase() === 'debitor') debit = amount; else credit = amount;
                      }
                    }
                    
                    // Pattern C: Linie care conține accountNumber și o sumă în RON
                    if (debit === 0 && credit === 0) {
                      const regex = new RegExp(`\\b${accountNumber}\\b`);
                      const line = selectedAnalysis.analysis_text
                        .split('\n')
                        .find(l => regex.test(l));
                      if (line) {
                        const amt = line.match(/([\d.,]+)\s*RON\b/);
                        if (amt) {
                          const amount = parseFloat(amt[1].replace(/,/g, ''));
                          if (/debitor/i.test(line)) debit = amount;
                          else if (/creditor/i.test(line)) credit = amount;
                          else debit = amount;
                        }
                      }
                    }
                    
                    return { debit, credit };
                  };

                  const account473 = extractAccountBalance('473');
                  const hasAccount473Balance = account473.debit > 0 || account473.credit > 0;
                  
                  // Configurație alerte pentru toate conturile
                  const accountAlerts = [
                    {
                      number: '473',
                      title: 'Cont 473 — Decontări în curs de clarificare',
                      debitMsg: 'Sume în curs de clarificare nedecontate. Verificați documentele justificative și închideți contul prin înregistrări corecte (ex.: 473 = 401/411/531/512).',
                      creditMsg: 'Sume în clarificare de regularizat/restuit. Verificați natura sumelor (de ex. încasări/plăți nealocate, diferențe de curs, deconturi) și închideți contul prin regularizare.',
                      recommendation: 'Mențineți contul 473 la sold zero la final de lună. Clarificați lunar toate sumele (note contabile de regularizare) și documentați justificativ fiecare poziție.',
                      balance: account473
                    },
                    {
                      number: '461',
                      title: 'Cont 461 — Debitori diverși',
                      debitMsg: 'Sold debitor la debitori diverși. Verificați natura creanțelor, solicitați decontarea sau clarificarea acestora.',
                      creditMsg: 'Sold creditor neașteptat la debitori diverși. Verificați și corectați înregistrările contabile.',
                      recommendation: 'Monitorizați lunar soldurile și clarificați operațiunile vechi sau nejustificate.',
                      balance: extractAccountBalance('461')
                    },
                    {
                      number: '462',
                      title: 'Cont 462 — Creditori diverși',
                      debitMsg: 'Sold debitor neașteptat la creditori diverși. Verificați și corectați înregistrările contabile.',
                      creditMsg: 'Datorii către creditori diverși. Asigurați-vă că sumele sunt justificate și planificați decontarea.',
                      recommendation: 'Verificați documentele justificative și asigurați-vă că toate obligațiile sunt înregistrate corect.',
                      balance: extractAccountBalance('462')
                    },
                    {
                      number: '409',
                      title: 'Cont 409 — Furnizori - debitori',
                      debitMsg: 'Avansuri către furnizori sau solduri debitoare. Verificați starea comenzilor și solicitați decontarea avansurilor nefolosite.',
                      creditMsg: 'Sold creditor neașteptat la furnizori-debitori. Verificați și corectați înregistrările.',
                      recommendation: 'Reconciliați lunar cu furnizorii și clarificați avansurile vechi.',
                      balance: extractAccountBalance('409')
                    },
                    {
                      number: '419',
                      title: 'Cont 419 — Clienți - creditori',
                      debitMsg: 'Sold debitor neașteptat la clienți-creditori. Verificați și corectați înregistrările contabile.',
                      creditMsg: 'Avansuri primite de la clienți. Asigurați-vă că sunt justificate prin comenzi ferme și planificați livrarea.',
                      recommendation: 'Monitorizați avansurile primite și asigurați îndeplinirea obligațiilor contractuale.',
                      balance: extractAccountBalance('419')
                    },
                    {
                      number: '581',
                      title: 'Cont 581 — Decontări între unități',
                      debitMsg: 'Sume de încasat de la alte unități/filiale. Verificați și solicitați decontarea lunară.',
                      creditMsg: 'Sume de plată către alte unități/filiale. Planificați decontarea promptă.',
                      recommendation: 'Reconciliați lunar cu toate unitățile și închideți soldurile prin viramente bancare sau note contabile.',
                      balance: extractAccountBalance('581')
                    },
                    {
                      number: '542',
                      title: 'Cont 542 — Conturi curente la bănci (în valută)',
                      debitMsg: 'Disponibilități în valută la bănci. Monitorizați cursul de schimb și riscurile valutare.',
                      creditMsg: 'Sold creditor neașteptat la conturile bancare în valută. Verificați reconcilierea bancară și corectați eventualele erori.',
                      recommendation: 'Efectuați reconcilieri bancare lunare și monitorizați diferențele de curs valutar.',
                      balance: extractAccountBalance('542')
                    }
                  ];

                  return (
                    <>
                      {accountAlerts.map(alert => {
                        const hasBalance = alert.balance.debit > 0 || alert.balance.credit > 0;
                        if (!hasBalance) return null;

                        return (
                          <Card key={alert.number} className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertTriangle className="h-5 w-5" />
                                Alerte {alert.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2">
                                {alert.balance.debit > 0 && (
                                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-semibold text-orange-900 dark:text-orange-200">
                                        Sold Debitor: {formatCurrency(alert.balance.debit)}
                                      </p>
                                      <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                                        {alert.debitMsg}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {alert.balance.credit > 0 && (
                                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-semibold text-orange-900 dark:text-orange-200">
                                        Sold Creditor: {formatCurrency(alert.balance.credit)}
                                      </p>
                                      <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                                        {alert.creditMsg}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-900 dark:text-blue-200">
                                  <strong>Recomandare:</strong> {alert.recommendation}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  );
                })()}
                
                <AnalysisDisplay 
                  analysisText={selectedAnalysis.analysis_text}
                  fileName={selectedAnalysis.file_name}
                  createdAt={selectedAnalysis.created_at}
                />
                
                {/* Comments Section */}
                <AnalysisComments analysisId={selectedAnalysis.id} />
              </>
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-primary to-primary/60 rounded-full p-6 animate-bounce">
                    <Bot className="h-16 w-16 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 animate-fade-in">
                  👋 Salut! Sunt Yana
                </h3>
                <p className="text-muted-foreground animate-fade-in">
                  Alege o balanță din listă ca să încep analiza.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Email Dialog */}
      {selectedAnalysis && (
        <EmailAnalysisDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          companyName={selectedAnalysis.company_name || ''}
          analysisText={selectedAnalysis.analysis_text}
          analysisDate={format(new Date(selectedAnalysis.created_at), 'dd MMMM yyyy', { locale: ro })}
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
