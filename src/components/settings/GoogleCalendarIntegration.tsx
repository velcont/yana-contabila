import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Status {
  connected: boolean;
  calendar_email?: string | null;
  last_sync_at?: string | null;
  created_at?: string | null;
}

export function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-manage", {
        body: { action: "status" },
      });
      if (error) throw error;
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // dacă utilizatorul tocmai s-a întors din OAuth (?gcal=connected), reîncărcăm
    if (window.location.search.includes("gcal=connected")) {
      toast({ title: "Google Calendar conectat", description: "Calendarul tău este acum sincronizat cu YANA." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-init", {
        body: {},
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error("URL de autorizare lipsă");
      }
    } catch (e: any) {
      toast({
        title: "Eroare conectare",
        description: e.message || "Nu am putut iniția autorizarea Google.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", { body: {} });
      if (error) throw error;
      toast({
        title: "Sincronizare reușită",
        description: `${data?.synced ?? 0} evenimente actualizate.`,
      });
      await loadStatus();
    } catch (e: any) {
      toast({
        title: "Eroare sincronizare",
        description: e.message || "Sync eșuat.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke("google-calendar-manage", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      toast({ title: "Deconectat", description: "Google Calendar a fost deconectat." });
      await loadStatus();
    } catch (e: any) {
      toast({
        title: "Eroare",
        description: e.message || "Deconectare eșuată.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Conectează-ți calendarul Google ca YANA să te anunțe despre evenimente și să le poată gestiona din chat.
            </CardDescription>
          </div>
          {status?.connected && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Conectat
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Se verifică starea...
          </div>
        ) : status?.connected ? (
          <>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Cont:</span>{" "}
                <span className="font-medium">{status.calendar_email || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ultima sincronizare:</span>{" "}
                <span className="font-medium">
                  {status.last_sync_at
                    ? new Date(status.last_sync_at).toLocaleString("ro-RO")
                    : "Niciodată"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizează acum
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                    <Unlink className="h-4 w-4" />
                    Deconectează
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deconectează Google Calendar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      YANA nu va mai avea acces la calendarul tău. Tokenele și evenimentele sincronizate vor fi șterse.
                      Poți reconecta oricând.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anulează</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Deconectează</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Spune-i Yanei: <em>"ce am azi în calendar?"</em>, <em>"adaugă întâlnire cu X mâine la 14:00"</em>,
              sau <em>"mută ședința de marți la 16:00"</em>.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              După conectare, YANA poate:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Să-ți spună programul zilnic în briefing</li>
              <li>Să te anunțe cu 30 min înainte de evenimente</li>
              <li>Să creeze, modifice sau șteargă evenimente la cerere</li>
              <li>Să ia în considerare timpul ocupat când sugerează acțiuni</li>
            </ul>
            <Button onClick={handleConnect} disabled={connecting} className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Conectează Google Calendar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}