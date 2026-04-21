import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, Trash2, FileText, Loader2, Sparkles, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YanaGeneratedAgentsPanel } from './YanaGeneratedAgentsPanel';
import { Bot } from 'lucide-react';

interface MemoryRecord {
  id: string;
  memory_type: string;
  content: string;
  relevance_score: number | null;
  access_count: number | null;
  created_at: string | null;
  last_accessed_at: string | null;
  source_conversation_id: string | null;
}

export function YanaMemoryInsights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const { data: semanticMemories, isLoading: loadingSemantic } = useQuery({
    queryKey: ['yana-memories-semantic', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yana_semantic_memory')
        .select('*')
        .eq('user_id', user!.id)
        .eq('memory_type', 'semantic')
        .order('relevance_score', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as MemoryRecord[];
    },
    enabled: !!user?.id,
  });

  const { data: episodicMemories, isLoading: loadingEpisodic } = useQuery({
    queryKey: ['yana-memories-episodic', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yana_semantic_memory')
        .select('*')
        .eq('user_id', user!.id)
        .eq('memory_type', 'episodic')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as MemoryRecord[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from('yana_semantic_memory')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yana-memories-semantic'] });
      queryClient.invalidateQueries({ queryKey: ['yana-memories-episodic'] });
      toast({ title: 'Memorie ștearsă', description: 'Faptul a fost eliminat din memoria YANA.' });
    },
    onError: () => {
      toast({ title: 'Eroare', description: 'Nu am putut șterge memoria.', variant: 'destructive' });
    },
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-memory-report');
      if (error) throw error;
      setReport(data?.report || 'Nu s-a putut genera raportul.');
      toast({ title: 'Raport generat!', description: 'Sinteza memoriilor tale este gata.' });
    } catch (err) {
      toast({ title: 'Eroare', description: 'Nu am putut genera raportul.', variant: 'destructive' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const totalMemories = (semanticMemories?.length || 0) + (episodicMemories?.length || 0);
  const semanticCount = semanticMemories?.length || 0;
  const episodicCount = episodicMemories?.length || 0;
  const isLoading = loadingSemantic || loadingEpisodic;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const MemoryCard = ({ memory }: { memory: MemoryRecord }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{memory.content}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(memory.created_at)}
          </span>
          {memory.relevance_score != null && (
            <Badge variant="secondary" className="text-xs">
              Relevanță: {Math.round(memory.relevance_score * 100)}%
            </Badge>
          )}
          {memory.access_count != null && memory.access_count > 0 && (
            <Badge variant="outline" className="text-xs">
              Accesat de {memory.access_count}×
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={() => deleteMutation.mutate(memory.id)}
        disabled={deleteMutation.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Ce a învățat YANA despre tine
            </CardTitle>
            <CardDescription className="mt-1">
              Faptele și cunoștințele pe care YANA le-a memorat din conversațiile tale
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateReport}
            disabled={generatingReport || totalMemories === 0}
            className="gap-2"
          >
            {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generează raport
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5 border">
            <p className="text-2xl font-bold text-primary">{totalMemories}</p>
            <p className="text-xs text-muted-foreground">Memorii totale</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5 border">
            <p className="text-2xl font-bold text-primary">{semanticCount}</p>
            <p className="text-xs text-muted-foreground">Cunoștințe (semantic)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5 border">
            <p className="text-2xl font-bold text-primary">{episodicCount}</p>
            <p className="text-xs text-muted-foreground">Fapte recente (episodic)</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalMemories === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">YANA nu a memorat încă nimic</p>
            <p className="text-sm mt-1">Discută cu YANA și ea va învăța automat fapte despre afacerea ta.</p>
          </div>
        ) : (
          <Tabs defaultValue="semantic">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="semantic" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Cunoștințe ({semanticCount})
              </TabsTrigger>
              <TabsTrigger value="episodic" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Fapte recente ({episodicCount})
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Agenți
              </TabsTrigger>
            </TabsList>
            <TabsContent value="semantic" className="space-y-2 mt-3">
              {semanticMemories?.map((m) => <MemoryCard key={m.id} memory={m} />)}
              {semanticCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nicio cunoștință generalizată încă. Faptele episodice se promovează automat după 3+ apariții.
                </p>
              )}
            </TabsContent>
            <TabsContent value="episodic" className="space-y-2 mt-3">
              {episodicMemories?.map((m) => <MemoryCard key={m.id} memory={m} />)}
              {episodicCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Niciun fapt episodic recent.
                </p>
              )}
            </TabsContent>
            <TabsContent value="agents" className="space-y-2 mt-3">
              <YanaGeneratedAgentsPanel />
            </TabsContent>
          </Tabs>
        )}

        {/* Report display */}
        {report && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Raport sinteză memorii
            </h4>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{report}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
