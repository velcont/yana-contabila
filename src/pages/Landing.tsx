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
            onClick={() => window.open('https://www.youtube.com/watch?v=demo', '_blank')}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Vezi Demo (60 sec)
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          <Clock className="inline h-3 w-3 mr-1" />
          Testare gratuită 14 zile • Fără card necesar
        </p>
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
          Comparație obiectivă cu DoctorBusiness și alte soluții
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
            DoctorBusiness îți dă 35 de pagini de citit. Yana îți dă răspunsuri în 2 secunde.
          </p>
        </div>
      </section>

      {/* Testimonials Placeholder */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Ce spun utilizatorii?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="hover:shadow-lg transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground">
                  "Testimonial placeholder - add real testimonials here"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20"></div>
                  <div>
                    <p className="font-semibold text-sm">Nume Client</p>
                    <p className="text-xs text-muted-foreground">Firmă SRL</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20 bg-primary/5 rounded-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Pricing Simplu și Transparent
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Free */}
          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold">FREE</h3>
                <p className="text-3xl font-bold mt-2">0 RON</p>
                <p className="text-sm text-muted-foreground">pentru totdeauna</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">1 analiză/lună</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Chat AI limitat</span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fără voice</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Începe Gratuit
              </Button>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="border-primary shadow-xl scale-105 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Recomandat
            </Badge>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold">PRO</h3>
                <p className="text-3xl font-bold mt-2">79 RON<span className="text-sm">/lună</span></p>
                <p className="text-sm text-muted-foreground">tot ce ai nevoie</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Analize nelimitate</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Chat AI + Voice</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Export PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Alerte proactive</span>
                </li>
              </ul>

              <Button className="w-full" onClick={() => navigate('/auth')}>
                Încearcă 14 zile gratuit
              </Button>
            </CardContent>
          </Card>

          {/* Business */}
          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold">BUSINESS</h3>
                <p className="text-3xl font-bold mt-2">199 RON<span className="text-sm">/lună</span></p>
                <p className="text-sm text-muted-foreground">pentru echipe</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Tot din PRO</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Multi-firmă (5)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">API access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">Suport prioritar</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full" onClick={() => navigate('/contact')}>
                Contactează-ne
              </Button>
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
            Încearcă Gratuit 14 Zile
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Fără card necesar • Anulare oricând • Suport în română
        </p>
      </section>
    </div>
  );
};
