import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, RefreshCw, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserCredit {
  user_id: string;
  user_email: string;
  total_purchased_cents: number;
  total_credits_added: number;
  current_budget_cents: number;
  total_spent_cents: number;
  remaining_budget_cents: number;
  usage_percent: number;
  last_purchase_date: string | null;
  purchase_count: number;
  usage_count: number;
}

interface PurchaseDetail {
  id: string;
  amount_paid_cents: number;
  credits_added: number;
  purchase_date: string;
  package_name: string;
  stripe_checkout_session_id: string;
}

interface UsageDetail {
  id: string;
  created_at: string;
  endpoint: string;
  model: string;
  total_tokens: number;
  estimated_cost_cents: number;
}

export default function AdminCreditsMonitor() {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [usages, setUsages] = useState<UsageDetail[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get detailed report for each user
      const usersData: UserCredit[] = [];
      for (const profile of profiles || []) {
        const { data, error } = await supabase.rpc('get_user_credits_report', {
          p_user_id: profile.id
        });

        if (!error && data && data.length > 0) {
          usersData.push({
            user_id: profile.id,
            ...data[0]
          });
        }
      }

      setUsers(usersData);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (user: UserCredit) => {
    try {
      // Get purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('credits_purchases')
        .select('*')
        .eq('user_id', user.user_id)
        .order('purchase_date', { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);

      // Get usages
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usagesData, error: usagesError } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('month_year', currentMonth)
        .order('created_at', { ascending: false })
        .limit(50);

      if (usagesError) throw usagesError;
      setUsages(usagesData || []);

      setSelectedUser(user);
      setDetailsOpen(true);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, []);

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} RON`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Niciodată';
    return new Date(date).toLocaleString('ro-RO');
  };

  const getStatusColor = (usagePercent: number) => {
    if (usagePercent >= 90) return 'destructive';
    if (usagePercent >= 70) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>🔍 Monitor Credite AI - Toți Utilizatorii</CardTitle>
              <CardDescription>
                Sistem complet de tracking pentru disputuri și reclamații
              </CardDescription>
            </div>
            <Button onClick={loadAllUsers} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Reîmprospătează
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Plătit Total</TableHead>
                  <TableHead className="text-right">Credite Adăugate</TableHead>
                  <TableHead className="text-right">Consum Luna Curentă</TableHead>
                  <TableHead className="text-right">Rămas</TableHead>
                  <TableHead className="text-center">Utilizare</TableHead>
                  <TableHead className="text-center">Achiziții</TableHead>
                  <TableHead className="text-center">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nu există utilizatori
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_email}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          {formatCurrency(user.total_purchased_cents)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {user.total_credits_added} credite
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.total_spent_cents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={user.remaining_budget_cents < 0 ? 'text-red-600 font-bold' : ''}>
                          {formatCurrency(user.remaining_budget_cents)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusColor(user.usage_percent)}>
                          {user.usage_percent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {user.purchase_count} {user.purchase_count === 1 ? 'achiziție' : 'achiziții'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadUserDetails(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalii Complete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog with full user details */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Raport Complet - {selectedUser?.user_email}</DialogTitle>
            <DialogDescription>
              Toate tranzacțiile și consumul AI pentru acest utilizator
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2 px-4">
                    <CardTitle className="text-sm">Total Plătit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedUser.total_purchased_cents)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.purchase_count} {selectedUser.purchase_count === 1 ? 'tranzacție' : 'tranzacții'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 px-4">
                    <CardTitle className="text-sm">Consum Luna Curentă</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(selectedUser.total_spent_cents)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.usage_count} cereri AI
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 px-4">
                    <CardTitle className="text-sm">Credite Rămase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${selectedUser.remaining_budget_cents < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatCurrency(selectedUser.remaining_budget_cents)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.usage_percent.toFixed(1)}% utilizat
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Purchases History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💳 Istoric Achiziții</CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nicio achiziție înregistrată
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Pachet</TableHead>
                          <TableHead className="text-right">Sumă Plătită</TableHead>
                          <TableHead className="text-right">Credite Adăugate</TableHead>
                          <TableHead>Session ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{purchase.package_name}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(purchase.amount_paid_cents)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">+{purchase.credits_added}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {purchase.stripe_checkout_session_id?.slice(-12)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Usage History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🤖 Istoric Utilizare AI (Luna Curentă)</CardTitle>
                </CardHeader>
                <CardContent>
                  {usages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nicio utilizare înregistrată luna aceasta
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Ora</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usages.map((usage) => (
                          <TableRow key={usage.id}>
                            <TableCell>{formatDate(usage.created_at)}</TableCell>
                            <TableCell className="font-mono text-xs">{usage.endpoint}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{usage.model}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{usage.total_tokens}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(usage.estimated_cost_cents)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}