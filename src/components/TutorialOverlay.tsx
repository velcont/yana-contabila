import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Menu } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';

export const TutorialOverlay = () => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    highlightedElement,
    stopTutorial,
    nextStep,
    previousStep,
    voiceEnabled,
    toggleVoice,
    setShowTutorialMenu,
  } = useTutorial();

  useEffect(() => {
    if (!isActive) return;

    // Add spotlight effect to highlighted element
    if (highlightedElement) {
      const element = document.querySelector(highlightedElement);
      if (element) {
        element.classList.add('tutorial-highlight');
        return () => {
          element.classList.remove('tutorial-highlight');
        };
      }
    }
  }, [highlightedElement, isActive]);

  if (!isActive || !currentStep) return null;

  return (
    <>
      {/* Overlay backdrop - reduced opacity to allow visibility */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />

      {/* Tutorial control card */}
      <Card className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mx-4 shadow-2xl border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {currentStepIndex + 1}
                </span>
                {currentStep.title}
              </CardTitle>
              <CardDescription className="mt-2">
                Pas {currentStepIndex + 1} din {totalSteps}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopTutorial}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-base mb-6">{currentStep.description}</p>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTutorialMenu(true)}
                title="Meniu tutorial"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVoice}
                title={voiceEnabled ? "Dezactivează voce" : "Activează voce"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <Button onClick={nextStep}>
                {currentStepIndex === totalSteps - 1 ? 'Finalizează' : 'Următorul'}
                {currentStepIndex < totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 45 !important;
          box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 0 8px hsl(var(--primary) / 0.3);
          border-radius: 8px;
          pointer-events: auto;
        }
      `}</style>
    </>
  );
};
