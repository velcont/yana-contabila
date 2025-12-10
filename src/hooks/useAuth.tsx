import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkForNewVersion, performVersionRefresh, saveCurrentVersion } from '@/utils/versionRefresh';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout redus la 2 secunde pentru loading state (fix audit 2.4)
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Set up auth state listener FIRST
    // IMPORTANT: Skip PASSWORD_RECOVERY event - let Auth.tsx handle it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip PASSWORD_RECOVERY - Auth.tsx gestionează resetarea parolei
        if (event === 'PASSWORD_RECOVERY') {
          console.log('🔐 [useAuth] PASSWORD_RECOVERY event - skipping, Auth.tsx handles this');
          return; // Nu procesăm aici, lăsăm Auth.tsx să gestioneze
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
      })
      .catch(() => {
        setLoading(false);
        clearTimeout(loadingTimeout);
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Verificare versiune după autentificare reușită
    if (!error) {
      // Verificăm dacă există flag de refresh pending de la logout
      const pendingRefresh = localStorage.getItem('pending_refresh');
      if (pendingRefresh === 'true') {
        localStorage.removeItem('pending_refresh');
        await saveCurrentVersion(supabase);
        await performVersionRefresh();
        return { error }; // Nu ajunge aici, pagina se reîncarcă
      }
      
      // Verificare normală de versiune nouă
      setTimeout(async () => {
        const hasNewVersion = await checkForNewVersion(supabase);
        if (hasNewVersion) {
          await saveCurrentVersion(supabase);
          await performVersionRefresh();
        }
      }, 0);
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
