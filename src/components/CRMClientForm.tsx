import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CRMClientFormProps {
  clientId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  company_name: string;
  cui?: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  contact_person?: string;
  contact_email?: string;
  notes?: string;
  vat_payer: string;
  vat_regime?: string;
  tax_regime?: string;
  billing_cycle: string;
  client_status: string;
  client_category?: string;
}

export const CRMClientForm = ({ clientId, onSuccess, onCancel }: CRMClientFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<FormData>({
    defaultValues: {
      company_name: "",
      cui: "",
      registration_number: "",
      address: "",
      phone: "",
      contact_person: "",
      contact_email: "",
      notes: "",
      vat_payer: "nu",
      vat_regime: "nu",
      tax_regime: "impozit_pe_profit",
      billing_cycle: "anual",
      client_status: "active",
      client_category: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const companyData = {
        company_name: data.company_name,
        cui: data.cui,
        registration_number: data.registration_number,
        address: data.address,
        phone: data.phone,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        notes: data.notes,
        vat_payer: data.vat_payer === "da",
        vat_regime: data.vat_regime,
        tax_regime: data.tax_regime,
        billing_cycle: data.billing_cycle,
        client_status: data.client_status,
        client_category: data.client_category,
        user_id: user.id,
        managed_by_accountant_id: user.id,
        is_own_company: false,
        is_active: true,
      };

      if (clientId) {
        const { error } = await supabase
          .from("companies")
          .update(companyData)
          .eq("id", clientId);
        
        if (error) throw error;
        toast.success("Client actualizat cu succes!");
      } else {
        const { error } = await supabase
          .from("companies")
          .insert([companyData]);
        
        if (error) throw error;
        toast.success("Client adăugat cu succes!");
      }

      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "A apărut o eroare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company_name"
            rules={{ required: "Denumirea este obligatorie" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Denumire firmă *</FormLabel>
                <FormControl>
                  <Input placeholder="SC Exemplu SRL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Contact *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@firma.ro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cui"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CUI</FormLabel>
                <FormControl>
                  <Input placeholder="RO12345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Număr înregistrare</FormLabel>
                <FormControl>
                  <Input placeholder="J40/123/2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input placeholder="+40 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Persoană de contact</FormLabel>
                <FormControl>
                  <Input placeholder="Nume Prenume" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Adresă</FormLabel>
                <FormControl>
                  <Input placeholder="Str. Exemplu, Nr. 1, București" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-lg">Parametri Fiscali</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vat_payer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plătitor TVA</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nu">Nu</SelectItem>
                      <SelectItem value="da">Da</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vat_regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TVA la încasare</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nu">Nu</SelectItem>
                      <SelectItem value="da">Da</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax_regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip impozit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="impozit_pe_profit">Impozit pe profit</SelectItem>
                      <SelectItem value="impozit_pe_venit_micro">Impozit pe venit micro</SelectItem>
                      <SelectItem value="impozit_pe_profit_anticipat">Impozit pe profit - anticipat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dispunere situații financiare</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="semestrial">Semestrial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="inactive">Inactiv</SelectItem>
                      <SelectItem value="suspended">Suspendat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="microintreprindere">Microîntreprindere</SelectItem>
                      <SelectItem value="imm">IMM</SelectItem>
                      <SelectItem value="mare_contribuabil">Mare contribuabil</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notițe</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Notițe suplimentare despre client..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Anulează
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {clientId ? "Actualizează" : "Adaugă"} Client
          </Button>
        </div>
      </form>
    </Form>
  );
};
