import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react';

interface MicroVsProfitCalculatorProps {
  onClose?: () => void;
}

export const MicroVsProfitCalculator = ({ onClose }: MicroVsProfitCalculatorProps) => {
  const [ca, setCa] = useState<string>('500000');
  const [profit, setProfit] = useState<string>('100000');
  const [showResults, setShowResults] = useState(false);

  const calculateMicro = (cifraAfaceri: number) => {
    // Microîntreprindere: 1% CA (sau 3% dacă nu ai angajați cu CIM)
    const impozit1 = cifraAfaceri * 0.01;
    const impozit3 = cifraAfaceri * 0.03;
    
    return { 
      impozit1, 
      impozit3,
      pragCA: 500000, // Prag 2025: 500k EUR
      eligible: cifraAfaceri <= 500000 
    };
  };

  const calculateProfit = (profitNet: number) => {
    // Impozit pe profit: 16% din profitul net
    const impozit = profitNet * 0.16;
    
    return { impozit };
  };

  const cifraAfaceri = parseFloat(ca) || 0;
  const profitNet = parseFloat(profit) || 0;
  const microResult = calculateMicro(cifraAfaceri);
  const profitResult = calculateProfit(profitNet);

  // Comparație (presupunem 1 angajat = 1% CA)
  const differenceWithEmployee = profitResult.impozit - microResult.impozit1;
  const differenceNoEmployee = profitResult.impozit - microResult.impozit3;

  const handleCalculate = () => {
    setShowResults(true);
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto bg-gradient-to-br from-background to-muted/20 border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Microîntreprindere vs Impozit pe Profit</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ca" className="text-sm font-medium">
            Cifra de Afaceri Estimată (RON)
          </Label>
          <Input
            id="ca"
            type="number"
            value={ca}
            onChange={(e) => setCa(e.target.value)}
            placeholder="Ex: 500000"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="profit" className="text-sm font-medium">
            Profit Net Estimat (RON)
          </Label>
          <Input
            id="profit"
            type="number"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            placeholder="Ex: 100000"
            className="mt-2"
          />
        </div>

        <Button onClick={handleCalculate} className="w-full">
          Calculează
        </Button>

        {showResults && cifraAfaceri > 0 && profitNet > 0 && (
          <div className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
            {!microResult.eligible && (
              <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                    ⚠️ CA depășește pragul de microîntreprindere
                  </p>
                  <p className="text-muted-foreground mt-1">
                    CA estimat ({cifraAfaceri.toLocaleString('ro-RO')} RON) &gt; 500.000 RON. 
                    Ești obligat să treci la impozit pe profit.
                  </p>
                </div>
              </div>
            )}

            {/* Microîntreprindere */}
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-green-700 dark:text-green-400">
                  Microîntreprindere
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA:</span>
                  <span className="font-medium">{cifraAfaceri.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impozit 1% (cu CIM):</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {microResult.impozit1.toLocaleString('ro-RO')} RON
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impozit 3% (fără CIM):</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {microResult.impozit3.toLocaleString('ro-RO')} RON
                  </span>
                </div>
              </div>
            </div>

            {/* Impozit pe Profit */}
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                  Impozit pe Profit
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit net:</span>
                  <span className="font-medium">{profitNet.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impozit 16%:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {profitResult.impozit.toLocaleString('ro-RO')} RON
                  </span>
                </div>
              </div>
            </div>

            {/* Comparație */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <h4 className="font-semibold mb-2">📊 Concluzie</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Cu angajat (CIM - 1% CA):</p>
                  <p className="text-muted-foreground">
                    {differenceWithEmployee > 0 ? (
                      <>
                        <span className="font-bold text-green-600 dark:text-green-400">Micro economisește</span>
                        {' '}{Math.abs(differenceWithEmployee).toLocaleString('ro-RO')} RON
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-blue-600 dark:text-blue-400">Profit economisește</span>
                        {' '}{Math.abs(differenceWithEmployee).toLocaleString('ro-RO')} RON
                      </>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="font-medium">Fără angajat (3% CA):</p>
                  <p className="text-muted-foreground">
                    {differenceNoEmployee > 0 ? (
                      <>
                        <span className="font-bold text-green-600 dark:text-green-400">Micro economisește</span>
                        {' '}{Math.abs(differenceNoEmployee).toLocaleString('ro-RO')} RON
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-blue-600 dark:text-blue-400">Profit economisește</span>
                        {' '}{Math.abs(differenceNoEmployee).toLocaleString('ro-RO')} RON
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                💡 <strong>Break-even CA/Profit:</strong> Micro devine mai puțin avantajos 
                când profit/CA scade (cheltuieli mari). Ideal: marjă mare = micro avantajoasă.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
