import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Handshake, Star, Mail, Phone, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ServiceProvider {
  id: string;
  provider_type: string;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  description: string | null;
  specializations: string[];
  commission_rate: number;
  rating: number | null;
  is_verified: boolean;
}

interface ServiceRecommendation {
  id: string;
  provider_id: string;
  client_company_id: string;
  service_description: string | null;
  status: 'sent' | 'accepted' | 'completed' | 'cancelled';
  commission_amount: number | null;
  commission_paid: boolean;
  created_at: string;
  service_providers?: ServiceProvider;
  companies?: { company_name: string };
}

interface ServiceMarketplaceProps {
  clients: Array<{ id: string; company_name: string; email: string }>;
}

const providerTypeLabels: Record<string, string> = {
  lawyer: 'Avocat',
  auditor: 'Auditor',
  tax_consultant: 'Consultant Fiscal',
  business_consultant: 'Consultant Afaceri',
  other: 'Altele',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  sent: { label: 'Trimisă', variant: 'secondary' },
  accepted: { label: 'Acceptată', variant: 'default' },
  completed: { label: 'Completată', variant: 'outline' },
  cancelled: { label: 'Anulată', variant: 'destructive' },
};

export function ServiceMarketplace({ clients }: ServiceMarketplaceProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
    fetchRecommendations();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setProviders((data || []) as unknown as ServiceProvider[]);
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca furnizorii de servicii.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('service_recommendations')
        .select(`
          *,
          service_providers(company_name, provider_type),
          companies(company_name)
        `)
        .eq('accountant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecommendations((data || []) as unknown as ServiceRecommendation[]);
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleRecommend = async () => {
    if (!selectedProvider || !selectedClient) {
      toast({
        title: 'Validare',
        description: 'Selectează un client și introdu o descriere.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const commissionAmount = selectedProvider.commission_rate > 0 ? 0 : null;

      const { error } = await supabase.from('service_recommendations').insert({
        accountant_id: user.id,
        client_company_id: selectedClient,
        provider_id: selectedProvider.id,
        service_description: serviceDescription,
        commission_amount: commissionAmount,
        status: 'sent',
      });

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Recomandarea a fost trimisă către client.',
      });

      setRecommendDialogOpen(false);
      setSelectedClient('');
      setServiceDescription('');
      setSelectedProvider(null);
      fetchRecommendations();
    } catch (error: any) {
      console.error('Error creating recommendation:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut trimite recomandarea.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('service_recommendations')
        .update({ commission_paid: true })
        .eq('id', recommendationId);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Comisionul a fost marcat ca plătit.',
      });

      fetchRecommendations();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza comisionul.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Se încarcă...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">Furnizori Disponibili</TabsTrigger>
          <TabsTrigger value="recommendations">Recomandările Mele</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {providers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Nu există furnizori verificați momentan.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Card key={provider.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{provider.company_name}</CardTitle>
                        <CardDescription>{providerTypeLabels[provider.provider_type]}</CardDescription>
                      </div>
                      {provider.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {provider.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{provider.description}</p>
                    )}
                    
                    {provider.specializations && provider.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {provider.specializations.slice(0, 3).map((spec, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      {provider.contact_person && (
                        <p className="text-muted-foreground">Contact: {provider.contact_person}</p>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{provider.email}</span>
                      </div>
                      {provider.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span className="text-xs">{provider.phone}</span>
                        </div>
                      )}
                    </div>

                    {provider.commission_rate > 0 && (
                      <Badge variant="outline" className="w-fit">
                        Comision: {provider.commission_rate}%
                      </Badge>
                    )}

                    <Dialog open={recommendDialogOpen && selectedProvider?.id === provider.id} onOpenChange={(open) => {
                      setRecommendDialogOpen(open);
                      if (!open) {
                        setSelectedProvider(null);
                        setSelectedClient('');
                        setServiceDescription('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          variant="default"
                          onClick={() => setSelectedProvider(provider)}
                        >
                          <Handshake className="h-4 w-4 mr-2" />
                          Recomandă
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Recomandă {provider.company_name}</DialogTitle>
                          <DialogDescription>
                            Trimite o recomandare către unul dintre clienții tăi
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="client">Selectează Client</Label>
                            <Select value={selectedClient} onValueChange={setSelectedClient}>
                              <SelectTrigger>
                                <SelectValue placeholder="Alege un client..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.company_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Descriere Serviciu</Label>
                            <Textarea
                              id="description"
                              placeholder="Descrie serviciul recomandat..."
                              value={serviceDescription}
                              onChange={(e) => setServiceDescription(e.target.value)}
                              rows={4}
                            />
                          </div>

                          {provider.commission_rate > 0 && (
                            <div className="rounded-lg bg-muted p-3 text-sm">
                              <p className="text-muted-foreground">
                                Comision potențial: <span className="font-semibold">{provider.commission_rate}%</span>
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={handleRecommend}
                              disabled={submitting || !selectedClient}
                              className="flex-1"
                            >
                              {submitting ? 'Se trimite...' : 'Trimite Recomandare'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setRecommendDialogOpen(false)}
                            >
                              Anulează
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Istoricul Recomandărilor</CardTitle>
              <CardDescription>Urmărește statusul și comisioanele recomandărilor tale</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground">Nu ai trimis nicio recomandare încă.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Furnizor</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comision</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendations.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          {rec.service_providers?.company_name}
                          <div className="text-xs text-muted-foreground">
                            {providerTypeLabels[rec.service_providers?.provider_type || '']}
                          </div>
                        </TableCell>
                        <TableCell>{rec.companies?.company_name}</TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[rec.status].variant}>
                            {statusLabels[rec.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rec.commission_amount ? (
                            <div className="flex items-center gap-2">
                              <span>{rec.commission_amount} RON</span>
                              {rec.commission_paid ? (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Plătit
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Neplătit
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(rec.created_at).toLocaleDateString('ro-RO')}
                        </TableCell>
                        <TableCell>
                          {rec.commission_amount && !rec.commission_paid && rec.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(rec.id)}
                            >
                              Marchează Plătit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
