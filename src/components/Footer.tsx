import { Mail, MessageCircle, FileText, Building2, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getWhatsAppLink, openExternalLink, EXTERNAL_LINKS } from '@/config/externalLinks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUserRole } from '@/hooks/useUserRole';

export const Footer = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { themeType } = useTheme();
  const { isAccountant } = useSubscription();
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();
  const email = "offiice@velcont.com";
  const whatsapp = "+40731377793";
  const whatsappMessage = "Bună! Sunt interesat de serviciile Yana.";

  const handleEmailClick = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    openExternalLink(getWhatsAppLink(whatsapp, whatsappMessage));
  };

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        {/* Header cu descriere */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-1">YANA</h3>
          <p className="text-sm font-medium text-foreground/80 mb-2">
            YANA nu este un chatbot. Este un AI pentru business.
          </p>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Analizează balanțe, dă sfaturi strategice, generează documente și nu uită nimic.
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

          {(isAccountant || isAdmin) && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button
                onClick={() => navigate('/yanacrm')}
                className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-semibold inline-flex items-center gap-2 px-6"
              >
                <Building2 className="h-4 w-4" />
                YanaCRM
              </Button>
            </>
          )}

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-4">
            <h4 className="font-semibold text-sm">Link-uri:</h4>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Analiză Balanță
            </Link>
            {!isLoading && isAdmin && (
              <Link to="/humanize-text" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Humanizer
              </Link>
            )}
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Termeni
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Confidențialitate
            </Link>
            <Link to="/research" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              Cercetare
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Tutorial ANAF
                </button>
              </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>🧾 Tutorial: Cum depui declarațiile fiscale la ANAF</DialogTitle>
                    <DialogDescription>
                      Ghid pas cu pas pentru depunerea declarațiilor prin e-guvernare.ro
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 text-sm">
                      <section>
                        <h3 className="font-semibold text-base mb-3">✅ Ce ai nevoie înainte să începi</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          <li>Semnătură electronică calificată (cu certificat digital valid)</li>
                          <li>Adobe Acrobat Reader (NU alt cititor PDF)</li>
                          <li>Declarația fiscală (fișier PDF de la ANAF)</li>
                          <li>Codul PIN al semnăturii digitale</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="font-semibold text-base mb-3">🔹 1. Semnarea declarației – PDF inteligent</h3>
                        <p className="text-muted-foreground mb-3">
                          Acestea sunt formulare PDF de tip inteligent care conțin butoane și validări automate.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Deschide PDF-ul în Adobe Reader.</li>
                          <li>Click pe butonul "Blocare" (sau "Validare" – depinde de fișier).</li>
                          <li>În dreapta va apărea un buton albastru pentru semnare – apasă pe el.</li>
                          <li>Se va deschide o fereastră în care:
                            <ul className="list-disc list-inside ml-6 mt-1">
                              <li>Selectezi certificatul digital.</li>
                              <li>Introduci PIN-ul semnăturii.</li>
                              <li>Semnătura va fi aplicată automat în PDF.</li>
                            </ul>
                          </li>
                          <li>Salvează fișierul semnat peste original (același nume).</li>
                        </ol>
                      </section>

                      <section>
                        <h3 className="font-semibold text-base mb-3">🔹 2. Semnarea declarației – PDF simplu</h3>
                        <p className="text-muted-foreground mb-3">
                          Formularele simple trebuie semnate manual prin funcția "Digital Sign".
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Deschide PDF-ul cu Adobe Reader.</li>
                          <li>În bara de sus, caută pictograma lupă (Search).</li>
                          <li>Caută cuvântul: <strong>DIG</strong>.</li>
                          <li>Selectează opțiunea "Digitally Sign".</li>
                          <li>Va apărea o fereastră – apasă OK.</li>
                          <li>Mergi în zona unde scrie "Semnătură și ștampilă", și:
                            <ul className="list-disc list-inside ml-6 mt-1">
                              <li>Trasează cu mouse-ul un dreptunghi acolo.</li>
                              <li>Apare o căsuță albastră – apasă pe ea.</li>
                            </ul>
                          </li>
                          <li>Selectează certificatul, introdu PIN-ul și semnează.</li>
                          <li>Salvează PDF-ul semnat peste original.</li>
                        </ol>
                      </section>

                      <section>
                        <h3 className="font-semibold text-base mb-3">📤 3. Depunerea declarației pe e-guvernare.ro</h3>
                        <p className="text-muted-foreground mb-3">
                          După ce ai semnat fișierul (indiferent de tipul lui), urmează depunerea efectivă:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Accesează site-ul: <a href={EXTERNAL_LINKS.E_GUVERNARE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{EXTERNAL_LINKS.E_GUVERNARE}</a></li>
                          <li>În dreapta sus, apasă pe "Prezentare certificat".</li>
                          <li>Se va deschide o fereastră unde:
                            <ul className="list-disc list-inside ml-6 mt-1">
                              <li>Selectezi certificatul digital.</li>
                              <li>Introduci PIN-ul semnăturii.</li>
                            </ul>
                          </li>
                          <li>După autentificare:
                            <ul className="list-disc list-inside ml-6 mt-1">
                              <li>Alege fișierul PDF semnat.</li>
                              <li>Apasă "Trimite" pentru a finaliza depunerea declarației.</li>
                            </ul>
                          </li>
                        </ol>
                      </section>

                      <section className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-base mb-3">🧠 Sfaturi utile</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          <li>Deschide fișierele PDF doar cu Adobe Reader, nu cu browserul sau alte aplicații.</li>
                          <li>Nu modifica structura PDF-ului înainte de semnare.</li>
                          <li>Păstrează o copie semnată și confirmarea transmiterii.</li>
                        </ul>
                      </section>
                    </div>
                  </ScrollArea>
              </DialogContent>
            </Dialog>
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
