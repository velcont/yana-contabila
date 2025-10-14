import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type SubscriptionType = 'entrepreneur' | 'accounting_firm';
type SubscriptionStatus = 'active' | 'inactive' | 'trial_expired' | 'loading';

interface SubscriptionContextType {
  subscriptionType: SubscriptionType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  isAccountant: boolean;
  trialExpired: boolean;
  checkSubscription: (showLoading?: boolean) => Promise<void>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('entrepreneur');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async (showLoading = true) => {
    if (!user) {
      setSubscriptionStatus('inactive');
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('Checking subscription status...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      console.log('Subscription data:', data);

      setSubscriptionType(data.subscription_type || 'entrepreneur');
      setSubscriptionStatus(data.subscription_status || 'inactive');
      setSubscriptionEnd(data.subscription_end || null);
      setTrialExpired(data.trial_expired || false);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('inactive');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription(true);
      
      // Auto-refresh every 5 minutes without showing loading state
      const interval = setInterval(() => checkSubscription(false), 300000);
      return () => clearInterval(interval);
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
    isAccountant: subscriptionType === 'accounting_firm' && subscriptionStatus === 'active',
    trialExpired,
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
