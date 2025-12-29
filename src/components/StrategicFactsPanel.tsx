import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  TrendingUp, 
  Building2, 
  DollarSign,
  CheckCircle2,
  Calendar,
  Briefcase,
  Pencil,
  Check,
  X
} from "lucide-react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type StrategicFact = Database['public']['Tables']['strategic_advisor_facts']['Row'];

interface StrategicFactsPanelProps {
  userId: string;
  conversationId: string;
}

export function StrategicFactsPanel({ userId, conversationId }: StrategicFactsPanelProps) {
  const [facts, setFacts] = useState<StrategicFact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Correction dialog state
  const [editingFact, setEditingFact] = useState<StrategicFact | null>(null);
  const [newValue, setNewValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFacts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('strategic-advisor-facts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategic_advisor_facts',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          loadFacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversationId]);

  const loadFacts = async () => {
    try {
      const { data, error } = await supabase
        .from('strategic_advisor_facts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'validated')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Filter out facts with 0 or null values - these are not useful to display
      const validFacts = (data || []).filter(fact => {
        const numValue = Number(fact.fact_value);
        return fact.fact_value !== null && 
               fact.fact_value !== undefined && 
               !isNaN(numValue) && 
               numValue !== 0;
      });
      
      setFacts(validFacts);
    } catch (error) {
      logger.error('❌ [FACTS-PANEL] Error loading facts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening the correction dialog
  const handleEditClick = (fact: StrategicFact) => {
    setEditingFact(fact);
    setNewValue(fact.fact_value?.toString() || "");
  };

  // Handle saving the corrected value
  const handleSaveCorrection = async () => {
    if (!editingFact || !newValue.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('strategic_advisor_facts')
        .update({
          fact_value: newValue.trim(),
          confidence: 1.0, // User confirmed = max confidence
          updated_at: new Date().toISOString()
        })
        .eq('id', editingFact.id);

      if (error) throw error;
      
      toast.success("Valoare corectată cu succes");
      setEditingFact(null);
      setNewValue("");
      loadFacts(); // Refresh
    } catch (error) {
      logger.error('❌ [FACTS-PANEL] Error saving correction:', error);
      toast.error("Eroare la salvarea corecției");
    } finally {
      setIsSaving(false);
    }
  };

  // Group facts by category
  const groupedFacts = facts.reduce((acc, fact) => {
    if (!acc[fact.fact_category]) {
      acc[fact.fact_category] = [];
    }
    acc[fact.fact_category].push(fact);
    return acc;
  }, {} as Record<string, StrategicFact[]>);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatValue = (fact: StrategicFact) => {
    if (fact.fact_unit === 'RON') {
      return formatCurrency(Number(fact.fact_value));
    }
    return `${fact.fact_value}${fact.fact_unit ? ` ${fact.fact_unit}` : ''}`;
  };

  // Get confidence indicator color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-500';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (facts.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-6 border-dashed">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Nicio dată extrasă încă. Începe conversația cu Yana Strategică pentru a extrage date financiare.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial':
      case 'financiar':
        return <DollarSign className="w-4 h-4 text-primary" />;
      case 'company':
      case 'companie':
        return <Building2 className="w-4 h-4 text-primary" />;
      case 'piata':
      case 'market':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case 'concurenta':
      case 'competition':
        return <Briefcase className="w-4 h-4 text-primary" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial': return 'Financiar';
      case 'company': return 'Companie';
      case 'market': return 'Piață';
      case 'competition': return 'Concurență';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Date Validate</h3>
            <p className="text-sm text-muted-foreground">
              {facts.length} {facts.length === 1 ? 'dată extrasă' : 'date extrase'} automat
            </p>
          </div>

          {/* Facts by Category */}
          {Object.entries(groupedFacts).map(([category, categoryFacts]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                {getCategoryIcon(category)}
                {getCategoryLabel(category)}
              </h4>
              <Card className="p-4 space-y-3">
                {categoryFacts.map((fact) => (
                  <div key={fact.id} className="flex justify-between items-start gap-3 group">
                    <span className="text-sm text-muted-foreground capitalize">
                      {fact.fact_key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-medium block">
                          {formatValue(fact)}
                        </span>
                        {/* Confidence indicator */}
                        <span className={`text-xs ${getConfidenceColor(fact.confidence)}`}>
                          {fact.confidence >= 1 ? '✓ Confirmat' : `${(fact.confidence * 100).toFixed(0)}% confidență`}
                        </span>
                      </div>
                      {/* Edit button - appears on hover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditClick(fact)}
                        title="Corectează valoarea"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}

          {/* Last Updated */}
          {facts.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ultima actualizare: {new Date(facts[0].updated_at).toLocaleString('ro-RO')}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Correction Dialog */}
      <Dialog open={!!editingFact} onOpenChange={(open) => !open && setEditingFact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Corectează valoarea</DialogTitle>
          </DialogHeader>
          {editingFact && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Câmp:</p>
                <p className="font-medium capitalize">{editingFact.fact_key.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valoare curentă:</p>
                <p className="font-medium">{formatValue(editingFact)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Valoare corectă:</p>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Introdu valoarea corectă"
                  type="text"
                />
                {editingFact.fact_unit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Unitate: {editingFact.fact_unit}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingFact(null)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              Anulează
            </Button>
            <Button
              onClick={handleSaveCorrection}
              disabled={!newValue.trim() || isSaving}
            >
              <Check className="w-4 h-4 mr-1" />
              {isSaving ? 'Se salvează...' : 'Salvează'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
