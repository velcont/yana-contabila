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
import { Mail, Loader2, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatNumber } from '@/utils/analysisParser';

interface EmailAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  companyName: string;
  clientEmail?: string;
  clientName?: string;
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
  const [includePDF, setIncludePDF] = useState(true);
  const [emails, setEmails] = useState(clientEmail || '');

  const normalizeRomanianText = (text: string): string => {
    return text
      .replace(/ă/g, 'a')
      .replace(/Ă/g, 'A')
      .replace(/â/g, 'a')
      .replace(/Â/g, 'A')
      .replace(/î/g, 'i')
      .replace(/Î/g, 'I')
      .replace(/ș/g, 's')
      .replace(/Ș/g, 'S')
      .replace(/ț/g, 't')
      .replace(/Ț/g, 'T');
  };

  const generatePDFBase64 = async (): Promise<string> => {
    const doc = new jsPDF();
    const PRIMARY_COLOR: [number, number, number] = [59, 130, 246];
    
    doc.setFont('helvetica', 'normal');
    let yPos = 20;

    // Header
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('YANA', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeRomanianText('Analiză Financiară Automatizată'), 15, 28);
    doc.setFontSize(8);
    doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')}`, 150, 28);
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Company Info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeRomanianText('Informații Firmă'), 15, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeRomanianText(`Firmă: ${companyName}`), 15, yPos);
    yPos += 6;
    doc.text(normalizeRomanianText(`Data: ${new Date().toLocaleDateString('ro-RO')}`), 15, yPos);
    yPos += 15;

    // Indicators Table
    const metadata = latestAnalysis.metadata;
    const indicatorsData = [
      [normalizeRomanianText('Indicator'), normalizeRomanianText('Valoare')],
      [normalizeRomanianText('Cifră Afaceri'), formatCurrency(metadata.ca || 0)],
      ['Profit', formatCurrency(metadata.profit || 0)],
      ['EBITDA', formatCurrency(metadata.ebitda || 0)],
      ['DSO (zile)', formatNumber(metadata.dso || 0)],
      ['DPO (zile)', formatNumber(metadata.dpo || 0)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [indicatorsData[0]],
      body: indicatorsData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        font: 'helvetica',
      },
      bodyStyles: {
        fontSize: 9,
        font: 'helvetica',
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Analysis text
    if (latestAnalysis.analysis_text) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(10, yPos - 5, 190, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(normalizeRomanianText('Analiză Completă'), 15, yPos);
      yPos += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const analysisLines = doc.splitTextToSize(normalizeRomanianText(latestAnalysis.analysis_text), 180);
      analysisLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 15, yPos);
        yPos += 5;
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        normalizeRomanianText(`Pagina ${i} din ${pageCount} | Generat de Yana AI`),
        105,
        287,
        { align: 'center' }
      );
    }

    return doc.output('datauristring').split(',')[1];
  };

  const handleSendReport = async () => {
    try {
      setLoading(true);

      // Parse multiple emails
      const emailList = emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e);

      if (emailList.length === 0) {
        throw new Error('Cel puțin o adresă de email este obligatorie');
      }

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailList.filter(e => !emailRegex.test(e));
      if (invalidEmails.length > 0) {
        throw new Error(`Adrese de email invalide: ${invalidEmails.join(', ')}`);
      }

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

      // Generate PDF if required
      let pdfAttachment = null;
      if (includePDF) {
        const pdfBase64 = await generatePDFBase64();
        pdfAttachment = {
          filename: `Analiza_${companyName}_${new Date().toLocaleDateString('ro-RO').replace(/\//g, '-')}.pdf`,
          content: pdfBase64,
        };
      }

      const { error } = await supabase.functions.invoke('send-monthly-report', {
        body: {
          companyId,
          clientEmails: emailList,
          clientName,
          companyName,
          reportData,
          pdfAttachment,
        },
      });

      if (error) {
        // Extract user-friendly error message
        const errorMessage = error.message || 'Nu s-a putut trimite raportul';
        throw new Error(errorMessage);
      }

      toast({
        title: 'Raport trimis cu succes',
        description: `Email-ul a fost trimis către ${emailList.length} destinatar${emailList.length > 1 ? 'i' : ''}`,
      });

      onOpenChange(false);
      setCustomNote('');
      setEmails('');
    } catch (error: any) {
      console.error('Error sending report:', error);
      
      // Display detailed error message
      const errorMessage = error.message || 'Nu s-a putut trimite raportul';
      
      toast({
        title: 'Eroare trimitere email',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000, // Show for 10 seconds for important messages
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
            <Label htmlFor="emails">Adrese Email Destinatari *</Label>
            <Textarea
              id="emails"
              placeholder="contact@firma.ro&#10;director@firma.ro&#10;contabil@firma.ro"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Adaugă multiple adrese de email, separate prin virgulă sau pe linii diferite
            </p>
          </div>

          <div className="space-y-3">
            <Label>Conținut Raport</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdf"
                checked={includePDF}
                onCheckedChange={(checked) => setIncludePDF(checked as boolean)}
              />
              <label
                htmlFor="pdf"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                <Paperclip className="h-4 w-4" />
                Atașează PDF cu analiza completă (obligatoriu)
              </label>
            </div>
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
                Include alertele automate în email
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
                Include recomandările automate în email
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
