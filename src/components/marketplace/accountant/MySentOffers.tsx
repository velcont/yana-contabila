import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface SentOffer {
  id: string;
  job_posting_id: string;
  price_per_month: number;
  services_included: string[];
  message: string;
  status: string;
  created_at: string;
  job_posting: {
    company_name: string;
    cui: string;
    contact_email: string;
    contact_phone: string;
  };
}

export const MySentOffers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<SentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOffers();
    }
  }, [user]);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('accountant_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobPostingIds = [...new Set(data?.map(o => o.job_posting_id) || [])];
      const { data: jobPostings } = await supabase
        .from('job_postings')
        .select('id, company_name, cui, contact_email, contact_phone')
        .in('id', jobPostingIds);

      const jobPostingsMap = new Map(jobPostings?.map(jp => [jp.id, jp]) || []);

      const enrichedOffers = (data || []).map(offer => ({
        ...offer,
        job_posting: jobPostingsMap.get(offer.job_posting_id) || {
          company_name: 'Companie',
          cui: '',
          contact_email: '',
          contact_phone: ''
        }
      }));

      setOffers(enrichedOffers as any);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Ofertele Mele Trimise ({offers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nu ai trimis oferte încă.</p>
            <p className="text-sm">Răspunde la anunțurile de mai sus pentru a câștiga clienți noi!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{offer.job_posting.company_name}</h3>
                    <p className="text-sm text-muted-foreground">CUI: {offer.job_posting.cui}</p>
                  </div>
                  <Badge variant={
                    offer.status === 'pending' ? 'default' :
                    offer.status === 'accepted' ? 'default' :
                    offer.status === 'rejected' ? 'secondary' :
                    'outline'
                  }>
                    {offer.status === 'pending' ? 'În așteptare' :
                     offer.status === 'accepted' ? '✅ Acceptată' :
                     offer.status === 'rejected' ? '❌ Respinsă' :
                     'Retrasă'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preț ofertat:</span>
                    <span className="text-lg font-bold text-primary">{offer.price_per_month} RON/lună</span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium">Servicii incluse:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {offer.services_included.map((service, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Mesaj:</span>
                    <p className="text-sm text-muted-foreground mt-1">{offer.message}</p>
                  </div>
                </div>

                {offer.job_posting.contact_email && offer.job_posting.contact_phone && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">📞 Contact Antreprenor</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[60px]">Email:</span>
                        <a 
                          href={`mailto:${offer.job_posting.contact_email}`} 
                          className="text-blue-600 underline hover:text-blue-800 break-all"
                        >
                          {offer.job_posting.contact_email}
                        </a>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[60px]">Telefon:</span>
                        <a 
                          href={`tel:${offer.job_posting.contact_phone}`} 
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          {offer.job_posting.contact_phone}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: ro })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
