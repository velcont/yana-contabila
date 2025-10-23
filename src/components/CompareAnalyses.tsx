import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { parseAnalysisText, formatCurrency, formatNumber, type FinancialIndicators } from '@/utils/analysisParser';

interface Analysis {
  id: string;
  company_name?: string;
  file_name: string;
  created_at: string;
  analysis_text: string;
  metadata: FinancialIndicators;
}

interface CompareAnalysesProps {
  analyses: Analysis[];
}

const CompareAnalyses = ({ analyses }: CompareAnalysesProps) => {
  const [period1, setPeriod1] = useState<string>('');
  const [period2, setPeriod2] = useState<string>('');
  const calculateDiff = (val1: number, val2: number) => {
    // Return null ONLY if values are missing (undefined/null), NOT if they're 0
    if (val1 === undefined || val1 === null || val2 === undefined || val2 === null) return null;
    if (val1 === 0) return null; // Can't calculate % change from 0
    return ((val2 - val1) / val1) * 100;
  };

  const renderDiffBadge = (diff: number | null) => {
    if (diff === null) return <Badge variant="outline" className="gap-1 text-muted-foreground">N/A</Badge>;
    if (Math.abs(diff) < 1) return <Badge variant="outline" className="gap-1"><Minus className="h-3 w-3" />{diff.toFixed(1)}%</Badge>;
    if (diff > 0) return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><TrendingUp className="h-3 w-3" />+{diff.toFixed(1)}%</Badge>;
    return <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" />{diff.toFixed(1)}%</Badge>;
  };

  // Helpers to robustly read values from metadata regardless of key naming/format
  const parseNumeric = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      let s = val.trim().replace(/[^0-9.,-]/g, ''); // keep digits, dot, comma, minus
      if (!s) return null;
      if (s.includes(',') && s.includes('.')) {
        // Romanian style: . thousands, , decimals
        s = s.replace(/\./g, '').replace(/,/g, '.');
      } else if (s.includes(',') && !s.includes('.')) {
        s = s.replace(/,/g, '.');
      }
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    }
    return null;
  };

  const keyMap: Record<string, string[]> = {
    revenue: ['revenue', 'ca', 'cifraAfaceri', 'cifra_afaceri'],
    expenses: ['expenses', 'cheltuieli'],
    profit: ['profit', 'profitNet', 'profit_net', 'rezultat'],
    ebitda: ['ebitda'],
    dso: ['dso', 'daysSalesOutstanding'],
    dpo: ['dpo', 'daysPayableOutstanding'],
    cashConversionCycle: ['cashConversionCycle', 'ccc', 'cash_conversion_cycle'],
    soldBanca: ['soldBanca', 'banca', 'sold_banca', '5121', '5124', '5125'],
    soldClienti: ['soldClienti', 'clienti', 'sold_clienti', '4111'],
    soldFurnizori: ['soldFurnizori', 'furnizori', 'sold_furnizori', '401'],
  };

  const getMetricValue = (meta: any, primaryKey: string): number | null => {
    const keys = keyMap[primaryKey] || [primaryKey];
    for (const k of keys) {
      const num = parseNumeric(meta?.[k]);
      if (num !== null) return num;
    }
    return null;
  };

  const getValueForAnalysis = (analysis: Analysis, primaryKey: string): number | null => {
    const metaVal = getMetricValue(analysis.metadata as any, primaryKey);
    if (metaVal !== null && metaVal !== 0) return metaVal;
    // Fallback: parse from analysis text
    const parsed = parseAnalysisText(analysis.analysis_text || '');
    const parsedVal = getMetricValue(parsed as any, primaryKey);
    if (parsedVal !== null && parsedVal !== 0) return parsedVal;
    // If parsed gives >0 but meta is 0, prefer parsed
    if ((metaVal === 0 || metaVal === null) && parsedVal !== null) return parsedVal;
    return metaVal;
  };
  const metrics = [
    { label: 'Cifră Afaceri', key: 'revenue', formatter: formatCurrency, goodDirection: 'up' },
    { label: 'Cheltuieli', key: 'expenses', formatter: formatCurrency, goodDirection: 'down' },
    { label: 'Profit Net', key: 'profit', formatter: formatCurrency, goodDirection: 'up' },
    { label: 'EBITDA', key: 'ebitda', formatter: formatCurrency, goodDirection: 'up' },
    { label: 'DSO (zile)', key: 'dso', formatter: formatNumber, goodDirection: 'down' },
    { label: 'DPO (zile)', key: 'dpo', formatter: formatNumber, goodDirection: 'up' },
    { label: 'Cash Conversion', key: 'cashConversionCycle', formatter: (v: number) => `${formatNumber(v)} zile`, goodDirection: 'down' },
    { label: 'Sold Bancă', key: 'soldBanca', formatter: formatCurrency, goodDirection: 'up' },
    { label: 'Creanțe Clienți', key: 'soldClienti', formatter: formatCurrency, goodDirection: 'down' },
    { label: 'Datorii Furnizori', key: 'soldFurnizori', formatter: formatCurrency, goodDirection: 'down' },
  ];

  // Build a list of analyses that actually have usable numbers (metadata or parsed)
  const keysToCheck = ['revenue','expenses','profit','ebitda','dso','dpo','cashConversionCycle','soldBanca','soldClienti','soldFurnizori'];
  const validAnalyses = analyses.filter((a) =>
    keysToCheck.some(k => {
      const v = getValueForAnalysis(a as any, k);
      return v !== null && !Number.isNaN(v) && Math.abs(v) > 0;
    })
  );

  const analysis1 = validAnalyses.find(a => a.id === period1);
  const analysis2 = validAnalyses.find(a => a.id === period2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparație Perioade</CardTitle>
        <CardDescription>Compară indicatorii financiari între 2 perioade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Perioada 1</label>
            <Select value={period1} onValueChange={setPeriod1}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează perioada" />
              </SelectTrigger>
              <SelectContent>
                {validAnalyses.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.file_name} ({new Date(a.created_at).toLocaleDateString('ro-RO')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Perioada 2</label>
            <Select value={period2} onValueChange={setPeriod2}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează perioada" />
              </SelectTrigger>
              <SelectContent>
                {validAnalyses.map(a => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === period1}>
                    {a.file_name} ({new Date(a.created_at).toLocaleDateString('ro-RO')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {analysis1 && analysis2 && (
          <>
            {/* Warning if metadata is incomplete */}
            {(Object.keys(analysis1.metadata).length < 3 || Object.keys(analysis2.metadata).length < 3) && (
              <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-warning">
                  ⚠️ Atenție: Una sau ambele analize nu conțin date numerice complete.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reîncarcă balanțele după actualizarea sistemului pentru a avea toate indicatorii disponibili.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 pb-2 border-b font-medium text-sm">
              <div>Indicator</div>
              <div className="text-right">Perioada 1</div>
              <div className="text-right">Perioada 2</div>
              <div className="text-right">Diferență</div>
            </div>

            {metrics.map(metric => {
              const val1 = getValueForAnalysis(analysis1, metric.key);
              const val2 = getValueForAnalysis(analysis2, metric.key);
              const diff = val1 !== null && val2 !== null ? calculateDiff(val1, val2) : null;

              return (
                <div key={metric.key} className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-muted/50 rounded px-2">
                  <div className="font-medium text-sm">{metric.label}</div>
                  <div className="text-right text-sm text-muted-foreground">
                    {val1 !== undefined && val1 !== null ? metric.formatter(val1) : 'N/A'}
                  </div>
                  <div className="text-right text-sm font-medium">
                    {val2 !== undefined && val2 !== null ? metric.formatter(val2) : 'N/A'}
                  </div>
                  <div className="text-right">{renderDiffBadge(diff)}</div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {(!analysis1 || !analysis2) && (
          <div className="text-center py-12 text-muted-foreground">
            Selectează ambele perioade pentru a vizualiza comparația
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompareAnalyses;
