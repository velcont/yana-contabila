import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUp, Upload, FileText, Trash2, Menu, X, ArrowDownToLine, ArrowUpFromLine, Landmark, TrendingUp, Receipt } from 'lucide-react';
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
        content: `welcome-screen` // Special marker for welcome screen
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const handleQuickAction = async (question: string) => {
    const userMessage = question.trim();
    if (!userMessage || isLoading) return;

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
            history: messages.filter(m => m.content !== 'welcome-screen'),
            conversationId,
            summaryType
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
    }
  };

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
          <div className="max-w-4xl mx-auto py-8 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="max-w-[90%] space-y-4 w-full">
                    {message.content === 'welcome-screen' ? (
                      // Welcome Screen with Large Action Buttons
                      <div className="space-y-6">
                        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl px-8 py-10 border border-primary/10">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <span className="text-4xl">✨</span>
                              </div>
                              <div>
                                <h2 className="text-3xl font-bold text-foreground">Alege ce vrei să faci</h2>
                                <p className="text-muted-foreground mt-1">Sunt Yana, asistentul tău financiar</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Large Action Buttons Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-chart-1/10 hover:border-chart-1/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Vreau să învăț despre contul 401")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-chart-1/10 flex items-center justify-center group-hover:bg-chart-1/20 transition-colors">
                              <ArrowDownToLine className="h-8 w-8 text-chart-1" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">💰 Încasări</div>
                              <div className="text-sm text-muted-foreground">Învață despre clienți (cont 411)</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-destructive/10 hover:border-destructive/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Vreau să învăț despre contul 401")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                              <ArrowUpFromLine className="h-8 w-8 text-destructive" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">💸 Plăți</div>
                              <div className="text-sm text-muted-foreground">Învață despre furnizori (cont 401)</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-warning/10 hover:border-warning/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Vreau să învăț despre TVA")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                              <Receipt className="h-8 w-8 text-warning" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">📊 TVA</div>
                              <div className="text-sm text-muted-foreground">Cum se calculează TVA-ul</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-accent/10 hover:border-accent/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Vreau să învăț despre profit")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                              <TrendingUp className="h-8 w-8 text-accent" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">📈 Profit</div>
                              <div className="text-sm text-muted-foreground">Cum funcționează profitul</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-success/10 hover:border-success/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Vreau să învăț despre solduri bancă și casă")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                              <Landmark className="h-8 w-8 text-success" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">🏦 Bancă & Casă</div>
                              <div className="text-sm text-muted-foreground">Înțelege conturile 512 și 531</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-32 flex flex-col items-center justify-center gap-3 hover:bg-chart-4/10 hover:border-chart-4/50 transition-all group border-2"
                            onClick={() => handleQuickAction("Învață-mă despre balanță")}
                          >
                            <div className="h-16 w-16 rounded-2xl bg-chart-4/10 flex items-center justify-center group-hover:bg-chart-4/20 transition-colors">
                              <FileText className="h-8 w-8 text-chart-4" />
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-lg text-foreground">📚 Educație</div>
                              <div className="text-sm text-muted-foreground">Cum citești o balanță</div>
                            </div>
                          </Button>
                        </div>

                        {/* Help Section */}
                        <div className="bg-muted/30 rounded-2xl px-6 py-5 border border-border/50">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground text-center">
                              💡 Sau întreabă direct despre concepte contabile
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                              Ex: "Ce înseamnă contul 411?", "Cum funcționează rulajele?"
                            </p>
                          </div>
                        </div>

                        {/* Important Notice */}
                        <div className="bg-warning/10 border border-warning/30 rounded-2xl px-6 py-4">
                          <p className="text-sm text-center">
                            <strong className="text-warning">⚠️ Important:</strong> <span className="text-muted-foreground">Pentru solduri concrete din balanțele tale, mergi în <strong>Dashboard → Dosarul Meu</strong></span>
                          </p>
                        </div>
                      </div>
                    ) : message.calculatorType === 'dividend-vs-salary' ? (
                      <>
                        <div className="bg-muted rounded-2xl px-6 py-5">
                          <p className="text-base leading-relaxed">{message.content}</p>
                        </div>
                        <DividendVsSalaryCalculator />
                      </>
                    ) : message.calculatorType === 'micro-vs-profit' ? (
                      <>
                        <div className="bg-muted rounded-2xl px-6 py-5">
                          <p className="text-base leading-relaxed">{message.content}</p>
                        </div>
                        <MicroVsProfitCalculator />
                      </>
                    ) : (
                      <div className="bg-muted rounded-2xl px-6 py-5">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.content.split('\n').map((line, i) => {
                            if (line.startsWith('###')) {
                              return <h3 key={i} className="text-lg font-semibold mt-5 mb-3">{line.replace('### ', '')}</h3>;
                            } else if (line.startsWith('##')) {
                              return <h2 key={i} className="text-xl font-semibold mt-6 mb-4">{line.replace('## ', '')}</h2>;
                            } else if (line.startsWith('**') && line.endsWith('**')) {
                              return <p key={i} className="font-semibold my-3">{line.replace(/\*\*/g, '')}</p>;
                            } else if (line.match(/^[🔹🔸➡️✅⚠️📌💡🎯📊📧📱🔄🗂️🧾👋💬🎓✨💰📈📉🏦💼]/)) {
                              return <p key={i} className="my-2 leading-relaxed">{line}</p>;
                            } else if (line.trim().startsWith('-')) {
                              return <p key={i} className="my-1.5 ml-4">{line}</p>;
                            } else if (line.trim()) {
                              return <p key={i} className="my-2 leading-relaxed">{line}</p>;
                            } else {
                              return <div key={i} className="h-3" />;
                            }
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-primary text-primary-foreground shadow-sm">
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-6 py-5">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {uploadedFile && (
              <div className="mb-3 flex items-center gap-3 text-sm bg-muted/50 px-5 py-3 rounded-2xl border border-border/50">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <span className="flex-1 truncate font-medium">{uploadedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
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
                  placeholder="Scrie întrebarea ta... Ex: Câți bani am de încasat?"
                  className="min-h-[64px] max-h-[200px] resize-none pr-28 rounded-3xl py-5 px-6 text-base border-2 focus:border-primary/50 transition-colors"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
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
                    className="h-10 w-10 p-0 hover:bg-muted rounded-full"
                    disabled={isLoading}
                  >
                    <Upload className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || (!input.trim() && !uploadedFile)}
                    size="sm"
                    className="h-10 w-10 p-0 rounded-full shadow-lg disabled:opacity-50"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>💡</span>
              <p>Yana te ghidează să înțelegi cifrele, nu le extrage automat</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
