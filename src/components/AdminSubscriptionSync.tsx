import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SyncResult {
  success: boolean;
  message: string;
  details?: {
    subscription_status?: string;
    subscription_type?: string;
    subscription_ends_at?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  };
}

export function AdminSubscriptionSync() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    if (!email.trim()) {
      toast.error("Introdu o adresă de email");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
        body: { email: email.trim() }
      });

      if (error) throw error;

      setResult({
        success: true,
        message: data.message || 'Sincronizare reușită',
        details: {
          subscription_status: data.subscription_status,
          subscription_type: data.subscription_type,
          subscription_ends_at: data.subscription_ends_at,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id
        }
      });

      toast.success("Sincronizare reușită!", {
        description: `Status: ${data.subscription_status || 'N/A'}`
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      setResult({
        success: false,
        message: error.message || 'Eroare la sincronizare'
      });
      toast.error("Eroare la sincronizare", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-payments');

      if (error) throw error;

      setResult({
        success: true,
        message: `Sincronizate ${data.synced} plăți, ${data.skipped} omise, ${data.total_errors} erori`
      });

      toast.success("Sincronizare bulk reușită!", {
        description: `${data.synced} plăți sincronizate`
      });
    } catch (error: any) {
      console.error("Bulk sync error:", error);
      setResult({
        success: false,
        message: error.message || 'Eroare la sincronizare bulk'
      });
      toast.error("Eroare la sincronizare bulk", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sincronizare Manuală Stripe
        </CardTitle>
        <CardDescription>
          Forțează sincronizarea unui abonament din Stripe în baza de date locală.
          Folosește când un utilizator a plătit dar nu vede abonamentul activ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="sync-email">Email utilizator</Label>
            <Input
              id="sync-email"
              type="email"
              placeholder="utilizator@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSync} disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se sincronizează...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizează
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <Button variant="outline" onClick={handleBulkSync} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se sincronizează toate...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizează TOATE plățile din Stripe
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Acest buton sincronizează toate plățile și abonamentele din Stripe. 
            Actualizează automat și profilurile utilizatorilor.
          </p>
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                {result.details && (
                  <div className="text-sm space-y-1 mt-2 p-2 bg-muted rounded">
                    {result.details.subscription_status && (
                      <p>Status: <strong className={result.details.subscription_status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                        {result.details.subscription_status}
                      </strong></p>
                    )}
                    {result.details.subscription_type && (
                      <p>Tip: <strong>{result.details.subscription_type}</strong></p>
                    )}
                    {result.details.subscription_ends_at && (
                      <p>Expiră: <strong>{new Date(result.details.subscription_ends_at).toLocaleDateString('ro-RO')}</strong></p>
                    )}
                    {result.details.stripe_customer_id && (
                      <p className="text-xs text-muted-foreground">Customer ID: {result.details.stripe_customer_id}</p>
                    )}
                    {result.details.stripe_subscription_id && (
                      <p className="text-xs text-muted-foreground">Subscription ID: {result.details.stripe_subscription_id}</p>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Când să folosești:</strong>
            <ul className="list-disc list-inside mt-1 text-sm">
              <li>Un utilizator a plătit dar nu vede abonamentul activ</li>
              <li>Webhook-ul Stripe nu a funcționat corect</li>
              <li>Trebuie să verifici datele unui abonament</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
