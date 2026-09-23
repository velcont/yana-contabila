import { Button } from '@/components/ui/button';
import { Brain, BarChart3, Lightbulb, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuggestionChipsProps {
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  disabled?: boolean;
  postAnalysis?: boolean;
}

const DEFAULT_CHIPS = [
  {
    label: 'Ce am de făcut?',
    icon: Lightbulb,
    message: 'Arată-mi lista de acțiuni pe care le am de făcut. Ce e urgent, ce e overdue?',
  },
  {
    label: 'Analizează balanța',
    icon: BarChart3,
    isUpload: true,
    message: '',
  },
  {
    label: 'War Room',
    icon: Shield,
    message: 'Vreau să simulez un scenariu de criză cu War Room. Ce riscuri ar trebui să iau în calcul?',
  },
  {
    label: 'Strategie AI',
    icon: Brain,
    message: 'Vreau o analiză strategică AI pentru afacerea mea.',
  },
];

const POST_ANALYSIS_CHIPS = [
  {
    label: 'Raport PDF',
    icon: BarChart3,
    message: 'Generează-mi un raport PDF cu analiza financiară completă.',
  },
  {
    label: 'Risc ANAF',
    icon: Shield,
    message: 'Calculează riscul de control ANAF pe baza datelor din balanță.',
  },
  {
    label: 'Strategie AI',
    icon: Brain,
    message: 'Vreau o analiză strategică AI pentru afacerea mea.',
  },
];

export function SuggestionChips({ onSendMessage, onUpload, disabled, postAnalysis }: SuggestionChipsProps) {
  const chips = postAnalysis ? POST_ANALYSIS_CHIPS : DEFAULT_CHIPS;
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.label}
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5 touch-action-manipulation"
            onClick={() => {
              if ('isUpload' in chip && chip.isUpload) {
                onUpload();
              } else if ('link' in chip && chip.link) {
                navigate(chip.link);
              } else {
                onSendMessage(chip.message);
              }
            }}
            disabled={disabled}
          >
            <Icon className="h-3.5 w-3.5" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
