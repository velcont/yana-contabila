import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Offer {
  id: string;
  job_posting_id: string;
  price_per_month: number;
  services_included: string[];
  message: string;
  status: string;
  created_at: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string | null;
  accountant_profile: {
    firm_name: string;
    location: string;
    years_experience: number;
    rating: number;
  };
}

export const ReceivedOffers = ({ userId }: { userId?: string }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadOffers();
    }
  }, [userId]);

  const loadOffers = async () => {
    try {
      const { data: jobPostings } = await supabase
        .from('job_postings')
        .select('id')
        .eq('user_id', userId);

      if (!jobPostings || jobPostings.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobPostings.map(j => j.id);

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .in('job_posting_id', jobIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch accountant profiles separately
      const accountantIds = [...new Set(data?.map(o => o.accountant_id) || [])];
      const { data: profiles } = await supabase
        .from('accountant_profiles')
        .select('*')
        .in('user_id', accountantIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedOffers = (data || []).map(offer => ({
        ...offer,
        accountant_profile: profilesMap.get(offer.accountant_id) || {
          firm_name: 'Contabil',
          location: '',
          years_experience: 0,
          rating: 0
        }
      }));

      setOffers(enrichedOffers as any);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (offerId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('job_offers')
        .update({ 
          status: newStatus,
          responded_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: newStatus === 'accepted' ? "Ofertă acceptată!" : "Ofertă respinsă",
        description: newStatus === 'accepted' 
          ? "Contabilul va fi notificat. Vă puteți contacta direct."
          : "Contabilul va fi notificat despre decizie.",
      });

      loadOffers();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
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
          <Mail className="h-5 w-5" />
          Oferte Primite ({offers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nu ai primit oferte încă.</p>
            <p className="text-sm">Când contabilii îți vor trimite oferte, le vei vedea aici.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{offer.accountant_profile?.firm_name || 'Contabil'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {offer.accountant_profile?.location && `${offer.accountant_profile.location} • `}
                      {offer.accountant_profile?.years_experience} ani experiență
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      offer.status === 'pending' ? 'default' :
                      offer.status === 'accepted' ? 'default' :
                      'secondary'
                    }>
                      {offer.status === 'pending' ? 'În așteptare' :
                       offer.status === 'accepted' ? 'Acceptată' :
                       'Respinsă'}
                    </Badge>
                    {offer.accountant_profile?.rating > 0 && (
                      <p className="text-sm mt-1">⭐ {offer.accountant_profile.rating.toFixed(1)}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preț lunar:</span>
                    <span className="text-lg font-bold text-primary">{offer.price_per_month} RON</span>
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

                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <h4 className="font-semibold text-green-800 text-sm mb-2">📞 Contact Contabil</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[70px]">Email:</span>
                      <a 
                        href={`mailto:${offer.contact_email}`} 
                        className="text-blue-600 underline hover:text-blue-800 break-all"
                      >
                        {offer.contact_email}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[70px]">Telefon:</span>
                      <a 
                        href={`tel:${offer.contact_phone}`} 
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {offer.contact_phone}
                      </a>
                    </div>
                    {offer.contact_whatsapp && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[70px]">WhatsApp:</span>
                        <a 
                          href={`https://wa.me/${offer.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 underline hover:text-green-800"
                        >
                          {offer.contact_whatsapp} 💬
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: ro })}
                  </span>
                  
                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(offer.id, 'rejected')}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Respinge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(offer.id, 'accepted')}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Acceptă
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
