import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type SubscriptionType = 'entrepreneur' | 'accounting_firm';
type SubscriptionStatus = 'active' | 'inactive' | 'trial_expired' | 'loading';

interface SubscriptionContextType {
  subscriptionType: SubscriptionType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  isAccountant: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
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
  const [loading, setLoading] = useState(true);
  const [hasShownToast, setHasShownToast] = useState(false);

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
      
      // Get profile data for trial info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('trial_ends_at, subscription_status, has_free_access')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      console.log('Subscription data:', data);

      setSubscriptionType(data.subscription_type || 'entrepreneur');
      setSubscriptionStatus(data.subscription_status || 'inactive');
      setSubscriptionEnd(data.subscription_end || null);
      setTrialExpired(data.trial_expired || false);

      // Calculate trial days remaining
      if (profile?.trial_ends_at && data.subscription_status !== 'active' && !profile.has_free_access) {
        const trialEndDate = new Date(profile.trial_ends_at);
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
            description: `Mai ai ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'} din cele 3 luni gratuite.`,
            variant: variant,
            duration: 8000,
          });
        }
      } else {
        setTrialDaysRemaining(null);
      }
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
    trialDaysRemaining,
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
