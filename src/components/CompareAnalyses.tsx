import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  id: string;
  created_at: string;
  company_name: string | null;
  file_name: string;
  metadata: any;
}

export const CompareAnalyses = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analysis1, setAnalysis1] = useState<string>('');
  const [analysis2, setAnalysis2] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Încarcă analizele disponibile
  const loadAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setAnalyses(data);
    } catch (error) {
      console.error('Eroare încărcare analize:', error);
    }
  };

  // Compară 2 analize
  const compareAnalyses = async () => {
    if (!analysis1 || !analysis2) {
      toast({
        title: 'Selectează 2 analize',
        description: 'Trebuie să selectezi ambele analize pentru comparație',
        variant: 'destructive'
      });
      return;
    }

    if (analysis1 === analysis2) {
      toast({
        title: 'Analize identice',
        description: 'Selectează 2 analize diferite',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const a1 = analyses.find(a => a.id === analysis1);
      const a2 = analyses.find(a => a.id === analysis2);

      if (!a1 || !a2) throw new Error('Analize negăsite');

      // Extrage indicatori din metadata
      const extractIndicators = (metadata: any) => ({
        dso: metadata?.dso || 0,
        dpo: metadata?.dpo || 0,
        ca: metadata?.ca || 0,
        profit: metadata?.profit || 0,
        cheltuieli: metadata?.cheltuieli || 0,
        ebitda: metadata?.ebitda || 0,
      });

      const ind1 = extractIndicators(a1.metadata);
      const ind2 = extractIndicators(a2.metadata);

      // Calculează diferențe și trend-uri
      const compareValues = (val1: number, val2: number, betterWhen: 'higher' | 'lower' = 'higher') => {
        const diff = val2 - val1;
        const percentChange = val1 !== 0 ? ((diff / val1) * 100) : 0;
        const trend = diff === 0 ? 'same' : (diff > 0 ? 'up' : 'down');
        const isBetter = betterWhen === 'higher' 
          ? trend === 'up' 
          : (trend === 'down' || trend === 'same');

        return { val1, val2, diff, percentChange, trend, isBetter };
      };

      const comparisonData = {
        date1: new Date(a1.created_at).toLocaleDateString('ro-RO'),
        date2: new Date(a2.created_at).toLocaleDateString('ro-RO'),
        name1: a1.file_name,
        name2: a2.file_name,
        indicators: {
          dso: compareValues(ind1.dso, ind2.dso, 'lower'),
          dpo: compareValues(ind1.dpo, ind2.dpo, 'higher'),
          ca: compareValues(ind1.ca, ind2.ca, 'higher'),
          profit: compareValues(ind1.profit, ind2.profit, 'higher'),
          cheltuieli: compareValues(ind1.cheltuieli, ind2.cheltuieli, 'lower'),
          ebitda: compareValues(ind1.ebitda, ind2.ebitda, 'higher'),
        }
      };

      setComparison(comparisonData);
    } catch (error) {
      console.error('Eroare comparație:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut realiza comparația',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string, isBetter: boolean) => {
    if (trend === 'same') return <Minus className="h-4 w-4 text-muted-foreground" />;
    const Icon = trend === 'up' ? TrendingUp : TrendingDown;
    const color = isBetter ? 'text-green-500' : 'text-red-500';
    return <Icon className={`h-4 w-4 ${color}`} />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Compară Analize Side-by-Side
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selecție analize */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prima Analiză</label>
            <Select value={analysis1} onValueChange={setAnalysis1} onOpenChange={() => loadAnalyses()}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează analiza 1" />
              </SelectTrigger>
              <SelectContent>
                {analyses.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {new Date(a.created_at).toLocaleDateString('ro-RO')} - {a.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">A Doua Analiză</label>
            <Select value={analysis2} onValueChange={setAnalysis2} onOpenChange={() => loadAnalyses()}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează analiza 2" />
              </SelectTrigger>
              <SelectContent>
                {analyses.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {new Date(a.created_at).toLocaleDateString('ro-RO')} - {a.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={compareAnalyses} 
          disabled={isLoading || !analysis1 || !analysis2}
          className="w-full"
        >
          {isLoading ? 'Comparare...' : 'Compară Analizele'}
        </Button>

        {/* Rezultate comparație */}
        {comparison && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground border-b pb-2">
              <div>{comparison.date1}</div>
              <div>{comparison.date2}</div>
            </div>

            {Object.entries(comparison.indicators).map(([key, data]: [string, any]) => (
              <div key={key} className="grid grid-cols-2 gap-4 items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">{key}</div>
                  <div className="font-semibold">{data.val1.toLocaleString('ro-RO')}</div>
                </div>
                
                <div>
                  <div className="font-semibold">{data.val2.toLocaleString('ro-RO')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon(data.trend, data.isBetter)}
                    <span className={`text-xs ${data.isBetter ? 'text-green-600' : 'text-red-600'}`}>
                      {data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
