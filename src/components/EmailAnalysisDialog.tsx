import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, Plus, X, UserCheck, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmailAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  analysisText: string;
  analysisDate: string;
}

export const EmailAnalysisDialog = ({
  open,
  onOpenChange,
  companyName,
  analysisText,
  analysisDate,
}: EmailAnalysisDialogProps) => {
  const [emails, setEmails] = useState<string[]>([""]);
  const [savedContacts, setSavedContacts] = useState<Array<{ id: string; email: string; name: string | null }>>([]);
  const [editableCompanyName, setEditableCompanyName] = useState(companyName);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [administratorName, setAdministratorName] = useState("");
  const [comments, setComments] = useState("");
  const [hasEmployees, setHasEmployees] = useState(false);
  const [hasIntraCommunity, setHasIntraCommunity] = useState(false);
  const [isVATpayer, setIsVATpayer] = useState(false);
  const [vatFrequency, setVatFrequency] = useState<"lunar" | "trimestrial">("lunar");
  const [taxType, setTaxType] = useState<"microenterprise" | "profit">("microenterprise");
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Update editable company name when prop changes
  useEffect(() => {
    setEditableCompanyName(companyName);
  }, [companyName]);

  // Încarcă contactele salvate
  useEffect(() => {
    if (open) {
      loadSavedContacts();
    }
  }, [open]);

  const loadSavedContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('email_contacts')
        .select('id, email, name')
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setSavedContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const saveEmailContact = async (email: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('email_contacts')
        .upsert({
          user_id: user.id,
          email: email.trim(),
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,email',
        });
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Contact șters");
      loadSavedContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error("Eroare la ștergerea contactului");
    }
  };

  const selectContact = (email: string, index: number) => {
    const newEmails = [...emails];
    newEmails[index] = email;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type === 'application/vnd.ms-excel' || 
                          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                          file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast.error(`${file.name}: Tip fișier invalid. Doar Excel (.xls, .xlsx) și PDF sunt permise.`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: Fișier prea mare. Maxim 10MB per fișier.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email => email.trim() && emailRegex.test(email.trim()));
    
    if (validEmails.length === 0) {
      toast.error("Te rog să introduci cel puțin o adresă de email validă");
      return false;
    }
    
    return validEmails;
  };

  const handleSend = async () => {
    const validEmails = validateEmails();
    if (!validEmails) return;

    // Validare fișiere obligatorii
    if (attachedFiles.length === 0) {
      toast.error("Te rog să atașezi cel puțin o balanță!");
      return;
    }

    setIsSending(true);
    setIsUploading(true);

    try {
      // Upload fișiere în storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const uploadedFileUrls: string[] = [];
      
      for (const file of attachedFiles) {
        // Sanitizează numele fișierului - elimină caractere invalide pentru storage
        const sanitizedFileName = file.name
          .replace(/[\[\]\(\)\{\}<>]/g, '') // Elimină paranteze și alte caractere speciale
          .replace(/\s+/g, '_') // Înlocuiește spațiile cu underscore
          .replace(/[^\w\-_.]/g, ''); // Elimină orice alte caractere non-alfanumerice (păstrează doar a-zA-Z0-9_-.)
        
        const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('balance-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('balance-attachments')
          .getPublicUrl(fileName);
          
        uploadedFileUrls.push(publicUrl);
      }

      setIsUploading(false);
      const { data, error } = await supabase.functions.invoke('send-analysis-email', {
        body: {
          emails: validEmails,
          companyName: editableCompanyName,
          phoneNumber: phoneNumber.trim(),
          administratorName: administratorName.trim(),
          comments: comments.trim(),
          analysisText,
          companyData: {
            hasEmployees,
            hasIntraCommunity,
            isVATpayer,
            vatFrequency: isVATpayer ? vatFrequency : undefined,
            taxType,
          },
          analysisDate,
          attachmentUrls: uploadedFileUrls,
          attachmentNames: attachedFiles.map(f => f.name),
        },
      });

      if (error) throw error;

      // Salvează contactele folosite
      await Promise.all(validEmails.map(email => saveEmailContact(email)));

      toast.success(`Emailul a fost trimis cu succes către ${data.emailsSent} destinatar(i)!`);
      onOpenChange(false);
      
      // Reset form
      setEmails([""]);
      setEditableCompanyName(companyName);
      setPhoneNumber("");
      setAdministratorName("");
      setComments("");
      setHasEmployees(false);
      setHasIntraCommunity(false);
      setIsVATpayer(false);
      setVatFrequency("lunar");
      setTaxType("microenterprise");
      setAttachedFiles([]);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Eroare la trimiterea emailului: " + error.message);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Trimite Analiză pe Email
          </DialogTitle>
          <DialogDescription>
            Completează datele firmei și adresele de email unde vrei să trimiți analiza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Nume Firmă *</Label>
            <Input
              id="companyName"
              type="text"
              value={editableCompanyName}
              onChange={(e) => setEditableCompanyName(e.target.value)}
              placeholder="Ex: SC SMART VEST SRL"
              required
            />
          </div>

          {/* Administrator Name */}
          <div className="space-y-2">
            <Label htmlFor="administratorName">Numele Administratorului</Label>
            <Input
              id="administratorName"
              type="text"
              value={administratorName}
              onChange={(e) => setAdministratorName(e.target.value)}
              placeholder="Ex: Ion Popescu"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Telefon de Contact</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ex: 0722123456"
            />
          </div>

          {/* Email addresses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Adrese Email *</Label>
              {savedContacts.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {savedContacts.length} {savedContacts.length === 1 ? 'contact salvat' : 'contacte salvate'}
                </span>
              )}
            </div>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="exemplu@email.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="flex-1"
                />
                {savedContacts.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Selectează din contacte salvate"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm mb-3">Contacte Salvate</h4>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {savedContacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center justify-between p-2 hover:bg-accent rounded-md group"
                            >
                              <button
                                type="button"
                                onClick={() => selectContact(contact.email, index)}
                                className="flex-1 text-left text-sm"
                              >
                                <div className="font-medium">{contact.email}</div>
                                {contact.name && (
                                  <div className="text-xs text-muted-foreground">{contact.name}</div>
                                )}
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => deleteContact(contact.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmailField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Email
            </Button>
          </div>

          {/* Company data checkboxes */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Date Firmă *</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasEmployees"
                checked={hasEmployees}
                onCheckedChange={(checked) => setHasEmployees(checked as boolean)}
              />
              <label
                htmlFor="hasEmployees"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Are salariați
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasIntraCommunity"
                checked={hasIntraCommunity}
                onCheckedChange={(checked) => setHasIntraCommunity(checked as boolean)}
              />
              <label
                htmlFor="hasIntraCommunity"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Are achiziții intracomunitare
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVATpayer"
                  checked={isVATpayer}
                  onCheckedChange={(checked) => setIsVATpayer(checked as boolean)}
                />
                <label
                  htmlFor="isVATpayer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Este plătitor de TVA
                </label>
              </div>

              {isVATpayer && (
                <RadioGroup
                  value={vatFrequency}
                  onValueChange={(value) => setVatFrequency(value as "lunar" | "trimestrial")}
                  className="ml-6 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lunar" id="lunar" />
                    <Label htmlFor="lunar" className="font-normal">Lunar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trimestrial" id="trimestrial" />
                    <Label htmlFor="trimestrial" className="font-normal">Trimestrial</Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tip Impozit *</Label>
              <RadioGroup
                value={taxType}
                onValueChange={(value) => setTaxType(value as "microenterprise" | "profit")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="microenterprise" id="microenterprise" />
                  <Label htmlFor="microenterprise" className="font-normal">
                    Impozit pe venitul microîntreprinderilor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="profit" id="profit" />
                  <Label htmlFor="profit" className="font-normal">
                    Impozit pe profit
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Atașează Balanțe - OBLIGATORIU */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Atașează Balanțe * <span className="text-xs text-destructive">(Obligatoriu)</span>
            </Label>
            <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="fileUpload"
                multiple
                accept=".xls,.xlsx,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="fileUpload" className="cursor-pointer">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click pentru a selecta fișiere</p>
                <p className="text-xs text-muted-foreground">Excel (.xls, .xlsx) sau PDF • Max 10MB per fișier</p>
              </label>
            </div>
            
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{attachedFiles.length} fișier(e) atașat(e):</p>
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isSending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="comments">Comentarii / Note Suplimentare</Label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Adaugă orice informații suplimentare sau note relevante..."
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Anulează
          </Button>
          <Button onClick={handleSend} disabled={isSending || isUploading}>
            {isUploading ? "Se încarcă fișiere..." : isSending ? "Se trimite..." : "Trimite Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
