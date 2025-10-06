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
          <p className="text-xs text-muted-foreground mt-2">✨ Tutorialul actualizat cu toate funcțiile noi!</p>
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
          <p>Apasă aici pentru a selecta unul sau mai multe fișiere Excel cu balanța ta.</p>
          <p className="text-sm text-muted-foreground">✅ Format: .xls sau .xlsx</p>
          <p className="text-sm text-muted-foreground">✅ Trebuie să conțină: Solduri inițiale, Rulaje perioadă, Total sume și Solduri finale.</p>
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
          <p className="text-sm text-muted-foreground">⏱️ Analiza durează 10-30 secunde și folosește inteligență artificială avansată.</p>
          <p className="text-sm text-muted-foreground">💾 Analizele se salvează automat în contul tău.</p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Pasul 3: Dashboard cu grafice 📊</h3>
          <p>Aici găsești toate analizele tale salvate, vizualizate cu grafice interactive și indicatori cheie.</p>
          <p className="text-sm text-muted-foreground">📈 Compară luni diferite</p>
          <p className="text-sm text-muted-foreground">🔍 Filtrează după firmă sau perioadă</p>
          <p className="text-sm text-muted-foreground">📥 Exportă rapoarte PDF sau CSV</p>
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
          <p>Asistentul tău financiar inteligent! Întreabă-mă orice despre datele tale.</p>
          <p className="text-sm text-muted-foreground">✨ <strong>Funcții noi:</strong></p>
          <p className="text-sm text-muted-foreground">• Sugestii inteligente în timp real</p>
          <p className="text-sm text-muted-foreground">• Istoric conversații salvat</p>
          <p className="text-sm text-muted-foreground">• Quick replies cu întrebări populare</p>
          <p className="text-sm text-muted-foreground">• Stil răspuns personalizabil (Detaliat/Scurt/Action)</p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="voice-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">✨ Nou: Conversații Vocale 🎤</h3>
          <p>Vorbește direct cu Yana! Pune întrebări vocal și primește răspunsuri audio.</p>
          <p className="text-sm text-muted-foreground">🎙️ Click pe iconița de microfon din header-ul chat-ului</p>
          <p className="text-sm text-muted-foreground">⏱️ 20 minute gratuite pe lună</p>
          <p className="text-sm text-muted-foreground">💡 Perfect când ești pe drum sau ai mâinile ocupate!</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="conversation-history"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Istoric Conversații 📚</h3>
          <p>Toate conversațiile tale cu AI-ul sunt salvate automat.</p>
          <p className="text-sm text-muted-foreground">🔍 Căutare rapidă prin întrebările anterioare</p>
          <p className="text-sm text-muted-foreground">📅 Organizate cronologic</p>
          <p className="text-sm text-muted-foreground">💾 Accesibile oricând</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Gata! Ești pregătit 🎉</h3>
          <p>Acum poți începe să folosești Yana pentru a-ți analiza situația financiară.</p>
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">💡 Sfaturi rapide:</p>
            <p className="text-xs text-muted-foreground">• Încarcă mai multe balanțe odată pentru analiză rapidă</p>
            <p className="text-xs text-muted-foreground">• Folosește chat-ul vocal când ești pe telefon</p>
            <p className="text-xs text-muted-foreground">• Explorează Dashboard-ul pentru insights vizuale</p>
          </div>
          <p className="text-sm text-muted-foreground">Dacă ai nevoie de ajutor, apasă pe ? în colțul dreapta sus!</p>
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
