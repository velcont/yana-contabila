import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";

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

  const [formData, setFormData] = useState({
    company_name: "",
    cif: "",
    vat_payer: false,
    tax_type: "micro",
    registration_number: "",
    address: "",
    phone: "",
    contact_person: "",
    notes: "",
  });

  useEffect(() => {
    fetchCompanies();
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update(formData)
          .eq("id", editingCompany.id);

        if (error) throw error;
        toast({ title: "Firmă actualizată cu succes!" });
      } else {
        const { error } = await supabase
          .from("companies")
          .insert([{ ...formData, user_id: user.id }]);

        if (error) throw error;
        toast({ title: "Firmă adăugată cu succes!" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi această firmă?")) return;

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
      notes: "",
    });
    setEditingCompany(null);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name,
      cif: company.cif,
      vat_payer: company.vat_payer,
      tax_type: company.tax_type,
      registration_number: company.registration_number,
      address: company.address,
      phone: company.phone,
      contact_person: company.contact_person,
      notes: company.notes,
    });
    setIsDialogOpen(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Gestionare Firme
          </h2>
          <p className="text-muted-foreground mt-1">
            Administrează datele firmelor tale
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
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
                <Label htmlFor="notes">Notițe</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="submit">
                  {editingCompany ? "Actualizează" : "Adaugă"}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <CardTitle className="text-lg">{company.company_name}</CardTitle>
              <CardDescription>CIF: {company.cif || "N/A"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge variant={company.vat_payer ? "default" : "secondary"}>
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
                  onClick={() => openEditDialog(company)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(company.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nu există firme înregistrate sau nicio firmă nu corespunde criteriilor de filtrare.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
