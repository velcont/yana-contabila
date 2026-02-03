import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  BookOpen,
  Scale,
  Clock,
  Eye
} from 'lucide-react';

interface FlaggedLearning {
  id: string;
  user_id: string;
  proposed_knowledge: any;
  source_type: string;
  credibility_score: number;
  flag_reason: string;
  existing_value: any;
  new_value: any;
  admin_decision: string;
  created_at: string;
}

interface VerifiedKnowledge {
  id: string;
  knowledge_category: string;
  knowledge_key: string;
  verified_value: any;
  source_reference: string;
  confidence_score: number;
}

interface SourceCredibility {
  source_type: string;
  credibility_score: number;
  description: string;
  requires_verification: boolean;
}

export function KnowledgeValidationPanel() {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedLearning[]>([]);
  const [verifiedKnowledge, setVerifiedKnowledge] = useState<VerifiedKnowledge[]>([]);
  const [credibilityConfig, setCredibilityConfig] = useState<SourceCredibility[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    contradictions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load flagged learnings
      const { data: flagged } = await supabase
        .from('yana_flagged_learnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setFlaggedItems(flagged || []);

      // Calculate stats
      const pending = flagged?.filter(f => f.admin_decision === 'pending').length || 0;
      const approved = flagged?.filter(f => f.admin_decision === 'approved').length || 0;
      const rejected = flagged?.filter(f => f.admin_decision === 'rejected').length || 0;
      const contradictions = flagged?.filter(f => f.flag_reason === 'contradiction').length || 0;
      
      setStats({ pending, approved, rejected, contradictions });

      // Load verified knowledge
      const { data: verified } = await supabase
        .from('yana_verified_knowledge')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);
      
      setVerifiedKnowledge(verified || []);

      // Load credibility config
      const { data: credibility } = await supabase
        .from('yana_source_credibility')
        .select('*')
        .order('credibility_score', { ascending: false });
      
      setCredibilityConfig(credibility || []);

    } catch (error) {
      console.error('Error loading knowledge validation data:', error);
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(itemId: string, decision: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('yana_flagged_learnings')
        .update({
          admin_decision: decision,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      if (decision === 'approved') {
        // If approved, add to verified knowledge
        const item = flaggedItems.find(f => f.id === itemId);
        if (item?.proposed_knowledge) {
          await supabase.from('yana_verified_knowledge').upsert({
            knowledge_category: item.proposed_knowledge.category,
            knowledge_key: item.proposed_knowledge.key,
            verified_value: item.new_value,
            verified_by: 'admin',
            confidence_score: 1.0
          }, {
            onConflict: 'knowledge_category,knowledge_key'
          });
        }
      }

      toast.success(`Cunoștință ${decision === 'approved' ? 'aprobată' : 'respinsă'}`);
      loadData();
    } catch (error) {
      console.error('Error updating decision:', error);
      toast.error('Eroare la actualizare');
    }
  }

  function getFlagReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'contradiction': '⚠️ Contradicție',
      'low_credibility': '📉 Credibilitate scăzută',
      'rule_violation': '❌ Regulă încălcată',
      'fiscal_validation_failed': '🏛️ Validare fiscală eșuată',
      'unverifiable': '❓ Neverificabil'
    };
    return labels[reason] || reason;
  }

  function getCredibilityColor(score: number): string {
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.7) return 'bg-blue-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">În așteptare</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.contradictions}</p>
                <p className="text-xs text-muted-foreground">Contradicții</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Aprobate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-700">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Respinse</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Review ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Baza de cunoștințe
          </TabsTrigger>
          <TabsTrigger value="credibility" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Credibilitate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Cunoștințe marcate pentru revizuire
              </CardTitle>
              <CardDescription>
                YANA a detectat informații potențial false sau contradictorii
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {flaggedItems
                    .filter(item => item.admin_decision === 'pending')
                    .map(item => (
                      <Card key={item.id} className="border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Badge variant="outline" className="mb-2">
                                {getFlagReasonLabel(item.flag_reason)}
                              </Badge>
                              <p className="text-sm font-medium">
                                Sursa: <span className="text-muted-foreground">{item.source_type}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <div 
                                className={`w-3 h-3 rounded-full ${getCredibilityColor(item.credibility_score)}`}
                              />
                              <span className="text-sm">
                                {(item.credibility_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {item.flag_reason === 'contradiction' && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200">
                                <p className="text-xs text-green-600 font-medium mb-1">✅ Valoare verificată</p>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(item.existing_value, null, 2)}
                                </pre>
                              </div>
                              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                                <p className="text-xs text-red-600 font-medium mb-1">❌ Valoare propusă</p>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(item.new_value, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {item.flag_reason !== 'contradiction' && (
                            <div className="p-3 bg-muted rounded mb-4">
                              <p className="text-xs text-muted-foreground mb-1">Cunoștință propusă:</p>
                              <pre className="text-xs overflow-auto">
                                {JSON.stringify(item.proposed_knowledge, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleDecision(item.id, 'approved')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprobă
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDecision(item.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Respinge
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="ml-auto"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Context
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {flaggedItems.filter(item => item.admin_decision === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nu există cunoștințe marcate pentru revizuire</p>
                      <p className="text-sm">Sistemul validează automat informațiile primite</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Baza de cunoștințe verificate</CardTitle>
              <CardDescription>
                Informații validate folosite ca sursă de adevăr
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {verifiedKnowledge.map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                    >
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          {item.knowledge_category}
                        </Badge>
                        <p className="font-medium text-sm">{item.knowledge_key}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeof item.verified_value === 'object' 
                            ? JSON.stringify(item.verified_value)
                            : String(item.verified_value)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{item.source_reference}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <div 
                            className={`w-2 h-2 rounded-full ${getCredibilityColor(item.confidence_score)}`}
                          />
                          <span className="text-xs">{(item.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credibility">
          <Card>
            <CardHeader>
              <CardTitle>Configurare credibilitate surse</CardTitle>
              <CardDescription>
                Scoruri de încredere pentru diferite tipuri de surse de informații
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {credibilityConfig.map(source => (
                  <div 
                    key={source.source_type}
                    className="flex items-center justify-between p-4 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-4 h-4 rounded-full ${getCredibilityColor(source.credibility_score)}`}
                      />
                      <div>
                        <p className="font-medium">{source.source_type}</p>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {(source.credibility_score * 100).toFixed(0)}%
                      </p>
                      {source.requires_verification && (
                        <Badge variant="outline" className="text-xs">
                          Necesită verificare
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
