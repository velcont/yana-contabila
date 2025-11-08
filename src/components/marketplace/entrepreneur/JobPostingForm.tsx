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
  contact_email: string;
  contact_phone: string;
  prefer_email: boolean;
  prefer_whatsapp: boolean;
  prefer_phone: boolean;
}

export const JobPostingForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasCompanyData, setHasCompanyData] = useState(false);
  
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
      
      try {
        // Caută prima companie a user-ului
        const { data: companies, error } = await supabase
          .from('companies')
          .select('company_name, cui')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (error) {
          console.error('Error fetching company:', error);
          toast({
            title: "⚠️ Atenție",
            description: "Nu am putut încărca datele companiei. Completează manual.",
            variant: "destructive",
          });
          return;
        }
        
        // Dacă există companie, auto-populează
        if (companies && companies.length > 0) {
          setValue('company_name', companies[0].company_name || '');
          setValue('cui', companies[0].cui || '');
          setHasCompanyData(true); // Marchează că avem date
          console.log('✅ Company data loaded:', companies[0]);
        }
        
        // Pre-populate contact email from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        
        if (profile?.email) {
          setValue('contact_email', profile.email);
        }
        
        if (!companies || companies.length === 0) {
          // Dacă nu există companii, notifică user-ul
          toast({
            title: "ℹ️ Completează datele",
            description: "Nu ai nicio companie înregistrată. Adaugă datele manual.",
          });
          console.log('ℹ️ No company data found for user');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };
    
    fetchCompanyData();
  }, [user, setValue, toast]);

  const onSubmit = async (data: JobPostingFormData) => {
    console.log('📝 Form data:', data);
    console.log('👤 User ID:', user?.id);
    
    // 1. VERIFICARE USER LOGAT
    if (!user?.id) {
      toast({
        title: "❌ Nu ești autentificat",
        description: "Trebuie să te loghezi pentru a posta anunțuri.",
        variant: "destructive",
      });
      return;
    }
    
    // 2. VERIFICARE SUBSCRIPTION_TYPE din DB
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_status, email')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Profile fetch error:', profileError);
      toast({
        title: "❌ Eroare la verificare profil",
        description: "Nu am putut verifica tipul de cont. Reîncearcă.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('👤 Profile verified:', profile);
    
    // 3. VERIFICARE ANTREPRENOR
    if (profile.subscription_type !== 'entrepreneur') {
      toast({
        title: "❌ Acces refuzat",
        description: `Doar antreprenorii pot posta anunțuri. Contul tău (${profile.email}) este de tip: ${profile.subscription_type}`,
        variant: "destructive",
        duration: 10000,
      });
      return;
    }
    
    // 4. VERIFICARE ABONAMENT ACTIV
    if (profile.subscription_status !== 'active') {
      toast({
        title: "❌ Abonament inactiv",
        description: "Trebuie să ai un abonament activ pentru a posta anunțuri.",
        variant: "destructive",
      });
      return;
    }
    
    // 5. VALIDARE BUDGET
    if (data.budget_max < data.budget_min) {
      toast({
        title: "❌ Eroare validare",
        description: "Bugetul maxim trebuie să fie mai mare decât minimul",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('📤 Inserting job posting...');
      
      // 6. INSERT CU .select().single() PENTRU A PRIMI DATELE ÎNAPOI
      const { data: newPosting, error } = await supabase
        .from('job_postings')
        .insert({
          user_id: user.id,
          company_name: data.company_name,
          cui: data.cui,
          is_vat_payer: data.is_vat_payer,
          tax_type: data.tax_type,
          documents_per_month: data.documents_per_month,
          employees_count: data.employees_count,
          budget_min: data.budget_min,
          budget_max: data.budget_max,
          special_requirements: data.special_requirements,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          prefer_email: data.prefer_email,
          prefer_whatsapp: data.prefer_whatsapp,
          prefer_phone: data.prefer_phone,
          status: 'active',
          offers_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase INSERT error:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        
        // 7. DETECTARE RLS POLICY VIOLATION
        if (error.code === '42501' || error.message.includes('policy')) {
          toast({
            title: "❌ Eroare permisiuni RLS",
            description: `Nu ai permisiunea de a posta anunțuri. Verifică că ești logat ca ANTREPRENOR activ. Cod eroare: ${error.code}`,
            variant: "destructive",
            duration: 10000,
          });
          return;
        }
        
        // 8. ALTE ERORI
        toast({
          title: "❌ Eroare la salvare",
          description: `${error.message} (Cod: ${error.code || 'N/A'})`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
      
      if (!newPosting) {
        toast({
          title: "❌ Eroare necunoscută",
          description: "Anunțul nu s-a salvat, dar nu există eroare.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Job posted successfully:', newPosting);

      // 9. TOAST DE SUCCES
      toast({
        title: "✅ Anunț postat cu succes!",
        description: "Contabilii vor primi notificare și vor putea trimite oferte.",
        duration: 5000,
      });

      // 10. NOTIFICARE CONTABILI - DOAR DUPĂ SUCCES
      console.log('📧 Sending notifications to accountants...');
      const { data: notifData, error: notifError } = await supabase.functions.invoke(
        'send-marketplace-notification',
        {
          body: {
            type: 'new_job_posting',
            data: {
              job_posting_id: newPosting.id,
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
        }
      );
      
      if (notifError) {
        console.error('❌ Notification error:', notifError);
        toast({
          title: "⚠️ Atenție",
          description: "Anunțul s-a salvat, dar notificările către contabili au eșuat.",
          variant: "default",
        });
      } else {
        console.log('✅ Notifications sent:', notifData);
        toast({
          title: "📧 Notificări trimise",
          description: `${notifData?.notified || 0} contabili au fost notificați.`,
          duration: 5000,
        });
      }
      
      // 11. ÎNCHIDE DIALOG-UL
      onSuccess();
      
    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast({
        title: "❌ Eroare neașteptată",
        description: error.message || "A apărut o eroare. Verifică consola.",
        variant: "destructive",
        duration: 8000,
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
          <Input 
            {...register('company_name', { required: true })} 
            disabled={hasCompanyData}
            className={hasCompanyData ? "bg-muted" : ""}
            placeholder="ex: SC EXEMPLU SRL"
          />
        </div>
        <div>
          <Label>CUI</Label>
          <Input 
            {...register('cui', { required: true })} 
            disabled={hasCompanyData}
            className={hasCompanyData ? "bg-muted" : ""}
            placeholder="ex: RO12345678"
          />
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

      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">📞 Informații Contact (OBLIGATORIU)</h4>
        <p className="text-sm text-green-700 mb-4">
          Contabilii vor vedea aceste date în anunțul tău.
          <br />
          <span className="font-medium">Poți folosi un email/telefon diferit de cel de login.</span>
        </p>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Email contact *</Label>
            <Input 
              type="email"
              {...register('contact_email', { 
                required: "Email-ul este obligatoriu",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email invalid"
                }
              })}
              placeholder="ex: director@firma.ro"
              className="mt-1"
            />
            {errors.contact_email && (
              <p className="text-sm text-destructive mt-1">{errors.contact_email.message}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Telefon contact *</Label>
            <Input 
              type="tel"
              {...register('contact_phone', { 
                required: "Telefonul este obligatoriu",
                pattern: {
                  value: /^[0-9\s\+\-\(\)]{10,15}$/,
                  message: "Număr invalid (10-15 cifre)"
                }
              })}
              placeholder="ex: 0740123456"
              className="mt-1"
            />
            {errors.contact_phone && (
              <p className="text-sm text-destructive mt-1">{errors.contact_phone.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-green-200">
          <Label className="text-sm font-medium mb-2 block text-green-900">Prefer să fiu contactat prin:</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email" 
                checked={watch('prefer_email')}
                onCheckedChange={(checked) => setValue('prefer_email', !!checked)}
              />
              <Label htmlFor="email" className="text-green-900">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="whatsapp"
                checked={watch('prefer_whatsapp')}
                onCheckedChange={(checked) => setValue('prefer_whatsapp', !!checked)}
              />
              <Label htmlFor="whatsapp" className="text-green-900">WhatsApp</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="phone"
                checked={watch('prefer_phone')}
                onCheckedChange={(checked) => setValue('prefer_phone', !!checked)}
              />
              <Label htmlFor="phone" className="text-green-900">Telefon</Label>
            </div>
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
