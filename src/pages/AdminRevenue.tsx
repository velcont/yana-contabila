import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, Users, AlertTriangle, CheckCircle2, DollarSign, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface RevenueStats {
  mrr_ron: number;
  arr_ron: number;
  active_subscribers: number;
  free_access_users: number;
  trial_active: number;
  trial_expiring_7d: number;
  trial_expired_unpaid: number;
  total_signups: number;
  total_paid_ever: number;
  conversion_rate_pct: number;
  revenue_this_month_ron: number;
  revenue_last_30d_ron: number;
  payments_this_month: number;
  recent_payments: Array<{ payment_date: string; amount_paid_cents: number; currency: string; email: string; full_name: string | null }>;
  expiring_soon: Array<{ email: string; full_name: string | null; trial_ends_at: string }>;
  generated_at: string;
}

const formatRON = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(n);

export default function AdminRevenue() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_revenue_stats");
    if (error) {
      toast.error("Eroare la încărcarea statisticilor: " + error.message);
    } else {
      setStats(data as unknown as RevenueStats);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      load();
      const t = setInterval(load, 60_000);
      return () => clearInterval(t);
    }
  }, [isAdmin, roleLoading, navigate]);

  if (roleLoading || loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Revenue Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Actualizat {formatDistanceToNow(new Date(stats.generated_at), { locale: ro, addSuffix: true })} · auto-refresh 60s
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> MRR</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-primary">{formatRON(stats.mrr_ron)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              ARR: {formatRON(stats.arr_ron)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Abonați activi</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{stats.active_subscribers}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              + {stats.free_access_users} acces gratuit
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Încasări 30d</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{formatRON(stats.revenue_last_30d_ron)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Lună curentă: {formatRON(stats.revenue_this_month_ron)} ({stats.payments_this_month} plăți)
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" /> Conversie</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{stats.conversion_rate_pct}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {stats.total_paid_ever} / {stats.total_signups} signup-uri
            </CardContent>
          </Card>
        </div>

        {/* Trial pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><Clock className="h-3 w-3" /> Trial-uri active</CardDescription>
              <CardTitle className="text-xl">{stats.trial_active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="h-3 w-3" /> Expiră în 7 zile
              </CardDescription>
              <CardTitle className="text-xl">{stats.trial_expiring_7d}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Potențial: {formatRON(stats.trial_expiring_7d * 49)}/lună
            </CardContent>
          </Card>
          <Card className="border-destructive/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3 w-3" /> Trial expirat fără plată
              </CardDescription>
              <CardTitle className="text-xl">{stats.trial_expired_unpaid}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Lead-uri pierdute (țintă re-engagement)
            </CardContent>
          </Card>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plăți recente</CardTitle>
              <CardDescription>Ultimele 10 încasări</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recent_payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nicio plată înregistrată încă.</p>
              ) : (
                <div className="space-y-2">
                  {stats.recent_payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.full_name || p.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.payment_date), "dd MMM yyyy HH:mm", { locale: ro })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {(p.amount_paid_cents / 100).toFixed(0)} {p.currency}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trial-uri care expiră curând</CardTitle>
              <CardDescription>Următoarele 10 — momentul ideal de outreach</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.expiring_soon.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Niciun trial nu expiră în următoarele 7 zile.</p>
              ) : (
                <div className="space-y-2">
                  {stats.expiring_soon.map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{u.full_name || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {formatDistanceToNow(new Date(u.trial_ends_at), { locale: ro, addSuffix: true })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}