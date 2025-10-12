import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AcceptInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Token de invitație lipsă');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('accountant_invitations')
        .select('*, profiles!accountant_invitations_accountant_id_fkey(full_name)')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('Invitație invalidă sau expirată');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Invitația a expirat');
        return;
      }

      setInvitation(data);
      setFormData((prev) => ({ ...prev, email: data.client_email }));
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      setError('Eroare la încărcarea invitației');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Eroare',
        description: 'Parolele nu coincid',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Eroare',
        description: 'Parola trebuie să aibă minim 6 caractere',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAccepting(true);

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Nu s-a putut crea contul');
      }

      // Create company for the client
      const { error: companyError } = await supabase.from('companies').insert({
        user_id: authData.user.id,
        company_name: invitation.company_name,
        managed_by_accountant_id: invitation.accountant_id,
        is_own_company: false,
      });

      if (companyError) throw companyError;

      // Update invitation status
      await supabase
        .from('accountant_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      toast({
        title: 'Succes!',
        description: 'Contul tău a fost creat cu succes',
      });

      // Redirect to login
      setTimeout(() => navigate('/auth'), 2000);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut accepta invitația',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Invitație Invalidă</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Mergi la Prima Pagină
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Invitație YANA Contabilă</CardTitle>
          <CardDescription>
            Ai fost invitat de {invitation.profiles.full_name} pentru firma{' '}
            <strong>{invitation.company_name}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-sm text-center">
              Creează un cont pentru a accepta invitația și a începe să folosești YANA Contabilă
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nume Complet *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="ex: Ion Popescu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parolă *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minim 6 caractere"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă Parola *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Confirmă parola"
              />
            </div>
          </div>

          <Button
            onClick={handleAccept}
            className="w-full"
            disabled={
              accepting ||
              !formData.fullName ||
              !formData.password ||
              !formData.confirmPassword
            }
          >
            {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acceptă Invitația și Creează Cont
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Prin acceptarea invitației, ești de acord cu{' '}
            <a href="/terms" className="text-primary hover:underline">
              Termenii și Condițiile
            </a>{' '}
            YANA
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
