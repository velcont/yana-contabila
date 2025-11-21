import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Scale, MessageCircle, ChevronRight, Loader2 } from 'lucide-react';
import { TypingIndicator } from '@/components/TypingIndicator';

const LandingNew = () => {
  const navigate = useNavigate();
  const [showPricing, setShowPricing] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Mesaje demonstrative animate
  const startDemoConversation = () => {
    if (demoMessages.length > 0) return;
    
    const conversation = [
      { role: 'user' as const, content: 'Ce poate face Yana?' },
      { 
        role: 'assistant' as const, 
        content: 'Bună! Yana poate analiza balanțele tale contabile în timp real și îți oferă consultanță fiscală specializată pe legislația română 2025. Încarci Excel-ul cu balanța → primești analiză completă în 2 secunde + raport Word descărcabil automat!' 
      },
      { role: 'user' as const, content: 'Cum funcționează analiza balanței?' },
      {
        role: 'assistant' as const,
        content: 'Simplu: \n\n1️⃣ Încarci fișierul Excel cu balanța (format .xls/.xlsx)\n2️⃣ Yana analizează automat DSO, cash flow, profitul, EBITDA\n3️⃣ Primești răspunsuri instant + raportul Word Premium se descarcă automat\n\nTot ce trebuie să faci este să încarci fișierul - restul e automat!'
      }
    ];

    let index = 0;
    const showNextMessage = () => {
      if (index >= conversation.length) return;
      
      setIsTyping(true);
      setTimeout(() => {
        setDemoMessages(prev => [...prev, conversation[index]]);
        setIsTyping(false);
        index++;
        if (index < conversation.length) {
          setTimeout(showNextMessage, 1500);
        }
      }, 800);
    };

    showNextMessage();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header Minimalist */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                YANA
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowPricing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                Vezi Prețuri
              </Button>
              <Button 
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                Încearcă Gratuit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Google AI Studio Style */}
      <section className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="h-3 w-3 mr-2" />
              AI-ul financiar care înțelege România
            </Badge>
          </div>

          {/* Titlu Principal */}
          <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 leading-tight">
            Analiza balanței în <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">2 secunde</span>
          </h1>

          <p className="text-xl md:text-2xl text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Prima analiză financiară AI antrenată pe legislația română 2025. 
            <br />
            Chat live + raport Word Premium descărcat automat.
          </p>

          {/* Chat Zone Demonstrativ - Google AI Studio Style */}
          <Card className="max-w-4xl mx-auto shadow-2xl border-primary/20 mb-8">
            <div className="p-8 min-h-[500px] flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 space-y-6 mb-6">
                {demoMessages.length === 0 && !isTyping ? (
                  <div className="text-center space-y-4 pt-12">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold">Vorbește cu Yana</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Prima analiză financiară conversațională din România. 
                      Click pe butonul de mai jos pentru demo.
                    </p>
                  </div>
                ) : (
                  <>
                    {demoMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <TypingIndicator />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Demo Start Button */}
              {demoMessages.length === 0 && (
                <div className="text-center">
                  <Button 
                    size="lg"
                    onClick={startDemoConversation}
                    className="bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Pornește Demo
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Card cu butoane disabled */}
          <Card className="max-w-3xl mx-auto shadow-xl border-primary/20">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-center mb-6">
                Selectează modulul dorit
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-32 flex-col gap-3 cursor-not-allowed opacity-60 relative group"
                  disabled
                >
                  <FileText className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">Analiză Balanță</div>
                    <div className="text-sm text-muted-foreground">Încarcă Excel și primești analiză live</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="secondary">Înregistrează-te pentru acces</Badge>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-32 flex-col gap-3 cursor-not-allowed opacity-60 relative group"
                  disabled
                >
                  <Scale className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">Consultanță Fiscală</div>
                    <div className="text-sm text-muted-foreground">Legislație fiscală 2025</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="secondary">Înregistrează-te pentru acces</Badge>
                  </div>
                </Button>
              </div>
            </div>
          </Card>

          {/* CTA Final */}
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            >
              Începe Gratuit - 30 de zile trial
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Fără card de credit • Acces instant • Anulare oricând
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Modal */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Prețuri YANA</DialogTitle>
            <DialogDescription>
              Alege planul potrivit pentru afacerea ta
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Antreprenor */}
            <Card className="p-6 border-2 border-primary/20">
              <div className="mb-4">
                <h3 className="text-2xl font-bold">Antreprenor</h3>
                <p className="text-muted-foreground">Pentru afaceri și companii</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">49 RON</span>
                <span className="text-muted-foreground">/lună</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Analiză balanță nelimitată</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Chat AI conversațional</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Raport Word Premium automat</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Consultanță fiscală 24/7</span>
                </li>
              </ul>
              <Button className="w-full" onClick={() => {
                setShowPricing(false);
                navigate('/auth');
              }}>
                Începe Gratuit
              </Button>
            </Card>

            {/* Contabil */}
            <Card className="p-6 border-2 border-success/20">
              <div className="mb-4">
                <h3 className="text-2xl font-bold">Contabil</h3>
                <p className="text-muted-foreground">Pentru firme de contabilitate</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">199 RON</span>
                <span className="text-muted-foreground">/lună</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>Tot din planul Antreprenor +</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>Dashboard multi-clienți</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>Comparații inter-firme</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>Invitații clienți nelimitate</span>
                </li>
              </ul>
              <Button className="w-full bg-success hover:bg-success/90" onClick={() => {
                setShowPricing(false);
                navigate('/auth');
              }}>
                Începe Gratuit
              </Button>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingNew;
