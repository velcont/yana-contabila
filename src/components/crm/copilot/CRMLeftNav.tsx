import { cn } from "@/lib/utils";
import {
  MessageSquare,
  KanbanSquare,
  AlertTriangle,
  Building2,
  Users,
  Flame,
  Target,
  BarChart3,
  Mail,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CRMView =
  | "chat"
  | "pipeline"
  | "alerts"
  | "companies"
  | "contacts"
  | "leads"
  | "forecast"
  | "reports"
  | "templates"
  | "duplicates";

export const CRM_NAV: { id: CRMView; label: string; icon: any }[] = [
  { id: "chat", label: "Chat copilot", icon: MessageSquare },
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { id: "alerts", label: "Alerte", icon: AlertTriangle },
  { id: "companies", label: "Firme", icon: Building2 },
  { id: "contacts", label: "Contacte", icon: Users },
  { id: "leads", label: "Scor leads", icon: Flame },
  { id: "forecast", label: "Forecast", icon: Target },
  { id: "reports", label: "Rapoarte", icon: BarChart3 },
  { id: "templates", label: "Templates", icon: Mail },
  { id: "duplicates", label: "Duplicate", icon: Copy },
];

export function CRMLeftNav({
  active,
  onSelect,
  alertCount,
  className,
}: {
  active: CRMView;
  onSelect: (v: CRMView) => void;
  alertCount: number;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-0.5 p-2", className)}>
      {CRM_NAV.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{it.label}</span>
            {it.id === "alerts" && alertCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{alertCount}</Badge>
            )}
          </button>
        );
      })}
    </nav>
  );
}