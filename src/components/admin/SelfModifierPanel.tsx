import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, GitPullRequest, ShieldAlert, Power } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  kill_switch: boolean;
  max_per_day: number;
  allow_db_migrations: boolean;
  allow_config_changes: boolean;
  allowed_scopes: string[];
  forbidden_paths: string[];
};

type Mod = {
  id: string;
  rationale: string;
  status: string;
  pr_url: string | null;
  pr_number: number | null;
  created_at: string;
  files_changed: any;
  notes: string | null;
  error_rate_baseline: number | null;
  error_rate_post: number | null;
};

export const SelfModifierPanel = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, m] = await Promise.all([
      supabase.from("yana_self_mod_settings").select("*").eq("id", 1).single(),
      supabase.from("yana_self_modifications").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (s.data) setSettings(s.data as any);
    if (m.data) setMods(m.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateSetting = async (patch: Partial<Settings>) => {
    const { error } = await supabase.from("yana_self_mod_settings").update(patch).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Setări actualizate");
    load();
  };

  const statusColor = (s: string) => {
    if (s === "deployed") return "default";
    if (s === "merged" || s === "build_pending") return "secondary";
    if (s === "build_failed" || s === "monitoring" || s === "killed" || s === "reverted") return "destructive";
    return "outline";
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* KILL SWITCH */}
      <Card className={`p-4 border-2 ${settings?.kill_switch ? "border-destructive bg-destructive/5" : "border-green-500/30 bg-green-500/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className={settings?.kill_switch ? "text-destructive" : "text-green-500"} />
            <div>
              <div className="font-semibold">Kill Switch — Self-Modification</div>
              <div className="text-xs text-muted-foreground">
                {settings?.kill_switch ? "BLOCAT — Yana NU poate modifica codul" : "ACTIV — Yana poate modifica codul autonom"}
              </div>
            </div>
          </div>
          <Switch
            checked={!settings?.kill_switch}
            onCheckedChange={(v) => updateSetting({ kill_switch: !v })}
          />
        </div>
      </Card>

      {/* SETTINGS */}
      <Card className="p-4 space-y-3">
        <div className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Rails de siguranță</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-2 rounded border">
            <span>Max modificări/zi: <strong>{settings?.max_per_day}</strong></span>
          </div>
          <div className="flex items-center justify-between p-2 rounded border">
            <span>DB migrations</span>
            <Switch checked={settings?.allow_db_migrations} onCheckedChange={(v) => updateSetting({ allow_db_migrations: v })} />
          </div>
          <div className="flex items-center justify-between p-2 rounded border col-span-2">
            <span>Config changes (vite, tailwind, package.json)</span>
            <Switch checked={settings?.allow_config_changes} onCheckedChange={(v) => updateSetting({ allow_config_changes: v })} />
          </div>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Forbidden paths (hard-coded)</summary>
          <ul className="mt-2 space-y-0.5 font-mono">
            {settings?.forbidden_paths.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        </details>
      </Card>

      {/* HISTORY */}
      <Card className="p-4">
        <div className="font-semibold mb-3 flex items-center gap-2"><GitPullRequest className="h-4 w-4" /> Ultimele modificări auto</div>
        {mods.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nicio modificare încă.</div>
        ) : (
          <div className="space-y-2">
            {mods.map((m) => (
              <div key={m.id} className="p-2 border rounded text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate">
                    {m.pr_url ? (
                      <a href={m.pr_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        #{m.pr_number} — {m.rationale}
                      </a>
                    ) : m.rationale}
                  </div>
                  <Badge variant={statusColor(m.status) as any}>{m.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(m.created_at).toLocaleString("ro-RO")} · {Array.isArray(m.files_changed) ? m.files_changed.length : 0} fișier(e)
                  {m.error_rate_post !== null && ` · errors: ${m.error_rate_baseline}→${m.error_rate_post}`}
                </div>
                {m.notes && <div className="text-xs text-destructive mt-1 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{m.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
    </div>
  );
};