import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  MessageSquare, 
  Mic, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Star,
  Clock,
  Shield,
  Sparkles,
  Database,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Users,
  Building2,
  Check,
  Gift
} from 'lucide-react';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { AIPredictions } from '@/components/AIPredictions';
import { formatCurrency } from '@/utils/analysisParser';

export const Landing = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [demoAnalyses, setDemoAnalyses] = useState<any[]>([]);

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "AI Conversațional",
      description: "Vorbește direct cu Yana - primești răspunsuri instant, nu PDF-uri de 35 pagini"
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice Interface",
      description: "Prima analiză financiară cu care VORBEȘTI vocal - unic pe piața RO"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Răspunsuri <2 secunde",
      description: "Nu mai aștepți procesarea - întrebări și răspunsuri în timp real"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Dashboard Live",
      description: "Vizualizări interactive, nu rapoarte statice"
    }
  ];

  const loadDemoData = () => {
    const demos = [
      {
        id: 'demo-1',
        company_name: 'SC DEMO CONSTRUCT SRL',
        file_name: 'Balanta_Ianuarie_2025.xlsx',
        created_at: new Date('2025-01-31').toISOString(),
        analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/01/2025 - 31/01/2025`,
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
        id: 'demo-2',
        company_name: 'SC DEMO CONSTRUCT SRL',
        file_name: 'Balanta_Februarie_2025.xlsx',
        created_at: new Date('2025-02-28').toISOString(),
        analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/02/2025 - 28/02/2025`,
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
        id: 'demo-3',
        company_name: 'SC DEMO CONSTRUCT SRL',
        file_name: 'Balanta_Martie_2025.xlsx',
        created_at: new Date('2025-03-31').toISOString(),
        analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/03/2025 - 31/03/2025`,
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
        id: 'demo-4',
        company_name: 'SC DEMO CONSTRUCT SRL',
        file_name: 'Balanta_Aprilie_2025.xlsx',
        created_at: new Date('2025-04-30').toISOString(),
        analysis_text: `Analiză Financiară - SC DEMO CONSTRUCT SRL
Perioada: 01/04/2025 - 30/04/2025`,
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
    
    setDemoAnalyses(demos);
    setShowDemo(true);
    
    // Scroll to demo section
    setTimeout(() => {
      document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const comparison = [
    {
      feature: "AI Conversațional",
      yana: true,
      competitor: false
    },
    {
      feature: "Voice Interface",
      yana: true,
      competitor: false
    },
    {
      feature: "Răspunsuri instant (<2s)",
      yana: true,
      competitor: false
    },
    {
      feature: "Design modern",
      yana: true,
      competitor: false
    },
    {
      feature: "Învățare automată",
      yana: true,
      competitor: false
    },
    {
      feature: "Export PDF",
      yana: true,
      competitor: true
    },
    {
      feature: "Rapoarte",
      yana: true,
      competitor: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4 animate-in fade-in slide-in-from-top-4" variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-ul financiar care înțelege România
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          YANA - Analiza Balanței
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
          AI-ul care înțelege balanța ta mai bine decât contabilul.<br />
          <span className="font-semibold text-foreground">Vorbești</span>, nu citești PDF-uri.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/auth')}
          >
            Începe Gratuit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="text-lg px-8 py-6"
            onClick={() => navigate('/demo')}
          >
            <Database className="mr-2 h-5 w-5" />
            Vezi Demo Interactiv
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => navigate('/auth')}
          >
            Autentificare
          </Button>
        </div>
      </section>

      {/* Demo Section */}
      {showDemo && (
        <section id="demo-section" className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl mb-20">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                📊 Demo Interactiv - SC DEMO CONSTRUCT SRL
              </h2>
              <p className="text-muted-foreground">
                Explorează funcționalitățile YANA cu date demo reale. Fără autentificare necesară!
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowDemo(false)}>
              Închide Demo
            </Button>
          </div>

          {/* KPIs Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cifra de Afaceri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{formatCurrency(demoAnalyses[demoAnalyses.length - 1]?.metadata?.ca || 0)}</p>
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Aprilie 2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Net</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-bold ${(demoAnalyses[demoAnalyses.length - 1]?.metadata?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(demoAnalyses[demoAnalyses.length - 1]?.metadata?.profit || 0)}
                  </p>
                  {(demoAnalyses[demoAnalyses.length - 1]?.metadata?.profit || 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Marja: {demoAnalyses[demoAnalyses.length - 1]?.metadata?.profit_margin?.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">DSO (Zile Încasări)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{demoAnalyses[demoAnalyses.length - 1]?.metadata?.dso || 0}</p>
                  <AlertCircle className={`h-5 w-5 ${(demoAnalyses[demoAnalyses.length - 1]?.metadata?.dso || 0) > 60 ? 'text-destructive' : 'text-success'}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(demoAnalyses[demoAnalyses.length - 1]?.metadata?.dso || 0) > 60 ? '⚠️ Ridicat' : '✅ Normal'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cash Flow Cycle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{demoAnalyses[demoAnalyses.length - 1]?.metadata?.cashConversionCycle || 0}</p>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">zile</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="mb-8">
            <AnalyticsCharts analyses={demoAnalyses} />
          </div>

          {/* AI Predictions */}
          <div>
            <AIPredictions analyses={demoAnalyses} />
          </div>

          {/* CTA after demo */}
          <div className="mt-12 text-center p-8 bg-primary/5 rounded-2xl border-2 border-primary/20">
            <h3 className="text-2xl font-bold mb-4">Vrei să analizezi propriile tale balanțe?</h3>
            <p className="text-muted-foreground mb-6">Creează cont gratuit și începe să încarci balanțele tale în doar 30 de secunde.</p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              <Shield className="mr-2 h-5 w-5" />
              Începe Gratuit Acum
            </Button>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          De ce Yana e diferită?
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card 
              key={idx} 
              className="hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-muted/30 to-background rounded-3xl">
        <div className="text-center mb-4">
          <Badge className="mb-4" variant="secondary">
            <Gift className="h-3 w-3 mr-1" />
            Primele 3 luni GRATUIT
          </Badge>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Alege planul potrivit pentru afacerea ta
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Începi gratuit pentru 3 luni. Fără card necesar. Fără angajamente.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Plan Antreprenor */}
          <Card className="relative hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-8 pt-8">
              <div className="h-16 w-16 mx-auto mb-4 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-2xl mb-2">Plan Antreprenor</CardTitle>
              <p className="text-muted-foreground text-sm">Perfect pentru afaceri mici și mijlocii</p>
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">49</span>
                  <span className="text-2xl font-semibold">RON</span>
                  <span className="text-muted-foreground">/lună</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ~12 EUR/lună
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Analiză AI nelimitată a balanței</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Chat AI conversațional</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Voice Interface (10 min/lună)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Dashboard & Analytics live</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Predicții AI & Alerte proactive</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Export PDF nelimitat</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Suport email prioritar</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={() => navigate('/auth')}
              >
                Începe gratuit 3 luni
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Storage inclus: 1GB • După trial: 49 RON/lună
              </p>
            </CardContent>
          </Card>

          {/* Plan Contabil */}
          <Card className="relative hover:shadow-2xl transition-all duration-300 border-2 border-primary bg-gradient-to-b from-primary/5 to-background">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-6 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-8 pt-8">
              <div className="h-16 w-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl mb-2">Plan Contabil</CardTitle>
              <p className="text-muted-foreground text-sm">Pentru firme de contabilitate cu clienți</p>
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">199</span>
                  <span className="text-2xl font-semibold">RON</span>
                  <span className="text-muted-foreground">/lună</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ~47 EUR/lună
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-semibold">Toate din planul Antreprenor, plus:</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">CRM complet pentru clienți</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Management documente & facturi</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Calendar termene fiscale</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Task management & colaborare</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Email marketing integrat</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Branding personalizat</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Clienți nelimitați</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Începe gratuit 3 luni
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Storage inclus: 5GB • După trial: 199 RON/lună
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Costuri Suplimentare */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-center mb-4">💡 Costuri suplimentare transparente</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-medium">Storage extra:</span>
                    <span className="text-muted-foreground">~0.09 RON/GB/lună</span>
                  </p>
                  <p className="text-xs text-muted-foreground ml-6">
                    Pentru documentele clienților (balanțe, facturi, contracte)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium">Email-uri:</span>
                    <span className="text-muted-foreground">3,000 gratis/lună</span>
                  </p>
                  <p className="text-xs text-muted-foreground ml-6">
                    Apoi ~0.40 RON/1000 email-uri (pentru rapoarte automate)
                  </p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Pentru majoritatea utilizatorilor, costurile suplimentare sunt <span className="font-semibold text-foreground">0-10 RON/lună</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8">
          🎁 Fără card necesar pentru trial • Anulare oricând • Suport în limba română
        </p>
      </section>

      {/* Comparison Table */}
      <section className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Yana vs Competiția
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          Comparație obiectivă cu soluțiile tradiționale de analiză financiară
        </p>

        <div className="max-w-4xl mx-auto bg-background rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-4 text-left font-semibold">Caracteristică</th>
                <th className="p-4 text-center font-semibold">Yana</th>
                <th className="p-4 text-center font-semibold">Altele</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/10' : ''}>
                  <td className="p-4 font-medium">{item.feature}</td>
                  <td className="p-4 text-center">
                    {item.yana ? (
                      <CheckCircle className="h-6 w-6 text-success mx-auto" />
                    ) : (
                      <XCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {item.competitor ? (
                      <CheckCircle className="h-6 w-6 text-success mx-auto" />
                    ) : (
                      <XCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8">
          <p className="text-xl font-semibold text-primary">
            Ai nevoie de rapoarte sau conversații?
          </p>
          <p className="text-muted-foreground mt-2">
            Soluțiile tradiționale îți dau sute de pagini de citit. Yana îți dă răspunsuri în 2 secunde.
          </p>
        </div>
      </section>

      {/* Testimonials - Recenzii Google */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Ce spun utilizatorii?
        </h2>
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="flex gap-1 text-yellow-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 fill-current" />
            ))}
          </div>
          <span className="text-2xl font-bold">5/5</span>
          <span className="text-muted-foreground">pe</span>
          <svg className="h-6 w-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-semibold">Google</span>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1 text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Atunci când auzeam de contabilitate, totul se năruia pentru mine, ca patron de firmă la început de drum. Mereu credeam că am prea multe acte de completat și că..."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  M
                </div>
                <div>
                  <p className="font-semibold text-sm">Manuela P</p>
                  <p className="text-xs text-muted-foreground">Recenzie Google • acum 3 ani</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1 text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Nir-uri, facturi și multe alte documente contabile - pentru mine erau o adevărată bătaie de cap și simțeam că mă pierd în ele. De când am descoperit aplicația..."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  O
                </div>
                <div>
                  <p className="font-semibold text-sm">olariu</p>
                  <p className="text-xs text-muted-foreground">Recenzie Google • acum 3 ani</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1 text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Am peste 30 de ani experiență în domeniul HoReCa iar mediul digital și contabilitatea au reprezentat și încă reprezintă foarte mari probleme pentru mine. De..."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  R
                </div>
                <div>
                  <p className="font-semibold text-sm">Ramona Sandu</p>
                  <p className="text-xs text-muted-foreground">Recenzie Google • acum 3 ani</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">100% Gratuit</span> în schimbul recenziilor tale oneste
          </p>
        </div>
      </section>


      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Gata să vorbești cu Yana?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Nu mai pierde timpul citind PDF-uri. Întreabă direct și primește răspunsuri instant.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
            <Shield className="mr-2 h-5 w-5" />
            Începe Gratuit
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          100% Gratuit • Suport în română
        </p>
      </section>
    </div>
  );
};
