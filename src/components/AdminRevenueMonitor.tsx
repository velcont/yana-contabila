import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, DollarSign, Zap, Repeat, FileCheck, Clock, Mail, FileText, Download, User, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface PaymentRecord {
  id: string;
  payment_type: 'credits' | 'subscription';
  date: string;
  user_email: string;
  user_name: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  description: string;
  stripe_reference: string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_generated: boolean;
  metadata?: any;
}

interface UserBillingDetails {
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  cif?: string;
  address?: string;
  city?: string;
  country?: string;
  stripe_customer_id?: string;
}

interface TotalStats {
  total_revenue: number;
  credits_revenue: number;
  subscriptions_revenue: number;
  credits_count: number;
  subscriptions_count: number;
  invoices_generated: number;
  invoices_pending: number;
}

export default function AdminRevenueMonitor() {
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'credits' | 'subscriptions'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserBillingDetails | null>(null);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [totalStats, setTotalStats] = useState<TotalStats>({
    total_revenue: 0,
    credits_revenue: 0,
    subscriptions_revenue: 0,
    credits_count: 0,
    subscriptions_count: 0,
    invoices_generated: 0,
    invoices_pending: 0
  });
  const { toast } = useToast();

  const loadAllPayments = async () => {
    setLoading(true);
    try {
      // Fetch credite AI
      const { data: credits } = await supabase
        .from('credits_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      // Fetch abonamente
      const { data: subscriptions } = await supabase
        .from('subscription_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      // Fetch toate profile-urile necesare
      const allUserIds = [
        ...(credits || []).map(c => c.user_id),
        ...(subscriptions || []).map(s => s.user_id)
      ];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', allUserIds);

      // Fetch toate facturile pentru credite (prin stripe_session_id)
      const allSessionIds = (credits || []).map(c => c.stripe_checkout_session_id).filter(Boolean);
      const { data: creditInvoices } = await supabase
        .from('smartbill_invoices')
        .select('*')
        .in('stripe_session_id', allSessionIds);

      // Fetch facturile pentru abonamente (prin smartbill_invoice_id din subscription_payments)
      const subscriptionInvoiceIds = (subscriptions || [])
        .map(s => s.smartbill_invoice_id)
        .filter(Boolean);
      const { data: subInvoices } = await supabase
        .from('smartbill_invoices')
        .select('*')
        .in('id', subscriptionInvoiceIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const invoiceBySessionMap = new Map(creditInvoices?.map(i => [i.stripe_session_id, i]) || []);
      const invoiceByIdMap = new Map(subInvoices?.map(i => [i.id, i]) || []);

      // Transformă în format unificat
      const creditsPayments: PaymentRecord[] = (credits || []).map(c => {
        const profile = profileMap.get(c.user_id);
        const invoice = invoiceBySessionMap.get(c.stripe_checkout_session_id);
        return {
          id: c.id,
          payment_type: 'credits' as const,
          date: c.purchase_date,
          user_email: profile?.email || 'N/A',
          user_name: profile?.full_name || 'N/A',
          user_id: c.user_id,
          amount_cents: c.amount_paid_cents,
          currency: 'RON',
          description: `Pachet ${c.credits_added} credite AI`,
          stripe_reference: c.stripe_checkout_session_id,
          invoice_number: invoice?.invoice_number,
          invoice_series: invoice?.invoice_series,
          invoice_generated: !!invoice,
          metadata: c.metadata
        };
      });

      const subscriptionsPayments: PaymentRecord[] = (subscriptions || []).map(s => {
        const profile = profileMap.get(s.user_id);
        const invoice = s.smartbill_invoice_id ? invoiceByIdMap.get(s.smartbill_invoice_id) : null;
        return {
          id: s.id,
          payment_type: 'subscription' as const,
          date: s.payment_date,
          user_email: profile?.email || 'N/A',
          user_name: profile?.full_name || 'N/A',
          user_id: s.user_id,
          amount_cents: s.amount_paid_cents,
          currency: s.currency,
          description: `Abonament ${s.subscription_type === 'entrepreneur' ? 'Antreprenor' : 'Cabinet Contabil'} (${format(new Date(s.period_start), 'MMM yyyy', { locale: ro })})`,
          stripe_reference: s.stripe_invoice_id || '',
          invoice_number: invoice?.invoice_number,
          invoice_series: invoice?.invoice_series,
          invoice_generated: s.invoice_generated || !!invoice,
          metadata: s.metadata
        };
      });

      // Combină și sortează
      const combined = [...creditsPayments, ...subscriptionsPayments]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllPayments(combined);

      // Calculează statistici
      const stats: TotalStats = {
        total_revenue: combined.reduce((sum, p) => sum + p.amount_cents, 0),
        credits_revenue: creditsPayments.reduce((sum, p) => sum + p.amount_cents, 0),
        subscriptions_revenue: subscriptionsPayments.reduce((sum, p) => sum + p.amount_cents, 0),
        credits_count: creditsPayments.length,
        subscriptions_count: subscriptionsPayments.length,
        invoices_generated: combined.filter(p => p.invoice_generated).length,
        invoices_pending: combined.filter(p => !p.invoice_generated).length
      };
      setTotalStats(stats);

    } catch (error: any) {
      console.error('Error loading payments:', error);
      toast({
        title: 'Eroare',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPayments();
  }, []);

  // Check if session ID is valid for Stripe API calls
  const isValidStripeSession = (sessionId: string, paymentType: string) => {
    if (!sessionId) return false;
    
    // Detect manual/recovery IDs that don't exist in Stripe
    if (sessionId.includes('manual') || sessionId.includes('recovery') || sessionId.includes('_fix_')) {
      return false;
    }
    
    // Validate proper Stripe ID format
    if (paymentType === 'subscription') {
      return sessionId.startsWith('in_'); // Stripe invoice ID
    } else {
      return sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_'); // Stripe checkout session ID
    }
  };

  const handleSendPaymentEmail = async (payment: PaymentRecord) => {
    // Validate session ID first
    if (!isValidStripeSession(payment.stripe_reference, payment.payment_type)) {
      toast({
        title: '⚠️ ID Invalid',
        description: 'Acest ID de plată este manual și nu poate fi procesat automat. Te rugăm să trimiți emailul manual.',
        variant: 'destructive'
      });
      return;
    }

    setSendingEmail(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke('notify-payment-admin', {
        body: { 
          sessionId: payment.stripe_reference,
          paymentType: payment.payment_type 
        }
      });
      
      if (error) throw error;
      
      // Check if the response indicates an error
      if (data && !data.success) {
        throw new Error(data.error || 'Eroare necunoscută');
      }
      
      toast({
        title: '✅ Email trimis',
        description: 'Detalii plată trimise la office@velcont.com'
      });
    } catch (error: any) {
      toast({
        title: '❌ Eroare',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleGenerateInvoice = async (payment: PaymentRecord) => {
    // Validate session ID first
    if (!isValidStripeSession(payment.stripe_reference, payment.payment_type)) {
      toast({
        title: '⚠️ ID Invalid',
        description: 'Acest ID de plată este manual și nu poate fi folosit pentru generare automată. Generează factura manual în SmartBill.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingInvoice(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-generate-invoice', {
        body: { 
          sessionId: payment.stripe_reference,
          paymentType: payment.payment_type
        }
      });
      
      if (error) throw error;
      
      // Check if the response indicates an error
      if (data && !data.success) {
        throw new Error(data.error || data.message || 'Eroare necunoscută');
      }
      
      toast({
        title: '✅ Factură generată',
        description: `Factură SmartBill: ${data.invoice?.number || 'N/A'}`
      });
      await loadAllPayments(); // Refresh
    } catch (error: any) {
      toast({
        title: '❌ Eroare',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const exportToCSV = () => {
    const csvRows = [
      ['Data', 'Client', 'Email', 'Tip', 'Descriere', 'Suma (RON)', 'Moneda', 'Factură', 'Status', 'Referință Stripe'],
      ...filteredPayments.map(p => [
        format(new Date(p.date), 'dd/MM/yyyy HH:mm', { locale: ro }),
        p.user_name,
        p.user_email,
        p.payment_type === 'subscription' ? 'Abonament' : 'Credite',
        p.description,
        (p.amount_cents / 100).toFixed(2),
        p.currency,
        p.invoice_generated ? `${p.invoice_series}-${p.invoice_number}` : '-',
        p.invoice_generated ? 'Facturat' : 'Nefacturat',
        p.stripe_reference
      ])
    ];

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `venituri-yana-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} RON`;
  };

  const handleViewUserDetails = async (payment: PaymentRecord) => {
    try {
      // Fetch user profile and company details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', payment.user_id)
        .single();

      if (profileError) throw profileError;

      // Fetch company details if user has one
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, cif, cui, address, phone, contact_person, contact_email, stripe_customer_id')
        .eq('user_id', payment.user_id)
        .maybeSingle();

      const userDetails: UserBillingDetails = {
        full_name: profile?.full_name || 'N/A',
        email: profile?.email || 'N/A',
        phone: company?.phone,
        company_name: company?.company_name,
        cif: company?.cif || company?.cui,
        address: company?.address,
        stripe_customer_id: company?.stripe_customer_id || payment.metadata?.stripe_customer_id
      };

      setSelectedUserDetails(userDetails);
      setShowUserDetailsDialog(true);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele utilizatorului',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '✅ Copiat',
      description: `${label} copiat în clipboard`
    });
  };

  // Filter payments
  const filteredPayments = allPayments.filter(payment => {
    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'credits' && payment.payment_type !== 'credits') return false;
      if (filterType === 'subscriptions' && payment.payment_type !== 'subscription') return false;
    }

    // Filter by period
    if (filterPeriod !== 'all') {
      const paymentDate = new Date(payment.date);
      const now = new Date();
      
      if (filterPeriod === 'today') {
        if (paymentDate.toDateString() !== now.toDateString()) return false;
      } else if (filterPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (paymentDate < weekAgo) return false;
      } else if (filterPeriod === 'month') {
        if (paymentDate.getMonth() !== now.getMonth() || paymentDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterPeriod === 'year') {
        if (paymentDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  return (
    <>
      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>👤 Date Client pentru Facturare</DialogTitle>
            <DialogDescription>
              Toate datele necesare pentru emiterea facturii manuale în SmartBill
            </DialogDescription>
          </DialogHeader>

          {selectedUserDetails && (
            <div className="space-y-4">
              {/* Personal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Date Personale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Nume Complet</p>
                      <p className="font-medium">{selectedUserDetails.full_name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedUserDetails.full_name, 'Nume')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedUserDetails.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedUserDetails.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedUserDetails.phone && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Telefon</p>
                        <p className="font-medium">{selectedUserDetails.phone}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(selectedUserDetails.phone!, 'Telefon')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company Details */}
              {(selectedUserDetails.company_name || selectedUserDetails.cif) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Date Firmă</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedUserDetails.company_name && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Denumire Firmă</p>
                          <p className="font-medium">{selectedUserDetails.company_name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(selectedUserDetails.company_name!, 'Denumire')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {selectedUserDetails.cif && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">CIF/CUI</p>
                          <p className="font-medium">{selectedUserDetails.cif}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(selectedUserDetails.cif!, 'CIF')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {selectedUserDetails.address && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Adresă</p>
                          <p className="font-medium">{selectedUserDetails.address}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(selectedUserDetails.address!, 'Adresă')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Stripe Details */}
              {selectedUserDetails.stripe_customer_id && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Referințe Stripe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer ID</p>
                        <p className="font-mono text-xs">{selectedUserDetails.stripe_customer_id}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(selectedUserDetails.stripe_customer_id!, 'Stripe ID')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>💡 Notă:</strong> Copiază aceste date și emite factura manual în SmartBill pentru plățile cu ID-uri manuale.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venituri</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.credits_count + totalStats.subscriptions_count} tranzacții
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credite AI</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.credits_revenue)}</div>
            <p className="text-xs text-muted-foreground">{totalStats.credits_count} achiziții</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonamente</CardTitle>
            <Repeat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.subscriptions_revenue)}</div>
            <p className="text-xs text-muted-foreground">{totalStats.subscriptions_count} plăți</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturi</CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.invoices_generated}</div>
            <p className="text-xs text-muted-foreground">{totalStats.invoices_pending} în așteptare</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Revenue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>💰 Toate Veniturile - Facturare Unificată</CardTitle>
              <CardDescription>
                Credite AI și Abonamente - toate plățile într-un singur loc
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadAllPayments} disabled={loading} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tip plată" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 Toate</SelectItem>
                <SelectItem value="credits">💳 Credite AI</SelectItem>
                <SelectItem value="subscriptions">🔄 Abonamente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Perioadă" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🕐 Toate timpurile</SelectItem>
                <SelectItem value="today">📅 Astăzi</SelectItem>
                <SelectItem value="week">📅 Ultima săptămână</SelectItem>
                <SelectItem value="month">📅 Luna aceasta</SelectItem>
                <SelectItem value="year">📅 Anul acesta</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Payments Table */}
          {loading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Descriere</TableHead>
                  <TableHead className="text-right">Sumă</TableHead>
                  <TableHead>Factură</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nu există plăți înregistrate
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(payment.date), 'dd MMM yyyy HH:mm', { locale: ro })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{payment.user_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_type === 'subscription' ? 'default' : 'secondary'}>
                          {payment.payment_type === 'subscription' ? '🔄 Abonament' : '💳 Credite'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate">{payment.description}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {payment.stripe_reference?.substring(0, 20)}...
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold">{formatCurrency(payment.amount_cents)}</p>
                        <p className="text-xs text-muted-foreground">{payment.currency}</p>
                      </TableCell>
                      <TableCell>
                        {!isValidStripeSession(payment.stripe_reference, payment.payment_type) ? (
                          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
                            <Clock className="w-3 h-3" />
                            ID Manual
                          </Badge>
                        ) : payment.invoice_generated ? (
                          <Badge variant="outline" className="gap-1">
                            <FileCheck className="h-3 w-3 text-green-500" />
                            {payment.invoice_series}-{payment.invoice_number}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Nefacturat
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUserDetails(payment)}
                            title="Vezi date client pentru facturare"
                          >
                            <User className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendPaymentEmail(payment)}
                            disabled={sendingEmail === payment.id}
                            title="Trimite Email"
                          >
                            {sendingEmail === payment.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                          </Button>
                          
                          {!payment.invoice_generated && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleGenerateInvoice(payment)}
                              disabled={generatingInvoice === payment.id}
                              title="Generează Factură"
                            >
                              {generatingInvoice === payment.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}