import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface SimulationSliderProps {
  label: string;
  currentValue: number;
  unit?: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const SimulationSlider: React.FC<SimulationSliderProps> = ({
  label,
  currentValue,
  unit = '',
  onChange,
  min,
  max,
  step = 1,
}) => {
  // Calculate reasonable min/max if not provided
  const calculatedMin = min ?? Math.floor(currentValue * 0.5);
  const calculatedMax = max ?? Math.ceil(currentValue * 1.5);
  
  const [localValue, setLocalValue] = React.useState(currentValue);

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const percentageChange = ((localValue - currentValue) / currentValue * 100).toFixed(1);
  const isIncrease = localValue > currentValue;
  const isDecrease = localValue < currentValue;

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-700">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-200">{label}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={localValue}
              onChange={handleInputChange}
              className="w-24 h-8 text-right bg-slate-800 border-slate-600 text-white"
              step={step}
            />
            <span className="text-xs text-slate-400 min-w-[40px]">{unit}</span>
          </div>
        </div>

        <Slider
          value={[localValue]}
          onValueChange={handleSliderChange}
          min={calculatedMin}
          max={calculatedMax}
          step={step}
          className="w-full"
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Original: {currentValue.toLocaleString('ro-RO')} {unit}
          </span>
          {localValue !== currentValue && (
            <span className={`font-medium ${isIncrease ? 'text-red-400' : isDecrease ? 'text-green-400' : 'text-slate-400'}`}>
              {isIncrease ? '↑' : isDecrease ? '↓' : ''} {percentageChange}%
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
