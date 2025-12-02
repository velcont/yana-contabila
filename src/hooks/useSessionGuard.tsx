import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pentru monitorizarea și reîmprospătarea proactivă a sesiunii
 * Previne erori 401 prin refresh automat când token-ul este aproape de expirare
 */
export const useSessionGuard = () => {
  const { toast } = useToast();

  // Funcție pentru verificarea și refresh-ul sesiunii
  const refreshSessionIfNeeded = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[SessionGuard] No active session');
        return false;
      }

      // Verifică dacă token-ul expiră în mai puțin de 5 minute
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = expiresAt ? expiresAt - now : 0;

      if (timeLeft < 300) { // 5 minute
        console.log('[SessionGuard] Token expiring soon, refreshing...', { timeLeft });
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[SessionGuard] Refresh failed:', refreshError);
          return false;
        }
        
        if (refreshData.session) {
          console.log('[SessionGuard] Session refreshed successfully');
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
