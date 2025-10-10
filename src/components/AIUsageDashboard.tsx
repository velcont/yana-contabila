import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [newBudget, setNewBudget] = useState("");

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase.rpc("get_monthly_ai_usage");

      if (error) throw error;
      setUsage(data?.[0] || null);
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      toast.error("Eroare la încărcarea datelor de utilizare");
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async () => {
    if (!newBudget || isNaN(parseFloat(newBudget))) {
      toast.error("Introdu o valoare validă");
      return;
    }

    try {
      const budgetCents = Math.round(parseFloat(newBudget) * 100);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      // Check if budget limit exists
      const { data: existing } = await supabase
        .from("ai_budget_limits")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("ai_budget_limits")
          .update({ monthly_budget_cents: budgetCents })
          .eq("user_id", user.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("ai_budget_limits")
          .insert({
            user_id: user.id,
            monthly_budget_cents: budgetCents,
          });
        
        if (error) throw error;
      }

      toast.success("Buget actualizat cu succes");
      await fetchUsage();
      setNewBudget("");
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Eroare la actualizarea bugetului");
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-muted-foreground">Se încarcă...</div>
        </CardContent>
      </Card>
    );
  }

  const costUSD = usage ? (usage.total_cost_cents / 100).toFixed(2) : "0.00";
  const budgetUSD = usage ? (usage.budget_cents / 100).toFixed(2) : "10.00";
  const usagePercent = usage?.usage_percent || 0;

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
            <p className="text-xs text-muted-foreground">
              din ${budgetUSD} buget
            </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Gestionare Buget</CardTitle>
          <CardDescription>
            Setează limita lunară de cheltuieli pentru serviciile AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usagePercent > 80 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Atenție! Ai folosit {usagePercent.toFixed(1)}% din bugetul lunar.
              </span>
            </div>
          )}

          {usagePercent >= 100 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                Bugetul lunar a fost depășit! Unele funcționalități AI pot fi limitate.
              </span>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="budget">Buget Lunar (USD)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                placeholder={budgetUSD}
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={updateBudget}>
                Actualizează Buget
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">ℹ️ Prețuri estimate per 1M tokens:</p>
            <ul className="space-y-1 text-xs">
              <li>• Gemini 2.5 Flash (recomandat): $0.08-$0.30</li>
              <li>• Gemini 2.5 Pro: $1.25-$5.00</li>
              <li>• GPT-5 Mini: $0.15-$0.60</li>
              <li>• GPT-5: $2.50-$10.00</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
