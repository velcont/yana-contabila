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
  Gift,
  Brain
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
          YANA – AI-ul care analizează balanțe și dezvoltă afaceri
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
          Analiză balanță AI + Consultant strategic pentru afacerea ta.<br />
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

      {/* Două Module - Clarificare */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-background to-muted/30 rounded-3xl mb-20">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Două instrumente puternice într-o singură platformă
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cum funcționează YANA?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            YANA îți oferă două module complementare pentru afacerea ta. Alege ce ai nevoie acum.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Modul 1: Analiză Balanță */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-500">
            <CardHeader className="text-center pb-6">
              <div className="h-16 w-16 mx-auto mb-4 bg-blue-500/10 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-2xl mb-2">📊 Modul 1: Analiză Balanță</CardTitle>
              <p className="text-muted-foreground text-sm">
                Pentru înțelegerea zilnică a situației financiare
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="font-semibold mb-2">📁 Ce faci aici:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✅ Încarci balanța de verificare (.xlsx)</li>
                  <li>✅ Primești analiză AI instant (&lt;2 secunde)</li>
                  <li>✅ Vezi dashboard interactiv cu grafice</li>
                  <li>✅ Întrebi AI despre orice din balanță (chat)</li>
                  <li>✅ Obții alerte proactive (DSO ridicat, profit negativ, etc.)</li>
                </ul>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">
                  💡 Perfect pentru: Monitorizare zilnică, rapoarte lunare, decizii rapide
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modul 2: Yana Strategică */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary bg-gradient-to-b from-primary/5 to-background">
            <CardHeader className="text-center pb-6">
              <div className="h-16 w-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-2">🧠 Modul 2: Yana Strategică</CardTitle>
              <Badge variant="secondary" className="mb-2">
                👔 Exclusiv pentru modul Antreprenor
              </Badge>
              <p className="text-muted-foreground text-sm">
                Consultant AI strategic pentru decizii de business
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="font-semibold mb-2">🎯 Ce faci aici:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✅ Discuți strategii de business (fără upload)</li>
                  <li>✅ Primești sfaturi bazate pe Teoria Jocului</li>
                  <li>✅ Analizezi competiția și piața</li>
                  <li>✅ Planifici expansiuni sau reduceri de costuri</li>
                  <li>✅ Primești scenarii "Ce ar fi dacă...?"</li>
                </ul>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">
                  💡 Perfect pentru: Strategii pe termen lung, decizii majore, planificare
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center p-6 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground">
            <strong>Notă:</strong> Modulul 1 este disponibil pentru toate tipurile de conturi. Modulul 2 (Yana Strategică) este disponibil exclusiv pentru conturile de tip Antreprenor.
          </p>
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
                Începe gratuit 30 zile
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
                Începe gratuit 30 zile
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

      {/* AI Credits Pricing Section - NEW */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              Politică de Tarife AI - 100% Transparent
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cum funcționează creditele AI?
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
              Abonamentul include <span className="font-semibold text-foreground">analiză AI nelimitată</span>. 
              Creditele suplimentare sunt doar pentru funcții avansate AI (predicții, consilier strategic).
            </p>
          </div>

          {/* Detailed Feature Explanations - NEW */}
          <Card className="mb-8 border-2 border-success/30 bg-success/5">
            <CardHeader>
              <CardTitle className="text-center text-xl">
                🔍 Ce înseamnă exact fiecare funcție?
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Explicații clare pentru fiecare feature AI din platformă
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Analiza Balantei */}
                <div className="p-5 bg-success/10 rounded-lg border-2 border-success/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Analiză Balanță
                        <Badge variant="outline" className="bg-success text-success-foreground">NELIMITAT</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">
                        Ce face: Procesează fișierul Excel al balanței tale și extrage automat toți indicatorii financiari
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Calculează automat: DSO, DPO, DIO, marja profit, EBITDA, etc.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Identifică probleme evidente (ex: "Cheltuieli &gt; Venituri")</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Afișează dashboard-ul cu grafice și KPI-uri</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Exportă PDF cu analiza completă</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-background/50 rounded border">
                    <p className="text-xs font-semibold text-success">✅ INCLUS ÎN ABONAMENT - Poți analiza 1000 de balanțe/lună fără cost suplimentar!</p>
                  </div>
                </div>

                {/* Chat AI */}
                <div className="p-5 bg-success/10 rounded-lg border-2 border-success/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Chat AI Conversațional
                        <Badge variant="outline" className="bg-success text-success-foreground">NELIMITAT</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">
                        Ce face: Răspunde la întrebări simple despre balanța pe care ai uploadat-o
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Ex: "Cât este DSO-ul meu în martie?" → Răspuns instant din datele tale</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Ex: "Am profit sau pierdere?" → Analiza datelor existente</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>Ex: "Cum a evoluat profitul meu în ultimele 3 luni?" → Comparație simplă</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-background/50 rounded border">
                    <p className="text-xs font-semibold text-success">✅ INCLUS ÎN ABONAMENT - Întrebări nelimitate despre balanțele tale uploadate!</p>
                  </div>
                </div>

                {/* Predictii AI */}
                <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Predicții AI Avansate
                        <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">~100 credite</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">
                        Ce face: AI-ul analizează ISTORIC (min. 3 luni) și generează previziuni automate pe viitor (3-6 luni)
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <span>Prevede profitul probabil pentru lunile următoare</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <span>Identifică tendințe ascunse (ex: "DSO-ul crește cu 5 zile/lună")</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <span>Alertează asupra riscurilor viitoare (ex: "Cash flow negativ în 2 luni")</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <span>Machine learning pe datele tale istorice</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-300 dark:border-orange-700">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                      ⚡ NECESITĂ CREDITE AI - Procesare complexă cu modele AI avansate (~100 credite = 1 leu/predicție)
                    </p>
                  </div>
                  <div className="mt-2 p-3 bg-background rounded border">
                    <p className="text-xs">
                      <span className="font-semibold">Diferența față de analiza simplă:</span> Analiza balanței = "Cum arată acum?". Predicțiile = "Cum va arăta în viitor?"
                    </p>
                  </div>
                </div>

                {/* Consilier Strategic */}
                <div className="p-5 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Consilier Strategic AI
                        <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">~150 credite</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">
                        Ce face: Consultant AI virtual care analizează în profunzime situația ta și oferă strategii personalizate
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>Analiză complexă cross-factorială (combinații între toți indicatorii)</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>Recomandări acționabile concrete (ex: "Renegociază termenele cu furnizorii X, Y, Z")</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>Strategii de optimizare cash-flow personalizate pe contextul tău</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>Scenarii "what-if" (ex: "Ce se întâmplă dacă reduc DSO cu 20 zile?")</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>Plan de acțiune detaliat pe 30-60-90 zile</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300 dark:border-purple-700">
                    <p className="text-xs font-semibold text-purple-800 dark:text-purple-200">
                      ⚡ NECESITĂ CREDITE AI - Analiză aprofundată cu modele GPT-4 avansate (~150 credite = 1.5 lei/sesiune)
                    </p>
                  </div>
                  <div className="mt-2 p-3 bg-background rounded border">
                    <p className="text-xs">
                      <span className="font-semibold">Diferența față de chat-ul simplu:</span> Chat AI = "Întrebări rapide despre ce vezi". Consilier Strategic = "Consultant AI care îți face plan complet de optimizare"
                    </p>
                  </div>
                </div>

                {/* Comparatii Multi-Companie */}
                <div className="p-5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Comparații Multi-Companie
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">~80 credite</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">
                        Ce face: Benchmarking automat - compară mai multe companii între ele și generează raport comparativ
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Identifică care companie performează cel mai bine la fiecare indicator</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Analiză competitivă pentru firme de contabilitate cu 10+ clienți</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Rapoarte executive pentru prezentări către parteneri</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                      ⚡ NECESITĂ CREDITE AI - Procesare paralelă a mai multor companii (~80 credite = 0.8 lei/comparație)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Included in Subscription - Simplified */}
          <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Check className="h-6 w-6 text-success" />
                Rezumat: Ce plătești în abonament vs. Credite AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-success/10 rounded-lg border-2 border-success/20">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    INCLUS în abonament (NELIMITAT)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>✅ Analiză completă balanță (upload + indicatori)</p>
                    <p>✅ Chat AI cu întrebări simple</p>
                    <p>✅ Dashboard & grafice</p>
                    <p>✅ Export PDF</p>
                    <p>✅ Alerte automate (probleme evidente)</p>
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Cu credite AI suplimentare
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>⚡ Predicții AI pe 3-6 luni (~100 credite)</p>
                    <p>⚡ Consilier Strategic AI (~150 credite)</p>
                    <p>⚡ Comparații multi-companie (~80 credite)</p>
                    <p className="text-xs text-muted-foreground pt-2">
                      1000 credite = 10 lei (nu expiră)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Credits Explanation */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Când ai nevoie de credite AI?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <div>
                    <p className="font-semibold">Predicții AI avansate</p>
                    <p className="text-muted-foreground">Previziuni automate pe 3-6 luni (~100 credite/predicție)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <div>
                    <p className="font-semibold">Consilier Strategic AI</p>
                    <p className="text-muted-foreground">Analiză aprofundată cu recomandări personalizate (~150 credite/sesiune)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <div>
                    <p className="font-semibold">Comparații multi-companie</p>
                    <p className="text-muted-foreground">Benchmarking automat cu competitori (~80 credite/comparație)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Exemple practice de cost
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Utilizare ușoară (10-20 clienți)</p>
                  <p className="text-muted-foreground">~5-10 predicții/lună = 1000 credite = <span className="font-semibold text-foreground">10 lei/lună</span></p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Utilizare medie (30-50 clienți)</p>
                  <p className="text-muted-foreground">~15-25 analize avansate = 2500 credite = <span className="font-semibold text-foreground">20 lei/lună</span></p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-1">Utilizare intensă (100+ clienți)</p>
                  <p className="text-muted-foreground">~50+ sesiuni consilier = 5000-10000 credite = <span className="font-semibold text-foreground">40-70 lei/lună</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Credits Packages */}
          <h3 className="text-2xl font-bold text-center mb-6">Pachete Credite AI Suplimentare</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="text-center hover:shadow-lg transition-all hover:border-primary">
              <CardContent className="pt-6">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold mb-1">10 lei</p>
                <p className="text-sm text-muted-foreground mb-3">1,000 credite</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>~10 predicții AI</p>
                  <p>sau ~6 sesiuni consilier</p>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all hover:border-primary border-2 border-primary bg-primary/5">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Popular</Badge>
              </div>
              <CardContent className="pt-6">
                <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold mb-1">20 lei</p>
                <p className="text-sm text-muted-foreground mb-3">2,500 credite</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>~25 predicții AI</p>
                  <p>sau ~16 sesiuni consilier</p>
                  <p className="text-success font-semibold">Economie: 20%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all hover:border-primary">
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold mb-1">40 lei</p>
                <p className="text-sm text-muted-foreground mb-3">5,000 credite</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>~50 predicții AI</p>
                  <p>sau ~33 sesiuni consilier</p>
                  <p className="text-success font-semibold">Economie: 25%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all hover:border-primary">
              <CardContent className="pt-6">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold mb-1">70 lei</p>
                <p className="text-sm text-muted-foreground mb-3">10,000 credite</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>~100 predicții AI</p>
                  <p>sau ~66 sesiuni consilier</p>
                  <p className="text-success font-semibold">Economie: 30%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transparency Guarantees */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <Shield className="h-6 w-6" />
                Garanții de Transparență
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold mb-1">Fără surprize</p>
                  <p className="text-muted-foreground">Vezi consumul exact în timp real în dashboard</p>
                </div>
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold mb-1">Control total</p>
                  <p className="text-muted-foreground">Setezi limite de buget și primești alerte la 80%</p>
                </div>
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold mb-1">Fără expirare</p>
                  <p className="text-muted-foreground">Creditele rămân valabile până le folosești</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center space-y-4">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">💡 Sfat:</span> Majoritatea utilizatorilor cheltuie <span className="font-semibold text-foreground">0-20 lei/lună</span> pe credite AI suplimentare
            </p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              Începe cu 3 luni gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
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
