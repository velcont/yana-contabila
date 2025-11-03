import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton-loader";
import { ContextualHelp, helpContent } from "@/components/ContextualHelp";
import { useCRMSelection } from "@/contexts/CRMContext";
import { Checkbox } from "@/components/ui/checkbox";

// Validation schema for company data
const companySchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, { message: "Numele firmei este obligatoriu" })
    .max(255, { message: "Numele firmei nu poate depăși 255 caractere" }),
  cif: z.string()
    .trim()
    .max(50, { message: "CIF-ul nu poate depăși 50 caractere" })
    .regex(/^[A-Z0-9]*$/, { message: "CIF-ul poate conține doar litere mari și cifre" })
    .optional()
    .or(z.literal("")),
  registration_number: z.string()
    .trim()
    .max(100, { message: "Numărul de înregistrare nu poate depăși 100 caractere" })
    .optional()
    .or(z.literal("")),
  address: z.string()
    .trim()
    .max(500, { message: "Adresa nu poate depăși 500 caractere" })
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .trim()
    .max(20, { message: "Numărul de telefon nu poate depăși 20 caractere" })
    .regex(/^[\d\s\+\-\(\)]*$/, { message: "Număr de telefon invalid" })
    .optional()
    .or(z.literal("")),
  contact_person: z.string()
    .trim()
    .max(255, { message: "Numele persoanei de contact nu poate depăși 255 caractere" })
    .optional()
    .or(z.literal("")),
  contact_email: z.string()
    .trim()
    .email({ message: "Email invalid" })
    .max(255, { message: "Email-ul nu poate depăși 255 caractere" })
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .trim()
    .max(2000, { message: "Notițele nu pot depăși 2000 caractere" })
    .optional()
    .or(z.literal("")),
  vat_payer: z.boolean(),
  tax_type: z.enum(["micro", "profit", "dividend", "norma_venit"])
});

interface Company {
  id: string;
  company_name: string;
  cif: string;
  vat_payer: boolean;
  tax_type: string;
  registration_number: string;
  address: string;
  phone: string;
  contact_person: string;
  notes: string;
  created_at: string;
}

export const CompanyManager = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [filterVat, setFilterVat] = useState<string>("all");
  const [filterTaxType, setFilterTaxType] = useState<string>("all");
  const { toast } = useToast();
  const { selectedCompanies, toggleCompany, selectAllCompanies } = useCRMSelection();

  const [formData, setFormData] = useState({
    company_name: "",
    cif: "",
    vat_payer: false,
    tax_type: "micro",
    registration_number: "",
    address: "",
    phone: "",
    contact_person: "",
    contact_email: "",
    notes: "",
  });

  useEffect(() => {
    fetchCompanies();

    // Set up Supabase Realtime subscription for automatic updates (fix audit 1.1)
    const channel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        (payload) => {
          console.log('📡 Realtime: companies changed', payload);
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[CompanyManager] Submit started', { 
      isEditing: !!editingCompany, 
      formData 
    });
    
    try {
      // Validate form data using zod schema
      const validatedData = companySchema.parse(formData);
      console.log('[CompanyManager] Validation passed', validatedData);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[CompanyManager] User not authenticated');
        throw new Error("Nu ești autentificat");
      }

      if (editingCompany) {
        console.log('[CompanyManager] Updating company', editingCompany.id);
        const { error } = await supabase
          .from("companies")
          .update({
            company_name: validatedData.company_name,
            cif: validatedData.cif || null,
            vat_payer: validatedData.vat_payer,
            tax_type: validatedData.tax_type,
            registration_number: validatedData.registration_number || null,
            address: validatedData.address || null,
            phone: validatedData.phone || null,
            contact_person: validatedData.contact_person || null,
            contact_email: validatedData.contact_email || null,
            notes: validatedData.notes || null,
          })
          .eq("id", editingCompany.id);

        if (error) {
          console.error('[CompanyManager] Update error:', error);
          throw error;
        }
        console.log('[CompanyManager] Company updated successfully');
        toast({ 
          title: "✅ Succes", 
          description: "Firmă actualizată cu succes!",
          variant: "default"
        });
      } else {
        console.log('[CompanyManager] Creating new company');
        const { error } = await supabase
          .from("companies")
          .insert([{ 
            company_name: validatedData.company_name,
            cif: validatedData.cif || null,
            vat_payer: validatedData.vat_payer,
            tax_type: validatedData.tax_type,
            registration_number: validatedData.registration_number || null,
            address: validatedData.address || null,
            phone: validatedData.phone || null,
            contact_person: validatedData.contact_person || null,
            contact_email: validatedData.contact_email || null,
            notes: validatedData.notes || null,
            user_id: user.id 
          }]);

        if (error) {
          console.error('[CompanyManager] Insert error:', error);
          throw error;
        }
        console.log('[CompanyManager] Company created successfully');
        toast({ 
          title: "✅ Succes", 
          description: "Firmă adăugată cu succes!",
          variant: "default"
        });
      }

      console.log('[CompanyManager] Closing dialog and refreshing list');
      setIsDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('[CompanyManager] Submit error:', error);
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const firstError = error.errors[0];
        console.error('[CompanyManager] Validation error:', firstError);
        toast({
          title: "❌ Date invalide",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Eroare la salvare",
          description: error.message || "Verifică datele și încearcă din nou",
          variant: "destructive",
        });
      }
      // DO NOT close dialog on error - let user fix the issue
    }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Firmă ștearsă cu succes!" });
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      cif: "",
      vat_payer: false,
      tax_type: "micro",
      registration_number: "",
      address: "",
      phone: "",
      contact_person: "",
      contact_email: "",
      notes: "",
    });
    setEditingCompany(null);
  };

  const openEditDialog = (company: Company) => {
    console.log('[CompanyManager] Opening edit dialog for company:', company);
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name || "",
      cif: company.cif || "",
      vat_payer: company.vat_payer || false,
      tax_type: company.tax_type || "micro",
      registration_number: company.registration_number || "",
      address: company.address || "",
      phone: company.phone || "",
      contact_person: company.contact_person || "",
      contact_email: (company as any).contact_email || "",
      notes: company.notes || "",
    });
    setIsDialogOpen(true);
    console.log('[CompanyManager] Edit dialog opened, form data:', formData);
  };

  const filteredCompanies = companies.filter((company) => {
    if (filterVat !== "all" && company.vat_payer.toString() !== filterVat) return false;
    if (filterTaxType !== "all" && company.tax_type !== filterTaxType) return false;
    return true;
  });

  const getTaxTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      profit: "Impozit pe Profit",
      micro: "Microîntreprindere",
      dividend: "Dividend",
      norma_venit: "Normă de Venit",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6 animate-appear">
      {loading ? (
        <SkeletonTable />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <Building2 className="h-8 w-8" />
                  Gestionare Firme
                </h2>
                <p className="text-muted-foreground mt-1">
                  Administrează datele firmelor tale
                </p>
              </div>
              <ContextualHelp 
                title="Gestionare Clienți"
                content={helpContent.crm.clients.content}
              />
            </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          console.log('[CompanyManager] Dialog onOpenChange:', open);
          if (!open && !loading) {
            // Only allow closing if not loading
            console.log('[CompanyManager] Closing dialog and resetting form');
            resetForm();
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="btn-hover-lift">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Firmă
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Editează Firma" : "Adaugă Firmă Nouă"}
              </DialogTitle>
              <DialogDescription>
                Completează informațiile despre firmă
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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cif">CIF</Label>
                  <Input
                    id="cif"
                    value={formData.cif}
                    onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_type">Tip Impozitare</Label>
                  <Select
                    value={formData.tax_type}
                    onValueChange={(value) => setFormData({ ...formData, tax_type: value })}
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
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="vat_payer"
                    checked={formData.vat_payer}
                    onCheckedChange={(checked) => setFormData({ ...formData, vat_payer: checked })}
                  />
                  <Label htmlFor="vat_payer">Plătitor TVA</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number">Nr. Înregistrare</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Persoană Contact</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email Contact</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@firma.ro"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notițe</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    console.log('[CompanyManager] Cancel clicked');
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Anulează
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingCompany ? "Actualizare..." : "Adăugare..."}
                    </>
                  ) : (
                    editingCompany ? "Salvează Modificările" : "Adaugă Firmă"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrează
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>TVA</Label>
            <Select value={filterVat} onValueChange={setFilterVat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="true">Da</SelectItem>
                <SelectItem value="false">Nu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Tip Impozitare</Label>
            <Select value={filterTaxType} onValueChange={setFilterTaxType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="micro">Microîntreprindere</SelectItem>
                <SelectItem value="profit">Impozit pe Profit</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
                <SelectItem value="norma_venit">Normă de Venit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listă Firme */}
      {filteredCompanies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="Nicio firmă înregistrată"
          description="Începe prin a adăuga prima firmă în sistem. Vei putea gestiona date, documente și workflow-uri pentru fiecare client."
          action={{
            label: "Adaugă Prima Firmă",
            onClick: () => setIsDialogOpen(true),
            variant: "default"
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {selectedCompanies.length > 0 && `${selectedCompanies.length} companii selectate`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllCompanies(filteredCompanies.map(c => c.id))}
            >
              {selectedCompanies.length === filteredCompanies.length ? "Deselectează tot" : "Selectează tot"}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="card-hover-scale">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`company-select-${company.id}`}
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() => toggleCompany(company.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{company.company_name}</CardTitle>
                      <CardDescription>CIF: {company.cif || "N/A"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant={company.vat_payer ? "default" : "secondary"} className="badge-pulse">
                      {company.vat_payer ? "Plătitor TVA" : "Neplătitor TVA"}
                    </Badge>
                    <Badge variant="outline">{getTaxTypeLabel(company.tax_type)}</Badge>
                  </div>
                  {company.contact_person && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {company.contact_person}
                    </p>
                  )}
                  {company.phone && (
                    <p className="text-sm text-muted-foreground">Tel: {company.phone}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('[CompanyManager] Edit button clicked for company:', company.id);
                        openEditDialog(company);
                      }}
                      title="Editează firma"
                      className="btn-hover-lift"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editează
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setCompanyToDelete(company.id);
                        setDeleteConfirmOpen(true);
                      }}
                      className="btn-hover-lift"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sigur vrei să ștergi această firmă?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune este permanentă și va șterge toate datele asociate cu firma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => companyToDelete && handleDelete(companyToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge definitiv
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
