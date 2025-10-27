import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, Send, Loader2, ExternalLink, FileText, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; domain: string }>;
  related_questions?: string[];
}

interface FiscalChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FiscalChat: React.FC<FiscalChatProps> = ({ open, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('[FISCAL-CHAT] Sending message:', input);
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Eroare de autentificare',
          description: 'Trebuie să fii autentificat pentru a folosi Yana Fiscală.',
          variant: 'destructive',
        });
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      const { data, error } = await supabase.functions.invoke('fiscal-chat', {
        body: { message: input },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[FISCAL-CHAT] Response:', { data, error });

      if (error) {
        console.error('[FISCAL-CHAT] Error from invoke:', error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: 'Eroare',
          description: data.error,
          variant: 'destructive',
        });
        setMessages(prev => prev.slice(0, -1)); // Remove user message on error
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Nu am putut genera un răspuns.',
        sources: data.sources || [],
        related_questions: data.related_questions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut trimite mesajul. Te rog încearcă din nou.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSourceIcon = (domain: string) => {
    if (domain.includes('anaf') || domain.includes('mfinante') || domain.includes('legislatie')) {
      return '🏛️'; // Official source
    }
    if (domain.includes('ceccar')) {
      return '👔'; // Professional source
    }
    return '📄'; // Other source
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Scale className="h-6 w-6 text-[#00B37E]" />
            Yana Fiscală – Asistent AI Contabil (CRM)
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Expertiza în legislație fiscală și contabilă din România, bazată pe surse oficiale actualizate
          </p>
        </DialogHeader>

        {/* Disclaimer */}
        <Alert className="mx-6 mt-4 border-[#00B37E]/30 bg-[#00B37E]/5">
          <Scale className="h-4 w-4 text-[#00B37E]" />
          <AlertDescription className="text-sm">
            Yana Fiscală caută informații pe site-uri de specialitate românești (ANAF, CECCAR, etc.).
            Pentru cazuri complexe sau decizii oficiale, consultă un expert CECCAR sau contactează ANAF direct.
          </AlertDescription>
        </Alert>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#00B37E]" />
              <p className="text-lg font-medium mb-2">Bine ai venit la Yana Fiscală!</p>
              <p className="text-sm mb-6">Întreabă-mă orice despre legislația fiscală și contabilă din România</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setInput('Care sunt modificările aduse de OG 16/2022 la TVA?')}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Modificări OG 16/2022 la TVA</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setInput('Ce spune articolul 25 din Codul Fiscal despre cheltuieli deductibile?')}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Art. 25 - Cheltuieli deductibile</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setInput('Cum se înregistrează o factură de cumpărare mărfuri cu TVA?')}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Monografie factură cumpărare</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setInput('Care sunt termene declarații fiscale ianuarie 2025?')}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Termene declarații fiscale</span>
                </Button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-[#00B37E] text-white'
                    : 'bg-secondary text-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

                {/* Sources */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Surse verificate:
                    </p>
                    <div className="space-y-1">
                      {msg.sources.map((source, sourceIdx) => (
                        <a
                          key={sourceIdx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline flex items-start gap-1 text-[#00B37E] hover:text-[#00B37E]/80"
                        >
                          <span>{getSourceIcon(source.domain)}</span>
                          <span className="flex-1">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Questions */}
                {msg.role === 'assistant' && msg.related_questions && msg.related_questions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold mb-2">Întrebări similare:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.related_questions.slice(0, 3).map((q, qIdx) => (
                        <Button
                          key={qIdx}
                          variant="ghost"
                          size="sm"
                          onClick={() => setInput(q)}
                          className="text-xs h-auto py-1 px-2"
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-secondary">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#00B37E]" />
                  <span className="text-sm text-muted-foreground">Caut informații...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Întreabă despre legislație fiscală, proceduri ANAF, monografii contabile..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] bg-[#00B37E] hover:bg-[#00B37E]/90"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FiscalChat;
