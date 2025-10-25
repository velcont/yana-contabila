import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Home } from 'lucide-react';

interface OnboardingStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  required: boolean;
  type: 'form' | 'upload' | 'verification';
  completed: boolean;
  notes: string | null;
}

interface OnboardingProcess {
  id: string;
  process_name: string;
  steps: Array<{
    step_number: number;
    title: string;
    description: string;
    required: boolean;
    type: 'form' | 'upload' | 'verification';
  }>;
}

const ClientOnboardingWizard = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<OnboardingProcess | null>(null);
  const [stepsProgress, setStepsProgress] = useState<OnboardingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOnboardingData();
  }, [processId]);

  const fetchOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Eroare',
          description: 'Trebuie să fii autentificat.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Get company for this user
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(company.id);

      // Get process details
      const { data: processData, error: processError } = await supabase
        .from('onboarding_processes')
        .select('*')
        .eq('id', processId)
        .single();

      if (processError) throw processError;
      setProcess(processData as unknown as OnboardingProcess);

      // Get progress for this company
      const { data: progressData, error: progressError } = await supabase
        .from('onboarding_steps_progress')
        .select('*')
        .eq('process_id', processId)
        .eq('client_company_id', company.id)
        .order('step_number');

      if (progressError) throw progressError;

      // Merge process steps with progress data
      const processSteps = processData.steps as Array<any>;
      const mergedSteps: OnboardingStep[] = processSteps.map((step: any) => {
        const progress = progressData?.find((p) => p.step_number === step.step_number);
        return {
          id: progress?.id || '',
          step_number: step.step_number,
          title: step.title,
          description: step.description,
          required: step.required,
          type: step.type,
          completed: progress?.completed || false,
          notes: progress?.notes || null,
        };
      });

      setStepsProgress(mergedSteps);

      // Find first incomplete step
      const firstIncomplete = mergedSteps.findIndex(s => !s.completed);
      if (firstIncomplete !== -1) {
        setCurrentStepIndex(firstIncomplete);
      }
    } catch (error: any) {
      console.error('Error fetching onboarding data:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele de onboarding.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!companyId || !processId) return;

    const currentStep = stepsProgress[currentStepIndex];
    setSubmitting(true);

    try {
      // Update or insert progress
      const { error } = await supabase
        .from('onboarding_steps_progress')
        .upsert({
          process_id: processId,
          client_company_id: companyId,
          step_number: currentStep.step_number,
          completed: true,
          completed_at: new Date().toISOString(),
          notes: notes || null,
        }, {
          onConflict: 'process_id,client_company_id,step_number'
        });

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Pasul a fost marcat ca finalizat.',
      });

      // Update local state
      const updatedSteps = [...stepsProgress];
      updatedSteps[currentStepIndex].completed = true;
      updatedSteps[currentStepIndex].notes = notes;
      setStepsProgress(updatedSteps);
      setNotes('');

      // Move to next step or finish
      if (currentStepIndex < stepsProgress.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } catch (error: any) {
      console.error('Error completing step:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut salva progresul.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveForLater = () => {
    toast({
      title: 'Salvat',
      description: 'Progresul tău a fost salvat. Poți continua mai târziu.',
    });
    navigate('/app');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Se încarcă...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Proces de onboarding nu a fost găsit.</p>
            <Button className="w-full mt-4" onClick={() => navigate('/app')}>
              Înapoi la Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = stepsProgress[currentStepIndex];
  const completedSteps = stepsProgress.filter(s => s.completed).length;
  const progressPercentage = Math.round((completedSteps / stepsProgress.length) * 100);
  const allCompleted = completedSteps === stepsProgress.length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{process.process_name}</h1>
            <p className="text-muted-foreground">Completează pașii pentru a finaliza configurarea</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app')}>
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Progres General</CardTitle>
                <Badge variant={allCompleted ? "default" : "secondary"}>
                  {completedSteps} / {stepsProgress.length} pași
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {stepsProgress.map((step, index) => (
                <div key={step.step_number} className="flex items-center">
                  <button
                    onClick={() => setCurrentStepIndex(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      index === currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : step.completed
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span className="text-sm whitespace-nowrap">Pas {step.step_number}</span>
                  </button>
                  {index < stepsProgress.length - 1 && (
                    <div className="w-8 h-0.5 bg-border mx-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {allCompleted ? (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <CardTitle>Felicitări! Ai completat toate pașii</CardTitle>
              </div>
              <CardDescription>
                Procesul de onboarding a fost finalizat cu succes. Contabilul tău va fi notificat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/app')}>
                <Home className="h-4 w-4 mr-2" />
                Mergi la Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {currentStep.completed && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    Pasul {currentStep.step_number}: {currentStep.title}
                  </CardTitle>
                  <CardDescription className="mt-2">{currentStep.description}</CardDescription>
                </div>
                {currentStep.required && (
                  <Badge variant="destructive">Obligatoriu</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong>{' '}
                  {currentStep.type === 'form' && 'Formular de completat'}
                  {currentStep.type === 'upload' && 'Încărcare document'}
                  {currentStep.type === 'verification' && 'Verificare informații'}
                </p>
              </div>

              {!currentStep.completed && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notițe / Informații Suplimentare</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adaugă orice informații relevante pentru acest pas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {currentStep.completed && currentStep.notes && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-2">Notițe salvate:</p>
                  <p className="text-sm text-muted-foreground">{currentStep.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {currentStepIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Înapoi
                  </Button>
                )}

                {!currentStep.completed && (
                  <>
                    <Button
                      onClick={handleCompleteStep}
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? 'Se salvează...' : 'Marchează ca Finalizat'}
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSaveForLater}
                    >
                      Salvează pentru Mai Târziu
                    </Button>
                  </>
                )}

                {currentStep.completed && currentStepIndex < stepsProgress.length - 1 && (
                  <Button
                    onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                    className="flex-1"
                  >
                    Următorul Pas
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientOnboardingWizard;
