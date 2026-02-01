import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DemoMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DemoChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'yana_demo_messages';
const COUNT_KEY = 'yana_demo_count';
const MAX_QUESTIONS = 5;

export const DemoChat = ({ isOpen, onClose }: DemoChatProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [showSignupOverlay, setShowSignupOverlay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedCount = localStorage.getItem(COUNT_KEY);
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved messages');
      }
    }
    
    if (savedCount) {
      const count = parseInt(savedCount, 10);
      setQuestionCount(count);
      if (count >= MAX_QUESTIONS) {
        setShowSignupOverlay(true);
      }
    }
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(COUNT_KEY, questionCount.toString());
  }, [questionCount]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || questionCount >= MAX_QUESTIONS) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            message: userMessage,
            questionCount 
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          setShowSignupOverlay(true);
          setQuestionCount(MAX_QUESTIONS);
        }
        throw new Error(data.error || 'Eroare la procesare');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      setQuestionCount(data.questionCount);

      if (data.limitReached) {
        setShowSignupOverlay(true);
      }
    } catch (error) {
      console.error('Demo chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Scuze, a apărut o eroare. Te rog încearcă din nou.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSignup = () => {
    onClose();
    navigate('/auth?redirect=/yana');
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COUNT_KEY);
    setMessages([]);
    setQuestionCount(0);
    setShowSignupOverlay(false);
  };

  if (!isOpen) return null;

  const remaining = MAX_QUESTIONS - questionCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">YANA Demo</h3>
              <p className="text-xs text-muted-foreground">
                {remaining > 0 
                  ? `${remaining}/${MAX_QUESTIONS} întrebări rămase`
                  : 'Demo terminat'
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">
                  Salut! Sunt YANA.
                </h4>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Ai 5 întrebări gratuite să mă testezi. Întreabă-mă despre strategii de business, 
                  analiză financiară, sau orice altceva legat de afacerea ta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Signup Overlay */}
        {showSignupOverlay && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 z-10">
            <div className="text-center space-y-6 max-w-sm">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  Ți-a plăcut conversația?
                </h3>
                <p className="text-muted-foreground">
                  Creează-ți un cont gratuit pentru a continua. 
                  Primești <strong>30 de zile</strong> să testezi tot ce poate YANA.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleSignup}
                >
                  Creează cont gratuit
                </Button>
                <p className="text-xs text-muted-foreground">
                  Doar email și parolă. 30 secunde. Fără card.
                </p>
              </div>
              <button 
                onClick={resetDemo}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Resetează demo-ul
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={remaining > 0 ? "Scrie întrebarea ta..." : "Demo terminat"}
              disabled={isLoading || remaining <= 0}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || remaining <= 0}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoChat;
