import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Plus, CheckCircle2, Clock, Star, Trash2 } from 'lucide-react';

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
  is_default: boolean;
  created_at: string;
}

interface ClientProgress {
  company_id: string;
  company_name: string;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  last_activity: string | null;
}

interface StepFormData {
  step_number: number;
  title: string;
  description: string;
  required: boolean;
  type: 'form' | 'upload' | 'verification';
}

export function OnboardingTracker() {
  const [processes, setProcesses] = useState<OnboardingProcess[]>([]);
  const [clientProgress, setClientProgress] = useState<ClientProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [processName, setProcessName] = useState('');
  const [steps, setSteps] = useState<StepFormData[]>([
    { step_number: 1, title: '', description: '', required: true, type: 'form' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProcesses();
    fetchClientProgress();
  }, []);

  const fetchProcesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('onboarding_processes')
        .select('*')
        .eq('accountant_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcesses((data || []) as unknown as OnboardingProcess[]);
    } catch (error: any) {
      console.error('Error fetching processes:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca procesele de onboarding.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all companies managed by this accountant
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('managed_by_accountant_id', user.id);

      if (companiesError) throw companiesError;

      // Fetch progress for each company
      const progressData: ClientProgress[] = [];
      for (const company of companies || []) {
        const { data: progress, error: progressError } = await supabase
          .from('onboarding_steps_progress')
          .select('*')
          .eq('client_company_id', company.id);

        if (progressError) {
          console.error('Error fetching progress for company:', company.id, progressError);
          continue;
        }

        if (progress && progress.length > 0) {
          const totalSteps = progress.length;
          const completedSteps = progress.filter(p => p.completed).length;
          const lastActivity = progress
            .filter(p => p.completed_at)
            .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]?.completed_at || null;

          progressData.push({
            company_id: company.id,
            company_name: company.company_name,
            total_steps: totalSteps,
            completed_steps: completedSteps,
            progress_percentage: Math.round((completedSteps / totalSteps) * 100),
            last_activity: lastActivity,
          });
        }
      }

      setClientProgress(progressData);
    } catch (error: any) {
      console.error('Error fetching client progress:', error);
    }
  };

  const handleCreateProcess = async () => {
    if (!processName || steps.some(s => !s.title || !s.description)) {
      toast({
        title: 'Validare',
        description: 'Completează toate câmpurile pentru fiecare pas.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const { error } = await supabase.from('onboarding_processes').insert([{
        accountant_id: user.id,
        process_name: processName,
        steps: steps as any,
        is_default: processes.length === 0,
      }]);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Procesul de onboarding a fost creat.',
      });

      setCreateDialogOpen(false);
      setProcessName('');
      setSteps([{ step_number: 1, title: '', description: '', required: true, type: 'form' }]);
      fetchProcesses();
    } catch (error: any) {
      console.error('Error creating process:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut crea procesul.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetAsDefault = async (processId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, unset all defaults
      await supabase
        .from('onboarding_processes')
        .update({ is_default: false })
        .eq('accountant_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('onboarding_processes')
        .update({ is_default: true })
        .eq('id', processId);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Procesul a fost setat ca implicit.',
      });

      fetchProcesses();
    } catch (error: any) {
      console.error('Error setting default:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza procesul.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProcess = async (processId: string) => {
    if (!confirm('Sigur vrei să ștergi acest proces? Această acțiune nu poate fi anulată.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('onboarding_processes')
        .delete()
        .eq('id', processId);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Procesul a fost șters.',
      });

      fetchProcesses();
    } catch (error: any) {
      console.error('Error deleting process:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge procesul.',
        variant: 'destructive',
      });
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      step_number: steps.length + 1,
      title: '',
      description: '',
      required: false,
      type: 'form'
    }]);
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, idx) => {
      step.step_number = idx + 1;
    });
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof StepFormData, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Se încarcă...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="progress">Progres Clienți</TabsTrigger>
          <TabsTrigger value="templates">Șabloane Procese</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {clientProgress.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Nu există clienți în procesul de onboarding momentan.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientProgress.map((client) => (
                <Card key={client.company_id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{client.company_name}</CardTitle>
                    <CardDescription>
                      {client.completed_steps} din {client.total_steps} pași completați
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progres</span>
                        <span className="font-medium">{client.progress_percentage}%</span>
                      </div>
                      <Progress value={client.progress_percentage} className="h-2" />
                    </div>

                    {client.last_activity && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Ultima activitate: {new Date(client.last_activity).toLocaleDateString('ro-RO')}</span>
                      </div>
                    )}

                    {client.progress_percentage === 100 && (
                      <Badge variant="outline" className="w-fit gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Finalizat
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Șabloane de Onboarding</CardTitle>
                  <CardDescription>Creează și gestionează procesele de onboarding</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Proces Nou
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Creează Proces de Onboarding</DialogTitle>
                      <DialogDescription>
                        Definește pașii pe care noii clienți trebuie să îi completeze
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="processName">Nume Proces</Label>
                        <Input
                          id="processName"
                          placeholder="ex: Onboarding Clienți Noi"
                          value={processName}
                          onChange={(e) => setProcessName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Pași Onboarding</Label>
                          <Button size="sm" variant="outline" onClick={addStep}>
                            <Plus className="h-3 w-3 mr-1" />
                            Adaugă Pas
                          </Button>
                        </div>

                        {steps.map((step, index) => (
                          <Card key={index}>
                            <CardContent className="pt-6 space-y-4">
                              <div className="flex items-start justify-between">
                                <Label className="text-sm font-semibold">Pasul {step.step_number}</Label>
                                {steps.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeStep(index)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`title-${index}`}>Titlu</Label>
                                <Input
                                  id={`title-${index}`}
                                  placeholder="ex: Completare Date Firmă"
                                  value={step.title}
                                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`description-${index}`}>Descriere</Label>
                                <Textarea
                                  id={`description-${index}`}
                                  placeholder="Descrie ce trebuie să facă clientul..."
                                  value={step.description}
                                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                                  rows={2}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`type-${index}`}>Tip</Label>
                                  <Select
                                    value={step.type}
                                    onValueChange={(value) => updateStep(index, 'type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="form">Formular</SelectItem>
                                      <SelectItem value="upload">Încărcare Document</SelectItem>
                                      <SelectItem value="verification">Verificare</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-end">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`required-${index}`}
                                      checked={step.required}
                                      onCheckedChange={(checked) =>
                                        updateStep(index, 'required', checked)
                                      }
                                    />
                                    <Label htmlFor={`required-${index}`}>Obligatoriu</Label>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleCreateProcess}
                          disabled={submitting}
                          className="flex-1"
                        >
                          {submitting ? 'Se creează...' : 'Creează Proces'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCreateDialogOpen(false)}
                        >
                          Anulează
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {processes.length === 0 ? (
                <p className="text-muted-foreground">Nu ai creat niciun proces de onboarding încă.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume Proces</TableHead>
                      <TableHead>Pași</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Creare</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-medium">{process.process_name}</TableCell>
                        <TableCell>{process.steps.length} pași</TableCell>
                        <TableCell>
                          {process.is_default ? (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              Implicit
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactiv</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(process.created_at).toLocaleDateString('ro-RO')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!process.is_default && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetAsDefault(process.id)}
                              >
                                Setează Implicit
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProcess(process.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
