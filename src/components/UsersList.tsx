import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Copy, Trash2, CreditCard, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast as sonnerToast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string | null;
  subscription_type: string | null;
  created_at: string;
  has_free_access: boolean | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
}

// Helper pentru a determina sursa accesului unui utilizator
type AccessSource = 'paid' | 'free_access' | 'trial' | 'expired' | 'none';

const getAccessSource = (user: Profile): AccessSource => {
  const now = new Date();
  
  // 1. Verifică acces gratuit manual
  if (user.has_free_access) {
    return 'free_access';
  }
  
  // 2. Verifică abonament Stripe plătit (are stripe_subscription_id și status activ)
  if (user.stripe_subscription_id && user.subscription_status === 'active') {
    return 'paid';
  }
  
  // 3. Verifică trial activ
  if (user.trial_ends_at && new Date(user.trial_ends_at) > now) {
    return 'trial';
  }
  
  // 4. Verifică trial expirat
  if (user.trial_ends_at && new Date(user.trial_ends_at) <= now) {
    return 'expired';
  }
  
  return 'none';
};

const ACCESS_SOURCE_CONFIG: Record<AccessSource, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className?: string }> = {
  paid: { 
    label: 'Plătit Stripe', 
    variant: 'default', 
    icon: <CreditCard className="h-3 w-3 mr-1" />,
    className: 'bg-blue-600 hover:bg-blue-700'
  },
  free_access: { 
    label: 'Acces Gratuit', 
    variant: 'default', 
    icon: <Crown className="h-3 w-3 mr-1" />,
    className: 'bg-green-600 hover:bg-green-700'
  },
  trial: { 
    label: 'Trial Activ', 
    variant: 'outline', 
    icon: <Clock className="h-3 w-3 mr-1" />,
    className: 'text-orange-600 border-orange-600'
  },
  expired: { 
    label: 'Trial Expirat', 
    variant: 'destructive', 
    icon: <XCircle className="h-3 w-3 mr-1" />,
    className: ''
  },
  none: { 
    label: 'Fără Acces', 
    variant: 'secondary', 
    icon: null,
    className: ''
  },
};

interface DeletedUser {
  id: string;
  original_user_id: string;
  email: string;
  full_name: string | null;
  subscription_type: string | null;
  subscription_status: string | null;
  deletion_reason: string | null;
  deleted_by_email: string | null;
  deleted_at: string;
  created_at: string;
}

export const UsersList = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const { toast } = useToast();
  const [emailFilter, setEmailFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState<AccessSource | 'all'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca utilizatorii.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedUsers = async () => {
    try {
      setLoadingDeleted(true);
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsers(data || []);
    } catch (error) {
      console.error('Error fetching deleted users:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca utilizatorii șterși.",
        variant: "destructive",
      });
    } finally {
      setLoadingDeleted(false);
    }
  };

  const toggleFreeAccess = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_free_access: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Acces gratuit ${!currentStatus ? 'activat' : 'dezactivat'} cu succes.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling free access:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza accesul gratuit.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setDeletingUserId(userId);
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Utilizator șters",
        description: "Utilizatorul a fost șters cu succes din sistem.",
      });

      fetchUsers();
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut șterge utilizatorul.",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const copyUsersToClipboard = async (usersList: Profile[]) => {
    try {
      const usersText = usersList
        .map((user) => {
          const name = user.full_name || "Fără nume";
          return `${name}\t${user.email}`;
        })
        .join("\n");

      const fullText = `Nume\tEmail\n${usersText}`;
      await navigator.clipboard.writeText(fullText);
      sonnerToast.success(`${usersList.length} utilizatori copiați în clipboard!`, {
        description: "Poți lipi datele în Excel sau Google Sheets",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      sonnerToast.error("Eroare la copierea datelor");
    }
  };

  const normalizedFilter = emailFilter.trim().toLowerCase();
  const emailFiltered = normalizedFilter ? users.filter(u => (u.email || '').toLowerCase().includes(normalizedFilter)) : users;
  const filteredUsers = accessFilter === 'all' ? emailFiltered : emailFiltered.filter(u => getAccessSource(u) === accessFilter);
  const filteredDeletedUsers = normalizedFilter ? deletedUsers.filter(u => (u.email || '').toLowerCase().includes(normalizedFilter)) : deletedUsers;
  const freeAccessUsers = filteredUsers.filter(u => u.has_free_access);

  const renderDeletedUserCard = (deletedUser: DeletedUser) => {
    return (
      <Card key={deletedUser.id} className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">Șters</Badge>
              </div>
              <h3 className="font-semibold text-muted-foreground line-through">
                {deletedUser.full_name || 'Fără nume'}
              </h3>
              <p className="text-sm text-muted-foreground">{deletedUser.email}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>Membru din: {new Date(deletedUser.created_at).toLocaleDateString('ro-RO')}</p>
                <p className="text-destructive font-semibold">
                  Șters: {new Date(deletedUser.deleted_at).toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {deletedUser.deleted_by_email && (
                  <p>Șters de: {deletedUser.deleted_by_email}</p>
                )}
                {deletedUser.deletion_reason && (
                  <p>Motiv: {deletedUser.deletion_reason}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant="outline" className="text-xs">
                {deletedUser.subscription_type === 'entrepreneur' ? 'Antreprenor' : 
                 deletedUser.subscription_type === 'accounting_firm' ? 'Contabil' : 'Necunoscut'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderUserCard = (user: Profile) => {
    const accessSource = getAccessSource(user);
    const accessConfig = ACCESS_SOURCE_CONFIG[accessSource];
    const isInTrial = accessSource === 'trial';
    const trialExpired = accessSource === 'expired';
    
    return (
      <Card key={user.id}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold">{user.full_name || 'Fără nume'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Membru din: {new Date(user.created_at).toLocaleDateString('ro-RO')}
              </p>
              {isInTrial && user.trial_ends_at && (
                <p className="text-xs text-orange-600 mt-1">
                  Trial până: {new Date(user.trial_ends_at).toLocaleDateString('ro-RO')}
                </p>
              )}
              {trialExpired && user.trial_ends_at && (
                <p className="text-xs text-red-600 mt-1">
                  Trial expirat: {new Date(user.trial_ends_at).toLocaleDateString('ro-RO')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2 flex-wrap justify-end">
                {/* Badge pentru sursa accesului - NOUA FUNCȚIONALITATE */}
                <Badge 
                  variant={accessConfig.variant} 
                  className={accessConfig.className}
                >
                  {accessConfig.icon}
                  {accessConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {user.subscription_type === 'entrepreneur' ? 'Antreprenor' : 
                   user.subscription_type === 'accounting_firm' ? 'Contabil' : 'Necunoscut'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={user.has_free_access ? "destructive" : "default"}
                  onClick={() => toggleFreeAccess(user.id, user.has_free_access || false)}
                >
                  {user.has_free_access ? 'Elimină Acces Gratuit' : 'Oferă Acces Gratuit'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setUserToDelete(user)}
                  disabled={deletingUserId === user.id}
                >
                  {deletingUserId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă ștergerea utilizatorului</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Ești sigur că vrei să ștergi utilizatorul:</p>
              <p className="font-semibold">{userToDelete?.full_name || 'Fără nume'}</p>
              <p className="text-sm">{userToDelete?.email}</p>
              <p className="text-destructive font-semibold mt-4">
                ⚠️ ATENȚIE: Această acțiune va șterge PERMANENT toate datele utilizatorului (analize, conversații, documente).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
      <CardHeader>
        <CardTitle>Gestiune Utilizatori</CardTitle>
        <CardDescription>
          Total: {filteredUsers.length} utilizatori ({freeAccessUsers.length} cu acces gratuit)
        </CardDescription>
        <div className="mt-3 flex gap-3">
          <Input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="Caută după email (ex: nume@domeniu.ro)"
            className="flex-1"
          />
          <Select value={accessFilter} onValueChange={(val) => setAccessFilter(val as AccessSource | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrează după acces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toți</SelectItem>
              <SelectItem value="paid">🔵 Plătit Stripe</SelectItem>
              <SelectItem value="free_access">🟢 Acces Gratuit</SelectItem>
              <SelectItem value="trial">🟠 Trial Activ</SelectItem>
              <SelectItem value="expired">🔴 Trial Expirat</SelectItem>
              <SelectItem value="none">⚪ Fără Acces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">
              Toți ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="free">
              Acces Gratuit ({freeAccessUsers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="deleted" 
              onClick={() => fetchDeletedUsers()}
              className="text-destructive"
            >
              Șterși ({filteredDeletedUsers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => copyUsersToClipboard(filteredUsers)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiază toți ({filteredUsers.length})
              </Button>
            </div>
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există utilizatori care corespund filtrelor
              </p>
            ) : (
              filteredUsers.map(renderUserCard)
            )}
          </TabsContent>
          
          <TabsContent value="free" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => copyUsersToClipboard(freeAccessUsers)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiază acces gratuit ({freeAccessUsers.length})
              </Button>
            </div>
            {freeAccessUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există utilizatori cu acces gratuit
              </p>
            ) : (
              freeAccessUsers.map(renderUserCard)
            )}
          </TabsContent>

          <TabsContent value="deleted" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex-1 mr-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Audit GDPR:</strong> Utilizatorii șterși sunt păstrați pentru conformitate legală
                </p>
              </div>
              <Button
                onClick={() => fetchDeletedUsers()}
                variant="outline"
                size="sm"
                disabled={loadingDeleted}
              >
                {loadingDeleted ? <Loader2 className="h-4 w-4 animate-spin" /> : "↻ Reîmprospătează"}
              </Button>
            </div>
            {loadingDeleted ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredDeletedUsers.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">
                  Nu există utilizatori șterși
                </p>
                <p className="text-xs text-muted-foreground">
                  Utilizatorii șterși sunt păstrați pentru audit și conformitate GDPR
                </p>
              </div>
            ) : (
              <>
                {filteredDeletedUsers.map(renderDeletedUserCard)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
      )}
    </>
  );
};
