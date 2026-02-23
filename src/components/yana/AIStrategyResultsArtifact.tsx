import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Download, Brain, TrendingUp, DollarSign, Map, Settings2, Sparkles } from 'lucide-react';
import type { AIAnalysis, BusinessProfile, Assumptions, AIOpportunity, CostEstimate } from '@/config/aiStrategyData';
import { DEFAULT_ASSUMPTIONS } from '@/config/aiStrategyData';
import { generateAIStrategyPDF } from '@/utils/generateAIStrategyPDF';

interface AIStrategyResultsArtifactProps {
  analysis: AIAnalysis;
  profile: BusinessProfile;
}

export function AIStrategyResultsArtifact({ analysis, profile }: AIStrategyResultsArtifactProps) {
  const [assumptions, setAssumptions] = useState<Assumptions>({
    ...DEFAULT_ASSUMPTIONS,
    growthPercent: analysis.industryBenchmarks?.growthEstimate || DEFAULT_ASSUMPTIONS.growthPercent,
    costReductionPercent: analysis.industryBenchmarks?.costReduction || DEFAULT_ASSUMPTIONS.costReductionPercent,
  });

  const roi = useMemo(() => {
    const totalTimeSavings = analysis.opportunities.reduce((s, o) => s + o.timeSavingsHoursMonth, 0);
    const totalMonthly = analysis.costEstimates.reduce((s, c) => s + c.monthlyCostRON * (assumptions.usersPerTool || c.users), 0);
    const totalSetup = analysis.costEstimates.reduce((s, c) => s + c.setupCostRON, 0);

    const monthlyBenefits = totalTimeSavings * assumptions.hourlyCost +
      (profile.annualRevenue / 12) * (assumptions.growthPercent / 100) * 0.15 +
      (profile.annualRevenue / 12) * (assumptions.costReductionPercent / 100) * 0.3;

    return [6, 12, 24].map(m => {
      const ramp = m <= 6 ? 0.5 : m <= 12 ? 0.75 : 1;
      const benefits = monthlyBenefits * m * ramp;
      const costs = totalSetup + totalMonthly * m;
      const roiPct = costs > 0 ? ((benefits - costs) / costs * 100) : 0;
      return { months: m, benefits: Math.round(benefits), costs: Math.round(costs), net: Math.round(benefits - costs), roi: Math.round(roiPct) };
    });
  }, [analysis, profile, assumptions]);

  const handleDownloadPDF = () => {
    generateAIStrategyPDF(profile, analysis, assumptions);
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'destructive';
    if (p === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <Card className="bg-background/80 border-primary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Strategie AI — Rezultate
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="opportunities" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-auto flex-wrap">
            <TabsTrigger value="opportunities" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Brain className="h-3.5 w-3.5 mr-1" /> Oportunități
            </TabsTrigger>
            <TabsTrigger value="costs" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <DollarSign className="h-3.5 w-3.5 mr-1" /> Costuri
            </TabsTrigger>
            <TabsTrigger value="roi" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> ROI
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Map className="h-3.5 w-3.5 mr-1" /> Roadmap
            </TabsTrigger>
            <TabsTrigger value="assumptions" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Ipoteze
            </TabsTrigger>
          </TabsList>

          {/* Opportunities */}
          <TabsContent value="opportunities" className="p-4 space-y-3 mt-0">
            {analysis.opportunities.map((o: AIOpportunity, i: number) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium">{o.title}</h4>
                  <Badge variant={priorityColor(o.priority)} className="text-[10px] shrink-0">{o.priority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{o.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Impact: <strong>{o.impact}/10</strong></span>
                  <span>Economie: <strong>{o.timeSavingsHoursMonth}h/lună</strong></span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${o.impact * 10}%` }} />
                </div>
                {o.recommendedTools?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {o.recommendedTools.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Costs */}
          <TabsContent value="costs" className="p-4 mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tool</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Cost/user/lună</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Utilizatori</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Total lunar</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.costEstimates.map((c: CostEstimate, i: number) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 px-2">{c.toolName}</td>
                      <td className="text-right py-2 px-2">{c.monthlyCostRON.toLocaleString('ro-RO')} RON</td>
                      <td className="text-right py-2 px-2">{c.users}</td>
                      <td className="text-right py-2 px-2 font-medium">{(c.monthlyCostRON * c.users).toLocaleString('ro-RO')} RON</td>
                      <td className="text-right py-2 px-2">{c.setupCostRON.toLocaleString('ro-RO')} RON</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2">
                    <td className="py-2 px-2">TOTAL</td>
                    <td></td>
                    <td></td>
                    <td className="text-right py-2 px-2 text-primary">
                      {analysis.costEstimates.reduce((s, c) => s + c.monthlyCostRON * c.users, 0).toLocaleString('ro-RO')} RON
                    </td>
                    <td className="text-right py-2 px-2">
                      {analysis.costEstimates.reduce((s, c) => s + c.setupCostRON, 0).toLocaleString('ro-RO')} RON
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Curs: 1 USD = {assumptions.usdRonRate} RON</p>
          </TabsContent>

          {/* ROI */}
          <TabsContent value="roi" className="p-4 mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Perioadă</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Beneficii</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Costuri</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Net</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {roi.map(r => (
                    <tr key={r.months} className="border-b border-border/30">
                      <td className="py-2 px-2">{r.months} luni</td>
                      <td className="text-right py-2 px-2 text-green-600">{r.benefits.toLocaleString('ro-RO')} RON</td>
                      <td className="text-right py-2 px-2 text-red-500">{r.costs.toLocaleString('ro-RO')} RON</td>
                      <td className="text-right py-2 px-2 font-medium">{r.net.toLocaleString('ro-RO')} RON</td>
                      <td className="text-right py-2 px-2 font-bold text-primary">{r.roi}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Formule: Beneficii = (ore economisite × {assumptions.hourlyCost} RON/h) + (CA/12 × {assumptions.growthPercent}% × 0.15) + (CA/12 × {assumptions.costReductionPercent}% × 0.3). 
              Ramp-up: 50% (luni 1-6), 75% (7-12), 100% (13+).
            </p>
          </TabsContent>

          {/* Roadmap */}
          <TabsContent value="roadmap" className="p-4 space-y-4 mt-0">
            {analysis.roadmap.map((phase, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-primary/30">
                <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary" />
                <h4 className="text-sm font-medium mb-1">{phase.phase}</h4>
                <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                  {phase.actions.map((a, j) => <li key={j}>• {a}</li>)}
                </ul>
                <div className="flex flex-wrap gap-1 mb-1">
                  {phase.tools.map((t, j) => <Badge key={j} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost: <strong>{phase.estimatedCostRON.toLocaleString('ro-RO')} RON</strong> · {phase.responsible} · {phase.expectedResult}
                </p>
              </div>
            ))}
          </TabsContent>

          {/* Assumptions */}
          <TabsContent value="assumptions" className="p-4 space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Curs USD/RON</Label>
                <Input type="number" step={0.01} min={1} className="h-9 text-xs"
                  value={assumptions.usdRonRate}
                  onChange={e => setAssumptions(a => ({ ...a, usdRonRate: parseFloat(e.target.value) || 4.97 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost orar muncă (RON/h)</Label>
                <Input type="number" min={10} className="h-9 text-xs"
                  value={assumptions.hourlyCost}
                  onChange={e => setAssumptions(a => ({ ...a, hourlyCost: parseInt(e.target.value) || 50 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Creștere CA: {assumptions.growthPercent}%</Label>
                <Slider value={[assumptions.growthPercent]} onValueChange={([v]) => setAssumptions(a => ({ ...a, growthPercent: v }))} min={1} max={30} step={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reducere costuri: {assumptions.costReductionPercent}%</Label>
                <Slider value={[assumptions.costReductionPercent]} onValueChange={([v]) => setAssumptions(a => ({ ...a, costReductionPercent: v }))} min={1} max={30} step={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nr. utilizatori per tool</Label>
                <Input type="number" min={1} className="h-9 text-xs"
                  value={assumptions.usersPerTool}
                  onChange={e => setAssumptions(a => ({ ...a, usersPerTool: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Modificarea ipotezelor recalculează automat tab-ul ROI.</p>
            
            <Button onClick={handleDownloadPDF} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Descarcă Raport PDF
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
