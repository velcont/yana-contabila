import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Play, RotateCcw, List } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';
import { useTutorialSteps } from '@/hooks/useTutorialSteps';
import { getSavedTutorialProgress } from '@/contexts/TutorialContext';
import { Badge } from '@/components/ui/badge';

export const TutorialMenu = () => {
  const { showTutorialMenu, setShowTutorialMenu, startTutorial } = useTutorial();
  const { steps } = useTutorialSteps();
  const savedProgress = getSavedTutorialProgress();

  const handleContinue = () => {
    if (savedProgress !== null) {
      startTutorial(savedProgress);
    } else {
      startTutorial(0);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem('yana-tutorial-progress');
    startTutorial(0);
  };

  const handleSelectStep = (index: number) => {
    startTutorial(index);
  };

  return (
    <Dialog open={showTutorialMenu} onOpenChange={setShowTutorialMenu}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🎓 Tutorial Interactiv Yana
          </DialogTitle>
          <DialogDescription>
            Alege cum vrei să începi tutorialul ghidat prin aplicație
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {savedProgress !== null && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Continuă de unde ai rămas
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pas {savedProgress + 1} din {steps.length}: {steps[savedProgress]?.title}
                    </p>
                  </div>
                  <Button onClick={handleContinue} size="sm">
                    Continuă
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Începe de la început
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vezi tutorialul complet de la pas 1
                  </p>
                </div>
                <Button onClick={handleRestart} variant="outline" size="sm">
                  Restart
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <List className="h-4 w-4" />
                Alege o funcțiune specifică
              </h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectStep(index)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-border hover:border-primary group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              Pas {index + 1}
                            </Badge>
                            <h4 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                              {step.title}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {step.description}
                          </p>
                        </div>
                        <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowTutorialMenu(false)}>
            Anulează
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
