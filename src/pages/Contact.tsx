import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, Building2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const navigate = useNavigate();
  const email = "offiice@velcont.com";
  const whatsapp = "+40731377793";
  const whatsappMessage = "Bună! Sunt interesat de serviciile Yana pentru analiză balanță contabilă.";

  const handleEmailClick = () => {
    window.location.href = `mailto:${email}?subject=Întrebare Yana - Analiză Balanță&body=Bună ziua,%0D%0A%0D%0A`;
  };

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${whatsapp.replace(/\+/g, '')}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Contactează Yana
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ai întrebări despre analizele financiare sau vrei să afli mai multe despre serviciile noastre? 
            Suntem aici să te ajutăm!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Email Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleEmailClick}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Email</CardTitle>
              </div>
              <CardDescription>
                Trimite-ne un email și îți vom răspunde în cel mai scurt timp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-primary mb-4">{email}</p>
              <Button onClick={handleEmailClick} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Trimite Email
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleWhatsAppClick}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-green-500/10">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>WhatsApp</CardTitle>
              </div>
              <CardDescription>
                Contactează-ne direct pe WhatsApp pentru răspuns rapid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-green-600 mb-4">{whatsapp}</p>
              <Button onClick={handleWhatsAppClick} className="w-full bg-green-600 hover:bg-green-700">
                <MessageCircle className="mr-2 h-4 w-4" />
                Deschide WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Despre Yana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Yana este platforma ta de analiză contabilă bazată pe inteligență artificială. 
              Transformăm balanțele contabile în analize clare și acționabile, ajutându-te să înțelegi 
              situația financiară a afacerii tale fără să aștepți explicații de la contabil.
            </p>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">De ce să alegi Yana?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Analiză managerială completă în câteva secunde</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Indicatori CEO avansați (DSO, DPO, Cash Conversion Cycle, EBITDA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Export PDF profesional pentru prezentări</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Istoric complet al analizelor tale</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Chat AI pentru întrebări suplimentare</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Compatibil cu toate programele de contabilitate (SmartBill, WizOne, Saga, etc.)</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Program de lucru</h3>
              <p className="text-sm text-muted-foreground">
                Luni - Vineri: 9:00 - 18:00<br />
                Răspundem la toate mesajele în maxim 24 ore lucrătoare
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-3">Gata să începi?</h3>
              <p className="text-muted-foreground mb-6">
                Încearcă Yana gratuit și vezi cum analiza ta financiară devine instant clară!
              </p>
              <Button size="lg" onClick={() => navigate('/')} className="mx-auto">
                Începe o Analiză Acum
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
