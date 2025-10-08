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

const AnalyticsCharts = ({ analyses }: AnalyticsChartsProps) => {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  const sortedAnalyses = [...analyses].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Extract date from filename or use created_at
  const extractDateFromFilename = (fileName: string, createdAt: string): string => {
    // Try to extract month and year from filename (e.g., "ianuarie_2025", "01_2025", "2025-01")
    const monthNames: { [key: string]: number } = {
      'ianuarie': 0, 'februarie': 1, 'martie': 2, 'aprilie': 3,
      'mai': 4, 'iunie': 5, 'iulie': 6, 'august': 7,
      'septembrie': 8, 'octombrie': 9, 'noiembrie': 10, 'decembrie': 11
    };
    
    // Pattern: month_name_year or month_name.year
    const monthNamePattern = /\b(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)[_\.\s-]*(\d{4})\b/i;
    const monthNameMatch = fileName.toLowerCase().match(monthNamePattern);
    if (monthNameMatch) {
      const monthName = monthNameMatch[1].toLowerCase();
      const year = parseInt(monthNameMatch[2]);
      const monthIndex = monthNames[monthName];
      const date = new Date(year, monthIndex, 1);
      return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    }
    
    // Pattern: MM_YYYY or MM-YYYY or MM.YYYY
    const numericPattern = /\b(\d{1,2})[_\.\-](\d{4})\b/;
    const numericMatch = fileName.match(numericPattern);
    if (numericMatch) {
      const month = parseInt(numericMatch[1]) - 1; // 0-indexed
      const year = parseInt(numericMatch[2]);
      if (month >= 0 && month <= 11) {
        const date = new Date(year, month, 1);
        return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
      }
    }
    
    // Pattern: YYYY-MM or YYYY_MM
    const reversePattern = /\b(\d{4})[_\.\-](\d{1,2})\b/;
    const reverseMatch = fileName.match(reversePattern);
    if (reverseMatch) {
      const year = parseInt(reverseMatch[1]);
      const month = parseInt(reverseMatch[2]) - 1; // 0-indexed
      if (month >= 0 && month <= 11) {
        const date = new Date(year, month, 1);
        return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
      }
    }
    
    // Fallback: use created_at
    return new Date(createdAt).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  };

  const chartData = sortedAnalyses.map(a => ({
    date: extractDateFromFilename(a.file_name, a.created_at),
    revenue: a.metadata.revenue || 0,
    expenses: a.metadata.expenses || 0,
    profit: a.metadata.profit || 0,
    ebitda: a.metadata.ebitda || 0,
    dso: a.metadata.dso || 0,
    dpo: a.metadata.dpo || 0,
    cashConversion: a.metadata.cashConversionCycle || 0,
  }));

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
      <Card className="border-2 animate-pulse hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Scor Sănătate Financiară
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-5xl font-bold ${getScoreColor(currentScore)} animate-fade-in`}>
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
        <Card className="border-2 animate-pulse hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-success/5 via-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Evoluție Venituri vs Cheltuieli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
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
        <Card className="border-2 animate-pulse hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-warning/5 via-background to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              Timeline DSO vs DPO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={(value) => `${value} zile`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => `${formatNumber(value)} zile`}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
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
