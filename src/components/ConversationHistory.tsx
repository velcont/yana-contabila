import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Clock, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Conversation {
  conversation_id: string;
  created_at: string;
  preview: string;
  message_count: number;
}

interface ConversationHistoryProps {
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string;
}

export const ConversationHistory = ({ 
  onSelectConversation, 
  currentConversationId 
}: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversation_history')
        .select('conversation_id, created_at, content')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Grupează pe conversation_id și extrage preview
      const conversationMap = new Map<string, Conversation>();
      
      data?.forEach((msg) => {
        if (!conversationMap.has(msg.conversation_id)) {
          conversationMap.set(msg.conversation_id, {
            conversation_id: msg.conversation_id,
            created_at: msg.created_at,
            preview: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
            message_count: 1
          });
        } else {
          const conv = conversationMap.get(msg.conversation_id)!;
          conv.message_count++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca istoricul conversațiilor',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Șters cu succes',
        description: 'Conversația a fost ștearsă'
      });

      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge conversația',
        variant: 'destructive'
      });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Istoric Conversații</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută în istoric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Se încarcă...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'Nicio conversație găsită' : 'Nicio conversație încă'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`w-full justify-start text-left h-auto p-3 hover:bg-muted/50 transition-colors rounded-md flex items-center ${currentConversationId === conv.conversation_id ? 'bg-secondary' : ''}`}
                onClick={() => onSelectConversation(conv.conversation_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectConversation(conv.conversation_id); }}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium line-clamp-2">
                    {conv.preview}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(conv.created_at), 'dd MMM yyyy, HH:mm', { locale: ro })}
                    <Badge variant="outline" className="ml-auto">
                      {conv.message_count} mesaje
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-2 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => handleDeleteConversation(conv.conversation_id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};