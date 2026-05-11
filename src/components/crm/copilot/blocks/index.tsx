import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

/**
 * Generative UI blocks for the CRM Copilot chat stream.
 * Each block is encoded by YANA inside her response as:
 *   [CRM_KPI]{...json...}[/CRM_KPI]
 *   [CRM_TABLE]{...}[/CRM_TABLE]
 *   [CRM_TIMELINE]{...}[/CRM_TIMELINE]
 *   [CRM_DRAFT_EMAIL]{...}[/CRM_DRAFT_EMAIL]
 *   [CRM_ACTION_CARD]{...}[/CRM_ACTION_CARD]
 */

export type CRMBlock =
  | { type: "kpi"; data: KpiData }
  | { type: "table"; data: TableData }
  | { type: "timeline"; data: TimelineData }
  | { type: "draft_email"; data: DraftEmailData }
  | { type: "action_card"; data: ActionCardData };

export interface KpiData {
  items: { label: string; value: string | number; delta?: number; hint?: string }[];
  source?: string;
}
export interface TableData {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  source?: string;
}
export interface TimelineData {
  title?: string;
  items: { ts: string; label: string; description?: string }[];
}
export interface DraftEmailData {
  to?: string;
  subject: string;
  body: string;
}
export interface ActionCardData {
  id: string;
  action: string; // e.g. "create_deal" / "move_stage" / "create_task"
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
}

const TAGS = ["KPI", "TABLE", "TIMELINE", "DRAFT_EMAIL", "ACTION_CARD"] as const;

/** Splits a raw assistant message into interleaved text + structured blocks. */
export function parseCRMBlocks(raw: string): Array<{ kind: "text"; text: string } | { kind: "block"; block: CRMBlock }> {
  if (!raw) return [];
  const re = new RegExp(
    `\\[CRM_(${TAGS.join("|")})\\]([\\s\\S]*?)\\[/CRM_\\1\\]`,
    "g",
  );
  const out: Array<{ kind: "text"; text: string } | { kind: "block"; block: CRMBlock }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) out.push({ kind: "text", text: raw.slice(last, m.index) });
    const tag = m[1];
    const body = m[2].trim();
    try {
      const data = JSON.parse(body);
      const map: Record<string, CRMBlock["type"]> = {
        KPI: "kpi",
        TABLE: "table",
        TIMELINE: "timeline",
        DRAFT_EMAIL: "draft_email",
        ACTION_CARD: "action_card",
      };
      out.push({ kind: "block", block: { type: map[tag], data } as CRMBlock });
    } catch {
      out.push({ kind: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ kind: "text", text: raw.slice(last) });
  return out;
}

export function KpiBlock({ data }: { data: KpiData }) {
  return (
    <div className="my-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {data.items.map((k, i) => (
        <Card key={i} className="bg-card/60">
          <CardContent className="p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold">{k.value}</p>
              {typeof k.delta === "number" && (
                <span className={`text-[10px] flex items-center gap-0.5 ${k.delta >= 0 ? "text-success" : "text-destructive"}`}>
                  {k.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(k.delta)}%
                </span>
              )}
            </div>
            {k.hint && <p className="text-[10px] text-muted-foreground/70">{k.hint}</p>}
          </CardContent>
        </Card>
      ))}
      {data.source && <p className="col-span-full text-[10px] text-muted-foreground/60 italic">{data.source}</p>}
    </div>
  );
}

export function TableBlock({ data }: { data: TableData }) {
  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden bg-card/60">
      {data.title && <div className="px-3 py-2 text-xs font-semibold border-b bg-muted/30">{data.title}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/20">
            <tr>{data.columns.map((c, i) => <th key={i} className="px-3 py-2 text-left font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i} className="border-t border-border/50">
                {r.map((cell, j) => <td key={j} className="px-3 py-1.5">{String(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.source && <p className="px-3 py-1 text-[10px] text-muted-foreground/60 italic border-t">{data.source}</p>}
    </div>
  );
}

export function TimelineBlock({ data }: { data: TimelineData }) {
  return (
    <div className="my-2 space-y-2">
      {data.title && <p className="text-xs font-semibold">{data.title}</p>}
      <ol className="relative border-l border-border/60 ml-2 space-y-2">
        {data.items.map((it, i) => (
          <li key={i} className="ml-3 pl-2">
            <span className="absolute -left-[5px] mt-1 w-2 h-2 rounded-full bg-primary" />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {it.ts}
            </p>
            <p className="text-xs font-medium">{it.label}</p>
            {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DraftEmailBlock({
  data,
  onSend,
  onSaveTemplate,
}: {
  data: DraftEmailData;
  onSend?: (d: DraftEmailData) => void;
  onSaveTemplate?: (d: DraftEmailData) => void;
}) {
  const [subject, setSubject] = useState(data.subject);
  const [body, setBody] = useState(data.body);
  return (
    <Card className="my-2 border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Mail className="w-3 h-3" />
          Draft email{data.to ? ` · către ${data.to}` : ""}
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full text-sm font-semibold bg-transparent border-b border-border/50 focus:outline-none focus:border-primary py-1"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full text-xs bg-transparent resize-none focus:outline-none whitespace-pre-wrap"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {onSend && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onSend({ ...data, subject, body })}>
              <Mail className="w-3 h-3" /> Trimite
            </Button>
          )}
          {onSaveTemplate && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSaveTemplate({ ...data, subject, body })}>
              Salvează template
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActionCardBlock({
  data,
  onConfirm,
  onCancel,
}: {
  data: ActionCardData;
  onConfirm?: (d: ActionCardData) => void;
  onCancel?: (d: ActionCardData) => void;
}) {
  const [state, setState] = useState<"pending" | "confirmed" | "cancelled">("pending");
  return (
    <Card className={`my-2 ${state === "confirmed" ? "border-success/40 bg-success/5" : state === "cancelled" ? "opacity-60" : "border-amber-500/40 bg-amber-500/5"}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {state === "confirmed" ? (
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{data.title}</p>
            {data.description && <p className="text-xs text-muted-foreground">{data.description}</p>}
            <Badge variant="outline" className="mt-1 text-[10px]">{data.action}</Badge>
          </div>
        </div>
        {state === "pending" && (
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setState("confirmed"); onConfirm?.(data); }}>
              Confirmă <ArrowRight className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setState("cancelled"); onCancel?.(data); }}>
              Anulează
            </Button>
          </div>
        )}
        {state === "confirmed" && <p className="text-[11px] text-success">Acțiune confirmată — YANA o execută.</p>}
        {state === "cancelled" && <p className="text-[11px] text-muted-foreground">Anulată.</p>}
      </CardContent>
    </Card>
  );
}

/** Render a parsed sequence of text + blocks. */
export function BlockRenderer({
  parts,
  TextRenderer,
  onSendEmail,
  onSaveTemplate,
  onConfirmAction,
  onCancelAction,
}: {
  parts: ReturnType<typeof parseCRMBlocks>;
  TextRenderer: (text: string) => React.ReactNode;
  onSendEmail?: (d: DraftEmailData) => void;
  onSaveTemplate?: (d: DraftEmailData) => void;
  onConfirmAction?: (d: ActionCardData) => void;
  onCancelAction?: (d: ActionCardData) => void;
}) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "text") return <div key={i}>{TextRenderer(p.text)}</div>;
        const b = p.block;
        switch (b.type) {
          case "kpi": return <KpiBlock key={i} data={b.data} />;
          case "table": return <TableBlock key={i} data={b.data} />;
          case "timeline": return <TimelineBlock key={i} data={b.data} />;
          case "draft_email": return <DraftEmailBlock key={i} data={b.data} onSend={onSendEmail} onSaveTemplate={onSaveTemplate} />;
          case "action_card": return <ActionCardBlock key={i} data={b.data} onConfirm={onConfirmAction} onCancel={onCancelAction} />;
          default: return null;
        }
      })}
    </>
  );
}