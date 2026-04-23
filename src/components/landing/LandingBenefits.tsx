import { X, Check } from 'lucide-react';

const rows = [
  { without: 'CRM separat de cifre', with: 'CRM + cifre, același chat' },
  { without: 'Click prin 7 ecrane', with: 'O frază — gata' },
  { without: 'Pipedrive + contabil + Excel', with: 'YANA. Atât.' },
  { without: 'Pipeline uitat săptămânal', with: 'YANA îți spune ce-i de făcut' },
  { without: '600 RON/lună stack', with: '49 RON/lună YANA' },
];

export const LandingBenefits = () => {
  return (
    <section className="space-y-5">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Stack vechi vs. YANA
      </h2>

      <div className="rounded-2xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-2">
          <div className="bg-destructive/10 px-4 py-3 text-center">
            <span className="text-xs font-bold tracking-widest uppercase text-destructive">Stack clasic</span>
          </div>
          <div className="bg-primary/10 px-4 py-3 text-center">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Cu YANA</span>
          </div>
        </div>

        {/* Rows */}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 border-t border-border/30">
            <div className="flex items-center gap-2 px-4 py-3 bg-destructive/5">
              <X className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">{r.without}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-foreground font-medium">{r.with}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
