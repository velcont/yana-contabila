import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, FileText } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();
  const sessionId = searchParams.get('session_id');
  
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    // Check subscription status after successful payment
    checkSubscription();
    
    // Generate SmartBill invoice
    if (sessionId) {
      generateInvoice();
    }
  }, []);

  const generateInvoice = async () => {
    if (!sessionId) return;
    
    setInvoiceGenerating(true);
    setInvoiceError(null);
    
    try {
      console.log('Generating SmartBill invoice for session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('generate-smartbill-invoice', {
        body: { sessionId }
      });
      
      if (error) {
        console.error('Error generating invoice:', error);
        setInvoiceError(error.message);
        toast({
          title: "Eroare Factură",
          description: "Nu am putut genera factura automat. Te rugăm să ne contactezi.",
          variant: "destructive",
        });
      } else {
        console.log('Invoice generated successfully:', data);
        setInvoiceGenerated(true);
        toast({
          title: "Factură Generată",
          description: "Factura ta a fost generată cu succes!",
        });
      }
    } catch (error) {
      console.error('Exception generating invoice:', error);
      setInvoiceError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setInvoiceGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Plata Reușită!</CardTitle>
          <CardDescription>
            Abonamentul tău a fost activat cu succes
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-sm text-center">
              Acum ai acces la toate funcționalitățile planului tău. 
              Verifică-ți email-ul pentru detalii despre abonament.
            </p>
          </div>

          {/* Invoice generation status */}
          {sessionId && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">Factură</h3>
              </div>
              
              {invoiceGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Se generează factura...</span>
                </div>
              )}
              
              {invoiceGenerated && !invoiceError && (
                <p className="text-sm text-green-600">
                  ✓ Factura a fost generată cu succes
                </p>
              )}
              
              {invoiceError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    ⚠ Eroare la generarea facturii
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={generateInvoice}
                    disabled={invoiceGenerating}
                  >
                    Încearcă din nou
                  </Button>
                </div>
              )}
            </div>
          )}

          {sessionId && (
            <div className="text-xs text-muted-foreground text-center">
              <p>ID Sesiune: {sessionId}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/subscription')}
              className="flex-1"
            >
              Vezi Abonamentul
            </Button>
            <Button
              onClick={() => navigate('/yana')}
              className="flex-1"
            >
              Mergi la Aplicație
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
