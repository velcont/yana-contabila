import { useEffect, useState } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Bine ai venit în Yana! 👋</h3>
          <p>Hai să-ți arăt cum funcționează aplicația în câțiva pași simpli.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="file-upload"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pasul 1: Încarcă balanța 📄</h3>
          <p>Apasă aici pentru a selecta fișierul Excel cu balanța ta.</p>
          <p className="text-sm text-muted-foreground">Balanța trebuie să fie în format .xls sau .xlsx și să conțină: Solduri inițiale, Rulaje perioadă, Total sume și Solduri finale.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="analyze-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pasul 2: Generează analiza 🔍</h3>
          <p>După ce ai încărcat fișierul, apasă acest buton pentru a genera analiza automată.</p>
          <p className="text-sm text-muted-foreground">Analiza durează 10-30 secunde și folosește inteligență artificială.</p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pasul 3: Dashboard cu grafice și indicatori 📊</h3>
          <p>Aici vei găsi toate analizele tale salvate, grafice și statistici.</p>
          <p className="text-sm text-muted-foreground">Poți compara luni diferite, filtra și exporta rapoarte.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="chat-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pasul 4: Chat AI Yana 💬</h3>
          <p>Întreabă-mă orice despre datele tale financiare!</p>
          <p className="text-sm text-muted-foreground">✨ <strong>Nou:</strong> Sugestii inteligente, istoric conversații, răspunsuri în timp real!</p>
          <p className="text-sm text-muted-foreground">Exemple: "Cum stau cu DSO?", "Compară luna aceasta cu luna trecută"</p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="conversation-history"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Istoric Conversații 📚</h3>
          <p>Accesează rapid conversațiile anterioare cu AI-ul.</p>
          <p className="text-sm text-muted-foreground">Toate întrebările tale sunt salvate și pot fi căutate.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Gata! Ești pregătit 🎉</h3>
          <p>Acum poți începe să folosești Yana pentru a-ți analiza situația financiară.</p>
          <p className="text-sm text-muted-foreground">Dacă ai nevoie de ajutor, folosește chat-ul asistent oricând!</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onComplete();
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (type === EVENTS.STEP_AFTER ? 1 : 0));
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      scrollToFirstStep
      scrollOffset={120}
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 10,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Înapoi',
        close: 'Închide',
        last: 'Finalizează',
        next: 'Următorul',
        skip: 'Omite tutorialul',
      }}
    />
  );
};
