import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Zap, ArrowRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DiagnosticItem {
  title: string;
  description: string;
}

interface DiagnosticData {
  risks: DiagnosticItem[];
  opportunities: DiagnosticItem[];
  urgent_recommendation: DiagnosticItem;
}

interface DiagnosticResultProps {
  diagnostic: DiagnosticData;
  onOpenDemo: () => void;
  onClose: () => void;
}

export const DiagnosticResult = ({ diagnostic, onOpenDemo, onClose }: DiagnosticResultProps) => {
  const navigate = useNavigate();

  const handleSignup = () => {
    onClose();
    navigate('/auth?redirect=/yana');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-foreground">Diagnosticul tău</h3>
        <p className="text-sm text-muted-foreground">Generat de YANA pe baza răspunsurilor tale</p>
      </div>

      {/* Risks */}
      {diagnostic.risks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span>Riscuri identificate</span>
          </div>
          {diagnostic.risks.map((risk, i) => (
            <div key={i} className="border border-destructive/20 bg-destructive/5 rounded-lg p-3 space-y-1">
              <p className="font-medium text-sm text-foreground">{risk.title}</p>
              <p className="text-xs text-muted-foreground">{risk.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Opportunities */}
      {diagnostic.opportunities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span>Oportunități</span>
          </div>
          {diagnostic.opportunities.map((opp, i) => (
            <div key={i} className="border border-green-500/20 bg-green-500/5 rounded-lg p-3 space-y-1">
              <p className="font-medium text-sm text-foreground">{opp.title}</p>
              <p className="text-xs text-muted-foreground">{opp.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Urgent Recommendation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Zap className="w-4 h-4" />
          <span>Recomandare urgentă</span>
        </div>
        <div className="border-2 border-primary/30 bg-primary/5 rounded-lg p-4 space-y-1">
          <p className="font-semibold text-sm text-foreground">{diagnostic.urgent_recommendation.title}</p>
          <p className="text-xs text-muted-foreground">{diagnostic.urgent_recommendation.description}</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        <Button size="lg" className="w-full" onClick={handleSignup}>
          Continuă cu YANA — 30 zile gratuit
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <button
          onClick={() => { onClose(); onOpenDemo(); }}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <MessageCircle className="w-4 h-4" />
          Vorbește cu YANA acum
        </button>
      </div>
    </div>
  );
};
