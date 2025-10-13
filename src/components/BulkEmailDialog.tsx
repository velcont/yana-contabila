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

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
}

export const BulkEmailDialog = ({
  open,
  onOpenChange,
  clients,
}: BulkEmailDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  const handleSendBulkEmails = async () => {
    try {
      setLoading(true);

      const clientsWithEmail = clients.filter(c => c.contact_email && c.latestAnalysis?.metadata);
      
      if (clientsWithEmail.length === 0) {
        throw new Error('Niciun client din selecție nu are email sau date de analiză disponibile');
      }

      let successCount = 0;
      let failCount = 0;

      for (const client of clientsWithEmail) {
        try {
          const metadata = client.latestAnalysis.metadata;
          
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
              companyId: client.id,
              clientEmail: client.contact_email,
              clientName: client.contact_person || client.company_name,
              reportData,
            },
          });

          if (error) {
            console.error(`Failed to send email to ${client.company_name}:`, error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing ${client.company_name}:`, error);
          failCount++;
        }
      }

      toast({
        title: 'Rapoarte trimise',
        description: `${successCount} rapoarte trimise cu succes${failCount > 0 ? `, ${failCount} eșuate` : ''}`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });

      onOpenChange(false);
      setCustomNote('');
    } catch (error: any) {
      console.error('Error sending bulk reports:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-au putut trimite rapoartele',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clientsWithEmail = clients.filter(c => c.contact_email);
  const clientsWithAnalysis = clientsWithEmail.filter(c => c.latestAnalysis?.metadata);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trimite Rapoarte în Masă</DialogTitle>
          <DialogDescription>
            Vei trimite rapoarte către {clientsWithAnalysis.length} clienți
            {clientsWithEmail.length !== clientsWithAnalysis.length && 
              ` (${clientsWithEmail.length - clientsWithAnalysis.length} clienți nu au date de analiză și vor fi omise)`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Clienți selectați:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {clientsWithAnalysis.map(client => (
                <div key={client.id} className="text-sm flex items-center justify-between">
                  <span>{client.company_name}</span>
                  <span className="text-muted-foreground text-xs">{client.contact_email}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Conținut Rapoarte</Label>
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
              placeholder="Adaugă o notă personalizată care va fi inclusă în toate email-urile..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anulează
          </Button>
          <Button 
            onClick={handleSendBulkEmails} 
            disabled={loading || clientsWithAnalysis.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Mail className="mr-2 h-4 w-4" />
            Trimite la {clientsWithAnalysis.length} Clienți
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEmailDialog;
