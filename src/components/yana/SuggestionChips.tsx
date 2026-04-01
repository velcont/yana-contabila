import { Button } from '@/components/ui/button';
import { Shield, Swords, BarChart3, Brain, FileUp, FileText, Mail } from 'lucide-react';

interface SuggestionChipsProps {
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  disabled?: boolean;
  postAnalysis?: boolean; // Show document generation chips after balance analysis
}

const DEFAULT_CHIPS = [
  {
    label: 'Ce am de făcut?',
    icon: FileUp,
    message: 'Arată-mi lista de acțiuni pe care le am de făcut. Ce e urgent, ce e overdue, și cu ce mă poți ajuta?',
    accent: 'border-emerald-500/30 hover:bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
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

const POST_ANALYSIS_CHIPS = [
  {
    label: 'Raport Word',
    icon: FileText,
    message: 'Generează-mi un raport Word detaliat cu analiza completă a balanței.',
    accent: 'border-blue-500/30 hover:bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    label: 'Raport PDF',
    icon: FileText,
    message: 'Generează-mi un raport PDF cu analiza financiară completă.',
    accent: 'border-red-500/30 hover:bg-red-500/10',
    iconColor: 'text-red-500',
  },
  {
    label: 'Excel situație',
    icon: BarChart3,
    message: 'Generează un Excel structurat cu situația financiară: venituri, cheltuieli, profit, și indicatori cheie.',
    accent: 'border-green-500/30 hover:bg-green-500/10',
    iconColor: 'text-green-500',
  },
  {
    label: 'Trimite pe email',
    icon: Mail,
    message: 'Trimite-mi pe email un raport PDF cu analiza completă a balanței.',
    accent: 'border-purple-500/30 hover:bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
  {
    label: 'Risc ANAF',
    icon: Shield,
    message: 'Calculează riscul de control ANAF pe baza datelor din balanță.',
    accent: 'border-amber-500/30 hover:bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
];

export function SuggestionChips({ onSendMessage, onUpload, disabled, postAnalysis }: SuggestionChipsProps) {
  const chips = postAnalysis ? POST_ANALYSIS_CHIPS : DEFAULT_CHIPS;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.label}
            variant="outline"
            size="sm"
            className={`h-8 px-3 text-xs gap-1.5 touch-action-manipulation ${chip.accent}`}
            onClick={() => {
              if ('isUpload' in chip && chip.isUpload) {
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
