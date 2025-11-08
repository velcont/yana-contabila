import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface JobPostingFormData {
  company_name: string;
  cui: string;
  is_vat_payer: boolean;
  tax_type: 'microenterprise' | 'profit' | 'other';
  documents_per_month: string;
  employees_count: string;
  budget_min: number;
  budget_max: number;
  special_requirements: string;
  prefer_email: boolean;
  prefer_whatsapp: boolean;
  prefer_phone: boolean;
}

export const JobPostingForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<JobPostingFormData>({
    defaultValues: {
      is_vat_payer: false,
      tax_type: 'profit',
      documents_per_month: '50-100',
      employees_count: '1-5',
      prefer_email: true,
      prefer_whatsapp: false,
      prefer_phone: false,
    }
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user?.id) return;
      
      const { data: companies } = await supabase
        .from('companies')
        .select('company_name, cui')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (companies) {
        setValue('company_name', companies.company_name || '');
        setValue('cui', companies.cui || '');
      }
    };
    
    fetchCompanyData();
  }, [user, setValue]);

  const onSubmit = async (data: JobPostingFormData) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('job_postings')
        .insert({
          user_id: user?.id,
          ...data,
          status: 'active',
          offers_count: 0,
        });

      if (error) throw error;

      toast({
        title: "✅ Anunț postat cu succes!",
        description: "Contabilii vor primi notificare și vor putea trimite oferte.",
      });

      await supabase.functions.invoke('send-marketplace-notification', {
        body: {
          type: 'new_job_posting',
          data: {
            company_name: data.company_name,
            cui: data.cui,
            is_vat_payer: data.is_vat_payer,
            tax_type: data.tax_type,
            documents_per_month: data.documents_per_month,
            employees_count: data.employees_count,
            budget_min: data.budget_min,
            budget_max: data.budget_max,
            special_requirements: data.special_requirements,
          }
        }
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error posting job:', error);
      toast({
        title: "❌ Eroare",
        description: error.message || "Nu s-a putut posta anunțul",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Companie</Label>
          <Input {...register('company_name', { required: true })} disabled className="bg-muted" />
        </div>
        <div>
          <Label>CUI</Label>
          <Input {...register('cui', { required: true })} disabled className="bg-muted" />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="is_vat_payer" 
          checked={watch('is_vat_payer')}
          onCheckedChange={(checked) => setValue('is_vat_payer', !!checked)}
        />
        <Label htmlFor="is_vat_payer">Platitor TVA</Label>
      </div>

      <div>
        <Label>Regim impozitare</Label>
        <RadioGroup 
          defaultValue="profit"
          onValueChange={(value) => setValue('tax_type', value as any)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="microenterprise" id="micro" />
            <Label htmlFor="micro">Microîntreprindere</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="profit" id="profit" />
            <Label htmlFor="profit">Impozit pe profit</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="other" id="other" />
            <Label htmlFor="other">Altul</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Documente procesate/lună (estimare)</Label>
        <RadioGroup
          defaultValue="50-100"
          onValueChange={(value) => setValue('documents_per_month', value)}
        >
          {['<50', '50-100', '100-200', '200-500', '>500'].map((range) => (
            <div key={range} className="flex items-center space-x-2">
              <RadioGroupItem value={range} id={`doc-${range}`} />
              <Label htmlFor={`doc-${range}`}>{range}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label>Număr angajați</Label>
        <RadioGroup
          defaultValue="1-5"
          onValueChange={(value) => setValue('employees_count', value)}
        >
          {['0', '1-5', '6-10', '>10'].map((range) => (
            <div key={range} className="flex items-center space-x-2">
              <RadioGroupItem value={range} id={`emp-${range}`} />
              <Label htmlFor={`emp-${range}`}>{range === '0' ? 'Fără angajați' : range}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Buget minim (RON/lună)</Label>
          <Input 
            type="number" 
            {...register('budget_min', { 
              required: true,
              min: 0,
              valueAsNumber: true 
            })}
            placeholder="ex: 300"
          />
        </div>
        <div>
          <Label>Buget maxim (RON/lună)</Label>
          <Input 
            type="number" 
            {...register('budget_max', { 
              required: true,
              min: 0,
              valueAsNumber: true 
            })}
            placeholder="ex: 500"
          />
        </div>
      </div>

      <div>
        <Label>Cerințe speciale (opțional)</Label>
        <Textarea 
          {...register('special_requirements')}
          placeholder="ex: Experiență cu comerț exterior, declarații Intrastat..."
          rows={3}
        />
      </div>

      <div>
        <Label>Prefer contact prin:</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="email" 
              checked={watch('prefer_email')}
              onCheckedChange={(checked) => setValue('prefer_email', !!checked)}
            />
            <Label htmlFor="email">Email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="whatsapp"
              checked={watch('prefer_whatsapp')}
              onCheckedChange={(checked) => setValue('prefer_whatsapp', !!checked)}
            />
            <Label htmlFor="whatsapp">WhatsApp</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="phone"
              checked={watch('prefer_phone')}
              onCheckedChange={(checked) => setValue('prefer_phone', !!checked)}
            />
            <Label htmlFor="phone">Telefon</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Anulează
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Se postează...' : 'Postează Anunț'}
        </Button>
      </div>
    </form>
  );
};
