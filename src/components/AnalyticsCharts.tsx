import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, type FinancialIndicators } from '@/utils/analysisParser';

interface Analysis {
  id: string;
  company_name?: string;
  file_name: string;
  created_at: string;
  analysis_text: string;
  metadata: FinancialIndicators;
}

interface AnalyticsChartsProps {
  analyses: Analysis[];
}

const extractDateFromFilename = (filename: string): Date => {
  const months: Record<string, number> = {
    'ianuarie': 0, 'ian': 0,
    'februarie': 1, 'feb': 1,
    'martie': 2, 'mar': 2,
    'aprilie': 3, 'apr': 3,
    'mai': 4,
    'iunie': 5, 'iun': 5,
    'iulie': 6, 'iul': 6,
    'august': 7, 'aug': 7,
    'septembrie': 8, 'sep': 8, 'sept': 8,
    'octombrie': 9, 'oct': 9,
    'noiembrie': 10, 'nov': 10,
    'decembrie': 11, 'dec': 11
  };

  // Încearcă să găsească luna și anul în numele fișierului
  const lowerFilename = filename.toLowerCase();
  
  for (const [monthName, monthIndex] of Object.entries(months)) {
    if (lowerFilename.includes(monthName)) {
      // Caută anul (4 cifre)
      const yearMatch = filename.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
      
      // Setează data la ultima zi a lunii
      return new Date(year, monthIndex + 1, 0);
    }
  }
  
  // Fallback la created_at dacă nu găsește data în nume
  return new Date();
};

const AnalyticsCharts = ({ analyses }: AnalyticsChartsProps) => {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  const sortedAnalyses = [...analyses].sort((a, b) => {
    const dateA = extractDateFromFilename(a.file_name);
    const dateB = extractDateFromFilename(b.file_name);
    return dateA.getTime() - dateB.getTime();
  });

  const chartData = sortedAnalyses.map(a => {
    const balanceDate = extractDateFromFilename(a.file_name);
    return {
      date: balanceDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }),
      revenue: a.metadata.revenue || 0,
      expenses: a.metadata.expenses || 0,
      profit: a.metadata.profit || 0,
      ebitda: a.metadata.ebitda || 0,
      dso: a.metadata.dso || 0,
      dpo: a.metadata.dpo || 0,
      cashConversion: a.metadata.cashConversionCycle || 0,
    };
  });

  const latestAnalysis = sortedAnalyses[sortedAnalyses.length - 1];
  const previousAnalysis = sortedAnalyses[sortedAnalyses.length - 2];

  const calculateScore = (indicators: FinancialIndicators): number => {
    let score = 50;
    
    // Profitabilitate (30 puncte)
    if ((indicators.profit || 0) > 0) score += 15;
    if ((indicators.ebitda || 0) > 0) score += 15;
    else if ((indicators.ebitda || 0) < 0) score -= 10;
    
    // Cash Flow (25 puncte)
    const dso = indicators.dso || 0;
    if (dso < 30) score += 15;
    else if (dso < 60) score += 10;
    else if (dso > 90) score -= 10;
    
    const ccc = indicators.cashConversionCycle || 0;
    if (ccc < 30) score += 10;
    else if (ccc > 90) score -= 10;
    
    // Lichiditate (20 puncte)
    const soldBanca = indicators.soldBanca || 0;
    const revenue = indicators.revenue || 1;
    const cashRatio = soldBanca / revenue;
    if (cashRatio > 0.15) score += 20;
    else if (cashRatio > 0.05) score += 10;
    else if (cashRatio < 0.02) score -= 10;
    
    // Datorii (15 puncte)
    const soldClienti = indicators.soldClienti || 0;
    const soldFurnizori = indicators.soldFurnizori || 0;
    if (soldClienti > soldFurnizori) score += 15;
    else score -= 5;
    
    // Eficiență (10 puncte)
    const dpo = indicators.dpo || 0;
    if (dpo > 45) score += 10;
    else if (dpo < 20) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const currentScore = calculateScore(latestAnalysis.metadata);
  const previousScore = previousAnalysis ? calculateScore(previousAnalysis.metadata) : currentScore;
  const scoreDiff = currentScore - previousScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelent';
    if (score >= 60) return 'Bun';
    if (score >= 40) return 'Satisfăcător';
    return 'Critic';
  };

  return (
    <div className="space-y-6">
      {/* Financial Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Scor Sănătate Financiară</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-5xl font-bold ${getScoreColor(currentScore)}`}>
                {currentScore.toFixed(0)}/100
              </div>
              <div className="text-sm text-muted-foreground">
                {getScoreLabel(currentScore)}
              </div>
            </div>
            {previousAnalysis && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Comparație cu perioada anterioară</div>
                <div className={`text-2xl font-bold ${scoreDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {scoreDiff >= 0 ? '+' : ''}{scoreDiff.toFixed(0)} puncte
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Profitabilitate', value: (latestAnalysis.metadata.profit || 0) > 0 ? '✓' : '✗', status: (latestAnalysis.metadata.profit || 0) > 0 },
              { label: 'EBITDA Pozitiv', value: (latestAnalysis.metadata.ebitda || 0) > 0 ? '✓' : '✗', status: (latestAnalysis.metadata.ebitda || 0) > 0 },
              { label: 'DSO', value: `${formatNumber(latestAnalysis.metadata.dso || 0)} zile`, status: (latestAnalysis.metadata.dso || 0) < 60 },
              { label: 'Cash Flow', value: (latestAnalysis.metadata.soldBanca || 0) > 0 ? 'Pozitiv' : 'Negativ', status: (latestAnalysis.metadata.soldBanca || 0) > 0 },
              { label: 'Datorii', value: (latestAnalysis.metadata.soldFurnizori || 0) < (latestAnalysis.metadata.soldClienti || 0) ? 'OK' : 'Risc', status: (latestAnalysis.metadata.soldFurnizori || 0) < (latestAnalysis.metadata.soldClienti || 0) },
            ].map((item, idx) => (
              <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className={`text-sm font-semibold ${item.status ? 'text-success' : 'text-destructive'}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs Expenses Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Evoluție Venituri vs Cheltuieli</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Venituri" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" name="Cheltuieli" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--success))" name="Profit" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* DSO/DPO Timeline */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline DSO vs DPO</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={(value) => `${value} zile`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => `${formatNumber(value)} zile`}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="dso" stroke="hsl(var(--warning))" name="DSO (Zile Clienți)" strokeWidth={2} />
                <Line type="monotone" dataKey="dpo" stroke="hsl(var(--primary))" name="DPO (Zile Furnizori)" strokeWidth={2} />
                <Line type="monotone" dataKey="cashConversion" stroke="hsl(var(--destructive))" name="Cash Conversion Cycle" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsCharts;
