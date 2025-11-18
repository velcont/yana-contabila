import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';

interface QuickStartTutorialProps {
  run: boolean;
  onComplete: () => void;
}

const steps: Step[] = [
  {
    target: '[data-tour="file-upload"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📁 Pasul 1/4: Încarcă balanța</h4>
        <p>Click aici sau trage fișierul Excel</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="my-folder-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📂 Pasul 2/4: Deschide Dosarul Meu</h4>
        <p>Click pe "Dosarul Meu" pentru a vedea analizele tale</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="generate-report-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📊 Pasul 3/4: Generează Raport</h4>
        <p>Click pe "Validează cu Grok & Generează Raport Premium"</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="download-word-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">🎉 Pasul 4/4: Descarcă Word</h4>
        <p>Click pentru a descărca raportul în format Word</p>
        <p className="text-xs text-green-600 font-bold">Felicitări! 🎊</p>
      </div>
    ),
    placement: 'top',
  },
];

export const QuickStartTutorial = ({ run, onComplete }: QuickStartTutorialProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [skipFirstStep, setSkipFirstStep] = useState(false);
  const [actualSteps, setActualSteps] = useState(steps);

  // Verifică dacă există analize salvate (skipIfFileExists)
  useEffect(() => {
    const checkExistingAnalyses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('analyses')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!error && data && data.length > 0) {
          setSkipFirstStep(true);
          setStepIndex(1);
          setActualSteps(steps.slice(1));
        }
      } catch (error) {
        console.error('Error checking analyses:', error);
      }
    };

    if (run) {
      checkExistingAnalyses();
    }
  }, [run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    // Confetti la final
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (status === STATUS.FINISHED) {
        triggerConfetti();
      }
      onComplete();
    }

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  const triggerConfetti = () => {
    const confetti = document.createElement('div');
    confetti.className = 'quickstart-confetti';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  };

  return (
    <Joyride
      steps={actualSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
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
