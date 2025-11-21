/**
 * Hook comun pentru ChatAI și FiscalChat - elimină duplicarea de cod
 * Logica comună pentru conversații cu AI
 */

import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { querySupabase, invokeEdgeFunction, getCurrentUser } from '@/lib/supabaseHelpers';
import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/utils/uuid';
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter';
import { logger } from '@/lib/logger';
import type { ConversationMessage, MessageMetadata } from '@/types/shared';

export type ConversationType = 'fiscal' | 'balance' | 'strategic';

interface UseConversationOptions {
  type: ConversationType;
  autoLoadHistory?: boolean;
}

interface SendMessageOptions {
  content: string;
  metadata?: Partial<MessageMetadata>;
  file?: File;
}

interface EdgeFunctionPayload {
  message: string;
  conversation_history: Array<{ role: string; content: string }>;
  conversation_id: string;
  [key: string]: unknown;
}

interface EdgeFunctionResponse {
  response?: string;
  analysis?: string;
  content?: string;
  sources?: Array<{ title: string; url: string; domain: string }>;
  related_questions?: string[];
  error?: string;
}

export function useConversation({ type, autoLoadHistory = true }: UseConversationOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(generateUUID());
  const { handleError } = useErrorHandler();

  /**
   * Încarcă istoricul conversației din baza de date
   */
  const loadConversationHistory = useCallback(async () => {
    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('metadata->>type', type)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!data || data.length === 0) {
        logger.log(`No ${type} conversation history found`);
        return;
      }

      // Grupează după conversation_id și ia ultima conversație
      const conversationGroups = data.reduce((acc, msg: any) => {
        if (!acc[msg.conversation_id]) {
          acc[msg.conversation_id] = [];
        }
        acc[msg.conversation_id].push(msg);
        return acc;
      }, {} as Record<string, any[]>);

      const lastConvId = Object.keys(conversationGroups)[0];
      if (lastConvId) {
        const lastMessages: ConversationMessage[] = conversationGroups[lastConvId]
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            created_at: msg.created_at,
            conversation_id: msg.conversation_id,
            metadata: msg.metadata as MessageMetadata | undefined,
          }));

        setMessages(lastMessages);
        setConversationId(lastConvId);
        logger.log(`✅ Loaded ${type} history:`, lastMessages.length, 'messages');
      }
    } catch (error) {
      handleError(error, 'încărcarea conversației', { showToast: false });
    }
  }, [type, handleError]);

  /**
   * Salvează un mesaj în baza de date
   */
  const saveMessage = useCallback(
    async (
      role: 'user' | 'assistant',
      content: string,
      metadata?: Partial<MessageMetadata>
    ): Promise<void> => {
      try {
        const user = await getCurrentUser();

        const { error } = await supabase.from('conversation_history').insert({
          user_id: user.id,
          conversation_id: conversationId,
          role,
          content,
          metadata: {
            type,
            ...metadata,
          } as any,
        });

        if (error) throw error;
      } catch (error) {
        logger.error('Failed to save message:', error);
        // Nu aruncăm eroare - conversația poate continua
      }
    },
    [conversationId, type]
  );

  /**
   * Trimite mesaj către edge function
   */
  const sendMessage = useCallback(
    async ({ content, metadata, file }: SendMessageOptions): Promise<boolean> => {
      if (!content.trim() || isLoading) {
        return false;
      }

      // Rate limiting
      const rateLimitKey = type === 'fiscal' ? 'fiscal-chat' : 'chat-message';
      if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.CHAT_MESSAGE)) {
        handleError(
          'Prea multe mesaje. Te rog așteaptă câteva secunde.',
          'rate limit',
          { customTitle: '⏱️ Încetinește' }
        );
        return false;
      }

      setIsLoading(true);

      // Adaugă mesajul utilizatorului în UI
      const userMessage: ConversationMessage = {
        id: generateUUID(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
        metadata: { type, ...metadata },
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Salvează mesajul utilizatorului
        await saveMessage('user', content, metadata);

        // Determină edge function-ul pe baza tipului
        const edgeFunctionName = type === 'fiscal' ? 'fiscal-chat' : 'chat-ai';

        // Pregătește payload-ul
        const payload: EdgeFunctionPayload = {
          message: content,
          conversation_history: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          conversation_id: conversationId,
          ...metadata,
        };

        // Apelează edge function
        const response = await invokeEdgeFunction<EdgeFunctionPayload, EdgeFunctionResponse>(
          edgeFunctionName,
          payload
        );

        // Extrage răspunsul
        const assistantContent =
          response.response || response.analysis || response.content || 'Răspuns nedisponibil';

        // Adaugă răspunsul în UI
        const assistantMessage: ConversationMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: assistantContent,
          created_at: new Date().toISOString(),
          conversation_id: conversationId,
          metadata: {
            type,
            sources: response.sources,
            related_questions: response.related_questions,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Salvează răspunsul
        await saveMessage('assistant', assistantContent, {
          sources: response.sources,
          related_questions: response.related_questions,
        });

        return true;
      } catch (error) {
        handleError(error, 'trimiterea mesajului');
        
        // Elimină mesajul utilizatorului din UI dacă a eșuat
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, messages, type, saveMessage, handleError]
  );

  /**
   * Începe o conversație nouă
   */
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(generateUUID());
    logger.log(`Started new ${type} conversation`);
  }, [type]);

  /**
   * Șterge istoricul conversațiilor
   */
  const clearHistory = useCallback(async () => {
    try {
      const user = await getCurrentUser();

      const { error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('user_id', user.id)
        .eq('metadata->>type', type);

      if (error) throw error;

      setMessages([]);
      startNewConversation();
      
      logger.log(`Cleared ${type} conversation history`);
    } catch (error) {
      handleError(error, 'ștergerea conversației');
    }
  }, [type, startNewConversation, handleError]);

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    loadConversationHistory,
    startNewConversation,
    clearHistory,
  };
}
