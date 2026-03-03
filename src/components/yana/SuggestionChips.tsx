import { Button } from '@/components/ui/button';
import { Shield, Swords, BarChart3, Brain, FileUp } from 'lucide-react';

interface SuggestionChipsProps {
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  disabled?: boolean;
}

const CHIPS = [
  {
    label: 'War Room',
    icon: Shield,
    message: 'Vreau să simulez un scenariu de criză cu War Room. Ce riscuri ar trebui să iau în calcul?',
    accent: 'border-red-500/30 hover:bg-red-500/10',
    iconColor: 'text-red-500',
  },
  {
    label: 'Battle Plan',
    icon: Swords,
    message: 'Generează-mi un Battle Plan strategic pentru următoarele 90 de zile.',
    accent: 'border-amber-500/30 hover:bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    label: 'Analizează balanța',
    icon: BarChart3,
    message: '',
    accent: 'border-blue-500/30 hover:bg-blue-500/10',
    iconColor: 'text-blue-500',
    isUpload: true,
  },
  {
    label: 'Strategie AI',
    icon: Brain,
    message: 'Vreau o analiză strategică AI pentru afacerea mea.',
    accent: 'border-purple-500/30 hover:bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

export function SuggestionChips({ onSendMessage, onUpload, disabled }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.label}
            variant="outline"
            size="sm"
            className={`h-8 px-3 text-xs gap-1.5 touch-action-manipulation ${chip.accent}`}
            onClick={() => {
              if (chip.isUpload) {
                onUpload();
              } else {
                onSendMessage(chip.message);
              }
            }}
            disabled={disabled}
          >
            <Icon className={`h-3.5 w-3.5 ${chip.iconColor}`} />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
