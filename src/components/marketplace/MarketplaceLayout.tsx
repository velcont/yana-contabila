import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { UpgradeWall } from './shared/UpgradeWall';
import { PostJobButton } from './entrepreneur/PostJobButton';
import { MyJobPostings } from './entrepreneur/MyJobPostings';
import { ReceivedOffers } from './entrepreneur/ReceivedOffers';
import { JobListings } from './accountant/JobListings';
import { MySentOffers } from './accountant/MySentOffers';

export const MarketplaceLayout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionType, setSubscriptionType] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('subscription_type, subscription_status')
        .eq('id', user.id)
        .single();
      
      setSubscriptionType(data?.subscription_type || '');
      setSubscriptionStatus(data?.subscription_status || '');
      setLoading(false);
    };
    
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Free users - show upgrade wall
  if (subscriptionType === 'free' || !subscriptionType) {
    return (
      <UpgradeWall
        title="🔒 Marketplace YANA"
        description="Găsește contabilul perfect sau clienți noi!"
        planName="Începe de la"
        price="49 RON"
        features={[
          "Postează anunțuri nelimitate (Antreprenor)",
          "Răspunde la anunțuri nelimitate (Contabil)",
          "Notificări real-time",
          "Chat direct cu contabili/clienți",
          "Profil public cu rating",
        ]}
      />
    );
  }

  // Inactive subscription
  if (subscriptionStatus !== 'active') {
    return (
      <UpgradeWall
        title="🔒 Abonament Expirat"
        description="Reînnoiește abonamentul pentru acces la Marketplace"
        planName="Reînnoiește de la"
        price="49 RON"
        features={[
          "Acces complet la toate funcțiile",
          "Fără limite de utilizare",
          "Suport prioritar",
        ]}
      />
    );
  }

  // Entrepreneur view - DOAR pentru antreprenori
  if (subscriptionType === 'entrepreneur') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Găsește Contabil Perfect</h2>
            <p className="text-muted-foreground">
              Postează un anunț și primește oferte de la contabili verificați
            </p>
          </div>
          <PostJobButton />
        </div>
        
        <MyJobPostings userId={user?.id} />
        <ReceivedOffers userId={user?.id} />
      </div>
    );
  }

  // Accountant view - DOAR pentru contabili
  if (subscriptionType === 'accounting_firm') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Clienți Noi</h2>
          <p className="text-muted-foreground">
            Browse anunțuri și trimite oferte pentru clienți potențiali
          </p>
        </div>
        
        <JobListings />
        <MySentOffers />
      </div>
    );
  }

  return null;
};
