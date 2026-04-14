import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { analytics } from '@/utils/analytics';
import { DiagnosticResult } from '@/components/demo/DiagnosticResult';
import { supabase } from '@/integrations/supabase/client';

const STEPS = [
  {
    question: 'Cu ce se ocupă firma ta?',
    key: 'industry',
    options: ['Servicii', 'Comerț', 'IT & Software', 'Construcții', 'HoReCa', 'Producție'],
  },
  {
    question: 'Cam ce cifră de afaceri ai lunar?',
    key: 'revenue',
    options: ['Sub 10.000 RON', '10.000 – 50.000 RON', '50.000 – 200.000 RON', 'Peste 200.000 RON'],
  },
  {
    question: 'Câți oameni sunt în echipă?',
    key: 'teamSize',
    options: ['Doar eu', '1 – 5 persoane', '6 – 20 persoane', 'Peste 20'],
  },
  {
    question: 'Ce te frământă cel mai tare acum?',
    key: 'mainConcern',
    options: ['Cash flow', 'Găsit clienți', 'Angajați / echipă', 'Creștere / scalare', 'Taxe și fiscalitate'],
  },
  {
    question: 'Dacă ai o baghetă magică, ce ai schimba mâine în firmă?',
    key: 'magicWand',
    freeText: true,
  },
];

export const LandingHeroDiagnostic = () => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [error, setError] = useState('');

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = diagnostic ? 100 : ((step) / totalSteps) * 100;

  const selectOption = (value: string) => {
    const newAnswers = { ...answers, [currentStep.key]: value };
    setAnswers(newAnswers);
    analytics.featureUsed('diagnostic_step', step + 1);
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      submitDiagnostic(newAnswers);
    }
  };

  const submitFreeText = () => {
    if (!customInput.trim()) return;
    const newAnswers = { ...answers, [currentStep.key]: customInput.trim() };
    setAnswers(newAnswers);
    analytics.featureUsed('diagnostic_step', step + 1);
    submitDiagnostic(newAnswers);
  };

  const submitDiagnostic = async (finalAnswers: Record<string, string>) => {
    setIsLoading(true);
    setError('');
    analytics.featureUsed('diagnostic_started', 1);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-business-diagnostic', {
        body: { answers: finalAnswers }
      });
      if (fnError) throw fnError;
      setDiagnostic(data);
      analytics.featureUsed('diagnostic_completed', 1);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setStep(0);
    setAnswers({});
    setCustomInput('');
    setDiagnostic(null);
    setError('');
  };

  // Not started yet — show the start button
  if (!started) {
    return (
      <Button
        size="lg"
        className="w-full text-base sm:text-lg px-8 py-7 sm:py-6 shadow-2xl hover:shadow-primary/25 transition-all min-h-[56px]"
        onClick={() => {
          setStarted(true);
          analytics.landingCtaClick('secondary', 'hero_inline');
        }}
      >
        🔍 Fă-ți diagnosticul gratuit — 2 minute
      </Button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">YANA analizează firma ta...</p>
      </div>
    );
  }

  // Diagnostic result
  if (diagnostic) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
        <DiagnosticResult diagnostic={diagnostic} />
        <Button variant="ghost" size="sm" onClick={reset} className="w-full text-xs">
          Refă diagnosticul
        </Button>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card/80 p-4 text-center space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={reset}>Încearcă din nou</Button>
      </div>
    );
  }

  // Steps
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      <Progress value={progress} className="h-1.5" />
      
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{currentStep.question}</p>
        <span className="text-xs text-muted-foreground">{step + 1}/{totalSteps}</span>
      </div>

      {'freeText' in currentStep && currentStep.freeText ? (
        <div className="space-y-3">
          <Textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Scrie aici ce ai schimba..."
            className="min-h-[80px] text-sm"
          />
          <Button onClick={submitFreeText} disabled={!customInput.trim()} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Generează diagnosticul
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {currentStep.options?.map((opt) => (
            <Button
              key={opt}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-2.5 px-3 whitespace-normal text-left justify-start"
              onClick={() => selectOption(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}

      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Înapoi
        </button>
      )}
    </div>
  );
};
