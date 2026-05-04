import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Settings as SettingsIcon,
  Loader2,
  PhoneCall,
  History,
  CalendarClock,
} from "lucide-react";

type SamantaSettings = {
  user_id: string;
  active: boolean;
  schedule: any;
  voice_agent_id: string;
  twilio_phone_number: string | null;
  forward_to_user_phone: string | null;
  escalation_keywords: string[];
  language: string;
  greeting: string | null;
  user_full_name: string | null;
  company_name: string | null;
};

type SamantaCall = {
  id: string;
  from_number: string;
  to_number: string;
  contact_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  summary: string | null;
  escalation_needed: boolean;
  transcript: any;
  recording_url: string | null;
};

type SamantaCallback = {
  id: string;
  contact_name: string | null;
  contact_phone: string;
  scheduled_for: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
}

export default function Samanta() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SamantaSettings | null>(null);
  const [calls, setCalls] = useState<SamantaCall[]>([]);
  const [callbacks, setCallbacks] = useState<SamantaCallback[]>([]);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");

  // Initial load
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: s } = await supabase.functions.invoke("samanta-settings", { method: "GET" });
        if (s?.settings) setSettings(s.settings as SamantaSettings);
        else {
          // Create default
          const { data: created } = await supabase.functions.invoke("samanta-settings", {
            body: { active: true, schedule: { mode: "24_7" }, language: "ro" },
          });
          if (created?.settings) setSettings(created.settings as SamantaSettings);
        }

        const { data: callsData } = await supabase
          .from("samanta_calls")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(50);
        setCalls((callsData as any) || []);

        const { data: cbData } = await supabase
          .from("samanta_callbacks")
          .select("*")
          .neq("status", "done")
          .order("scheduled_for", { ascending: true, nullsFirst: false })
          .limit(50);
        setCallbacks((cbData as any) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Realtime calls
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("samanta_calls_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "samanta_calls", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCalls((prev) => [payload.new as SamantaCall, ...prev]);
            toast.info("📞 Apel nou — Samanta răspunde acum");
          } else if (payload.eventType === "UPDATE") {
            setCalls((prev) => prev.map((c) => (c.id === (payload.new as any).id ? (payload.new as SamantaCall) : c)));
            const n = payload.new as SamantaCall;
            if (n.status === "completed" && n.escalation_needed) {
              toast.warning(`⚠️ Apel urgent: ${n.summary || "vezi detalii"}`, { duration: 10000 });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const liveCall = useMemo(() => calls.find((c) => c.status === "in_progress") || null, [calls]);

  const updateSettings = async (patch: Partial<SamantaSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("samanta-settings", { body: patch });
      if (error) throw error;
      if (data?.settings) {
        setSettings(data.settings as SamantaSettings);
        toast.success("Salvat");
      }
    } catch (e: any) {
      toast.error("Eroare: " + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const markCallback = async (id: string, status: "done" | "cancelled") => {
    await supabase.from("samanta_callbacks").update({ status }).eq("id", id);
    setCallbacks((prev) => prev.filter((c) => c.id !== id));
    toast.success(status === "done" ? "Marcat ca sunat" : "Anulat");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/yana">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold flex items-center gap-2 truncate">
                <Phone className="h-5 w-5 text-primary" />
                Samanta
                {settings?.active ? (
                  <Badge variant="default" className="ml-1 bg-emerald-500 hover:bg-emerald-500">ACTIVĂ</Badge>
                ) : (
                  <Badge variant="secondary">INACTIVĂ</Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground truncate">Recepționera ta vocală</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!settings?.active}
              disabled={saving}
              onCheckedChange={(v) => updateSettings({ active: v })}
            />
            <span className="text-sm hidden sm:inline">{settings?.active ? "Răspunde" : "Oprită"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="live" className="gap-1.5"><PhoneCall className="h-4 w-4" /><span className="hidden sm:inline">Live</span></TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" /><span className="hidden sm:inline">Istoric</span></TabsTrigger>
            <TabsTrigger value="callbacks" className="gap-1.5"><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">Callbacks</span></TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-4 w-4" /><span className="hidden sm:inline">Setări</span></TabsTrigger>
          </TabsList>

          {/* LIVE */}
          <TabsContent value="live" className="mt-6 space-y-4">
            {liveCall ? (
              <Card className="p-6 border-emerald-500/50 bg-emerald-500/5">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <PhoneIncoming className="h-6 w-6 text-emerald-500" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">Apel în desfășurare</div>
                    <div className="text-sm text-muted-foreground">
                      {liveCall.contact_name || "Necunoscut"} · {liveCall.from_number}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">început {formatDate(liveCall.started_at)}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <div className="font-medium">Niciun apel acum</div>
                <div className="text-sm">Samanta {settings?.active ? "ascultă în liniște" : "este oprită"}.</div>
              </Card>
            )}

            <Card className="p-4">
              <div className="text-sm font-medium mb-3">Statistici azi</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {calls.filter((c) => new Date(c.started_at).toDateString() === new Date().toDateString()).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Apeluri</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500">
                    {calls.filter((c) => c.escalation_needed && new Date(c.started_at).toDateString() === new Date().toDateString()).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Urgente</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">{callbacks.filter((c) => c.status === "pending").length}</div>
                  <div className="text-xs text-muted-foreground">Callback</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="mt-6 space-y-2">
            {calls.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                Niciun apel înregistrat încă.
              </Card>
            )}
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-2">
                {calls.map((c) => (
                  <Card
                    key={c.id}
                    className={`p-4 cursor-pointer transition-colors ${expandedCall === c.id ? "bg-muted/50" : "hover:bg-muted/30"} ${c.escalation_needed ? "border-amber-500/40" : ""}`}
                    onClick={() => setExpandedCall(expandedCall === c.id ? null : c.id)}
                  >
                    <div className="flex items-start gap-3">
                      {c.escalation_needed ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                      ) : c.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 flex-shrink-0" />
                      ) : c.status === "in_progress" ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0 animate-pulse" />
                      ) : (
                        <PhoneOff className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-medium truncate">{c.contact_name || c.from_number}</div>
                          <div className="text-xs text-muted-foreground flex-shrink-0">{formatDate(c.started_at)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {c.from_number} · {formatDuration(c.duration_seconds)}
                        </div>
                        {c.summary && <div className="text-sm mt-2">{c.summary}</div>}
                        {expandedCall === c.id && Array.isArray(c.transcript) && c.transcript.length > 0 && (
                          <div className="mt-3 space-y-1.5 text-xs border-t border-border pt-3">
                            {c.transcript.map((m: any, i: number) => (
                              <div key={i} className={m.role === "user" ? "text-foreground" : "text-muted-foreground"}>
                                <span className="font-semibold">{m.role === "user" ? "Apelant" : "Samanta"}:</span> {m.message || m.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {expandedCall === c.id && c.recording_url && (
                          <audio controls className="w-full mt-3 h-8" src={c.recording_url} />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CALLBACKS */}
          <TabsContent value="callbacks" className="mt-6 space-y-2">
            {callbacks.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                Nu sunt promisiuni de revenire.
              </Card>
            )}
            {callbacks.map((cb) => (
              <Card key={cb.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cb.contact_name || cb.contact_phone}</div>
                    <div className="text-xs text-muted-foreground">{cb.contact_phone}</div>
                    {cb.reason && <div className="text-sm mt-1">{cb.reason}</div>}
                    {cb.scheduled_for && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(cb.scheduled_for)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="default" onClick={() => markCallback(cb.id, "done")}>
                      Sunat
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => markCallback(cb.id, "cancelled")}>
                      Anulează
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-6 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Numele tău</Label>
                <Input
                  value={settings?.user_full_name || ""}
                  onChange={(e) => setSettings(settings ? { ...settings, user_full_name: e.target.value } : null)}
                  onBlur={(e) => updateSettings({ user_full_name: e.target.value })}
                  placeholder="ex: Nicolae Velcont"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Firma</Label>
                <Input
                  value={settings?.company_name || ""}
                  onChange={(e) => setSettings(settings ? { ...settings, company_name: e.target.value } : null)}
                  onBlur={(e) => updateSettings({ company_name: e.target.value })}
                  placeholder="ex: Velcont Contabilitate"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mesaj de întâmpinare</Label>
                <Textarea
                  rows={3}
                  value={settings?.greeting || ""}
                  onChange={(e) => setSettings(settings ? { ...settings, greeting: e.target.value } : null)}
                  onBlur={(e) => updateSettings({ greeting: e.target.value })}
                  placeholder="Bună ziua, sunt Samanta..."
                />
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Numărul Twilio (linia Samantei)</Label>
                <Input
                  value={settings?.twilio_phone_number || ""}
                  onChange={(e) => setSettings(settings ? { ...settings, twilio_phone_number: e.target.value } : null)}
                  onBlur={(e) => updateSettings({ twilio_phone_number: e.target.value })}
                  placeholder="+407..."
                />
                <p className="text-xs text-muted-foreground">
                  Format internațional (E.164). Cumpără numărul din Twilio Console → Phone Numbers.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>GSM-ul tău (pentru forward / preluare)</Label>
                <Input
                  value={settings?.forward_to_user_phone || ""}
                  onChange={(e) => setSettings(settings ? { ...settings, forward_to_user_phone: e.target.value } : null)}
                  onBlur={(e) => updateSettings({ forward_to_user_phone: e.target.value })}
                  placeholder="+407..."
                />
                <p className="text-xs text-muted-foreground">
                  Activează forward din GSM cu codul: <code className="bg-muted px-1 rounded">**61*{settings?.twilio_phone_number || "+407..."}#</code> (apel). Dezactivare: <code className="bg-muted px-1 rounded">##61#</code>.
                </p>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <Label>Cuvinte-trigger pentru escaladare</Label>
              <p className="text-xs text-muted-foreground -mt-1">Dacă apelantul folosește unul, primești alertă urgentă.</p>
              <div className="flex flex-wrap gap-1.5">
                {(settings?.escalation_keywords || []).map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => updateSettings({ escalation_keywords: settings!.escalation_keywords.filter((k) => k !== kw) })}
                  >
                    {kw} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="adaugă cuvânt..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && keywordInput.trim()) {
                      const next = [...(settings?.escalation_keywords || []), keywordInput.trim().toLowerCase()];
                      updateSettings({ escalation_keywords: Array.from(new Set(next)) });
                      setKeywordInput("");
                    }
                  }}
                />
              </div>
            </Card>

            <Card className="p-4 space-y-2 bg-muted/30">
              <div className="text-sm font-semibold">Webhook-uri pentru Twilio Console</div>
              <p className="text-xs text-muted-foreground">Configurează aceste URL-uri pe numărul Twilio cumpărat:</p>
              <div className="text-xs font-mono bg-background p-2 rounded border break-all">
                <div><span className="text-muted-foreground">Voice URL (POST):</span><br />https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/samanta-voice-incoming</div>
                <div className="mt-2"><span className="text-muted-foreground">Status Callback (POST):</span><br />https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/samanta-voice-status</div>
                <div className="mt-2"><span className="text-muted-foreground">ElevenLabs post-call webhook:</span><br />https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/samanta-call-completed</div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}