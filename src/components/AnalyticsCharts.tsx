import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatCurrency, formatNumber, type FinancialIndicators } from '@/utils/analysisParser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

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
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  
  if (!analyses || analyses.length === 0) {
    return null;
  }

  const sortedAnalyses = [...analyses].sort((a, b) => {
    const dateA = extractDateFromFilename(a.file_name);
    const dateB = extractDateFromFilename(b.file_name);
    return dateA.getTime() - dateB.getTime();
  });

  // Selectează prima analiză dacă nu este selectată niciuna
  const currentAnalysisId = selectedAnalysisId || sortedAnalyses[0]?.id;
  const selectedAnalysis = sortedAnalyses.find(a => a.id === currentAnalysisId) || sortedAnalyses[0];

  if (!selectedAnalysis) {
    return null;
  }

  const balanceDate = extractDateFromFilename(selectedAnalysis.file_name);
  const formattedDate = balanceDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  // Date pentru graficele comparative
  const profitabilityData = [
    { name: 'Venituri', value: selectedAnalysis.metadata.revenue || 0, fill: 'hsl(var(--primary))' },
    { name: 'Cheltuieli', value: selectedAnalysis.metadata.expenses || 0, fill: 'hsl(var(--destructive))' },
    { name: 'Profit', value: selectedAnalysis.metadata.profit || 0, fill: 'hsl(var(--success))' },
  ];

  const cashCycleData = [
    { name: 'DSO (Zile Clienți)', value: selectedAnalysis.metadata.dso || 0, fill: 'hsl(var(--warning))' },
    { name: 'DPO (Zile Furnizori)', value: selectedAnalysis.metadata.dpo || 0, fill: 'hsl(var(--primary))' },
  ];

  const treasuryData = [
    { name: 'Cont 5121 (Banca Lei)', value: selectedAnalysis.metadata.sold5121 || 0, fill: 'hsl(var(--primary))' },
    { name: 'Cont 5124 (Banca Valută)', value: selectedAnalysis.metadata.sold5124 || 0, fill: 'hsl(var(--success))' },
  ];

  const commercialData = [
    { name: 'Furnizori (401)', value: selectedAnalysis.metadata.soldFurnizori || 0, fill: 'hsl(var(--destructive))' },
    { name: 'Clienți (4111)', value: selectedAnalysis.metadata.soldClienti || 0, fill: 'hsl(var(--success))' },
  ];

  // Găsește poziția analizei curente pentru comparație
  const currentIndex = sortedAnalyses.findIndex(a => a.id === selectedAnalysis.id);
  const previousAnalysis = currentIndex > 0 ? sortedAnalyses[currentIndex - 1] : null;

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

  const currentScore = calculateScore(selectedAnalysis.metadata);
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
      {/* Selector de Lună */}
      <Card>
        <CardHeader>
          <CardTitle>Selectează Perioada de Analiză</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={currentAnalysisId} onValueChange={setSelectedAnalysisId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selectează luna" />
            </SelectTrigger>
            <SelectContent>
              {sortedAnalyses.map((analysis) => {
                const date = extractDateFromFilename(analysis.file_name);
                const label = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
                return (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {label} - {analysis.company_name || analysis.file_name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Analiză pentru: <span className="font-semibold">{formattedDate}</span>
          </p>
        </CardContent>
      </Card>

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
              { label: 'Profitabilitate', value: (selectedAnalysis.metadata.profit || 0) > 0 ? '✓' : '✗', status: (selectedAnalysis.metadata.profit || 0) > 0 },
              { label: 'EBITDA Pozitiv', value: (selectedAnalysis.metadata.ebitda || 0) > 0 ? '✓' : '✗', status: (selectedAnalysis.metadata.ebitda || 0) > 0 },
              { label: 'DSO', value: `${formatNumber(selectedAnalysis.metadata.dso || 0)} zile`, status: (selectedAnalysis.metadata.dso || 0) < 60 },
              { label: 'Cash Flow', value: ((selectedAnalysis.metadata.sold5121 || 0) + (selectedAnalysis.metadata.sold5124 || 0)) > 0 ? 'Pozitiv' : 'Negativ', status: ((selectedAnalysis.metadata.sold5121 || 0) + (selectedAnalysis.metadata.sold5124 || 0)) > 0 },
              { label: 'Datorii', value: (selectedAnalysis.metadata.soldFurnizori || 0) < (selectedAnalysis.metadata.soldClienti || 0) ? 'OK' : 'Risc', status: (selectedAnalysis.metadata.soldFurnizori || 0) < (selectedAnalysis.metadata.soldClienti || 0) },
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

      {/* Grafic 1: Analiza Profitabilității */}
      <Card>
        <CardHeader>
          <CardTitle>Grafic 1: Analiza Profitabilității ({formattedDate})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={profitabilityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
              />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Bar dataKey="value" name="Valoare (RON)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic 2: Analiza Ciclului de Conversie a Banilor */}
      <Card>
        <CardHeader>
          <CardTitle>Grafic 2: Analiza Ciclului de Conversie a Banilor ({formattedDate})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={cashCycleData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
              />
              <YAxis tickFormatter={(value) => `${value} zile`} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => `${formatNumber(value)} zile`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Bar dataKey="value" name="Număr Zile" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic 3: Analiza Soldurilor de Trezorerie */}
      <Card>
        <CardHeader>
          <CardTitle>Grafic 3: Analiza Soldurilor de Trezorerie ({formattedDate})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={treasuryData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
              />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Bar dataKey="value" name="Valoare (RON)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafic 4: Analiza Soldurilor Comerciale */}
      <Card>
        <CardHeader>
          <CardTitle>Grafic 4: Analiza Soldurilor Comerciale ({formattedDate})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={commercialData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
              />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} className="text-xs" />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Bar dataKey="value" name="Valoare (RON)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabel 5: Sumar Indicatori Financiari */}
      <Card>
        <CardHeader>
          <CardTitle>Tabel 5: Sumar Indicatori Financiari ({formattedDate})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Indicator</th>
                  <th className="text-right py-3 px-4 font-semibold">Valoare (RON)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Venituri (Clasa 7)</td>
                  <td className="text-right py-3 px-4 font-semibold text-success">{formatCurrency(selectedAnalysis.metadata.revenue || 0)}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Cheltuieli (Clasa 6)</td>
                  <td className="text-right py-3 px-4 font-semibold text-destructive">{formatCurrency(selectedAnalysis.metadata.expenses || 0)}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50 bg-muted/30">
                  <td className="py-3 px-4 font-bold">Profit Net</td>
                  <td className={`text-right py-3 px-4 font-bold ${(selectedAnalysis.metadata.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(selectedAnalysis.metadata.profit || 0)}
                  </td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Furnizori (401)</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(selectedAnalysis.metadata.soldFurnizori || 0)}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Clienți (4111)</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(selectedAnalysis.metadata.soldClienti || 0)}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Bancă Lei (5121)</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(selectedAnalysis.metadata.sold5121 || 0)}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">Bancă Valută (5124)</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(selectedAnalysis.metadata.sold5124 || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;
