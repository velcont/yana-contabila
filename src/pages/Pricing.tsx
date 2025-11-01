import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Info, 
  CreditCard, 
  Sparkles, 
  Shield, 
  TrendingUp,
  Clock,
  DollarSign,
  Building2,
  Briefcase,
  AlertCircle
} from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            ← Înapoi
          </Button>
          <h1 className="text-4xl font-bold">Politica de Tarife și Costuri</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transparență completă asupra costurilor. Yana oferă control total asupra cheltuielilor tale.
          </p>
          <Badge variant="default" className="text-sm">
            <Shield className="h-3 w-3 mr-1" />
            Actualizat: Ianuarie 2025
          </Badge>
        </div>

        {/* Perioada Gratuită */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <CardTitle>Perioada de Încercare Gratuită</CardTitle>
            </div>
            <CardDescription>30 de zile pentru a testa toate funcționalitățile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Ce este inclus GRATUIT:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Analiză financiară completă</li>
                  <li>✓ Chat AI pentru întrebări</li>
                  <li>✓ Dashboard interactiv</li>
                  <li>✓ Export PDF și rapoarte</li>
                  <li>✓ Acces la toate funcțiile de bază</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Important de știut:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Durează exact 30 de zile</li>
                  <li>• Nu este necesar card bancar</li>
                  <li>• Fără reînnoiri automate</li>
                  <li>• Poți anula oricând</li>
                  <li>• Vei primi notificări înainte de expirare</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planuri de Abonament */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Planuri de Abonament</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Antreprenor */}
            <Card className="border-blue-500/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Plan Antreprenor</CardTitle>
                    <CardDescription>Pentru afaceri individuale și IMM-uri</CardDescription>
                  </div>
                </div>
                <div className="text-3xl font-bold">49 lei<span className="text-sm font-normal text-muted-foreground">/lună</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Analiză financiară nelimitată</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Chat AI pentru întrebări financiare</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Dashboard și rapoarte interactive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Export PDF și Excel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Suport prioritar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="font-semibold">Validare automată Consiliu AI (3 AI-uri independente)</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate('/subscription')}>
                  Abonează-te Acum
                </Button>
              </CardContent>
            </Card>

            {/* Plan Contabil */}
            <Card className="border-green-500/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Plan Contabil</CardTitle>
                    <CardDescription>Pentru cabinete de contabilitate</CardDescription>
                  </div>
                </div>
                <div className="text-3xl font-bold">199 lei<span className="text-sm font-normal text-muted-foreground">/lună</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Toate funcțiile din Plan Antreprenor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Gestionare clienți nelimitați</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>CRM integrat pentru contabili</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Managementul documentelor clienților</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Branding personalizat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="font-semibold">Validare Premium Consiliu AI pentru toate analizele</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate('/subscription')}>
                  Abonează-te Acum
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Credite AI - OBLIGATORII pentru Yana Strategică */}
        <Card className="border-2 border-red-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-900 dark:text-red-100">
                ⚠️ Credite AI - OBLIGATORII pentru Yana Strategică
              </CardTitle>
            </div>
            <CardDescription className="text-base font-semibold">
              Yana Strategică NU este inclusă în abonament! Necesită achiziționare de credite AI separate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 mt-0.5" />
                <div className="space-y-3">
                  <p className="font-bold text-red-900 dark:text-red-100">
                    TRANSPARENȚĂ TOTALĂ - Ce include abonamentul de 49 lei/lună:
                  </p>
                  <div className="p-3 bg-white dark:bg-red-900/30 rounded">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">✅ INCLUS în abonament:</p>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <li>• Analiză balanță AI nelimitată</li>
                      <li>• Chat AI pentru întrebări financiare</li>
                      <li>• Dashboard interactiv cu grafice</li>
                      <li>• Export PDF nelimitat</li>
                      <li>• Rapoarte și alerte</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-white dark:bg-red-900/30 rounded">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">❌ NU INCLUS (necesită credite AI):</p>
                    <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                      <li>• <strong>Consilier Strategic Yana</strong> - Consultanță strategică AI</li>
                      <li>• <strong>Analiză Vocală extinsă</strong> - Peste 10 min/lună</li>
                      <li>• <strong>Predicții AI intensive</strong> - Peste 5 predicții/lună</li>
                    </ul>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                    <strong>IMPORTANT LEGAL:</strong> Nu există "acces nelimitat" la Yana Strategică. Toți utilizatorii trebuie să achiziționeze credite AI pentru a folosi această funcționalitate, indiferent de abonament. Primești 10 RON credite la început pentru testare.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pachete de Credite AI Disponibile:
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Starter</CardTitle>
                    <div className="text-2xl font-bold">19 lei</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">100 credite AI</p>
                    <p className="text-xs text-muted-foreground mt-1">~50 conversații</p>
                  </CardContent>
                </Card>

                <Card className="border-primary/50 relative">
                  <Badge className="absolute -top-2 -right-2">Popular</Badge>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Professional</CardTitle>
                    <div className="text-2xl font-bold">49 lei</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">300 credite AI</p>
                    <p className="text-xs text-muted-foreground mt-1">~150 conversații</p>
                  </CardContent>
                </Card>

                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Enterprise</CardTitle>
                    <div className="text-2xl font-bold">129 lei</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">1000 credite AI</p>
                    <p className="text-xs text-muted-foreground mt-1">~500 conversații</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Control Total asupra Costurilor:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Setezi tu bugetul lunar pentru AI</li>
                <li>• Primești alerte la 80% din buget</li>
                <li>• Poți opri automat consumul la atingerea bugetului</li>
                <li>• Vezi în timp real cheltuielile exacte</li>
                <li>• Zero costuri ascunse sau surprize</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Transparență și Conformitate */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Transparență și Protecție Juridică</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Yana respectă cu strictețe legislația românească privind protecția consumatorilor și transparența tarifelor. 
              Ne angajăm să oferim:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Transparență totală:</strong> Toate costurile sunt afișate clar înainte de orice tranzacție</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Control complet:</strong> Tu decizi bugetul și când să cumperi credite</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Fără costuri ascunse:</strong> Zero taxe surpriză sau comisioane nedeclarate</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Anulare ușoară:</strong> Poți anula abonamentul oricând, fără penalități</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Facturare conformă:</strong> Toate plățile sunt procesate prin Stripe, conform legislației UE</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Protecție consumatori:</strong> Respectăm OUG 34/2014 privind drepturile consumatorilor</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact și Întrebări */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle>Ai întrebări despre tarife?</CardTitle>
            <CardDescription>Suntem aici să te ajutăm cu orice nelămuriri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Pentru informații suplimentare despre tarife, metode de plată sau nelămuriri, 
              nu ezita să ne contactezi:
            </p>
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
    </div>
  );
};

export default Pricing;
