import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calculator } from 'lucide-react';

interface DividendVsSalaryCalculatorProps {
  onClose?: () => void;
}

export const DividendVsSalaryCalculator = ({ onClose }: DividendVsSalaryCalculatorProps) => {
  const [amount, setAmount] = useState<string>('10000');
  const [showResults, setShowResults] = useState(false);

  const calculateDividend = (suma: number) => {
    // Dividende: 5% impozit + 10% CASS (dacă > 24 salarii minime ~ 72,000 RON/an)
    const impozitDividende = suma * 0.05;
    const cass = suma > 72000 ? suma * 0.10 : 0;
    const net = suma - impozitDividende - cass;
    const costuriTotale = impozitDividende + cass;
    
    return { net, costuriTotale, impozit: impozitDividende, cass };
  };

  const calculateSalary = (suma: number) => {
    // Salariu: CAS 25% + CASS 10% + impozit 10% din baza impozabilă
    // Baza impozabilă = Brut - CAS - CASS - deducere personală (~510 RON/lună)
    const cas = suma * 0.25;
    const cass = suma * 0.10;
    const bazaImpozabila = suma - cas - cass - 510;
    const impozit = bazaImpozabila > 0 ? bazaImpozabila * 0.10 : 0;
    const net = suma - cas - cass - impozit;
    const costuriTotale = cas + cass + impozit;
    
    return { net, costuriTotale, cas, cass, impozit };
  };

  const suma = parseFloat(amount) || 0;
  const dividendResult = calculateDividend(suma);
  const salaryResult = calculateSalary(suma);
  const difference = dividendResult.net - salaryResult.net;

  const handleCalculate = () => {
    setShowResults(true);
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto bg-gradient-to-br from-background to-muted/20 border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Dividende vs Salarii</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="amount" className="text-sm font-medium">
            Suma pe care vrei să o retragi (RON)
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 10000"
            className="mt-2"
          />
        </div>

        <Button onClick={handleCalculate} className="w-full">
          Calculează
        </Button>

        {showResults && suma > 0 && (
          <div className="space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Dividende */}
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-green-700 dark:text-green-400">Dividende</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brut:</span>
                  <span className="font-medium">{suma.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impozit (5%):</span>
                  <span className="text-red-500">-{dividendResult.impozit.toLocaleString('ro-RO')} RON</span>
                </div>
                {dividendResult.cass > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CASS (10%):</span>
                    <span className="text-red-500">-{dividendResult.cass.toLocaleString('ro-RO')} RON</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Net primit:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {dividendResult.net.toLocaleString('ro-RO')} RON
                  </span>
                </div>
              </div>
            </div>

            {/* Salarii */}
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">Salariu</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brut:</span>
                  <span className="font-medium">{suma.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CAS (25%):</span>
                  <span className="text-red-500">-{salaryResult.cas.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CASS (10%):</span>
                  <span className="text-red-500">-{salaryResult.cass.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impozit (10%):</span>
                  <span className="text-red-500">-{salaryResult.impozit.toLocaleString('ro-RO')} RON</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Net primit:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {salaryResult.net.toLocaleString('ro-RO')} RON
                  </span>
                </div>
              </div>
            </div>

            {/* Comparație */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <h4 className="font-semibold mb-2">📊 Concluzie</h4>
              <p className="text-sm">
                {difference > 0 ? (
                  <>
                    <span className="font-bold text-green-600 dark:text-green-400">Dividendele sunt mai avantajoase</span>
                    {' '}cu <span className="font-bold">{Math.abs(difference).toLocaleString('ro-RO')} RON</span> mai mult net.
                  </>
                ) : (
                  <>
                    <span className="font-bold text-blue-600 dark:text-blue-400">Salariul este mai avantajos</span>
                    {' '}cu <span className="font-bold">{Math.abs(difference).toLocaleString('ro-RO')} RON</span> mai mult net.
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 <strong>Notă:</strong> Dividendele sunt mai avantajoase fiscal, dar salariile oferă contribuții la pensie (CAS).
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
