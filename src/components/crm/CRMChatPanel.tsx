import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  "Adaugă un lead nou",
  "Top 5 deal-uri în pericol",
  "Sugerează follow-up pentru contactele fierbinți",
  "Ce contacte nu am mai contactat de 30 zile?",
  "Generează un raport pe ultima săptămână",
  "Care e sentimentul general al pipeline-ului?",
];

export function CRMChatPanel({
  open,
  onOpenChange,
  onMutation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMutation?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Sunt aici, în CRM. Spune-mi în limbaj natural ce vrei: să adaug contacte, să mut deal-uri, să trimit follow-up sau să-ți rezum pipeline-ul.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("yana-agent", {
        body: {
          message: t,
          conversation_history: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          context_hint: "crm_inline_chat",
        },
      });
      if (error) throw error;
      const reply =
        (data && (data.reply || data.message || data.text)) ||
        "Am procesat cererea. Verifică tab-urile pentru schimbări.";
      setMessages((m) => [...m, { role: "assistant", content: String(reply) }]);
      onMutation?.();
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Eroare: " + (e?.message || "necunoscută") },
      ]);
    } finally {
      setSending(false);
    }
  }

  function toggleMic() {
    const W: any = window;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Browserul nu suportă recunoaștere vocală");
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "ro-RO";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput(txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            YANA · Chat CRM
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap"
                    : "mr-auto max-w-[90%] text-sm whitespace-pre-wrap text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                YANA scrie...
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-3 pt-2 pb-1 border-t bg-muted/20">
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={sending}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 pb-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Scrie sau apasă mic pentru voce..."
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex flex-col gap-1.5">
              <Button
                size="icon"
                variant={listening ? "default" : "outline"}
                onClick={toggleMic}
                className="h-9 w-9"
                title="Comandă vocală"
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                className="h-9 w-9"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}