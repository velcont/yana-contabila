import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plug, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ApiProvider {
  name: string;
  displayName: string;
  dashboardUrl: string;
  description: string;
  hasInternalBalance?: boolean;
}

const API_PROVIDERS: ApiProvider[] = [
  {
    name: "lovable",
    displayName: "Lovable AI",
    dashboardUrl: "https://lovable.dev/settings/workspace/usage",
    description: "Gateway AI (Gemini, GPT-5)",
    hasInternalBalance: true,
  },
  {
    name: "anthropic",
    displayName: "Anthropic",
    dashboardUrl: "https://console.anthropic.com/settings/billing",
    description: "Claude Sonnet & Haiku",
  },
  {
    name: "openai",
    displayName: "OpenAI",
    dashboardUrl: "https://platform.openai.com/usage",
    description: "GPT-5 direct",
  },
  {
    name: "grok",
    displayName: "xAI (Grok)",
    dashboardUrl: "https://console.x.ai/",
    description: "Grok 3",
  },
  {
    name: "perplexity",
    displayName: "Perplexity",
    dashboardUrl: "https://www.perplexity.ai/settings/api",
    description: "Research & Search",
  },
  {
    name: "resend",
    displayName: "Resend",
    dashboardUrl: "https://resend.com/api-keys",
    description: "Email delivery",
  },
];

export function ApiStatusWidget() {
  const openDashboard = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plug className="h-5 w-5" />
          🔌 Status API-uri
        </CardTitle>
        <CardDescription>
          Verifică creditele și statusul fiecărui provider AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {API_PROVIDERS.map((provider) => (
            <div
              key={provider.name}
              className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{provider.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {provider.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => openDashboard(provider.dashboardUrl)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>Configurat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span>Credite scăzute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span>Nesetat</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          💡 Click pe iconiță pentru a deschide dashboard-ul fiecărui provider și a verifica creditele rămase.
        </p>
      </CardContent>
    </Card>
  );
}
