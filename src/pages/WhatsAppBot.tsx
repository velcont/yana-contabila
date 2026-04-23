import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { YanaHomeButton } from "@/components/YanaHomeButton";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Download, RefreshCw, MessageCircle, Activity, Settings as SettingsIcon, BookOpen } from "lucide-react";
import MiniFooter from "@/components/MiniFooter";

interface KeywordRule { keywords: string[]; response: string; }
interface BotConfig {
  id: string;
  enabled: boolean;
  respond_in_groups: boolean;
  cooldown_seconds: number;
  model: string;
  max_tokens: number;
  system_prompt: string;
  keyword_rules: KeywordRule[];
  bot_token: string;
}
interface BotStatus {
  is_online: boolean;
  last_heartbeat_at: string | null;
  device_info: string | null;
  total_messages_today: number;
  total_messages_all_time: number;
  last_error: string | null;
}
interface BotMessage {
  id: string; contact_id: string; contact_name: string | null; is_group: boolean;
  incoming_text: string; reply_text: string | null; reply_type: string;
  matched_keyword: string | null; tokens_used: number | null; latency_ms: number | null;
  error: string | null; created_at: string;
}

export default function WhatsAppBot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let { data: cfg } = await supabase.from("wa_bot_config").select("*").eq("user_id", user.id).maybeSingle();
    if (!cfg) {
      const { data: created, error } = await supabase.from("wa_bot_config")
        .insert({ user_id: user.id }).select().single();
      if (error) { toast.error("Nu am putut crea configurația"); setLoading(false); return; }
      cfg = created;
    }
    setConfig(cfg as unknown as BotConfig);
    const { data: st } = await supabase.from("wa_bot_status").select("*").eq("user_id", user.id).maybeSingle();
    setStatus(st as BotStatus);
    const { data: msgs } = await supabase.from("wa_bot_messages").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setMessages((msgs as unknown as BotMessage[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Auto-refresh status & messages la 15s
  useEffect(() => {
    if (!user) return;
    const i = setInterval(async () => {
      const { data: st } = await supabase.from("wa_bot_status").select("*").eq("user_id", user.id).maybeSingle();
      setStatus(st as BotStatus);
      const { data: msgs } = await supabase.from("wa_bot_messages").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      setMessages((msgs as BotMessage[]) || []);
    }, 15000);
    return () => clearInterval(i);
  }, [user]);

  const save = async () => {
    if (!config || !user) return;
    setSaving(true);
    const { error } = await supabase.from("wa_bot_config").update({
      enabled: config.enabled,
      respond_in_groups: config.respond_in_groups,
      cooldown_seconds: config.cooldown_seconds,
      model: config.model,
      max_tokens: config.max_tokens,
      system_prompt: config.system_prompt,
      keyword_rules: config.keyword_rules as any,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Eroare la salvare: " + error.message);
    else toast.success("Salvat. Bot-ul preia modificările în max 60 secunde.");
  };

  const regenerateToken = async () => {
    if (!user || !confirm("Sigur regenerezi token-ul? Bot-ul existent se va deconecta și trebuie reconfigurat cu noul token.")) return;
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("wa_bot_config").update({ bot_token: newToken }).eq("user_id", user.id);
    if (error) toast.error("Eroare la regenerare");
    else { toast.success("Token regenerat"); load(); }
  };

  const copy = (text: string, label = "Copiat") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const isOnline = status?.is_online && status?.last_heartbeat_at &&
    (Date.now() - new Date(status.last_heartbeat_at).getTime()) < 90_000;

  if (loading || !config) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Se încarcă…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6"><YanaHomeButton /></div>

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-primary" />
              WhatsApp Bot
            </h1>
            <p className="text-muted-foreground mt-1">
              Auto-responder AI pentru WhatsApp, conectat la YANA. Rulează pe calculatorul tău.
            </p>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="text-sm">
            <Activity className={`w-3 h-3 mr-1 ${isOnline ? "animate-pulse" : ""}`} />
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Mesaje azi</div>
            <div className="text-2xl font-bold">{status?.total_messages_today ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total mesaje</div>
            <div className="text-2xl font-bold">{status?.total_messages_all_time ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Ultim heartbeat</div>
            <div className="text-sm font-medium">
              {status?.last_heartbeat_at ? new Date(status.last_heartbeat_at).toLocaleString("ro-RO") : "Niciodată"}
            </div>
            {status?.device_info && <div className="text-xs text-muted-foreground mt-1">{status.device_info}</div>}
          </CardContent></Card>
        </div>

        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="setup"><BookOpen className="w-4 h-4 mr-1" />Setup</TabsTrigger>
            <TabsTrigger value="config"><SettingsIcon className="w-4 h-4 mr-1" />Configurare</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="messages">Mesaje</TabsTrigger>
          </TabsList>

          {/* SETUP */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Pornește bot-ul în 4 pași</CardTitle>
                <CardDescription>Bot-ul rulează LOCAL pe calculatorul tău, conectat la YANA prin token.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">1</span> Descarcă kit-ul</div>
                  <a href="/yana-wa-bot.zip" download>
                    <Button><Download className="w-4 h-4 mr-2" />Descarcă yana-wa-bot.zip</Button>
                  </a>
                  <p className="text-xs text-muted-foreground">Dezarhivează într-un folder pe calculatorul tău.</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">2</span> Instalează Node.js + dependințe</div>
                  <p className="text-sm text-muted-foreground">Instalează <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-primary underline">Node.js 18+</a>. Apoi în terminal, în folderul kit-ului:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>npm install</code></pre>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">3</span> Configurează .env</div>
                  <p className="text-sm text-muted-foreground">Copiază <code className="text-xs bg-muted px-1 rounded">.env.example</code> → <code className="text-xs bg-muted px-1 rounded">.env</code> și completează:</p>

                  <div className="space-y-3 mt-3">
                    <div>
                      <Label className="text-xs">BOT_TOKEN (token-ul tău unic)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type={showToken ? "text" : "password"}
                          value={config.bot_token}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                          {showToken ? "🙈" : "👁"}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => copy(config.bot_token, "Token copiat")}><Copy className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" onClick={regenerateToken} title="Regenerează"><RefreshCw className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">ANTHROPIC_API_KEY</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Obține-o de la <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-primary underline">console.anthropic.com</a> (gratuit, ~5$ credit inițial). Cost real: ~0.001$/mesaj.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">4</span> Pornește și scanează QR</div>
                  <pre className="bg-muted p-3 rounded text-xs"><code>npm start</code></pre>
                  <p className="text-sm text-muted-foreground">În terminal apare un QR. Pe telefon: WhatsApp → Settings → Linked Devices → Link a Device → scanează.</p>
                  <p className="text-xs text-muted-foreground">După scanare, statusul de mai sus devine <Badge variant="default" className="text-xs">Online</Badge>. Modificările pe care le faci aici se sincronizează în max 60s.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONFIG */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Configurare comportament</CardTitle>
                <CardDescription>Modificările se sincronizează automat la bot în max 60 secunde.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bot activ</Label>
                    <p className="text-xs text-muted-foreground">Dacă oprești, bot-ul rămâne conectat dar nu mai răspunde.</p>
                  </div>
                  <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Răspunde în grupuri</Label>
                    <p className="text-xs text-muted-foreground">Recomandat: oprit. Poate deveni enervant.</p>
                  </div>
                  <Switch checked={config.respond_in_groups} onCheckedChange={(v) => setConfig({ ...config, respond_in_groups: v })} />
                </div>

                <div>
                  <Label>Model AI</Label>
                  <Select value={config.model} onValueChange={(v) => setConfig({ ...config, model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5 (rapid, ieftin — recomandat)</SelectItem>
                      <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5 (mai inteligent, mai scump)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cooldown (secunde)</Label>
                    <Input type="number" min={1} max={60}
                      value={config.cooldown_seconds}
                      onChange={(e) => setConfig({ ...config, cooldown_seconds: parseInt(e.target.value) || 5 })} />
                    <p className="text-xs text-muted-foreground mt-1">Anti-spam între răspunsuri către același contact.</p>
                  </div>
                  <div>
                    <Label>Max tokens răspuns</Label>
                    <Input type="number" min={50} max={2000}
                      value={config.max_tokens}
                      onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 400 })} />
                    <p className="text-xs text-muted-foreground mt-1">~1 token = ~4 caractere.</p>
                  </div>
                </div>

                <div>
                  <Label>System Prompt (personalitatea bot-ului)</Label>
                  <Textarea rows={6}
                    value={config.system_prompt}
                    onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                    placeholder="Esti asistentul AI al firmei [NUMELE TĂU]..." />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sfat: nu pune detalii critice (preturi exacte, termeni legali) aici — pune-le în Keywords. AI-ul poate greși.
                  </p>
                </div>

                <Button onClick={save} disabled={saving}>
                  {saving ? "Se salvează..." : "Salvează modificările"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KEYWORDS */}
          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle>Răspunsuri Keyword</CardTitle>
                <CardDescription>
                  Răspunsuri instant (fără AI, fără cost) când mesajul conține anumite cuvinte. Prima regulă care face match câștigă.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(config.keyword_rules || []).map((rule, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2"
                      onClick={() => setConfig({ ...config, keyword_rules: config.keyword_rules.filter((_, i) => i !== idx) })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <div>
                      <Label>Cuvinte cheie (separate prin virgulă)</Label>
                      <Input
                        value={rule.keywords.join(", ")}
                        onChange={(e) => {
                          const newRules = [...config.keyword_rules];
                          newRules[idx] = { ...rule, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) };
                          setConfig({ ...config, keyword_rules: newRules });
                        }}
                        placeholder="program, orar, deschis"
                      />
                    </div>
                    <div>
                      <Label>Răspuns</Label>
                      <Textarea rows={2}
                        value={rule.response}
                        onChange={(e) => {
                          const newRules = [...config.keyword_rules];
                          newRules[idx] = { ...rule, response: e.target.value };
                          setConfig({ ...config, keyword_rules: newRules });
                        }}
                        placeholder="Suntem deschiși Luni-Vineri 09:00-17:00."
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() =>
                  setConfig({ ...config, keyword_rules: [...config.keyword_rules, { keywords: [], response: "" }] })}>
                  <Plus className="w-4 h-4 mr-2" />Adaugă regulă
                </Button>
                <Separator />
                <Button onClick={save} disabled={saving}>
                  {saving ? "Se salvează..." : "Salvează modificările"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Ultimele 50 mesaje</CardTitle>
                <CardDescription>Auto-refresh la 15 secunde.</CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Niciun mesaj încă. Pornește bot-ul și trimite-ți un mesaj de test.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div key={m.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="font-medium">
                            {m.contact_name || m.contact_id.replace("@c.us", "").replace("@g.us", "")}
                            {m.is_group && <Badge variant="outline" className="ml-2 text-xs">grup</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              m.reply_type === "ai" ? "default" :
                              m.reply_type === "keyword" ? "secondary" :
                              m.reply_type === "error" ? "destructive" : "outline"
                            } className="text-xs">{m.reply_type}{m.matched_keyword ? `: ${m.matched_keyword}` : ""}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(m.created_at).toLocaleString("ro-RO")}
                            </span>
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded p-2 mb-1 text-xs">
                          <div className="text-muted-foreground mb-1">📥 Primit:</div>{m.incoming_text}
                        </div>
                        {m.reply_text && (
                          <div className="bg-primary/5 rounded p-2 text-xs">
                            <div className="text-muted-foreground mb-1">📤 Răspuns ({m.latency_ms}ms{m.tokens_used ? `, ${m.tokens_used} tok` : ""}):</div>
                            {m.reply_text}
                          </div>
                        )}
                        {m.error && <div className="text-destructive text-xs mt-1">⚠ {m.error}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <MiniFooter />
    </div>
  );
}
