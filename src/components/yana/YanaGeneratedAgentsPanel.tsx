/**
 * YanaGeneratedAgentsPanel — vizualizare agenți auto-generați de YANA.
 * Read-only pentru utilizatori autentificați, cu vizibilitate la slug, scop,
 * tip, schedule, succes-rate și ultima execuție.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, Clock, Activity } from "lucide-react";

interface GeneratedAgent {
  id: string;
  agent_slug: string;
  display_name: string;
  description: string;
  agent_type: string;
  schedule: string;
  is_active: boolean;
  execution_count: number;
  success_count: number;
  last_executed_at: string | null;
  creation_reason: string | null;
  created_at: string;
}

export function YanaGeneratedAgentsPanel() {
  const [agents, setAgents] = useState<GeneratedAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("yana_generated_agents")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (mounted) {
        setAgents((data as GeneratedAgent[]) || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Se încarcă agenții...</div>;
  }

  if (agents.length === 0) {
    return (
      <Card className="p-6 text-center bg-muted/30">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          YANA nu a creat încă agenți specializați. Va face asta automat când va detecta nevoia.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Agenți auto-generați de YANA ({agents.length})</h3>
      </div>
      {agents.map((a) => {
        const successRate = a.execution_count > 0
          ? Math.round((a.success_count / a.execution_count) * 100)
          : null;
        return (
          <Card key={a.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{a.display_name}</div>
                <div className="text-xs text-muted-foreground">{a.description}</div>
              </div>
              <Badge variant={a.agent_type === "meta_improvement" ? "secondary" : "default"} className="text-xs shrink-0">
                {a.agent_type === "meta_improvement" ? "meta" : "sub-agent"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.schedule}</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{a.execution_count} rulări</span>
              {successRate !== null && <span>{successRate}% succes</span>}
            </div>
            {a.creation_reason && (
              <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                Motiv creare: {a.creation_reason}
              </div>
            )}
            <code className="text-[10px] text-muted-foreground/70 block truncate">{a.agent_slug}</code>
          </Card>
        );
      })}
    </div>
  );
}