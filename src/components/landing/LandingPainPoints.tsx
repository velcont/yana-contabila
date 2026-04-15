import { X } from 'lucide-react';

const pains = [
  'Contabilul zice „totul e ok"',
  'Tu simți că ceva nu e în regulă',
  'Dar n-ai pe cine întreba',
];

export const LandingPainPoints = () => {
  return (
    <section className="rounded-2xl bg-foreground text-background p-6 sm:p-8 space-y-5">
      <p className="text-xs font-bold tracking-widest uppercase text-destructive">
        Lunea dimineață
      </p>

      <div className="space-y-3">
        {pains.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <X className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm sm:text-base leading-relaxed">{p}</p>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-background/20 space-y-1">
        <p className="text-base sm:text-lg font-bold">
          Asta nu e anxietate.
        </p>
        <p className="text-base sm:text-lg font-bold text-primary">
          E lipsa de informație.
        </p>
      </div>
    </section>
  );
};
