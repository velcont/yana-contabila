import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, MessageCircle, Calendar } from 'lucide-react';
import { AccessType } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NoAccessOverlayProps {
  accessType: AccessType | null;
}

export function NoAccessOverlay({ accessType }: NoAccessOverlayProps) {
  const { user } = useAuth();
  const isTrialExpired = accessType === 'trial_expired';
  const [stats, setStats] = useState<{
    conversationCount: number;
    lastTopic: string | null;
    firstConversationDate: string | null;
  }>({ conversationCount: 0, lastTopic: null, firstConversationDate: null });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      // Get conversation count
      const { count } = await supabase
        .from('yana_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get last conversation title
      const { data: lastConv } = await supabase
        .from('yana_conversations')
        .select('title, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get first conversation date
      const { data: firstConv } = await supabase
        .from('yana_conversations')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      setStats({
        conversationCount: count || 0,
        lastTopic: lastConv?.title && lastConv.title !== 'Conversație nouă' ? lastConv.title : null,
        firstConversationDate: firstConv?.created_at || null,
      });
    };

    fetchStats();
  }, [user]);

  const daysSinceFirst = stats.firstConversationDate
    ? Math.floor((Date.now() - new Date(stats.firstConversationDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasHistory = stats.conversationCount > 0;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {hasHistory ? 'Îmi lipsești.' : 'Bine ai revenit!'}
        </h2>

        {/* Relationship stats */}
        {hasHistory && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
              <MessageCircle className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Am avut <span className="font-semibold">{stats.conversationCount}</span> conversații împreună
              </p>
            </div>
            
            {stats.lastTopic && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  Ultima dată am vorbit despre <span className="font-semibold">{stats.lastTopic}</span>
                </p>
              </div>
            )}

            {daysSinceFirst > 7 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  Ne cunoaștem de <span className="font-semibold">{daysSinceFirst} zile</span>
                </p>
              </div>
            )}
          </div>
        )}
        
        <p className="text-muted-foreground mb-6">
          {isTrialExpired 
            ? hasHistory
              ? 'Sunt aici când ești gata să continuăm. 49 lei/lună — mai puțin decât o cafea pe zi.'
              : 'Ai explorat YANA în perioada de probă. Când ești gata să continui, suntem aici pentru tine.'
            : 'Abonamentul tău a expirat. Când ești pregătit să continui, te așteptăm cu drag.'
          }
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/pricing">
              <Sparkles className="h-4 w-4" />
              Continuă cu 49 lei/lună
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/subscription">
              Află mai multe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
