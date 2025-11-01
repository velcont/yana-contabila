import { useState, useEffect, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CFOChatInterfaceProps {
  financialData: any | null;
  cfoConversationHistory: Array<{role: 'user' | 'assistant', content: string}>;
  isLoading: boolean;
  onAskQuestion: (question: string) => Promise<void>;
}

export const CFOChatInterface = memo(({ 
  financialData, 
  cfoConversationHistory, 
  isLoading,
  onAskQuestion 
}: CFOChatInterfaceProps) => {
  const [cfoQuestion, setCfoQuestion] = useState('');
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll când se adaugă mesaje noi
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [cfoConversationHistory]);

  const handleAskCFO = async () => {
    if (!cfoQuestion.trim() || isLoading) return;
    await onAskQuestion(cfoQuestion);
    setCfoQuestion('');
  };

  const quickShortcuts = [
    "Pot angaja 2 oameni noi? Ce impact va avea asupra cash flow-ului?",
    "Ce strategie de cash management îmi recomanzi pentru următoarele 3 luni?",
    "Care sunt cele mai mari riscuri financiare și cum le pot preveni?",
    "Cum pot crește profitul în următoarele 6 luni?",
    "Îmi permit să fac investiții majore acum? Ce trebuie să știu?",
    "Cum optimizez taxele și contribuțiile pentru a reduce cheltuielile?"
  ];

  return (
    <div 
      id="cfo-chat" 
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700 scroll-mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          💬 Întreabă CFO AI
        </h3>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          💎 0.85 lei/întrebare
        </Badge>
      </div>

      {/* Hint dacă nu există financial data */}
      {!financialData && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-200">
            💡 <strong>Tip:</strong> Pentru analiză CFO mai precisă, încarcă o balanță în tab-ul "Chat Strategist".
          </p>
        </div>
      )}

      {/* Istoric conversație */}
      {cfoConversationHistory.length > 0 && (
        <div 
          ref={chatHistoryRef}
          className="mb-4 space-y-3 max-h-[400px] overflow-y-auto bg-slate-950/50 rounded-lg p-4"
        >
          {cfoConversationHistory.map((msg, idx) => (
            <div key={idx} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={cn(
                "max-w-[80%] rounded-lg p-3",
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-100'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line}</p>
                    ))}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input pentru întrebare */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={cfoQuestion}
          onChange={(e) => setCfoQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAskCFO()}
          placeholder="Scrie orice întrebare despre afacerea ta..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <Button
          onClick={handleAskCFO}
          disabled={isLoading || !cfoQuestion.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ⏳
            </>
          ) : (
            '🚀 Întreabă'
          )}
        </Button>
      </div>

      {/* Quick shortcuts */}
      <div className="pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-2">💡 Shortcuts rapide:</p>
        <div className="flex flex-wrap gap-2">
          {quickShortcuts.map((q, i) => (
            <button 
              key={i}
              onClick={() => setCfoQuestion(q)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
              disabled={isLoading}
            >
              {q.split('?')[0].substring(0, 30)}...?
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

CFOChatInterface.displayName = 'CFOChatInterface';
