import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Send, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import {
  parseCRMBlocks,
  BlockRenderer,
  type DraftEmailData,
  type ActionCardData,
} from "./blocks";

type Msg = { role: "user" | "assistant"; content: string };

export interface CRMChatStreamProps {
  suggestions?: string[];
  onMutation?: () => void;
  /** Optional: notify parent when YANA mentions a contact/deal so context panel can react. */
  onContextHint?: (hint: { entityType?: string; entityId?: string; text?: string }) => void;
}

export function CRMChatStream({ suggestions, onMutation, onContextHint }: CRMChatStreamProps) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bună. Sunt YANA, copilotul tău CRM. Întreabă-mă orice în limbaj natural — adaug contacte, mut deal-uri, propun follow-up-uri sau îți rezum pipeline-ul. Pot răspunde cu tabele, KPI-uri și butoane de acțiune.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const slashOpen = input.startsWith("/") && !input.includes(" ");
  const slashCommands = useMemo(
    () => [
      { cmd: "/contact", hint: "adaugă un contact nou" },
      { cmd: "/deal", hint: "creează un deal" },
      { cmd: "/task", hint: "creează un task" },
      { cmd: "/email", hint: "redactează un email" },
      { cmd: "/forecast", hint: "rezumă pipeline-ul ponderat" },
      { cmd: "/risc", hint: "deal-uri în pericol" },
      { cmd: "/followup", hint: "lead-uri fierbinți necontactate" },
    ],
    [],
  );

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
          conversation_history: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          context_hint: "crm_copilot",
        },
      });
      if (error) throw error;
      const reply =
        (data && (data.reply || data.message || data.text)) ||
        "Am procesat cererea. Verifică panoul din dreapta pentru schimbări.";
      const replyStr = String(reply);
      setMessages((m) => [...m, { role: "assistant", content: replyStr }]);
      onMutation?.();
      onContextHint?.({ text: replyStr });
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Eroare: " + (e?.message || "necunoscută") },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function toggleMic() {
    const W: any = window;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return toast.error("Browserul nu suportă recunoaștere vocală");
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

  const quickActions = suggestions && suggestions.length
    ? suggestions
    : [
        "Rezumă pipeline-ul actual",
        "Top 5 deal-uri în pericol",
        "Lead-uri fierbinți pe care nu le-am sunat",
        "Generează un raport pe ultima săptămână",
        "Scrie follow-up pentru contactele inactive 30+ zile",
      ];

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              );
            }
            const parts = parseCRMBlocks(m.content);
            return (
              <div key={i} className="text-foreground space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-primary" /> YANA
                </div>
                <div className="text-sm leading-relaxed">
                  <BlockRenderer
                    parts={parts}
                    TextRenderer={(text) =>
                      text.trim() ? <MarkdownRenderer content={text} /> : null
                    }
                    onSendEmail={async (d: DraftEmailData) => {
                      toast.info("Trimitere email — verifică pagina /yana");
                      send(`Trimite email către ${d.to || "destinatar"} cu subiectul "${d.subject}" și conținutul:\n\n${d.body}`);
                    }}
                    onSaveTemplate={async (d: DraftEmailData) => {
                      send(`Salvează acest email ca template în CRM: subiect "${d.subject}", body:\n\n${d.body}`);
                    }}
                    onConfirmAction={async (a: ActionCardData) => {
                      send(`Confirmat: execută acțiunea ${a.action} (${a.title}). Payload: ${JSON.stringify(a.payload || {})}`);
                    }}
                    onCancelAction={(a) => toast(`Acțiunea "${a.title}" a fost anulată.`)}
                  />
                </div>
                {/* Action bar sub fiecare răspuns AI */}
                <div className="flex flex-wrap gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1"
                    onClick={() => navigator.clipboard.writeText(m.content).then(() => toast.success("Copiat"))}>
                    <Copy className="w-3 h-3" /> Copiază
                  </Button>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> YANA gândește...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 pt-2 pb-3 space-y-2">
          {/* Quick suggestions */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {quickActions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={sending}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-muted/50 border border-border hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Slash command palette */}
          {slashOpen && (
            <div className="rounded-md border border-border bg-popover p-1 text-xs space-y-0.5 max-h-48 overflow-auto">
              {slashCommands
                .filter((c) => c.cmd.startsWith(input.toLowerCase()))
                .map((c) => (
                  <button
                    key={c.cmd}
                    onClick={() => setInput(c.cmd + " ")}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-accent text-left"
                  >
                    <span className="font-mono text-primary">{c.cmd}</span>
                    <span className="text-muted-foreground">{c.hint}</span>
                  </button>
                ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Scrie în limbaj natural sau folosește / pentru comenzi..."
              rows={2}
              className="resize-none text-sm min-h-[52px]"
            />
            <div className="flex flex-col gap-1.5">
              <Button
                size="icon"
                variant={listening ? "default" : "outline"}
                onClick={toggleMic}
                className="h-9 w-9"
                title="Voce"
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
      </div>
    </div>
  );
}