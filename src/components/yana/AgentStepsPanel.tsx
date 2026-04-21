/**
 * AgentStepsPanel — afișează pașii executați de agent (gândire, unelte folosite, rezultate)
 * Toggle "Vezi procesul" în UI principal.
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Wrench, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStep } from '@/hooks/useYanaAgent';

interface AgentStepsPanelProps {
  steps: AgentStep[];
  isRunning: boolean;
  defaultOpen?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  search_companies: '🏢 Caut companii',
  get_latest_balance: '📊 Iau ultima balanță',
  create_task: '✅ Creez sarcină',
  create_calendar_event: '📅 Programez eveniment',
  save_note: '💾 Salvez notă',
  web_research: '🔍 Cercetez online',
  get_user_context: '👤 Verific contextul tău',
};

export function AgentStepsPanel({ steps, isRunning, defaultOpen = false }: AgentStepsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (steps.length === 0 && !isRunning) return null;

  const toolCalls = steps.filter(s => s.type === 'tool_call').length;

  return (
    <div className="my-2 rounded-lg border border-border/50 bg-muted/30 overflow-hidden text-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium text-foreground">
            {isRunning ? 'Agent lucrează...' : `Proces agent (${toolCalls} unelte)`}
          </span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/30">
          {steps.map((step, i) => (
            <StepItem key={i} step={step} />
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>În curs...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepItem({ step }: { step: AgentStep }) {
  if (step.type === 'thinking') {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span className="italic">{step.text}</span>
      </div>
    );
  }

  if (step.type === 'tool_call') {
    return (
      <div className="flex items-start gap-2 text-xs">
        <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{TOOL_LABELS[step.name] || step.name}</div>
          {Object.keys(step.args).length > 0 && (
            <div className="text-muted-foreground truncate font-mono text-[10px]">
              {JSON.stringify(step.args).slice(0, 120)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step.type === 'tool_result') {
    const result = step.result as Record<string, unknown> | undefined;
    const isError = result && typeof result === 'object' && 'error' in result;
    const isSuccess = result && typeof result === 'object' && 'success' in result && (result as { success: boolean }).success;
    return (
      <div className={cn(
        "flex items-start gap-2 text-xs ml-5 pl-2 border-l-2",
        isError ? "border-destructive/40 text-destructive" : "border-primary/40 text-muted-foreground"
      )}>
        <CheckCircle2 className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", isSuccess ? "text-primary" : "text-muted-foreground/50")} />
        <span className="truncate">
          {isError
            ? `Eroare: ${(result as { error: string }).error}`
            : (result as { message?: string })?.message || 'Rezultat obținut'}
        </span>
      </div>
    );
  }

  return null;
}