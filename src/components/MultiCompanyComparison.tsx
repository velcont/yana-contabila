import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, type FinancialIndicators } from '@/utils/analysisParser';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Analysis {
  id: string;
  company_name?: string;
  file_name: string;
  created_at: string;
  metadata: FinancialIndicators;
}

interface MultiCompanyComparisonProps {
  analyses: Analysis[];
}

export const MultiCompanyComparison = ({ analyses }: MultiCompanyComparisonProps) => {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  // Grupează analizele pe firmă și ia cea mai recentă pentru fiecare
  const companiesMap = new Map<string, Analysis>();
  analyses.forEach(analysis => {
    const companyName = analysis.company_name || 'Firma Principală';
    const existing = companiesMap.get(companyName);
    if (!existing || new Date(analysis.created_at) > new Date(existing.created_at)) {
      companiesMap.set(companyName, analysis);
    }
  });

  const companies = Array.from(companiesMap.values());

  if (companies.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparație Multi-Firmă</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Adaugă analize pentru cel puțin 2 firme diferite pentru a vedea comparația.
          </p>
        </CardContent>
      </Card>
    );
  }

  const comparisonData = [
    {
      metric: 'Cifră Afaceri',
      ...Object.fromEntries(
        companies.map(c => [
          c.company_name || 'Firma Principală',
          c.metadata.revenue || 0
        ])
      )
    },
    {
      metric: 'Profit',
      ...Object.fromEntries(
        companies.map(c => [
          c.company_name || 'Firma Principală',
          c.metadata.profit || 0
        ])
      )
    },
    {
      metric: 'EBITDA',
      ...Object.fromEntries(
        companies.map(c => [
          c.company_name || 'Firma Principală',
          c.metadata.ebitda || 0
        ])
      )
    },
  ];

  const dsoData = companies.map(c => ({
    company: c.company_name || 'Firma Principală',
    DSO: c.metadata.dso || 0,
    DPO: c.metadata.dpo || 0,
  }));

  const calculatePerformanceScore = (indicators: FinancialIndicators): number => {
    let score = 0;
    if ((indicators.profit || 0) > 0) score += 30;
    if ((indicators.ebitda || 0) > 0) score += 20;
    if ((indicators.dso || 999) < 60) score += 25;
    if ((indicators.cashConversionCycle || 999) < 60) score += 25;
    return score;
  };

  const companiesWithScores = companies.map(c => ({
    ...c,
    score: calculatePerformanceScore(c.metadata)
  })).sort((a, b) => b.score - a.score);

  const bestPerformer = companiesWithScores[0];
  const worstPerformer = companiesWithScores[companiesWithScores.length - 1];

  return (
    <div className="space-y-6">
      {/* Performance Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Clasament Performanță Firme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {companiesWithScores.map((company, idx) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{company.company_name || 'Firma Principală'}</p>
                    <p className="text-sm text-muted-foreground">
                      Score: {company.score}/100
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <Badge variant="default" className="bg-success">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Cel mai bine
                    </Badge>
                  )}
                  {idx === companiesWithScores.length - 1 && companiesWithScores.length > 2 && (
                    <Badge variant="destructive">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Necesită atenție
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue, Profit, EBITDA Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparație Financiară</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              {companies.map((company, idx) => (
                <Bar
                  key={company.id}
                  dataKey={company.company_name || 'Firma Principală'}
                  fill={`hsl(${idx * 360 / companies.length}, 70%, 50%)`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* DSO/DPO Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparație DSO/DPO (Zile)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dsoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="company" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="DSO" fill="#f59e0b" name="DSO (Zile Încasare)" />
              <Bar dataKey="DPO" fill="#10b981" name="DPO (Zile Plată)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Optimizare:</strong> Firma cu cel mai mic DSO încasează cel mai rapid.
              Firma cu cel mai mare DPO are cele mai bune condiții de plată.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Insight-uri Cheie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-success/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-success mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Cea mai performantă firmă</p>
              <p className="text-sm text-muted-foreground">
                {bestPerformer.company_name || 'Firma Principală'} are un score de performanță de{' '}
                {bestPerformer.score}/100
              </p>
            </div>
          </div>

          {worstPerformer.id !== bestPerformer.id && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Necesită atenție</p>
                <p className="text-sm text-muted-foreground">
                  {worstPerformer.company_name || 'Firma Principală'} are un score de{' '}
                  {worstPerformer.score}/100 și ar beneficia de îmbunătățiri
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
            <Minus className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Recomandare</p>
              <p className="text-sm text-muted-foreground">
                Folosește best practices de la firma cu cel mai bun score pentru a îmbunătăți
                performanța celorlalte entități
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};