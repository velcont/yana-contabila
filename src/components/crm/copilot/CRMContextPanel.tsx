import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Flame, TrendingUp, Activity, Sparkles } from "lucide-react";

export interface ContextSummary {
  pipelineValue: number;
  dealsOpen: number;
  contacts: number;
  staleDeals: number;
  hotUncontacted: number;
  churnRisk: number;
  topAlertsLabel?: string;
  recentActivity?: { ts: string; label: string }[];
}

export function CRMContextPanel({
  summary,
  onAsk,
}: {
  summary: ContextSummary;
  onAsk: (q: string) => void;
}) {
  const totalAlerts = summary.staleDeals + summary.hotUncontacted + summary.churnRisk;

  return (
    <aside className="hidden lg:flex flex-col w-[340px] border-l border-border bg-muted/20 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Pipeline acum</p>
          <Card>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Valoare totală</span>
                <span className="font-bold text-primary text-lg">
                  {(summary.pipelineValue / 1000).toFixed(0)}k RON
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Deal-uri active</span>
                <span className="font-semibold">{summary.dealsOpen}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Contacte</span>
                <span className="font-semibold">{summary.contacts}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Atenție acum
            {totalAlerts > 0 && <Badge variant="destructive" className="text-[10px] ml-auto">{totalAlerts}</Badge>}
          </p>
          <div className="space-y-1.5">
            <AlertRow
              icon={<AlertTriangle className="w-3 h-3 text-destructive" />}
              label="Deal-uri cu termen depășit"
              value={summary.staleDeals}
              onClick={() => onAsk("Arată-mi deal-urile cu termen depășit și propune acțiuni.")}
            />
            <AlertRow
              icon={<Flame className="w-3 h-3 text-amber-500" />}
              label="Lead-uri fierbinți necontactate"
              value={summary.hotUncontacted}
              onClick={() => onAsk("Listează lead-urile fierbinți pe care nu le-am contactat.")}
            />
            <AlertRow
              icon={<Activity className="w-3 h-3 text-muted-foreground" />}
              label="Risc de churn (30+ zile)"
              value={summary.churnRisk}
              onClick={() => onAsk("Care contacte au risc de churn și ce follow-up propui?")}
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Întreabă YANA
          </p>
          <div className="space-y-1.5">
            {[
              "Ce trebuie să fac astăzi?",
              "Care sunt top 3 oportunități?",
              "Generează raport săptămânal",
            ].map((q) => (
              <button
                key={q}
                onClick={() => onAsk(q)}
                className="w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-card hover:bg-accent border border-border/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {summary.recentActivity && summary.recentActivity.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Ultima activitate
            </p>
            <ol className="space-y-1.5">
              {summary.recentActivity.slice(0, 5).map((a, i) => (
                <li key={i} className="text-[11px] text-muted-foreground border-l-2 border-primary/40 pl-2">
                  <span className="block text-foreground">{a.label}</span>
                  <span className="text-[10px]">{a.ts}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </aside>
  );
}

function AlertRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card hover:bg-accent border border-border/50 transition-colors text-left"
    >
      {icon}
      <span className="text-xs flex-1 truncate">{label}</span>
      <span className={`text-xs font-semibold ${value > 0 ? "text-foreground" : "text-muted-foreground/60"}`}>{value}</span>
    </button>
  );
}