import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bot, Loader2, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Settings = {
  enabled: boolean;
  mode: "draft" | "auto_whitelist" | "auto_all";
  frequency_minutes: number;
  system_prompt: string;
  signature: string;
  blacklist: string[];
  whitelist: string[];
  mark_as_read: boolean;
  last_run_at: string | null;
};

const DEFAULTS: Settings = {
  enabled: false,
  mode: "draft",
  frequency_minutes: 5,
  system_prompt:
    'Ești un asistent profesional care redactează răspunsuri scurte, politicoase și clare la emailuri în limba română. Folosește semnătura configurată. Niciodată nu da sfaturi fiscale/juridice fără disclaimer „verificați cu un specialist". Dacă emailul cere o decizie urgentă/sensibilă, scrie un draft scurt care confirmă primirea și promite revenire.',
  signature: "",
  blacklist: ["noreply@", "no-reply@", "newsletter@", "notifications@", "mailer-daemon@", "postmaster@"],
  whitelist: [],
  mark_as_read: false,
  last_run_at: null,
};

export default function GmailResponder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("gmail_responder_settings")
      .select("*")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...data } as Settings);
    const { data: logRows } = await supabase
      .from("gmail_responder_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(logRows ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("not signed in");
      const { error } = await supabase
        .from("gmail_responder_settings")
        .upsert({ user_id: u.user.id, ...settings }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Salvat", description: "Setările auto-responderului au fost actualizate." });
    } catch (e) {
      toast({ title: "Eroare", description: e instanceof Error ? e.message : "—", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("gmail-auto-responder", {
        body: { user_id: u.user?.id },
      });
      if (error) throw error;
      toast({ title: "Rulare manuală", description: JSON.stringify(data?.results?.[0] ?? data) });
      await load();
    } catch (e) {
      toast({ title: "Eroare", description: e instanceof Error ? e.message : "—", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/yana")} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Înapoi la YANA
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Bot className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">Auto-Responder Email</h1>
          <p className="text-sm text-muted-foreground">YANA citește inbox-ul tău Gmail și pregătește draft-uri de răspuns automat.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurare</CardTitle>
          <CardDescription>Folosește contul Google deja conectat. Necesită permisiunea Gmail (citire + draft).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Activat</Label>
              <p className="text-xs text-muted-foreground">Când e activat, YANA verifică inbox-ul la intervalul de mai jos.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Mod operare</Label>
              <Select value={settings.mode} onValueChange={(v: any) => setSettings({ ...settings, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Doar draft (recomandat)</SelectItem>
                  <SelectItem value="auto_whitelist">Auto-trimite la whitelist</SelectItem>
                  <SelectItem value="auto_all">Auto-trimite la TOȚI (risc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frecvență (minute)</Label>
              <Input type="number" min={2} max={60} value={settings.frequency_minutes}
                onChange={(e) => setSettings({ ...settings, frequency_minutes: parseInt(e.target.value || "5") })} />
            </div>
          </div>

          <div>
            <Label>System prompt</Label>
            <Textarea rows={5} value={settings.system_prompt}
              onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })} />
          </div>

          <div>
            <Label>Semnătură</Label>
            <Textarea rows={3} value={settings.signature}
              placeholder={"Ex:\nCu stimă,\nEchipa Velcont"}
              onChange={(e) => setSettings({ ...settings, signature: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Blacklist (un element pe linie)</Label>
              <Textarea rows={4} value={settings.blacklist.join("\n")}
                onChange={(e) => setSettings({ ...settings, blacklist: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div>
              <Label>Whitelist (auto-send doar la aceștia)</Label>
              <Textarea rows={4} value={settings.whitelist.join("\n")}
                onChange={(e) => setSettings({ ...settings, whitelist: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Marchează ca citit după draft</Label>
            <Switch checked={settings.mark_as_read} onCheckedChange={(v) => setSettings({ ...settings, mark_as_read: v })} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground">
              Ultima rulare: {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString("ro-RO") : "niciodată"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={runNow} disabled={running}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Rulează acum
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvează
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Activitate recentă</CardTitle>
            <CardDescription>Ultimele 20 emailuri procesate</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Niciun email procesat încă.</p>}
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{l.subject || "(fără subiect)"}</div>
                  <Badge variant={l.status === "drafted" ? "default" : l.status === "sent" ? "secondary" : "destructive"}>
                    {l.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{l.from_address} • {new Date(l.created_at).toLocaleString("ro-RO")}</div>
                {l.generated_draft && <div className="mt-2 whitespace-pre-wrap text-xs text-foreground/80 line-clamp-4">{l.generated_draft}</div>}
                {l.error_message && <div className="mt-1 text-xs text-destructive">{l.error_message}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}