import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import type { CostEstimate, Assumptions } from '@/config/aiStrategyData';

interface CostBreakdownProps {
  costEstimates: CostEstimate[];
  assumptions: Assumptions;
}

export function CostBreakdown({ costEstimates, assumptions }: CostBreakdownProps) {
  const totalMonthly = costEstimates.reduce((sum, c) => sum + c.monthlyCostRON * c.users, 0);
  const totalSetup = costEstimates.reduce((sum, c) => sum + c.setupCostRON, 0);
  const totalTrainingHours = costEstimates.reduce((sum, c) => sum + c.trainingHours, 0);
  const totalTrainingCost = totalTrainingHours * assumptions.hourlyCost;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Costuri de Implementare</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Curs USD/RON: {assumptions.usdRonRate} | Cost orar muncă: {assumptions.hourlyCost} RON
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Costuri Lunare per Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead className="text-right">Cost/utilizator/lună</TableHead>
                <TableHead className="text-right">Utilizatori</TableHead>
                <TableHead className="text-right">Total lunar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costEstimates.map((cost, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{cost.toolName}</TableCell>
                  <TableCell className="text-right">{cost.monthlyCostRON.toLocaleString('ro-RO')} RON</TableCell>
                  <TableCell className="text-right">{cost.users}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(cost.monthlyCostRON * cost.users).toLocaleString('ro-RO')} RON
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="font-bold">Total lunar</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {totalMonthly.toLocaleString('ro-RO')} RON
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Costuri Inițiale (One-Time)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Cost (RON)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Setup & Configurare tools</TableCell>
                <TableCell className="text-right">{totalSetup.toLocaleString('ro-RO')} RON</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Training angajați ({totalTrainingHours}h × {assumptions.hourlyCost} RON/h)</TableCell>
                <TableCell className="text-right">{totalTrainingCost.toLocaleString('ro-RO')} RON</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Total investiție inițială</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {(totalSetup + totalTrainingCost).toLocaleString('ro-RO')} RON
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
