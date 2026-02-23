import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import type { RoadmapPhase } from '@/config/aiStrategyData';

interface ImplementationRoadmapProps {
  roadmap: RoadmapPhase[];
}

const phaseColors = ['border-l-blue-500', 'border-l-amber-500', 'border-l-green-500'];
const phaseIcons = ['🚀', '⚡', '📈'];

export function ImplementationRoadmap({ roadmap }: ImplementationRoadmapProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Plan de Implementare</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Roadmap structurat pe 6 luni, de la quick wins la optimizare și scalare.
      </p>

      <div className="space-y-4">
        {roadmap.map((phase, i) => (
          <Card key={i} className={`border-l-4 ${phaseColors[i] || 'border-l-primary'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{phaseIcons[i] || '📋'}</span>
                {phase.phase}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Acțiuni:</p>
                <ul className="space-y-1.5">
                  {phase.actions.map((action, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Tools:</span>
                {phase.tools.map((tool, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">{tool}</Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Cost estimat</p>
                  <p className="font-medium">{phase.estimatedCostRON.toLocaleString('ro-RO')} RON</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsabil</p>
                  <p className="font-medium">{phase.responsible}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rezultat așteptat</p>
                  <p className="font-medium flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> {phase.expectedResult}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
