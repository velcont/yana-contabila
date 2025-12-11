import { useState, lazy, Suspense } from 'react';
import MiniFooter from '@/components/MiniFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Check,
  Gift,
  Brain,
  PlayCircle,
  Loader2
} from 'lucide-react';
import { AIPredictions } from '@/components/AIPredictions';
import { formatCurrency } from '@/utils/analysisParser';
import { StickyTrialBanner } from '@/components/StickyTrialBanner';

// Lazy load Recharts component
const AnalyticsCharts = lazy(() => import('@/components/AnalyticsCharts'));

const ChartLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showDemo, setShowDemo] = useState(false);
  const [demoAnalyses, setDemoAnalyses] = useState<any[]>([]);
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(() => {
    return localStorage.getItem('yana_mobile_banner_dismissed') === 'true';
  });

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
      <StickyTrialBanner />
      
      {/* Mobile Recommendation Banner */}
      {isMobile && !mobileBannerDismissed && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 text-center text-sm">
          <span className="text-muted-foreground">
            📱 Aplicația funcționează pe mobil, dar pentru experiență optimă recomandăm desktop/laptop.
          </span>
          <button 
            onClick={() => {
              setMobileBannerDismissed(true);
              localStorage.setItem('yana_mobile_banner_dismissed', 'true');
            }}
            className="ml-2 text-primary hover:underline"
          >
            Am înțeles
          </button>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 md:mb-6 animate-in fade-in slide-in-from-top-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            CFO-ul tău AI, la cerere
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 animate-in fade-in slide-in-from-bottom-4 leading-tight">
            Faci profit pe hârtie, dar <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">contul e gol</span>?
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-8 px-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
            Află exact de ce — în 2 secunde. Analiză strategică, nu doar cifre.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-stretch sm:items-center px-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
            <Button 
              size="lg" 
              className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => navigate('/auth')}
            >
              <Gift className="mr-2 h-5 w-5" />
              Testează gratuit 30 de zile
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 w-full sm:w-auto"
              onClick={loadDemoData}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Demo Instant
            </Button>
          </div>

          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground animate-in fade-in"
            style={{ animationDelay: '250ms' }}
            onClick={() => navigate('/auth')}
          >
            Ai deja cont? <span className="underline ml-1">Autentifică-te</span>
          </Button>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground animate-in fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Fără card de credit</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Acces instant</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Anulare oricând</span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      {showDemo && (
        <section id="demo-section" className="container mx-auto px-4 py-8 md:py-20 bg-muted/30 rounded-2xl md:rounded-3xl mb-8 md:mb-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2">
                📊 Demo Interactiv
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Explorează funcționalitățile YANA cu date demo reale.
              </p>
            </div>
            <Button variant="outline" size="sm" className="md:size-default" onClick={() => setShowDemo(false)}>
              Închide Demo
            </Button>
          </div>

          {/* KPIs Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
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
            <Suspense fallback={<ChartLoader />}>
              <AnalyticsCharts analyses={demoAnalyses} />
            </Suspense>
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
      <section className="container mx-auto px-4 py-12 md:py-20">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-8 md:mb-12">
          De ce Yana e diferită?
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {features.map((feature, idx) => (
            <Card 
              key={idx} 
              className="hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-3 md:p-6 text-center space-y-2 md:space-y-4">
                <div className="h-10 w-10 md:h-12 md:w-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-sm md:text-lg">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Yana vs ChatGPT Comparison */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 px-2">
            ChatGPT nu știe Codul Fiscal. Yana știe.
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            De ce să plătești pentru un instrument generic când poți avea unul construit 
            special pentru legislația și businessul românesc?
          </p>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">
          {/* ChatGPT Column */}
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                ChatGPT Plus
              </CardTitle>
              <p className="text-sm text-muted-foreground">~80 lei/lună</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Chat general AI</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Nu știe legislație RO 2025</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Fără analiză balanță</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Fără dashboard financiar</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Fără rapoarte automate</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Răspunsuri generice</span>
              </div>
            </CardContent>
          </Card>

          {/* Yana Column */}
          <Card className="border-green-500/50 relative">
            <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">Pentru Afaceri RO</Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Yana Strategic
              </CardTitle>
              <p className="text-sm text-muted-foreground">49 RON/lună</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">Chat AI specializat pentru business</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">Antrenată pe Codul Fiscal RO 2025</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">Analiză balanță AI automată</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">Dashboard + grafice interactive</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">Rapoarte automate PDF/Word</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">War Room + Battle Plan incluse</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Testează gratuit 30 de zile
          </Button>
        </div>
      </section>

      {/* Pricing Section - Single Plan */}
      <section className="container mx-auto px-4 py-12 md:py-20 bg-gradient-to-b from-muted/30 to-background rounded-2xl md:rounded-3xl">
        <div className="text-center mb-3 md:mb-4">
          <Badge className="mb-3 md:mb-4" variant="secondary">
            <Gift className="h-3 w-3 mr-1" />
            Primele 30 zile GRATUIT
          </Badge>
        </div>
        
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-3 md:mb-4">
          Un singur plan. Totul inclus.
        </h2>
        <p className="text-center text-sm md:text-base text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto px-2">
          CFO-ul tău AI, la cerere. Analiză strategică, nu doar cifre.
        </p>

        <div className="max-w-lg mx-auto">
          {/* Yana Strategic Plan */}
          <Card className="relative hover:shadow-2xl transition-all duration-300 border-2 border-primary bg-gradient-to-b from-primary/5 to-background">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-6 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Tot ce ai nevoie
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-8 pt-10">
              <div className="h-16 w-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-2">Yana Strategic</CardTitle>
              <p className="text-muted-foreground text-sm">CFO-ul tău AI, la cerere</p>
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">49</span>
                  <span className="text-2xl font-semibold">RON</span>
                  <span className="text-muted-foreground">/lună</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  + TVA
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Generează Analiza Strategică Completă (40+ pagini)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Primește un plan de acțiune concret pe 90 de zile</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Identifică riscuri ascunse și oportunități de creștere</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discută rezultatele direct cu motorul AI</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">War Room Simulator - testează scenarii de criză</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Battle Plan Export - strategie PDF profesională</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Analiză nelimitată a balanțelor</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Suport prioritar în limba română</span>
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
                Fără card de credit • Anulare oricând
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transparency */}
        <div className="mt-12 max-w-3xl mx-auto">
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
                  <p className="text-muted-foreground">Preț fix, funcționalități complete</p>
                </div>
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold mb-1">Anulare oricând</p>
                  <p className="text-muted-foreground">Fără penalități, fără întrebări</p>
                </div>
                <div className="text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold mb-1">Date sigure</p>
                  <p className="text-muted-foreground">Criptare end-to-end, GDPR compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
          30 zile gratuit • Fără card de credit • Suport în română
        </p>
      </section>

      <MiniFooter />
    </div>
  );
};

export default Landing;
