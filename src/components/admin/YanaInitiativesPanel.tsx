import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, RefreshCw, Send, User, Calendar, MessageSquare, Sparkles, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";

interface Initiative {
  id: string;
  user_id: string;
  initiative_type: string;
  content: string;
  triggering_insight: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  priority: number;
  cancelled_reason: string | null;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export function YanaInitiativesPanel() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Manual apology generation
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [issuesDescription, setIssuesDescription] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    try {
      // Load initiatives
      const { data: initiativesData, error: initiativesError } = await supabase
        .from('yana_initiatives')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (initiativesError) throw initiativesError;

      // Load all profiles for user lookup and manual generation
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email', { ascending: true });

      if (profilesError) throw profilesError;

      setProfiles(profilesData || []);

      // Enrich initiatives with profile data
      const enrichedInitiatives = (initiativesData || []).map(initiative => {
        const profile = profilesData?.find(p => p.id === initiative.user_id);
        return {
          ...initiative,
          profiles: profile ? { email: profile.email, full_name: profile.full_name } : undefined
        };
      });

      setInitiatives(enrichedInitiatives);
    } catch (error) {
      console.error('Error loading initiatives:', error);
      toast.error('Eroare la încărcarea inițiativelor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleGenerateApology = async () => {
    if (!selectedUserId) {
      toast.error('Selectează un utilizator');
      return;
    }

    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-apology-initiative', {
        body: {
          userId: selectedUserId,
          specificIssues: issuesDescription || undefined
        }
      });

      if (error) throw error;

      toast.success(`Scuzele au fost generate și trimise către ${data.userName || 'utilizator'}!`, {
        description: data.message?.substring(0, 100) + '...'
      });

      // Reset form and refresh
      setSelectedUserId("");
      setIssuesDescription("");
      handleRefresh();
    } catch (error: any) {
      console.error('Error generating apology:', error);
      toast.error('Eroare la generarea scuzelor', {
        description: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelInitiative = async (initiativeId: string) => {
    try {
      const { error } = await supabase
        .from('yana_initiatives')
        .update({ status: 'cancelled' })
        .eq('id', initiativeId);

      if (error) throw error;

      toast.success('Inițiativa a fost anulată');
      handleRefresh();
    } catch (error: any) {
      console.error('Error cancelling initiative:', error);
      toast.error('Eroare la anularea inițiativei');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Trimis</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />În așteptare</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30"><XCircle className="h-3 w-3 mr-1" />Anulat</Badge>;
      case 'viewed':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30"><CheckCircle className="h-3 w-3 mr-1" />Vizualizat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'self_correction_apology':
        return <Badge variant="outline" className="border-pink-500/50 text-pink-700"><Heart className="h-3 w-3 mr-1" />Scuze Auto-Corecție</Badge>;
      case 'learning_share':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-700"><Sparkles className="h-3 w-3 mr-1" />Share Învățare</Badge>;
      case 'proactive_insight':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-700"><MessageSquare className="h-3 w-3 mr-1" />Insight Proactiv</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Filter initiatives
  const filteredInitiatives = initiatives.filter(initiative => {
    if (filterStatus !== 'all' && initiative.status !== filterStatus) return false;
    if (filterType !== 'all' && initiative.initiative_type !== filterType) return false;
    return true;
  });

  // Get unique types for filter
  const uniqueTypes = [...new Set(initiatives.map(i => i.initiative_type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Inițiative YANA
          </h2>
          <p className="text-muted-foreground">
            Mesaje proactive generate automat sau manual
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{initiatives.length}</div>
            <p className="text-xs text-muted-foreground">Total inițiative</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {initiatives.filter(i => i.status === 'sent').length}
            </div>
            <p className="text-xs text-muted-foreground">Trimise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {initiatives.filter(i => i.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">În așteptare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {initiatives.filter(i => i.status === 'viewed').length}
            </div>
            <p className="text-xs text-muted-foreground">Vizualizate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrează status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              <SelectItem value="sent">Trimise</SelectItem>
              <SelectItem value="pending">În așteptare</SelectItem>
              <SelectItem value="cancelled">Anulate</SelectItem>
              <SelectItem value="viewed">Vizualizate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrează tip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate tipurile</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Initiatives List */}
      <Card>
        <CardHeader>
          <CardTitle>Inițiative ({filteredInitiatives.length})</CardTitle>
          <CardDescription>
            Mesaje proactive trimise sau programate pentru utilizatori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredInitiatives.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există inițiative care să corespundă filtrelor selectate.
                </p>
              ) : (
                filteredInitiatives.map((initiative) => (
                  <Card key={initiative.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(initiative.initiative_type)}
                        {getStatusBadge(initiative.status)}
                      </div>
                      {initiative.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancelInitiative(initiative.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Anulează
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <User className="h-4 w-4" />
                      <span>{initiative.profiles?.email || 'Utilizator necunoscut'}</span>
                      {initiative.profiles?.full_name && (
                        <span>({initiative.profiles.full_name})</span>
                      )}
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg mb-3">
                      <p className="text-sm whitespace-pre-wrap">{initiative.content}</p>
                    </div>

                    {initiative.triggering_insight && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <span className="font-medium">Trigger:</span> {initiative.triggering_insight}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Creat: {format(new Date(initiative.created_at), 'dd MMM yyyy HH:mm', { locale: ro })}
                        </span>
                        {initiative.sent_at && (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            Trimis: {format(new Date(initiative.sent_at), 'dd MMM yyyy HH:mm', { locale: ro })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Manual Apology Generation */}
      <Card className="border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Generează Scuze Proactive
          </CardTitle>
          <CardDescription>
            Trimite scuze personalizate unui utilizator afectat de probleme tehnice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selectează utilizatorul</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Alege un utilizator..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.email} {profile.full_name ? `(${profile.full_name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrie problemele (opțional)</Label>
            <Textarea
              placeholder="Ex: mesaje duplicate, salutări repetitive, răspunsuri lente..."
              value={issuesDescription}
              onChange={(e) => setIssuesDescription(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Dacă nu completezi, YANA va genera un mesaj general de scuze.
            </p>
          </div>

          <Button 
            onClick={handleGenerateApology} 
            disabled={!selectedUserId || generating}
            className="w-full"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Generează și Trimite Scuze
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
