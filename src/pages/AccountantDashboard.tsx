import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Building2, Search, Mail, ArrowLeft, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AdminRoleSwitcher } from '@/components/AdminRoleSwitcher';

const AccountantDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAccountant } = useSubscription();
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    clientEmail: '',
    clientName: '',
    companyName: '',
  });

  useEffect(() => {
    if (!isAccountant) {
      navigate('/subscription');
      return;
    }
    fetchClients();
  }, [isAccountant]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch companies managed by this accountant
      const { data, error } = await supabase
        .from('companies')
        .select('*, profiles!companies_user_id_fkey(email, full_name)')
        .eq('managed_by_accountant_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca clienții',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteClient = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('accountant_invitations')
        .insert({
          accountant_id: user.id,
          client_email: inviteForm.clientEmail,
          client_name: inviteForm.clientName,
          company_name: inviteForm.companyName,
        });

      if (error) throw error;

      toast({
        title: 'Invitație trimisă',
        description: `Invitația a fost trimisă către ${inviteForm.clientEmail}`,
      });

      setInviteDialogOpen(false);
      setInviteForm({ clientEmail: '', clientName: '', companyName: '' });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut trimite invitația',
        variant: 'destructive',
      });
    }
  };

  const filteredClients = clients.filter((client) =>
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Înapoi
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Contabilitate</h1>
              <p className="text-muted-foreground">Gestionează toți clienții tăi</p>
            </div>
          </div>
          <AdminRoleSwitcher />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Clienți ({filteredClients.length})
                </CardTitle>
                <CardDescription>
                  Toți clienții gestionați de firma ta
                </CardDescription>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invită Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invită Client Nou</DialogTitle>
                    <DialogDescription>
                      Trimite o invitație pentru a adăuga un client nou în platformă
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nume Firmă *</Label>
                      <Input
                        id="companyName"
                        value={inviteForm.companyName}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, companyName: e.target.value })
                        }
                        placeholder="ex: SC ABC SRL"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientName">Nume Contact</Label>
                      <Input
                        id="clientName"
                        value={inviteForm.clientName}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, clientName: e.target.value })
                        }
                        placeholder="ex: Ion Popescu"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Email *</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={inviteForm.clientEmail}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, clientEmail: e.target.value })
                        }
                        placeholder="ex: contact@firma.ro"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Anulează
                    </Button>
                    <Button
                      onClick={handleInviteClient}
                      disabled={!inviteForm.companyName || !inviteForm.clientEmail}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Trimite Invitație
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume firmă sau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Se încarcă clienții...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Niciun client găsit</p>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? 'Încearcă să modifici termenul de căutare'
                    : 'Începe prin a invita primul client'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Invită Primul Client
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firmă</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.company_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{client.profiles?.full_name || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground">
                            {client.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Activ</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app?company=${client.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountantDashboard;
