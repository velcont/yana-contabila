import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Building2, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Briefcase
} from "lucide-react";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type StrategicFact = Database['public']['Tables']['strategic_facts']['Row'];

interface StrategicFactsPanelProps {
  userId: string;
  conversationId: string;
  onConflictClick?: (fact: StrategicFact) => void;
}

export function StrategicFactsPanel({ userId, conversationId, onConflictClick }: StrategicFactsPanelProps) {
  const [facts, setFacts] = useState<StrategicFact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('strategic-facts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategic_facts',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          logger.log('📊 [FACTS-PANEL] Realtime update:', payload);
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
        .from('strategic_facts')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setFacts(data || []);
    } catch (error) {
      logger.error('❌ [FACTS-PANEL] Error loading facts:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestFact = facts[0];
  const extractedData = (latestFact?.extracted_facts as Record<string, any>) || {};
  const conflicts = (latestFact?.conflicts as Array<{ field: string; reason: string }>) || [];
  const missingFields = (latestFact?.missing_critical_fields as string[]) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprobat
          </Badge>
        );
      case 'conflict_detected':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Conflict
          </Badge>
        );
      case 'data_missing':
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" />
            Date Incomplete
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  if (!latestFact) {
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

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Date Validate</h3>
          <p className="text-sm text-muted-foreground">
            Informații financiare extrase automat
          </p>
        </div>

        {/* Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Status Validare</span>
            {getStatusBadge(latestFact.validation_status)}
          </div>
          
          {latestFact.validation_status === 'conflict_detected' && (
            <button
              onClick={() => onConflictClick?.(latestFact)}
              className="w-full mt-2 px-3 py-2 text-sm bg-warning/10 text-warning border border-warning/20 rounded-md hover:bg-warning/20 transition-colors"
            >
              Vezi Conflicte ({conflicts.length})
            </button>
          )}
          
          {latestFact.validation_notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {latestFact.validation_notes}
            </p>
          )}
        </Card>

        <Separator />

        {/* Financial Data */}
        {Object.keys(extractedData).some(k => k.startsWith('cifra_afaceri_') || k.startsWith('profit_net_')) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Date Financiare
            </h4>
            <Card className="p-4 space-y-3">
              {Object.entries(extractedData)
                .filter(([key]) => key.startsWith('cifra_afaceri_') || key.startsWith('profit_net_'))
                .map(([key, value]) => {
                  const year = key.match(/\d{4}/)?.[0];
                  const isRevenue = key.startsWith('cifra_afaceri_');
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isRevenue ? 'Cifră Afaceri' : 'Profit Net'} {year}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  );
                })}
            </Card>
          </div>
        )}

        {/* Company Info */}
        {extractedData.nume_companie && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Date Companie
            </h4>
            <Card className="p-4 space-y-3">
              {extractedData.nume_companie && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nume</span>
                  <span className="text-sm font-medium">{extractedData.nume_companie}</span>
                </div>
              )}
              {extractedData.industrie && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Industrie</span>
                  <Badge variant="outline">{extractedData.industrie}</Badge>
                </div>
              )}
              {extractedData.ani_activitate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ani Activitate</span>
                  <span className="text-sm font-medium">{extractedData.ani_activitate}</span>
                </div>
              )}
              {extractedData.numar_angajati && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Angajați
                  </span>
                  <span className="text-sm font-medium">{extractedData.numar_angajati}</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Market Data */}
        {extractedData.dimensiune_piata_RON && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Date Piață
            </h4>
            <Card className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dimensiune Piață</span>
                <span className="text-sm font-medium">
                  {formatCurrency(Number(extractedData.dimensiune_piata_RON))}
                </span>
              </div>
              {extractedData.cota_piata_procent && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cotă Piață</span>
                  <span className="text-sm font-medium">{extractedData.cota_piata_procent}%</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Competitors */}
        {Object.keys(extractedData).some(k => k.startsWith('concurent_')) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Concurenți
            </h4>
            <Card className="p-4 space-y-2">
              {Object.entries(extractedData)
                .filter(([key]) => key.includes('_nume'))
                .map(([key, value]) => {
                  const index = key.match(/concurent_(\d+)_/)?.[1];
                  const revenueKey = `concurent_${index}_CA_RON`;
                  const revenue = extractedData[revenueKey];
                  
                  return (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="text-sm">{value as string}</span>
                      {revenue && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(Number(revenue))}
                        </span>
                      )}
                    </div>
                  );
                })}
            </Card>
          </div>
        )}

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <Card className="p-4 border-warning/20 bg-warning/5">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Date Lipsă
            </h4>
            <ul className="space-y-1">
              {missingFields.map((field, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  {field}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Actualizat: {new Date(latestFact.created_at).toLocaleString('ro-RO')}
        </div>
      </div>
    </ScrollArea>
  );
}
