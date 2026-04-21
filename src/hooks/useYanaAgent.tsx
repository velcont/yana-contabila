/**
 * useYanaAgent — SSE client for the autonomous Yana agent
 * Streams: thinking | tool_call | tool_result | final | error | done
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgentStep =
  | { type: 'thinking'; text: string; ts: number }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, unknown>; ts: number }
  | { type: 'tool_result'; id: string; name: string; result: unknown; ts: number };

interface UseYanaAgentReturn {
  isRunning: boolean;
  steps: AgentStep[];
  finalText: string;
  error: string | null;
  run: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>;
  reset: () => void;
}

export function useYanaAgent(): UseYanaAgentReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setFinalText('');
    setError(null);
    setIsRunning(false);
    abortRef.current?.abort();
  }, []);

  const run = useCallback(
    async (message: string, history: Array<{ role: string; content: string }>): Promise<string> => {
      setIsRunning(true);
      setSteps([]);
      setFinalText('');
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Nu ești autentificat');

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yana-agent`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message, conversation_history: history }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          throw new Error(`Agent eroare: ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let final = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events: split on double newline
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const evt of events) {
            if (!evt.trim()) continue;
            const lines = evt.split('\n');
            let eventName = '';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) eventName = line.slice(7).trim();
              else if (line.startsWith('data: ')) dataStr = line.slice(6);
            }
            if (!eventName) continue;

            let payload: Record<string, unknown> = {};
            try { payload = JSON.parse(dataStr); } catch { /* ignore */ }

            const ts = Date.now();
            switch (eventName) {
              case 'thinking':
                setSteps(prev => [...prev, { type: 'thinking', text: String(payload.text || ''), ts }]);
                break;
              case 'tool_call':
                setSteps(prev => [...prev, {
                  type: 'tool_call',
                  id: String(payload.id || ''),
                  name: String(payload.name || ''),
                  args: (payload.args as Record<string, unknown>) || {},
                  ts,
                }]);
                break;
              case 'tool_result':
                setSteps(prev => [...prev, {
                  type: 'tool_result',
                  id: String(payload.id || ''),
                  name: String(payload.name || ''),
                  result: payload.result,
                  ts,
                }]);
                break;
              case 'final':
                final = String(payload.text || '');
                setFinalText(final);
                break;
              case 'error':
                setError(String(payload.message || 'Eroare necunoscută'));
                break;
              case 'done':
                break;
            }
          }
        }

        return final;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Eroare necunoscută';
        if (msg !== 'AbortError') setError(msg);
        throw e;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return { isRunning, steps, finalText, error, run, reset };
}