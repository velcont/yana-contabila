import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Footer = () => {
  const email = "contact@yana.ro"; // Înlocuiește cu email-ul tău real
  const whatsapp = "+40700000000"; // Înlocuiește cu numărul tău de WhatsApp
  const whatsappMessage = "Bună! Sunt interesat de serviciile Yana.";

  const handleEmailClick = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${whatsapp.replace(/\+/g, '')}?text=${encodedMessage}`, '_blank');
  };

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-3">Yana</h3>
            <p className="text-sm text-muted-foreground">
              Platforma ta de analiză contabilă bazată pe AI. 
              Înțelege financiar instant, fără să aștepți contabilul.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-3">Contact</h3>
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={handleEmailClick}
              >
                <Mail className="mr-2 h-4 w-4" />
                {email}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm text-green-600 hover:text-green-700"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {whatsapp}
              </Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold text-lg mb-3">Link-uri Rapide</h3>
            <div className="space-y-2 text-sm">
              <a href="/" className="block text-muted-foreground hover:text-primary transition-colors">
                Analiză Balanță
              </a>
              <a href="/contact" className="block text-muted-foreground hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Yana. Toate drepturile rezervate.</p>
          <p className="mt-2 text-xs">
            Analizele generate sunt informative și trebuie revizuite de un contabil autorizat.
          </p>
        </div>
      </div>
    </footer>
  );
};
