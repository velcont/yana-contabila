import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkForNewVersion, performVersionRefresh, saveCurrentVersion } from '@/utils/versionRefresh';

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
    // Nu blocăm autentificarea!
  }
};

// Export pentru useSessionGuard
export { logAuthEvent };

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flag pentru cleanup și prevenire memory leaks
    let mounted = true;
    const sessionStartTime = Date.now();
    
    // Timeout redus la 2 secunde pentru loading state (fix audit 2.4)
    const loadingTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    // Set up auth state listener FIRST
    // IMPORTANT: Skip PASSWORD_RECOVERY event - let Auth.tsx handle it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Prevenire actualizări după unmount
        if (!mounted) return;
        
        // Skip PASSWORD_RECOVERY - Auth.tsx gestionează resetarea parolei
        if (event === 'PASSWORD_RECOVERY') {
          console.log('🔐 [useAuth] PASSWORD_RECOVERY event - skipping, Auth.tsx handles this');
          return; // Nu procesăm aici, lăsăm Auth.tsx să gestioneze
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
        
        // Faza 2: Verificare versiune la SIGNED_IN + Logging
        if (event === 'SIGNED_IN') {
          // Logging async pentru SIGNED_IN
          setTimeout(() => {
            if (!mounted) return;
            logAuthEvent('AUTH_LOGIN', session?.user?.id || null, session?.user?.email || null, {
              event: 'SIGNED_IN',
              session_load_time_ms: Date.now() - sessionStartTime
            });
          }, 0);
          
          // Protecție anti-loop: verificăm dacă am făcut deja refresh în această sesiune
          const refreshGuard = sessionStorage.getItem('yana_login_refresh_guard');
          if (refreshGuard === 'true') {
            console.log('🔄 [useAuth] Refresh guard active - skipping version check');
            return;
          }
          
          // Delay mic pentru a evita deadlock Supabase
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const hasNewVersion = await checkForNewVersion(supabase);
              if (hasNewVersion) {
                console.log('🔄 [useAuth] New version detected at login - refreshing...');
                sessionStorage.setItem('yana_login_refresh_guard', 'true');
                await saveCurrentVersion(supabase);
                await performVersionRefresh();
              }
            } catch (error) {
              console.warn('[useAuth] Version check failed:', error);
            }
          }, 100);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
        
        // Logging pentru sesiune restaurată
        if (session?.user) {
          setTimeout(() => {
            if (!mounted) return;
            logAuthEvent('AUTH_SESSION_RESTORED', session.user.id, session.user.email || null, {
              event: 'SESSION_RESTORED',
              session_load_time_ms: Date.now() - sessionStartTime
            });
          }, 0);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
        clearTimeout(loadingTimeout);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Verificare versiune după autentificare reușită - DOAR pentru pending_refresh de la logout
    // Nota: Verificarea normală de versiune nouă se face în onAuthStateChange (SIGNED_IN event)
    // pentru a evita race condition și refresh-uri duplicate
    if (!error) {
      // Verificăm dacă există flag de refresh pending de la logout
      const pendingRefresh = localStorage.getItem('pending_refresh');
      if (pendingRefresh === 'true') {
        localStorage.removeItem('pending_refresh');
        await saveCurrentVersion(supabase);
        await performVersionRefresh();
        return { error }; // Nu ajunge aici, pagina se reîncarcă
      }
      // NU mai facem verificare versiune aici - onAuthStateChange se ocupă de asta
    }
    
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType?: 'entrepreneur' | 'accounting_firm'
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('🔵 [SIGN UP] Starting signup with accountType:', accountType);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          // Setăm tipul de cont direct în metadata pentru a fi folosit de trigger-ul handle_new_user
          subscription_type: accountType,
          account_type_selected: !!accountType,
          terms_accepted: true
        }
      }
    });
    
    console.log('🔵 [SIGN UP] Metadata sent:', {
      subscription_type: accountType,
      account_type_selected: !!accountType,
      terms_accepted: true
    });
    
    return { error };
  };

  const signOut = async () => {
    // Curățare cache și setare flag pentru refresh la următorul login
    try {
      // Șterge toate cache-urile
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Setăm flag pentru a forța refresh la următorul login
      localStorage.setItem('pending_refresh', 'true');
    } catch (error) {
      console.warn('[SIGN_OUT] Cache cleanup failed:', error);
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};
