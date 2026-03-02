import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, TrendingUp, AlertTriangle, UserPlus, RefreshCw, CheckCircle, XCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";

interface YanaPayment {
  id: string;
  user_id: string;
  amount_paid_cents: number;
  payment_date: string;
  stripe_invoice_id: string | null;
  invoice_generated: boolean;
}

interface FreeAccessUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  has_free_access: boolean;
}

interface ActiveSubscriber {
  id: string;
  email: string;
  full_name: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  first_payment?: string;
  last_payment?: string;
  total_paid?: number;
  payments_count?: number;
  has_missing_invoice?: boolean;
}

export function YanaSubscribersDashboard() {
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<ActiveSubscriber[]>([]);
  const [freeUsers, setFreeUsers] = useState<FreeAccessUser[]>([]);
  const [missingInvoices, setMissingInvoices] = useState<YanaPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [paymentsRes, profilesRes, freeRes] = await Promise.all([
        supabase
          .from("subscription_payments")
          .select("*")
          .eq("amount_paid_cents", 4900)
          .order("payment_date", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, email, full_name, stripe_subscription_id, subscription_status, subscription_ends_at, created_at")
          .not("stripe_subscription_id", "is", null)
          .eq("subscription_status", "active"),
        supabase
          .from("profiles")
          .select("id, email, full_name, created_at, has_free_access")
          .eq("has_free_access", true)
          .is("stripe_subscription_id", null)
          .order("created_at", { ascending: false }),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (freeRes.error) throw freeRes.error;

      const payments = paymentsRes.data || [];
      const activeProfiles = profilesRes.data || [];

      const enrichedSubscribers: ActiveSubscriber[] = activeProfiles.map(profile => {
        const userPayments = payments.filter(p => p.user_id === profile.id);
        const sorted = [...userPayments].sort((a, b) =>
          new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
        );

        return {
          ...profile,
          first_payment: sorted[0]?.payment_date,
          last_payment: sorted[sorted.length - 1]?.payment_date,
          total_paid: userPayments.reduce((sum, p) => sum + p.amount_paid_cents, 0) / 100,
          payments_count: userPayments.length,
          has_missing_invoice: userPayments.some(p => !p.invoice_generated),
        };
      });

      setSubscribers(enrichedSubscribers);
      setFreeUsers(freeRes.data || []);
      setMissingInvoices(payments.filter(p => !p.invoice_generated));
    } catch (error) {
      console.error("Error loading YANA subscribers data:", error);
      toast.error("Eroare la încărcarea datelor abonaților YANA");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Date actualizate");
  };

  const activeCount = subscribers.length;
  const mrr = activeCount * 49;
  const totalFree = freeUsers.length;
  const conversionRate = totalFree + activeCount > 0
    ? ((activeCount / (totalFree + activeCount)) * 100).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Abonați YANA (49 RON/lună)</h2>
          <p className="text-muted-foreground">Doar abonamente YANA Strategic — exclusiv plățile de contabilitate</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abonați Activi</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-1" />
              Cu abonament Stripe activ
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR (Monthly Recurring Revenue)</CardDescription>
            <CardTitle className="text-3xl">{mrr} RON</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              {activeCount} × 49 RON
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rata Conversie</CardDescription>
            <CardTitle className="text-3xl">{conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <UserPlus className="h-4 w-4 mr-1" />
              Free → Paid
            </div>
          </CardContent>
        </Card>

        <Card className={missingInvoices.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Facturi Lipsă</CardDescription>
            <CardTitle className="text-3xl">{missingInvoices.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertTriangle className={`h-4 w-4 mr-1 ${missingInvoices.length > 0 ? 'text-destructive' : ''}`} />
              Plăți YANA fără factură
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Invoices Alert */}
      {missingInvoices.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ Plăți YANA fără factură SmartBill ({missingInvoices.length})
            </CardTitle>
            <CardDescription>
              Aceste plăți de 49 RON nu au factură generată. Verifică în SmartBill și marchează-le manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Sumă</TableHead>
                  <TableHead>Data Plată</TableHead>
                  <TableHead>Stripe Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingInvoices.slice(0, 10).map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>{payment.amount_paid_cents / 100} RON</TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: ro })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.stripe_invoice_id || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Abonați YANA Activi ({subscribers.length})
          </CardTitle>
          <CardDescription>
            Utilizatori cu abonament Stripe activ la 49 RON/lună
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Niciun abonat YANA activ momentan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nume</TableHead>
                  <TableHead>Prima Plată</TableHead>
                  <TableHead>Ultima Plată</TableHead>
                  <TableHead>Total Plătit</TableHead>
                  <TableHead>Nr. Plăți</TableHead>
                  <TableHead>Factură</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>{sub.full_name || "—"}</TableCell>
                    <TableCell>
                      {sub.first_payment
                        ? format(new Date(sub.first_payment), "dd MMM yyyy", { locale: ro })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {sub.last_payment
                        ? format(new Date(sub.last_payment), "dd MMM yyyy", { locale: ro })
                        : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{sub.total_paid || 0} RON</TableCell>
                    <TableCell>{sub.payments_count || 0}</TableCell>
                    <TableCell>
                      {sub.has_missing_invoice ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" /> Lipsă
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Activ</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Free Access Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent-foreground" />
            Utilizatori Free Access — Candidați Conversie ({freeUsers.length})
          </CardTitle>
          <CardDescription>
            Utilizatori cu acces gratuit care ar putea fi convertiți la abonamentul YANA de 49 RON
          </CardDescription>
        </CardHeader>
        <CardContent>
          {freeUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Niciun utilizator cu acces gratuit.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nume</TableHead>
                  <TableHead>Înregistrat</TableHead>
                  <TableHead>Acțiune</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freeUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || "—"}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd MMM yyyy", { locale: ro })}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled>
                        <Send className="h-3 w-3 mr-1" />
                        Trimite Ofertă
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default YanaSubscribersDashboard;
