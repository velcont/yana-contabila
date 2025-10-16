import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Zap, Rocket, Crown } from "lucide-react";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceId: string;
  popular?: boolean;
  icon: any;
  description: string;
}

const creditPackages: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 1000,
    price: 10,
    priceId: "price_1SIsUMBu3m83VcDA5X8MPfrS",
    icon: Sparkles,
    description: "Perfect pentru testare",
  },
  {
    id: "pro",
    name: "Professional",
    credits: 2500,
    price: 20,
    priceId: "price_1SIsUPBu3m83VcDAqCC955qF",
    popular: true,
    icon: Zap,
    description: "Cel mai popular",
  },
  {
    id: "business",
    name: "Business",
    credits: 5000,
    price: 40,
    priceId: "price_1SIsUQBu3m83VcDAQUwk4CZZ",
    icon: Rocket,
    description: "Pentru utilizare intensă",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: 10000,
    price: 70,
    priceId: "price_1SIsUQBu3m83VcDAykzaXTeT",
    icon: Crown,
    description: "Soluție completă",
  },
];

export const AICreditsPurchase = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, packageId: string) => {
    setLoading(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Eroare la crearea checkout-ului", {
        description: error.message,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Cumpără Credite AI</h2>
        <p className="text-muted-foreground">
          Alege pachetul potrivit pentru nevoile tale
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {creditPackages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <Card
              key={pkg.id}
              className={`relative ${
                pkg.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Popular
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-center">{pkg.name}</CardTitle>
                <CardDescription className="text-center">
                  {pkg.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{pkg.price} lei</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {pkg.credits.toLocaleString()} credite
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    ~{Math.round(pkg.credits / 10)} analize AI
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handlePurchase(pkg.priceId, pkg.id)}
                  disabled={loading === pkg.id}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  {loading === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se procesează...
                    </>
                  ) : (
                    "Cumpără"
                  )}
                </Button>

                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Alocare instant</li>
                  <li>✓ Email confirmare</li>
                  <li>✓ Fără expirare</li>
                  <li>✓ Suport prioritar</li>
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-center">
        <p className="font-medium mb-2">💳 Plată securizată prin Stripe</p>
        <p className="text-muted-foreground">
          Creditele sunt alocate automat după plată. Vei primi email de confirmare imediat.
        </p>
      </div>
    </div>
  );
};
