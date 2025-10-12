import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Eye, Download, BarChart3, Calendar, Newspaper, Info, TrendingUp, AlertTriangle, Sparkles, Building2, Mail, Users, Shield, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import CompareAnalyses from '@/components/CompareAnalyses';
import { formatCurrency } from '@/utils/analysisParser';
import { FiscalNews } from '@/components/FiscalNews';
import { AnalysisDisplay } from '@/components/AnalysisDisplay';
import { TopIssuesWidget } from '@/components/TopIssuesWidget';
import { ProactiveAlerts } from '@/components/ProactiveAlerts';
import { MultiCompanyComparison } from '@/components/MultiCompanyComparison';
import { AIPredictions } from '@/components/AIPredictions';
import { ResilienceAnalysis } from '@/components/ResilienceAnalysis';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

// Demo data - 4 months of financial analyses
const demoAnalyses = [
  {
    id: 'demo-1',
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
✅ Situație financiară bună în ianuarie. Lichidități solide, profit pozitiv și EBITDA sănătos.
✅ DSO este acceptabil dar ar putea fi îmbunătățit.
💡 RECOMANDARE: Monitorizează încasările pentru a menține DSO sub 45 zile.

ANALIZĂ DETALIATĂ:
Firma demonstrează o performanță solidă în prima lună a anului. Profitul net de 70,000 RON și EBITDA de 95,000 RON indică operațiuni sănătoase. Cash flow-ul este pozitiv, iar nivelul de lichidități permite flexibilitate operațională.`,
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
    id: 'demo-2',
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

⚠️ ALERTĂ: DSO crescut semnificativ! Clienții întârzie la plată cu 23 zile față de ianuarie.
⚠️ ALERTĂ: Cash flow redus față de luna trecută - sold bancă scăzut cu 27,000 RON.
⚠️ Marja profitului a scăzut de la 15.56% la 10.58% - presiune pe costuri.

RECOMANDĂRI URGENTE:
1. Implementează sistem automat de reminder pentru facturi restante
2. Revizuiește termenii de plată cu clienții mari
3. Monitorizează zilnic încasările pentru următoarele 30 zile
4. Analizează structura cheltuielilor crescute`,
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
    id: 'demo-3',
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

🔴 ALERTĂ CRITICĂ: Profit negativ! Cheltuielile depășesc veniturile cu 35,000 RON.
🔴 ALERTĂ CRITICĂ: EBITDA negativ - pierderi la nivel operațional.
🔴 ALERTĂ: DSO foarte ridicat (82 zile) - probleme serioase la încasări.
⚠️ Cash flow în scădere continuă - risc de lichiditate în următoarele 60 zile.
⚠️ Creanțe clienți crescute la 325,000 RON - banii sunt blocați.

ACȚIUNI IMEDIATE NECESARE:
1. 🚨 PRIORITATE 1: Recuperare creanțe - contactează toți clienții cu facturi > 60 zile
2. 🚨 PRIORITATE 2: Reducere cheltuieli operaționale cu minim 15%
3. 🚨 PRIORITATE 3: Renegociază termeni cu furnizorii pentru întârziere plăți
4. Oprește investițiile noi până la stabilizarea situației
5. Caută surse alternative de finanțare pe termen scurt`,
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
    id: 'demo-4',
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

✅ ÎMBUNĂTĂȚIRE MAJORĂ: Revenire pe profit cu 95,000 RON - cea mai bună lună din 2025!
✅ ÎMBUNĂTĂȚIRE: EBITDA pozitiv și solid la 125,000 RON.
✅ ÎMBUNĂTĂȚIRE: DSO redus cu 30 zile - măsurile de recuperare creanțe au funcționat!
✅ Cash flow îmbunătățit considerabil - sold bancă crescut cu 80,000 RON.
✅ Marja profitului revine la niveluri sănătoase (16.38%).

💡 RECOMANDĂRI PENTRU MENȚINEREA PERFORMANȚEI:
1. Continuă disciplina strictă de încasări - păstrează DSO sub 55 zile
2. Monitorizează lunar structura costurilor
3. Consolidează relațiile cu clienții care plătesc prompt
4. Construiește rezervă de cash pentru situații neprevăzute (minimum 2 luni cheltuieli)
5. Evaluează oportunități de creștere controlată`,
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

export const Demo = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState(demoAnalyses[demoAnalyses.length - 1]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const exportToPDF = async (analysis: any) => {
    toast({
      title: '📄 Export Demo',
      description: 'În versiunea completă, poți exporta analize ca PDF. Creează cont pentru această funcționalitate!',
      variant: 'default'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Demo Banner */}
      <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              MOD DEMO
            </Badge>
            <p className="text-sm">
              <strong>Acesta este un demo interactiv.</strong> Toate funcționalitățile sunt active cu date fictive pentru SC DEMO CONSTRUCT SRL.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/landing')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              <Shield className="h-4 w-4 mr-2" />
              Creează Cont Gratuit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard Financiar Demo</h1>
        </div>
      </div>
      
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Grafice
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerte
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <Sparkles className="h-4 w-4 mr-2" />
            Predicții
          </TabsTrigger>
          <TabsTrigger value="resilience">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reziliență
          </TabsTrigger>
          <TabsTrigger value="multi-company">
            <Building2 className="h-4 w-4 mr-2" />
            Multi-Firmă
          </TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="h-4 w-4 mr-2" />
            Știri
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Dosarul Meu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                Graficele arată evoluția indicatorilor financiari pentru SC DEMO CONSTRUCT SRL din Ianuarie-Aprilie 2025.
              </p>
            </CardContent>
          </Card>
          <AnalyticsCharts analyses={demoAnalyses} />
          <CompareAnalyses analyses={demoAnalyses} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                Alertele proactive identifică automat probleme financiare și oportunități de îmbunătățire.
              </p>
            </CardContent>
          </Card>
          
          {/* Mock Alerts */}
          <div className="space-y-4">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Alertă Critică: Pierderi în Martie 2025
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Profit negativ de -35,000 RON detectat în martie. Cheltuielile (420,000 RON) au depășit veniturile (385,000 RON).</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Acțiune recomandată:</strong> Revizuiește urgent structura costurilor și implementează măsuri de reducere a cheltuielilor.
                </p>
              </CardContent>
            </Card>

            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-warning" />
                  Avertizare: DSO Ridicat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">DSO-ul a atins 82 zile în martie, cu 37 zile peste pragul recomandat de 45 zile.</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Impact:</strong> Aproximativ 325,000 RON blocați în creanțe clienți. Risc de probleme de lichiditate.
                </p>
              </CardContent>
            </Card>

            <Card className="border-success/50 bg-success/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-success" />
                  Performanță Excelentă în Aprilie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Revenire spectaculoasă: Profit de 95,000 RON, DSO redus la 52 zile, marja profitului 16.38%.</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Recomandare:</strong> Menține disciplina actuală și construiește rezerve pentru situații neprevăzute.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                AI-ul generează predicții pentru următoarele 3 luni bazate pe tendințele istorice. Include simulări "What If" interactive.
              </p>
            </CardContent>
          </Card>
          <AIPredictions analyses={demoAnalyses} />
        </TabsContent>

        <TabsContent value="resilience" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                Analiza de reziliență evaluează capacitatea firmei de a face față șocurilor externe și identifică vulnerabilitățile.
              </p>
            </CardContent>
          </Card>
          <ResilienceAnalysis analyses={demoAnalyses} />
        </TabsContent>

        <TabsContent value="multi-company" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                În versiunea completă, poți compara performanța între multiple firme. Acest demo arată o singură firmă.
              </p>
            </CardContent>
          </Card>
          <MultiCompanyComparison />
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                Știri fiscale actualizate automat pentru a te ține la curent cu legislația românească.
              </p>
            </CardContent>
          </Card>
          <FiscalNews />
        </TabsContent>

        <TabsContent value="history">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Lista analizelor */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Analizele Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {demoAnalyses.map((analysis) => (
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
                        <p className="text-xs font-semibold text-primary">
                          {analysis.company_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: ro })}
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Detalii analiză */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalii Analiză Demo</CardTitle>
                {selectedAnalysis && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(selectedAnalysis)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedAnalysis ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{selectedAnalysis.company_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedAnalysis.created_at), 'dd MMMM yyyy', { locale: ro })}
                      </p>
                    </div>

                    {/* KPIs Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Cifra de Afaceri</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(selectedAnalysis.metadata.ca)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Profit Net</p>
                        <p className={`text-2xl font-bold ${selectedAnalysis.metadata.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(selectedAnalysis.metadata.profit)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">EBITDA</p>
                        <p className={`text-2xl font-bold ${selectedAnalysis.metadata.ebitda >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(selectedAnalysis.metadata.ebitda)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Marja Profit</p>
                        <p className="text-2xl font-bold">
                          {selectedAnalysis.metadata.profit_margin.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Analysis Text */}
                    <div>
                      <h4 className="font-semibold mb-3">Analiză Completă:</h4>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                          {selectedAnalysis.analysis_text}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Selectează o analiză pentru a vedea detaliile
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* CTA Footer */}
      <Card className="mt-12 border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Îți place ce vezi?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Acesta este doar un demo. Creează cont gratuit pentru a analiza propriile tale balanțe financiare, 
            cu toate funcționalitățile active: chat AI, voice interface, export PDF, și multe altele!
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              <Shield className="mr-2 h-5 w-5" />
              Începe Gratuit Acum
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/landing')}>
              <ArrowLeft className="mr-2 h-5 w-5" />
              Înapoi la Landing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};