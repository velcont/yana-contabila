import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import MiniFooter from '@/components/MiniFooter';
import { 
  Check, 
  Shield, 
  Sparkles,
  Brain,
  FileText,
  Target,
  TrendingUp,
  MessageSquare,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            ← Înapoi
          </Button>
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            49 RON/lună + 20 credite AI incluse
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Yana Strategic</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            CFO-ul tău AI, la cerere. Analiză strategică, nu doar cifre.
          </p>
        </div>

        {/* Single Premium Plan Card */}
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 shadow-2xl">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="h-20 w-20 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl mb-3">Yana Strategic</CardTitle>
            <CardDescription className="text-lg">
              CFO-ul tău AI, la cerere. Analiză strategică, nu doar cifre.
            </CardDescription>
            <div className="mt-8">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-6xl font-bold text-primary">49</span>
                <span className="text-3xl font-semibold">RON</span>
                <span className="text-muted-foreground">/lună</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                TVA inclus • Include 20 credite AI (~40 sesiuni strategice)
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8 pb-10">
            {/* Main Benefits */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Analiză Strategică Completă</h4>
                  <p className="text-sm text-muted-foreground">Raport detaliat de 40+ pagini cu indicatori, analiză și recomandări</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Plan de Acțiune 90 Zile</h4>
                  <p className="text-sm text-muted-foreground">Strategii concrete și acționabile pentru următoarele 3 luni</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Riscuri și Oportunități</h4>
                  <p className="text-sm text-muted-foreground">Identificarea riscurilor ascunse și a oportunităților de creștere</p>
                </div>
              </div>
              
                <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">20 Credite AI Incluse</h4>
                  <p className="text-sm text-muted-foreground">~40 sesiuni strategice lunar. Pachete suplimentare de la 10 RON.</p>
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="border-t pt-6">
              <h4 className="font-semibold mb-4 text-center">Tot ce primești:</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Analiză AI nelimitată a balanțelor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Chat AI conversațional</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Dashboard & Analytics live</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Predicții AI & Alerte proactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Export PDF & Word nelimitat</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Yana Strategică (Consilier AI)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">War Room Simulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Battle Plan Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Voice Interface</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Suport prioritar</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
                onClick={() => navigate('/subscription')}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Activează Yana Strategic
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                30 de zile gratuit • Anulare oricând • Fără card inițial
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Credits Info */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              <CardTitle>Credite AI Suplimentare</CardTitle>
            </div>
            <CardDescription>
              Depășești cele 20 credite incluse? Poți cumpăra pachete suplimentare oricând.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-semibold">Starter</p>
                <p className="text-2xl font-bold text-primary">10 RON</p>
                <p className="text-xs text-muted-foreground">1.000 credite</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg text-center border-2 border-primary">
                <Badge className="mb-1">Popular</Badge>
                <p className="font-semibold">Professional</p>
                <p className="text-2xl font-bold text-primary">20 RON</p>
                <p className="text-xs text-muted-foreground">2.500 credite</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-semibold">Business</p>
                <p className="text-2xl font-bold text-primary">40 RON</p>
                <p className="text-xs text-muted-foreground">5.000 credite</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-semibold">Enterprise</p>
                <p className="text-2xl font-bold text-primary">70 RON</p>
                <p className="text-xs text-muted-foreground">10.000 credite</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              Creditele nu expiră. Poți vedea consumul în timp real din Setări.
            </p>
          </CardContent>
        </Card>

        {/* Transparency & Legal */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Transparență și Protecție</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5" />
                <span><strong>Model hybrid clar:</strong> 49 RON/lună + 20 credite AI incluse. Pachete suplimentare doar dacă ai nevoie.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5" />
                <span><strong>Fără surprize:</strong> Vezi consumul în timp real. Alerte la 5 RON rămași.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5" />
                <span><strong>Anulare ușoară:</strong> Poți anula abonamentul oricând, fără penalități</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5" />
                <span><strong>Facturare conformă:</strong> Plăți procesate prin Stripe, conform legislației UE</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle>Ai întrebări?</CardTitle>
            <CardDescription>Suntem aici să te ajutăm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => navigate('/contact')} variant="default">
                Contactează-ne
              </Button>
              <Button onClick={() => navigate('/terms')} variant="outline">
                Vezi Termenii Completi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <MiniFooter />
    </div>
  );
};

export default Pricing;
