import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Laptop,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Trash2,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface LocalDevice {
  id: string;
  device_name: string;
  os_info: string | null;
  status: string;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export default function LocalDevice() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("yana_local_devices")
      .select("id, device_name, os_info, status, pairing_code, pairing_code_expires_at, last_seen_at, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setDevices(data as LocalDevice[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("local-devices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "yana_local_devices" },
        () => load(),
      )
      .subscribe();
    const interval = setInterval(load, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const generatePairingCode = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("yana-local-pair", {
        body: { device_name: "Laptopul meu" },
      });
      if (error) throw error;
      toast({ title: "Cod generat!", description: `Cod: ${data.pairing_code} — valabil 10 minute.` });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Eroare necunoscută";
      toast({ title: "Eroare", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const revokeDevice = async (id: string) => {
    if (!confirm("Sigur vrei să revoci acest dispozitiv? Agentul local va fi deconectat imediat.")) return;
    const { error } = await supabase.from("yana_local_devices").delete().eq("id", id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dispozitiv revocat" });
      load();
    }
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 60_000;
  };

  const pending = devices.filter((d) => d.status === "pending");
  const active = devices.filter((d) => d.status === "active");

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/yana">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Înapoi la YANA
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Laptop className="h-7 w-7" />
          Conectare laptop
        </h1>
        <p className="text-muted-foreground mt-1">
          Permite YANA să citească/scrie fișiere și să ruleze comenzi pe laptopul tău local.
        </p>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Atenție — securitate</AlertTitle>
        <AlertDescription>
          Modul ales: <strong>Trust total după pairing</strong>. Agentul execută orice comandă primită de la YANA fără
          confirmare manuală pe Mac. Folosește doar pe dispozitive personale unde ai încredere completă în deciziile YANA.
        </AlertDescription>
      </Alert>

      {/* Pași instalare */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Cum conectezi un dispozitiv nou
          </CardTitle>
          <CardDescription>3 pași simpli, durează ~2 minute</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              Deschide un terminal pe Mac și descarcă agentul:
              <pre className="mt-1 ml-6 bg-muted p-2 rounded text-xs overflow-x-auto">
                curl -o ~/yana-agent.mjs https://yana-contabila.lovable.app/yana-local-agent/agent.mjs
              </pre>
            </li>
            <li>
              Apasă <strong>"Generează cod"</strong> mai jos.
            </li>
            <li>
              Pornește agentul și introdu codul când îți cere:
              <pre className="mt-1 ml-6 bg-muted p-2 rounded text-xs">node ~/yana-agent.mjs</pre>
            </li>
          </ol>

          <Separator />

          <div className="flex items-center gap-3">
            <Button onClick={generatePairingCode} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generează cod nou
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/yana-local-agent/README.md" target="_blank" rel="noopener noreferrer">
                Documentație completă
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pairing codes active */}
      {pending.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-600 dark:text-amber-400">Coduri în așteptare</CardTitle>
            <CardDescription>Folosește unul în terminal pentru a finaliza pairing-ul</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((d) => {
              const expires = d.pairing_code_expires_at ? new Date(d.pairing_code_expires_at) : null;
              const expired = expires && expires < new Date();
              return (
                <div key={d.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono text-3xl tracking-widest font-bold">
                      {d.pairing_code}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {expired
                        ? "❌ Expirat"
                        : expires
                        ? `Expiră în ${formatDistanceToNow(expires, { locale: ro })}`
                        : ""}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(d.id, d.pairing_code || "")}
                  >
                    {copiedId === d.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => revokeDevice(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active devices */}
      <Card>
        <CardHeader>
          <CardTitle>Dispozitive conectate</CardTitle>
          <CardDescription>
            {active.length === 0
              ? "Niciun dispozitiv activ încă."
              : `${active.length} dispozitiv${active.length > 1 ? "e" : ""} activ${active.length > 1 ? "e" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Generează un cod și conectează primul tău laptop.
            </p>
          ) : (
            <div className="space-y-2">
              {active.map((d) => {
                const online = isOnline(d.last_seen_at);
                return (
                  <div key={d.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Laptop className="h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{d.device_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.os_info || "OS necunoscut"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {d.last_seen_at
                            ? `Ultima activitate: ${formatDistanceToNow(new Date(d.last_seen_at), {
                                locale: ro,
                                addSuffix: true,
                              })}`
                            : "Niciodată conectat"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={online ? "default" : "secondary"} className="shrink-0">
                      {online ? (
                        <>
                          <Wifi className="h-3 w-3 mr-1" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 mr-1" />
                          Offline
                        </>
                      )}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => revokeDevice(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ce poate face YANA pe laptopul tău</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• <strong>Citește fișiere</strong> — facturi, cod, documente, configurări</li>
            <li>• <strong>Scrie fișiere</strong> — generează rapoarte, modifică cod, creează PDF-uri</li>
            <li>• <strong>Listează foldere</strong> — explorează structura proiectelor</li>
            <li>• <strong>Rulează comenzi bash</strong> — git, npm, ls, scripturi proprii</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Toate comenzile sunt loggate în <code>yana_local_commands</code> — vezi istoricul în Admin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}