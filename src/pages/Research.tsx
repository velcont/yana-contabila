import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Layers, Brain, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Research = () => {
  const navigate = useNavigate();

  const pillars = [
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Reziliență Organizațională",
      description: "Capacitatea firmei de a absorbi șocuri, a se adapta și a ieși mai puternică din crize.",
      references: "Duchek (2020), Linnenluecke (2017), Bruneau et al. (2003)",
      yanaFeature: "Scor Reziliență (7 dimensiuni), Alerte Proactive"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Reziliență Antreprenorială",
      description: "Reziliența personală a antreprenorului ca factor determinant al supraviețuirii firmei.",
      references: "Shepherd et al. (2015), Torres & Thurik (2019), Baumeister et al. (2018)",
      yanaFeature: "Suport empatic YANA, Companion Check-in"
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Transformare Digitală",
      description: "Inovația digitală ca mecanism de construire a rezilienței în modele de afaceri sustenabile.",
      references: "Teece (2007, 2018), Warner & Wager (2019), Vial (2019)",
      yanaFeature: "War Room, Battle Plan, Strategie AI"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Design Centrat pe Om",
      description: "Reducerea sarcinii cognitive și augmentarea deciziei prin interfețe intuitive.",
      references: "Norman (2013), Brown (2009), Lockwood (2010)",
      yanaFeature: "Interfață conversațională, Artefacte vizuale inline"
    }
  ];

  const featureMapping = [
    { feature: "Analiza Balanțe", concept: "Reducerea Sarcinii Cognitive", reference: "Norman (2013); Baumeister et al. (2018)" },
    { feature: "War Room Simulator", concept: "Agilitate Strategică", reference: "Warner & Wager (2019); Teece (2018)" },
    { feature: "Battle Plan Export", concept: "Planificare Strategică Adaptivă", reference: "Teece (2007); Helfat & Peteraf (2009)" },
    { feature: "Scor Reziliență", concept: "Cuantificarea Rezilienței Organizaționale", reference: "Duchek (2020); Linnenluecke (2017); Bruneau et al. (2003)" },
    { feature: "Suport Empatic YANA", concept: "Suport Socio-Digital pentru Antreprenori", reference: "Torres & Thurik (2019); Shepherd et al. (2015)" },
    { feature: "Alerte Proactive", concept: "Capabilități de Anticipare (Sensing)", reference: "Teece (2007); Duchek (2020)" },
    { feature: "Predicții AI", concept: "Capabilități Dinamice de Transformare", reference: "Teece (2018); Vial (2019)" },
  ];

  const bibliography = [
    "Bruneau, M., Chang, S.E., Eguchi, R.T. et al. (2003). A framework to quantitatively assess and enhance the seismic resilience of communities. Earthquake Spectra, 19(4), 733-752.",
    "Brown, T. (2009). Change by Design: How Design Thinking Transforms Organizations. Harper Business.",
    "Baumeister, R.F., Vohs, K.D., & Tice, D.M. (2018). The Strength Model of Self-Regulation. Current Directions in Psychological Science.",
    "Duchek, S. (2020). Organizational resilience: a capability-based conceptualization. Business Research, 13, 215-246.",
    "Helfat, C.E. & Peteraf, M.A. (2009). Understanding dynamic capabilities. Strategic Management Journal, 30(1), 91-102.",
    "Linnenluecke, M.K. (2017). Resilience in Business and Management Research. International Journal of Management Reviews, 19(1), 4-30.",
    "Lockwood, T. (2010). Design Thinking: Integrating Innovation, Customer Experience, and Brand Value. Allworth Press.",
    "Norman, D. (2013). The Design of Everyday Things: Revised and Expanded Edition. Basic Books.",
    "Shepherd, D.A., Wiklund, J., & Haynie, J.M. (2015). Moving forward: Balancing the financial and emotional costs of business failure. Journal of Business Venturing.",
    "Teece, D.J. (2007). Explicating dynamic capabilities: The nature and microfoundations of (sustainable) enterprise performance. Strategic Management Journal, 28(13), 1319-1350.",
    "Teece, D.J. (2018). Business models and dynamic capabilities. Long Range Planning, 51(1), 40-49.",
    "Torres, O. & Thurik, R. (2019). Small business owners and health. Small Business Economics, 53, 311-321.",
    "Vial, G. (2019). Understanding digital transformation: A review and a research agenda. Journal of Strategic Information Systems, 28(2), 118-144.",
    "Warner, K.S.R. & Wager, M. (2019). Building dynamic capabilities for digital transformation. Long Range Planning, 52(3), 326-349.",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi
        </Button>

        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Fundament Academic</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            YANA este exemplul ilustrativ central al cercetării doctorale privind inovația digitală și reziliența antreprenorială.
          </p>
        </div>

        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Despre cercetare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-semibold text-lg">
              „Inovație digitală și modele de afaceri sustenabile – Transformarea rezilienței în avantaj competitiv"
            </p>
            <p className="text-muted-foreground">
              Cercetare doctorală care explorează modul în care instrumentele digitale bazate pe inteligență artificială
              pot transforma reziliența organizațională și antreprenorială dintr-un mecanism defensiv într-un avantaj competitiv sustenabil.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary">Reziliență Organizațională</Badge>
              <Badge variant="secondary">Capabilități Dinamice</Badge>
              <Badge variant="secondary">Design Thinking</Badge>
              <Badge variant="secondary">Transformare Digitală</Badge>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mb-4">Cei 4 piloni conceptuali</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {pillars.map((pillar, i) => (
            <Card key={i} className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {pillar.icon}
                  {pillar.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{pillar.description}</p>
                <p className="text-xs text-muted-foreground italic">Ref: {pillar.references}</p>
                <Badge variant="outline" className="text-xs">YANA: {pillar.yanaFeature}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-4">Mapare Funcționalități → Concepte Academice</h2>
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Funcționalitate YANA</th>
                    <th className="text-left p-3 font-semibold">Concept Academic</th>
                    <th className="text-left p-3 font-semibold">Referințe</th>
                  </tr>
                </thead>
                <tbody>
                  {featureMapping.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.feature}</td>
                      <td className="p-3 text-muted-foreground">{row.concept}</td>
                      <td className="p-3 text-xs text-muted-foreground italic">{row.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mb-4">Bibliografie selectivă</h2>
        <Card className="mb-8">
          <CardContent className="pt-6">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              {bibliography.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Research;
