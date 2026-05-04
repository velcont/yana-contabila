import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Loader2, Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AGENT_ID = "agent_0701kqqhjszgfras171457cctcjy";

type ChatLine = { role: "user" | "agent"; text: string; ts: number };

export default function SamantaLive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [transcript, setTranscript] = useState<ChatLine[]>([]);

  const conversation = useConversation({
    onConnect: () => toast({ title: "Conectat", description: "Samanta te ascultă." }),
    onDisconnect: () => toast({ title: "Apel încheiat" }),
    onError: (err: any) => {
      console.error("[SamantaLive] error", err);
      toast({ title: "Eroare", description: String(err?.message || err), variant: "destructive" });
    },
    onMessage: (msg: any) => {
      const source = msg?.source || msg?.role;
      const text = msg?.message || msg?.text;
      if (!text) return;
      const role: "user" | "agent" = source === "user" ? "user" : "agent";
      setTranscript((t) => [...t, { role, text, ts: Date.now() }]);
    },
  });

  const status = conversation.status;
  const isSpeaking = conversation.isSpeaking;
  const connected = status === "connected";

  const start = useCallback(async () => {
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Nu pot porni apelul",
        description: e?.message || "Verifică permisiunile pentru microfon.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  }, [conversation, toast]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  useEffect(() => {
    return () => {
      // cleanup pe unmount
      conversation.endSession().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/yana")} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            YANA
          </Button>
          <h1 className="text-lg font-bold">Samanta — Voce Live</h1>
        </div>
        <span className={`text-xs font-medium ${connected ? "text-green-600" : "text-muted-foreground"}`}>
          {connected ? "● Conectat" : status === "connecting" ? "Se conectează..." : "● Deconectat"}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        {/* Indicator vizual */}
        <Card className="flex flex-col items-center gap-4 p-8">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full transition-all ${
              connected
                ? isSpeaking
                  ? "scale-110 bg-primary/20 ring-4 ring-primary animate-pulse"
                  : "bg-primary/10 ring-2 ring-primary/40"
                : "bg-muted"
            }`}
          >
            {connected ? (
              isSpeaking ? (
                <Mic className="h-12 w-12 text-primary" />
              ) : (
                <MicOff className="h-12 w-12 text-primary/70" />
              )
            ) : (
              <Phone className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {!connected && "Apasă butonul de mai jos ca să începi un apel direct cu Samanta."}
            {connected && isSpeaking && "Samanta vorbește..."}
            {connected && !isSpeaking && "Samanta te ascultă. Vorbește liber."}
          </p>

          {!connected ? (
            <Button size="lg" onClick={start} disabled={starting} className="gap-2">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Începe apelul
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={stop} className="gap-2">
              <PhoneOff className="h-4 w-4" />
              Închide apelul
            </Button>
          )}
        </Card>

        {/* Transcript live */}
        {transcript.length > 0 && (
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Transcriere</h2>
            <div className="space-y-2 text-sm">
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 ${
                    line.role === "user"
                      ? "ml-auto max-w-[80%] bg-primary/10 text-right"
                      : "mr-auto max-w-[80%] bg-muted"
                  }`}
                >
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {line.role === "user" ? "Tu" : "Samanta"}
                  </div>
                  <div className="whitespace-pre-wrap">{line.text}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Conexiune WebRTC directă cu agentul ElevenLabs · Latență minimă
        </p>
      </main>
    </div>
  );
}