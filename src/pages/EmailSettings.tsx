import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function EmailSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email_address: '',
    display_name: '',
    username: '',
    password: '',
    imap_host: 'mail.velcont.com',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: 'mail.velcont.com',
    smtp_port: 465,
    smtp_use_ssl: true,
    signature: '',
  });
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('user_email_accounts')
        .select('email_address, display_name, username, imap_host, imap_port, imap_use_ssl, smtp_host, smtp_port, smtp_use_ssl, signature')
        .eq('is_default', true)
        .maybeSingle();
      if (data) {
        setHasAccount(true);
        setForm((f) => ({ ...f, ...data, password: '' }));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!form.email_address || !form.username || !form.password) {
      toast({ title: 'Date incomplete', description: 'Email, user și parolă sunt obligatorii.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-client', {
        body: { action: 'save_account', ...form },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Cont salvat', description: 'Conexiunea IMAP/SMTP a fost validată cu succes.' });
      setHasAccount(true);
      setForm((f) => ({ ...f, password: '' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Conexiune eșuată';
      toast({ title: 'Eroare conexiune', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate('/yana')} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Înapoi la YANA
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Mail className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">Setări Email</h1>
          <p className="text-sm text-muted-foreground">Conectează contul tău IMAP/SMTP — YANA îl va folosi pentru a citi și trimite mailuri.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cont email</CardTitle>
          <CardDescription>Datele tale rămân criptate în baza de date (AES-GCM, cheie pe server).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Adresă email</Label>
              <Input value={form.email_address} onChange={(e) => setForm({ ...form, email_address: e.target.value })} placeholder="office@velcont.com" />
            </div>
            <div>
              <Label>Nume afișat</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Velcont Office" />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="office@velcont.com" />
            </div>
            <div>
              <Label>Parolă {hasAccount && <span className="text-xs text-muted-foreground">(lasă gol pentru a o păstra)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div className="sm:col-span-3 text-sm font-medium">IMAP (primire)</div>
            <div><Label>Host</Label><Input value={form.imap_host} onChange={(e) => setForm({ ...form, imap_host: e.target.value })} /></div>
            <div><Label>Port</Label><Input type="number" value={form.imap_port} onChange={(e) => setForm({ ...form, imap_port: parseInt(e.target.value || '993') })} /></div>
            <div className="flex items-end gap-2"><Switch checked={form.imap_use_ssl} onCheckedChange={(v) => setForm({ ...form, imap_use_ssl: v })} /><Label>SSL/TLS</Label></div>
          </div>

          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div className="sm:col-span-3 text-sm font-medium">SMTP (trimitere)</div>
            <div><Label>Host</Label><Input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} /></div>
            <div><Label>Port</Label><Input type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value || '465') })} /></div>
            <div className="flex items-end gap-2"><Switch checked={form.smtp_use_ssl} onCheckedChange={(v) => setForm({ ...form, smtp_use_ssl: v })} /><Label>SSL/TLS</Label></div>
          </div>

          <div>
            <Label>Semnătură</Label>
            <Textarea value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} rows={3} placeholder="--\nNumele tău\nFirma" />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-green-600" /> Parola e criptată AES-GCM înainte de a fi salvată.</div>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Testează & Salvează</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}