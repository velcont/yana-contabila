import { UserPlus, Upload, BarChart3 } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Creează cont gratuit',
    description: '30 de secunde. Fără card.',
  },
  {
    icon: Upload,
    step: '2',
    title: 'Încarcă balanța sau vorbește direct',
    description: 'Excel, PDF sau pur și simplu scrie-i.',
  },
  {
    icon: BarChart3,
    step: '3',
    title: 'Primești analiză + sfaturi',
    description: 'Raport personalizat, riscuri, oportunități.',
  },
];

export const LandingHowItWorks = () => {
  return (
    <section className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Cum funcționează
      </h2>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
              {s.step}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{s.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
