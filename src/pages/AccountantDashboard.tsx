import { useEffect, useState, lazy, Suspense } from 'react';
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
import { Plus, Building2, Search, Mail, ArrowLeft, Eye, FileText, Palette, TrendingUp, ShieldAlert, Calendar, ListTodo, MessageSquare, UserPlus, FileUp, Handshake, UserCheck, Edit, Scale, Loader2, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminRoleSwitcher } from '@/components/AdminRoleSwitcher';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import EmailAnalysisDialog from '@/components/EmailAnalysisDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientFiscalParamsDialog } from '@/components/ClientFiscalParamsDialog';
import { BulkEmailDialog } from '@/components/BulkEmailDialog';
import { CRMManualClientDialog } from '@/components/CRMManualClientDialog';
import { CRMCSVImport } from '@/components/CRMCSVImport';
import { YanaCRMWelcomeDialog } from '@/components/YanaCRMWelcomeDialog';
import { useTutorial } from '@/contexts/TutorialContext';
import { CRMClientForm } from '@/components/CRMClientForm';

// Lazy load heavy tab components
const FiscalDeadlinesManager = lazy(() => import('@/components/FiscalDeadlinesManager').then(m => ({ default: m.FiscalDeadlinesManager })));
const AccountantTasksManager = lazy(() => import('@/components/AccountantTasksManager').then(m => ({ default: m.AccountantTasksManager })));
const CRMMessagingManager = lazy(() => import('@/components/CRMMessagingManager').then(m => ({ default: m.CRMMessagingManager })));
const EmailManager = lazy(() => import('@/components/EmailManager').then(m => ({ default: m.EmailManager })));
const MonthlyWorkflowManager = lazy(() => import('@/components/yanacrm/MonthlyWorkflowManager').then(m => ({ default: m.MonthlyWorkflowManager })));
const ClientDueDiligence = lazy(() => import('@/components/ClientDueDiligence').then(m => ({ default: m.ClientDueDiligence })));
const FiscalChat = lazy(() => import('@/components/FiscalChat'));


const TabContentLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const AccountantDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setShowTutorialMenu } = useTutorial();
  const { isAccountant, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isLoading: adminLoading } = useUserRole();
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    clientEmail: '',
    clientName: '',
    companyName: '',
  });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [fiscalParamsDialogOpen, setFiscalParamsDialogOpen] = useState(false);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [manualClientDialogOpen, setManualClientDialogOpen] = useState(false);
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [fiscalChatOpen, setFiscalChatOpen] = useState(false);
  
  // Fiscal filters
  const [vatRegimeFilter, setVatRegimeFilter] = useState<string[]>([]);
  const [cashVatFilter, setCashVatFilter] = useState<string[]>([]);
  const [taxTypeFilter, setTaxTypeFilter] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      console.log('🔍 CRM - Mounting, checking access...');
      
      // Wait for subscription and admin data to load
      if (subscriptionLoading || adminLoading) {
        console.log('⏳ CRM - Waiting for auth data...', { subscriptionLoading, adminLoading });
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ CRM - No user, redirecting to auth');
        navigate('/auth');
        return;
      }

      // Verificare rapidă - acest dashboard este DOAR pentru contabili
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_type')
        .eq('id', user.id)
        .single();

      // Allow access for admins OR accountants
      if (!isAdmin && profile?.subscription_type !== 'accounting_firm') {
        console.log('⛔ Acces interzis - utilizator nu este admin sau contabil');
        toast({
          title: "Acces restricționat",
          description: "Acest dashboard YanaCRM este disponibil doar pentru conturi de tip Contabil.",
          variant: "destructive",
        });
        navigate('/app');
        return;
      }
      
      console.log('✅ Acces permis la YanaCRM:', isAdmin ? 'Admin' : 'Contabil');
      console.log('🔍 CRM - Fetching clients...');
      if (mounted) {
        fetchClients();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [subscriptionLoading, adminLoading, isAdmin, navigate, toast]);

  const fetchClients = async () => {
    try {
      console.log('🔍 CRM - fetchClients started...');
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ CRM - No user in fetchClients');
        return;
      }

      // Fetch companies managed by this accountant with latest analysis
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('managed_by_accountant_id', user.id);

      if (error) throw error;

      console.log('✅ CRM - Fetched companies:', data?.length || 0);

      // For each company, get the latest analysis
      const companiesWithAnalysis = await Promise.all(
        (data || []).map(async (company) => {
          const { data: latestAnalysis } = await supabase
            .from('analyses')
            .select('metadata, created_at')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...company,
            latestAnalysis
          };
        })
      );
      
      console.log('✅ CRM - Clients with analysis:', companiesWithAnalysis.length);
      setClients(companiesWithAnalysis);
    } catch (error: any) {
      console.error('❌ CRM - Error fetching clients:', error);
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

      // Ensure profile is up-to-date so RLS INSERT passes
      await supabase.functions.invoke('check-subscription');

      const { data: invitation, error } = await supabase
        .from('accountant_invitations')
        .insert({
          accountant_id: user.id,
          client_email: inviteForm.clientEmail,
          client_name: inviteForm.clientName,
          company_name: inviteForm.companyName,
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-client-invitation', {
        body: { invitationId: invitation.id },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: 'Invitație creată',
          description: 'Invitația a fost creată dar email-ul nu a putut fi trimis. Poți trimite link-ul manual.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invitație trimisă',
          description: `Email-ul a fost trimis către ${inviteForm.clientEmail}`,
        });
      }

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

  const filteredClients = clients.filter((client) => {
    // Search filter
    const matchesSearch = 
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // VAT regime filter
    if (vatRegimeFilter.length > 0) {
      const clientVatRegime = client.vat_regime || 'none';
      if (!vatRegimeFilter.includes(clientVatRegime)) return false;
    }
    
    // Cash VAT filter
    if (cashVatFilter.length > 0) {
      const clientCashVat = client.cash_accounting_vat ? 'yes' : 'no';
      if (!cashVatFilter.includes(clientCashVat)) return false;
    }
    
    // Tax type filter
    if (taxTypeFilter.length > 0) {
      const clientTaxType = client.tax_type || 'none';
      if (!taxTypeFilter.includes(clientTaxType)) return false;
    }
    
    return true;
  });

  // Show loading while checking subscription and admin status
  if (subscriptionLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se verifică accesul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <YanaCRMWelcomeDialog />
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Înapoi
              </Button>
              <div data-tour="yanacrm-header">
                <h1 className="text-2xl font-bold text-primary">YanaCRM</h1>
                <p className="text-xs text-muted-foreground">Gestionează toți clienții tăi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTutorialMenu(true)}
                className="gap-2"
              >
                🎓 Tutorial
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/app')}
                className="gap-2"
              >
                📊 Dashboard cu Grafice
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/accountant-branding')}
                className="gap-2"
              >
                <Palette className="h-4 w-4" />
                Branding
              </Button>
              <SubscriptionBadge />
              <AdminRoleSwitcher />
            </div>
          </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="clients" data-tour="clients-tab">
              <Building2 className="mr-2 h-4 w-4" />
              Clienți
            </TabsTrigger>
            <TabsTrigger value="deadlines" data-tour="deadlines-tab">
              <Calendar className="mr-2 h-4 w-4" />
              Termene
            </TabsTrigger>
            <TabsTrigger value="tasks" data-tour="tasks-tab">
              <ListTodo className="mr-2 h-4 w-4" />
              Sarcini
            </TabsTrigger>
            <TabsTrigger value="messaging" data-tour="messaging-tab">
              <MessageSquare className="mr-2 h-4 w-4" />
              Mesaje
            </TabsTrigger>
            <TabsTrigger value="email" data-tour="email-tab">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            {/* ASCUNS - Tab Istoric Confirmări - Feature nefolosit, utilizatorii folosesc "Dosarul Meu" */}
            {/* <TabsTrigger value="balance" data-tour="balance-tab">
              <FileCheck className="mr-2 h-4 w-4" />
              Istoric Confirmări
            </TabsTrigger> */}
            <TabsTrigger value="due-diligence" data-tour="due-diligence-tab">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Verificare Clienți
            </TabsTrigger>
            <TabsTrigger value="workflows" data-tour="workflows-tab">
              <Calendar className="mr-2 h-4 w-4" />
              Dosare Lunare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
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
              <div className="flex gap-2" data-tour="add-client-buttons">
                <Button 
                  onClick={() => setCsvImportDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button 
                  onClick={() => setManualClientDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Adaugă Client Manual
                </Button>
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
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume firmă sau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Fiscal Filters */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30" data-tour="fiscal-filters">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Filtre Parametri Fiscali</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVatRegimeFilter([]);
                      setCashVatFilter([]);
                      setTaxTypeFilter([]);
                      setSelectedClients([]);
                    }}
                  >
                    Resetează filtre
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* VAT Regime Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Plătitor TVA</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'none', label: 'Neplătitor TVA' },
                        { value: 'quarterly', label: 'Trimestrial' },
                        { value: 'monthly', label: 'Lunar' }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`vat-${option.value}`}
                            checked={vatRegimeFilter.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setVatRegimeFilter([...vatRegimeFilter, option.value]);
                              } else {
                                setVatRegimeFilter(vatRegimeFilter.filter(v => v !== option.value));
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`vat-${option.value}`} className="text-sm">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cash VAT Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">TVA la încasare</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'yes', label: 'Da' },
                        { value: 'no', label: 'Nu' }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`cash-${option.value}`}
                            checked={cashVatFilter.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCashVatFilter([...cashVatFilter, option.value]);
                              } else {
                                setCashVatFilter(cashVatFilter.filter(v => v !== option.value));
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`cash-${option.value}`} className="text-sm">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tax Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tip impozit</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'micro', label: 'Impozit micro' },
                        { value: 'profit', label: 'Impozit profit' }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`tax-${option.value}`}
                            checked={taxTypeFilter.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaxTypeFilter([...taxTypeFilter, option.value]);
                              } else {
                                setTaxTypeFilter(taxTypeFilter.filter(v => v !== option.value));
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`tax-${option.value}`} className="text-sm">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bulk Email Button */}
                {filteredClients.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedClients.length > 0 
                        ? `${selectedClients.length} clienți selectați`
                        : `${filteredClients.length} clienți filtrați`}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedClients.length === 0) {
                          // Select all filtered clients
                          setSelectedClients(filteredClients.map(c => c.id));
                        }
                        setBulkEmailDialogOpen(true);
                      }}
                      disabled={filteredClients.length === 0}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Trimite Email în Masă
                    </Button>
                  </div>
                )}
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
              <Table data-tour="clients-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients(filteredClients.map(c => c.id));
                          } else {
                            setSelectedClients([]);
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Firmă</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients([...selectedClients, client.id]);
                            } else {
                              setSelectedClients(selectedClients.filter(id => id !== client.id));
                            }
                          }}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setFiscalParamsDialogOpen(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {client.company_name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {client.contact_email ? (
                            <>
                              <span className="text-sm font-medium">{client.contact_email}</span>
                              {client.contact_person && (
                                <span className="text-xs text-muted-foreground">{client.contact_person}</span>
                              )}
                            </>
                          ) : client.contact_person ? (
                            <span className="text-sm">{client.contact_person}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Activ</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingClient(client);
                              setEditClientDialogOpen(true);
                            }}
                            title="Editează client"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setEmailDialogOpen(true);
                            }}
                            title="Trimite email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              console.log('👁️ View client clicked:', client.id, client.company_name);
                              console.log('👁️ Current route:', window.location.pathname);
                              setSelectedClient(client);
                              setFiscalParamsDialogOpen(true);
                            }}
                            title="Vezi detalii client"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="deadlines">
            <Suspense fallback={<TabContentLoader />}>
              <FiscalDeadlinesManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="tasks">
            <Suspense fallback={<TabContentLoader />}>
              <AccountantTasksManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="messaging">
            <Suspense fallback={<TabContentLoader />}>
              <CRMMessagingManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="email">
            <Suspense fallback={<TabContentLoader />}>
              <EmailManager />
            </Suspense>
          </TabsContent>

          {/* ASCUNS - Tab Istoric Confirmări - Feature nefolosit, utilizatorii folosesc "Dosarul Meu" */}
          {/* <TabsContent value="balance">
            <Suspense fallback={<TabContentLoader />}>
              <BalanceConfirmationHistory />
            </Suspense>
          </TabsContent> */}

          <TabsContent value="due-diligence">
            <Suspense fallback={<TabContentLoader />}>
              <ClientDueDiligence clients={clients} onRefresh={fetchClients} />
            </Suspense>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <Suspense fallback={<TabContentLoader />}>
              <MonthlyWorkflowManager />
            </Suspense>
          </TabsContent>
        </Tabs>

        {selectedClient && (
          <>
            <EmailAnalysisDialog
              open={emailDialogOpen}
              onOpenChange={setEmailDialogOpen}
              companyId={selectedClient.id}
              companyName={selectedClient.company_name}
              clientEmail={selectedClient.contact_email || ''}
              clientName={selectedClient.contact_person || ''}
              latestAnalysis={selectedClient.latestAnalysis}
            />
            <ClientFiscalParamsDialog
              open={fiscalParamsDialogOpen}
              onOpenChange={setFiscalParamsDialogOpen}
              companyId={selectedClient.id}
              companyName={selectedClient.company_name}
              onUpdate={fetchClients}
            />
          </>
        )}

        <BulkEmailDialog
          open={bulkEmailDialogOpen}
          onOpenChange={setBulkEmailDialogOpen}
          clients={selectedClients.length > 0 
            ? clients.filter(c => selectedClients.includes(c.id))
            : filteredClients
          }
        />
        
        <CRMManualClientDialog
          open={manualClientDialogOpen}
          onOpenChange={setManualClientDialogOpen}
          onSuccess={() => {
            fetchClients();
            setManualClientDialogOpen(false);
          }}
        />
        
        <CRMCSVImport
          open={csvImportDialogOpen}
          onOpenChange={setCsvImportDialogOpen}
          onSuccess={() => {
            fetchClients();
            setCsvImportDialogOpen(false);
          }}
        />
        
        {editingClient && (
          <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editează Client: {editingClient.company_name}</DialogTitle>
                <DialogDescription>
                  Modifică informațiile clientului
                </DialogDescription>
              </DialogHeader>
              <CRMClientForm
                clientId={editingClient.id}
                onSuccess={() => {
                  setEditClientDialogOpen(false);
                  setEditingClient(null);
                  fetchClients();
                }}
                onCancel={() => {
                  setEditClientDialogOpen(false);
                  setEditingClient(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Fiscal Chat FAB - only visible on /yanacrm */}
      <Button
        onClick={() => setFiscalChatOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#00B37E] hover:bg-[#00B37E]/90 z-50"
        aria-label="Deschide Yana Fiscală"
      >
        <Scale className="h-6 w-6" />
      </Button>

      <Suspense fallback={null}>
        <FiscalChat open={fiscalChatOpen} onOpenChange={setFiscalChatOpen} />
      </Suspense>
    </div>
  );
};

export default AccountantDashboard;
