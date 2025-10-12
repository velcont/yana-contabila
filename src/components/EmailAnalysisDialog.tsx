import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  clientEmail: string;
  clientName: string;
  latestAnalysis: any;
}

export const EmailAnalysisDialog = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  clientEmail,
  clientName,
  latestAnalysis,
}: EmailAnalysisDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  const handleSendReport = async () => {
    try {
      setLoading(true);

      if (!latestAnalysis || !latestAnalysis.metadata) {
        throw new Error('Nu există date de analiză disponibile');
      }

      const metadata = latestAnalysis.metadata;
      
      const metrics = [
        { label: 'Cifră de Afaceri', value: `${(metadata.ca || 0).toLocaleString('ro-RO')} RON` },
        { label: 'Profit', value: `${(metadata.profit || 0).toLocaleString('ro-RO')} RON` },
        { label: 'EBITDA', value: `${(metadata.ebitda || 0).toLocaleString('ro-RO')} RON` },
        { label: 'DSO (Zile Încasare)', value: `${(metadata.dso || 0).toFixed(0)} zile` },
        { label: 'Marjă Profit', value: `${(metadata.profit_margin || 0).toFixed(1)}%` },
      ];

      const alerts = [];
      if (includeAlerts) {
        if (metadata.dso > 60) {
          alerts.push(`⚠️ DSO ridicat (${metadata.dso.toFixed(0)} zile) - Banii sunt blocați în creanțe`);
        }
        if (metadata.profit < 0) {
          alerts.push(`🔴 Pierderi de ${Math.abs(metadata.profit).toLocaleString('ro-RO')} RON`);
        }
        if (metadata.ebitda < 0) {
          alerts.push(`🔴 EBITDA negativ - Pierderi operaționale`);
        }
        if (metadata.casa && metadata.casa > 50000) {
          alerts.push(`⛔ Plafon casă depășit: ${metadata.casa.toLocaleString('ro-RO')} RON (max. 50.000 RON)`);
        }
      }

      const recommendations = [];
      if (includeRecommendations) {
        if (metadata.dso > 60) {
          recommendations.push('Îmbunătățiți procesul de colectare - Contactați clienții cu întârzieri');
        }
        if (metadata.dpo < 30 && metadata.dpo > 0) {
          recommendations.push(`Negociați termene mai lungi cu furnizorii (actual: ${metadata.dpo.toFixed(0)} zile)`);
        }
        if (metadata.profit_margin < 10) {
          recommendations.push('Marjă de profit sub 10% - Analizați structura costurilor');
        }
      }

      if (customNote) {
        recommendations.push(`📝 Notă personală: ${customNote}`);
      }

      const reportData = {
        metrics,
        alerts: alerts.length > 0 ? alerts : undefined,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };

      const { error } = await supabase.functions.invoke('send-monthly-report', {
        body: {
          companyId,
          clientEmail,
          clientName,
          reportData,
        },
      });

      if (error) throw error;

      toast({
        title: 'Raport trimis cu succes',
        description: `Email-ul a fost trimis către ${clientEmail}`,
      });

      onOpenChange(false);
      setCustomNote('');
    } catch (error: any) {
      console.error('Error sending report:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut trimite raportul',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trimite Raport Lunar</DialogTitle>
          <DialogDescription>
            Trimite raportul financiar către {companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Destinatar</Label>
            <div className="text-sm text-muted-foreground">
              {clientEmail} ({clientName || 'Contact principal'})
            </div>
          </div>

          <div className="space-y-3">
            <Label>Conținut Raport</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="alerts"
                checked={includeAlerts}
                onCheckedChange={(checked) => setIncludeAlerts(checked as boolean)}
              />
              <label
                htmlFor="alerts"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include alertele automate
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recommendations"
                checked={includeRecommendations}
                onCheckedChange={(checked) => setIncludeRecommendations(checked as boolean)}
              />
              <label
                htmlFor="recommendations"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include recomandările automate
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notă Personalizată (Opțional)</Label>
            <Textarea
              id="note"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Adaugă o notă personalizată pentru client..."
              rows={4}
            />
          </div>

          {latestAnalysis && latestAnalysis.metadata && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Previzualizare Date Raport:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">CA:</span>{' '}
                  {(latestAnalysis.metadata.ca || 0).toLocaleString('ro-RO')} RON
                </div>
                <div>
                  <span className="text-muted-foreground">Profit:</span>{' '}
                  {(latestAnalysis.metadata.profit || 0).toLocaleString('ro-RO')} RON
                </div>
                <div>
                  <span className="text-muted-foreground">DSO:</span>{' '}
                  {(latestAnalysis.metadata.dso || 0).toFixed(0)} zile
                </div>
                <div>
                  <span className="text-muted-foreground">EBITDA:</span>{' '}
                  {(latestAnalysis.metadata.ebitda || 0).toLocaleString('ro-RO')} RON
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anulează
          </Button>
          <Button onClick={handleSendReport} disabled={loading || !latestAnalysis}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Mail className="mr-2 h-4 w-4" />
            Trimite Raport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailAnalysisDialog;
