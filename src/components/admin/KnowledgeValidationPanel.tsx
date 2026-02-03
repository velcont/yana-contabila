import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  Eye,
  AlertOctagon,
  Gavel,
  Lock,
  Unlock,
  UserCheck
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
  credibility_tier: string;
  is_ground_truth: boolean;
}

interface SourceCredibility {
  source_type: string;
  credibility_score: number;
  description: string;
  requires_verification: boolean;
}

interface GroundTruth {
  id: string;
  category: string;
  subcategory: string;
  fact_key: string;
  fact_value: any;
  legal_source: string;
  effective_from: string;
  effective_until: string | null;
}

interface Escalation {
  id: string;
  user_id: string;
  escalation_type: string;
  severity: string;
  proposed_knowledge: any;
  ground_truth_value: any;
  clarification_requested: string;
  user_clarification: string;
  resolution_status: string;
  created_at: string;
}

export function KnowledgeValidationPanel() {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedLearning[]>([]);
  const [verifiedKnowledge, setVerifiedKnowledge] = useState<VerifiedKnowledge[]>([]);
  const [credibilityConfig, setCredibilityConfig] = useState<SourceCredibility[]>([]);
  const [groundTruth, setGroundTruth] = useState<GroundTruth[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    contradictions: 0,
    escalations: 0,
    groundTruthCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load all data in parallel
      const [flaggedRes, verifiedRes, credibilityRes, groundTruthRes, escalationsRes] = await Promise.all([
        supabase.from('yana_flagged_learnings').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('yana_verified_knowledge').select('*').order('updated_at', { ascending: false }).limit(100),
        supabase.from('yana_source_credibility').select('*').order('credibility_score', { ascending: false }),
        supabase.from('yana_ground_truth').select('*').order('category', { ascending: true }),
        supabase.from('yana_learning_escalations').select('*').order('created_at', { ascending: false }).limit(50)
      ]);
      
      setFlaggedItems(flaggedRes.data || []);
      setVerifiedKnowledge(verifiedRes.data || []);
      setCredibilityConfig(credibilityRes.data || []);
      setGroundTruth(groundTruthRes.data || []);
      setEscalations(escalationsRes.data || []);

      // Calculate stats
      const pending = flaggedRes.data?.filter(f => f.admin_decision === 'pending').length || 0;
      const approved = flaggedRes.data?.filter(f => f.admin_decision === 'approved').length || 0;
      const rejected = flaggedRes.data?.filter(f => f.admin_decision === 'rejected').length || 0;
      const contradictions = flaggedRes.data?.filter(f => f.flag_reason === 'contradiction').length || 0;
      const escalationsCount = escalationsRes.data?.filter(e => e.resolution_status === 'pending').length || 0;
      
      setStats({ 
        pending, 
        approved, 
        rejected, 
        contradictions, 
        escalations: escalationsCount,
        groundTruthCount: groundTruthRes.data?.length || 0
      });

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
        const item = flaggedItems.find(f => f.id === itemId);
        if (item?.proposed_knowledge) {
          await supabase.from('yana_verified_knowledge').upsert({
            knowledge_category: item.proposed_knowledge.category,
            knowledge_key: item.proposed_knowledge.key,
            verified_value: item.new_value,
            verified_by: 'admin',
            confidence_score: 1.0,
            credibility_tier: 'admin_overridable'
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

  async function handleEscalationResolve(escalationId: string, status: 'resolved' | 'dismissed' | 'confirmed_error') {
    try {
      const { error } = await supabase
        .from('yana_learning_escalations')
        .update({
          resolution_status: status,
          resolved_at: new Date().toISOString()
        })
        .eq('id', escalationId);

      if (error) throw error;

      toast.success(`Escalare ${status === 'resolved' ? 'rezolvată' : status === 'dismissed' ? 'respinsă' : 'confirmată ca eroare'}`);
      loadData();
    } catch (error) {
      console.error('Error resolving escalation:', error);
      toast.error('Eroare la rezolvare');
    }
  }

  function getFlagReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'contradiction': '⚠️ Contradicție',
      'low_credibility': '📉 Credibilitate scăzută',
      'rule_violation': '❌ Regulă încălcată',
      'fiscal_validation_failed': '🏛️ Validare fiscală eșuată',
      'ground_truth_violation': '🚨 Încalcă legislația',
      'admin_override_required': '👤 Necesită aprobare admin',
      'unverifiable': '❓ Neverificabil'
    };
    return labels[reason] || reason;
  }

  function getCredibilityColor(score: number): string {
    if (score >= 0.9) return 'bg-green-600';
    if (score >= 0.7) return 'bg-blue-600';
    if (score >= 0.5) return 'bg-yellow-600';
    return 'bg-red-600';
  }

  function getTierIcon(tier: string) {
    switch (tier) {
      case 'immutable': return <Lock className="h-4 w-4 text-red-500" />;
      case 'admin_overridable': return <UserCheck className="h-4 w-4 text-orange-500" />;
      default: return <Unlock className="h-4 w-4 text-green-500" />;
    }
  }

  function getTierLabel(tier: string): string {
    switch (tier) {
      case 'immutable': return 'IMUABIL';
      case 'admin_overridable': return 'Admin Only';
      default: return 'User Override';
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.escalations}</p>
                <p className="text-xs text-muted-foreground">Escalări critice</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.groundTruthCount}</p>
                <p className="text-xs text-muted-foreground">Ground Truth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.contradictions}</p>
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

      <Tabs defaultValue="escalations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="escalations" className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4" />
            🚨 Escalări ({stats.escalations})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Review ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="ground-truth" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Ground Truth
          </TabsTrigger>
          <TabsTrigger value="credibility" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Credibilitate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escalations">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertOctagon className="h-5 w-5" />
                🚨 Escalări Critice - Învățare BLOCATĂ
              </CardTitle>
              <CardDescription>
                YANA a detectat încercări de a învăța informații care contravin legislației sau regulilor imuabile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {escalations
                    .filter(e => e.resolution_status === 'pending')
                    .map(escalation => (
                      <Card key={escalation.id} className="border-red-300 bg-red-50/50 dark:bg-red-950/10">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Badge variant="destructive" className="mb-2">
                                {escalation.escalation_type.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="ml-2 mb-2">
                                Severitate: {escalation.severity}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(escalation.created_at).toLocaleString('ro-RO')}
                            </span>
                          </div>

                          {escalation.clarification_requested && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded border border-red-300 mb-4">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {escalation.clarification_requested}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200">
                              <p className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Ground Truth (IMUABIL)
                              </p>
                              <pre className="text-sm overflow-auto font-bold">
                                {JSON.stringify(escalation.ground_truth_value, null, 2)}
                              </pre>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                              <p className="text-xs text-red-600 font-medium mb-1">❌ Valoare propusă (INCORECTĂ)</p>
                              <pre className="text-sm overflow-auto">
                                {JSON.stringify(escalation.proposed_knowledge, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleEscalationResolve(escalation.id, 'resolved')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Rezolvat
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-orange-600 hover:bg-orange-50"
                              onClick={() => handleEscalationResolve(escalation.id, 'dismissed')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Respinge
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleEscalationResolve(escalation.id, 'confirmed_error')}
                            >
                              <AlertOctagon className="h-4 w-4 mr-1" />
                              Confirmă Eroare AI
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {escalations.filter(e => e.resolution_status === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>✅ Nu există escalări critice</p>
                      <p className="text-sm">Sistemul protejează cunoștințele imuabile</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Cunoștințe marcate pentru revizuire
              </CardTitle>
              <CardDescription>
                Informații non-critice care necesită verificare
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
                              <div className={`w-3 h-3 rounded-full ${getCredibilityColor(item.credibility_score)}`} />
                              <span className="text-sm">{(item.credibility_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          <div className="p-3 bg-muted rounded mb-4">
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(item.proposed_knowledge, null, 2)}
                            </pre>
                          </div>

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
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {flaggedItems.filter(item => item.admin_decision === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nu există cunoștințe în așteptare</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ground-truth">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                🏛️ Ground Truth - Legislație IMUABILĂ
              </CardTitle>
              <CardDescription>
                Baza de date cu legi și reglementări fiscale care NU POT fi modificate de utilizatori sau AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {groundTruth.map(gt => (
                    <div 
                      key={gt.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{gt.category}</Badge>
                            {gt.subcategory && <Badge variant="outline">{gt.subcategory}</Badge>}
                          </div>
                          <p className="font-medium text-sm mt-1">{gt.fact_key}</p>
                          <p className="text-lg font-bold text-primary">
                            {typeof gt.fact_value === 'object' ? JSON.stringify(gt.fact_value) : gt.fact_value}
                            {gt.fact_key.includes('cota') && '%'}
                            {gt.fact_key.includes('plafon') && gt.fact_key.includes('lei') && ' RON'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">{gt.legal_source}</p>
                        <p className="text-xs text-muted-foreground">
                          Din: {new Date(gt.effective_from).toLocaleDateString('ro-RO')}
                        </p>
                        {gt.effective_until && (
                          <p className="text-xs text-orange-600">
                            Până: {new Date(gt.effective_until).toLocaleDateString('ro-RO')}
                          </p>
                        )}
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
                      <div className={`w-4 h-4 rounded-full ${getCredibilityColor(source.credibility_score)}`} />
                      <div>
                        <p className="font-medium">{source.source_type}</p>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{(source.credibility_score * 100).toFixed(0)}%</p>
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
