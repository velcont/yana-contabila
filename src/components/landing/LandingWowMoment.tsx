import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, Sparkles, TrendingUp, Wallet, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/utils/analytics";

interface DemoResult {
  success: boolean;
  company?: string | null;
  cui?: string | null;
  metrics: {
    revenue: number;
    expenses: number;
    profit: number;
    cash: number;
    cashRunwayMonths: number | null;
    dso: number | null;
    soldClienti: number | null;
    soldFurnizori: number | null;
  };
  healthScore: number;
  risks: string[];
}

const STEPS = [
  "Citesc conturile din balanță…",
  "Calculez venituri și cheltuieli…",
  "Evaluez lichiditatea și cash runway…",
  "Detectez riscurile și pregătesc dashboardul…",
];

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n) + " RON";

export function LandingWowMoment() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);

  const runAnalysis = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setLoading(true);
      setStepIndex(0);
      analytics.landingCtaClick("wow_upload", file.name.slice(-30));

      // Animate steps while request runs
      const stepTimer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      }, 900);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Nu am putut citi fișierul."));
          reader.readAsDataURL(file);
        });

        const { data, error: fnError } = await supabase.functions.invoke(
          "demo-analyze-balance",
          { body: { excelBase64: base64, fileName: file.name } },
        );

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || "Analiză eșuată.");

        setStepIndex(STEPS.length - 1);
        setResult(data as DemoResult);
      } catch (e: any) {
        setError(e?.message || "A apărut o eroare la analiză.");
      } finally {
        clearInterval(stepTimer);
        setLoading(false);
      }
    },
    [],
  );

  const onFile = (file?: File | null) => {
    if (!file) return;
    const ok = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!ok) {
      setError("Doar fișiere Excel (.xlsx sau .xls).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Fișierul e prea mare (max 8MB pentru demo).");
      return;
    }
    runAnalysis(file);
  };

  const scoreColor =
    result && result.healthScore >= 70
      ? "text-emerald-500"
      : result && result.healthScore >= 40
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <section className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Demonstrație în 15 secunde
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Aruncă balanța ta aici.
          <br />
          <span className="text-primary">Vezi diagnosticul instant.</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Fără cont. Fără card. Doar un fișier <code className="px-1 rounded bg-muted">.xlsx</code> și YANA îți spune unde stai financiar.
        </p>
      </div>

      {!result && !loading && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 text-center ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <p className="font-semibold text-sm">Trage balanța aici sau apasă pentru a alege</p>
          <p className="text-xs text-muted-foreground mt-1">Excel .xlsx sau .xls · max 8MB</p>
        </div>
      )}

      {loading && (
        <Card className="p-6 space-y-4 border-primary/20 bg-gradient-to-br from-background to-primary/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{STEPS[stepIndex]}</p>
          </div>
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i < stepIndex ? "bg-emerald-500" : i === stepIndex ? "bg-primary animate-pulse" : "bg-muted"
                  }`}
                />
                <span className={i <= stepIndex ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setError(null)}>
            Încearcă din nou
          </Button>
        </Card>
      )}

      {result && (
        <div className="space-y-3 animate-fade-in">
          {result.company && (
            <p className="text-xs text-muted-foreground text-center">
              Analiză pentru <strong className="text-foreground">{result.company}</strong>
              {result.cui ? ` · CUI ${result.cui}` : ""}
            </p>
          )}

          {/* Card 1: Health Score */}
          <Card
            className="p-5 border-primary/20 bg-gradient-to-br from-background to-primary/5"
            style={{ animation: "fade-in 0.4s ease-out 0.05s both" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Health Score</p>
                <p className={`text-4xl font-bold ${scoreColor}`}>{result.healthScore}<span className="text-lg text-muted-foreground">/100</span></p>
              </div>
              <TrendingUp className={`w-10 h-10 ${scoreColor} opacity-70`} />
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  result.healthScore >= 70 ? "bg-emerald-500" : result.healthScore >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${result.healthScore}%` }}
              />
            </div>
          </Card>

          {/* Card 2: Cash & runway */}
          <Card className="p-5" style={{ animation: "fade-in 0.4s ease-out 0.2s both" }}>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Cash disponibil & Runway</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Cash total</p>
                <p className="text-lg font-bold">{formatMoney(result.metrics.cash)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Runway estimat</p>
                <p className="text-lg font-bold">
                  {result.metrics.cashRunwayMonths !== null
                    ? `${result.metrics.cashRunwayMonths} luni`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Venituri (perioadă)</p>
                <p className="text-sm font-semibold">{formatMoney(result.metrics.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`text-sm font-semibold ${result.metrics.profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatMoney(result.metrics.profit)}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 3: Risks */}
          <Card className="p-5" style={{ animation: "fade-in 0.4s ease-out 0.35s both" }}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-semibold">Ce a observat YANA</p>
            </div>
            <ul className="space-y-1.5 text-sm">
              {result.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* CTA */}
          <div
            className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground space-y-3 text-center"
            style={{ animation: "fade-in 0.4s ease-out 0.5s both" }}
          >
            <p className="text-sm font-medium opacity-90">Ai văzut ce vede YANA în 15 secunde.</p>
            <p className="text-lg font-bold">Vrei analiza completă, cu recomandări și strategie?</p>
            <Button
              size="lg"
              variant="secondary"
              className="w-full font-semibold"
              onClick={() => {
                analytics.landingCtaClick("wow_signup", "post_analysis");
                navigate("/auth?redirect=/yana");
              }}
            >
              Continuă gratuit 30 de zile
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-xs opacity-75">Fără card. Anulezi oricând.</p>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="text-xs text-muted-foreground hover:text-primary mx-auto block"
          >
            ← Încearcă altă balanță
          </button>
        </div>
      )}
    </section>
  );
}