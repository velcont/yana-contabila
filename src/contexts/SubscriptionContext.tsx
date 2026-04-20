import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Cache subscription response per user pentru 30s pentru a preveni
// apelurile duplicate la check-subscription la fiecare mount/render.
const SUBSCRIPTION_CACHE_TTL_MS = 30_000;

type SubscriptionType = 'yana_strategic' | 'entrepreneur' | 'accounting_firm'; // Legacy support
type SubscriptionStatus = 'active' | 'inactive' | 'trial_expired' | 'loading';
export type AccessType = 'free_access' | 'trial' | 'subscription' | 'trial_expired' | null;

// Label-uri prietenoase pentru afișare în UI
export const ACCESS_TYPE_LABELS: Record<NonNullable<AccessType>, string> = {
  free_access: 'Acces Gratuit',
  trial: 'Trial Activ',
  subscription: 'Abonament Plătit',
  trial_expired: 'Trial Expirat',
};

interface SubscriptionContextType {
  subscriptionType: SubscriptionType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  isAccountant: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
  accessType: AccessType;
  checkSubscription: (showLoading?: boolean) => Promise<void>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('entrepreneur');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [accessType, setAccessType] = useState<'free_access' | 'trial' | 'subscription' | 'trial_expired' | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasShownToast, setHasShownToast] = useState(false);

  // Guards anti-duplicate-call:
  // - inFlightRef: dacă există deja o cerere în zbor pentru același user, nu mai pornim alta.
  // - lastFetchRef: cache simplu (userId + timestamp) ca să sărim refetch-urile sub TTL.
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchRef = useRef<{ userId: string; at: number } | null>(null);

  const checkSubscription = async (showLoading = true) => {
    if (!user) {
      setSubscriptionStatus('inactive');
      setAccessType(null);
      setTrialExpired(false);
      setLoading(false);
      return;
    }

    // Skip dacă avem deja un fetch recent pentru acest user
    const cached = lastFetchRef.current;
    if (cached && cached.userId === user.id && Date.now() - cached.at < SUBSCRIPTION_CACHE_TTL_MS) {
      console.log('[SubscriptionContext] Using cached subscription (age:', Date.now() - cached.at, 'ms)');
      if (showLoading) setLoading(false);
      return;
    }

    // Dedup: dacă există deja o cerere în zbor, așteaptă pe ea în loc să pornești una nouă
    if (inFlightRef.current) {
      console.log('[SubscriptionContext] Reusing in-flight subscription request');
      return inFlightRef.current;
    }

    const run = (async () => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('[SubscriptionContext] Checking subscription status...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      console.log('[SubscriptionContext] Response from check-subscription:', data);

      // Backend returnează access_type care determină CORECT sursa accesului:
      // - 'free_access': has_free_access = true în profil
      // - 'subscription': abonament Stripe activ SAU subscription manuală activă
      // - 'trial': trial_ends_at > NOW()
      // - 'trial_expired': trial_ends_at <= NOW() și nu are alt acces
      // - null: fără acces

      const backendAccessType = data.access_type as AccessType;
      
      setSubscriptionType(data.subscription_type || 'entrepreneur');
      setSubscriptionStatus(data.subscription_status || 'inactive');
      setSubscriptionEnd(data.subscription_end || null);
      setTrialExpired(data.trial_expired || backendAccessType === 'trial_expired');
      setAccessType(backendAccessType);

      // Calculate trial days remaining ONLY for 'trial' access type
      if (backendAccessType === 'trial' && data.subscription_end) {
        const trialEndDate = new Date(data.subscription_end);
        const now = new Date();
        const diffTime = trialEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setTrialDaysRemaining(diffDays > 0 ? diffDays : 0);

        // Show toast only once per session, when user logs in
        if (diffDays > 0 && !hasShownToast && showLoading) {
          setHasShownToast(true);
          
          const variant = diffDays <= 7 ? 'destructive' : diffDays <= 14 ? 'default' : 'default';
          const emoji = diffDays <= 7 ? '⚠️' : diffDays <= 14 ? '📅' : '✅';
          
          toast({
            title: `${emoji} Perioada ta de gratuitate`,
            description: `Mai ai ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'} din cele 30 de zile gratuite.`,
            variant: variant,
            duration: 8000,
          });
        }
      } else {
        setTrialDaysRemaining(null);
      }

      console.log('[SubscriptionContext] Final state:', {
        accessType: backendAccessType,
        subscriptionStatus: data.subscription_status,
        trialExpired: data.trial_expired || backendAccessType === 'trial_expired'
      });

      // Marchează succesul în cache (doar dacă nu a aruncat eroare)
      lastFetchRef.current = { userId: user.id, at: Date.now() };
    } catch (error) {
      console.error('[SubscriptionContext] Error checking subscription:', error);
      setSubscriptionStatus('inactive');
      setAccessType(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription(true);
      // REMOVED: Auto-refresh polling - causes UI flickering and is unnecessary
      // Subscription status doesn't change frequently enough to warrant constant polling
      // Will refresh on: page reload, manual refresh, or specific user actions
    } else {
      setSubscriptionStatus('inactive');
      setLoading(false);
    }
  }, [user]);

  const value = {
    subscriptionType,
    subscriptionStatus,
    subscriptionEnd,
    isSubscribed: subscriptionStatus === 'active',
    isAccountant: subscriptionType === 'accounting_firm',
    trialExpired,
    trialDaysRemaining,
    accessType,
    checkSubscription,
    loading,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
