import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, MessageSquare, Trash2, X, Settings, CreditCard, Pencil, Check, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata: { companyName?: string } | null;
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
  isMobile?: boolean;
}

export function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('yana_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      setConversations((data || []).map(c => ({
        ...c,
        metadata: c.metadata as { companyName?: string } | null,
      })));
      setLoading(false);
    };

    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('yana_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yana_conversations',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('yana_conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    setConversations(prev => prev.filter(c => c.id !== id));
    
    if (activeConversationId === id) {
      onNewConversation();
    }
  };

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    const { error } = await supabase
      .from('yana_conversations')
      .update({ title: editingTitle.trim() })
      .eq('id', id);

    if (error) {
      console.error('Error updating conversation title:', error);
    } else {
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, title: editingTitle.trim() } : c))
      );
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.metadata?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupConversations = () => {
    const groups: { [key: string]: Conversation[] } = {
      'Astăzi': [],
      'Ieri': [],
      'Săptămâna aceasta': [],
      'Luna aceasta': [],
      'Mai vechi': [],
    };

    filteredConversations.forEach(conv => {
      const date = new Date(conv.updated_at);
      
      if (isToday(date)) {
        groups['Astăzi'].push(conv);
      } else if (isYesterday(date)) {
        groups['Ieri'].push(conv);
      } else if (isThisWeek(date)) {
        groups['Săptămâna aceasta'].push(conv);
      } else if (isThisMonth(date)) {
        groups['Luna aceasta'].push(conv);
      } else {
        groups['Mai vechi'].push(conv);
      }
    });

    return groups;
  };

  const groupedConversations = groupConversations();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Conversații</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Conversație nouă
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută conversații..."
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Se încarcă...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'Nicio conversație găsită' : 'Nicio conversație încă'}
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {Object.entries(groupedConversations).map(([group, convs]) => {
              if (convs.length === 0) return null;
              
              return (
                <div key={group}>
                  <h3 className="text-xs font-medium text-muted-foreground px-3 py-2">
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {convs.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                        className={cn(
                          'w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer',
                          'hover:bg-accent/50',
                          activeConversationId === conv.id && 'bg-accent'
                        )}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          {editingId === conv.id ? (
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, conv.id)}
                              onBlur={() => saveTitle(conv.id)}
                              className="h-6 text-sm py-0 px-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-sm font-medium truncate text-foreground">
                              {conv.title}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{format(new Date(conv.updated_at), 'HH:mm', { locale: ro })}</span>
                            {editingId !== conv.id && (
                              <button
                                onClick={(e) => startEditing(conv, e)}
                                className="hover:text-foreground transition-colors p-0.5 -m-0.5 rounded"
                                title="Redenumește"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {editingId === conv.id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveTitle(conv.id);
                              }}
                            >
                              <Check className="h-3 w-3 text-green-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => deleteConversation(conv.id, e)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer with quick links */}
      <div className="p-3 border-t border-border space-y-1">
        <Link to="/ai-strategy" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Brain className="h-4 w-4" />
            Strategie AI
          </Button>
        </Link>
        <Link to="/settings" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Setări & Credite
          </Button>
        </Link>
        <Link to="/pricing" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <CreditCard className="h-4 w-4" />
            Prețuri
          </Button>
        </Link>
      </div>
    </div>
  );
}