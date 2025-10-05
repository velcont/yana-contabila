import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUp, Upload, FileText, Trash2, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypingIndicator } from './TypingIndicator';
import { ConversationHistory } from './ConversationHistory';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import VoiceInterface from './VoiceInterface';
import { DividendVsSalaryCalculator } from './calculators/DividendVsSalaryCalculator';
import { MicroVsProfitCalculator } from './calculators/MicroVsProfitCalculator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  calculatorType?: 'dividend-vs-salary' | 'micro-vs-profit';
}

type SummaryType = 'detailed' | 'short' | 'action';

export const ChatAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [summaryType] = useState<SummaryType>('detailed');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `👋 **Bun venit! Sunt Yana** – ghidul tău digital pentru analiză financiară.

🎓 **Important de știut:** NU voi extrage automat datele din balanță. Este esențial ca TU să le înțelegi.

💡 **Eu voi fi aici să:**
- Te **ghidez** pas cu pas în analiza balanței
- Îți **explic** conceptele contabile într-un limbaj simplu
- Îți **arăt** exact unde să cauți fiecare valoare
- **Verific** împreună cu tine dacă ai făcut corect

✨ **Asta înseamnă autonomie financiară. Asta înseamnă educație.**

📊 **Ce vrei să analizăm astăzi?**

🔹 Analiza TVA (de plată/recuperat)
🔹 Creanțe și datorii
🔹 Profit sau pierdere
🔹 Disponibilități (bani în cont/casă)
🔹 Verificare completă balanță
🔹 Altceva...

💬 Scrie ce te interesează sau pune-mi direct o întrebare!`
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(crypto.randomUUID());
    setUploadedFile(null);
    toast.success("Conversație nouă începută");
  };

  const deleteConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && conversationId) {
        await supabase
          .from('conversation_history')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
        
        startNewConversation();
        toast.success("Conversația a fost ștearsă");
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error("Eroare la ștergerea conversației");
    }
  };

  const handleConversationSelect = async (selectedConversationId: string) => {
    setConversationId(selectedConversationId);
    const { data, error } = await supabase
      .from('conversation_history')
      .select('*')
      .eq('conversation_id', selectedConversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Eroare la încărcarea conversației");
      return;
    }

    if (data) {
      setMessages(data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })));
    }
    setIsSidebarOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`Fișier încărcat: ${file.name}`);
    }
  };

  const handleVoiceInput = (text: string) => {
    setInput(text);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    const userMessage = input.trim() || `Am încărcat fișierul: ${uploadedFile?.name}`;
    setInput('');
    const newUserMsg = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    // Detect calculator requests
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.match(/(dividend|salari).*?(dividend|salari)/i) || 
        lowerMessage.includes('dividende vs') || 
        lowerMessage.includes('salarii vs') ||
        lowerMessage.includes('ce aleg')) {
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '💼 Aici ai calculatorul pentru comparație:',
        calculatorType: 'dividend-vs-salary'
      }]);
      setIsLoading(false);
      setUploadedFile(null);
      return;
    }
    
    if (lowerMessage.match(/(micro|profit).*(micro|profit)/i) || 
        lowerMessage.includes('microintreprindere') ||
        lowerMessage.includes('impozit pe profit') ||
        lowerMessage.includes('regim fiscal')) {
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '📊 Aici ai calculatorul pentru comparație regimuri fiscale:',
        calculatorType: 'micro-vs-profit'
      }]);
      setIsLoading(false);
      setUploadedFile(null);
      return;
    }

    // Save user message
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'user',
          content: userMessage
        });
      }
    } catch (err) {
      console.error('Error saving user message:', err);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Handle file upload if present
      let fileContent = null;
      if (uploadedFile) {
        // Read file content (simplified for demo)
        const reader = new FileReader();
        fileContent = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result);
          reader.readAsText(uploadedFile);
        });
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            message: userMessage,
            history: messages,
            conversationId,
            summaryType,
            fileContent
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId: string | null = null;

      // Add empty assistant message for streaming
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  id: assistantMessageId || undefined
                };
                return newMessages;
              });
            } else if (parsed.type === 'message_id') {
              assistantMessageId = parsed.message_id;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      if (!assistantContent.trim()) {
        assistantContent = 'Îmi pare rău, răspunsul nu a putut fi generat acum. Te rog încearcă din nou.';
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantContent
          };
          return newMessages;
        });
      }

      // Save assistant message
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && assistantContent) {
          await supabase.from('conversation_history').insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent
          });
        }
      } catch (err) {
        console.error('Error saving assistant message:', err);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Nu am putut trimite mesajul. Te rog încearcă din nou.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setUploadedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r bg-muted/30">
        <div className="p-4 border-b">
          <Button 
            onClick={startNewConversation} 
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Conversație Nouă
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationHistory
            onSelectConversation={handleConversationSelect}
            currentConversationId={conversationId}
          />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-4 border-b">
            <Button 
              onClick={() => {
                startNewConversation();
                setIsSidebarOpen(false);
              }} 
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Conversație Nouă
            </Button>
          </div>
          <ConversationHistory
            onSelectConversation={handleConversationSelect}
            currentConversationId={conversationId}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Yana</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={startNewConversation}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nou</span>
            </Button>
            {messages.length > 1 && (
              <Button
                onClick={deleteConversation}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Șterge</span>
              </Button>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4">
          <div className="max-w-3xl mx-auto py-8 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="max-w-[85%] space-y-3">
                    {message.calculatorType === 'dividend-vs-salary' ? (
                      <>
                        <div className="bg-muted rounded-2xl px-5 py-4">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                        <DividendVsSalaryCalculator />
                      </>
                    ) : message.calculatorType === 'micro-vs-profit' ? (
                      <>
                        <div className="bg-muted rounded-2xl px-5 py-4">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                        <MicroVsProfitCalculator />
                      </>
                    ) : (
                      <div className="bg-muted rounded-2xl px-5 py-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.content.split('\n').map((line, i) => {
                            if (line.startsWith('###')) {
                              return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                            } else if (line.startsWith('##')) {
                              return <h2 key={i} className="text-lg font-semibold mt-5 mb-3">{line.replace('## ', '')}</h2>;
                            } else if (line.startsWith('**') && line.endsWith('**')) {
                              return <p key={i} className="font-semibold my-2">{line.replace(/\*\*/g, '')}</p>;
                            } else if (line.match(/^[🔹🔸➡️✅⚠️📌💡🎯📊📧📱🔄🗂️🧾👋💬🎓✨]/)) {
                              return <p key={i} className="my-1.5">{line}</p>;
                            } else if (line.trim().startsWith('-')) {
                              return <p key={i} className="my-1 ml-4">{line}</p>;
                            } else if (line.trim()) {
                              return <p key={i} className="my-2 leading-relaxed">{line}</p>;
                            } else {
                              return <div key={i} className="h-2" />;
                            }
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-primary text-primary-foreground">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-5 py-4">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="max-w-3xl mx-auto">
            {uploadedFile && (
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="flex-1 truncate">{uploadedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div className="flex items-end gap-3">
              <VoiceInterface onTranscript={handleVoiceInput} />
              
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrie mesajul tău aici..."
                  className="min-h-[56px] max-h-[200px] resize-none pr-24 rounded-3xl py-4 px-4"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.xlsx,.xls,.csv,.txt"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 p-0 hover:bg-muted"
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || (!input.trim() && !uploadedFile)}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              Yana poate face greșeli. Verifică informațiile importante.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
