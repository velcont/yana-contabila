import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  userId: string;
  userName?: string;
  onComplete: (answers: OnboardingAnswers) => void;
}

export interface OnboardingAnswers {
  businessDescription: string;
  entrepreneurYears: string;
  biggestWorry: string;
  yearGoal: string;
}

const QUESTIONS = [
  {
    key: 'businessDescription' as const,
    question: 'Cu ce se ocupă firma ta? Spune-mi pe scurt — domeniu, ce vinzi sau ce servicii oferi.',
    placeholder: 'Ex: Avem un magazin online de mobilă handmade...',
    emoji: '🏢',
  },
  {
    key: 'entrepreneurYears' as const,
    question: 'De cât timp ești antreprenor? Nu contează dacă e mult sau puțin — vreau doar să te cunosc.',
    placeholder: 'Ex: De 3 ani, dar înainte am lucrat 5 ani în corporație...',
    emoji: '⏳',
  },
  {
    key: 'biggestWorry' as const,
    question: 'Ce te ține treaz noaptea legat de business? Fii sincer — aici nu judecă nimeni.',
    placeholder: 'Ex: Cash flow-ul — nu știu niciodată dacă am bani luna viitoare...',
    emoji: '🌙',
  },
  {
    key: 'yearGoal' as const,
    question: 'Ce obiectiv ai pentru anul ăsta? Unul singur, cel mai important.',
    placeholder: 'Ex: Vreau să dublez cifra de afaceri și să angajez 2 oameni...',
    emoji: '🎯',
  },
];

export function OnboardingFlow({ userId, userName, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const isLastStep = currentStep === QUESTIONS.length - 1;

  const handleNext = async () => {
    if (!currentAnswer.trim()) return;

    const newAnswers = { ...answers, [currentQuestion.key]: currentAnswer.trim() };
    setAnswers(newAnswers);

    if (isLastStep) {
      // Save all answers
      setSaving(true);
      try {
        const onboardingAnswers: OnboardingAnswers = {
          businessDescription: newAnswers.businessDescription || '',
          entrepreneurYears: newAnswers.entrepreneurYears || '',
          biggestWorry: newAnswers.biggestWorry || '',
          yearGoal: newAnswers.yearGoal || '',
        };

        // Upsert client profile with onboarding data
        const { error } = await supabase
          .from('yana_client_profiles')
          .upsert({
            user_id: userId,
            onboarding_completed: true as never,
            onboarding_answers: onboardingAnswers as never,
            business_domain: onboardingAnswers.businessDescription.substring(0, 200),
          } as never, { onConflict: 'user_id' });

        if (error) throw error;

        setCompleted(true);
        onComplete(onboardingAnswers);
      } catch (err) {
        console.error('[OnboardingFlow] Save error:', err);
        toast.error('Nu am putut salva răspunsurile. Încearcă din nou.');
      } finally {
        setSaving(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
      setCurrentAnswer('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex gap-3 justify-start">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">Y</span>
          </div>
          <div className="rounded-2xl px-4 py-3 bg-muted text-foreground max-w-[80%]">
            <p className="text-sm">
              Mulțumesc{userName ? `, ${userName}` : ''}! 💛 Acum te cunosc mai bine.
            </p>
            <p className="text-sm mt-2">
              De acum înainte, fiecare răspuns va fi adaptat afacerii tale. 
              Nu mai ești un utilizator anonim — ești partenerul meu de business.
            </p>
            <p className="text-sm mt-2 font-medium">
              Hai să începem. Cu ce te pot ajuta?
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Intro message (only on first step) */}
      {currentStep === 0 && (
        <div className="flex gap-3 justify-start">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">Y</span>
          </div>
          <div className="rounded-2xl px-4 py-3 bg-muted text-foreground max-w-[80%]">
            <p className="text-sm">
              {userName ? `${userName}, ` : ''}înainte să începem, vreau să te cunosc puțin. 
              Am 4 întrebări scurte — ca să-ți pot da sfaturi care chiar se potrivesc pe tine, 
              nu răspunsuri generice. Durează sub un minut.
            </p>
          </div>
        </div>
      )}

      {/* Previous answers shown as chat messages */}
      {QUESTIONS.slice(0, currentStep).map((q, i) => (
        <div key={q.key} className="space-y-3">
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">Y</span>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-muted text-foreground max-w-[80%]">
              <p className="text-sm">{q.emoji} {q.question}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground max-w-[80%]">
              <p className="text-sm whitespace-pre-wrap">{answers[q.key]}</p>
            </div>
            <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-secondary-foreground font-medium text-xs">
                {userName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Current question */}
      <div className="flex gap-3 justify-start">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">Y</span>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-muted text-foreground max-w-[80%]">
          <p className="text-sm">{currentQuestion.emoji} {currentQuestion.question}</p>
        </div>
      </div>

      {/* Answer input */}
      <div className="pl-11 pr-0 space-y-2">
        <Textarea
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentQuestion.placeholder}
          className="min-h-[60px] max-h-24 resize-none text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {QUESTIONS.length}
          </span>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!currentAnswer.trim() || saving}
            className="gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvez...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Gata!
              </>
            ) : (
              <>
                Continuă
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
