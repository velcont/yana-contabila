import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

interface ConsultMessage {
  role: "lovable" | "yana";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface YanaResponse {
  raw: string;
  summary: string;
  recommendations: string[];
  implementation_details: string;
  next_steps: string[];
}

interface ConsultYanaDialogProps {
  context?: string;
  conversationId?: string;
  onYanaResponse?: (response: YanaResponse) => void;
  // Optional controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean; // Show trigger button (default true)
}

export function ConsultYanaDialog({ 
  context, 
  conversationId,
  onYanaResponse,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerButton = true
}: ConsultYanaDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  
  // Support both controlled and uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleConsult = async () => {
    if (!question.trim() || isConsulting) return;

    const userQuestion = question.trim();
    setQuestion("");

    // Add Lovable's question to the dialog
    const lovableMessage: ConsultMessage = {
      role: "lovable",
      content: userQuestion,
      timestamp: new Date(),
    };

    // Add loading message for Yana
    const loadingMessage: ConsultMessage = {
      role: "yana",
      content: "Analizez întrebarea...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, lovableMessage, loadingMessage]);
    setIsConsulting(true);

    try {
      const { data, error } = await supabase.functions.invoke('consult-yana', {
        body: {
          question: userQuestion,
          context: context || messages.map(m => `${m.role}: ${m.content}`).join('\n'),
          conversationId,
        }
      });

      if (error) {
        throw new Error(error.message || 'Eroare la consultare');
      }

      const yanaResponse = data?.response as YanaResponse;

      // Replace loading message with actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "yana",
          content: yanaResponse?.raw || "Nu am putut genera un răspuns.",
          timestamp: new Date(),
          isLoading: false,
        };
        return newMessages;
      });

      // Notify parent component
      if (onYanaResponse && yanaResponse) {
        onYanaResponse(yanaResponse);
      }

    } catch (error: any) {
      console.error("Consult Yana error:", error);
      
      // Replace loading message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "yana",
          content: `❌ Eroare: ${error.message}`,
          timestamp: new Date(),
          isLoading: false,
        };
        return newMessages;
      });

      toast.error("Eroare la consultarea Yanei", {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConsult();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-primary/30 hover:bg-primary/10"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden md:inline">Consultă Yana</span>
            <Sparkles className="h-3 w-3 text-primary" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Dialog AI-to-AI
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </DialogTitle>
          <DialogDescription>
            Conversație directă între Lovable AI și Yana pentru consultații strategice
          </DialogDescription>
        </DialogHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] pr-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Pune o întrebare pentru Yana</p>
                <p className="text-sm mt-2">Conversația va fi afișată aici în timp real</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3 p-3 rounded-lg",
                  msg.role === "lovable" 
                    ? "bg-blue-500/10 border border-blue-500/20" 
                    : "bg-primary/10 border border-primary/20"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  msg.role === "lovable" ? "bg-blue-500/20" : "bg-primary/20"
                )}>
                  {msg.role === "lovable" ? (
                    <span className="text-xs font-bold text-blue-500">L</span>
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "font-semibold text-sm",
                      msg.role === "lovable" ? "text-blue-500" : "text-primary"
                    )}>
                      {msg.role === "lovable" ? "Lovable AI" : "Yana"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString('ro-RO', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="text-sm">
                    {msg.isLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {msg.content}
                      </span>
                    ) : msg.role === 'yana' ? (
                      <MarkdownRenderer content={msg.content} className="text-left" />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie întrebarea pentru Yana..."
            className="min-h-[60px] resize-none"
            disabled={isConsulting}
          />
          <Button 
            onClick={handleConsult} 
            disabled={!question.trim() || isConsulting}
            className="self-end"
          >
            {isConsulting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          💡 Cost: ~0.20 RON per consultație
        </p>
      </DialogContent>
    </Dialog>
  );
}
