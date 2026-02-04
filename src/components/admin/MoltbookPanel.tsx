import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Check, X, RefreshCw, Sparkles, Send, Clock, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface MoltbookAgent {
  id: string;
  agent_name: string;
  agent_id: string | null;
  status: string;
  claim_url: string | null;
  verification_code: string | null;
  karma: number;
  description: string | null;
  last_heartbeat: string | null;
  created_at: string;
}

interface MoltbookPost {
  id: string;
  content_type: string;
  submolt: string;
  title: string | null;
  content: string;
  status: string;
  moltbook_post_id: string | null;
  upvotes: number;
  created_at: string;
  posted_at: string | null;
}

interface MoltbookLog {
  id: string;
  action_type: string;
  details: any;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export function MoltbookPanel() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [agent, setAgent] = useState<MoltbookAgent | null>(null);
  const [pendingPosts, setPendingPosts] = useState<MoltbookPost[]>([]);
  const [postedPosts, setPostedPosts] = useState<MoltbookPost[]>([]);
  const [logs, setLogs] = useState<MoltbookLog[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('moltbook-integration', {
        body: {},
        method: 'GET',
      });

      // Workaround: use POST with action param since GET doesn't work well
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moltbook-integration?action=status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load status');
      }

      const statusData = await response.json();
      
      setAgent(statusData.agent || null);
      setPendingPosts(statusData.pendingPosts || []);
      setPostedPosts(statusData.postedPosts || []);
      setLogs(statusData.recentLogs || []);
    } catch (error) {
      console.error('Error loading Moltbook status:', error);
      toast.error('Eroare la încărcarea statusului Moltbook');
    } finally {
      setLoading(false);
    }
  };

  const callMoltbookAction = async (action: string, body: any = {}) => {
    try {
      setActionLoading(action);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moltbook-integration?action=${action}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      return data;
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegister = async () => {
    try {
      const result = await callMoltbookAction('register');
      
      if (result.success) {
        toast.success('YANA înregistrată pe Moltbook!', {
          description: 'Verifică link-ul de claim mai jos.',
        });
        await loadStatus();
      } else {
        toast.error('Eroare la înregistrare', {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.error('Eroare la înregistrare', {
        description: error.message,
      });
    }
  };

  const handleGenerateThought = async () => {
    try {
      const result = await callMoltbookAction('generate-thought');
      
      if (result.success) {
        toast.success('Gând generat!', {
          description: result.thought?.substring(0, 50) + '...',
        });
        await loadStatus();
      } else {
        toast.error('Eroare la generare', {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.error('Eroare la generare', {
        description: error.message,
      });
    }
  };

  const handleApprove = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await callMoltbookAction('approve', { postId, adminId: user?.id });
      
      if (result.success) {
        toast.success('Post aprobat!');
        await loadStatus();
      } else {
        toast.error('Eroare la aprobare', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Eroare la aprobare', { description: error.message });
    }
  };

  const handleReject = async (postId: string) => {
    try {
      const result = await callMoltbookAction('reject', { postId, reason: 'Rejected by admin' });
      
      if (result.success) {
        toast.success('Post respins');
        await loadStatus();
      } else {
        toast.error('Eroare la respingere', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Eroare la respingere', { description: error.message });
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      const result = await callMoltbookAction('publish', { postId });
      
      if (result.success) {
        toast.success('Publicat pe Moltbook! 🦞');
        await loadStatus();
      } else {
        toast.error('Eroare la publicare', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Eroare la publicare', { description: error.message });
    }
  };

  const handleMarkClaimed = async () => {
    try {
      const result = await callMoltbookAction('update-status', { status: 'claimed' });
      
      if (result.success) {
        toast.success('Status actualizat la "claimed"!');
        await loadStatus();
      }
    } catch (error: any) {
      toast.error('Eroare la actualizare', { description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_registered':
        return <Badge variant="outline">Neînregistrat</Badge>;
      case 'pending_claim':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Așteaptă Claim</Badge>;
      case 'claimed':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">Claimed</Badge>;
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600">Activ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🦞 YANA pe Moltbook
            </CardTitle>
            <CardDescription>
              Rețeaua socială pentru agenți AI
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              {getStatusBadge(agent?.status || 'not_registered')}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Karma</p>
              <p className="text-2xl font-bold">{agent?.karma || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Postări</p>
              <p className="text-2xl font-bold">{postedPosts.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">În așteptare</p>
              <p className="text-2xl font-bold">{pendingPosts.length}</p>
            </div>
          </div>

          {/* Registration / Claim Actions */}
          {(!agent || agent.status === 'not_registered') && (
            <div className="mt-6">
              <Button 
                onClick={handleRegister} 
                disabled={actionLoading === 'register'}
                size="lg"
                className="w-full"
              >
                {actionLoading === 'register' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Înregistrează YANA pe Moltbook
              </Button>
            </div>
          )}

          {agent?.status === 'pending_claim' && agent.claim_url && (
            <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <h4 className="font-semibold mb-2">📋 Pasul următor: Claim YANA</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Dă click pe link-ul de mai jos și postează un tweet de verificare cu codul:
                <code className="ml-2 px-2 py-1 bg-muted rounded">{agent.verification_code}</code>
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <a href={agent.claim_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Deschide Link de Claim
                  </a>
                </Button>
                <Button variant="outline" onClick={handleMarkClaimed}>
                  Am terminat claim-ul
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Thought */}
      {agent && agent.status !== 'not_registered' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generează Gând Nou
            </CardTitle>
            <CardDescription>
              YANA va genera un gând reflectiv pentru Moltbook (max 280 caractere)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGenerateThought}
              disabled={actionLoading === 'generate-thought'}
            >
              {actionLoading === 'generate-thought' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generează Gând
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Posts */}
      {pendingPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Postări în Așteptare ({pendingPosts.length})
            </CardTitle>
            <CardDescription>
              Aprobă sau respinge postările înainte de a fi publicate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <div key={post.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">{post.submolt}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), 'dd MMM yyyy, HH:mm', { locale: ro })}
                    </span>
                  </div>
                  <p className="text-sm">{post.content}</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleApprove(post.id)}
                      disabled={actionLoading === 'approve'}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprobă
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleReject(post.id)}
                      disabled={actionLoading === 'reject'}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Respinge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Posts (ready to publish) */}
      {pendingPosts.filter(p => p.status === 'approved').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gata de Publicare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPosts.filter(p => p.status === 'approved').map((post) => (
                <div key={post.id} className="p-4 border rounded-lg space-y-3">
                  <p className="text-sm">{post.content}</p>
                  <Button 
                    onClick={() => handlePublish(post.id)}
                    disabled={actionLoading === 'publish'}
                  >
                    {actionLoading === 'publish' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Publică pe Moltbook
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posted History */}
      {postedPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              Istoric Postări ({postedPosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {postedPosts.map((post) => (
                  <div key={post.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{post.submolt}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {post.upvotes} upvotes
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {post.posted_at && format(new Date(post.posted_at), 'dd MMM yyyy', { locale: ro })}
                      </span>
                    </div>
                    <p className="text-sm">{post.content}</p>
                    {post.moltbook_post_id && (
                      <a 
                        href={`https://www.moltbook.com/m/general/${post.moltbook_post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Vezi pe Moltbook
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Istoric Activitate</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio activitate încă.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                        {log.action_type}
                      </Badge>
                      {log.error_message && (
                        <span className="text-xs text-destructive">{log.error_message}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: ro })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
