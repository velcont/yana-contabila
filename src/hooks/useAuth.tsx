import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Setăm imediat utilizatorul pentru a evita "scoaterea" din cont până vine evenimentul onAuthStateChange
    if (!error && data?.session) {
      setSession(data.session);
      setUser(data.session.user);
      setLoading(false);
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
    
    // CRITICAL: accountType trebuie să existe pentru signup valid
    if (!accountType) {
      return { error: new Error('Account type is required') };
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          subscription_type: accountType,
          account_type_selected: true,
          terms_accepted: true
        }
      }
    });
    
    console.log('🔵 [SIGN UP] Metadata sent:', {
      subscription_type: accountType,
      account_type_selected: true,
      terms_accepted: true
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      setSession(null);
      setUser(null);
    }

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
