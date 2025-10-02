import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Send, X, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseAnalysisText } from '@/utils/analysisParser';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bună! Sunt asistenta ta AI Yana. Cu ce te pot ajuta legat de analizele tale financiare?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Încarcă ultima analiză pentru context
  useEffect(() => {
    const loadLatestAnalysis = async () => {
      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          const indicators = parseAnalysisText(data.analysis_text);
          setLatestAnalysis({
            fileName: data.file_name,
            date: data.created_at,
            indicators
          });
        }
      } catch (error) {
        console.error('Error loading latest analysis:', error);
      }
    };

    if (isOpen) {
      loadLatestAnalysis();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          message: userMessage,
          history: messages,
          latestAnalysis: latestAnalysis // Trimite context despre ultima analiză
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut trimite mesajul. Te rog încearcă din nou.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sugestii contextuale
  const quickQuestions = [
    "Ce înseamnă DSO-ul meu?",
    "Cum pot îmbunătăți cash flow-ul?",
    "Analizează profitabilitatea",
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 flex items-center gap-3 animate-in fade-in slide-in-from-right-5 duration-500">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg font-medium text-sm">
          Întreabă Yana 💬
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
                size="icon"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Deschide Chat AI</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-full max-w-[400px] h-[600px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Chat AI Yana</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Sugestii rapide */}
        {messages.length === 1 && latestAnalysis && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Întrebări rapide:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Yana gândește...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Întreabă despre analizele tale..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
