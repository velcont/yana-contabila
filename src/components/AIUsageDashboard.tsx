import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertTriangle, Activity, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AICreditsPurchase } from "@/components/AICreditsPurchase";

interface MonthlyUsage {
  user_id: string;
  month_year: string;
  total_requests: number;
  total_tokens: number;
  total_cost_cents: number;
  budget_cents: number;
  usage_percent: number;
}

export const AIUsageDashboard = () => {
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);

  // Check for success/cancel params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits_success") === "true") {
      toast.success("✅ Credite adăugate cu succes!", {
        description: "Creditele tale AI au fost actualizate.",
      });
      fetchUsage();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("credits_cancel") === "true") {
      toast.info("Achiziție anulată", {
        description: "Poți cumpăra credite oricând.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase.rpc("get_monthly_ai_usage");

      if (error) {
        console.warn("RPC get_monthly_ai_usage failed, falling back:", error);
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;
        let budgetCents = 1000;
        if (userId) {
          const { data: limit } = await supabase
            .from("ai_budget_limits")
            .select("monthly_budget_cents")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (limit?.monthly_budget_cents) budgetCents = limit.monthly_budget_cents;
        }
        const fallback: MonthlyUsage = {
          user_id: userId || "",
          month_year: new Date().toISOString().slice(0, 7),
          total_requests: 0,
          total_tokens: 0,
          total_cost_cents: 0,
          budget_cents: budgetCents,
          usage_percent: 0,
        };
        setUsage(fallback);
        return;
      }
      const usageData = data?.[0] || null;
      setUsage(usageData);
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      const fallback: MonthlyUsage = {
        user_id: "",
        month_year: new Date().toISOString().slice(0, 7),
        total_requests: 0,
        total_tokens: 0,
        total_cost_cents: 0,
        budget_cents: 1000,
        usage_percent: 0,
      };
      setUsage(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Se încarcă...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPurchase) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowPurchase(false)}>
          ← Înapoi la Dashboard
        </Button>
        <AICreditsPurchase />
      </div>
    );
  }

  const costUSD = usage ? (usage.total_cost_cents / 100).toFixed(2) : "0.00";
  const budgetUSD = usage ? (usage.budget_cents / 100).toFixed(2) : "10.00";
  const usagePercent = usage?.usage_percent || 0;
  const remainingUSD = (() => {
    const b = parseFloat(budgetUSD);
    const c = parseFloat(costUSD);
    return Math.max(0, b - c).toFixed(2);
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Luna Curentă</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costUSD}</div>
            <p className="text-xs text-muted-foreground">din ${budgetUSD} buget</p>
            <p className="text-xs text-muted-foreground">Rămas: ${remainingUSD}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cereri Procesate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.total_requests?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total această lună
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token-uri Consumate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.total_tokens ? (usage.total_tokens / 1000).toFixed(1) + "K" : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Input + Output tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizare Buget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usagePercent.toFixed(1)}%</div>
            <Progress value={usagePercent} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Purchase Button */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Ai nevoie de mai multe credite?</h3>
              <p className="text-sm text-muted-foreground">
                Cumpără credite instant cu plată securizată prin Stripe
              </p>
            </div>
            <Button size="lg" onClick={() => setShowPurchase(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cumpără Credite
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
