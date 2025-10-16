import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Truck, UtensilsCrossed, Code, Factory, ShoppingBag, Building2, Crown, BarChart3, AlertTriangle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import CompareAnalyses from '@/components/CompareAnalyses';
import { AIPredictions } from '@/components/AIPredictions';
import { ResilienceAnalysis } from '@/components/ResilienceAnalysis';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

// Demo data pentru industrie: TRANSPORT
const transportDemos = [
  {
    id: 'transport-1',
    company_name: 'SC RAPID TRANS SRL',
    file_name: 'Balanta_Ianuarie_2025.xlsx',
    created_at: new Date('2025-01-31').toISOString(),
    analysis_text: `Analiză Financiară - SC RAPID TRANS SRL (Transport Rutier Internațional)
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 680,000 RON
- Cheltuieli totale: 595,000 RON (87.5%)
- Profit net: 85,000 RON
- EBITDA: 115,000 RON
- Marja profitului: 12.5%

SITUAȚIA TREZORERIEI:
- Sold bancă: 245,000 RON
- Sold casă: 5,200 RON
- Creanțe clienți: 420,000 RON
- Datorii furnizori: 180,000 RON (diesel, piese)

INDICATORI OPERAȚIONALI:
- DSO: 62 zile (specific transport - contracte pe termen lung)
- DPO: 35 zile
- Flotă: 12 camioane active
- Cost diesel/lună: 185,000 RON (31% din cheltuieli)
- Cost șoferi: 145,000 RON (24% din cheltuieli)

OBSERVAȚII SPECIFICE TRANSPORT:
✅ Marje sănătoase pentru industrie (10-15% normal)
✅ Flotă complet utilizată - 98% timp activ
⚠️ Dependență mare pe prețul diesel-ului
💡 Consideră contracte cu clauză de ajustare preț diesel`,
    metadata: {
      ca: 680000,
      cheltuieli: 595000,
      profit: 85000,
      ebitda: 115000,
      profit_margin: 12.5,
      soldBanca: 245000,
      soldCasa: 5200,
      clienti: 420000,
      furnizori: 180000,
      dso: 62,
      dpo: 35
    }
  },
  {
    id: 'transport-2',
    company_name: 'SC RAPID TRANS SRL',
    file_name: 'Balanta_Februarie_2025.xlsx',
    created_at: new Date('2025-02-28').toISOString(),
    analysis_text: `Analiză Financiară - SC RAPID TRANS SRL
Perioada: 01/02/2025 - 28/02/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 550,000 RON (↓19%)
- Cheltuieli totale: 520,000 RON
- Profit net: 30,000 RON (↓65% 🔴)
- EBITDA: 52,000 RON
- Marja profitului: 5.45%

SITUAȚIA TREZORERIEI:
- Sold bancă: 195,000 RON (↓50k)
- Sold casă: 4,800 RON
- Creanțe clienți: 485,000 RON (↑65k)
- Datorii furnizori: 210,000 RON

INDICATORI OPERAȚIONALI:
- DSO: 78 zile (↑16 zile 🔴)
- DPO: 38 zile
- Cost diesel/lună: 195,000 RON (↑5.4% prețul/litru)
- Rute internaționale în scădere (30% vs 45% în ianuarie)

PROBLEME IDENTIFICATE:
🔴 Scădere semnificativă profit din cauza:
   • Creștere preț diesel fără ajustare tarife
   • Scădere comenzi internaționale (marje mai mari)
   • Creștere DSO - clienți întârzie

RECOMANDĂRI URGENTE:
1. Renegociază tarifele pentru creșterea diesel
2. Caută contracte noi pe rute internaționale
3. Accelerează recuperarea creanțelor`,
    metadata: {
      ca: 550000,
      cheltuieli: 520000,
      profit: 30000,
      ebitda: 52000,
      profit_margin: 5.45,
      soldBanca: 195000,
      soldCasa: 4800,
      clienti: 485000,
      furnizori: 210000,
      dso: 78,
      dpo: 38
    }
  }
];

// Demo data pentru industrie: ALIMENTARĂ (Restaurant)
const alimentaraDemos = [
  {
    id: 'restaurant-1',
    company_name: 'SC GUSTURI URBANE SRL',
    file_name: 'Balanta_Ianuarie_2025.xlsx',
    created_at: new Date('2025-01-31').toISOString(),
    analysis_text: `Analiză Financiară - SC GUSTURI URBANE SRL (Restaurant Fine Dining)
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 185,000 RON
- Cheltuieli totale: 158,000 RON (85.4%)
- Profit net: 27,000 RON
- EBITDA: 35,000 RON
- Marja profitului: 14.59%

SITUAȚIA TREZORERIEI:
- Sold bancă: 45,000 RON
- Sold casă: 28,000 RON (↑ mulți clienți plătesc cash)
- Creanțe clienți: 12,000 RON (evenimente corporate)
- Datorii furnizori: 48,000 RON (produse proaspete)

INDICATORI OPERAȚIONALI:
- DSO: 5 zile (majoritatea vânzări cash/card)
- DPO: 22 zile (furnizori alimentari plătiți prompt)
- Cost materii prime: 52,000 RON (28% din CA - target industry 25-30%)
- Cost personal: 75,000 RON (40.5% din CA)
- Chirii: 18,000 RON/lună

OBSERVAȚII SPECIFICE HORECA:
✅ Marje excelente pentru fine dining (10-15% normal)
✅ Cash flow bun - majoritatea încasări imediate
✅ Cost materii prime sub control
⚠️ Cost personal ridicat dar justificat de calitate
💡 Sezonul favorabil - ianuarie activ după sărbători`,
    metadata: {
      ca: 185000,
      cheltuieli: 158000,
      profit: 27000,
      ebitda: 35000,
      profit_margin: 14.59,
      soldBanca: 45000,
      soldCasa: 28000,
      clienti: 12000,
      furnizori: 48000,
      dso: 5,
      dpo: 22
    }
  },
  {
    id: 'restaurant-2',
    company_name: 'SC GUSTURI URBANE SRL',
    file_name: 'Balanta_Februarie_2025.xlsx',
    created_at: new Date('2025-02-28').toISOString(),
    analysis_text: `Analiză Financiară - SC GUSTURI URBANE SRL
Perioada: 01/02/2025 - 28/02/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 165,000 RON (↓11% sezon slab)
- Cheltuieli totale: 154,000 RON
- Profit net: 11,000 RON (↓59% 🔴)
- EBITDA: 18,000 RON
- Marja profitului: 6.67%

SITUAȚIA TREZORERIEI:
- Sold bancă: 38,000 RON
- Sold casă: 25,000 RON
- Creanțe clienți: 8,000 RON
- Datorii furnizori: 52,000 RON

PROBLEME FEBRUARIE:
🔴 Scădere trafic client (februarie lună slabă după sărbători)
⚠️ Cheltuieli fixe (chirie, salarii) rămân constante
⚠️ Marja profitului comprimată la 6.67%

OBSERVAȚII:
- Februarie lună tradițional slabă în HORECA România
- Cheltuielile fixe (93k) consumă 56% din venit
- Cost materii prime optimizat: 46k (27.9%)

RECOMANDĂRI:
1. Promovează eveniment Dragobete/Valentine
2. Lansează meniu lunar special pt fidelizare
3. Construiește rezervă cash pt lunile slabe (martie-aprilie)`,
    metadata: {
      ca: 165000,
      cheltuieli: 154000,
      profit: 11000,
      ebitda: 18000,
      profit_margin: 6.67,
      soldBanca: 38000,
      soldCasa: 25000,
      clienti: 8000,
      furnizori: 52000,
      dso: 5,
      dpo: 22
    }
  }
];

// Demo data pentru industrie: SERVICII IT
const itDemos = [
  {
    id: 'it-1',
    company_name: 'SC DIGITAL SOLUTIONS SRL',
    file_name: 'Balanta_Ianuarie_2025.xlsx',
    created_at: new Date('2025-01-31').toISOString(),
    analysis_text: `Analiză Financiară - SC DIGITAL SOLUTIONS SRL (Dezvoltare Software)
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 420,000 RON
- Cheltuieli totale: 298,000 RON (71%)
- Profit net: 122,000 RON
- EBITDA: 135,000 RON
- Marja profitului: 29.05% 🌟

SITUAȚIA TREZORERIEI:
- Sold bancă: 385,000 RON (↑ rezerve solide)
- Sold casă: 1,500 RON
- Creanțe clienți: 280,000 RON (contracte în derulare)
- Datorii furnizori: 25,000 RON (licențe software, AWS)

INDICATORI OPERAȚIONALI:
- DSO: 65 zile (specific IT - plăți milestone-uri)
- DPO: 18 zile (subscripții cloud, salarii)
- Echipă: 8 developeri + 2 manageri
- Cost salarii: 245,000 RON (58% din CA - normal IT)
- Proiecte active: 5 clienți (3 România, 2 extern)

OBSERVAȚII SPECIFICE IT:
✅ Marje excelente 29% (industria: 20-35%)
✅ Model scalabil - creștere fără investiții mari
✅ Clienți internaționali (50% din venit)
✅ Rezerve cash solide pentru oportunități
💡 Moment favorabil pentru angajări strategice`,
    metadata: {
      ca: 420000,
      cheltuieli: 298000,
      profit: 122000,
      ebitda: 135000,
      profit_margin: 29.05,
      soldBanca: 385000,
      soldCasa: 1500,
      clienti: 280000,
      furnizori: 25000,
      dso: 65,
      dpo: 18
    }
  }
];

// Demo data pentru industrie: PRODUCȚIE
const productieDemos = [
  {
    id: 'productie-1',
    company_name: 'SC MOBILIER ELEGANT SRL',
    file_name: 'Balanta_Ianuarie_2025.xlsx',
    created_at: new Date('2025-01-31').toISOString(),
    analysis_text: `Analiză Financiară - SC MOBILIER ELEGANT SRL (Fabrică Mobilă)
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 325,000 RON
- Cheltuieli totale: 285,000 RON (87.7%)
- Profit net: 40,000 RON
- EBITDA: 58,000 RON
- Marja profitului: 12.31%

SITUAȚIA TREZORERIEI:
- Sold bancă: 95,000 RON
- Sold casă: 3,500 RON
- Stocuri materii prime: 145,000 RON (↑ lemn, PAL, accesorii)
- Stocuri produse finite: 68,000 RON
- Creanțe clienți: 185,000 RON (mobilier la comandă)
- Datorii furnizori: 125,000 RON

INDICATORI OPERAȚIONALI:
- DSO: 58 zile (comenzi la comandă cu avans)
- DPO: 42 zile
- DIO: 38 zile (ciclu producție 3-5 săptămâni)
- Cost materii prime: 125,000 RON (38.5% din CA)
- Cost forță muncă: 98,000 RON (30% din CA)

OBSERVAȚII SPECIFICE PRODUCȚIE:
✅ Marje acceptabile pentru mobilier la comandă
✅ Stocuri bine gestionate
⚠️ Capital de lucru legat în stocuri și creanțe
💡 Ianuarie bun - comenzi de după sărbători`,
    metadata: {
      ca: 325000,
      cheltuieli: 285000,
      profit: 40000,
      ebitda: 58000,
      profit_margin: 12.31,
      soldBanca: 95000,
      soldCasa: 3500,
      clienti: 185000,
      furnizori: 125000,
      dso: 58,
      dpo: 42,
      dio: 38
    }
  }
];

// Demo data pentru industrie: COMERȚ
const comertDemos = [
  {
    id: 'comert-1',
    company_name: 'SC FASHION BOUTIQUE SRL',
    file_name: 'Balanta_Ianuarie_2025.xlsx',
    created_at: new Date('2025-01-31').toISOString(),
    analysis_text: `Analiză Financiară - SC FASHION BOUTIQUE SRL (Retail Îmbrăcăminte)
Perioada: 01/01/2025 - 31/01/2025

INDICATORI CHEIE:
- Cifra de afaceri (CA): 158,000 RON
- Cheltuieli totale: 132,000 RON (83.5%)
- Profit net: 26,000 RON
- EBITDA: 34,000 RON
- Marja profitului: 16.46%

SITUAȚIA TREZORERIEI:
- Sold bancă: 48,000 RON
- Sold casă: 12,500 RON (mulți clienți cash)
- Stocuri mărfuri: 185,000 RON (colecție iarnă + primăvară)
- Creanțe clienți: 8,000 RON (foarte puține - retail)
- Datorii furnizori: 95,000 RON (furnizori textile)

INDICATORI OPERAȚIONALI:
- DSO: 3 zile (majoritatea vânzări imediate)
- DPO: 48 zile (credit furnizori textile)
- DIO: 92 zile (stocuri 3 luni - normal fashion)
- Rotație stoc: 4x/an
- Markup mediu: 2.8x (180% adaos comercial)

OBSERVAȚII SPECIFICE RETAIL:
✅ Ianuarie excelent - lichidări + sold-uri după sărbători
✅ Marje foarte bune 16.5% (industria: 8-15%)
✅ Cash flow solid din vânzări directe
⚠️ Capital mare blocat în stocuri (185k)
💡 Atenție la stocuri vechi - depreciază rapid în fashion`,
    metadata: {
      ca: 158000,
      cheltuieli: 132000,
      profit: 26000,
      ebitda: 34000,
      profit_margin: 16.46,
      soldBanca: 48000,
      soldCasa: 12500,
      clienti: 8000,
      furnizori: 95000,
      dso: 3,
      dpo: 48,
      dio: 92
    }
  }
];

const industries = [
  { id: 'transport', name: 'Transport Rutier', icon: Truck, data: transportDemos, color: 'blue' },
  { id: 'alimentara', name: 'Restaurant / HORECA', icon: UtensilsCrossed, data: alimentaraDemos, color: 'orange' },
  { id: 'it', name: 'Servicii IT / Software', icon: Code, data: itDemos, color: 'purple' },
  { id: 'productie', name: 'Producție / Fabricație', icon: Factory, data: productieDemos, color: 'green' },
  { id: 'comert', name: 'Comerț / Retail', icon: ShoppingBag, data: comertDemos, color: 'pink' },
];

export const IndustryDemos = () => {
  const [selectedIndustry, setSelectedIndustry] = useState(industries[0]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(selectedIndustry.data[0]);
  const { toast } = useToast();
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();

  // Redirect non-admins
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleIndustryChange = (industry: typeof industries[0]) => {
    setSelectedIndustry(industry);
    setSelectedAnalysis(industry.data[0]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Admin-Only Banner */}
      <div className="mb-6 p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm bg-orange-500/20">
              <Crown className="h-3 w-3 mr-1" />
              ADMIN ONLY - DEMO INDUSTRIES
            </Badge>
            <p className="text-sm">
              <strong>Pagină demonstrații pentru prezentări clienți.</strong> Selectează industria pentru a vedea scenarii specifice.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/app')}>
            Înapoi la Dashboard
          </Button>
        </div>
      </div>

      {/* Industry Selector */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Selectează Industria pentru Demo:</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <Card
                key={industry.id}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  selectedIndustry.id === industry.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleIndustryChange(industry)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-12 w-12 mx-auto mb-3 text-${industry.color}-500`} />
                  <h3 className="font-semibold text-sm">{industry.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {industry.data.length} analize
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Current Industry Display */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {(() => {
                const Icon = selectedIndustry.icon;
                return <Icon className="h-6 w-6" />;
              })()}
              {selectedAnalysis.company_name}
              <Badge variant="outline">{selectedIndustry.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Date demo pentru prezentări cu clienți din industria: <strong>{selectedIndustry.name}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
          <TabsTrigger value="analysis">
            <Building2 className="h-4 w-4 mr-2" />
            Analiză Detaliată
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsCharts analyses={selectedIndustry.data} />
          <CompareAnalyses analyses={selectedIndustry.data} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerte Proactive - {selectedAnalysis.company_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedAnalysis.analysis_text}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <AIPredictions analyses={selectedIndustry.data} />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Istoric Analize</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedIndustry.data.map((analysis) => (
                  <div
                    key={analysis.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAnalysis?.id === analysis.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedAnalysis(analysis)}
                  >
                    <p className="text-xs font-semibold">
                      {format(new Date(analysis.created_at), 'MMMM yyyy', { locale: ro })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analysis.file_name}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Analiză Detaliată</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedAnalysis.created_at), "d MMMM yyyy", { locale: ro })}
                </p>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedAnalysis.analysis_text}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
