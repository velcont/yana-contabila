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
        <h4 className="font-semibold">📁 Pasul 1: Încarcă balanța</h4>
        <p>Click pe acest buton 📎 pentru a încărca fișierul Excel cu balanța contabilă</p>
        <p className="text-xs text-muted-foreground">Acceptăm fișiere .xls și .xlsx</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="close-chatai"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">✅ Pasul 2: Închide ChatAI</h4>
        <p>După încărcarea balanței, închide fereastra ChatAI apăsând X</p>
        <p className="text-xs text-muted-foreground">Analiza ta a fost salvată automat</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="my-folder-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📂 Pasul 3: Deschide "Dosarul Meu"</h4>
        <p>Click pe tab-ul "Dosarul Meu" pentru a vedea toate analizele tale salvate</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="select-analysis"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">👆 Pasul 4: Selectează balanța</h4>
        <p>Click pe balanța pe care tocmai ai încărcat-o pentru a o deschide</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="scroll-hint"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">⬇️ Pasul 5: Scroll în jos</h4>
        <p>Dă scroll în jos pentru a găsi butonul de generare raport Word</p>
        <p className="text-xs text-primary font-semibold">E mai jos, în zona de acțiuni!</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="generate-report-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">📊 Pasul 6: Generează Raport Word</h4>
        <p>Click pe "Validează cu Grok & Generează Raport Premium"</p>
        <p className="text-xs text-muted-foreground">Durează ~30 secunde</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="close-confirmation-dialog"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">✅ Pasul 7: Închide confirmarea</h4>
        <p>După generare, închide fereastra de confirmare</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="download-word-button"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">⬇️ Pasul 8: Descarcă Word</h4>
        <p>Click pentru a descărca raportul în format Word</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="file-upload"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">🎉 Pasul 9: Citește și întreabă!</h4>
        <p>Deschide fișierul Word și citește raportul</p>
        <p className="text-sm text-primary font-semibold mt-2">💬 Nu înțelegi ceva?</p>
        <p className="text-xs">Deschide ChatAI și întreabă! De exemplu:</p>
        <p className="text-xs italic">"De ce am pierdere dacă am venit bune?"</p>
        <p className="text-xs text-green-600 font-bold mt-2">Felicitări! Ai terminat tutorialul! 🎊</p>
      </div>
    ),
    placement: 'bottom',
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
