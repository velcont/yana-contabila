import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, CheckCircle2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle>Aplicație Instalată! ✨</CardTitle>
            <CardDescription>
              YANA este deja instalată pe dispozitivul tău și funcționează perfect!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/')} className="w-full" size="lg">
              <Home className="mr-2 h-5 w-5" />
              Mergi la Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle>Instalare Reușită! 🎉</CardTitle>
            <CardDescription>
              YANA a fost instalată cu succes. Poți găsi aplicația pe ecranul principal al dispozitivului tău.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/')} className="w-full" size="lg">
              <Home className="mr-2 h-5 w-5" />
              Mergi la Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Instalează YANA pe Telefon 📱</CardTitle>
          <CardDescription>
            Accesează YANA instant de pe ecranul principal, funcționează offline și se încarcă rapid!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isIOS ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold">Cum instalezi pe iPhone/iPad:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Apasă butonul <strong>Share</strong> (📤) din bara de jos a Safari</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Scroll în jos și selectează <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Apasă <strong>"Add"</strong> în colțul din dreapta sus</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Gata! YANA apare pe ecranul principal 🎉</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalează Aplicația
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold">Cum instalezi pe Android:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Apasă pe meniul browser-ului (⋮) din colțul din dreapta sus</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Selectează <strong>"Install app"</strong> sau <strong>"Add to Home screen"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Confirmă instalarea</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>YANA apare pe ecranul principal! 🎉</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Beneficii:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Acces instant de pe ecranul principal</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Funcționează offline</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Se încarcă rapid</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Actualizări automate instant</span>
              </li>
            </ul>
          </div>

          <Button variant="outline" onClick={() => navigate('/')} className="w-full">
            Înapoi la Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
