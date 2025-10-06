import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [hasEmployees, setHasEmployees] = useState(false);
  const [hasIntraCommunity, setHasIntraCommunity] = useState(false);
  const [isVATpayer, setIsVATpayer] = useState(false);
  const [vatFrequency, setVatFrequency] = useState<"lunar" | "trimestrial">("lunar");
  const [taxType, setTaxType] = useState<"microenterprise" | "profit">("microenterprise");
  const [isSending, setIsSending] = useState(false);

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

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-analysis-email', {
        body: {
          emails: validEmails,
          companyName,
          analysisText,
          companyData: {
            hasEmployees,
            hasIntraCommunity,
            isVATpayer,
            vatFrequency: isVATpayer ? vatFrequency : undefined,
            taxType,
          },
          analysisDate,
        },
      });

      if (error) throw error;

      toast.success(`Emailul a fost trimis cu succes către ${data.emailsSent} destinatar(i)!`);
      onOpenChange(false);
      
      // Reset form
      setEmails([""]);
      setHasEmployees(false);
      setHasIntraCommunity(false);
      setIsVATpayer(false);
      setVatFrequency("lunar");
      setTaxType("microenterprise");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Eroare la trimiterea emailului: " + error.message);
    } finally {
      setIsSending(false);
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
          {/* Email addresses */}
          <div className="space-y-3">
            <Label>Adrese Email *</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="exemplu@email.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="flex-1"
                />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Anulează
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? "Se trimite..." : "Trimite Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
