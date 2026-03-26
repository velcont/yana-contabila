import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertTriangle, FileText, Mail, Bell, ListTodo, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ActionItem {
  id: string;
  action_text: string;
  category: string;
  priority: string;
  status: string;
  deadline: string | null;
  created_at: string;
  generated_content: string | null;
}

const CATEGORY_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  document: FileText,
  reminder: Bell,
  task: ListTodo,
  negotiation: Mail,
  verification: CheckCircle2,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  medium: 'border-l-yellow-500 bg-yellow-500/5',
  low: 'border-l-blue-500 bg-blue-500/5',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'De făcut', className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  in_progress: { label: 'În lucru', className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  completed: { label: 'Făcut ✓', className: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  overdue: { label: 'Întârziat!', className: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

export function ActionItemsPanel({ onAskYana }: { onAskYana?: (msg: string) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('yana_action_items')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress', 'overdue'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setItems(data as unknown as ActionItem[]);
    }
    setLoading(false);
  };

  const markComplete = async (id: string) => {
    const { error } = await supabase
      .from('yana_action_items')
      .update({ status: 'completed', completed_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Acțiune marcată ca finalizată! 🎉');
    }
  };

  const generateContent = async (item: ActionItem) => {
    setGeneratingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-action-document', {
        body: { actionId: item.id, documentType: item.category },
      });

      if (error) throw error;

      if (data?.content) {
        setItems(prev =>
          prev.map(i =>
            i.id === item.id ? { ...i, generated_content: data.content, status: 'in_progress' } : i
          )
        );
        toast.success('Document generat de YANA! 📄');
      }
    } catch (err) {
      toast.error('Eroare la generarea documentului');
      console.error(err);
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  const activeCount = items.filter(i => i.status !== 'completed').length;
  const overdueCount = items.filter(i => i.status === 'overdue').length;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            Acțiuni de făcut
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
            {overdueCount > 0 && (
              <span className="text-xs bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full">
                {overdueCount} întârziate
              </span>
            )}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-2 pt-0">
          {items.map(item => {
            const Icon = CATEGORY_ICONS[item.category] || ListTodo;
            const priorityClass = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
            const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;

            return (
              <div
                key={item.id}
                className={cn(
                  'border-l-4 rounded-r-lg p-3 space-y-2 transition-colors',
                  priorityClass
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.action_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded', statusBadge.className)}>
                        {statusBadge.label}
                      </span>
                      {item.deadline && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.deadline).toLocaleDateString('ro-RO')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.generated_content && (
                  <div className="bg-background/50 rounded p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto border">
                    {item.generated_content}
                  </div>
                )}

                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-green-600 hover:bg-green-500/10"
                    onClick={() => markComplete(item.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Făcut
                  </Button>

                  {!item.generated_content && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-primary hover:bg-primary/10"
                      onClick={() => generateContent(item)}
                      disabled={generatingId === item.id}
                    >
                      {generatingId === item.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3 mr-1" />
                      )}
                      YANA, generează
                    </Button>
                  )}

                  {onAskYana && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => onAskYana(`Ajută-mă cu acțiunea: "${item.action_text}"`)}
                    >
                      💬 Întreabă YANA
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
