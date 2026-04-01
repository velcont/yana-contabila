import { FileText, Table, FileDown, Presentation, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  { icon: FileText, label: 'Word', desc: 'Contracte, rapoarte, scrisori' },
  { icon: Table, label: 'Excel', desc: 'Tabele cu formule reale' },
  { icon: FileDown, label: 'PDF', desc: 'Documente gata de trimis' },
  { icon: Presentation, label: 'PowerPoint', desc: 'Prezentări profesionale' },
];

export const LandingOfficeAnnouncement = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 space-y-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          NOU
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Yana generează documente Office pentru tine
        </h2>
        <p className="text-sm text-muted-foreground">
          Spune-i ce document vrei → primești fișierul gata pe email.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <f.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">{f.label}</p>
              <p className="text-xs text-muted-foreground truncate">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={() => navigate('/auth?redirect=/yana')}
      >
        Încearcă gratuit
      </Button>
    </section>
  );
};
