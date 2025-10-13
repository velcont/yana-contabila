import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ClientFiscalParamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onUpdate?: () => void;
}

export const ClientFiscalParamsDialog = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  onUpdate,
}: ClientFiscalParamsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vatRegime, setVatRegime] = useState<string>('none');
  const [cashAccountingVat, setCashAccountingVat] = useState<string>('false');
  const [taxType, setTaxType] = useState<'micro' | 'profit' | 'norma_venit' | 'dividend'>('micro');

  useEffect(() => {
    if (open && companyId) {
      fetchFiscalParams();
    } else if (!open) {
      // Reset to defaults when closing to ensure fresh load on next open
      setVatRegime('none');
      setCashAccountingVat('false');
      setTaxType('micro');
    }
  }, [open, companyId]);

  const fetchFiscalParams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('vat_regime, cash_accounting_vat, tax_type')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      if (data) {
        setVatRegime(data.vat_regime || 'none');
        setCashAccountingVat(data.cash_accounting_vat ? 'true' : 'false');
        setTaxType(data.tax_type || 'micro');
      }
    } catch (error: any) {
      console.error('Error fetching fiscal params:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca parametrii fiscali',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('companies')
        .update({
          vat_regime: vatRegime,
          cash_accounting_vat: cashAccountingVat === 'true',
          tax_type: taxType as 'micro' | 'profit' | 'norma_venit' | 'dividend',
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Parametrii fiscali au fost actualizați',
      });

      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving fiscal params:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut salva parametrii fiscali',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Parametri Fiscali</DialogTitle>
          <DialogDescription>
            Setează parametrii fiscali pentru {companyName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Plătitor TVA */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">1) Plătitor TVA</Label>
              <RadioGroup value={vatRegime} onValueChange={setVatRegime}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="vat-none" />
                  <Label htmlFor="vat-none" className="font-normal cursor-pointer">
                    A. Neplătitor de TVA
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quarterly" id="vat-quarterly" />
                  <Label htmlFor="vat-quarterly" className="font-normal cursor-pointer">
                    B. Plătitor trimestrial de TVA
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="vat-monthly" />
                  <Label htmlFor="vat-monthly" className="font-normal cursor-pointer">
                    C. Plătitor lunar de TVA
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* TVA la încasare */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">2) TVA la încasare</Label>
              <RadioGroup value={cashAccountingVat} onValueChange={setCashAccountingVat}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="cash-yes" />
                  <Label htmlFor="cash-yes" className="font-normal cursor-pointer">
                    A. Da
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="cash-no" />
                  <Label htmlFor="cash-no" className="font-normal cursor-pointer">
                    B. Nu
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tip impozit */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">3) Tip impozit</Label>
              <RadioGroup 
                value={taxType} 
                onValueChange={(value) => setTaxType(value as 'micro' | 'profit' | 'norma_venit' | 'dividend')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="micro" id="tax-micro" />
                  <Label htmlFor="tax-micro" className="font-normal cursor-pointer">
                    A. Impozit pe venit micro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="profit" id="tax-profit" />
                  <Label htmlFor="tax-profit" className="font-normal cursor-pointer">
                    B. Impozit pe profit
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};