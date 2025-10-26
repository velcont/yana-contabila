import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Zap, X, HelpCircle } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';

const STORAGE_KEY = 'yanacrm-welcome-shown';

export const YanaCRMWelcomeDialog = () => {
  const [open, setOpen] = useState(false);
  const { startTutorial, setShowTutorialMenu } = useTutorial();

  useEffect(() => {
    // Verifică dacă utilizatorul e pe /yanacrm și dacă nu a văzut deja welcome-ul
    if (window.location.pathname === '/yanacrm') {
      const hasShown = localStorage.getItem(STORAGE_KEY);
      if (!hasShown) {
        // Delay pentru a lăsa pagina să se încarce
        setTimeout(() => setOpen(true), 1000);
      }
    }
  }, []);

  const handleFullTutorial = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    // Start de la primul pas YanaCRM (pas 15 = primul pas YanaCRM)
    startTutorial(15);
  };

  const handleQuickTutorial = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    // Start direct de la Dosare Lunare - Setup (pas 23)
    startTutorial(23);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleShowMenu = () => {
    setOpen(false);
    setShowTutorialMenu(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🎓 Bine ai venit la YanaCRM!
          </DialogTitle>
          <DialogDescription>
            Hai să-ți arăt cum să gestionezi eficient toți clienții tăi contabili
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Demo */}
          <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
            <div className="text-center space-y-2">
              <Play className="h-12 w-12 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Video demo coming soon</p>
            </div>
          </div>

          {/* Tutorial Options */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group" onClick={handleFullTutorial}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Play className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Tutorial Complet</h3>
                      <p className="text-xs text-muted-foreground">25 pași ghidați • ~15-20 min</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Descoperă tot ce poți face în YanaCRM: gestionare clienți, termene fiscale, email marketing și workflow-uri lunare complete.
                  </p>
                  <Button className="w-full" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Începe Tutorialul Complet
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer group" onClick={handleQuickTutorial}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Zap className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Doar Workflow-uri</h3>
                      <p className="text-xs text-muted-foreground">12 pași • ~8 min</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mergi direct la partea importantă: cum să creezi și gestionezi Dosarele Lunare pentru clienții tăi.
                  </p>
                  <Button variant="outline" className="w-full" size="sm">
                    <Zap className="h-4 w-4 mr-2" />
                    Tutorial Rapid Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={handleShowMenu} className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Alege un pas specific
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="gap-2">
              <X className="h-4 w-4" />
              Sari peste - Explorez singur
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Poți reaccesa tutorialul oricând din meniul de ajutor
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};