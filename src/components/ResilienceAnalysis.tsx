import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, Shield, Activity, Zap, Target, BookOpen, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { ResearchDataImport } from "./ResearchDataImport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface Analysis {
  id: string;
  created_at: string;
  company_name?: string;
  metadata: {
    ca?: number;
    profit?: number;
    ebitda?: number;
    casa?: number;
    banca?: number;
    clienti?: number;
    furnizori?: number;
    stocuri?: number;
    cheltuieli?: number;
  };
}

interface ResilienceAnalysisProps {
  analyses: Analysis[];
}

export const ResilienceAnalysis = ({ analyses }: ResilienceAnalysisProps) => {
  const [researchData, setResearchData] = useState<any[]>([]);
  const { toast } = useToast();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();

  const fetchResearchData = async () => {
    const { data, error } = await supabase
      .from('research_data')
      .select('*')
      .order('data_collection_date', { ascending: false });

    if (error) {
      console.error('Error fetching research data:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca datele de cercetare",
        variant: "destructive",
      });
      return;
    }

    setResearchData(data || []);
  };

  useEffect(() => {
    fetchResearchData();
  }, []);

  // Calculate resilience metrics
  const calculateResilienceScore = () => {
    if (analyses.length < 2) return null;

    const sortedAnalyses = [...analyses].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 1. Cash Flow Stability (variance in profit)
    const profits = sortedAnalyses.map(a => a.metadata.profit || 0);
    const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
    const profitVariance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length;
    const profitStability = avgProfit !== 0 ? Math.max(0, 100 - (Math.sqrt(profitVariance) / Math.abs(avgProfit)) * 50) : 0;

    // 2. Liquidity (cash + bank / short-term obligations)
    const latestAnalysis = sortedAnalyses[sortedAnalyses.length - 1];
    const liquidAssets = (latestAnalysis.metadata.casa || 0) + (latestAnalysis.metadata.banca || 0);
    const shortTermObligations = latestAnalysis.metadata.furnizori || 1;
    const liquidityRatio = (liquidAssets / shortTermObligations) * 100;
    const liquidityScore = Math.min(100, liquidityRatio);

    // 3. Operational Efficiency (EBITDA margin)
    const ebitda = latestAnalysis.metadata.ebitda || 0;
    const revenue = latestAnalysis.metadata.ca || 1;
    const ebitdaMargin = (ebitda / revenue) * 100;
    const efficiencyScore = Math.max(0, Math.min(100, 50 + ebitdaMargin * 2));

    // 4. Cost Flexibility (expense to revenue ratio variance)
    const expenseRatios = sortedAnalyses.map(a => {
      const expenses = a.metadata.cheltuieli || 0;
      const rev = a.metadata.ca || 1;
      return (expenses / rev) * 100;
    });
    const avgExpenseRatio = expenseRatios.reduce((sum, r) => sum + r, 0) / expenseRatios.length;
    const expenseVariance = expenseRatios.reduce((sum, r) => sum + Math.pow(r - avgExpenseRatio, 2), 0) / expenseRatios.length;
    const costFlexibility = Math.max(0, 100 - Math.sqrt(expenseVariance) * 10);

    const overallScore = (profitStability * 0.3 + liquidityScore * 0.3 + efficiencyScore * 0.2 + costFlexibility * 0.2);

    return {
      overall: Math.round(overallScore),
      profitStability: Math.round(profitStability),
      liquidity: Math.round(liquidityScore),
      efficiency: Math.round(efficiencyScore),
      costFlexibility: Math.round(costFlexibility)
    };
  };

  // Calculate adaptability metrics
  const calculateAdaptability = () => {
    if (analyses.length < 2) return null;

    const sortedAnalyses = [...analyses].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Recovery speed (how fast negative trends reverse)
    const profitChanges = [];
    for (let i = 1; i < sortedAnalyses.length; i++) {
      const prev = sortedAnalyses[i - 1].metadata.profit || 0;
      const curr = sortedAnalyses[i].metadata.profit || 0;
      profitChanges.push(((curr - prev) / (prev || 1)) * 100);
    }

    const recoverySpeed = profitChanges.filter(change => change > 0).length / profitChanges.length * 100;

    // Business model flexibility (based on revenue consistency)
    const revenues = sortedAnalyses.map(a => a.metadata.ca || 0);
    const revenueGrowth = [];
    for (let i = 1; i < revenues.length; i++) {
      revenueGrowth.push(((revenues[i] - revenues[i-1]) / (revenues[i-1] || 1)) * 100);
    }
    const avgGrowth = revenueGrowth.reduce((sum, g) => sum + g, 0) / revenueGrowth.length;
    const flexibility = Math.max(0, Math.min(100, 50 + avgGrowth * 5));

    // Reaction speed (volatility in key metrics)
    const cashPositions = sortedAnalyses.map(a => (a.metadata.casa || 0) + (a.metadata.banca || 0));
    const cashChanges = [];
    for (let i = 1; i < cashPositions.length; i++) {
      cashChanges.push(Math.abs(cashPositions[i] - cashPositions[i-1]));
    }
    const avgCashChange = cashChanges.reduce((sum, c) => sum + c, 0) / cashChanges.length;
    const avgCashPosition = cashPositions.reduce((sum, c) => sum + c, 0) / cashPositions.length;
    const reactionSpeed = avgCashPosition !== 0 ? Math.min(100, (avgCashChange / avgCashPosition) * 200) : 50;

    return {
      recoverySpeed: Math.round(recoverySpeed),
      flexibility: Math.round(flexibility),
      reactionSpeed: Math.round(reactionSpeed),
      avgRecoveryTime: profitChanges.length > 0 ? Math.max(1, 6 - Math.floor(recoverySpeed / 20)) : 3
    };
  };

  // Crisis scenarios
  const generateCrisisScenarios = () => {
    if (analyses.length === 0) return [];

    const latestAnalysis = analyses[analyses.length - 1];
    const revenue = latestAnalysis.metadata.ca || 0;
    const expenses = latestAnalysis.metadata.cheltuieli || 0;
    const cash = (latestAnalysis.metadata.casa || 0) + (latestAnalysis.metadata.banca || 0);

    return [
      {
        name: "Recesiune Economică",
        impact: "Scădere venituri -30%",
        revenueImpact: -30,
        newRevenue: revenue * 0.7,
        newProfit: (revenue * 0.7) - expenses,
        cashRunway: expenses > 0 ? Math.floor(cash / (expenses / 12)) : 12,
        severity: "high" as const,
        recommendations: [
          "Reduceți cheltuielile operaționale cu 20-25%",
          "Negociați termene de plată mai lungi cu furnizorii",
          "Diversificați sursele de venit",
          "Construiți un fond de rezervă de minimum 6 luni"
        ]
      },
      {
        name: "Creștere Costuri Energie",
        impact: "Creștere cheltuieli +20%",
        revenueImpact: 0,
        newRevenue: revenue,
        newProfit: revenue - (expenses * 1.2),
        cashRunway: expenses > 0 ? Math.floor(cash / ((expenses * 1.2) / 12)) : 12,
        severity: "medium" as const,
        recommendations: [
          "Investiți în eficiență energetică",
          "Negociați contracte pe termen lung",
          "Transferați partial costurile către clienți",
          "Automatizați procesele pentru reducerea consumului"
        ]
      },
      {
        name: "Pierdere Client Major",
        impact: "Scădere venituri -40%",
        revenueImpact: -40,
        newRevenue: revenue * 0.6,
        newProfit: (revenue * 0.6) - expenses,
        cashRunway: expenses > 0 ? Math.floor(cash / (expenses / 12)) : 12,
        severity: "critical" as const,
        recommendations: [
          "Diversificați imediat portofoliul de clienți",
          "Reduceți rapid cheltuielile fixe cu 30%",
          "Căutați surse alternative de finanțare",
          "Pivotați modelul de afaceri către noi segmente"
        ]
      },
      {
        name: "Creștere Dobânzi",
        impact: "Creștere costuri finanțare +15%",
        revenueImpact: 0,
        newRevenue: revenue,
        newProfit: revenue - (expenses * 1.15),
        cashRunway: expenses > 0 ? Math.floor(cash / ((expenses * 1.15) / 12)) : 12,
        severity: "medium" as const,
        recommendations: [
          "Refinanțați datoriile existente",
          "Reduceți dependența de credite",
          "Îmbunătățiți cash flow-ul operațional",
          "Negociați rate fixe pentru împrumuturi"
        ]
      }
    ];
  };

  const resilienceScore = calculateResilienceScore();
  const adaptability = calculateAdaptability();
  const crisisScenarios = generateCrisisScenarios();

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-600">Excelent</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-600">Moderat</Badge>;
    return <Badge className="bg-red-600">Risc Ridicat</Badge>;
  };

  const getSeverityColor = (severity: "low" | "medium" | "high" | "critical") => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-yellow-600";
      case "high": return "text-orange-600";
      case "critical": return "text-red-600";
    }
  };

  if (analyses.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Analiza Rezilienței Financiare
            </div>
            {isAdmin && <ResearchDataImport onImportSuccess={fetchResearchData} />}
          </CardTitle>
          <CardDescription>
            Sunt necesare minimum 2 analize pentru a calcula indicatorii de reziliență
            {researchData.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                📚 {researchData.length} {researchData.length === 1 ? 'set de date de cercetare importat' : 'seturi de date de cercetare importate'}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        
        {researchData.length > 0 && (
          <CardContent>
            <div className="space-y-4">
              {researchData.map((data) => (
                <Card key={data.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {data.course_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(data.data_collection_date).toLocaleDateString('ro-RO')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Temă: </span>
                      <Badge variant="outline">{data.research_theme}</Badge>
                    </div>
                    {data.case_studies && data.case_studies.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Studii de caz: </span>
                        <span className="text-sm text-muted-foreground">
                          {data.case_studies.length} compan{data.case_studies.length === 1 ? 'ie' : 'ii'} analizat{data.case_studies.length === 1 ? 'ă' : 'e'}
                        </span>
                      </div>
                    )}
                    {data.research_notes && (
                      <p className="text-sm text-muted-foreground">{data.research_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  const radarData = resilienceScore ? [
    { metric: 'Stabilitate Profit', value: resilienceScore.profitStability },
    { metric: 'Lichiditate', value: resilienceScore.liquidity },
    { metric: 'Eficiență', value: resilienceScore.efficiency },
    { metric: 'Flexibilitate Costuri', value: resilienceScore.costFlexibility },
    { metric: 'Adaptabilitate', value: adaptability?.flexibility || 0 }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Overall Resilience Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Scor Global Reziliență
            </div>
            {isAdmin && <ResearchDataImport onImportSuccess={fetchResearchData} />}
          </CardTitle>
          <CardDescription>
            Indicator compozit al capacității afacerii de a face față șocurilor externe
            {researchData.length > 0 && (
              <span className="ml-2 text-xs">
                📚 {researchData.length} {researchData.length === 1 ? 'set doctorat' : 'seturi doctorat'}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{resilienceScore?.overall || 0}/100</span>
              {resilienceScore && getScoreBadge(resilienceScore.overall)}
            </div>
            <Progress value={resilienceScore?.overall || 0} className="h-3" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Stabilitate Profit
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(resilienceScore?.profitStability || 0)}`}>
                  {resilienceScore?.profitStability || 0}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Lichiditate
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(resilienceScore?.liquidity || 0)}`}>
                  {resilienceScore?.liquidity || 0}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Eficiență
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(resilienceScore?.efficiency || 0)}`}>
                  {resilienceScore?.efficiency || 0}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  Flexibilitate
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(resilienceScore?.costFlexibility || 0)}`}>
                  {resilienceScore?.costFlexibility || 0}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="adaptability" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="adaptability">Adaptabilitate</TabsTrigger>
          <TabsTrigger value="radar">Analiză Vizuală</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarii de Criză</TabsTrigger>
          <TabsTrigger value="research">Date Doctorat</TabsTrigger>
        </TabsList>

        <TabsContent value="adaptability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metrici de Adaptabilitate</CardTitle>
              <CardDescription>
                Capacitatea afacerii de a se adapta rapid la schimbări
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Viteză de Recuperare</div>
                  <div className={`text-3xl font-bold ${getScoreColor(adaptability?.recoverySpeed || 0)}`}>
                    {adaptability?.recoverySpeed || 0}%
                  </div>
                  <Progress value={adaptability?.recoverySpeed || 0} />
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Flexibilitate Model Afaceri</div>
                  <div className={`text-3xl font-bold ${getScoreColor(adaptability?.flexibility || 0)}`}>
                    {adaptability?.flexibility || 0}%
                  </div>
                  <Progress value={adaptability?.flexibility || 0} />
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Viteză de Reacție</div>
                  <div className={`text-3xl font-bold ${getScoreColor(adaptability?.reactionSpeed || 0)}`}>
                    {adaptability?.reactionSpeed || 0}%
                  </div>
                  <Progress value={adaptability?.reactionSpeed || 0} />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5" />
                  <span className="font-semibold">Timp Mediu de Recuperare</span>
                </div>
                <p className="text-2xl font-bold">{adaptability?.avgRecoveryTime || 3} luni</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Timpul estimat pentru revenire după un șoc economic
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>Hartă Vizuală Reziliență</CardTitle>
              <CardDescription>
                Reprezentare grafică a tuturor dimensiunilor rezilienței
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Scor" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          {crisisScenarios.map((scenario, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${getSeverityColor(scenario.severity)}`} />
                      {scenario.name}
                    </CardTitle>
                    <CardDescription>{scenario.impact}</CardDescription>
                  </div>
                  <Badge variant={scenario.severity === "critical" ? "destructive" : "secondary"}>
                    {scenario.severity === "critical" ? "CRITIC" : scenario.severity === "high" ? "RIDICAT" : "MODERAT"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Venit Nou</div>
                    <div className="text-xl font-bold">
                      {scenario.newRevenue.toLocaleString('ro-RO')} RON
                    </div>
                    {scenario.revenueImpact !== 0 && (
                      <div className="text-sm text-red-600">
                        {scenario.revenueImpact}%
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Profit Estimat</div>
                    <div className={`text-xl font-bold ${scenario.newProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {scenario.newProfit.toLocaleString('ro-RO')} RON
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Runway Cash</div>
                    <div className="text-xl font-bold">
                      {scenario.cashRunway} luni
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold">Plan de Acțiune Recomandat:</div>
                  <ul className="space-y-1 ml-4">
                    {scenario.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="research" className="space-y-4">
          {researchData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nicio dată de cercetare încă</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Folosește butonul "Import Date Cercetare" pentru a adăuga date din cursurile de doctorat
                </p>
                {isAdmin && <ResearchDataImport onImportSuccess={fetchResearchData} />}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {researchData.map((data) => (
                <Card key={data.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {data.course_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(data.data_collection_date).toLocaleDateString('ro-RO')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm font-medium">Temă de cercetare: </span>
                      <Badge variant="outline">{data.research_theme}</Badge>
                    </div>

                    {data.case_studies && data.case_studies.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Studii de caz ({data.case_studies.length})</h4>
                        {data.case_studies.map((caseStudy: any, idx: number) => (
                          <Card key={idx} className="bg-muted/50">
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium">{caseStudy.company_name}</h5>
                                  <p className="text-xs text-muted-foreground">{caseStudy.industry}</p>
                                </div>
                                {caseStudy.resilience_impact?.cost_flexibility && (
                                  <Badge variant="secondary">
                                    Flexibilitate: {caseStudy.resilience_impact.cost_flexibility}/10
                                  </Badge>
                                )}
                              </div>
                              {caseStudy.digital_tools_adopted && caseStudy.digital_tools_adopted.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium">Instrumente digitale: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {caseStudy.digital_tools_adopted.map((tool: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">{tool}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {caseStudy.key_insights && (
                                <p className="text-xs text-muted-foreground italic">{caseStudy.key_insights}</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {data.metrics_collected && (
                      <div className="grid grid-cols-2 gap-4">
                        {data.metrics_collected.avg_digital_maturity_score && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground">Maturitate Digitală</p>
                            <p className="text-2xl font-bold">{data.metrics_collected.avg_digital_maturity_score}</p>
                          </div>
                        )}
                        {data.metrics_collected.avg_resilience_score && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground">Scor Reziliență</p>
                            <p className="text-2xl font-bold">{data.metrics_collected.avg_resilience_score}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {data.research_notes && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Note de cercetare</h4>
                        <p className="text-sm text-muted-foreground">{data.research_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
