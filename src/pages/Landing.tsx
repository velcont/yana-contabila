import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Sparkles
} from 'lucide-react';

export const Landing = () => {
  const navigate = useNavigate();

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
          YANA - Analiză Balanței
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
            onClick={() => window.open('https://youtu.be/nQblxkPPtKo?si=beHEGRvful0cxgqM', '_blank')}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Vezi Demo (14:33)
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
