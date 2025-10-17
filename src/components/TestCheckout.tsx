import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TestCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Test Checkout Function</h3>
      
      <Button 
        onClick={testCheckout} 
        disabled={loading}
        className="mb-4"
      >
        {loading ? "Se testează..." : "Testează Funcția"}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-mono">
            {JSON.stringify(result, null, 2)}
          </p>
        </div>
      )}
    </Card>
  );
};
