import { Button } from '@/components/ui/button';
import { Brain, BarChart3, Lightbulb, Shield, ShieldAlert, Sparkles, Scale, LucideIcon } from 'lucide-react';

interface SuggestionChipsProps {
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  disabled?: boolean;
  postAnalysis?: boolean;
}

interface Chip {
  label: string;
  icon: LucideIcon;
  message: string;
  isUpload?: boolean;
  className?: string;
  iconClassName?: string;
}

const DEFAULT_CHIPS: Chip[] = [
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
    label: 'Risc ANAF',
    icon: ShieldAlert,
    message: 'Care e riscul meu de control ANAF pe baza balanței?',
    className: 'border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/40',
    iconClassName: 'text-amber-500',
  },
  {
    label: 'Sfat strategic',
    icon: Sparkles,
    message: 'Dă-mi un sfat strategic pentru a crește profitul companiei mele',
  },
  {
    label: 'Întrebare fiscală',
    icon: Scale,
    message: 'Am o întrebare despre TVA și deduceri fiscale',
  },
  {
    label: 'Strategie AI',
    icon: Brain,
    message: 'Vreau o analiză strategică AI pentru afacerea mea.',
    className: 'border-primary/30 hover:bg-primary/10 hover:border-primary/40',
    iconClassName: 'text-primary',
  },
];

const POST_ANALYSIS_CHIPS: Chip[] = [
  {
    label: 'Raport PDF',
    icon: BarChart3,
    message: 'Generează-mi un raport PDF cu analiza financiară completă.',
  },
  {
    label: 'Risc ANAF',
    icon: ShieldAlert,
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

  return (
    <div className="flex flex-wrap gap-2 py-2 justify-center mx-auto max-w-[36rem]">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.label}
            variant="outline"
            size="sm"
            className={`h-9 sm:h-8 px-3 shrink-0 snap-start whitespace-nowrap text-xs text-muted-foreground border-border bg-transparent hover:text-primary hover:border-primary/40 hover:bg-accent/50 gap-1.5 touch-action-manipulation ${chip.className || ''}`}
            onClick={() => {
              if ('isUpload' in chip && chip.isUpload) {
                onUpload();
              } else {
                onSendMessage(chip.message);
              }
            }}
            disabled={disabled}
          >
            <Icon className={`h-3.5 w-3.5 ${chip.iconClassName || ''}`} />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
