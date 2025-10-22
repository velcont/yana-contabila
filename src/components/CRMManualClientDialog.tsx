import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { z } from "zod";

// Validation schema
const manualClientSchema = z.object({
  company_name: z.string().trim().min(1, { message: "Numele firmei este obligatoriu" }),
  cif: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email({ message: "Email invalid" }).min(1, { message: "Email-ul este obligatoriu" }),
  full_name: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  vat_payer: z.boolean(),
  tax_type: z.enum(["micro", "profit", "dividend", "norma_venit"]),
  notes: z.string().trim().optional().or(z.literal("")),
});

interface CRMManualClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CRMManualClientDialog = ({ open, onOpenChange, onSuccess }: CRMManualClientDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    cif: "",
    email: "",
    full_name: "",
    phone: "",
    address: "",
    vat_payer: false,
    tax_type: "micro" as "micro" | "profit" | "dividend" | "norma_venit",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      company_name: "",
      cif: "",
      email: "",
      full_name: "",
      phone: "",
      address: "",
      vat_payer: false,
      tax_type: "micro",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = manualClientSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      // Check if email already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", validatedData.email)
        .maybeSingle();

      let clientUserId: string;

      if (existingProfile) {
        // User already exists, just create company
        clientUserId = existingProfile.id;
        toast({
          title: "Utilizator existent",
          description: "Un cont cu acest email există deja. S-a creat doar firma.",
          variant: "default",
        });
      } else {
        // Create new user account WITHOUT password (admin-created)
        const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
          email: validatedData.email,
          email_confirm: true,
          user_metadata: {
            full_name: validatedData.full_name || validatedData.company_name,
            subscription_type: "entrepreneur",
            created_by_accountant: true,
            accountant_id: user.id,
          },
        });

        if (signUpError) throw signUpError;
        if (!newUser.user) throw new Error("Eroare la crearea contului");

        clientUserId = newUser.user.id;

        // Profile is created automatically via trigger, but update it with additional info
        await supabase
          .from("profiles")
          .update({
            full_name: validatedData.full_name || validatedData.company_name,
            phone: validatedData.phone || null,
          })
          .eq("id", clientUserId);
      }

      // Create company
      const { error: companyError } = await supabase
        .from("companies")
        .insert({
          company_name: validatedData.company_name,
          cif: validatedData.cif || null,
          vat_payer: validatedData.vat_payer,
          tax_type: validatedData.tax_type,
          address: validatedData.address || null,
          phone: validatedData.phone || null,
          contact_person: validatedData.full_name || null,
          contact_email: validatedData.email,
          notes: validatedData.notes || null,
          user_id: clientUserId,
        });

      if (companyError) throw companyError;

      toast({
        title: "Client adăugat cu succes!",
        description: existingProfile 
          ? "Firma a fost asociată contului existent."
          : "Un cont nou a fost creat pentru client. Clientul va primi un email pentru a-și seta parola.",
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding manual client:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Date invalide",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare",
          description: error.message || "Nu s-a putut adăuga clientul",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adaugă Client Manual</DialogTitle>
          <DialogDescription>
            Creează un cont nou pentru client fără a trimite invitație prin email
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nume Firmă *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="SC Exemplu SRL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif">CIF</Label>
              <Input
                id="cif"
                value={formData.cif}
                onChange={(e) => setFormData({ ...formData, cif: e.target.value.toUpperCase() })}
                placeholder="RO12345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Client *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@firma.ro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nume Persoană Contact</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ion Popescu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+40 721 234 567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_type">Tip Impozitare</Label>
              <Select
                value={formData.tax_type}
                onValueChange={(value: any) => setFormData({ ...formData, tax_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Microîntreprindere</SelectItem>
                  <SelectItem value="profit">Impozit pe Profit</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                  <SelectItem value="norma_venit">Normă de Venit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresă</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Str. Exemplu nr. 1, București"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="vat_payer"
              checked={formData.vat_payer}
              onCheckedChange={(checked) => setFormData({ ...formData, vat_payer: checked })}
            />
            <Label htmlFor="vat_payer">Plătitor TVA</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notițe</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informații adiționale despre client..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adaugă Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
