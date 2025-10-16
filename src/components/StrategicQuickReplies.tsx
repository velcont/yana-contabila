import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Target, Users, Lightbulb, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface QuickReply {
  text: string;
  category: string;
  icon: any;
}

const defaultReplies: QuickReply[] = [
  {
    text: "Care sunt principalii mei competitori și cum pot să-i depășesc?",
    category: "competitive",
    icon: Users
  },
  {
    text: "Cum pot să-mi cresc profitabilitatea cu 30% în 6 luni?",
    category: "growth",
    icon: TrendingUp
  },
  {
    text: "Ce strategie de pricing ar trebui să adoptăm pentru piața românească?",
    category: "pricing",
    icon: DollarSign
  },
  {
    text: "Cum pot să intru pe o piață nouă fără să risc prea mult?",
    category: "expansion",
    icon: Target
  },
  {
    text: "Ce produse/servicii noi ar avea cel mai mare impact?",
    category: "innovation",
    icon: Lightbulb
  }
];

interface StrategicQuickRepliesProps {
  onSelect: (text: string) => void;
  conversationId: string;
}

export const StrategicQuickReplies = ({ onSelect, conversationId }: StrategicQuickRepliesProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<QuickReply[]>(defaultReplies);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadContextualReplies();
  }, [user, conversationId]);

  const loadContextualReplies = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's conversation history
      const { data: history, error: historyError } = await supabase
        .from('conversation_history')
        .select('content, metadata')
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      // Get saved strategies
      const { data: strategies, error: strategiesError } = await supabase
        .from('saved_strategies')
        .select('category, title, tags')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (strategiesError) throw strategiesError;

      // Build contextual suggestions based on history
      if (history && history.length > 0) {
        const contextualReplies: QuickReply[] = [];

        // Analyze recent conversations for patterns
        const recentTopics = new Set<string>();
        history.forEach(msg => {
          const content = msg.content.toLowerCase();
          if (content.includes('competitor') || content.includes('competiție')) {
            recentTopics.add('competitive');
          }
          if (content.includes('pricing') || content.includes('preț')) {
            recentTopics.add('pricing');
          }
          if (content.includes('growth') || content.includes('creștere')) {
            recentTopics.add('growth');
          }
          if (content.includes('market') || content.includes('piață')) {
            recentTopics.add('expansion');
          }
        });

        // Add follow-up questions based on topics
        if (recentTopics.has('competitive')) {
          contextualReplies.push({
            text: "Care sunt următorii pași pentru a implementa strategia competitivă?",
            category: "follow-up",
            icon: Target
          });
        }

        if (recentTopics.has('pricing')) {
          contextualReplies.push({
            text: "Cum pot testa noua strategie de pricing fără să pierd clienți?",
            category: "follow-up",
            icon: DollarSign
          });
        }

        // Add strategy-related questions
        if (strategies && strategies.length > 0) {
          const categories = new Set(strategies.map(s => s.category));
          if (categories.has('marketing')) {
            contextualReplies.push({
              text: "Cum pot scala strategia de marketing actuală?",
              category: "follow-up",
              icon: TrendingUp
            });
          }
        }

        // Mix contextual with default
        if (contextualReplies.length > 0) {
          const mixed = [...contextualReplies, ...defaultReplies.slice(0, 3)];
          setReplies(mixed.slice(0, 5));
        }
      }
    } catch (error) {
      console.error("Error loading contextual replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Sugestii Rapide</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {replies.map((reply, idx) => {
            const Icon = reply.icon;
            return (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => onSelect(reply.text)}
                className="text-left justify-start h-auto py-2 px-3 hover:bg-primary/10 hover:border-primary/50 transition-all"
                disabled={isLoading}
              >
                <Icon className="w-3 h-3 mr-2 shrink-0" />
                <span className="text-xs">{reply.text}</span>
              </Button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            💡 Bazat pe conversațiile tale anterioare
          </Badge>
        </div>
      </div>
    </Card>
  );
};