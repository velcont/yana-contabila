import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Paperclip, Search, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from './DocumentUploader';
import { ArtifactRenderer } from './ArtifactRenderer';
import { ContextIndicator } from './ContextIndicator';
import { MiniCreditsIndicator } from './MiniCreditsIndicator';
import { SourcesDisplay } from './SourcesDisplay';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePremiumWordReport } from '@/utils/generatePremiumWordReport';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  created_at: string;
  route?: string;
  sources?: string[];
}

interface Artifact {
  type: 'radar_chart' | 'bar_chart' | 'line_chart' | 'table' | 'download' | 'war_room' | 'battle_plan';
  data: unknown;
  title?: string;
  downloadUrl?: string;
  fileName?: string;
}

interface YanaChatProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function YanaChat({ conversationId, onConversationCreated }: YanaChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [activeContext, setActiveContext] = useState<{ companyName?: string; balanceId?: string } | null>(null);
  const [userName, setUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user profile for personalized greeting
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (data?.full_name) {
        const firstName = data.full_name.split(' ')[0];
        setUserName(firstName);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) {
        setMessages([]);
        setActiveContext(null);
        return;
      }

      const { data, error } = await supabase
        .from('yana_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages((data || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        artifacts: (m.artifacts as unknown as Artifact[]) || [],
        created_at: m.created_at || new Date().toISOString(),
      })));

      // Load conversation context
      const { data: convData } = await supabase
        .from('yana_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();

      if (convData?.metadata) {
        setActiveContext(convData.metadata as { companyName?: string; balanceId?: string });
      }
    };

    loadMessages();
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversation = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('yana_conversations')
      .insert({
        user_id: user!.id,
        title: 'Conversație nouă',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const sendMessage = useCallback(async (content: string, fileData?: { fileName: string; fileContent: string; fileType: string }) => {
    if (!content.trim() && !fileData) return;
    if (!user) return;

    setIsLoading(true);
    setInput('');

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
        onConversationCreated(convId);
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: fileData ? `📎 ${fileData.fileName}\n\n${content}` : content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Save user message
      await supabase.from('yana_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: userMessage.content,
      });

      // Call AI router
      const { data: response, error } = await supabase.functions.invoke('ai-router', {
        body: {
          message: content,
          conversationId: convId,
          fileData,
        },
      });

      if (error) throw error;

      // Build artifacts array
      const artifacts: Artifact[] = response.artifacts || [];

      // Generate Word report for balance analysis
      if (response.route === 'analyze-balance' && response.structuredData) {
        try {
          const { blob, fileName } = await generatePremiumWordReport({
            structuredData: response.structuredData,
            grokValidation: response.grokValidation || null,
            companyInfo: {
              name: response.structuredData.company || response.companyName || 'Companie',
              cui: response.structuredData.cui || 'N/A'
            }
          });

          const downloadUrl = URL.createObjectURL(blob);
          artifacts.push({
            type: 'download',
            title: 'Raport Analiză Financiară',
            fileName: fileName,
            downloadUrl: downloadUrl,
            data: null
          });
        } catch (wordError) {
          console.error('Error generating Word report:', wordError);
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response || response.analysis || 'Am procesat cererea ta.',
        artifacts,
        created_at: new Date().toISOString(),
        route: response.route,
        sources: response.citations || response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update context if company name was detected
      if (response.companyName) {
        setActiveContext(prev => ({ ...prev, companyName: response.companyName }));
        
        // Update conversation metadata
        await supabase
          .from('yana_conversations')
          .update({ 
            metadata: { companyName: response.companyName },
            title: `Analiză ${response.companyName}`,
          })
          .eq('id', convId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user, onConversationCreated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileUpload = async (file: File, content: string) => {
    setShowUploader(false);
    await sendMessage(`Analizează documentul: ${file.name}`, {
      fileName: file.name,
      fileContent: content,
      fileType: file.type,
    });
  };

  const getWelcomeMessage = () => {
    if (messages.length > 0) return null;
    
    if (userName) {
      return `Salut, ${userName}! Mă bucur că te văd din nou. Cu ce te pot ajuta astăzi?`;
    }
    return 'Bună! Cu ce te pot ajuta?';
  };

  const welcomeMessage = getWelcomeMessage();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Context Indicator */}
      {activeContext?.companyName && (
        <ContextIndicator
          companyName={activeContext.companyName}
          onClear={() => setActiveContext(null)}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {welcomeMessage && (
          <div className="flex justify-center py-20">
            <div className="text-center space-y-4 max-w-md">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">Y</span>
              </div>
              <h2 className="text-xl font-medium text-foreground">{welcomeMessage}</h2>
              <p className="text-muted-foreground text-sm">
                Încarcă o balanță Excel pentru analiză sau pune-mi orice întrebare despre finanțele companiei tale.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 max-w-3xl mx-auto',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">Y</span>
              </div>
            )}
            
            <div
              className={cn(
                'rounded-2xl px-4 py-3 max-w-[80%]',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {/* Route indicator for assistant messages */}
              {message.role === 'assistant' && message.route && (
                <div className="flex items-center gap-1.5 mb-2 text-xs">
                  {message.route === 'fiscal-chat' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      <Search className="h-3 w-3" />
                      Yana Fiscală
                    </span>
                  ) : message.route === 'strategic-advisor' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      <Lightbulb className="h-3 w-3" />
                      Consilier Strategic
                    </span>
                  ) : null}
                </div>
              )}
              
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              
              {/* Display sources for fiscal responses */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <SourcesDisplay sources={message.sources} />
              )}
              
              {/* Render artifacts */}
              {message.artifacts && message.artifacts.length > 0 && (
                <div className="mt-4 space-y-3">
                  {message.artifacts.map((artifact, index) => (
                    <ArtifactRenderer key={index} artifact={artifact} />
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground font-medium text-xs">
                  {userName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">Y</span>
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Analizez...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <DocumentUploader
          onUpload={handleFileUpload}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => setShowUploader(true)}
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrie un mesaj sau încarcă o balanță..."
              className="min-h-[44px] max-h-32 resize-none bg-background border-border"
              disabled={isLoading}
            />
            
            <div className="flex items-end gap-1">
              <MiniCreditsIndicator />
              <Button
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Yana poate face greșeli. Verifică informațiile importante.
            </p>
            <span className="text-xs text-muted-foreground">•</span>
            <Link to="/pricing" className="text-xs text-primary hover:underline">
              Prețuri
            </Link>
            <span className="text-xs text-muted-foreground">•</span>
            <Link to="/contact" className="text-xs text-primary hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}