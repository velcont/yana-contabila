import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SendOfferFormData {
  price_per_month: number;
  message: string;
  service_contabilitate: boolean;
  service_tva: boolean;
  service_salarii: boolean;
  service_declaratii: boolean;
  service_consultanta: boolean;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp?: string;
}

interface SendOfferFormProps {
  job: {
    id: string;
    company_name: string;
    budget_min: number;
    budget_max: number;
  };
  onSuccess: () => void;
}

export const SendOfferForm = ({ job, onSuccess }: SendOfferFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accountantProfile, setAccountantProfile] = useState<any>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SendOfferFormData>({
    defaultValues: {
      price_per_month: job.budget_min,
      service_contabilitate: true,
      service_tva: true,
      service_salarii: true,
      service_declaratii: false,
      service_consultanta: false,
    }
  });

  useEffect(() => {
    const checkOrCreateProfile = async () => {
      if (!user?.id) return;

      const { data: existing } = await supabase
        .from('accountant_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        await supabase.from('accountant_profiles').insert({
          user_id: user.id,
          firm_name: profile?.full_name || 'Cabinet Contabilitate',
          location: '',
          years_experience: 5,
          specializations: ['contabilitate', 'tva', 'salarii'],
        });
        
        // Pre-populate contact email
        setValue('contact_email', profile?.email || '');
      } else {
        // Pre-populate contact email from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        setValue('contact_email', profile?.email || '');
      }

      setAccountantProfile(existing || { firm_name: 'Cabinet Contabilitate' });
    };

    checkOrCreateProfile();
  }, [user, setValue]);

  const onSubmit = async (data: SendOfferFormData) => {
    setLoading(true);
    
    try {
      const servicesIncluded = [];
      if (data.service_contabilitate) servicesIncluded.push('contabilitate');
      if (data.service_tva) servicesIncluded.push('tva');
      if (data.service_salarii) servicesIncluded.push('salarii');
      if (data.service_declaratii) servicesIncluded.push('declaratii');
      if (data.service_consultanta) servicesIncluded.push('consultanta');

      const { error: offerError } = await supabase
        .from('job_offers')
        .insert({
          job_posting_id: job.id,
          accountant_id: user?.id,
          price_per_month: data.price_per_month,
          services_included: servicesIncluded,
          message: data.message,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          contact_whatsapp: data.contact_whatsapp || null,
          status: 'pending',
        });

      if (offerError) throw offerError;

      const { data: jobData } = await supabase
        .from('job_postings')
        .select('user_id')
        .eq('id', job.id)
        .single();

      await supabase.functions.invoke('send-marketplace-notification', {
        body: {
          type: 'new_offer',
          data: {
            entrepreneur_id: jobData?.user_id,
            accountant_name: accountantProfile?.firm_name || 'Contabil',
            price_per_month: data.price_per_month,
            services_included: servicesIncluded,
            message: data.message,
          }
        }
      });

      toast({
        title: "✅ Ofertă trimisă!",
        description: "Antreprenorul va primi notificare și îți va răspunde curând.",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error sending offer:', error);
      toast({
        title: "❌ Eroare",
        description: error.message || "Nu s-a putut trimite oferta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm">
          <span className="font-medium">Companie:</span> {job.company_name}
        </p>
        <p className="text-sm">
          <span className="font-medium">Buget:</span> {job.budget_min} - {job.budget_max} RON/lună
        </p>
      </div>

      <div>
        <Label>Prețul ofertat (RON/lună) *</Label>
        <Input 
          type="number" 
          {...register('price_per_month', { 
            required: true,
            min: 1,
            valueAsNumber: true 
          })}
          placeholder={`ex: ${job.budget_min}`}
        />
        {errors.price_per_month && (
          <p className="text-sm text-destructive mt-1">Prețul este obligatoriu</p>
        )}
      </div>

      <div>
        <Label>Servicii incluse</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="service_contabilitate"
              checked={watch('service_contabilitate')}
              onCheckedChange={(checked) => setValue('service_contabilitate', !!checked)}
            />
            <Label htmlFor="service_contabilitate">Contabilitate primară</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="service_tva"
              checked={watch('service_tva')}
              onCheckedChange={(checked) => setValue('service_tva', !!checked)}
            />
            <Label htmlFor="service_tva">TVA</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="service_salarii"
              checked={watch('service_salarii')}
              onCheckedChange={(checked) => setValue('service_salarii', !!checked)}
            />
            <Label htmlFor="service_salarii">Salarizare (RU)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="service_declaratii"
              checked={watch('service_declaratii')}
              onCheckedChange={(checked) => setValue('service_declaratii', !!checked)}
            />
            <Label htmlFor="service_declaratii">Declarații fiscale</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="service_consultanta"
              checked={watch('service_consultanta')}
              onCheckedChange={(checked) => setValue('service_consultanta', !!checked)}
            />
            <Label htmlFor="service_consultanta">Consultanță fiscală</Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Mesajul tău pentru antreprenor *</Label>
        <Textarea 
          {...register('message', { required: true, minLength: 50 })}
          placeholder="Descrie experiența ta, de ce ești potrivit pentru acest client, ce beneficii oferi..."
          rows={5}
        />
        {errors.message && (
          <p className="text-sm text-destructive mt-1">
            Mesajul trebuie să aibă minim 50 caractere
          </p>
        )}
      </div>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📞 Informații Contact (OBLIGATORIU)</h4>
        <p className="text-sm text-blue-700 mb-4">
          Antreprenorul va vedea aceste date în oferta ta.
          <br />
          <span className="font-medium">Poți folosi un email/telefon diferit de cel de login.</span>
        </p>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-blue-900">Email contact *</Label>
            <Input 
              type="email"
              {...register('contact_email', { 
                required: "Email-ul este obligatoriu",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email invalid"
                }
              })}
              placeholder="ex: firma@contabilitate.ro"
              className="mt-1"
            />
            {errors.contact_email && (
              <p className="text-sm text-destructive mt-1">{errors.contact_email.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Preferat: email-ul firmei tale (nu cel personal)
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-blue-900">Telefon contact *</Label>
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

          <div>
            <Label className="text-sm font-medium text-blue-900">WhatsApp (opțional)</Label>
            <Input 
              type="tel"
              {...register('contact_whatsapp')}
              placeholder="ex: 0740123456 (dacă e diferit de telefon)"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lasă gol dacă folosești același număr ca pentru telefon
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Anulează
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Se trimite...' : 'Trimite Ofertă'}
        </Button>
      </div>
    </form>
  );
};
