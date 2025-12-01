import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SimulationSlider } from './SimulationSlider';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WarRoomSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
  onSimulationResult: (result: string) => void;
}

interface StrategicFact {
  id: string;
  fact_key: string;
  fact_value: string;
  fact_unit: string | null;
  fact_category: string;
}

interface SimulationChange {
  key: string;
  originalValue: number;
  newValue: number;
  unit: string;
}

export const WarRoomSimulator: React.FC<WarRoomSimulatorProps> = ({
  open,
  onOpenChange,
  conversationId,
  userId,
  onSimulationResult,
}) => {
  const { toast } = useToast();
  const [facts, setFacts] = useState<StrategicFact[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [changes, setChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && conversationId) {
      fetchFacts();
    }
  }, [open, conversationId]);

  const fetchFacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategic_advisor_facts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'validated')
        .in('fact_category', ['financiar', 'operational']);

      if (error) throw error;

      // Filter numeric facts that can be simulated
      const numericFacts = data?.filter(f => {
        const value = parseFloat(f.fact_value);
        return !isNaN(value) && value > 0;
      }) || [];

      setFacts(numericFacts);
      
      // Initialize changes with current values
      const initialChanges: Record<string, number> = {};
      numericFacts.forEach(f => {
        initialChanges[f.fact_key] = parseFloat(f.fact_value);
      });
      setChanges(initialChanges);
    } catch (error) {
      console.error('Error fetching facts:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca datele pentru simulare',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'cash_crisis' | 'client_loss' | 'recession' | 'cost_inflation') => {
    const newChanges = { ...changes };

    facts.forEach(fact => {
      const originalValue = parseFloat(fact.fact_value);
      
      switch (preset) {
        case 'cash_crisis':
          if (fact.fact_key.toLowerCase().includes('casa') || fact.fact_key.toLowerCase().includes('disponibil')) {
            newChanges[fact.fact_key] = originalValue * 0.5; // -50% cash
          }
          break;
        case 'client_loss':
          if (fact.fact_key.toLowerCase().includes('venituri') || fact.fact_key.toLowerCase().includes('ca')) {
            newChanges[fact.fact_key] = originalValue * 0.7; // -30% revenue
          }
          break;
        case 'recession':
          if (fact.fact_key.toLowerCase().includes('venituri') || fact.fact_key.toLowerCase().includes('ca')) {
            newChanges[fact.fact_key] = originalValue * 0.8; // -20% revenue
          }
          if (fact.fact_key.toLowerCase().includes('cheltuieli')) {
            newChanges[fact.fact_key] = originalValue * 1.1; // +10% costs
          }
          break;
        case 'cost_inflation':
          if (fact.fact_key.toLowerCase().includes('cheltuieli')) {
            newChanges[fact.fact_key] = originalValue * 1.15; // +15% costs
          }
          break;
      }
    });

    setChanges(newChanges);
  };

  const resetChanges = () => {
    const initialChanges: Record<string, number> = {};
    facts.forEach(f => {
      initialChanges[f.fact_key] = parseFloat(f.fact_value);
    });
    setChanges(initialChanges);
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      // Calculate simulation changes
      const simulationChanges: SimulationChange[] = facts
        .filter(f => changes[f.fact_key] !== parseFloat(f.fact_value))
        .map(f => ({
          key: f.fact_key,
          originalValue: parseFloat(f.fact_value),
          newValue: changes[f.fact_key],
          unit: f.fact_unit || '',
        }));

      if (simulationChanges.length === 0) {
        toast({
          title: 'Nicio modificare',
          description: 'Ajustează valorile pentru a simula un scenariu',
          variant: 'default',
        });
        return;
      }

      // Call strategic-advisor with simulation mode
      const { data, error } = await supabase.functions.invoke('strategic-advisor', {
        body: {
          message: 'Rulează simularea cu modificările selectate',
          conversationId,
          userId,
          simulation_mode: true,
          simulation_changes: simulationChanges,
        },
      });

      if (error) throw error;

      onSimulationResult(data.response);
      onOpenChange(false);
      
      toast({
        title: '✅ Simulare completă',
        description: 'Rezultatele au fost adăugate în conversație',
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: 'Eroare simulare',
        description: error instanceof Error ? error.message : 'A apărut o eroare',
        variant: 'destructive',
      });
    } finally {
      setSimulating(false);
    }
  };

  const hasChanges = facts.some(f => changes[f.fact_key] !== parseFloat(f.fact_value));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] bg-slate-950 text-white border-slate-800 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-red-500 flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6" />
            WAR ROOM - Simulator Scenarii
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Alert Info */}
              <Alert className="bg-slate-900/50 border-slate-700">
                <AlertDescription className="text-slate-300 text-sm">
                  Ajustează variabilele pentru a simula scenarii critice. AI-ul va recalcula impactul și va oferi măsuri de urgență.
                </AlertDescription>
              </Alert>

              {/* Scenario Presets */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Scenarii Predefinite:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => applyPreset('cash_crisis')}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50"
                  >
                    🔴 Criză Cash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('client_loss')}
                    className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50"
                  >
                    ⚡ Pierdere Client
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('recession')}
                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50"
                  >
                    📉 Recesiune
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('cost_inflation')}
                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50"
                  >
                    📈 Inflație Costuri
                  </Button>
                </div>
              </div>

              {/* Dynamic Sliders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400">Variabile Simulare:</p>
                  {hasChanges && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetChanges}
                      className="text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>

                {facts.length === 0 ? (
                  <Alert className="bg-slate-900/50 border-slate-700">
                    <AlertDescription className="text-slate-400 text-sm">
                      Nu există date validate pentru simulare. Continuă conversația cu Yana pentru a colecta date financiare.
                    </AlertDescription>
                  </Alert>
                ) : (
                  facts.map(fact => (
                    <SimulationSlider
                      key={fact.id}
                      label={fact.fact_key}
                      currentValue={parseFloat(fact.fact_value)}
                      unit={fact.fact_unit || ''}
                      onChange={(value) => setChanges(prev => ({ ...prev, [fact.fact_key]: value }))}
                    />
                  ))
                )}
              </div>

              {/* Run Simulation Button */}
              <Button
                onClick={runSimulation}
                disabled={!hasChanges || simulating || facts.length === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
              >
                {simulating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Se procesează simularea...
                  </>
                ) : (
                  <>
                    🎯 RULEAZĂ SIMULAREA
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
