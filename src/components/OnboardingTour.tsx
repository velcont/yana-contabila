import { useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

const steps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-bold">👋 Bine ai venit în Yana!</h3>
        <p>Hai să explorăm împreună funcționalitățile esențiale pentru a-ți gestiona finanțele eficient.</p>
        <p className="text-xs text-muted-foreground">Durată estimată: ~2 minute</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="file-upload"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📁 Încarcă Balanța Contabilă</h4>
        <p>Începe prin a încărca o balanță în format Excel. Yana o analizează automat și extrage indicatori financiari cheie.</p>
        <p className="text-xs text-muted-foreground mt-2">💡 Tip: Funcționează cu orice format standard de balanță contabilă.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="analyze-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">🚀 Generează Analiza AI</h4>
        <p>Un singur click și primești o analiză completă: indicatori financiari, alerte automate și recomandări personalizate.</p>
        <p className="text-xs text-muted-foreground mt-2">⚡ Procesare în ~10 secunde</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="dashboard-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📊 Dashboard & Istoric</h4>
        <p>Vizualizează toate analizele, compară evoluția lunară cu grafice interactive și exportă rapoarte PDF profesionale.</p>
        <p className="text-xs text-muted-foreground mt-2">🎯 Ideal pentru prezentări către bănci sau investitori</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="chat-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">💬 Chat AI Inteligent</h4>
        <p>Pune orice întrebare despre finanțele tale. Yana înțelege contextul și oferă răspunsuri detaliate bazate pe datele tale.</p>
        <p className="text-xs text-muted-foreground mt-2">Exemple: "De ce a scăzut profitul?" sau "Cum optimizez cash flow-ul?"</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="voice-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">🎤 Conversații Voice</h4>
        <p>Activează modul voice pentru discuții naturale. Perfect când ești în mișcare sau preferi să vorbești.</p>
        <p className="text-xs text-muted-foreground mt-2">🔊 Funcționează și în română!</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="conversation-history"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📚 Istoric Conversații</h4>
        <p>Toate discuțiile sunt salvate automat. Revino oricând pentru a consulta sfaturile anterioare.</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-bold">🎉 Ești gata să începi!</h3>
        <p>Acum cunoști funcționalitățile principale. Pentru ajutor suplimentar, caută iconița <span className="inline-flex items-center">💡</span> lângă fiecare secțiune.</p>
        <p className="text-sm font-medium text-primary mt-3">Succes în gestionarea finanțelor tale! 🚀</p>
      </div>
    ),
    placement: 'center',
  },
];

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);

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
        skip: 'Sari peste',
      }}
    />
  );
};
