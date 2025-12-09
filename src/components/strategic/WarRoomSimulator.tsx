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

interface PresetScenario {
  name: string;
  description: string;
  changes: Array<{ key: string; multiplier: number }>;
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
  const [selectedScenario, setSelectedScenario] = useState<PresetScenario | null>(null);

  // Predefined scenarios
  const scenarios: Record<string, PresetScenario> = {
    cashCrisis: {
      name: '🔴 Criză Cash',
      description: 'Simulează scăderea cu 50% a disponibilităților și 30% a veniturilor',
      changes: [
        { key: 'cash_disponibil', multiplier: 0.5 },
        { key: 'casa', multiplier: 0.5 },
        { key: 'disponibil', multiplier: 0.5 },
        { key: 'cifra_afaceri', multiplier: 0.7 },
        { key: 'venituri', multiplier: 0.7 },
      ],
    },
    clientLoss: {
      name: '⚡ Pierdere Client',
      description: 'Simulează pierderea unui client major - scădere 30% venituri',
      changes: [
        { key: 'cifra_afaceri', multiplier: 0.7 },
        { key: 'venituri', multiplier: 0.7 },
      ],
    },
    recession: {
      name: '📉 Recesiune',
      description: 'Simulează recesiune economică - scădere 20% venituri + creștere 10% cheltuieli',
      changes: [
        { key: 'cifra_afaceri', multiplier: 0.8 },
        { key: 'venituri', multiplier: 0.8 },
        { key: 'cheltuieli', multiplier: 1.1 },
        { key: 'costuri', multiplier: 1.1 },
      ],
    },
    costInflation: {
      name: '📈 Inflație Costuri',
      description: 'Simulează inflație - creștere 15% cheltuieli operaționale',
      changes: [
        { key: 'cheltuieli', multiplier: 1.15 },
        { key: 'costuri', multiplier: 1.15 },
      ],
    },
  };

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

  const applyScenario = (scenario: PresetScenario) => {
    setSelectedScenario(scenario);
    
    // If we have facts from DB, apply multipliers to them
    if (facts.length > 0) {
      const newChanges = { ...changes };
      
      facts.forEach(fact => {
        const originalValue = parseFloat(fact.fact_value);
        const factKeyLower = fact.fact_key.toLowerCase();
        
        // Find matching change rule
        const matchingChange = scenario.changes.find(change => 
          factKeyLower.includes(change.key.toLowerCase())
        );
        
        if (matchingChange) {
          newChanges[fact.fact_key] = originalValue * matchingChange.multiplier;
        }
      });
      
      setChanges(newChanges);
    }
    
    toast({
      title: '✓ Scenariu selectat',
      description: scenario.description,
    });
  };

  const resetChanges = () => {
    const initialChanges: Record<string, number> = {};
    facts.forEach(f => {
      initialChanges[f.fact_key] = parseFloat(f.fact_value);
    });
    setChanges(initialChanges);
    setSelectedScenario(null);
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      let simulationChanges: SimulationChange[] = [];
      let simulationMessage = '';

      // Scenario 1: Using preset scenario (works even without DB facts)
      if (selectedScenario) {
        simulationMessage = `Rulează scenariul: ${selectedScenario.name}. ${selectedScenario.description}`;
        
        // If we have facts, calculate actual changes
        if (facts.length > 0) {
          simulationChanges = facts
            .filter(f => changes[f.fact_key] !== parseFloat(f.fact_value))
            .map(f => ({
              key: f.fact_key,
              originalValue: parseFloat(f.fact_value),
              newValue: changes[f.fact_key],
              unit: f.fact_unit || '',
            }));
        } else {
          // No facts - send scenario description for AI to simulate
          simulationChanges = selectedScenario.changes.map(c => ({
            key: c.key,
            originalValue: 100, // placeholder
            newValue: 100 * c.multiplier,
            unit: 'RON',
          }));
        }
      } 
      // Scenario 2: Manual slider changes (requires DB facts)
      else if (facts.length > 0) {
        simulationChanges = facts
          .filter(f => changes[f.fact_key] !== parseFloat(f.fact_value))
          .map(f => ({
            key: f.fact_key,
            originalValue: parseFloat(f.fact_value),
            newValue: changes[f.fact_key],
            unit: f.fact_unit || '',
          }));
        
        simulationMessage = 'Rulează simularea cu modificările manuale selectate';
      }

      if (simulationChanges.length === 0 && !selectedScenario) {
        toast({
          title: 'Nicio modificare',
          description: 'Selectează un scenariu sau ajustează valorile',
          variant: 'default',
        });
        return;
      }

      // Call strategic-advisor with simulation mode
      const { data, error } = await supabase.functions.invoke('strategic-advisor', {
        body: {
          message: simulationMessage,
          conversationId,
          userId,
          simulation_mode: true,
          simulation_changes: simulationChanges,
          scenario_name: selectedScenario?.name,
        },
      });

      if (error) throw error;

      onSimulationResult(data.response);
      onOpenChange(false);
      setSelectedScenario(null);
      
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
  const canSimulate = selectedScenario !== null || (hasChanges && facts.length > 0);

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => applyScenario(scenarios.cashCrisis)}
                    className={`bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 transition-all py-3 ${
                      selectedScenario?.name === scenarios.cashCrisis.name ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
                  >
                    🔴 Criză Cash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyScenario(scenarios.clientLoss)}
                    className={`bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50 transition-all py-3 ${
                      selectedScenario?.name === scenarios.clientLoss.name ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
                  >
                    ⚡ Pierdere Client
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyScenario(scenarios.recession)}
                    className={`bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 transition-all py-3 ${
                      selectedScenario?.name === scenarios.recession.name ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
                  >
                    📉 Recesiune
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyScenario(scenarios.costInflation)}
                    className={`bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50 transition-all py-3 ${
                      selectedScenario?.name === scenarios.costInflation.name ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950' : ''
                    }`}
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
                      💡 <strong>Poți folosi scenariile predefinite!</strong><br />
                      Selectează un scenariu de mai sus pentru a rula o simulare, chiar fără date validate în baza de date.
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
                disabled={!canSimulate || simulating}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 md:py-6 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
              
              {!canSimulate && !simulating && (
                <p className="text-xs text-slate-500 text-center -mt-4">
                  Selectează un scenariu sau ajustează valorile pentru a activa simularea
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
