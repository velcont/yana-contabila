import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Scale, Sparkles, FileText } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useConversation } from '@/hooks/useConversation';
import type { ConversationMessage } from '@/types/shared';

interface FiscalChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FiscalChat: React.FC<FiscalChatProps> = ({ open, onOpenChange }) => {
  const [input, setInput] = useState('');
  
  // Folosim hook-ul centralizat pentru conversație
  const {
    messages,
    isLoading,
    sendMessage,
    loadConversationHistory,
  } = useConversation({ type: 'fiscal', autoLoadHistory: false });

  // Încarcă istoricul când se deschide dialogul
  useEffect(() => {
    if (open) {
      loadConversationHistory();
    }
  }, [open, loadConversationHistory]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    await sendMessage({ 
      content: userMessage,
      metadata: { type: 'fiscal' }
    });
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                🏛️ Legislație Fiscală - Chat AI
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Asistent specializat în legislația fiscală românească
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Alert important */}
        <div className="px-6 py-4 bg-muted/30">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p className="font-medium">Legislație actualizată permanent:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Codul Fiscal actualizat (OUG 115/2023)</li>
                  <li>Ordine ANAF și HG recente</li>
                  <li>Jurisprudență relevantă</li>
                  <li>Răspunsuri cu referințe legale precise</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Mesaje */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
              <div className="p-6 bg-primary/5 rounded-2xl">
                <Scale className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Asistent Legislație Fiscală
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Pune întrebări despre legislația fiscală românească. 
                  Primești răspunsuri cu referințe legale precise.
                </p>
              </div>

              {/* Întrebări sugerate */}
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Exemple de întrebări:
                </p>
                <div className="grid gap-2">
                  {[
                    '📋 Care sunt modificările din OUG 115/2023?',
                    '💰 Cum se calculează impozitul pe dividende?',
                    '📝 Ce documente sunt necesare pentru înregistrarea TVA?',
                    '⏰ Care sunt termenele de declarare pentru T1 2025?',
                  ].map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/5"
                      onClick={() => setInput(question.replace(/^[^\s]+ /, ''))}
                    >
                      <FileText className="h-4 w-4 mr-2 shrink-0" />
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Badge-uri informative */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="font-normal">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Răspunsuri cu surse legale
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  <Scale className="h-3 w-3 mr-1" />
                  Legislație actualizată
                </Badge>
              </div>
            </div>
          ) : (
            messages
              .filter(msg => msg.role !== 'system')
              .map((message: ConversationMessage) => (
              <ChatMessage
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                sources={message.metadata?.sources}
                relatedQuestions={message.metadata?.related_questions}
                onQuestionClick={handleQuestionClick}
              />
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t bg-background">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder="Întreabă despre legislație fiscală..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FiscalChat;
