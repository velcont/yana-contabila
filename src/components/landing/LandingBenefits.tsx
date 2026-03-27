import { FileSpreadsheet, Brain, BellRing } from 'lucide-react';

const benefits = [
  {
    icon: FileSpreadsheet,
    title: 'Vezi instant unde pierzi bani',
    description: 'Încarcă balanța și primești un raport clar: unde se duc banii, ce riscuri ai, ce poți face concret.',
  },
  {
    icon: Brain,
    title: 'Ia decizii cu cineva care vede tot tabloul',
    description: 'Simulări de scenarii, plan de acțiune pas cu pas, predicții bazate pe cifrele tale reale.',
  },
  {
    icon: BellRing,
    title: 'Nu mai repeta aceleași greșeli',
    description: 'Yana ține minte totul. Te atenționează înainte să greșești din nou. Revine cu idei fără să-i ceri.',
  },
];

export const LandingBenefits = () => {
  return (
    <section className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Cum te ajută Yana concret
      </h2>
      <div className="grid gap-4">
        {benefits.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 sm:p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <b.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{b.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
