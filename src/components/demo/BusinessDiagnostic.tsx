import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { X, Loader2, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { analytics } from '@/utils/analytics';
import { DiagnosticResult } from './DiagnosticResult';
import { cn } from '@/lib/utils';

interface BusinessDiagnosticProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
}

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

export const BusinessDiagnostic = ({ isOpen, onClose, onOpenDemo }: BusinessDiagnosticProps) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-diagnostic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ answers: finalAnswers }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          setError('Ai atins limita de diagnostice gratuite. Creează un cont pentru mai mult.');
        } else {
          setError(data.error || 'Eroare la generare diagnostic');
        }
        return;
      }

      setDiagnostic(data.diagnostic);
      analytics.featureUsed('diagnostic_completed', 1);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError('Eroare de conexiune. Te rog încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setAnswers({});
    setCustomInput('');
    setDiagnostic(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Diagnostic Rapid</h3>
              <p className="text-xs text-muted-foreground">
                {diagnostic ? 'Rezultat' : isLoading ? 'Se generează...' : `Pas ${step + 1} din ${totalSteps}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">YANA analizează afacerea ta...</p>
                <p className="text-sm text-muted-foreground">Durează câteva secunde</p>
              </div>
            </div>
          ) : diagnostic ? (
            <DiagnosticResult
              diagnostic={diagnostic}
              onOpenDemo={onOpenDemo}
              onClose={handleClose}
            />
          ) : error ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => { setError(''); setStep(0); setAnswers({}); }}>
                Încearcă din nou
              </Button>
            </div>
          ) : currentStep.freeText ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-foreground">{currentStep.question}</h2>
              <Textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Scrie liber ce gândești..."
                className="min-h-[120px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Înapoi
                  </Button>
                )}
                <Button className="flex-1" onClick={submitFreeText} disabled={!customInput.trim()}>
                  Generează Diagnosticul
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-foreground">{currentStep.question}</h2>
              <div className="space-y-2">
                {currentStep.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border transition-all",
                      "hover:border-primary hover:bg-primary/5 active:scale-[0.98]",
                      answers[currentStep.key] === option
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <span className="text-sm text-foreground">{option}</span>
                  </button>
                ))}
              </div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Înapoi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
