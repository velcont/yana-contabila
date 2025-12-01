import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Download } from 'lucide-react';
import { generateStrategicBattlePlan } from '@/utils/generateStrategicBattlePlan';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BattlePlanExportProps {
  conversationId: string;
  userId: string;
}

interface FactPreview {
  fact_key: string;
  fact_value: string;
  fact_unit: string | null;
}

export const BattlePlanExport: React.FC<BattlePlanExportProps> = ({
  conversationId,
  userId,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    facts: FactPreview[];
    companyName: string;
    factsCount: number;
  } | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data: facts, error } = await supabase
        .from('strategic_advisor_facts')
        .select('fact_key, fact_value, fact_unit')
        .eq('conversation_id', conversationId)
        .eq('status', 'validated')
        .limit(5);

      if (error) throw error;

      const { count } = await supabase
        .from('strategic_advisor_facts')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('status', 'validated');

      const companyFact = facts?.find(f => 
        f.fact_key.toLowerCase().includes('companie') || 
        f.fact_key.toLowerCase().includes('firma')
      );

      setPreview({
        facts: facts || [],
        companyName: companyFact?.fact_value || 'Compania Ta',
        factsCount: count || 0,
      });
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca previzualizarea',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all validated facts
      const { data: facts, error: factsError } = await supabase
        .from('strategic_advisor_facts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'validated');

      if (factsError) throw factsError;

      if (!facts || facts.length === 0) {
        toast({
          title: 'Date insuficiente',
          description: 'Nu există date validate pentru a genera raportul. Continuă conversația cu Yana.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch last strategy from conversation
      const { data: history, error: historyError } = await supabase
        .from('conversation_history')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1);

      if (historyError) throw historyError;

      const lastStrategy = history?.[0]?.content || 'Nu există strategie generată încă.';

      // Extract company name
      const companyFact = facts.find(f => 
        f.fact_key.toLowerCase().includes('companie') || 
        f.fact_key.toLowerCase().includes('firma')
      );
      const companyName = companyFact?.fact_value || 'Compania Ta';

      // Generate PDF
      await generateStrategicBattlePlan({
        facts,
        lastStrategy,
        companyName,
        date: new Date().toLocaleDateString('ro-RO'),
      });

      toast({
        title: '✅ Battle Plan generat!',
        description: 'Documentul PDF a fost descărcat cu succes',
      });

      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Eroare la export',
        description: error instanceof Error ? error.message : 'A apărut o eroare',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen && !preview) {
        loadPreview();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-green-500/50 text-green-600 hover:bg-green-500/10">
          <FileText className="w-4 h-4" />
          Generează Battle Plan
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            📋 BATTLE PLAN - Plan de Execuție 90 Zile
          </DialogTitle>
          <DialogDescription>
            Document strategic confidențial pentru implementarea rapidă
          </DialogDescription>
        </DialogHeader>

        {loading && !preview ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Companie:</strong> {preview.companyName}
                <br />
                <strong>Date validate:</strong> {preview.factsCount} indicatori
                <br />
                <strong>Structură document:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Verificare Sănătate Financiară</li>
                  <li>Vulnerabilități Critice</li>
                  <li>Plan de Execuție 90 Zile (Checklist)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {preview.facts.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-3">Preview Date Financiare (primii 5):</p>
                  <div className="space-y-2">
                    {preview.facts.map((fact, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span className="font-medium">{fact.fact_key}</span>
                        <span className="text-muted-foreground">
                          {fact.fact_value} {fact.fact_unit || ''}
                        </span>
                      </div>
                    ))}
                    {preview.factsCount > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ... și încă {preview.factsCount - 5} indicatori
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anulează
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={loading || !preview}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se generează...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descarcă PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
