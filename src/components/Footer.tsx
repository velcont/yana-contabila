import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Footer = () => {
  const email = "offiice@velcont.com";
  const whatsapp = "+40731377793";
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
      <div className="container mx-auto px-4 py-6">
        {/* Header cu descriere */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2">Yana</h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Platforma ta de analiză contabilă bazată pe AI. 
            Înțelege financiar instant, fără să aștepți contabilul.
          </p>
        </div>

        {/* Contact și Links pe orizontală */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Contact:</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-sm"
              onClick={handleEmailClick}
            >
              <Mail className="mr-2 h-4 w-4" />
              {email}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-sm text-green-600 hover:text-green-700"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {whatsapp}
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-4">
            <h4 className="font-semibold text-sm">Link-uri:</h4>
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Analiză Balanță
            </a>
            <a href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
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
