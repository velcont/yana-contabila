import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings2 } from 'lucide-react';
import type { Assumptions } from '@/config/aiStrategyData';

interface AssumptionsEditorProps {
  assumptions: Assumptions;
  onChange: (updated: Assumptions) => void;
}

export function AssumptionsEditor({ assumptions, onChange }: AssumptionsEditorProps) {
  const update = (key: keyof Assumptions, value: number) => {
    onChange({ ...assumptions, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Ajustează Ipotezele
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Curs USD/RON</Label>
            <Input
              type="number"
              step={0.01}
              min={1}
              value={assumptions.usdRonRate}
              onChange={e => update('usdRonRate', parseFloat(e.target.value) || 4.97)}
            />
            <p className="text-xs text-muted-foreground">Referință: BNR, feb 2026</p>
          </div>

          <div className="space-y-2">
            <Label>Cost orar muncă (RON/h)</Label>
            <Input
              type="number"
              min={10}
              value={assumptions.hourlyCost}
              onChange={e => update('hourlyCost', parseInt(e.target.value) || 50)}
            />
          </div>

          <div className="space-y-2">
            <Label>Creștere CA estimată: {assumptions.growthPercent}%</Label>
            <Slider
              value={[assumptions.growthPercent]}
              onValueChange={([v]) => update('growthPercent', v)}
              min={1}
              max={30}
              step={1}
            />
            <p className="text-xs text-muted-foreground">Benchmark industrie aplicat</p>
          </div>

          <div className="space-y-2">
            <Label>Reducere costuri: {assumptions.costReductionPercent}%</Label>
            <Slider
              value={[assumptions.costReductionPercent]}
              onValueChange={([v]) => update('costReductionPercent', v)}
              min={1}
              max={30}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Nr. utilizatori per tool</Label>
            <Input
              type="number"
              min={1}
              value={assumptions.usersPerTool}
              onChange={e => update('usersPerTool', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
