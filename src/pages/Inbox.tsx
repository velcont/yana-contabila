import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox as InboxIcon, Send, Search, RefreshCw, Settings, ArrowLeft, Trash2, Mail, MailOpen, Phone, PhoneIncoming, AlertTriangle, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Folder = { path: string; name: string; specialUse: string | null };
type Msg = { uid: number; subject: string; from: { name?: string; address: string } | null; date: string | null; unread: boolean };
type Call = {
  id: string;
  from_number: string;
  to_number: string;
  contact_name: string | null;
  started_at: string | null;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  summary: string | null;
  escalation_needed: boolean;
  transcript: any;
  recording_url: string | null;
};

export default function Inbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialMessageLoadedRef = useRef(false);
  const [tab, setTab] = useState<'calls' | 'email'>('calls');
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState('INBOX');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [unreadCalls, setUnreadCalls] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('user_email_accounts').select('id').eq('is_default', true).maybeSingle();
      setHasAccount(!!data);
      if (data) {
        await loadFolders();
        await loadMessages('INBOX');
      }
      await loadCalls();
    })();
    // Realtime subscription for new calls
    const channel = supabase
      .channel('samanta_calls_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'samanta_calls' }, () => {
        loadCalls();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCalls = async () => {
    setLoadingCalls(true);
    const { data, error } = await supabase
      .from('samanta_calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLoadingCalls(false);
    if (error) { toast({ title: 'Eroare la încărcare apeluri', description: error.message, variant: 'destructive' }); return; }
    const list = (data || []) as Call[];
    setCalls(list);
    setUnreadCalls(list.filter(c => c.status === 'in_progress' || c.escalation_needed).length);
  };

  const loadFolders = async () => {
    const { data, error } = await supabase.functions.invoke('email-client', { body: { action: 'list_folders' } });
    if (error || (data as any)?.error) { toast({ title: 'Eroare', description: (data as any)?.error || error?.message, variant: 'destructive' }); return; }
    setFolders((data as any).folders || []);
  };

  const loadMessages = async (f: string, q?: string) => {
    setLoadingMsgs(true);
    setFolder(f);
    setSelected(null);
    initialMessageLoadedRef.current = false;
    const { data, error } = await supabase.functions.invoke('email-client', { body: { action: 'list_messages', folder: f, limit: 30, search: q } });
    setLoadingMsgs(false);
    if (error || (data as any)?.error) { toast({ title: 'Eroare', description: (data as any)?.error || error?.message, variant: 'destructive' }); return; }
    setMessages((data as any).messages || []);
  };

  const openMessage = async (uid: number) => {
    setLoadingSelected(true);
    const { data, error } = await supabase.functions.invoke('email-client', { body: { action: 'get_message', folder, uid } });
    setLoadingSelected(false);
    if (error || (data as any)?.error) { toast({ title: 'Eroare', description: (data as any)?.error || error?.message, variant: 'destructive' }); return; }
    setSelected(data);
    setMessages((m) => m.map((x) => x.uid === uid ? { ...x, unread: false } : x));
  };

  useEffect(() => {
    if (loadingMsgs || loadingSelected || messages.length === 0 || initialMessageLoadedRef.current) return;

    initialMessageLoadedRef.current = true;
    void openMessage(messages[0].uid);
  }, [messages, loadingMsgs, loadingSelected]);

  const removeMessage = async (uid: number) => {
    const { error } = await supabase.functions.invoke('email-client', { body: { action: 'delete_message', folder, uid } });
    if (error) { toast({ title: 'Eroare', variant: 'destructive' }); return; }
    setMessages((m) => m.filter((x) => x.uid !== uid));
    setSelected(null);
    toast({ title: 'Mesaj șters' });
  };

  const send = async () => {
    if (!compose.to || !compose.subject) { toast({ title: 'Completează destinatar și subiect', variant: 'destructive' }); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('email-client', {
      body: { action: 'send_message', to: compose.to.split(',').map(s => s.trim()), subject: compose.subject, body_text: compose.body },
    });
    setSending(false);
    if (error || (data as any)?.error) { toast({ title: 'Eroare la trimitere', description: (data as any)?.error || error?.message, variant: 'destructive' }); return; }
    toast({ title: 'Email trimis ✓' });
    setComposeOpen(false);
    setCompose({ to: '', subject: '', body: '' });
  };

  if (hasAccount === null) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/yana')} className="gap-1"><ArrowLeft className="h-4 w-4" />YANA</Button>
          <h1 className="text-lg font-bold">Inbox</h1>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'email' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => loadMessages(folder, search)}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1"><Send className="h-4 w-4" />Mesaj nou</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/email-settings')}><Settings className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={loadCalls}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/samanta')}><Settings className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'calls' | 'email')} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 grid w-fit grid-cols-2">
          <TabsTrigger value="calls" className="gap-2">
            <PhoneIncoming className="h-4 w-4" />
            Apeluri Samanta
            {unreadCalls > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{unreadCalls}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* CALLS TAB */}
        <TabsContent value="calls" className="flex flex-1 overflow-hidden">
          <section className="w-full max-w-md border-r">
            <ScrollArea className="h-[calc(100vh-10rem)]">
              {loadingCalls && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              {!loadingCalls && calls.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Phone className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Niciun apel încă.
                  <div className="mt-2 text-xs">Apelurile primite de Samanta vor apărea aici.</div>
                </div>
              )}
              {calls.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCall(c)}
                  className={`flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left hover:bg-muted ${selectedCall?.id === c.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex w-full items-center gap-2">
                    {c.escalation_needed ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : c.status === 'in_progress' ? (
                      <Phone className="h-3.5 w-3.5 animate-pulse text-primary" />
                    ) : c.status === 'missed' ? (
                      <PhoneOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <PhoneIncoming className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate text-sm font-medium">{c.contact_name || c.from_number || 'Necunoscut'}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('ro-RO')}</span>
                  </div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{c.summary || c.from_number}</div>
                  {c.escalation_needed && <Badge variant="destructive" className="h-4 px-1 text-[10px]">URGENT</Badge>}
                </button>
              ))}
            </ScrollArea>
          </section>
          <section className="flex-1 overflow-auto">
            {selectedCall ? (
              <Card className="m-4 p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selectedCall.contact_name || 'Apelant necunoscut'}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">De la: <span className="font-medium">{selectedCall.from_number}</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(selectedCall.created_at).toLocaleString('ro-RO')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{selectedCall.status}</Badge>
                      {selectedCall.duration_seconds && <Badge variant="outline">{Math.floor(selectedCall.duration_seconds/60)}m {selectedCall.duration_seconds%60}s</Badge>}
                      {selectedCall.escalation_needed && <Badge variant="destructive">Necesită atenție</Badge>}
                    </div>
                  </div>
                </div>
                {selectedCall.summary && (
                  <div className="mb-4 rounded-md border bg-muted/30 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Rezumat Samanta</div>
                    <p className="text-sm">{selectedCall.summary}</p>
                  </div>
                )}
                {selectedCall.recording_url && (
                  <div className="mb-4">
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Înregistrare</div>
                    <audio controls src={selectedCall.recording_url} className="w-full" />
                  </div>
                )}
                {Array.isArray(selectedCall.transcript) && selectedCall.transcript.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Transcript</div>
                    <div className="space-y-2">
                      {selectedCall.transcript.map((t: any, i: number) => (
                        <div key={i} className={`rounded-md p-2 text-sm ${t.role === 'samanta' ? 'bg-primary/10' : 'bg-muted'}`}>
                          <div className="text-[10px] uppercase text-muted-foreground">{t.role === 'samanta' ? 'Samanta' : 'Apelant'}</div>
                          <div>{t.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Alege un apel din listă</div>
            )}
          </section>
        </TabsContent>

        {/* EMAIL TAB */}
        <TabsContent value="email" className="flex flex-1 overflow-hidden">
          {hasAccount === false ? (
            <div className="container mx-auto max-w-xl px-4 py-16 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-bold">Niciun cont email configurat</h2>
              <p className="mt-2 text-sm text-muted-foreground">Configurează contul tău IMAP/SMTP pentru a folosi email-ul.</p>
              <Button className="mt-6" onClick={() => navigate('/email-settings')}><Settings className="mr-2 h-4 w-4" />Configurează</Button>
            </div>
          ) : (
          <div className="flex flex-1 overflow-hidden">
        {/* Folders */}
        <aside className="hidden w-48 border-r md:block">
          <ScrollArea className="h-full p-2">
            {folders.length === 0 && <div className="p-2 text-xs text-muted-foreground">Se încarcă...</div>}
            {folders.map((f) => (
              <button
                key={f.path}
                onClick={() => loadMessages(f.path)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${folder === f.path ? 'bg-muted font-semibold' : ''}`}
              >
                <InboxIcon className="h-3.5 w-3.5" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </ScrollArea>
        </aside>

        {/* Messages list */}
        <section className="w-full max-w-md border-r">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Caută..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadMessages(folder, search)} className="pl-8" />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            {loadingMsgs && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {!loadingMsgs && messages.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Niciun mesaj</div>}
            {messages.map((m) => (
              <button
                key={m.uid}
                onClick={() => openMessage(m.uid)}
                className={`flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left hover:bg-muted ${selected?.uid === m.uid ? 'bg-muted' : ''}`}
              >
                <div className="flex w-full items-center gap-2">
                  {m.unread ? <Mail className="h-3.5 w-3.5 text-primary" /> : <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={`flex-1 truncate text-sm ${m.unread ? 'font-semibold' : ''}`}>{m.from?.name || m.from?.address || 'Necunoscut'}</span>
                  <span className="text-xs text-muted-foreground">{m.date ? new Date(m.date).toLocaleDateString('ro-RO') : ''}</span>
                </div>
                <div className="line-clamp-1 text-xs text-muted-foreground">{m.subject}</div>
              </button>
            ))}
          </ScrollArea>
        </section>

        {/* Preview */}
        <section className="flex-1 overflow-auto">
          {loadingSelected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se încarcă mesajul...
            </div>
          ) : selected ? (
            <Card className="m-4 p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selected.subject}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">De la: <span className="font-medium">{selected.from?.name || selected.from?.address}</span> {selected.from?.address && `<${selected.from.address}>`}</p>
                  <p className="text-xs text-muted-foreground">{selected.date && new Date(selected.date).toLocaleString('ro-RO')}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeMessage(selected.uid)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-sm">
                {selected.body_raw}
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Alege un mesaj din listă</div>
          )}
        </section>
          </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Compose */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Mesaj nou</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Către (separați cu virgulă)</Label><Input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} /></div>
            <div><Label>Subiect</Label><Input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} /></div>
            <div><Label>Mesaj</Label><Textarea rows={10} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>Anulează</Button>
            <Button onClick={send} disabled={sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Send className="mr-2 h-4 w-4" />Trimite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}