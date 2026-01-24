import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Constante pentru protecție anti-loop
const MIN_REFRESH_INTERVAL = 30000; // 30 secunde între refresh-uri
const MAX_REFRESH_ATTEMPTS = 3; // Maxim 3 încercări pe minut

// Helper pentru logging autentificare - async, non-blocant
const logAuthEvent = async (
  eventType: 'AUTH_LOGIN' | 'AUTH_SESSION_RESTORED' | 'AUTH_TOKEN_REFRESH',
  userId: string | null,
  userEmail: string | null,
  metadata: Record<string, unknown>
) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: eventType,
      table_name: 'auth',
      metadata: {
        ...metadata,
        device: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        user_agent: navigator.userAgent.slice(0, 200),
        timestamp: new Date().toISOString()
      }
    });
    console.log(`[AuthLogging] ${eventType} logged for ${userEmail}`);
  } catch (error) {
    console.warn('[AuthLogging] Failed to log event:', error);
  }
};

/**
 * Hook pentru monitorizarea și reîmprospătarea proactivă a sesiunii
 * Previne erori 401 prin refresh automat când token-ul este aproape de expirare
 * Include protecție anti-loop pentru a preveni rate limiting
 */
export const useSessionGuard = () => {
  const { toast } = useToast();
  
  // Tracking pentru protecție anti-loop
  const lastRefreshAttempt = useRef<number>(0);
  const refreshAttempts = useRef<number>(0);
  const refreshWindowStart = useRef<number>(Date.now());

  // Funcție pentru verificarea și refresh-ul sesiunii cu protecție anti-loop
  const refreshSessionIfNeeded = useCallback(async () => {
    const now = Date.now();
    
    // Reset counter la fiecare minut
    if (now - refreshWindowStart.current > 60000) {
      refreshAttempts.current = 0;
      refreshWindowStart.current = now;
    }
    
    // Protecție anti-loop: verifică dacă am depășit limita
    if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
      console.log('[SessionGuard] Max refresh attempts reached - skipping');
      return false;
    }
    
    // Protecție anti-loop: verifică intervalul minim
    if (now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL) {
      console.log('[SessionGuard] Skipping refresh - too soon (debounce)');
      return true; // Return true pentru a nu declanșa erori
    }
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[SessionGuard] No active session');
        return false;
      }

      // Verifică dacă token-ul expiră în mai puțin de 5 minute
      const expiresAt = session.expires_at;
      const nowSeconds = Math.floor(now / 1000);
      const timeLeft = expiresAt ? expiresAt - nowSeconds : 0;

      if (timeLeft < 300) { // 5 minute
        console.log('[SessionGuard] Token expiring soon, refreshing...', { timeLeft });
        
        // Actualizăm tracking-ul ÎNAINTE de refresh
        lastRefreshAttempt.current = now;
        refreshAttempts.current++;
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[SessionGuard] Refresh failed:', refreshError);
          return false;
        }
        
        if (refreshData.session) {
          console.log('[SessionGuard] Session refreshed successfully');
          
          // Logging pentru token refresh
          setTimeout(() => {
            logAuthEvent('AUTH_TOKEN_REFRESH', refreshData.session?.user?.id || null, refreshData.session?.user?.email || null, {
              event: 'TOKEN_REFRESH',
              time_left_before_refresh_seconds: timeLeft,
              refresh_trigger: 'proactive',
              attempt_number: refreshAttempts.current
            });
          }, 0);
          
          return true;
        }
      }

      return true;
    } catch (err) {
      console.error('[SessionGuard] Error checking session:', err);
      return false;
    }
  }, []);

  // Verificare periodică a sesiunii (la fiecare 2 minute)
  useEffect(() => {
    const checkSession = async () => {
      await refreshSessionIfNeeded();
    };

    // Verificare inițială
    checkSession();

    // Verificare periodică
    const interval = setInterval(checkSession, 120000); // 2 minute

    return () => clearInterval(interval);
  }, [refreshSessionIfNeeded]);

  // Funcție pentru validare sesiune înainte de operații critice
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('[SessionGuard] No valid session, attempting refresh...');
        
        // Încearcă refresh forțat
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[SessionGuard] Session refresh failed:', refreshError);
          
          toast({
            title: '❌ Sesiune expirată',
            description: 'Te rugăm să te reconectezi pentru a continua.',
            variant: 'destructive',
            duration: 7000
          });
          
          return false;
        }
        
        console.log('[SessionGuard] Session refreshed before operation');
        return true;
      }

      // Verifică dacă token-ul este aproape de expirare
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = expiresAt ? expiresAt - now : 0;

      if (timeLeft < 60) { // Mai puțin de 1 minut
        console.log('[SessionGuard] Token about to expire, refreshing before operation...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          toast({
            title: '❌ Sesiune expirată',
            description: 'Te rugăm să te reconectezi pentru a continua.',
            variant: 'destructive',
            duration: 7000
          });
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('[SessionGuard] Validation error:', err);
      
      toast({
        title: '❌ Eroare de autentificare',
        description: 'Te rugăm să te reconectezi.',
        variant: 'destructive',
        duration: 7000
      });
      
      return false;
    }
  }, [toast]);

  return {
    validateSession,
    refreshSessionIfNeeded
  };
};
