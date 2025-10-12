import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast as sonnerToast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string | null;
  subscription_type: string | null;
  created_at: string;
  has_free_access: boolean | null;
  trial_ends_at: string | null;
}

export const UsersList = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const entrepreneurs = users.filter(u => u.subscription_type === 'entrepreneur');
  const accountants = users.filter(u => u.subscription_type === 'accounting_firm');
  const freeAccessUsers = users.filter(u => u.has_free_access);

  const renderUserCard = (user: Profile) => {
    const isInTrial = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
    const trialExpired = user.trial_ends_at && new Date(user.trial_ends_at) <= new Date();
    
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
              {isInTrial && (
                <p className="text-xs text-orange-600 mt-1">
                  Testare până: {new Date(user.trial_ends_at!).toLocaleDateString('ro-RO')}
                </p>
              )}
              {trialExpired && !user.has_free_access && user.subscription_status !== 'active' && (
                <p className="text-xs text-red-600 mt-1">
                  Testare expirată: {new Date(user.trial_ends_at!).toLocaleDateString('ro-RO')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                  {user.subscription_status === 'active' ? 'Activ' : 'Inactiv'}
                </Badge>
                {user.has_free_access && (
                  <Badge variant="default" className="bg-green-600">
                    <Crown className="h-3 w-3 mr-1" />
                    Gratuit
                  </Badge>
                )}
                {isInTrial && !user.has_free_access && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Testare
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant={user.has_free_access ? "destructive" : "default"}
                onClick={() => toggleFreeAccess(user.id, user.has_free_access || false)}
              >
                {user.has_free_access ? 'Elimină Acces Gratuit' : 'Oferă Acces Gratuit'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
      <CardHeader>
        <CardTitle>Gestiune Utilizatori</CardTitle>
        <CardDescription>
          Total: {users.length} utilizatori ({entrepreneurs.length} antreprenori, {accountants.length} contabili, {freeAccessUsers.length} cu acces gratuit)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">
              Toți ({users.length})
            </TabsTrigger>
            <TabsTrigger value="entrepreneurs">
              Antreprenori ({entrepreneurs.length})
            </TabsTrigger>
            <TabsTrigger value="accountants">
              Contabili ({accountants.length})
            </TabsTrigger>
            <TabsTrigger value="free">
              Acces Gratuit ({freeAccessUsers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => copyUsersToClipboard(users)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiază toți ({users.length})
              </Button>
            </div>
            {users.map(renderUserCard)}
          </TabsContent>
          
          <TabsContent value="entrepreneurs" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => copyUsersToClipboard(entrepreneurs)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiază antreprenori ({entrepreneurs.length})
              </Button>
            </div>
            {entrepreneurs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există antreprenori înregistrați
              </p>
            ) : (
              entrepreneurs.map(renderUserCard)
            )}
          </TabsContent>
          
          <TabsContent value="accountants" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => copyUsersToClipboard(accountants)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiază contabili ({accountants.length})
              </Button>
            </div>
            {accountants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există contabili înregistrați
              </p>
            ) : (
              accountants.map(renderUserCard)
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
        </Tabs>
      </CardContent>
    </Card>
      )}
    </>
  );
};
