import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout maxim de 5 secunde pentru loading state
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout reached - forcing loading=false');
      setLoading(false);
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
      .catch((error) => {
        console.error('Error getting session:', error);
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
