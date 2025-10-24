import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TestCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState("");

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
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription');
      
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
          Sincronizează subscripția din Stripe cu profilul utilizatorului autentificat
        </p>
        
        <Button 
          onClick={syncStripeSubscription} 
          disabled={loading}
          variant="default"
        >
          {loading ? "Se sincronizează..." : "Sincronizează cu Stripe"}
        </Button>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">🔐 Admin: Generare Factură SmartBill</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Introdu Session ID pentru a genera factură pentru orice client (necesită rol admin)
        </p>
        
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="cs_live_a1zoAkFj..."
          className="w-full p-2 border rounded mb-3"
        />
        
        <div className="flex gap-2">
          <Button 
            onClick={adminGenerateInvoice} 
            disabled={invoiceLoading || !sessionId.trim()}
            variant="default"
          >
            {invoiceLoading ? "Se generează..." : "🔐 Generează Factură (Admin)"}
          </Button>
          
          <Button 
            onClick={generateTestInvoice} 
            disabled={invoiceLoading || !sessionId.trim()}
            variant="secondary"
          >
            {invoiceLoading ? "Se generează..." : "Generează (User)"}
          </Button>
        </div>
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
