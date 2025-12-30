import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, MessageSquare, Building2, ThumbsUp, ThumbsDown, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface MemoryStats {
  totalConversations: number;
  withCompanyId: number;
  withFeedback: number;
  positiveCount: number;
  negativeCount: number;
  companiesTracked: number;
}

interface ConversationRow {
  id: string;
  question: string;
  answer: string;
  was_helpful: boolean | null;
  created_at: string;
  company_id: string | null;
  context: unknown;
}

interface CompanyStats {
  company_id: string;
  company_name: string;
  conversation_count: number;
  positive_count: number;
}

export function MemoryDashboard() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationRow[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);

      // 1. Load basic stats
      const { data: allConv, error: convError } = await supabase
        .from('ai_conversations')
        .select('id, company_id, was_helpful');

      if (convError) throw convError;

      const conversations = allConv || [];
      const withCompany = conversations.filter(c => c.company_id !== null);
      const withFeedback = conversations.filter(c => c.was_helpful !== null);
      const positive = conversations.filter(c => c.was_helpful === true);
      const negative = conversations.filter(c => c.was_helpful === false);
      const uniqueCompanies = new Set(withCompany.map(c => c.company_id));

      setStats({
        totalConversations: conversations.length,
        withCompanyId: withCompany.length,
        withFeedback: withFeedback.length,
        positiveCount: positive.length,
        negativeCount: negative.length,
        companiesTracked: uniqueCompanies.size,
      });

      // 2. Load recent conversations
      const { data: recent, error: recentError } = await supabase
        .from('ai_conversations')
        .select('id, question, answer, was_helpful, created_at, company_id, context')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;
      setRecentConversations(recent || []);

      // 3. Load top companies (manually aggregate since we can't use GROUP BY)
      const companyMap = new Map<string, { count: number; positive: number }>();
      
      withCompany.forEach(conv => {
        if (!conv.company_id) return;
        const existing = companyMap.get(conv.company_id) || { count: 0, positive: 0 };
        existing.count += 1;
        if (conv.was_helpful === true) existing.positive += 1;
        companyMap.set(conv.company_id, existing);
      });

      // Get company names
      const companyIds = Array.from(companyMap.keys());
      let companiesWithNames: CompanyStats[] = [];

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', companyIds);

        companiesWithNames = companyIds
          .map(id => {
            const company = companies?.find(c => c.id === id);
            const stats = companyMap.get(id)!;
            return {
              company_id: id,
              company_name: company?.company_name || 'Firmă necunoscută',
              conversation_count: stats.count,
              positive_count: stats.positive,
            };
          })
          .sort((a, b) => b.conversation_count - a.conversation_count)
          .slice(0, 10);
      }

      setTopCompanies(companiesWithNames);
    } catch (error) {
      console.error('Error loading memory dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const feedbackPercentage = stats && stats.totalConversations > 0 
    ? ((stats.withFeedback / stats.totalConversations) * 100).toFixed(1)
    : '0';

  const positivePercentage = stats && stats.withFeedback > 0
    ? ((stats.positiveCount / stats.withFeedback) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">🧠 Memorie AI</h2>
            <p className="text-muted-foreground">
              Statistici și învățare din conversații
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Conversații</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalConversations || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Salvate pentru memorie AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cu Firmă Identificată</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats?.withCompanyId || 0}
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.companiesTracked || 0} firme distincte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cu Feedback</CardDescription>
            <CardTitle className="text-3xl">{feedbackPercentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.withFeedback || 0} din {stats?.totalConversations || 0}
            </p>
          </CardContent>
        </Card>

        <Card className={Number(positivePercentage) >= 70 ? 'border-green-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Feedback Pozitiv</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {positivePercentage}%
              <ThumbsUp className="h-5 w-5 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-green-500" />
                {stats?.positiveCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-red-500" />
                {stats?.negativeCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Firme cu Conversații
            </CardTitle>
            <CardDescription>
              Firme cu cele mai multe interacțiuni memorate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {topCompanies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există încă conversații cu firme identificate
                </p>
              ) : (
                <div className="space-y-3">
                  {topCompanies.map((company, index) => (
                    <div
                      key={company.company_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{company.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.conversation_count} conversații
                          </p>
                        </div>
                      </div>
                      {company.positive_count > 0 && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {company.positive_count}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversații Recente
            </CardTitle>
            <CardDescription>
              Ultimele interacțiuni salvate pentru memorie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recentConversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există conversații salvate
                </p>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">
                          {conv.question.substring(0, 100)}
                          {conv.question.length > 100 ? '...' : ''}
                        </p>
                        {conv.was_helpful !== null && (
                          conv.was_helpful ? (
                            <ThumbsUp className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <ThumbsDown className="h-4 w-4 text-red-500 shrink-0" />
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(conv.created_at), 'dd MMM HH:mm', { locale: ro })}
                        </span>
                        {conv.company_id && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            Firmă
                          </Badge>
                        )}
                        {(conv.context as any)?.route && (
                          <Badge variant="secondary" className="text-xs">
                            {(conv.context as any).route}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MemoryDashboard;
