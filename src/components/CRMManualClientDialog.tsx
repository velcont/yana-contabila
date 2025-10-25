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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Building2 } from "lucide-react";
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
  const [isFetchingCIF, setIsFetchingCIF] = useState(false);
  const [cifError, setCifError] = useState<string | null>(null);
  const [anafData, setAnafData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string[]>(["step1"]);
  
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
    setAnafData(null);
    setCifError(null);
    setCurrentStep(["step1"]);
  };

  const fetchCompanyData = async (cif: string) => {
    if (!cif || cif.length < 6) return;
    
    setIsFetchingCIF(true);
    setCifError(null);
    setAnafData(null);
    
    console.log('🔍 Fetching data for CIF:', cif);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-company-data', {
        body: { cif: cif.replace(/\s/g, '').toUpperCase() }
      });

      console.log('📦 Response:', { data, error });
      console.log('📊 Data type:', typeof data, 'Data keys:', data ? Object.keys(data) : 'null');
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      // Check if data exists and has required fields
      if (data && (data.found || data.company_name)) {
        console.log('✅ Data fetched successfully from:', data.source);
        console.log('📋 Parsed data:', {
          company_name: data.company_name,
          cui: data.cui,
          address: data.address,
          vat_payer: data.vat_payer,
          status: data.status
        });
        
        setAnafData(data);
        setCifError(null);
        
        toast({
          title: `✓ Date preluate cu succes`,
          description: `Firma ${data.company_name || 'găsită'} prin ${data.source || 'API'}`,
        });
        
        // Auto-expand next step
        setCurrentStep(["step1", "step2"]);
      } else {
        console.error('❌ API error:', data?.error, data?.details);
        setCifError(data?.error || "CIF invalid sau firmă neînregistrată");
        setAnafData(null);
        
        toast({
          title: "Eroare la verificarea CIF-ului", 
          description: `${data?.error || 'CIF invalid'}. ${data?.details ? `Surse încercate: ${data.details.length}` : ''}`,
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('💥 Fatal error:', error);
      setCifError("Eroare la verificarea CIF-ului");
      setAnafData(null);
      
      toast({
        title: "Eroare", 
        description: "Nu s-au putut prelua datele firmei. Verifică console pentru detalii.",
        variant: "destructive" 
      });
    } finally {
      setIsFetchingCIF(false);
    }
  };

  const applyAnafData = () => {
    if (!anafData) return;
    
    setFormData(prev => ({
      ...prev,
      company_name: anafData.company_name || prev.company_name,
      address: anafData.address || prev.address,
      vat_payer: anafData.vat_payer ?? prev.vat_payer,
      cif: anafData.cif || prev.cif
    }));
    
    toast({
      title: "Date aplicate cu succes",
      description: "Poți edita câmpurile înainte de salvare",
    });
    
    setCurrentStep(["step1", "step2", "step3"]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = manualClientSchema.parse(formData);

      // Call edge function to create client on server side
      const { data, error } = await supabase.functions.invoke('create-manual-client', {
        body: {
          email: validatedData.email,
          password: Math.random().toString(36).slice(-10), // Generate random password
          fullName: validatedData.full_name || validatedData.company_name,
          companyName: validatedData.company_name,
          cui: validatedData.cif || null,
          contactPerson: validatedData.full_name || null,
          phone: validatedData.phone || null,
          address: validatedData.address || null,
          taxType: validatedData.tax_type,
          notes: validatedData.notes || null,
          vatPayer: validatedData.vat_payer
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw new Error(error.message || 'Failed to create client');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create client');
      }

      toast({
        title: "Client adăugat cu succes!",
        description: `${validatedData.company_name} a fost adăugat în sistem`,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Adaugă Client Manual
          </DialogTitle>
          <DialogDescription>
            Verifică CIF-ul în ANAF și completează datele clientului
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Accordion type="multiple" value={currentStep} onValueChange={setCurrentStep}>
            {/* STEP 1: Verificare CIF */}
            <AccordionItem value="step1" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pas 1: Verificare CIF</span>
                  {anafData && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Validat ANAF
                    </Badge>
                  )}
                  {cifError && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cif">CIF / CUI *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="cif"
                        value={formData.cif}
                        onChange={(e) => {
                          const newCif = e.target.value.toUpperCase();
                          setFormData({ ...formData, cif: newCif });
                          setCifError(null);
                          setAnafData(null);
                        }}
                        onBlur={() => {
                          if (formData.cif && formData.cif.length >= 6) {
                            fetchCompanyData(formData.cif);
                          }
                        }}
                        placeholder="RO12345678 sau 12345678"
                        className={cifError ? "border-red-500" : anafData ? "border-green-500" : ""}
                        disabled={isFetchingCIF}
                      />
                      {isFetchingCIF && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchCompanyData(formData.cif)}
                      disabled={isFetchingCIF || !formData.cif}
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetchingCIF ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  
                  {cifError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-600">{cifError}</p>
                    </div>
                  )}
                  
                  {anafData && (
                    <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">Date găsite în ANAF</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nume Firmă:</span>
                          <p className="font-medium">{anafData.company_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CIF:</span>
                          <p className="font-medium">{anafData.cui || anafData.cif || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Adresă:</span>
                          <p className="font-medium">{anafData.address || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plătitor TVA:</span>
                          <p className="font-medium">{anafData.vat_payer ? "DA" : "NU"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium">{anafData.status || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={applyAnafData}
                        className="w-full mt-2"
                        variant="default"
                        disabled={!anafData.company_name || !anafData.cui}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aplică Aceste Date
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* STEP 2: Date Firmă */}
            <AccordionItem value="step2" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pas 2: Date Firmă</span>
                  {formData.company_name && (
                    <Badge variant="outline">
                      {anafData ? "Auto-completat" : "Manual"}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
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
                  <Label htmlFor="address">Adresă Sediu Social</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Str. Exemplu nr. 1, București"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_type">Tip Impozitare *</Label>
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

                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="vat_payer"
                      checked={formData.vat_payer}
                      onCheckedChange={(checked) => setFormData({ ...formData, vat_payer: checked })}
                    />
                    <Label htmlFor="vat_payer">Plătitor TVA</Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* STEP 3: Date Contact */}
            <AccordionItem value="step3" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pas 3: Date Contact</span>
                  {formData.email && (
                    <Badge variant="outline">Completat</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
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
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+40 721 234 567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nume Persoană Contact</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ion Popescu (Administrator / Manager Financiar)"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* STEP 4: Informații Adiționale */}
            <AccordionItem value="step4" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="font-semibold">Pas 4: Notițe (Opțional)</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notițe Interne</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ex: Client recomandat de X, contract semnat la data Y, observații speciale..."
                    rows={4}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading || !formData.company_name || !formData.email}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Se adaugă..." : "Adaugă Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
