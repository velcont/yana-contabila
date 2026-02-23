import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Calculator } from 'lucide-react';
import type { CostEstimate, Assumptions, AIOpportunity } from '@/config/aiStrategyData';

interface ROIProjectionsProps {
  costEstimates: CostEstimate[];
  opportunities: AIOpportunity[];
  assumptions: Assumptions;
  annualRevenue: number;
}

export function ROIProjections({ costEstimates, opportunities, assumptions, annualRevenue }: ROIProjectionsProps) {
  const totalMonthly = costEstimates.reduce((sum, c) => sum + c.monthlyCostRON * c.users, 0);
  const totalSetup = costEstimates.reduce((sum, c) => sum + c.setupCostRON, 0);
  const totalTrainingCost = costEstimates.reduce((sum, c) => sum + c.trainingHours, 0) * assumptions.hourlyCost;
  const totalTimeSavingsHours = opportunities.reduce((sum, o) => sum + o.timeSavingsHoursMonth, 0);
  const monthlyTimeSavingsRON = totalTimeSavingsHours * assumptions.hourlyCost;
  const monthlyCostReduction = (annualRevenue / 12) * (assumptions.costReductionPercent / 100) * 0.3;
  const monthlyRevenueGrowth = (annualRevenue / 12) * (assumptions.growthPercent / 100) * 0.15;

  const periods = [
    { label: '6 luni', months: 6 },
    { label: '12 luni', months: 12 },
    { label: '24 luni', months: 24 },
  ];

  const projections = periods.map(({ label, months }) => {
    const rampUp = months <= 6 ? 0.5 : months <= 12 ? 0.75 : 1;
    const totalBenefits = (monthlyTimeSavingsRON + monthlyCostReduction + monthlyRevenueGrowth) * months * rampUp;
    const totalCosts = totalSetup + totalTrainingCost + totalMonthly * months;
    const roi = totalCosts > 0 ? ((totalBenefits - totalCosts) / totalCosts) * 100 : 0;
    const paybackMonths = monthlyTimeSavingsRON + monthlyCostReduction + monthlyRevenueGrowth > 0
      ? (totalSetup + totalTrainingCost) / (monthlyTimeSavingsRON + monthlyCostReduction + monthlyRevenueGrowth - totalMonthly)
      : Infinity;

    return {
      label,
      months,
      timeSavingsRON: monthlyTimeSavingsRON * months * rampUp,
      revenueGrowthRON: monthlyRevenueGrowth * months * rampUp,
      costReductionRON: monthlyCostReduction * months * rampUp,
      totalBenefits,
      totalCosts,
      netBenefit: totalBenefits - totalCosts,
      roi,
      paybackMonths: paybackMonths > 0 && paybackMonths < Infinity ? Math.ceil(paybackMonths) : null,
    };
  });

  const fmt = (n: number) => Math.round(n).toLocaleString('ro-RO');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Previziuni ROI</h3>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Proiecții Financiare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicator</TableHead>
                {projections.map(p => (
                  <TableHead key={p.label} className="text-right">{p.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">Economie timp ({totalTimeSavingsHours}h/lună)</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className="text-right text-green-600">+{fmt(p.timeSavingsRON)} RON</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Creștere CA estimată ({assumptions.growthPercent}%)</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className="text-right text-green-600">+{fmt(p.revenueGrowthRON)} RON</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Reducere costuri ({assumptions.costReductionPercent}%)</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className="text-right text-green-600">+{fmt(p.costReductionRON)} RON</TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-green-50 dark:bg-green-900/10">
                <TableCell className="font-medium">Total beneficii</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className="text-right font-bold text-green-600">
                    {fmt(p.totalBenefits)} RON
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-destructive">Total costuri</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className="text-right font-medium text-destructive">
                    -{fmt(p.totalCosts)} RON
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Beneficiu net</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className={`text-right font-bold ${p.netBenefit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {p.netBenefit >= 0 ? '+' : ''}{fmt(p.netBenefit)} RON
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">ROI</TableCell>
                {projections.map(p => (
                  <TableCell key={p.label} className={`text-right font-bold ${p.roi >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {p.roi >= 0 ? '+' : ''}{Math.round(p.roi)}%
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {projections[0].paybackMonths && (
        <p className="text-sm text-muted-foreground">
          📊 <strong>Perioada de recuperare estimată:</strong> ~{projections[0].paybackMonths} luni
        </p>
      )}

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Formule utilizate:</strong><br />
            • Economie timp = Ore salvate/lună × Cost orar ({assumptions.hourlyCost} RON)<br />
            • Creștere CA = CA lunară × {assumptions.growthPercent}% × factor ramp-up (50% în primele 6 luni)<br />
            • Reducere costuri = CA lunară × {assumptions.costReductionPercent}% × 30% (factor conservator)<br />
            • ROI = (Beneficii - Costuri) / Costuri × 100
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
