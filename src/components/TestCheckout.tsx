import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TestCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState("");
  const [syncEmail, setSyncEmail] = useState("");

  const testCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-checkout');
      
      if (error) throw error;
      
      setResult(data);
      toast.success("Test checkout funcționează perfect!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare la testare: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const generateTestInvoice = async () => {
    if (!sessionId.trim()) {
      toast.error("Introdu Session ID de la Stripe!");
      return;
    }

    setInvoiceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-smartbill-invoice', {
        body: { sessionId: sessionId.trim() }
      });
      
      if (error) throw error;
      
      toast.success("Factură SmartBill generată cu succes!");
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare la generare factură: " + (error as Error).message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const syncStripeSubscription = async () => {
    setLoading(true);
    try {
      const body = syncEmail.trim() ? { email: syncEmail.trim() } : {};
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', { body });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        setResult(data);
      } else {
        toast.error(data.message || "Eroare la sincronizare");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const adminGenerateInvoice = async () => {
    if (!sessionId.trim()) {
      toast.error("Introdu Session ID!");
      return;
    }

    setInvoiceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-generate-invoice', {
        body: { sessionId: sessionId.trim() }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        setResult(data);
      } else {
        toast.error(data.message || "Eroare la generare factură");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare: " + (error as Error).message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const notifyPaymentAdmin = async () => {
    if (!sessionId.trim()) {
      toast.error("Introdu Session ID!");
      return;
    }

    setInvoiceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-payment-admin', {
        body: { sessionId: sessionId.trim() }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success("Email trimis cu succes!");
        setResult(data);
      } else {
        toast.error(data.message || "Eroare la trimitere email");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare: " + (error as Error).message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Test Checkout Function</h3>
        
        <Button 
          onClick={testCheckout} 
          disabled={loading}
          className="mb-4"
        >
          {loading ? "Se testează..." : "Testează Funcția"}
        </Button>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Sincronizare Subscripție Stripe</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Dacă introduci email, sincronizează acel utilizator (doar admin). Dacă lași gol, sincronizează utilizatorul autentificat.
        </p>

        <div className="space-y-2 mb-3">
          <Label htmlFor="sync-email">Email utilizator (opțional)</Label>
          <Input
            id="sync-email"
            type="email"
            placeholder="timoficiuc.g@gmail.com"
            value={syncEmail}
            onChange={(e) => setSyncEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <Button 
          onClick={syncStripeSubscription} 
          disabled={loading}
          variant="default"
        >
          {loading ? "Se sincronizează..." : "Sincronizează cu Stripe"}
        </Button>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">📧 Trimite Detalii Plată prin Email</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Primești toate detaliile clientului pe office@velcont.com pentru a emite factura manual
        </p>
        
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="cs_live_a1zoAkFj..."
          className="w-full p-2 border rounded mb-3"
        />
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={notifyPaymentAdmin} 
            disabled={invoiceLoading || !sessionId.trim()}
            variant="default"
            className="flex-1"
          >
            {invoiceLoading ? "Se trimite..." : "📧 Trimite Email Detalii"}
          </Button>
          
          <Button 
            onClick={adminGenerateInvoice} 
            disabled={invoiceLoading || !sessionId.trim()}
            variant="outline"
            className="flex-1"
          >
            {invoiceLoading ? "Se generează..." : "🧾 Generează SmartBill (Auto)"}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          💡 Recomandare: Folosește "Trimite Email" și emiți factura manual în SmartBill
        </p>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </p>
        </div>
      )}
    </Card>
  );
};
